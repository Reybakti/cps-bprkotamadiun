import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { formatDateTime } from "@/lib/utils";
import { getNeraca, getLabaRugi, getDaftarJurnal } from "@/modules/core/accounting/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AkuntansiTabs } from "@/components/akuntansi/akuntansi-tabs";

export const dynamic = "force-dynamic";

export default async function AkuntansiPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [neraca, labaRugi, jurnal] = await Promise.all([
    getNeraca(),
    getLabaRugi(new Date(new Date().getFullYear(), 0, 1), new Date()),
    getDaftarJurnal(15),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Akuntansi (SAK ETAP)</h1>
        <p className="text-sm text-muted-foreground">Neraca, laba rugi, dan jejak jurnal sistem.</p>
      </div>

      <AkuntansiTabs neraca={neraca} labaRugi={labaRugi} />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Jurnal Terbaru</CardTitle>
          <Link href="/akuntansi/bukubesar" className="text-sm text-primary hover:underline">
            Buku Besar →
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Jurnal</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead>Referensi</TableHead>
                <TableHead>Baris</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jurnal.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-mono text-xs font-semibold">{j.noJurnal}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(j.tanggal)}</TableCell>
                  <TableCell>{j.keterangan}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{j.referensi ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{j.lines.length} baris</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {jurnal.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Belum ada jurnal tercatat.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}