import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatIDR, formatTanggal } from "@/lib/utils";
import { hitungClearance } from "@/modules/core/math/clearance";
import { oneClickClearanceForm, ubahStatusAnggotaForm } from "@/modules/core/actions";
import { ServerForm } from "@/components/server-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AnggotaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  const anggota = await prisma.anggota.findUnique({
    where: { id },
    include: {
      user: { select: { username: true } },
      simpananMutasi: { orderBy: { createdAt: "desc" }, take: 10 },
      pinjaman: { include: { angsuranJadwal: true }, orderBy: { createdAt: "desc" } },
      clearance: true,
    },
  });
  if (!anggota) notFound();

  const clearance = await hitungClearance(id).catch(() => null);

  return (
    <div className="space-y-6">
      <Link href="/anggota" className="text-sm text-primary hover:underline">← Kembali ke daftar</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{anggota.namaLengkap}</h1>
          <p className="text-sm text-muted-foreground">
            {anggota.nak} &middot; NIP {anggota.nipKaryawan} &middot; {anggota.divisi} - {anggota.kantorCabang}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={anggota.statusAnggota === "AKTIF" ? "success" : "warning"}>{anggota.statusAnggota}</Badge>
          <Badge variant="secondary">{anggota.statusKepegawaian}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Summary label="Simpanan (Pokok)" value={formatIDR(anggota.simpananMutasi.find((m) => m.jenisSimpanan === "POKOK" && m.tipeMutasi === "SETOR")?.nominal ?? 0)} />
        <Summary label="Gaji Bersih" value={formatIDR(anggota.gajiBersih)} />
        <Summary label="Limit Kasbon Berjalan" value={formatIDR(anggota.limitKasbonToko)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Simpanan &amp; Pinjaman</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {anggota.simpananMutasi.slice(0, 8).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.jenisSimpanan} ({m.tipeMutasi})</TableCell>
                    <TableCell className="text-muted-foreground">{formatTanggal(m.createdAt)}</TableCell>
                    <TableCell className="tnum text-right">{formatIDR(m.nominal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 space-y-2">
              {anggota.pinjaman.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <Link href={`/pinjaman/${p.id}`} className="font-medium text-primary hover:underline">{p.noKontrak}</Link>
                  <span className="text-muted-foreground">{formatIDR(p.nominalPengajuan)}</span>
                  <Badge variant="secondary">{p.statusApproval}</Badge>
                </div>
              ))}
              {anggota.pinjaman.length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada pinjaman.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">One-Click Clearance</CardTitle>
              <CardDescription>
                Saldo Hak = (Pokok + Wajib + Sukarela) − (Sisa Pokok + Bunga + Kasbon toko)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {clearance && (
                <>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Row label="Simpanan Pokok" value={formatIDR(clearance.totalSimpananPokok)} />
                    <Row label="Simpanan Wajib" value={formatIDR(clearance.totalSimpananWajib)} />
                    <Row label="Simpanan Sukarela" value={formatIDR(clearance.totalSimpananSukarela)} />
                    <Row label="Sisa Pokok Kredit" value={formatIDR(clearance.sisaPokokKredit)} />
                    <Row label="Bunga Berjalan" value={formatIDR(clearance.bungaBerjalan)} />
                    <Row label="Kasbon Toko" value={formatIDR(clearance.kasbonToko)} />
                    <Row label="Saldo Hak Bersih" value={formatIDR(clearance.saldoHakBersih)} bold />
                  </div>
                  {clearance.status === "FROZEN" ? (
                    <Alert variant="warning">
                      <AlertTitle>Saldo hak bersih negatif</AlertTitle>
                      <AlertDescription>
                        Simpanan tidak menutup kewajiban. Status anggota akan dibekukan (FROZEN).
                      </AlertDescription>
                    </Alert>
                  ) : clearance.status === "TAGIHAN" ? (
                    <Alert variant="info">
                      <AlertTitle>Masih ada kewajiban</AlertTitle>
                      <AlertDescription>Simpanan melunasi seluruh kewajiban berjalan.</AlertDescription>
                    </Alert>
                  ) : null}
                  <ServerForm
                    action={oneClickClearanceForm}
                    successMessage="Clearance berhasil diproses. Seluruh simpanan dikembalikan dan kewajiban dilunasi."
                  >
                    <input type="hidden" name="anggotaId" value={anggota.id} />
                    <input type="hidden" name="keterangan" value="Clearance via dashboard" />
                    <SubmitButton pendingLabel="Memproses..." variant="destructive" className="w-full">
                      Proses Clearance ({clearance.status})
                    </SubmitButton>
                  </ServerForm>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ubah Status Anggota</CardTitle>
            </CardHeader>
            <CardContent>
              <ServerForm action={ubahStatusAnggotaForm} successMessage="Status anggota diperbarui.">
                <input type="hidden" name="id" value={anggota.id} />
                <Label>Status</Label>
                <Select
                  name="statusAnggota"
                  className="mt-1"
                  defaultValue={anggota.statusAnggota}
                  options={["AKTIF", "NONAKTIF", "FROZEN", "RESIGN"].map((s) => ({ value: s, label: s }))}
                />
                <SubmitButton className="mt-3 w-full" variant="secondary">
                  Perbarui Status
                </SubmitButton>
              </ServerForm>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="tnum mt-1 text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-1">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tnum ${bold ? "font-bold" : ""}`}>{value}</span>
    </div>
  );
}