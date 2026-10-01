import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatIDR } from "@/lib/utils";
import { approvalPinjamanForm, cairkanPinjamanForm } from "@/modules/simpan-pinjam/actions";
import { ServerForm } from "@/components/server-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

const STATUSOK = ["DRAFT", "VERIFIKASI_ADMIN", "REVIEW_HRD", "APPROVED"] as const;

export default async function ApprovalPinjamanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ROLE_SUPERADMIN", "ROLE_ADMIN_SP", "ROLE_HRD", "ROLE_PENGURUS"].includes(session.user.role)) {
    return <p className="text-muted-foreground">Akses terbatas pada role tertentu.</p>;
  }

  const daftar = await prisma.pinjaman.findMany({
    where: { statusApproval: { in: [...STATUSOK] } },
    include: { anggota: { select: { namaLengkap: true, nak: true, gajiBersih: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alur Approval Pinjaman</h1>
          <p className="text-sm text-muted-foreground">
            DRAFT → Verifikasi Admin → Review HRD → Disetujui → Disbursed → Lunas
          </p>
        </div>
        <Badge variant="secondary">{daftar.length} menunggu</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Antrean Persetujuan</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kontrak</TableHead>
                <TableHead>Anggota</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead className="text-right">Plafon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daftar.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.noKontrak}</TableCell>
                  <TableCell>
                    <span className="font-medium">{p.anggota.namaLengkap}</span>
                    <span className="block text-xs text-muted-foreground">{p.anggota.nak}</span>
                  </TableCell>
                  <TableCell className="text-sm">{p.jenisPinjaman}</TableCell>
                  <TableCell className="tnum text-right">{formatIDR(p.nominalPengajuan)}</TableCell>
                  <TableCell>
                    <Badge variant={p.statusApproval === "APPROVED" ? "info" : p.statusApproval === "REVIEW_HRD" ? "success" : "warning"}>
                      {p.statusApproval}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Tindakan pinjamanId={p.id} status={p.statusApproval} />
                  </TableCell>
                </TableRow>
              ))}
              {daftar.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Tidak ada pengajuan dalam antrean saat ini.
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

function Tindakan({ pinjamanId, status }: { pinjamanId: string; status: string }) {
  if (status === "DRAFT") {
    return (
      <ServerForm action={approvalPinjamanForm} successMessage="Pengajuan masuk tahap verifikasi admin.">
        <input type="hidden" name="pinjamanId" value={pinjamanId} />
        <input type="hidden" name="status" value="VERIFIKASI_ADMIN" />
        <SubmitButton pendingLabel="..." size="sm">Mulai Verifikasi</SubmitButton>
      </ServerForm>
    );
  }

  if (status === "VERIFIKASI_ADMIN") {
    return (
      <div className="flex justify-end gap-2">
        <ServerForm action={approvalPinjamanForm} successMessage="Pengajuan direview HRD.">
          <input type="hidden" name="pinjamanId" value={pinjamanId} />
          <input type="hidden" name="status" value="REVIEW_HRD" />
          <SubmitButton pendingLabel="..." size="sm">→ HRD</SubmitButton>
        </ServerForm>
        <ServerForm action={approvalPinjamanForm} successMessage="Pengajuan ditolak.">
          <input type="hidden" name="pinjamanId" value={pinjamanId} />
          <input type="hidden" name="status" value="REJECTED" />
          <SubmitButton pendingLabel="..." size="sm" variant="outline" className="text-rose-600">Tolak</SubmitButton>
        </ServerForm>
      </div>
    );
  }

  if (status === "REVIEW_HRD") {
    return (
      <div className="flex justify-end gap-2">
        <ServerForm action={approvalPinjamanForm} successMessage="Pengajuan disetujui keputusan pengurus.">
          <input type="hidden" name="pinjamanId" value={pinjamanId} />
          <input type="hidden" name="status" value="APPROVED" />
          <SubmitButton pendingLabel="..." size="sm">Setujui</SubmitButton>
        </ServerForm>
        <ServerForm action={approvalPinjamanForm} successMessage="Pengajuan ditolak.">
          <input type="hidden" name="pinjamanId" value={pinjamanId} />
          <input type="hidden" name="status" value="REJECTED" />
          <SubmitButton pendingLabel="..." size="sm" variant="outline" className="text-rose-600">Tolak</SubmitButton>
        </ServerForm>
      </div>
    );
  }

  return (
    <ServerForm action={cairkanPinjamanForm} successMessage="Dana dicairkan dan jadwal angsuran dibuat.">
      <div className="flex items-end justify-end gap-2">
        <input type="hidden" name="pinjamanId" value={pinjamanId} />
        <div className="flex flex-col items-start gap-1">
          <Label className="text-[11px]">Biaya Adm</Label>
          <Input name="biayaAdministrasi" type="number" min={0} defaultValue={0} className="h-8 w-24" />
        </div>
        <div className="flex flex-col items-start gap-1">
          <Label className="text-[11px]">Sumber</Label>
          <Select name="sumberDana" defaultValue="BANK" className="h-8 w-28" options={[
            { value: "BANK", label: "Dana Bank" },
            { value: "KAS", label: "Kas" },
          ]} />
        </div>
        <SubmitButton pendingLabel="..." size="sm">Cairkan</SubmitButton>
      </div>
    </ServerForm>
  );
}