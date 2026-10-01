import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { formatIDR, formatTanggal } from "@/lib/utils";
import { getDaftarVoucher, getStatistikVoucher, ubahStatusVoucherForm } from "@/modules/waserda/voucher";
import { ServerForm } from "@/components/server-form";
import { SubmitButton } from "@/components/submit-button";
import { TambahVoucherDialog } from "@/components/waserda/tambah-voucher-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TicketPercent, CheckCircle2, RotateCcw } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VoucherPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ROLE_SUPERADMIN", "ROLE_ADMIN_SP", "ROLE_PENGURUS", "ROLE_KASIR"].includes(session.user.role)) {
    return <p className="text-muted-foreground">Akses terbatas.</p>;
  }

  const [vouchers, stat] = await Promise.all([getDaftarVoucher(), getStatistikVoucher()]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Voucher Diskon</h1>
          <p className="text-sm text-muted-foreground">
            Voucher untuk POS waserda. {stat.total} voucher dibuat, {stat.aktif} aktif, {stat.terpakai} kali terpakai.
          </p>
        </div>
        <TambahVoucherDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Voucher</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Potongan</TableHead>
                <TableHead>Masa Berlaku</TableHead>
                <TableHead className="text-right">Kuota</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchers.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-xs font-semibold text-primary">{v.kodeVoucher}</TableCell>
                  <TableCell className="font-medium">{v.namaVoucher}</TableCell>
                  <TableCell className="text-sm">
                    {v.tipePotongan === "PERSEN" ? `${Number(v.nilaiPotongan)}%` : formatIDR(v.nilaiPotongan)}
                    {v.maksimalPotongan ? <span className="block text-xs text-muted-foreground">maks. {formatIDR(v.maksimalPotongan)}</span> : null}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTanggal(v.berlakuMulai)} — {formatTanggal(v.berlakuSampai)}
                    <span className="block text-xs">{v.segmentasi} {v.khususAnggota ? "· anggota saja" : ""}</span>
                  </TableCell>
                  <TableCell className="tnum text-right">
                    {v.kuotaTerpakai.toLocaleString("id-ID")} / {v.kuotaTotal.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={v.status === "AKTIF" ? "success" : "secondary"}>{v.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <ServerForm action={ubahStatusVoucherForm}>
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="status" value={v.status === "AKTIF" ? "NONAKTIF" : "AKTIF"} />
                      <SubmitButton
                        pendingLabel="..."
                        size="sm"
                        variant={v.status === "AKTIF" ? "outline" : "secondary"}
                      >
                        {v.status === "AKTIF" ? <><RotateCcw className="mr-1 h-3 w-3" /> Nonaktifkan</> : <><CheckCircle2 className="mr-1 h-3 w-3" /> Aktifkan</>}
                      </SubmitButton>
                    </ServerForm>
                  </TableCell>
                </TableRow>
              ))}
              {vouchers.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Belum ada voucher.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <TicketPercent className="h-4 w-4" />
        {stat.terpakai.toLocaleString("id-ID")} kali pemakaian voucher tercatat pada transaksi waserda.
      </div>
    </div>
  );
}