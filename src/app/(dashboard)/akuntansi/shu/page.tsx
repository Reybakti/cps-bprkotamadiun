import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { formatIDR } from "@/lib/utils";
import { hitungAlokasi, hitungShuAnggota } from "@/modules/core/math/shu";
import { getLabaRugi } from "@/modules/core/accounting/reports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ShuPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tahun = new Date().getFullYear();
  const labaRugi = await getLabaRugi(new Date(tahun, 0, 1), new Date());
  const alokasi = hitungAlokasi(labaRugi.labaBersih);
  const alokasiAnggota = await hitungShuAnggota(`${tahun}-12-31`);

  const nominalAnggota = alokasi.rincian.find((r) => r.kode === "ANGGOTA")?.nominal ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SHU — Sisa Hasil Usaha {tahun}</h1>
        <p className="text-sm text-muted-foreground">
          Alokasi sesuai AD/ART: 40% cadangan, 40% anggota (JMA 50% + JUA 50%), 5%-5%-5%-5% lainnya.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Laba Bersih Koperasi</p>
            <p className={`tnum text-2xl font-bold ${labaRugi.labaBersih < 0 ? "text-rose-600" : "text-primary"}`}>
              {formatIDR(labaRugi.labaBersih)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Alokasi Bagian Anggota (40%)</p>
            <p className="tnum text-2xl font-bold">{formatIDR(nominalAnggota)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Penerima SHU (kalkulasi)</p>
            <p className="tnum text-2xl font-bold">{alokasiAnggota.length} anggota</p>
          </CardContent>
        </Card>
      </div>

      {labaRugi.labaBersih <= 0 && (
        <Alert variant="warning">
          Laba bersih ≤ 0, maka alokasi SHU dianggap 0. Silakan lengkapi pendapatan jasa &amp; penjualan.
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alokasi SHU</CardTitle>
          <CardDescription>Tabel alokasi menurut AD/ART Bab XIV</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Komponen</TableHead>
                <TableHead className="text-right">Persentase</TableHead>
                <TableHead className="text-right">Nominal Alokasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alokasi.rincian.map((r) => (
                <TableRow key={r.kode}>
                  <TableCell className="font-medium">{r.label}</TableCell>
                  <TableCell className="text-right">{r.persen}%</TableCell>
                  <TableCell className="tnum text-right">{formatIDR(r.nominal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proyeksi SHU per Anggota (JMA + JUA)</CardTitle>
          <CardDescription>Proporsional terhadap simpanan (JMA) dan jasa usaha (bunga + belanja, JUA).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NAK / Nama</TableHead>
                <TableHead className="text-right">Simpanan</TableHead>
                <TableHead className="text-right">Jasa Usaha</TableHead>
                <TableHead className="text-right">JMA (50%)</TableHead>
                <TableHead className="text-right">JUA (50%)</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alokasiAnggota.map((a) => (
                <TableRow key={a.anggotaId}>
                  <TableCell>
                    <span className="font-medium">{a.namaLengkap}</span>
                    <span className="block text-xs text-muted-foreground">{a.nak}</span>
                  </TableCell>
                  <TableCell className="tnum text-right">{formatIDR(a.totalSimpanan)}</TableCell>
                  <TableCell className="tnum text-right">{formatIDR(a.jasaUsaha)}</TableCell>
                  <TableCell className="tnum text-right">{formatIDR(a.jma * nominalAnggota)}</TableCell>
                  <TableCell className="tnum text-right">{formatIDR(a.jua * nominalAnggota)}</TableCell>
                  <TableCell className="tnum text-right font-semibold">{formatIDR(a.total * nominalAnggota)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}