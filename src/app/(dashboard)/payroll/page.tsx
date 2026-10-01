import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { formatIDR, formatPeriode, periodeBulanIni } from "@/lib/utils";
import { generateMonthlyPayrollForm, importSettlementForm } from "@/modules/core/payroll-actions";
import { getPayrollRows, getPayrollPeriodeList } from "@/modules/core/payroll";
import { ServerForm } from "@/components/server-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Upload, CircleDollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ROLE_SUPERADMIN", "ROLE_HRD"].includes(session.user.role)) {
    return <p className="text-muted-foreground">Akses terbatas.</p>;
  }

  const sp = await searchParams;
  const periode = sp.periode ?? periodeBulanIni();
  const rows = await getPayrollRows(periode);
  const periodeList = await getPayrollPeriodeList();

  const total = rows.reduce((acc, r) => acc + r.totalPotongan, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payroll &amp; Potongan Gaji</h1>
        <p className="text-sm text-muted-foreground">
          Perhitungan gaji bersih per bulan dengan potongan simpanan, angsuran kredit, dan kasbon waserda.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate Payroll</CardTitle>
            <CardDescription>
              Membuat baris payroll untuk periode tertentu dari seluruh anggota aktif.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ServerForm action={generateMonthlyPayrollForm} successMessage="Payroll berhasil dibuat.">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="periode">Periode (bulan gaji)</Label>
                  <Input id="periode" name="periodeBulan" type="month" defaultValue={periode} required />
                </div>
                <SubmitButton pendingLabel="Menghitung..." className="w-full">
                  Generate Payroll
                </SubmitButton>
              </div>
            </ServerForm>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export CSV</CardTitle>
            <CardDescription>
              Download payroll periode terpilih (8 kolom) untuk diimpor ke bank.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert variant="info">
              Kolom: kode, periode, nip, nama, gaji, potongan, bersih, referensi.
            </Alert>
            <a
              href={`/api/payroll/export?periode=${periode}`}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Download className="h-4 w-4" /> Download payroll-{periode}.csv
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import Settlement</CardTitle>
            <CardDescription>
              Tandai gaji periode ini sudah dibayarkan; potongan mulai diakui (angsuran, kasbon, simpanan).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ServerForm action={importSettlementForm} successMessage="Settlement payroll berhasil diproses.">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="sp">Periode</Label>
                  <Input id="sp" name="periodeBulan" type="month" defaultValue={periode} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ref">No. Referensi Bank</Label>
                  <Input id="ref" name="noRefBayar" placeholder="BRI-20260918-001" required />
                </div>
                <SubmitButton pendingLabel="Memproses..." className="w-full" variant="secondary">
                  Konfirmasi Pembayaran
                  <Upload className="ml-2 h-4 w-4" />
                </SubmitButton>
              </div>
            </ServerForm>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {periodeList.length === 0 && (
          <p className="text-sm text-muted-foreground">Belum ada periode payroll. Generate payroll terlebih dahulu.</p>
        )}
        {periodeList.map((p) => (
          <a
            key={p.periodeBulan}
            href={`/payroll?periode=${p.periodeBulan}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              p.periodeBulan === periode ? "bg-primary text-primary-foreground" : "bg-slate-200 hover:bg-slate-300"
            }`}
          >
            {formatPeriode(p.periodeBulan)}
          </a>
        ))}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            Rincian Payroll — {formatPeriode(periode)}
            <span className="ml-2 font-normal text-muted-foreground">({rows.length} karyawan)</span>
          </CardTitle>
          <Badge variant="secondary">
            <CircleDollarSign className="mr-1 h-3 w-3" /> Total potongan {formatIDR(total)}
          </Badge>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Belum ada data. Klik &quot;Generate Payroll&quot; untuk periode ini.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NIP</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead className="text-right">Simpanan Wajib</TableHead>
                  <TableHead className="text-right">Angs. Pokok</TableHead>
                  <TableHead className="text-right">Angs. Bunga</TableHead>
                  <TableHead className="text-right">Kasbon</TableHead>
                  <TableHead className="text-right">Total Potongan</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={`${r.nipKaryawan}-${i}`}>
                    <TableCell className="text-muted-foreground">{r.nipKaryawan}</TableCell>
                    <TableCell className="font-medium">{r.namaLengkap}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.divisi} - {r.kantorCabang}</TableCell>
                    <TableCell className="tnum text-right">{formatIDR(r.nominalSimpananWajib)}</TableCell>
                    <TableCell className="tnum text-right">{formatIDR(r.nominalAngsuranPokok)}</TableCell>
                    <TableCell className="tnum text-right">{formatIDR(r.nominalAngsuranBunga)}</TableCell>
                    <TableCell className="tnum text-right">{formatIDR(r.nominalKasbonToko)}</TableCell>
                    <TableCell className="tnum text-right font-semibold text-rose-600">-{formatIDR(r.totalPotongan)}</TableCell>
                    <TableCell>
                      <Badge variant={r.statusSettlement === "SETTLED" ? "success" : r.statusSettlement === "EXPORTED" ? "info" : "warning"}>
                        {r.statusSettlement}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {rows.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={7}>Total Potongan</TableCell>
                    <TableCell className="tnum text-right font-bold text-rose-600">-{formatIDR(total)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}