// ============================================================
// Klasifikasi NPL Kolektibilitas (Dev 2)
// Standar Permenkop UKM No. 9/2020
// PPAP (Cadangan Penyisihan Piutang) Calculator
// ============================================================

export interface KolektibilitasInfo {
  kolektibilitas: number; // 1-5
  label: string;
  klasifikasi: string;
  hariKeterlambatan: number;
  ppapPersen: number;
}

const DATA_KOLEKTIBILITAS: Omit<KolektibilitasInfo, "hariKeterlambatan">[] = [
  { kolektibilitas: 1, label: "Kol 1", klasifikasi: "Lancar", ppapPersen: 0.5 },
  { kolektibilitas: 2, label: "Kol 2", klasifikasi: "Dalam Perhatian Khusus", ppapPersen: 5 },
  { kolektibilitas: 3, label: "Kol 3", klasifikasi: "Kurang Lancar", ppapPersen: 15 },
  { kolektibilitas: 4, label: "Kol 4", klasifikasi: "Diragukan", ppapPersen: 50 },
  { kolektibilitas: 5, label: "Kol 5", klasifikasi: "Macet", ppapPersen: 100 },
];

export function klasifikasiKolektibilitas(hariKeterlambatan: number): KolektibilitasInfo {
  let idx: number;
  if (hariKeterlambatan <= 0) idx = 0;
  else if (hariKeterlambatan <= 90) idx = 1;
  else if (hariKeterlambatan <= 120) idx = 2;
  else if (hariKeterlambatan <= 180) idx = 3;
  else idx = 4;

  return { ...DATA_KOLEKTIBILITAS[idx], hariKeterlambatan };
}

export function hitungPpap(saldoBakiDebet: number, kolektibilitas: number): number {
  const info = DATA_KOLEKTIBILITAS[kolektibilitas - 1] ?? DATA_KOLEKTIBILITAS[0];
  return Math.round(saldoBakiDebet * (info.ppapPersen / 100));
}

/** Menghitung hari keterlambatan dari tanggal jatuh tempo ke referensi. */
export function hitungHariKeterlambatan(
  tglJatuhTempo: Date,
  referensi: Date = new Date()
): number {
  const jatuh = new Date(tglJatuhTempo);
  const selisih = referensi.getTime() - jatuh.getTime();
  return Math.max(0, Math.floor(selisih / (1000 * 60 * 60 * 24)));
}

/** Menentukan kolektibilitas pinjaman berdasarkan angsuran tertunggak paling panjang. */
export function tentukanKolektibilitas(hariTertunggakMaks: number): number {
  return klasifikasiKolektibilitas(hariTertunggakMaks).kolektibilitas;
}

/** Total saldo baki debet aktif. */
export function totalBakiDebet(
  pinjaman: { sisaPokok?: number; kolektibilitas: number }[]
): number {
  return pinjaman.reduce((s, p) => s + (p.sisaPokok ?? 0), 0);
}

/** Aggregasi PPAP seluruh pinjaman aktif per kolektibilitas. */
export function aggregasiPpap(
  pinjaman: { nominalPengajuan: number; kolektibilitas: number; angsuranSisa?: number }[]
) {
  const rekap = new Map<number, { total: number; ppap: number; count: number }>();
  for (const p of pinjaman) {
    const kol = p.kolektibilitas;
    const cur = rekap.get(kol) ?? { total: 0, ppap: 0, count: 0 };
    cur.total += p.nominalPengajuan;
    cur.ppap += hitungPpap(p.nominalPengajuan, kol);
    cur.count += 1;
    rekap.set(kol, cur);
  }
  return Array.from(rekap.entries()).map(([k, v]) => ({
    kolektibilitas: k,
    info: DATA_KOLEKTIBILITAS[k - 1],
    total: v.total,
    ppap: v.ppap,
    count: v.count,
  }));
}