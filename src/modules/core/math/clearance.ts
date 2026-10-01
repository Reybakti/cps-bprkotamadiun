import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export interface HasilClearance {
  anggotaId: string;
  totalSimpananPokok: number;
  totalSimpananWajib: number;
  totalSimpananSukarela: number;
  sisaPokokKredit: number;
  bungaBerjalan: number;
  kasbonToko: number;
  saldoHakBersih: number; // positif = hak, negatif = utang
  status: "CLEARED" | "FROZEN" | "TAGIHAN";
}

async function saldoSimpananJenis(
  tx: Prisma.TransactionClient,
  anggotaId: string,
  jenis: "POKOK" | "WAJIB" | "SUKARELA"
): Promise<number> {
  const last = await tx.simpananMutasi.findFirst({
    where: { anggotaId, jenisSimpanan: jenis },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { saldoAkhir: true },
  });
  return Number(last?.saldoAkhir ?? 0);
}

/**
 * One-Click Member Clearance.
 * SaldoHakBersih = (Pokok + Wajib + Sukarela) - (Sisa Pokok Kredit + Bunga Berjalan + Kasbon Toko)
 */
export async function hitungClearance(
  anggotaId: string,
  tx: Prisma.TransactionClient = prisma
): Promise<HasilClearance> {
  const [pokok, wajib, sukarela] = await Promise.all([
    saldoSimpananJenis(tx, anggotaId, "POKOK"),
    saldoSimpananJenis(tx, anggotaId, "WAJIB"),
    saldoSimpananJenis(tx, anggotaId, "SUKARELA"),
  ]);

  const pinjamanAktif = await tx.pinjaman.findMany({
    where: {
      anggotaId,
      statusApproval: { in: ["DISBURSED", "APPROVED"] },
    },
    select: { id: true },
  });
  const pinjamanIds = pinjamanAktif.map((p) => p.id);

  const pending = pinjamanIds.length
    ? await tx.pinjamanAngsuran.aggregate({
        where: {
          pinjamanId: { in: pinjamanIds },
          statusBayar: "PENDING",
        },
        _sum: { angsuranPokok: true, angsuranBunga: true },
      })
    : { _sum: { angsuranPokok: null, angsuranBunga: null } };

  const sisaPokokKredit = Number(pending._sum.angsuranPokok ?? 0);
  const bungaBerjalan = Number(pending._sum.angsuranBunga ?? 0);

  const kasbonAgg = await tx.penjualan.aggregate({
    where: {
      anggotaId,
      metodeBayar: "KASBON",
      statusBayar: "BELUM_LUNAS",
    },
    _sum: { totalAkhir: true },
  });
  const kasbonToko = Number(kasbonAgg._sum.totalAkhir ?? 0);

  const totalHak = pokok + wajib + sukarela;
  const totalKewajiban = sisaPokokKredit + bungaBerjalan + kasbonToko;
  const saldoHakBersih = totalHak - totalKewajiban;

  const status: HasilClearance["status"] =
    saldoHakBersih < 0 ? "FROZEN" : totalKewajiban > 0 ? "TAGIHAN" : "CLEARED";

  return {
    anggotaId,
    totalSimpananPokok: pokok,
    totalSimpananWajib: wajib,
    totalSimpananSukarela: sukarela,
    sisaPokokKredit,
    bungaBerjalan,
    kasbonToko,
    saldoHakBersih,
    status,
  };
}