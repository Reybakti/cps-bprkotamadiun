import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { formatIDR, formatTanggal } from "@/lib/utils";
import { getBukuBesar } from "@/modules/core/accounting/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function BukuBesarPage({
  searchParams,
}: {
  searchParams: Promise<{ kode?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const sp = await searchParams;
  const kode = sp.kode ?? "1.1101";

  let data;
  try {
    data = await getBukuBesar(kode);
  } catch {
    data = null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Buku Besar</h1>
        <p className="text-sm text-muted-foreground">
          Riwayat mutasi dan saldo akun per kode CoA. Contoh kode: 1.1101 (Kas), 1.1201 (Piutang), 4.1101 (Bunga).
        </p>
      </div>

      <form method="GET" className="flex items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="kode">Kode Akun</Label>
          <Input id="kode" name="kode" defaultValue={kode} className="w-48 font-mono" placeholder="1.1101" />
        </div>
        <Button type="submit">Lihat</Button>
      </form>

      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {data.nama} <span className="ml-1 font-mono text-sm font-normal text-muted-foreground">({data.kodeAkun})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>No. Jurnal</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Kredit</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.baris.map((b, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">{formatTanggal(b.tanggal)}</TableCell>
                    <TableCell className="font-mono text-xs">{b.noJurnal}</TableCell>
                    <TableCell className="text-sm">{b.keterangan}{b.referensi && <span className="ml-1 text-muted-foreground">({b.referensi})</span>}</TableCell>
                    <TableCell className="tnum text-right">{b.debit ? formatIDR(b.debit) : "-"}</TableCell>
                    <TableCell className="tnum text-right">{b.kredit ? formatIDR(b.kredit) : "-"}</TableCell>
                    <TableCell className={`tnum text-right font-semibold ${b.saldo < 0 ? "text-rose-600" : ""}`}>{formatIDR(b.saldo)}</TableCell>
                  </TableRow>
                ))}
                {data.baris.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Belum ada mutasi.</TableCell></TableRow>
                )}
              </TableBody>
              {data.baris.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={5} className="font-semibold">Saldo Akhir</TableCell>
                    <TableCell className="tnum text-right font-bold">{formatIDR(data.baris[data.baris.length - 1].saldo)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </CardContent>
        </Card>
      )}

      {!data && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Akun {kode} tidak ditemukan.
          </CardContent>
        </Card>
      )}
    </div>
  );
}