import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Users,
  HandCoins,
  ShoppingBag,
  PackageSearch,
  ArrowRight,
  Wallet,
  CircleDollarSign,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatIDR, formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role;

  const [jumlahAnggota, pengajuan, portofolio, rekap, stokRendah, simpananTotal] = await Promise.all([
    prisma.anggota.count({ where: { statusAnggota: "AKTIF" } }),
    prisma.pinjaman.count({ where: { statusApproval: "DRAFT" } }),
    prisma.pinjaman.aggregate({
      where: { statusApproval: "DISBURSED" },
      _sum: { nominalPengajuan: true },
    }),
    prisma.penjualan.aggregate({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
        statusBayar: { not: "VOID" },
      },
      _count: true,
      _sum: { totalAkhir: true },
    }),
    prisma.produk.findMany({ where: { stok: { lte: 0 } }, take: 5, orderBy: { namaBarang: "asc" } }),
    prisma.simpananMutasi.aggregate({
      where: { tipeMutasi: "SETOR" },
      _sum: { nominal: true },
    }),
  ]);

  const pengajuanTerbaru = await prisma.pinjaman.findMany({
    where: { statusApproval: "DRAFT" },
    include: { anggota: { select: { namaLengkap: true, nak: true } } },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  const ro = role;
  const showOperasional = ro !== "ROLE_ANGGOTA";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Selamat datang, {session.user.nama || session.user.username}. Ringkasan kinerja koperasi hari ini.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="Anggota Aktif"
          value={jumlahAnggota.toLocaleString("id-ID")}
          sub="total keanggotaan aktif"
        />
        <MetricCard
          icon={HandCoins}
          label="Pengajuan Menunggu"
          value={pengajuan.toLocaleString("id-ID")}
          sub="antrean di tahap awal"
        />
        <MetricCard
          icon={CircleDollarSign}
          label="Portofolio Kredit"
          value={formatIDR(portofolio._sum.nominalPengajuan ?? 0)}
          sub="nominal pinjaman berjalan"
        />
        <MetricCard
          icon={ShoppingBag}
          label="Omzet Waserda"
          value={formatIDR(rekap._sum.totalAkhir ?? 0)}
          sub={`${rekap._count} transaksi hari ini`}
        />
      </div>

      {showOperasional && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Pengajuan Pinjaman Baru</CardTitle>
              <Link href="/pinjaman/approval" className="flex items-center gap-1 text-sm text-primary hover:underline">
                Kelola <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {pengajuanTerbaru.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada pengajuan baru.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Anggota</TableHead>
                      <TableHead>Nominal</TableHead>
                      <TableHead>Diajukan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pengajuanTerbaru.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.anggota.namaLengkap}
                          <span className="block text-xs text-muted-foreground">{p.anggota.nak}</span>
                        </TableCell>
                        <TableCell className="tnum">{formatIDR(p.nominalPengajuan)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDateTime(p.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Stok Menipis / Habits</CardTitle>
                <Link href="/inventori" className="flex items-center gap-1 text-sm text-primary hover:underline">
                  Inventori <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent>
                {stokRendah.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">Semua stok aman.</p>
                ) : (
                  <Table>
                    <TableBody>
                      {stokRendah.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell><PackageSearch className="mr-2 h-4 w-4 inline text-muted-foreground" />{p.namaBarang}</TableCell>
                          <TableCell className="text-right"><Badge variant="destructive">{Number(p.stok)} stok</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Simpanan Kooperasi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3">
                  <Wallet className="h-8 w-8 text-primary" />
                  <p className="tnum text-3xl font-bold">{formatIDR(simpananTotal._sum.nominal ?? 0)}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Total dana simpanan yang dikelola (setoran tercatat).</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="tnum mt-2 text-2xl font-bold">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}