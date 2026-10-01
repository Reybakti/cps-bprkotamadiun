// ============================================================
// Engine Evaluasi Debt Service Ratio (DSR) - Dev 2
// DSR = (Simp. Wajib + Cicilan Baru + Cicilan Aktif + Estimasi Kasbon)
//       / Gaji Bersih * 100%
// Kebijakan: hard-reject bila DSR > 40%
// ============================================================

export interface DsrParams {
  simpananWajibBulanan: number;
  cicilanBaruBulanan: number;
  cicilanAktifBulanan: number;
  estimasiKasbonBulanan: number;
  gajiBersihBulanan: number;
}

export type StatusDsr = "AMAN" | "MENDEKATI" | "DITOLAK";

export interface DsrResult {
  dsr: number; // persen
  batasMaks: number;
  status: StatusDsr;
  pesan: string;
  aman: boolean;
}

export function hitungDsr(p: DsrParams): number {
  if (p.gajiBersihBulanan <= 0) return 999;
  const pembilang =
    p.simpananWajibBulanan +
    p.cicilanBaruBulanan +
    p.cicilanAktifBulanan +
    p.estimasiKasbonBulanan;
  return (pembilang / p.gajiBersihBulanan) * 100;
}

export function evaluasiDsr(p: DsrParams, batasMaks = 40): DsrResult {
  const dsr = hitungDsr(p);
  let status: StatusDsr = "AMAN";
  let pesan = "Kapasitas potong gaji sangat aman.";

  if (dsr > batasMaks) {
    status = "DITOLAK";
    pesan = `Pengajuan ditolak otomatis (melebihi plafon ${batasMaks}%). Kapasitas pemotongan penghasilan telah melebihi batas ketentuan perkoperasian perbankan.`;
  } else if (dsr > batasMaks - 10) {
    status = "MENDEKATI";
    pesan = `Mendekati batas maksimum ketentuan (di bawah ${batasMaks}%).`;
  }

  return {
    dsr: Math.round(dsr * 2) / 2,
    batasMaks,
    status,
    pesan,
    aman: status !== "DITOLAK",
  };
}