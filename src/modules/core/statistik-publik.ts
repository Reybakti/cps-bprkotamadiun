import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/**
 * Angka ringkas untuk landing page.
 *
 * Sengaja TIDAK memakai "use server" — ini query read-only yang
 * dipanggil langsung dari Server Component halaman depan, bukan
 * endpoint yang dipanggil browser.
 */
export interface StatistikKoperasi {
  totalAnggota: number;
  anggotaAktif: number;
  totalSimpanan: number;
  pinjamanBerjalan: number;
  nilaiPinjamanBerjalan: number;
  produkWaserda: number;
  voucherAktif: number;
  akunCoa: number;
}

export async function getStatistikKoperasi(): Promise<StatistikKoperasi> {
  const [
    totalAnggota,
    anggotaAktif,
    produkWaserda,
    voucherAktif,
    akunCoa,
    pinjaman,
    saldoSimpanan,
  ] = await Promise.all([
    prisma.anggota.count(),
    prisma.anggota.count({ where: { statusAnggota: "AKTIF" } }),
    prisma.produk.count(),
    prisma.voucher.count({ where: { status: "AKTIF" } }),
    prisma.account.count(),
    prisma.pinjaman.findMany({
      where: { statusApproval: "DISBURSED", tanggalLunas: null },
      select: { nominalPengajuan: true },
    }),
    // SimpananMutasi adalah buku besar: saldoAkhir tiap baris sudah
    // saldo kumulatif, jadi hanya baris terakhir per anggota+jenis
    // yang boleh dijumlahkan.
    prisma.$queryRaw<{ total: Prisma.Decimal | null }[]>`
      SELECT COALESCE(SUM(s."saldoAkhir"), 0) AS total
      FROM (
        SELECT DISTINCT ON ("anggotaId", "jenisSimpanan") "saldoAkhir"
        FROM "SimpananMutasi"
        ORDER BY "anggotaId", "jenisSimpanan", "createdAt" DESC
      ) s
    `,
  ]);

  return {
    totalAnggota,
    anggotaAktif,
    totalSimpanan: Number(saldoSimpanan[0]?.total ?? 0),
    pinjamanBerjalan: pinjaman.length,
    nilaiPinjamanBerjalan: pinjaman.reduce((a, p) => a + Number(p.nominalPengajuan), 0),
    produkWaserda,
    voucherAktif,
    akunCoa,
  };
}
