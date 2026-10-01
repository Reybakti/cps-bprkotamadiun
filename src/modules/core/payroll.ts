import { prisma } from "@/lib/db";
import { berhasil, gagal, akhirBulan, awalBulan, periodeBulanIni } from "@/lib/utils";
import type { ActionResult } from "@/types/shared";
import { buatJurnal } from "@/modules/core/accounting/jurnal";
import { getTagihanPinjamanBulan } from "@/modules/simpan-pinjam/contracts";
import { getTotalKasbonBulan } from "@/modules/waserda/contracts";
import type { Prisma } from "@/generated/prisma/client";
import { DEFAULT_KONSTANTA } from "@/types/shared";

export interface PayrollRow {
  nipKaryawan: string;
  namaLengkap: string;
  divisi: string;
  kantorCabang: string;
  nominalSimpananWajib: number;
  nominalAngsuranPokok: number;
  nominalAngsuranBunga: number;
  nominalKasbonToko: number;
  totalPotongan: number;
  statusSettlement: string;
}

/**
 * Aggregator Payroll Deduction (Dev 1, WBS 4.1):
 * Konsolidasi kewajiban bulanan seluruh anggota aktif menjadi
 * tabel payrollDeduction dalam SATU transaksi atomik.
 */
export async function generateMonthlyPayroll(
  periodeBulan: string = periodeBulanIni()
): Promise<ActionResult<number>> {
  try {
    const nominalWajib = Number(process.env.KOOPERASI_SIMPANAN_WAJIB || DEFAULT_KONSTANTA.SIMPANAN_WAJIB);

    await prisma.$transaction(async (tx) => {
      const anggotaList = await tx.anggota.findMany({
        where: { statusAnggota: "AKTIF" },
        select: { id: true },
      });

      for (const a of anggotaList) {
        // 1. Simpanan Wajib rutin (Dev 1 - kebijakan ekuitas)
        // 2. Tagihan angsuran pinjaman bulan ini (Dev 2 contract)
        const tagihan = await getTagihanPinjamanBulan(a.id, periodeBulan, tx);
        // 3. Akumulasi kasbon waserda (Dev 3 contract)
        const kasbon = await getTotalKasbonBulan(a.id, periodeBulan, tx);

        const pokok = tagihan?.angsuranPokok ?? 0;
        const bunga = tagihan?.angsuranBunga ?? 0;

        await tx.payrollDeduction.upsert({
          where: { periodeBulan_anggotaId: { periodeBulan, anggotaId: a.id } },
          create: {
            periodeBulan,
            anggotaId: a.id,
            nominalSimpananWajib: nominalWajib,
            nominalAngsuranPokok: pokok,
            nominalAngsuranBunga: bunga,
            nominalKasbonToko: kasbon,
            totalPotongan: nominalWajib + pokok + bunga + kasbon,
          },
          update: {
            nominalSimpananWajib: nominalWajib,
            nominalAngsuranPokok: pokok,
            nominalAngsuranBunga: bunga,
            nominalKasbonToko: kasbon,
            totalPotongan: nominalWajib + pokok + bunga + kasbon,
            statusSettlement: "PENDING",
          },
        });
      }
    });

    return berhasil(1);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal generate payroll.");
  }
}

export async function getPayrollRows(periodeBulan: string): Promise<PayrollRow[]> {
  const rows = await prisma.payrollDeduction.findMany({
    where: { periodeBulan },
    include: { anggota: { select: { nipKaryawan: true, namaLengkap: true, divisi: true, kantorCabang: true } } },
    orderBy: { anggota: { nipKaryawan: "asc" } },
  });
  return rows.map((r) => ({
    nipKaryawan: r.anggota.nipKaryawan,
    namaLengkap: r.anggota.namaLengkap,
    divisi: r.anggota.divisi,
    kantorCabang: r.anggota.kantorCabang,
    nominalSimpananWajib: Number(r.nominalSimpananWajib),
    nominalAngsuranPokok: Number(r.nominalAngsuranPokok),
    nominalAngsuranBunga: Number(r.nominalAngsuranBunga),
    nominalKasbonToko: Number(r.nominalKasbonToko),
    totalPotongan: Number(r.totalPotongan),
    statusSettlement: r.statusSettlement,
  }));
}

export function buildPayrollCsv(rows: PayrollRow[]): string {
  const header = [
    "NIP KARYAWAN",
    "NAMA LENGKAP",
    "DIVISI CABANG",
    "SIMPANAN WAJIB",
    "ANGSURAN POKOK",
    "ANGSURAN BUNGA",
    "KASBON WASERDA",
    "TOTAL POTONGAN",
  ];
  const lines = rows.map((r) =>
    [
      r.nipKaryawan,
      `"${r.namaLengkap}"`,
      `${r.divisi} - ${r.kantorCabang}`,
      r.nominalSimpananWajib.toLocaleString("id-ID"),
      r.nominalAngsuranPokok.toLocaleString("id-ID"),
      r.nominalAngsuranBunga.toLocaleString("id-ID"),
      r.nominalKasbonToko.toLocaleString("id-ID"),
      r.totalPotongan.toLocaleString("id-ID"),
    ].join(";")
  );
  return [header.join(";"), ...lines].join("\r\n");
}

export interface ImportSettlementResult {
  periodeBulan: string;
  jumlahAnggota: number;
  totalPotongan: number;
  muatSukarWajib: number;
}

/**
 * Import Confirmation HRD & Mass Settlement (WBS 4.3):
 * Setelah divisi gaji menandai pembayaran, seluruh tagihan
 * ditandai SETTLED, angsuran PINJAMAN dibayar, kasbon lunas,
 * simpanan wajib dimutasi, dan dibukukan jurnal SAK.
 */
export async function importSettlement(
  periodeBulan: string,
  noRefBayer: string
): Promise<ActionResult<ImportSettlementResult>> {
  try {
    const hasil = await prisma.$transaction(async (tx): Promise<ImportSettlementResult> => {
      const daftar = await tx.payrollDeduction.findMany({
        where: { periodeBulan, statusSettlement: { not: "SETTLED" } },
      });

      let totalPotongan = 0;
      let muatSukarWajib = 0;

      for (const d of daftar) {
        const nominalWajib = Number(d.nominalSimpananWajib);

        // Mutasi simpanan wajib (ekuitas periodik)
        const last = await tx.simpananMutasi.findFirst({
          where: { anggotaId: d.anggotaId, jenisSimpanan: "WAJIB" },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: { saldoAkhir: true },
        });
        const saldoSebelum = Number(last?.saldoAkhir ?? 0);
        await tx.simpananMutasi.create({
          data: {
            anggotaId: d.anggotaId,
            jenisSimpanan: "WAJIB",
            tipeMutasi: "SETOR",
            nominal: nominalWajib,
            saldoAkhir: saldoSebelum + nominalWajib,
            referensiTrx: `PAYROLL-${periodeBulan}`,
            keterangan: "Autodebet payroll",
          },
        });
        muatSukarWajib += nominalWajib;

        // Lunasi angsuran pinjaman jatuh tempo periode ini
        if (Number(d.nominalAngsuranPokok) > 0 || Number(d.nominalAngsuranBunga) > 0) {
          const tagihan = await getTagihanPinjamanBulan(d.anggotaId, periodeBulan, tx);
          if (tagihan?.pinjamanAngsuranId) {
            await tx.pinjamanAngsuran.update({
              where: { id: tagihan.pinjamanAngsuranId },
              data: {
                statusBayar: "PAID",
                tglBayar: new Date(),
                nominalDibayar: Number(d.nominalAngsuranPokok) + Number(d.nominalAngsuranBunga),
              },
            });

            // Jika seluruh angsuran lunas -> status pinjaman LUNAS
            const sisa = await tx.pinjamanAngsuran.count({
              where: { pinjamanId: tagihan.pinjamanId, statusBayar: "PENDING" },
            });
            if (sisa === 0) {
              await tx.pinjaman.update({
                where: { id: tagihan.pinjamanId },
                data: { statusApproval: "LUNAS", tanggalLunas: new Date() },
              });
            }
          }
        }

        // Lunasi kasbon waserda periode ini
        if (Number(d.nominalKasbonToko) > 0) {
          await tx.penjualan.updateMany({
            where: {
              anggotaId: d.anggotaId,
              metodeBayar: "KASBON",
              statusBayar: "BELUM_LUNAS",
              createdAt: { gte: awalBulan(periodeBulan), lte: akhirBulan(periodeBulan) },
            },
            data: { statusBayar: "LUNAS" },
          });
        }

        // Jurnal penerimaan payroll settlement
        await buatJurnal(
          {
            keterangan: `Settlement payroll ${periodeBulan} - anggota ${d.anggotaId}`,
            sumber: "PAYROLL",
            referensi: noRefBayer,
            tanggal: new Date(),
            entries: [
              { kodeAkun: "1.1110", debit: Number(d.totalPotongan), keterangan: "Terima transfer HRD" },
              { kodeAkun: "3.1102", kredit: nominalWajib, keterangan: "Simpanan wajib" },
              { kodeAkun: "1.1201", kredit: Number(d.nominalAngsuranPokok), keterangan: "Angsuran pokok" },
              { kodeAkun: "4.1101", kredit: Number(d.nominalAngsuranBunga), keterangan: "Pendapatan bunga" },
              { kodeAkun: "1.1202", kredit: Number(d.nominalKasbonToko), keterangan: "Kasbon waserda" },
            ],
          },
          tx
        );

        await tx.payrollDeduction.update({
          where: { id: d.id },
          data: { statusSettlement: "SETTLED" },
        });

        totalPotongan += Number(d.totalPotongan);
      }

      return {
        periodeBulan,
        jumlahAnggota: daftar.length,
        totalPotongan,
        muatSukarWajib,
      };
    });

    return berhasil(hasil);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal import settlement payroll.");
  }
}

export async function getPayrollPeriodeList() {
  return prisma.payrollDeduction.findMany({
    distinct: ["periodeBulan"],
    select: { periodeBulan: true },
    orderBy: { periodeBulan: "desc" },
  });
}

// Form wrapper (server-action) untuk useActionState dipindah ke
// payroll-actions.ts agar modul ini tetap bebas dari "use server".

// Mendukung type lint di mana Prisma dipakai
export type { Prisma };