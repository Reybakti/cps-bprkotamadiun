// Service and Contract Layer Waserda (Dev 3)
// Dipakai bersama oleh Dev 1 (payroll aggregator kasbon).

import { prisma } from "@/lib/db";
import { akhirBulan, awalBulan } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";

type Client = Prisma.TransactionClient;

/** Total kasbon toko yang belum lunas pada periode tertentu. */
export async function getTotalKasbonBulan(
  anggotaId: string,
  periodeBulan: string,
  client: Client = prisma
): Promise<number> {
  const hasil = await client.penjualan.aggregate({
    where: {
      anggotaId,
      metodeBayar: "KASBON",
      statusBayar: "BELUM_LUNAS",
      createdAt: { gte: awalBulan(periodeBulan), lte: akhirBulan(periodeBulan) },
    },
    _sum: { totalAkhir: true },
  });
  return Number(hasil._sum.totalAkhir ?? 0);
}

export async function getTotalKasbonBelumLunas(
  anggotaId: string,
  client: Client = prisma
): Promise<number> {
  const hasil = await client.penjualan.aggregate({
    where: { anggotaId, metodeBayar: "KASBON", statusBayar: "BELUM_LUNAS" },
    _sum: { totalAkhir: true },
  });
  return Number(hasil._sum.totalAkhir ?? 0);
}

/** Saldo kasbon berjalan anggota untuk evaluasi DSR / approval. */
export async function getEstimasiKasbonBulanan(
  anggotaId: string,
  client: Client = prisma
): Promise<number> {
  return getTotalKasbonBelumLunas(anggotaId, client);
}