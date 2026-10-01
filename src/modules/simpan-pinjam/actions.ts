"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { berhasil, gagal, pad4, tambahBulan } from "@/lib/utils";
import type { ActionResult } from "@/types/shared";
import { objectFromForm } from "@/lib/formdata";
import { catatAudit } from "@/modules/core/audit";
import { buatJurnal } from "@/modules/core/accounting/jurnal";
import { wajibRole } from "@/modules/core/actions";
import { getCicilanAktifBulanan } from "@/modules/simpan-pinjam/contracts";
import { angsuranPerBulan, hitungAmortisasi } from "@/modules/simpan-pinjam/math/amortization";
import { evaluasiDsr } from "@/modules/simpan-pinjam/math/dsr";
import {
  hitungHariKeterlambatan,
  hitungPpap,
  tentukanKolektibilitas,
} from "@/modules/simpan-pinjam/math/npl";
import {
  bayarAngsuranSchema,
  cairkanPinjamanSchema,
  pelunasanDiniSchema,
  pengajuanPinjamanSchema,
} from "@/modules/simpan-pinjam/validations";
import type { Prisma } from "@/generated/prisma/client";
import type { Role, StatusApproval } from "@/generated/prisma/enums";
import { DEFAULT_KONSTANTA } from "@/types/shared";

type Tx = Prisma.TransactionClient;

const TRANSISI: Record<StatusApproval, StatusApproval[]> = {
  DRAFT: ["VERIFIKASI_ADMIN"],
  VERIFIKASI_ADMIN: ["REVIEW_HRD", "REJECTED"],
  REVIEW_HRD: ["APPROVED", "REJECTED"],
  APPROVED: ["DISBURSED"],
  REJECTED: [],
  DISBURSED: ["LUNAS"],
  LUNAS: [],
};

const PERAN_APPROVAL: Record<StatusApproval, Role[]> = {
  VERIFIKASI_ADMIN: ["ROLE_SUPERADMIN", "ROLE_ADMIN_SP"],
  REVIEW_HRD: ["ROLE_SUPERADMIN", "ROLE_HRD"],
  APPROVED: ["ROLE_SUPERADMIN", "ROLE_PENGURUS"],
  REJECTED: ["ROLE_SUPERADMIN", "ROLE_PENGURUS", "ROLE_HRD", "ROLE_ADMIN_SP"],
  DRAFT: ["ROLE_SUPERADMIN"],
  DISBURSED: ["ROLE_SUPERADMIN", "ROLE_PENGURUS"],
  LUNAS: ["ROLE_SUPERADMIN"],
};

export async function ajukanPinjaman(input: unknown): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN", "ROLE_PENGURUS", "ROLE_ADMIN_SP", "ROLE_HRD");
    const parsed = pengajuanPinjamanSchema.safeParse(input);
    if (!parsed.success) return gagal("Data tidak valid.", parsed.error.flatten().fieldErrors);

    const hasil = await prisma.$transaction(async (tx) => {
      const anggota = await tx.anggota.findUniqueOrThrow({
        where: { id: parsed.data.anggotaId },
      });
      if (anggota.statusAnggota !== "AKTIF") throw new Error("Anggota tidak aktif.");
      if (parsed.data.nominalPengajuan > Number(anggota.plafonPinjamanMaks)) {
        throw new Error(
          `Melebihi plafon pinjaman (maks Rp${Number(anggota.plafonPinjamanMaks).toLocaleString("id-ID")}).`
        );
      }

      const nominalWajib = Number(
        process.env.KOOPERASI_SIMPANAN_WAJIB || DEFAULT_KONSTANTA.SIMPANAN_WAJIB
      );
      const cicilanBaru = angsuranPerBulan(
        parsed.data.metodeBunga,
        parsed.data.nominalPengajuan,
        parsed.data.sukuBungaTahunan,
        parsed.data.tenorBulan
      );
      const cicilanAktif = await getCicilanAktifBulanan(parsed.data.anggotaId, tx);

      const dsr = evaluasiDsr({
        simpananWajibBulanan: nominalWajib,
        cicilanBaruBulanan: cicilanBaru,
        cicilanAktifBulanan: cicilanAktif,
        estimasiKasbonBulanan: parsed.data.estimasiKasbon,
        gajiBersihBulanan: Number(anggota.gajiBersih),
      });
      if (!dsr.aman) throw new Error(`${dsr.pesan} (DSR ${dsr.dsr}%)`);

      const tahun = new Date().getFullYear();
      const count = await tx.pinjaman.count({
        where: { createdAt: { gte: new Date(`${tahun}-01-01T00:00:00`) } },
      });
      const noKontrak = `KP-${tahun}-${pad4(count + 1)}`;

      const pinjaman = await tx.pinjaman.create({
        data: {
          anggotaId: parsed.data.anggotaId,
          noKontrak,
          jenisPinjaman: parsed.data.jenisPinjaman,
          nominalPengajuan: parsed.data.nominalPengajuan,
          sukuBungaTahunan: parsed.data.sukuBungaTahunan,
          metodeBunga: parsed.data.metodeBunga,
          tenorBulan: parsed.data.tenorBulan,
          dsrRasio: dsr.dsr,
          statusApproval: "DRAFT",
        },
      });
      return { pinjaman, dsr };
    });

    await catatAudit("PINJAMAN", "AJUKAN", { pinjamanId: hasil.pinjaman.id, dsr: hasil.dsr.dsr });
    revalidatePath("/pinjaman");
    return berhasil(hasil.pinjaman);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal mengajukan pinjaman.");
  }
}

/** Ubah status approval sesuai alur DRAFT -> VERIFIKASI_ADMIN -> REVIEW_HRD -> APPROVED. */
export async function ubahStatusApproval(
  pinjamanId: string,
  statusTujuan: StatusApproval
): Promise<ActionResult> {
  try {
    const user = await wajibRole(...PERAN_APPROVAL[statusTujuan]);
    const hasil = await prisma.$transaction(async (tx) => {
      const pinjaman = await tx.pinjaman.findUniqueOrThrow({ where: { id: pinjamanId } });
      const diizinkan = TRANSISI[pinjaman.statusApproval] ?? [];
      if (!diizinkan.includes(statusTujuan)) {
        throw new Error(`Transisi tidak diizinkan (${pinjaman.statusApproval} -> ${statusTujuan}).`);
      }
      return tx.pinjaman.update({
        where: { id: pinjamanId },
        data: { statusApproval: statusTujuan, disetujuiOlehId: user.userId },
      });
    });

    await catatAudit("PINJAMAN", "APPROVAL", { pinjamanId, status: statusTujuan });
    revalidatePath("/pinjaman");
    return berhasil(hasil);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal memproses approval.");
  }
}

export async function cairkanPinjaman(input: unknown): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN", "ROLE_PENGURUS");
    const parsed = cairkanPinjamanSchema.safeParse(input);
    if (!parsed.success) return gagal("Data tidak valid.", parsed.error.flatten().fieldErrors);

    const hasil = await prisma.$transaction(async (tx) => {
      const pinjaman = await tx.pinjaman.findUniqueOrThrow({
        where: { id: parsed.data.pinjamanId },
      });
      if (pinjaman.statusApproval !== "APPROVED") {
        throw new Error("Pinjaman harus berstatus APPROVED sebelum pencairan.");
      }
      const plafon = Number(pinjaman.nominalPengajuan);
      const biaya = parsed.data.biayaAdministrasi;
      const nominalDiterima = plafon - biaya;
      const tglCair = new Date();

      const jadwal = hitungAmortisasi(
        pinjaman.metodeBunga,
        plafon,
        Number(pinjaman.sukuBungaTahunan),
        pinjaman.tenorBulan
      );
      const angsuranRows = jadwal.map((a) => ({
        pinjamanId: pinjaman.id,
        angsuranKe: a.angsuranKe,
        angsuranPokok: a.angsuranPokok,
        angsuranBunga: a.angsuranBunga,
        totalAngsuran: a.totalAngsuran,
        tglJatuhTempo: tambahBulan(tglCair, a.angsuranKe),
      }));

      const akunKas = parsed.data.sumberDana === "BANK" ? "1.1110" : "1.1102";
      const jurnal = await buatJurnal(
        {
          keterangan: `Pencairan pinjaman ${pinjaman.noKontrak}`,
          sumber: "PINJAMAN",
          referensi: pinjaman.noKontrak,
          tanggal: tglCair,
          entries: [
            { kodeAkun: "1.1201", debit: plafon, keterangan: "Pokok pinjaman" },
            { kodeAkun: akunKas, kredit: nominalDiterima, keterangan: "Transfer ke anggota" },
            { kodeAkun: "4.1102", kredit: biaya, keterangan: "Biaya administrasi" },
          ],
        },
        tx
      );

      await tx.pinjamanAngsuran.createMany({ data: angsuranRows });
      const update = await tx.pinjaman.update({
        where: { id: pinjaman.id },
        data: {
          statusApproval: "DISBURSED",
          tanggalPencairan: tglCair,
          nominalDiterima,
          biayaAdministrasi: biaya,
          sumberDana: parsed.data.sumberDana,
          kolektibilitas: 1,
        },
      });
      return { pinjaman: update, jurnalId: jurnal };
    });

    await catatAudit("PINJAMAN", "CAIRKAN", { pinjamanId: parsed.data.pinjamanId });
    revalidatePath("/pinjaman");
    return berhasil(hasil);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal mencairkan pinjaman.");
  }
}

async function perbaruiKolektibilitas(pinjamanId: string, tx: Tx): Promise<void> {
  const belumBayar = await tx.pinjamanAngsuran.findFirst({
    where: { pinjamanId, statusBayar: "PENDING" },
    orderBy: { tglJatuhTempo: "asc" },
  });
  if (!belumBayar) return;
  const hari = hitungHariKeterlambatan(belumBayar.tglJatuhTempo);
  const kol = tentukanKolektibilitas(hari);
  await tx.pinjaman.update({ where: { id: pinjamanId }, data: { kolektibilitas: kol } });
}

export async function bayarAngsuran(input: unknown): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN", "ROLE_PENGURUS", "ROLE_ADMIN_SP", "ROLE_KASIR");
    const parsed = bayarAngsuranSchema.safeParse(input);
    if (!parsed.success) return gagal("Data tidak valid.", parsed.error.flatten().fieldErrors);

    const hasil = await prisma.$transaction(async (tx) => {
      const angsuran = await tx.pinjamanAngsuran.findUniqueOrThrow({
        where: { id: parsed.data.pinjamanAngsuranId },
        include: { pinjaman: true },
      });
      if (angsuran.statusBayar !== "PENDING") throw new Error("Angsuran sudah dibayar.");
      if (angsuran.pinjaman.statusApproval !== "DISBURSED") {
        throw new Error("Pinjaman tidak berstatus berjalan.");
      }

      const total = Number(angsuran.angsuranPokok) + Number(angsuran.angsuranBunga);
      const jurnal = await buatJurnal(
        {
          keterangan: `Angsuran ke-${angsuran.angsuranKe} pinjaman ${angsuran.pinjaman.noKontrak}`,
          sumber: "PINJAMAN",
          referensi: `${angsuran.pinjaman.noKontrak}/A${angsuran.angsuranKe}`,
          entries: [
            { kodeAkun: "1.1102", debit: total, keterangan: "Kas masuk" },
            { kodeAkun: "1.1201", kredit: Number(angsuran.angsuranPokok), keterangan: "Pokok" },
            { kodeAkun: "4.1101", kredit: Number(angsuran.angsuranBunga), keterangan: "Bunga" },
          ],
        },
        tx
      );

      await tx.pinjamanAngsuran.update({
        where: { id: angsuran.id },
        data: { statusBayar: "PAID", tglBayar: new Date(), nominalDibayar: total },
      });

      const sisa = await tx.pinjamanAngsuran.count({
        where: { pinjamanId: angsuran.pinjamanId, statusBayar: "PENDING" },
      });
      if (sisa === 0) {
        await tx.pinjaman.update({
          where: { id: angsuran.pinjamanId },
          data: { statusApproval: "LUNAS", tanggalLunas: new Date() },
        });
      } else {
        await perbaruiKolektibilitas(angsuran.pinjamanId, tx);
      }
      return { angsuranId: angsuran.id, jurnalId: jurnal, sisaAngsuran: sisa };
    });

    revalidatePath("/pinjaman");
    return berhasil(hasil);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal membayar angsuran.");
  }
}

/** Pelunasan dipercepat dengan diskon bunga sisa 50%. */
export async function earlyRepayment(input: unknown): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN", "ROLE_PENGURUS", "ROLE_ADMIN_SP");
    const parsed = pelunasanDiniSchema.safeParse(input);
    if (!parsed.success) return gagal("Data tidak valid.", parsed.error.flatten().fieldErrors);

    const DISKON = 0.5;
    const hasil = await prisma.$transaction(async (tx) => {
      const pinjaman = await tx.pinjaman.findUniqueOrThrow({ where: { id: parsed.data.pinjamanId } });
      if (pinjaman.statusApproval !== "DISBURSED") throw new Error("Pinjaman tidak berjalan.");

      const sisa = await tx.pinjamanAngsuran.aggregate({
        where: { pinjamanId: pinjaman.id, statusBayar: "PENDING" },
        _sum: { angsuranPokok: true, angsuranBunga: true },
      });
      const sisaPokok = Number(sisa._sum.angsuranPokok ?? 0);
      const bungaBerjalan = Number(sisa._sum.angsuranBunga ?? 0);
      const bungaDiskon = Math.round(bungaBerjalan * DISKON);
      const nominalPelunasan = sisaPokok + bungaDiskon;

      if (nominalPelunasan <= 0) throw new Error("Tidak ada sisa tagihan.");

      const jurnal = await buatJurnal(
        {
          keterangan: `Pelunasan dipercepat pinjaman ${pinjaman.noKontrak} (diskon bunga 50%)`,
          sumber: "PINJAMAN",
          referensi: `${pinjaman.noKontrak}/PELUNASAN`,
          entries: [
            { kodeAkun: "1.1102", debit: nominalPelunasan, keterangan: "Kas masuk pelunasan" },
            { kodeAkun: "1.1201", kredit: sisaPokok, keterangan: "Pokok dilunasi" },
            { kodeAkun: "4.1101", kredit: bungaDiskon, keterangan: "Bunga setelah diskon" },
          ],
        },
        tx
      );

      await tx.pinjamanAngsuran.updateMany({
        where: { pinjamanId: pinjaman.id, statusBayar: "PENDING" },
        data: {
          statusBayar: "PAID",
          tglBayar: new Date(),
          nominalDibayar: 0,
          keterangan: "EARLY_REPAYMENT",
        },
      });
      const update = await tx.pinjaman.update({
        where: { id: pinjaman.id },
        data: { statusApproval: "LUNAS", tanggalLunas: new Date(), kolektibilitas: 1 },
      });
      return { pinjaman: update, jurnalId: jurnal, sisaPokok, bungaDiskon, nominalPelunasan };
    });

    await catatAudit("PINJAMAN", "PELUNASAN_DINI", {
      pinjamanId: parsed.data.pinjamanId,
      nominal: hasil.nominalPelunasan,
    });
    revalidatePath("/pinjaman");
    return berhasil(hasil);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal proses pelunasan dini.");
  }
}

// ------------------------------------------------------------------
// REPORTING
// ------------------------------------------------------------------

export interface KreditPortofolio {
  pinjamanId: string;
  noKontrak: string;
  namaLengkap: string;
  nak: string;
  metodeBunga: string;
  nominal: number;
  statusApproval: string;
  kolektibilitas: number;
  bakiDebet: number;
  ppap: number;
  angsuranBerjalan: number;
  angsuranTertunggak: number;
}

export async function getPortofolioKredit(): Promise<KreditPortofolio[]> {
  await wajibRole("ROLE_SUPERADMIN", "ROLE_PENGURUS", "ROLE_ADMIN_SP");
  const daftar = await prisma.pinjaman.findMany({
    where: { statusApproval: "DISBURSED" },
    include: {
      anggota: { select: { namaLengkap: true, nak: true } },
      angsuranJadwal: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return daftar.map((p) => {
    const pending = p.angsuranJadwal.filter((a) => a.statusBayar === "PENDING");
    const bakiDebet = pending.reduce((s, a) => s + Number(a.angsuranPokok), 0);
    const tertunggak = pending.filter(
      (a) => new Date(a.tglJatuhTempo).getTime() < Date.now()
    ).length;
    return {
      pinjamanId: p.id,
      noKontrak: p.noKontrak,
      namaLengkap: p.anggota.namaLengkap,
      nak: p.anggota.nak,
      metodeBunga: p.metodeBunga,
      nominal: Number(p.nominalPengajuan),
      statusApproval: p.statusApproval,
      kolektibilitas: p.kolektibilitas,
      bakiDebet,
      ppap: hitungPpap(bakiDebet, p.kolektibilitas),
      angsuranBerjalan: pending.length,
      angsuranTertunggak: tertunggak,
    };
  });
}

export async function getKartuPinjaman(anggotaId: string) {
  await wajibRole(
    "ROLE_SUPERADMIN",
    "ROLE_PENGURUS",
    "ROLE_ADMIN_SP",
    "ROLE_HRD",
    "ROLE_KASIR"
  );
  return prisma.pinjaman.findMany({
    where: { anggotaId },
    include: { angsuranJadwal: { orderBy: { angsuranKe: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getDetailPinjaman(pinjamanId: string) {
  await wajibRole("ROLE_SUPERADMIN", "ROLE_PENGURUS", "ROLE_ADMIN_SP", "ROLE_HRD");
  return prisma.pinjaman.findUnique({
    where: { id: pinjamanId },
    include: { anggota: true, angsuranJadwal: { orderBy: { angsuranKe: "asc" } } },
  });
}

export async function getDaftarPengajuan(status?: StatusApproval) {
  await wajibRole("ROLE_SUPERADMIN", "ROLE_PENGURUS", "ROLE_ADMIN_SP", "ROLE_HRD");
  return prisma.pinjaman.findMany({
    where: { ...(status ? { statusApproval: status } : {}) },
    include: { anggota: { select: { namaLengkap: true, nak: true, gajiBersih: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

// ------------------------------------------------------------------
// FORM WRAPPERS
// ------------------------------------------------------------------

export async function ajukanPinjamanForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  return ajukanPinjaman(objectFromForm(fd));
}

export async function approvalPinjamanForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  const o = objectFromForm(fd);
  return ubahStatusApproval(String(o.pinjamanId), o.status as StatusApproval);
}

export async function cairkanPinjamanForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  return cairkanPinjaman(objectFromForm(fd));
}

export async function bayarAngsuranForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  return bayarAngsuran(objectFromForm(fd));
}

export async function earlyRepaymentForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  return earlyRepayment(objectFromForm(fd));
}