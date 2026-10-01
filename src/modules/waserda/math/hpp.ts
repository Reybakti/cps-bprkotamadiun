// Metode Harga Pokok Rata-Rata Bergerak (Moving Average)
// Dev 3 - Inventori and POS Waserda

export interface HppResult {
  hppBaru: number;
  stokBaru: number;
  nilaiPersediaan: number;
}

// HPP_baru = (StokLama * HPPLama + QtyBelanja * HargaBeliBaru) / (StokLama + QtyBelanja)
export function hitungHppMovingAverage(
  stokLama: number,
  hppLama: number,
  qtyMasuk: number,
  hargaBeliBaru: number
): number {
  const totalUnit = stokLama + qtyMasuk;
  if (totalUnit <= 0) return 0;
  return (stokLama * hppLama + qtyMasuk * hargaBeliBaru) / totalUnit;
}

export function hitungHppSetelahMasuk(
  produk: { stok: number; hargaBeliHpp: number },
  qtyMasuk: number,
  hargaBeliBaru: number
): HppResult {
  const hppBaru = hitungHppMovingAverage(
    Number(produk.stok),
    Number(produk.hargaBeliHpp),
    qtyMasuk,
    hargaBeliBaru
  );
  const stokBaru = Number(produk.stok) + qtyMasuk;
  return { hppBaru, stokBaru, nilaiPersediaan: stokBaru * hppBaru };
}

// Penilaian HPP untuk pembahasan COGS penjualan / stock opname
export function nilaiHppPerBarang(qty: number, hppSatuan: number): number {
  return qty * hppSatuan;
}

export function hitungNilaiPersediaanDaftar(
  items: { qty: number; hargaBeliHpp: number }[]
): number {
  return items.reduce((s, i) => s + i.qty * i.hargaBeliHpp, 0);
}