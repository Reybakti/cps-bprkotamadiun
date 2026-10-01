import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatIDR, formatDateTime } from "@/lib/utils";
import { setorSimpananForm, tarikSimpananSukarelaForm } from "@/modules/simpan-pinjam/simpanan";
import { ServerForm } from "@/components/server-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SimpananPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [anggotaAktif, mutasi, ringkasan] = await Promise.all([
    prisma.anggota.findMany({
      where: { statusAnggota: "AKTIF" },
      orderBy: { nipKaryawan: "asc" },
      select: { id: true, nak: true, namaLengkap: true, nipKaryawan: true },
    }),
    prisma.simpananMutasi.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { anggota: { select: { namaLengkap: true, nak: true } } },
    }),
    prisma.simpananMutasi.groupBy({ by: ["jenisSimpanan"], _sum: { nominal: true } }),
  ]);

  const ringkasanMap = new Map(ringkasan.map((r) => [r.jenisSimpanan, Number(r._sum.nominal ?? 0)]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Simpanan Anggota</h1>
        <p className="text-sm text-muted-foreground">Setoran pokok, wajib, dan sukarela beserta historinya.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {(["POKOK", "WAJIB", "SUKARELA"] as const).map((j) => (
          <Card key={j}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Simpanan {j}</p>
              </div>
              <p className="tnum mt-1 text-2xl font-bold">{formatIDR(ringkasanMap.get(j) ?? 0)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Setor Simpanan</CardTitle>
          </CardHeader>
          <CardContent>
            <ServerForm action={setorSimpananForm} successMessage="Simpanan berhasil disetor dan dijurnal.">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Anggota</Label>
                  <Select name="anggotaId" options={anggotaAktif.map((a) => ({ value: a.id, label: `${a.nipKaryawan} - ${a.namaLengkap}` }))} placeholder="Pilih anggota" required />
                </div>
                <div className="space-y-1">
                  <Label>Jenis</Label>
                  <Select name="jenisSimpanan" options={["POKOK", "WAJIB", "SUKARELA"].map((v) => ({ value: v, label: v }))} defaultValue="WAJIB" />
                </div>
                <div className="space-y-1">
                  <Label>Nominal</Label>
                  <Input name="nominal" type="number" min={1} placeholder="100000" required />
                </div>
                <div className="space-y-1">
                  <Label>Keterangan</Label>
                  <Input name="keterangan" placeholder="Opsional" />
                </div>
                <SubmitButton className="w-full">Setor Sekarang</SubmitButton>
              </div>
            </ServerForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tarik Simpanan Sukarela</CardTitle>
          </CardHeader>
          <CardContent>
            <ServerForm action={tarikSimpananSukarelaForm} successMessage="Penarikan sukarela berhasil.">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Anggota</Label>
                  <Select name="anggotaId" options={anggotaAktif.map((a) => ({ value: a.id, label: `${a.nipKaryawan} - ${a.namaLengkap}` }))} placeholder="Pilih anggota" required />
                </div>
                <div className="space-y-1">
                  <Label>Nominal</Label>
                  <Input name="nominal" type="number" min={1} placeholder="100000" required />
                </div>
                <div className="space-y-1">
                  <Label>Keterangan</Label>
                  <Input name="keterangan" placeholder="Opsional" />
                </div>
                <SubmitButton className="w-full" variant="secondary">Tarik Sukarela</SubmitButton>
              </div>
            </ServerForm>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Mutasi Simpanan</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Anggota</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mutasi.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-muted-foreground">{formatDateTime(m.createdAt)}</TableCell>
                  <TableCell className="font-medium">{m.anggota.namaLengkap}<span className="block text-xs text-muted-foreground">{m.anggota.nak}</span></TableCell>
                  <TableCell>{m.jenisSimpanan}</TableCell>
                  <TableCell>
                    <Badge variant={m.tipeMutasi === "SETOR" ? "success" : m.tipeMutasi === "TARIK" ? "warning" : "secondary"}>{m.tipeMutasi}</Badge>
                  </TableCell>
                  <TableCell className={`tnum text-right font-semibold ${m.tipeMutasi === "TARIK" || m.tipeMutasi === "CLEARANCE" ? "text-rose-600" : ""}`}>
                    {m.tipeMutasi === "SETOR" || m.tipeMutasi === "BUNGA" ? "+" : "-"}{formatIDR(m.nominal)}
                  </TableCell>
                </TableRow>
              ))}
              {mutasi.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Belum ada mutasi simpanan.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}