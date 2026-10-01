import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ajukanPinjamanForm } from "@/modules/simpan-pinjam/actions";
import { ServerForm } from "@/components/server-form";
import { SubmitButton } from "@/components/submit-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";

export const dynamic = "force-dynamic";

export default async function PengajuanPinjamanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ROLE_SUPERADMIN", "ROLE_ADMIN_SP"].includes(session.user.role)) {
    return <p className="text-muted-foreground">Akses terbatas.</p>;
  }

  const anggotaAktif = await prisma.anggota.findMany({
    where: { statusAnggota: "AKTIF" },
    orderBy: { nipKaryawan: "asc" },
    select: { id: true, nak: true, namaLengkap: true, nipKaryawan: true, gajiBersih: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/pinjaman" className="text-sm text-primary hover:underline">← Daftar pinjaman</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Pengajuan Pinjaman</h1>
        <p className="text-sm text-muted-foreground">
          Sistem menolak keras (hard reject) bila DSR melebihi 40% terhadap gaji bersih.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Form Pengajuan</CardTitle>
          <CardDescription>Setelah disimpan berstatus DRAFT dan mulai diproses oleh Admin.</CardDescription>
        </CardHeader>
        <CardContent>
          <ServerForm action={ajukanPinjamanForm} successMessage="Pengajuan tersimpan dan masuk antrean approval.">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <Label>Anggota</Label>
                  <Select
                    name="anggotaId"
                    options={anggotaAktif.map((a) => ({ value: a.id, label: `${a.nipKaryawan} - ${a.namaLengkap}` }))}
                    placeholder="Pilih anggota"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Jenis Pinjaman</Label>
                  <Select
                    name="jenisPinjaman"
                    defaultValue="MULTIGUNA"
                    options={[
                      { value: "MULTIGUNA", label: "Multiguna (plafon s.d. 100 jt)" },
                      { value: "DARURAT", label: "Darurat (plafon s.d. 25 jt)" },
                      { value: "BARANG", label: "Barang / rumah tangga" },
                    ]}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Metode Bunga</Label>
                  <Select
                    name="metodeBunga"
                    defaultValue="FLAT"
                    options={[
                      { value: "FLAT", label: "Flat" },
                      { value: "EFEKTIF", label: "Efektif Menurun" },
                      { value: "ANUITAS", label: "Anuitas" },
                    ]}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Nominal Pengajuan (Rp)</Label>
                  <Input name="nominalPengajuan" type="number" min={250000} placeholder="10000000" required />
                </div>
                <div className="space-y-1">
                  <Label>Tenor (bulan)</Label>
                  <Input name="tenorBulan" type="number" min={3} max={36} placeholder="12" required />
                </div>
                <div className="space-y-1">
                  <Label>Suku Bunga / Tahun (%)</Label>
                  <Input name="sukuBungaTahunan" type="number" step="0.1" min={0.1} max={30} placeholder="12" required />
                </div>
                <div className="space-y-1">
                  <Label>Estimasi Kasbon Bulanan (Rp)</Label>
                  <Input name="estimasiKasbon" type="number" min={0} defaultValue={0} placeholder="0" />
                </div>
                <div className="col-span-2">
                  <Alert variant="info">
                    DSR = (cicilan baru + cicilan aktif + kasbon) / gaji bersih. &gt;40% → pengajuan ditolak otomatis.
                  </Alert>
                </div>
                <SubmitButton pendingLabel="Memeriksa DSR & menyimpan..." className="col-span-2 w-full">
                  Ajukan Pinjaman
                </SubmitButton>
            </div>
          </ServerForm>
        </CardContent>
      </Card>
    </div>
  );
}