import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { KasirPOS, type PosProduk, type PosAnggota, type PosVoucher } from "@/components/kasir/kasir-pos";

export const dynamic = "force-dynamic";

export default async function KasirPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ROLE_SUPERADMIN", "ROLE_KASIR"].includes(session.user.role)) redirect("/");

  const [produkRaw, anggotaRaw, voucherRaw] = await Promise.all([
    prisma.produk.findMany({ orderBy: { namaBarang: "asc" } }),
    prisma.anggota.findMany({
      where: { statusAnggota: "AKTIF" },
      orderBy: { nipKaryawan: "asc" },
    }),
    prisma.voucher.findMany({ where: { status: "AKTIF" } }),
  ]);

  const produk: PosProduk[] = produkRaw.map((p) => ({
    id: p.id,
    namaBarang: p.namaBarang,
    barcode: p.barcode,
    hargaJualUmum: Number(p.hargaJualUmum),
    hargaJualAnggota: Number(p.hargaJualAnggota),
    stok: Number(p.stok),
    satuan: p.satuan,
  }));

  const anggota: PosAnggota[] = anggotaRaw.map((a) => ({
    id: a.id,
    namaLengkap: a.namaLengkap,
    nak: a.nak,
    nipKaryawan: a.nipKaryawan,
    statusKepegawaian: a.statusKepegawaian,
    statusAnggota: a.statusAnggota,
    limitKasbonToko: Number(a.limitKasbonToko),
  }));

  const voucher: PosVoucher[] = voucherRaw.map((v) => ({
    kodeVoucher: v.kodeVoucher,
    tipePotongan: v.tipePotongan,
    nilaiPotongan: Number(v.nilaiPotongan),
    maksimalPotongan: v.maksimalPotongan ? Number(v.maksimalPotongan) : null,
    minBelanja: Number(v.minBelanja),
    status: v.status,
    khususAnggota: v.khususAnggota,
    segmentasi: v.segmentasi,
    kuotaTotal: v.kuotaTotal,
    kuotaTerpakai: v.kuotaTerpakai,
    kuotaPerUser: v.kuotaPerUser,
    berlakuMulai: new Date(v.berlakuMulai).toISOString(),
    berlakuSampai: new Date(v.berlakuSampai).toISOString(),
  }));

  return (
    <KasirPOS
      produk={produk}
      anggota={anggota}
      voucher={voucher}
      kasirNama={session.user.nama || session.user.username}
      kasirId={session.user.id}
    />
  );
}