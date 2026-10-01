import type { KlasifikasiAkun, PosisiNormal } from "@/generated/prisma/enums";

export interface CoaDef {
  kode: string;
  nama: string;
  klasifikasi: KlasifikasiAkun;
  posisiNormal: PosisiNormal;
  keterangan?: string;
}

/**
 * Bagan Akun Standar 5-Level SAK Koperasi (PRD Bab XI & DITG Bab XVI).
 * Klasifikasi: ASET, KEWAJIBAN, EKUITAS, PENDAPATAN, BEBAN.
 */
export const COA_LIST: CoaDef[] = [
  { kode: "1.1101", nama: "Kas Kasir Waserda / Toko", klasifikasi: "ASET", posisiNormal: "DEBIT", keterangan: "Saldo kas fisik toko" },
  { kode: "1.1102", nama: "Kas Operasional Koperasi", klasifikasi: "ASET", posisiNormal: "DEBIT" },
  { kode: "1.1110", nama: "Bank Operasional Koperasi", klasifikasi: "ASET", posisiNormal: "DEBIT" },
  { kode: "1.1201", nama: "Piutang Pinjaman Anggota", klasifikasi: "ASET", posisiNormal: "DEBIT" },
  { kode: "1.1202", nama: "Piutang Waserda (Kasbon Toko)", klasifikasi: "ASET", posisiNormal: "DEBIT" },
  { kode: "1.1299", nama: "Cadangan Penyisihan Piutang (PPAP)", klasifikasi: "ASET", posisiNormal: "KREDIT", keterangan: "Kontra aset" },
  { kode: "1.1301", nama: "Persediaan Barang Dagang Waserda", klasifikasi: "ASET", posisiNormal: "DEBIT" },
  { kode: "1.1401", nama: "Peralatan & Aset Kantor", klasifikasi: "ASET", posisiNormal: "DEBIT" },
  { kode: "1.1499", nama: "Akumulasi Penyusutan Aset", klasifikasi: "ASET", posisiNormal: "KREDIT", keterangan: "Kontra aset" },
  { kode: "2.1101", nama: "Simpanan Sukarela Anggota", klasifikasi: "KEWAJIBAN", posisiNormal: "KREDIT" },
  { kode: "2.1201", nama: "Hutang Dagang Pemasok Toko", klasifikasi: "KEWAJIBAN", posisiNormal: "KREDIT" },
  { kode: "2.1301", nama: "Titipan Dana Sosial / Pendidikan", klasifikasi: "KEWAJIBAN", posisiNormal: "KREDIT" },
  { kode: "3.1101", nama: "Simpanan Pokok Anggota", klasifikasi: "EKUITAS", posisiNormal: "KREDIT" },
  { kode: "3.1102", nama: "Simpanan Wajib Anggota", klasifikasi: "EKUITAS", posisiNormal: "KREDIT" },
  { kode: "3.1201", nama: "Dana Cadangan Koperasi", klasifikasi: "EKUITAS", posisiNormal: "KREDIT" },
  { kode: "3.1301", nama: "SHU Tahun Berjalan", klasifikasi: "EKUITAS", posisiNormal: "KREDIT" },
  { kode: "4.1101", nama: "Pendapatan Bunga Pinjaman", klasifikasi: "PENDAPATAN", posisiNormal: "KREDIT" },
  { kode: "4.1102", nama: "Pendapatan Biaya Administrasi", klasifikasi: "PENDAPATAN", posisiNormal: "KREDIT" },
  { kode: "4.2101", nama: "Pendapatan Penjualan Waserda", klasifikasi: "PENDAPATAN", posisiNormal: "KREDIT" },
  { kode: "4.3101", nama: "Pendapatan Lain-lain", klasifikasi: "PENDAPATAN", posisiNormal: "KREDIT" },
  { kode: "5.1101", nama: "Harga Pokok Penjualan (HPP)", klasifikasi: "BEBAN", posisiNormal: "DEBIT" },
  { kode: "5.1201", nama: "Beban Promosi & Diskon Voucher", klasifikasi: "BEBAN", posisiNormal: "DEBIT" },
  { kode: "6.1101", nama: "Beban Jasa Simpanan Sukarela", klasifikasi: "BEBAN", posisiNormal: "DEBIT" },
  { kode: "6.1201", nama: "Beban Gaji Pengelola & Kasir", klasifikasi: "BEBAN", posisiNormal: "DEBIT" },
  { kode: "6.1205", nama: "Beban Selisih Stok", klasifikasi: "BEBAN", posisiNormal: "DEBIT", keterangan: "Barang rusak/hilang stock opname" },
];

export const COA_MAP: Record<string, CoaDef> = Object.fromEntries(
  COA_LIST.map((c) => [c.kode, c])
);