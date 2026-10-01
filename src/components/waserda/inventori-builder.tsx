"use client";

import * as React from "react";
import { ServerForm } from "@/components/server-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Trash2, Plus, FileSpreadsheet, PackagePlus } from "lucide-react";
import { catatPurchaseOrderForm, catatStockOpnameForm, buatProdukForm } from "@/modules/waserda/produk";
import { Dialog } from "@/components/ui/dialog";

export interface ProdukOption {
  id: string;
  namaBarang: string;
  barcode: string;
  stok: number;
  satuan: string;
}

export function InventoriBuilder({ produk }: { produk: ProdukOption[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <PoCard produk={produk} />
      <OpnameCard produk={produk} />
    </div>
  );
}

function PoCard({ produk }: { produk: ProdukOption[] }) {
  const [rows, setRows] = React.useState<{ produkId: string; qty: string; hargaBeli: string }[]>([
    { produkId: "", qty: "1", hargaBeli: "" },
  ]);

  const options = produk.map((p) => ({
    value: p.id,
    label: `${p.namaBarang} (stok ${p.stok})`,
  }));

  function setRow(i: number, patch: Partial<(typeof rows)[number]>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const details = rows
    .filter((r) => r.produkId && Number(r.qty) > 0)
    .map((r) => ({ produkId: r.produkId, qty: Number(r.qty), hargaBeli: Number(r.hargaBeli) || 0 }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PackagePlus className="h-4 w-4 text-primary" /> Purchase Order (Barang Masuk)
        </CardTitle>
        <CardDescription>
          HPP dihitung ulang dengan moving average dan stok bertambah otomatis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ServerForm action={catatPurchaseOrderForm} successMessage="PO tercatat, stok dan HPP diperbarui.">
          <>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Supplier</Label>
                  <Input name="supplier" placeholder="Nama pemasok" required />
                </div>
                <div className="space-y-1">
                  <Label>Tanggal Faktur</Label>
                  <Input name="tanggal" type="date" />
                </div>
              </div>

              {details.length > 0 && (
                <input type="hidden" name="details" value={JSON.stringify(details)} />
              )}

              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-[1fr_70px_110px_36px] items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span>Barang</span>
                  <span>Qty</span>
                  <span>Harga Beli</span>
                  <span />
                </div>
                {rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_70px_110px_36px] items-center gap-2">
                    <Select
                      value={r.produkId}
                      onChange={(e) => setRow(i, { produkId: e.target.value })}
                      options={options}
                      placeholder="Pilih barang"
                    />
                    <Input
                      type="number"
                      min={1}
                      value={r.qty}
                      onChange={(e) => setRow(i, { qty: e.target.value })}
                      className="h-8"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={r.hargaBeli}
                      onChange={(e) => setRow(i, { hargaBeli: e.target.value })}
                      placeholder="Rp"
                      className="h-8"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 text-rose-500"
                      onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                      disabled={rows.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setRows((prev) => [...prev, { produkId: "", qty: "1", hargaBeli: "" }])}
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Baris
                </Button>
              </div>

              <SubmitButton className="mt-4 w-full" disabled={details.length === 0}>
                Catat PO
              </SubmitButton>
            </>
        </ServerForm>
      </CardContent>
    </Card>
  );
}

function OpnameCard({ produk }: { produk: ProdukOption[] }) {
  const [rows, setRows] = React.useState<{ produkId: string; stokFisik: string }[]>([
    { produkId: "", stokFisik: "" },
  ]);

  const options = produk.map((p) => ({
    value: p.id,
    label: `${p.namaBarang} (sistem: ${p.stok})`,
  }));

  function setRow(i: number, patch: Partial<(typeof rows)[number]>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const items = rows
    .filter((r) => r.produkId)
    .map((r) => ({ produkId: r.produkId, stokFisik: Number(r.stokFisik) || 0 }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-4 w-4 text-primary" /> Stock Opname (Berita Acara)
        </CardTitle>
        <CardDescription>
          Selisih stok dicatat sebagai Beban / Surplus persediaan dalam jurnal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ServerForm action={catatStockOpnameForm} successMessage="Opname disimpan; selisih telah dijurnal.">
          <>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>No. Berita Acara</Label>
                  <Input name="noBeritaAcara" placeholder="BA-2026-09-001" required />
                </div>
                <div className="space-y-1">
                  <Label>Catatan</Label>
                  <Input name="catatan" placeholder="Opsional" />
                </div>
              </div>

              {items.length > 0 && <input type="hidden" name="items" value={JSON.stringify(items)} />}

              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-[1fr_100px_36px] items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span>Barang</span>
                  <span>Stok Fisik</span>
                  <span />
                </div>
                {rows.map((r, i) => (
                  <div key={i} className="grid grid-cols-[1fr_100px_36px] items-center gap-2">
                    <Select
                      value={r.produkId}
                      onChange={(e) => setRow(i, { produkId: e.target.value })}
                      options={options}
                      placeholder="Pilih barang"
                    />
                    <Input
                      type="number"
                      min={0}
                      value={r.stokFisik}
                      onChange={(e) => setRow(i, { stokFisik: e.target.value })}
                      placeholder="Stok nyata"
                      className="h-8"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 text-rose-500"
                      onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                      disabled={rows.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setRows((prev) => [...prev, { produkId: "", stokFisik: "" }])}
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Baris
                </Button>
              </div>

              <SubmitButton className="mt-4 w-full" disabled={items.length === 0}>
                Simpan Berita Acara
              </SubmitButton>
            </>
        </ServerForm>
      </CardContent>
    </Card>
  );
}

export function TambahProdukDialog() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} type="button">
        + Tambah Barang
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Tambah Barang Baru"
        description="Daftarkan produk untuk transaksi POS waserda."
      >
        <ServerForm action={buatProdukForm} successMessage="Barang berhasil ditambahkan." onSuccess={() => setTimeout(() => setOpen(false), 700)}>
          <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Barcode</Label>
                <Input name="barcode" placeholder="8991234567890" required />
              </div>
              <div className="space-y-1">
                <Label>Nama Barang</Label>
                <Input name="namaBarang" placeholder="Indomie Goreng" required />
              </div>
              <div className="space-y-1">
                <Label>Kategori</Label>
                <Input name="kategori" placeholder="Makanan" required />
              </div>
              <div className="space-y-1">
                <Label>Satuan</Label>
                <Input name="satuan" defaultValue="PCS" />
              </div>
              <div className="space-y-1">
                <Label>HPP Awal</Label>
                <Input name="hargaBeliHpp" type="number" min={0} defaultValue={0} required />
              </div>
              <div className="space-y-1">
                <Label>Harga Umum</Label>
                <Input name="hargaJualUmum" type="number" min={0} defaultValue={0} required />
              </div>
              <div className="space-y-1">
                <Label>Harga Anggota</Label>
                <Input name="hargaJualAnggota" type="number" min={0} defaultValue={0} required />
              </div>
              <div className="space-y-1">
                <Label>Stok Minimum</Label>
                <Input name="stokMinimum" type="number" min={0} defaultValue={5} />
              </div>
              <SubmitButton className="col-span-2 w-full">Tambahkan</SubmitButton>
          </div>
        </ServerForm>
      </Dialog>
    </>
  );
}