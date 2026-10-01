import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { formatIDR } from "@/lib/utils";
import { getDaftarPengajuan, getPortofolioKredit } from "@/modules/simpan-pinjam/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Percent, WalletMinimal, CalendarX, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "info" | "secondary"> = {
  LUNAS: "success",
  DISBURSED: "success",
  APPROVED: "info",
  REVIEW_HRD: "warning",
  VERIFIKASI_ADMIN: "warning",
  DRAFT: "secondary",
  REJECTED: "destructive",
};

export default async function PinjamanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [portofolio, daftar] = await Promise.all([getPortofolioKredit(), getDaftarPengajuan()]);

  const totalPlafon = portofolio.reduce((s, p) => s + p.nominal, 0);
  const totalBaki = portofolio.reduce((s, p) => s + p.bakiDebet, 0);
  const totalPpap = portofolio.reduce((s, p) => s + p.ppap, 0);
  const totalNplNominal = portofolio.filter((p) => p.kolektibilitas >= 3).reduce((s, p) => s + p.bakiDebet, 0);
  const nplPersen = totalBaki > 0 ? (totalNplNominal / totalBaki) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pinjaman Anggota</h1>
          <p className="text-sm text-muted-foreground">Portofolio kredit, kolektibilitas, dan alur pengajuan.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/pinjaman/simulasi">
            <Button variant="outline">Simulasi Angsuran</Button>
          </Link>
          <Link href="/pinjaman/pengajuan">
            <Button>+ Pengajuan Baru</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={WalletMinimal} label="Total Plafon Aktif" value={formatIDR(totalPlafon)} sub={`${portofolio.length} kontrak`} />
        <Stat icon={WalletMinimal} label="Baki Debet" value={formatIDR(totalBaki)} sub="saldo pokok belum dilunasi" />
        <Stat icon={Percent} label="NPL" value={`${nplPersen.toFixed(1)}%`} sub="kolektibilitas ≥ 3" />
        <Stat icon={CalendarX} label="PPAP (Cadangan)" value={formatIDR(totalPpap)} sub="provisioning estimasi" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Daftar Pinjaman</CardTitle>
          <Link href="/pinjaman/approval" className="flex items-center gap-1 text-sm text-primary hover:underline">
            Alur Approval <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kontrak</TableHead>
                <TableHead>Anggota</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead className="text-right">Plafon</TableHead>
                <TableHead>Bunga</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daftar.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link href={`/pinjaman/${p.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                      {p.noKontrak}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    {p.anggota.namaLengkap}
                    <span className="block text-xs text-muted-foreground">{p.anggota.nak}</span>
                  </TableCell>
                  <TableCell>{p.jenisPinjaman}</TableCell>
                  <TableCell className="tnum text-right">{formatIDR(p.nominalPengajuan)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {Number(p.sukuBungaTahunan)}% / {p.metodeBunga}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[p.statusApproval] ?? "secondary"}>{p.statusApproval}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {daftar.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Belum ada pinjaman.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <p className="tnum mt-2 text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}