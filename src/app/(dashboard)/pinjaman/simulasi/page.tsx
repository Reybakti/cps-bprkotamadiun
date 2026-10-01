"use client";

import * as React from "react";
import Link from "next/link";
import { hitungAmortisasi, totalBungaKeseluruhan, type MetodeBunga } from "@/modules/simpan-pinjam/math/amortization";
import { formatIDR } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SimulasiPinjamanPage() {
  const [plafon, setPlafon] = React.useState("10000000");
  const [tenor, setTenor] = React.useState("12");
  const [bunga, setBunga] = React.useState("12");
  const [metode, setMetode] = React.useState<MetodeBunga>("FLAT");

  const nominal = Number(plafon.replace(/\D/g, "")) || 0;
  const tenorN = Number(tenor) || 0;
  const bungaN = Number(bunga) || 0;

  const jadwal = React.useMemo(
    () => (nominal > 0 && tenorN >= 3 && tenorN <= 36 ? hitungAmortisasi(metode, nominal, bungaN, tenorN) : []),
    [nominal, tenorN, bungaN, metode]
  );
  const totalBunga = totalBungaKeseluruhan(jadwal);
  const totalBayar = nominal + totalBunga;
  const angsuranAwal = jadwal[0]?.totalAngsuran ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/pinjaman" className="text-sm text-primary hover:underline">← Daftar pinjaman</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Simulasi Angsuran</h1>
        <p className="text-sm text-muted-foreground">Bandikan skema flat, efektif menurun, dan anuitas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parameter</CardTitle>
          <CardDescription>Gunakan koma/pemisah ribuan diperbolehkan; dihitung otomatis di sisi klien.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <Label>Plafon (Rp)</Label>
              <Input value={plafon} onChange={(e) => setPlafon(e.target.value)} inputMode="numeric" placeholder="10000000" />
            </div>
            <div className="space-y-1">
              <Label>Tenor (bulan)</Label>
              <Input type="number" value={tenor} onChange={(e) => setTenor(e.target.value)} min={3} max={36} />
            </div>
            <div className="space-y-1">
              <Label>Bunga / Tahun (%)</Label>
              <Input value={bunga} onChange={(e) => setBunga(e.target.value)} inputMode="decimal" placeholder="12" />
            </div>
            <div className="space-y-1">
              <Label>Metode Bunga</Label>
              <Select value={metode} onChange={(e) => setMetode(e.target.value as MetodeBunga)} options={[
                { value: "FLAT", label: "Flat" },
                { value: "EFEKTIF", label: "Efektif Menurun" },
                { value: "ANUITAS", label: "Anuitas" },
              ]} />
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Mini label="Angsuran Bulan 1" value={formatIDR(angsuranAwal)} />
            <Mini label="Total Bunga" value={formatIDR(totalBunga)} />
            <Mini label="Total Bayar" value={formatIDR(totalBayar)} />
          </div>
        </CardContent>
      </Card>

      {jadwal.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tabel Angsuran ({metode})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bulan</TableHead>
                  <TableHead className="text-right">Pokok</TableHead>
                  <TableHead className="text-right">Bunga</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Sisa Pokok</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jadwal.map((i) => (
                  <TableRow key={i.angsuranKe}>
                    <TableCell className="text-muted-foreground">{i.angsuranKe}</TableCell>
                    <TableCell className="tnum text-right">{formatIDR(i.angsuranPokok)}</TableCell>
                    <TableCell className="tnum text-right">{formatIDR(i.angsuranBunga)}</TableCell>
                    <TableCell className="tnum text-right font-semibold">{formatIDR(i.totalAngsuran)}</TableCell>
                    <TableCell className="tnum text-right text-muted-foreground">{formatIDR(i.sisaPokok)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="tnum text-right font-bold">{formatIDR(totalBayar)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-slate-50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tnum text-lg font-bold">{value}</p>
    </div>
  );
}