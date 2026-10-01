// ============================================================
// Service & Contract Layer Simpan Pinjam (Dev 2)
// Dipakai bersama oleh Dev 1 (payroll) dan modul lain.
// ============================================================

import { prisma } from "@/lib/db";
import { akhirBulan, awalBulan } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

type Client = Prisma.TransactionClient;

export interface TagihanPinjamanBulan {
  pinjamanId: string;
  pinjamanAngsuranId: string;
  angsuranPokok: number;
  angsuranBunga: number;
  totalAngsuran: number;
  angsuranKe: number;
  tglJatuhTempo: Date;
}

/**
 * Tagihan angsuran jatuh tempo pada bulan tertentu (Dev 2 contract).
 * Digunakan Payroll Dev 1 untuk aggregator potongan gaji.
 */
export async function getTagihanPinjamanBulan(
  anggotaId: string,
  periodeBulan: string,
  client: Client = prisma
): Promise<TagihanPinjamanBulan | null> {
  const jadwal = await client.pinjamanAngsuran.findFirst({
    where: {
      pinjaman: {
        anggotaId,
        statusApproval: { in: ["DISBURSED", "LUNAS"] },
      },
      statusBayar: "PENDING",
      tglJatuhTempo: { gte: awalBulan(periodeBulan), lte: akhirBulan(periodeBulan) },
    },
    orderBy: [{ tglJatuhTempo: "asc" }, { angsuranKe: "asc" }],
    select: {
      id: true,
      pinjamanId: true,
      angsuranKe: true,
      angsuranPokok: true,
      angsuranBunga: true,
      tglJatuhTempo: true,
    },
  });

  if (!jadwal) return null;
  return {
    pinjamanId: jadwal.pinjamanId,
    pinjamanAngsuranId: jadwal.id,
    angsuranPokok: Number(jadwal.angsuranPokok),
    angsuranBunga: Number(jadwal.angsuranBunga),
    totalAngsuran: Number(jadwal.angsuranPokok) + Number(jadwal.angsuranBunga),
    angsuranKe: jadwal.angsuranKe,
    tglJatuhTempo: jadwal.tglJatuhTempo,
  };
}

export interface SaldoSimpanan {
  pokok: number;
  wajib: number;
  sukarela: number;
  total: number;
}

/** Baki saldo simpanan anggota (last saldoAkhir per jenis). */
export async function getSaldoSimpanan(
  anggotaId: string,
  client: Client = prisma
): Promise<SaldoSimpanan> {
  const jenisList = ["POKOK", "WAJIB", "SUKARELA"] as const;
  const hasil: Record<string, number> = { POKOK: 0, WAJIB: 0, SUKARELA: 0 };

  for (const jenis of jenisList) {
    const last = await client.simpananMutasi.findFirst({
      where: { anggotaId, jenisSimpanan: jenis },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { saldoAkhir: true },
    });
    hasil[jenis] = Number(last?.saldoAkhir ?? 0);
  }

  return {
    pokok: hasil.POKOK,
    wajib: hasil.WAJIB,
    sukarela: hasil.SUKARELA,
    total: hasil.POKOK + hasil.WAJIB + hasil.SUKARELA,
  };
}

/** Total angsuran aktif (cicilan) per bulan untuk evaluasi DSR. */
export async function getCicilanAktifBulanan(
  anggotaId: string,
  client: Client = prisma
): Promise<number> {
  const hasil = await client.pinjamanAngsuran.aggregate({
    where: {
      pinjaman: { anggotaId, statusApproval: "DISBURSED" },
      statusBayar: "PENDING",
    },
    _sum: { angsuranPokok: true, angsuranBunga: true },
  });
  return Number(hasil._sum.angsuranPokok ?? 0) + Number(hasil._sum.angsuranBunga ?? 0);
}

/** Saldo baki debet tersisa seluruh pinjaman aktif (sisa pokok dari jadwal angsuran). */
export async function getSisaPokokAktif(
  anggotaId: string,
  client: Client = prisma
): Promise<number> {
  const hasil = await client.pinjamanAngsuran.aggregate({
    where: {
      pinjaman: { anggotaId, statusApproval: "DISBURSED" },
      statusBayar: "PENDING",
    },
    _sum: { angsuranPokok: true },
  });
  return Number(hasil._sum.angsuranPokok ?? 0);
}