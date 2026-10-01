"use client";

import * as React from "react";
import { formatIDR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { buildEscPosReceipt, printEscPos, formatReceiptLine, type ReceiptLine } from "@/lib/printer/escpos";
import { Barcode, Search, Trash2, Loader2, Minus, Plus, Landmark } from "lucide-react";

export interface PosProduk {
  id: string;
  namaBarang: string;
  barcode: string;
  hargaJualUmum: number;
  hargaJualAnggota: number;
  stok: number;
  satuan: string;
}

export interface PosAnggota {
  id: string;
  namaLengkap: string;
  nak: string;
  nipKaryawan: string;
  statusKepegawaian: string;
  limitKasbonToko: number;
  statusAnggota: string;
}

export interface PosVoucher {
  kodeVoucher: string;
  tipePotongan: "NOMINAL" | "PERSEN";
  nilaiPotongan: number;
  maksimalPotongan: number | null;
  minBelanja: number;
  status: string;
  khususAnggota: boolean;
  segmentasi: string;
  kuotaTotal: number;
  kuotaTerpakai: number;
  kuotaPerUser: number;
  berlakuMulai: string;
  berlakuSampai: string;
}

interface KeranjangLine {
  produk: PosProduk;
  qty: number;
}

type Metode = "TUNAI" | "QRIS" | "KASBON";

interface HasilCheckout {
  noInvoice: string;
  totalAkhir: number;
  subtotal: number;
  diskonVoucher: number;
  metodeBayar: Metode;
  details: { namaBarang: string; qty: number; hargaSatuan: number; subtotal: number }[];
}

export function KasirPOS({
  produk,
  anggota,
  voucher,
  kasirNama,
  kasirId,
}: {
  produk: PosProduk[];
  anggota: PosAnggota[];
  voucher: PosVoucher[];
  kasirNama: string;
  kasirId: string;
}) {
  const [cari, setCari] = React.useState("");
  const [scan, setScan] = React.useState("");
  const [cart, setCart] = React.useState<KeranjangLine[]>([]);
  const [memberId, setMemberId] = React.useState("");
  const [kodeVoucher, setKodeVoucher] = React.useState("");
  const [metode, setMetode] = React.useState<Metode>("TUNAI");
  const [uangDiterima, setUangDiterima] = React.useState("");
  const [referensi, setReferensi] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [pesan, setPesan] = React.useState<{ sukses: boolean; teks: string } | null>(null);
  const [hasil, setHasil] = React.useState<HasilCheckout | null>(null);

  const member = anggota.find((a) => a.id === memberId);
  const isAnggota = !!member;

  const filter = cari.trim().toLowerCase();
  const produkTampil = produk.filter(
    (p) =>
      !filter ||
      p.namaBarang.toLowerCase().includes(filter) ||
      p.barcode.includes(filter)
  );

  const subtotal = cart.reduce((s, l) => s + (isAnggota ? l.produk.hargaJualAnggota : l.produk.hargaJualUmum) * l.qty, 0);

  const voucerDipakai = kodeVoucher.trim()
    ? voucher.find((v) => v.kodeVoucher === kodeVoucher.trim())
    : null;
  const diskonState = React.useMemo(() => {
    if (!voucerDipakai) return 0;
    let diskon =
      voucerDipakai.tipePotongan === "NOMINAL"
        ? voucerDipakai.nilaiPotongan
        : subtotal * (voucerDipakai.nilaiPotongan / 100);
    if (voucerDipakai.maksimalPotongan && diskon > voucerDipakai.maksimalPotongan) diskon = voucerDipakai.maksimalPotongan;
    return Math.round(Math.max(0, diskon));
  }, [voucerDipakai, subtotal]);
  const total = subtotal - diskonState;
  const uangN = Number(uangDiterima.replace(/\D/g, "")) || 0;
  const kembalian = uangN - total;

  function tambahBarang(p: PosProduk, qty = 1) {
    setCart((prev) => {
      const ada = prev.find((l) => l.produk.id === p.id);
      if (ada) return prev.map((l) => (l.produk.id === p.id ? { ...l, qty: l.qty + qty } : l));
      return [...prev, { produk: p, qty }];
    });
  }

  function onScan(e: React.FormEvent) {
    e.preventDefault();
    const kode = scan.trim();
    if (!kode) return;
    const p = produk.find((x) => x.barcode === kode);
    if (p) tambahBarang(p);
    else setPesan({ sukses: false, teks: `Barcode ${kode} tidak ditemukan.` });
    setScan("");
  }

  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "F8") {
        e.preventDefault();
        setMetode("TUNAI");
      }
      if (e.key === "F9") {
        e.preventDefault();
        setMetode("QRIS");
      }
      if (e.key === "F10") {
        e.preventDefault();
        setMetode("KASBON");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  async function bayar() {
    if (cart.length === 0) return;
    if (metode === "KASBON" && !isAnggota) {
      setPesan({ sukses: false, teks: "Kasbon wajib memilih anggota." });
      return;
    }
    if (metode === "TUNAI" && uangN < total) {
      setPesan({ sukses: false, teks: "Uang diterima kurang dari total." });
      return;
    }

    setLoading(true);
    setPesan(null);
    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kasirId,
          items: cart.map((l) => ({ produkId: l.produk.id, qty: l.qty })),
          metodeBayar: metode,
          anggotaId: isAnggota ? memberId : null,
          kodeVoucher: kodeVoucher.trim() || null,
          referensiPembayaran: referensi.trim() || null,
        }),
      });
      const hasilJson = await res.json();
      if (!res.ok || !hasilJson.success) {
        setPesan({ sukses: false, teks: hasilJson.error ?? "Transaksi gagal." });
        return;
      }
      const data = hasilJson.data as HasilCheckout;
      setHasil(data);
      setCart([]);
      setScan("");
      setKodeVoucher("");
      setUangDiterima("");
      setReferensi("");
      setPesan({ sukses: true, teks: `${data.noInvoice} tercatat.` });
      try {
        await cetakStruk(data, { kasirNama, isAnggota, membership: member?.statusKepegawaian ?? "" });
      } catch {
        // cetak gagal -> transaksi tetap sukses
      }
    } catch {
      setPesan({ sukses: false, teks: "Tidak dapat terhubung ke server." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_380px] lg:h-[calc(100vh-64px)]">
      {/* KIRI - KATALOG */}
      <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 lg:min-h-0">
        <div className="grid grid-cols-2 gap-2">
          <form onSubmit={onScan} className="relative">
            <Barcode className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              placeholder="Scan barcode / Enter"
              className="pl-8 font-mono"
              autoFocus
            />
          </form>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari barang..." className="pl-8" />
          </div>
        </div>

        <div className="grid flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {produkTampil.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                if (p.stok <= 0) {
                  setPesan({ sukses: false, teks: `${p.namaBarang} habis.` });
                  return;
                }
                tambahBarang(p);
              }}
              className="flex flex-col justify-between rounded-lg border p-3 text-left transition hover:bg-primary/5 disabled:opacity-40"
              disabled={p.stok <= 0}
            >
              <p className="line-clamp-2 text-sm font-medium">{p.namaBarang}</p>
              <div className="mt-1.5 flex items-end justify-between">
                <div>
                  <p className="tnum text-xs font-semibold text-primary">{formatIDR(isAnggota ? p.hargaJualAnggota : p.hargaJualUmum)}</p>
                  <p className="text-[10px] text-muted-foreground">stok {p.stok} {p.satuan}</p>
                </div>
                <Badge variant={p.stok <= 5 ? "warning" : "secondary"} className="text-[10px]">{p.stok}</Badge>
              </div>
            </button>
          ))}
          {produkTampil.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-muted-foreground">Tidak ada barang ditemukan.</p>
          )}
        </div>
      </div>

      {/* KANAN - KAS */}
      <div className="flex flex-col gap-3 rounded-xl border bg-white p-4 lg:min-h-0">
        {pesan && (
          <div className={`rounded-md px-3 py-2 text-sm ${pesan.sukses ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
            {pesan.teks}
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground">Kasir</p>
          <p className="font-semibold">{kasirNama}</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Anggota (untuk harga member / kasbon)</p>
          <Select value={memberId} onChange={(e) => setMemberId(e.target.value)} options={anggota.map((a) => ({
            value: a.id,
            label: `${a.nipKaryawan} - ${a.namaLengkap}`,
          }))} placeholder="Non-anggota (harga umum)" />
          {member && (
            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <Badge variant="secondary">Harga anggota</Badge>
              <Badge variant={Number(member.limitKasbonToko) <= 0 ? "destructive" : "warning"}>
                sisa limit {formatIDR(member.limitKasbonToko)}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto rounded-lg bg-slate-50 p-2">
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Keranjang kosong.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {cart.map((l) => {
                  const harga = isAnggota ? l.produk.hargaJualAnggota : l.produk.hargaJualUmum;
                  return (
                    <tr key={l.produk.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-1.5">
                        <p className="font-medium leading-tight">{l.produk.namaBarang}</p>
                        <p className="tnum text-xs text-muted-foreground">{formatIDR(harga)}</p>
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button size="icon-sm" variant="ghost" onClick={() => setCart((prev) => prev.map((x) => x.produk.id === l.produk.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="tnum w-6 text-center">{l.qty}</span>
                          <Button size="icon-sm" variant="ghost" onClick={() => tambahBarang(l.produk, 1)} disabled={l.qty >= l.produk.stok}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                      <td className="tnum text-right font-semibold">{formatIDR(harga * l.qty)}</td>
                      <td className="pl-1 text-right">
                        <Button size="icon-sm" variant="ghost" className="text-rose-500" onClick={() => setCart((prev) => prev.filter((x) => x.produk.id !== l.produk.id))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input value={kodeVoucher} onChange={(e) => setKodeVoucher(e.target.value)} placeholder="Kode voucher" className="pl-7" />
            </div>
            <Input value={referensi} onChange={(e) => setReferensi(e.target.value)} placeholder="No. referensi (opsional)" className="flex-1" />
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {(["TUNAI", "QRIS", "KASBON"] as Metode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetode(m)}
                className={`rounded-md border px-2 py-2 text-xs font-semibold ${metode === m ? "bg-primary text-primary-foreground" : "bg-white hover:bg-slate-50"}`}
              >
                {m} {m === "TUNAI" ? "(F8)" : m === "QRIS" ? "(F9)" : "(F10)"}
              </button>
            ))}
          </div>

          {metode === "TUNAI" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Uang Diterima</p>
                <Input value={uangDiterima} onChange={(e) => setUangDiterima(e.target.value)} placeholder="Rp" inputMode="numeric" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Kembalian</p>
                <p className={`tnum rounded-md border bg-slate-50 px-3 py-2 text-lg font-bold ${kembalian < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {formatIDR(Math.max(0, kembalian))}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-lg bg-slate-100 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tnum font-semibold">{formatIDR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Diskon voucher</span>
              <span className="tnum font-semibold">{formatIDR(diskonState)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-slate-200 pt-1.5 text-base">
              <span className="font-semibold">Total</span>
              <span className="tnum font-bold text-primary">{formatIDR(total)}</span>
            </div>
          </div>

          <Button type="button" className="w-full py-6" onClick={bayar} disabled={loading || cart.length === 0}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? "Memproses..." : `Bayar ${formatIDR(total)}`}
          </Button>

          {hasil && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              <Landmark className="h-3.5 w-3.5" />
              {hasil.noInvoice} tersimpan. Struk telah dikirim ke printer.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function cetakStruk(
  h: HasilCheckout,
  meta: { kasirNama: string; isAnggota: boolean; membership: string }
) {
  const sekarang = new Date();
  const garis: ReceiptLine[] = [
    { text: "KOPERASI KARYAWAN BPR", align: "center", doubleWidth: true },
    { text: "WASERDA", align: "center", bold: true },
    { text: `Kasir: ${meta.kasirNama}`, small: true, align: "left" },
    { text: `Tgl: ${sekarang.toLocaleString("id-ID")}`, small: true },
    { text: meta.isAnggota ? `Member: Ya (${meta.membership})` : "Member: Non-anggota", small: true },
    { text: "---" },
  ];

  for (const d of h.details) {
    garis.push({ text: d.namaBarang, small: true });
    garis.push({ text: formatReceiptLine(`${d.qty} x ${formatIDR(d.hargaSatuan)}`, formatIDR(d.subtotal), undefined, 30), small: true });
  }

  garis.push({ text: "---" });
  garis.push({ text: formatReceiptLine("Subtotal", formatIDR(h.subtotal), undefined, 30) });
  if (h.diskonVoucher > 0) garis.push({ text: formatReceiptLine("Diskon voucher", `-${formatIDR(h.diskonVoucher)}`, undefined, 30) });
  garis.push({ text: formatReceiptLine("TOTAL", formatIDR(h.totalAkhir), undefined, 30), bold: true });
  garis.push({ text: formatReceiptLine("Bayar", h.metodeBayar, undefined, 30) });
  garis.push({ text: `No: ${h.noInvoice}`, align: "center", small: true });
  garis.push({ text: "Terima kasih", align: "center", small: true });

  await printEscPos(buildEscPosReceipt(garis));
}