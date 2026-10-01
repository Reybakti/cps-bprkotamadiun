import { prisma } from "@/lib/db";

/**
 * Alokasi SHU sesuai AD/ART Koperasi (PRD Bab XIV & DITG 7.2):
 * 40% Dana Cadangan | 40% SHU Bagian Anggota (JMA 50% + JUA 50%)
 * 5% Pengurus & Pengawas | 5% Karyawan/Pengelola | 5% Pendidikan | 5% Sosial
 */
export const ALOKASI_SHU = [
  { kode: "CADANGAN", label: "Dana Cadangan Koperasi", persen: 40 },
  { kode: "ANGGOTA", label: "SHU Bagian Anggota (JMA + JUA)", persen: 40 },
  { kode: "PENGURUS", label: "Dana Pengurus & Pengawas", persen: 5 },
  { kode: "PENGELOLA", label: "Dana Karyawan / Pengelola", persen: 5 },
  { kode: "PENDIDIKAN", label: "Dana Pendidikan Koperasi", persen: 5 },
  { kode: "SOSIAL", label: "Dana Pembangunan Daerah / Sosial", persen: 5 },
] as const;

export interface AlokasiResult {
  totalLaba: number;
  rincian: { kode: string; label: string; persen: number; nominal: number }[];
}

export interface ShuAnggotaAlokasi {
  anggotaId: string;
  nak: string;
  nipKaryawan: string;
  namaLengkap: string;
  totalSimpanan: number; // pokok + wajib
  jasaUsaha: number; // bunga disetor + belanja bersih
  jma: number;
  jua: number;
  total: number;
}

export function hitungAlokasi(labaBersih: number): AlokasiResult {
  const rincian = ALOKASI_SHU.map((a) => ({
    kode: a.kode,
    label: a.label,
    persen: a.persen,
    nominal: Math.round((labaBersih * a.persen) / 100),
  }));
  return { totalLaba: labaBersih, rincian };
}

export async function hitungShuAnggota(
  pelaksanaanAkhir: string
): Promise<ShuAnggotaAlokasi[]> {
  const semua = await prisma.anggota.findMany({
    where: { statusAnggota: "AKTIF" },
    select: {
      id: true,
      nak: true,
      nipKaryawan: true,
      namaLengkap: true,
      simpananMutasi: {
        where: {
          jenisSimpanan: { in: ["POKOK", "WAJIB"] },
          tipeMutasi: "SETOR",
        },
        select: { nominal: true },
      },
      penjualan: {
        where: {
          metodeBayar: { not: "KASBON" } as never,
          createdAt: { lte: new Date(pelaksanaanAkhir) },
        },
        select: { totalAkhir: true, diskonVoucher: true },
      },
      pinjaman: {
        where: { statusApproval: { in: ["LUNAS", "DISBURSED"] } },
        select: {
          angsuranJadwal: {
            where: { statusBayar: "PAID" },
            select: { angsuranBunga: true },
          },
        },
      },
    },
  });

  // Kumpulkan hasil per anggota
  const rows: ShuAnggotaAlokasi[] = semua.map((a) => {
    const totalSimpanan = a.simpananMutasi.reduce((s, m) => s + Number(m.nominal), 0);
    const bungaDisetor = a.pinjaman.reduce(
      (s, p) => s + p.angsuranJadwal.reduce((x, g) => x + Number(g.angsuranBunga), 0),
      0
    );
    const belanjaBersih = a.penjualan.reduce(
      (s, p) => s + Number(p.totalAkhir) + Number(p.diskonVoucher ?? 0),
      0
    );
    const jasaUsaha = bungaDisetor + belanjaBersih;
    return {
      anggotaId: a.id,
      nak: a.nak,
      nipKaryawan: a.nipKaryawan,
      namaLengkap: a.namaLengkap,
      totalSimpanan,
      jasaUsaha,
      jma: 0,
      jua: 0,
      total: 0,
    };
  });

  const sumSimpanan = rows.reduce((s, r) => s + r.totalSimpanan, 0);
  const sumJasaUsaha = rows.reduce((s, r) => s + r.jasaUsaha, 0);

  return rows.map((r) => {
    const jma = sumSimpanan > 0 ? (r.totalSimpanan / sumSimpanan) * 0.5 : 0;
    const jua = sumJasaUsaha > 0 ? (r.jasaUsaha / sumJasaUsaha) * 0.5 : 0;
    return { ...r, jma, jua, total: jma + jua };
  });
}

export async function laksanakanShu(tahun: number, labaBersih: number, disetujuiOlehId?: string) {
  const alokasi = hitungAlokasi(labaBersih);
  const anggotaAlokasi = await hitungShuAnggota(`${tahun}-12-31`);
  const nominalAnggota = alokasi.rincian.find((r) => r.kode === "ANGGOTA")?.nominal ?? 0;

  const usulanJmaJua = anggotaAlokasi.map((a) => ({
    anggotaId: a.anggotaId,
    nak: a.nak,
    namaLengkap: a.namaLengkap,
    jma: a.jma * nominalAnggota,
    jua: a.jua * nominalAnggota,
    total: a.total * nominalAnggota,
  }));

  return prisma.shuCalculation.upsert({
    where: { tahun },
    create: {
      tahun,
      totalLaba: labaBersih,
      alokasi: alokasi.rincian,
      anggotaAlokasi: usulanJmaJua,
      disetujuiOlehId,
    },
    update: {
      totalLaba: labaBersih,
      alokasi: alokasi.rincian,
      anggotaAlokasi: usulanJmaJua,
      disetujuiOlehId,
    },
  });
}

export function slipShu(
  nama: string,
  nak: string,
  jma: number,
  jua: number,
  total: number,
  tahun: number
): string {
  const garis = "----------------------------------------";
  return [
    garis,
    "       SLIP PEMBAGIAN SHU KOPERASI",
    `                Tahun ${tahun}`,
    garis,
    `Nama   : ${nama}`,
    `NAK    : ${nak}`,
    garis,
    `Jasa Modal (JMA) : Rp${jma.toLocaleString("id-ID")}`,
    `Jasa Usaha (JUA) : Rp${jua.toLocaleString("id-ID")}`,
    garis,
    `TOTAL SHU        : Rp${total.toLocaleString("id-ID")}`,
    garis,
    "Terima kasih atas partisipasi Anda.",
  ].join("\n");
}