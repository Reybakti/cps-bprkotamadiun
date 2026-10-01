import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatIDR } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TambahAnggotaDialog } from "@/components/anggota/tambah-anggota-dialog";
import { Search } from "lucide-react";

export const dynamic = "force-dynamic";

const LABEL_STATUS: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "info" }> = {
  AKTIF: { label: "Aktif", variant: "success" },
  NONAKTIF: { label: "Nonaktif", variant: "warning" },
  FROZEN: { label: "Frozen", variant: "destructive" },
  RESIGN: { label: "Resign", variant: "info" },
};

export default async function AnggotaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; divisi?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ROLE_SUPERADMIN", "ROLE_HRD", "ROLE_PENGURUS"].includes(session.user.role)) {
    return <p className="text-muted-foreground">Akses terbatas pada role tertentu.</p>;
  }

  const sp = await searchParams;
  const anggota = await prisma.anggota.findMany({
    where: {
      ...(sp.q
        ? {
            OR: [
              { namaLengkap: { contains: sp.q, mode: "insensitive" } },
              { nipKaryawan: { contains: sp.q, mode: "insensitive" } },
              { nak: { contains: sp.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(sp.divisi ? { divisi: sp.divisi } : {}),
      ...(sp.status ? { statusAnggota: sp.status as "AKTIF" | "NONAKTIF" | "FROZEN" | "RESIGN" } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const divisiList = await prisma.anggota.findMany({ distinct: ["divisi"], select: { divisi: true } });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Anggota</h1>
          <p className="text-sm text-muted-foreground">
            Keanggotaan, status kepegawaian, dan batas-batas limit per anggota.
          </p>
        </div>
        <TambahAnggotaDialog divisiList={divisiList.map((d) => d.divisi)} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Daftar Anggota</CardTitle>
          <form method="GET" className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" placeholder="Cari nama / NIP / NAK..." className="w-64 pl-8" />
            </div>
            <Button type="submit" size="sm" variant="outline">Cari</Button>
          </form>
        </CardHeader>
        <CardContent>
          {anggota.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Belum ada data anggota. Silakan tambah anggota baru.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NAK</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Divisi / Kantor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Gaji Bersih</TableHead>
                  <TableHead className="text-right">Limit Kasbon</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {anggota.map((a) => {
                  const st = LABEL_STATUS[a.statusAnggota] ?? { label: a.statusAnggota, variant: "info" as const };
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Link href={`/anggota/${a.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                          {a.nak}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">{a.namaLengkap}</TableCell>
                      <TableCell className="text-muted-foreground">{a.nipKaryawan}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {a.divisi}
                        <span className="block text-xs">{a.kantorCabang}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={st.variant}>{st.label}</Badge>
                        <span className="block text-[11px] text-muted-foreground">{a.statusKepegawaian}</span>
                      </TableCell>
                      <TableCell className="tnum text-right">{formatIDR(a.gajiBersih)}</TableCell>
                      <TableCell className="tnum text-right">{formatIDR(a.limitKasbonToko)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}