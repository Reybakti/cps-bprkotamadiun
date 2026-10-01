// ============================================================
// Pustaka Matematika Finansial Bunga Pinjaman (Dev 2)
// Pure functions - diuji dengan unit testing.
// Mode: FLAT, EFEKTIF (menurun), ANUITAS
// ============================================================

export interface AmortisasiItem {
  angsuranKe: number;
  angsuranPokok: number;
  angsuranBunga: number;
  totalAngsuran: number;
  sisaPokok: number;
}

export type MetodeBunga = "FLAT" | "EFEKTIF" | "ANUITAS";

const rupiah = (n: number) => Math.round(n);

// 1) BUNGA FLAT: pokok & bunga konstan
export function hitungAmortisasiFlat(
  plafon: number,
  bungaTahunan: number,
  tenorBulan: number
): AmortisasiItem[] {
  const pokokPerBulan = rupiah(plafon / tenorBulan);
  const bungaPerBulan = rupiah((plafon * (bungaTahunan / 100)) / tenorBulan);
  let sisa = plafon;
  const hasil: AmortisasiItem[] = [];

  for (let i = 1; i <= tenorBulan; i++) {
    sisa = Math.max(0, sisa - pokokPerBulan);
    hasil.push({
      angsuranKe: i,
      angsuranPokok: pokokPerBulan,
      angsuranBunga: bungaPerBulan,
      totalAngsuran: pokokPerBulan + bungaPerBulan,
      sisaPokok: sisa,
    });
  }
  return hasil;
}

// 2) BUNGA EFEKTIF (MENURUN): bunga dari sisa saldo pokok
export function hitungAmortisasiEfektif(
  plafon: number,
  bungaTahunan: number,
  tenorBulan: number
): AmortisasiItem[] {
  const pokokPerBulan = rupiah(plafon / tenorBulan);
  let sisa = plafon;
  const hasil: AmortisasiItem[] = [];

  for (let i = 1; i <= tenorBulan; i++) {
    const bungaBulanIni = rupiah(sisa * (bungaTahunan / 100 / 12));
    sisa = Math.max(0, sisa - pokokPerBulan);

    // Koreksi sisa bulan terakhir agar tidak terjadi selisih pembulatan
    const pokokAktual = i === tenorBulan ? sisa + pokokPerBulan : pokokPerBulan;
    hasil.push({
      angsuranKe: i,
      angsuranPokok: pokokAktual,
      angsuranBunga: bungaBulanIni,
      totalAngsuran: pokokAktual + bungaBulanIni,
      sisaPokok: sisa,
    });
  }
  return hasil;
}

// 3) BUNGA ANUITAS: angsuran total konstan
export function hitungAmortisasiAnuitas(
  plafon: number,
  bungaTahunan: number,
  tenorBulan: number
): AmortisasiItem[] {
  const r = bungaTahunan / 100 / 12;
  const anuitas =
    r === 0
      ? rupiah(plafon / tenorBulan)
      : rupiah((plafon * r) / (1 - Math.pow(1 + r, -tenorBulan)));

  let sisa = plafon;
  const hasil: AmortisasiItem[] = [];

  for (let i = 1; i <= tenorBulan; i++) {
    let bungaBulanIni = rupiah(sisa * r);
    let pokokBulanIni = anuitas - bungaBulanIni;

    // Bulan terakhir: sisa pokok habis kembali
    if (i === tenorBulan) {
      pokokBulanIni = sisa;
      bungaBulanIni = Math.max(0, anuitas - pokokBulanIni);
      sisa = 0;
    } else {
      sisa = Math.max(0, sisa - pokokBulanIni);
    }

    hasil.push({
      angsuranKe: i,
      angsuranPokok: pokokBulanIni,
      angsuranBunga: bungaBulanIni,
      totalAngsuran: Math.round(pokokBulanIni + bungaBulanIni),
      sisaPokok: sisa,
    });
  }
  return hasil;
}

export const AMORTISASI_FACTORY: Record<MetodeBunga, typeof hitungAmortisasiFlat> = {
  FLAT: hitungAmortisasiFlat,
  EFEKTIF: hitungAmortisasiEfektif,
  ANUITAS: hitungAmortisasiAnuitas,
};

export function hitungAmortisasi(
  metode: MetodeBunga,
  plafon: number,
  bungaTahunan: number,
  tenorBulan: number
): AmortisasiItem[] {
  return AMORTISASI_FACTORY[metode](plafon, bungaTahunan, tenorBulan);
}

export function totalBungaKeseluruhan(itens: AmortisasiItem[]): number {
  return itens.reduce((s, i) => s + i.angsuranBunga, 0);
}

export function totalAngsuranKeseluruhan(itens: AmortisasiItem[]): number {
  return itens.reduce((s, i) => s + i.totalAngsuran, 0);
}

/** Angsuran per bulan untuk evaluasi DSR (cicilan baru). */
export function angsuranPerBulan(metode: MetodeBunga, plafon: number, bungaTahunan: number, tenorBulan: number): number {
  const jadwal = hitungAmortisasi(metode, plafon, bungaTahunan, tenorBulan);
  if (jadwal.length === 0) return 0;
  // Rata-rata angsuran bulan pertama s.d. ketiga (anuitas konstan, efektif menurun)
  const slice = jadwal.slice(0, Math.min(3, jadwal.length));
  return Math.round(slice.reduce((s, i) => s + i.totalAngsuran, 0) / slice.length);
}