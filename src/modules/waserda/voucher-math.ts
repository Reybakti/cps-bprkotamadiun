export interface VoucherLike {
  tipePotongan: "NOMINAL" | "PERSEN";
  nilaiPotongan: number;
  maksimalPotongan?: number | null;
}

/** Perhitungan diskon murni (tanpa validasi kelayakan). Pure function. */
export function hitungDiskonVoucher(v: VoucherLike, subtotal: number): number {
  let diskon =
    v.tipePotongan === "NOMINAL"
      ? v.nilaiPotongan
      : subtotal * (v.nilaiPotongan / 100);
  if (v.maksimalPotongan && diskon > v.maksimalPotongan) diskon = v.maksimalPotongan;
  return Math.round(Math.max(0, diskon));
}