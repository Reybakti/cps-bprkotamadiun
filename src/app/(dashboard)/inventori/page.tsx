import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatIDR } from "@/lib/utils";
import { InventoriBuilder, TambahProdukDialog } from "@/components/waserda/inventori-builder";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function InventoriPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ROLE_SUPERADMIN", "ROLE_ADMIN_SP", "ROLE_KASIR", "ROLE_PENGURUS"].includes(session.user.role)) {
    return <p className="text-muted-foreground">Akses terbatas.</p>;
  }

  const produk = await prisma.produk.findMany({
    orderBy: { namaBarang: "asc" },
  });

  const produkView = produk.map((p) => ({
    id: p.id,
    namaBarang: p.namaBarang,
    barcode: p.barcode,
    kategori: p.kategori,
    satuan: p.satuan,
    stok: Number(p.stok),
    hargaBeliHpp: Number(p.hargaBeliHpp),
    hargaJualUmum: Number(p.hargaJualUmum),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventori Waserda</h1>
          <p className="text-sm text-muted-foreground">Data barang, pembelian masuk (PO), dan opname stok.</p>
        </div>
        <TambahProdukDialog />
      </div>

      <InventoriBuilder produk={produkView} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Barang</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barcode</TableHead>
                <TableHead>Nama Barang</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">HPP</TableHead>
                <TableHead className="text-right">Harga Umum</TableHead>
                <TableHead className="text-right">Stok</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produkView.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.barcode}</TableCell>
                  <TableCell className="font-medium">{p.namaBarang}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.kategori}</TableCell>
                  <TableCell className="tnum text-right">{formatIDR(p.hargaBeliHpp)}</TableCell>
                  <TableCell className="tnum text-right">{formatIDR(p.hargaJualUmum)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={p.stok === 0 ? "destructive" : p.stok <= 5 ? "warning" : "success"}>
                      {p.stok}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}