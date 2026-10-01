import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatIDR, formatTanggal } from "@/lib/utils";
import { bayarAngsuranForm, earlyRepaymentForm } from "@/modules/simpan-pinjam/actions";
import { ServerForm } from "@/components/server-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export default async function DetailPinjamanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  const p = await prisma.pinjaman.findUnique({
    where: { id },
    include: {
      anggota: { select: { namaLengkap: true, nak: true, nipKaryawan: true, gajiBersih: true } },
      angsuranJadwal: { orderBy: { angsuranKe: "asc" } },
    },
  });
  if (!p) notFound();

  const pending = p.angsuranJadwal.filter((a) => a.statusBayar === "PENDING");
  const bakiPokok = pending.reduce((s, a) => s + Number(a.angsuranPokok), 0);
  const bakiBunga = pending.reduce((s, a) => s + Number(a.angsuranBunga), 0);

  return (
    <div className="space-y-6">
      <Link href="/pinjaman" className="text-sm text-primary hover:underline">← Kembali ke pinjaman</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{p.noKontrak}</h1>
          <p className="text-sm text-muted-foreground">
            {p.anggota.namaLengkap} · {p.anggota.nak} · NIP {p.anggota.nipKaryawan}
          </p>
        </div>
        <Badge variant={p.statusApproval === "LUNAS" ? "success" : p.statusApproval === "DISBURSED" ? "info" : "warning"}>
          {p.statusApproval}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Plafon" value={formatIDR(p.nominalPengajuan)} />
        <Stat label="Bunga" value={`${p.sukuBungaTahunan}% ${p.metodeBunga}`} />
        <Stat label="Baki Pokok" value={formatIDR(bakiPokok)} />
        <Stat label="Baki Bunga" value={formatIDR(bakiBunga)} />
      </div>

      {p.statusApproval === "DISBURSED" && pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pelunasan Dini</CardTitle>
            <CardDescription>
              Diskon bunga <strong>50%</strong> untuk sisa bunga, pokok dilunasi penuh.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ServerForm action={earlyRepaymentForm} successMessage="Pinjaman lunas dengan diskon bunga 50%.">
              <input type="hidden" name="pinjamanId" value={p.id} />
              <SubmitButton pendingLabel="Melunasi..." variant="destructive">
                Lunasi Sekarang ({formatIDR(Math.round(bakiPokok + bakiBunga * 0.5))})
              </SubmitButton>
            </ServerForm>
          </CardContent>
        </Card>
      )}

      {p.statusApproval !== "DISBURSED" && p.statusApproval !== "LUNAS" && (
        <Alert variant="info">
          Pinjaman masih dalam proses approval. Jadwal angsuran akan muncul setelah dana dicairkan.
        </Alert>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Jadwal Angsuran</CardTitle>
          <span className="text-sm text-muted-foreground">{p.angsuranJadwal.length} bulan</span>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ke</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead className="text-right">Pokok</TableHead>
                <TableHead className="text-right">Bunga</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.angsuranJadwal.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-muted-foreground">{a.angsuranKe}</TableCell>
                  <TableCell className="text-muted-foreground">{formatTanggal(a.tglJatuhTempo)}</TableCell>
                  <TableCell className="tnum text-right">{formatIDR(a.angsuranPokok)}</TableCell>
                  <TableCell className="tnum text-right">{formatIDR(a.angsuranBunga)}</TableCell>
                  <TableCell className="tnum text-right font-semibold">{formatIDR(Number(a.angsuranPokok) + Number(a.angsuranBunga))}</TableCell>
                  <TableCell>
                    <Badge variant={a.statusBayar === "PAID" ? "success" : a.statusBayar === "LUNAS" ? "secondary" : "warning"}>
                      {a.statusBayar}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {a.statusBayar === "PENDING" && p.statusApproval === "DISBURSED" ? (
                      <ServerForm action={bayarAngsuranForm} successMessage={`Angsuran ke-${a.angsuranKe} dibayar.`}>
                        <input type="hidden" name="pinjamanAngsuranId" value={a.id} />
                        <SubmitButton pendingLabel="..." size="sm" variant="secondary">
                          Bayar
                        </SubmitButton>
                      </ServerForm>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {p.angsuranJadwal.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Jadwal belum dibuat.
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="tnum mt-1 text-lg font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}