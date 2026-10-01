// ============================================================
// Core Module - Contract Provider (Dev 1)
// Fungsi kontrak antar-modul. Dikonsumsi Dev 2 & Dev 3.
// DILARANG impor logika internal modul lain.
// ============================================================

import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export interface AnggotaDetail {
  id: string;
  nak: string;
  nipKaryawan: string;
  namaLengkap: string;
  divisi: string;
  kantorCabang: string;
  statusKepegawaian: "TETAP" | "KONTRAK" | "PROBATION";
  statusAnggota: "AKTIF" | "NONAKTIF" | "FROZEN" | "RESIGN";
  limitKasbonToko: number;
  limitKasbonBulanan: number;
  gajiBersih: number;
  tanggalBerakhirKontrak?: Date | null;
}

export async function getAnggotaDetail(anggotaId: string): Promise<AnggotaDetail | null> {
  const a = await prisma.anggota.findUnique({
    where: { id: anggotaId },
    select: {
      id: true,
      nak: true,
      nipKaryawan: true,
      namaLengkap: true,
      divisi: true,
      kantorCabang: true,
      statusKepegawaian: true,
      statusAnggota: true,
      limitKasbonToko: true,
      limitKasbonBulanan: true,
      gajiBersih: true,
      tanggalBerakhirKontrak: true,
    },
  });
  if (!a) return null;
  return {
    ...a,
    limitKasbonToko: Number(a.limitKasbonToko),
    limitKasbonBulanan: Number(a.limitKasbonBulanan),
    gajiBersih: Number(a.gajiBersih),
  };
}

export async function getAnggotaByNak(nak: string): Promise<AnggotaDetail | null> {
  const a = await prisma.anggota.findUnique({
    where: { nak },
    select: {
      id: true,
      nak: true,
      nipKaryawan: true,
      namaLengkap: true,
      divisi: true,
      kantorCabang: true,
      statusKepegawaian: true,
      statusAnggota: true,
      limitKasbonToko: true,
      limitKasbonBulanan: true,
      gajiBersih: true,
      tanggalBerakhirKontrak: true,
    },
  });
  if (!a) return null;
  return {
    ...a,
    limitKasbonToko: Number(a.limitKasbonToko),
    limitKasbonBulanan: Number(a.limitKasbonBulanan),
    gajiBersih: Number(a.gajiBersih),
  };
}

/**
 * Memotong sisa pagu kasbon belanja anggota.
 * Wajib dipanggil di dalam transaksi DB (Dev 3 checkout kasbon).
 */
export async function potongLimitKasbon(
  anggotaId: string,
  nominal: number,
  client: Prisma.TransactionClient = prisma
): Promise<number> {
  if (nominal <= 0) throw new Error("Nominal potongan limit kasbon tidak valid.");
  const updated = await client.anggota.update({
    where: { id: anggotaId },
    data: { limitKasbonToko: { decrement: nominal } },
  });
  return Number(updated.limitKasbonToko);
}

/** Mengembalikan pagu kasbon (dipakai settlement bulanan / void nota). */
export async function kembalikanLimitKasbon(
  anggotaId: string,
  nominal: number,
  client: Prisma.TransactionClient = prisma
): Promise<number> {
  const updated = await client.anggota.update({
    where: { id: anggotaId },
    data: { limitKasbonToko: { increment: nominal } },
  });
  return Number(updated.limitKasbonToko);
}

/** Reset pagu kasbon bulanan ke nilai dasar (cut-off payroll). */
export async function resetLimitKasbonBulanan(
  anggotaId: string,
  client: Prisma.TransactionClient = prisma
): Promise<number> {
  const a = await client.anggota.findUniqueOrThrow({ where: { id: anggotaId } });
  const updated = await client.anggota.update({
    where: { id: anggotaId },
    data: { limitKasbonToko: a.limitKasbonBulanan },
  });
  return Number(updated.limitKasbonToko);
}

export const STATUS_LIMIT_KASBON: Record<"TETAP" | "KONTRAK" | "PROBATION", number> = {
  TETAP: 2500000,
  KONTRAK: 1000000,
  PROBATION: 500000,
};

export const STATUS_PLAFON_PINJAMAN: Record<"TETAP" | "KONTRAK" | "PROBATION", number> = {
  TETAP: 100000000,
  KONTRAK: 25000000, // maks akumulasi sisa kontrak, standar sistem 25juta
  PROBATION: 0, // belum diperkenankan
};