"use client";

import * as React from "react";
import { ServerForm } from "@/components/server-form";
import { SubmitButton } from "@/components/submit-button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { buatAnggotaForm } from "@/modules/core/actions";

const STATUS_KERJA = [
  { value: "TETAP", label: "Tetap" },
  { value: "KONTRAK", label: "Kontrak (PKWT)" },
  { value: "PROBATION", label: "Probation" },
];

export function TambahAnggotaDialog({ divisiList }: { divisiList: string[] }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} type="button">
        + Tambah Anggota
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Tambah Anggota Baru"
        description="Registrasi anggota sekaligus akun portal (default password dibuat otomatis)."
      >
        <ServerForm
          action={buatAnggotaForm}
          successMessage="Anggota berhasil didaftarkan. Salin password sementara dari notifikasi."
          onSuccess={() => setTimeout(() => setOpen(false), 800)}
        >
          <div className="grid grid-cols-2 gap-3">
                <Field>
                  <Label>NIP Pegawai</Label>
                  <Input name="nipKaryawan" placeholder="BPR-0001" required />
                </Field>
                <Field>
                  <Label>Nama Lengkap</Label>
                  <Input name="namaLengkap" placeholder="Nama sesuai KTP" required />
                </Field>
                <Field>
                  <Label>Divisi</Label>
                  <Select name="divisi" options={divisiList.map((d) => ({ value: d, label: d }))} />
                </Field>
                <Field>
                  <Label>Kantor Cabang</Label>
                  <Input name="kantorCabang" placeholder="Pusat" required />
                </Field>
                <Field>
                  <Label>Jabatan</Label>
                  <Input name="jabatan" placeholder="Teller" />
                </Field>
                <Field>
                  <Label>Status Kepegawaian</Label>
                  <Select name="statusKepegawaian" options={STATUS_KERJA} />
                </Field>
                <Field>
                  <Label>Tanggal Masuk</Label>
                  <Input name="tanggalMasuk" type="date" />
                </Field>
                <Field>
                  <Label>Akhir Kontrak (bila PKWT)</Label>
                  <Input name="tanggalBerakhirKontrak" type="date" />
                </Field>
                <Field className="col-span-2">
                  <Label>Gaji Bersih (penyebut DSR)</Label>
                  <Input name="gajiBersih" type="number" min={0} placeholder="4500000" required />
                </Field>
                <Field className="col-span-2">
                  <Label>Username (portal)</Label>
                  <Input name="username" placeholder="isi NIP bila kosong" />
                </Field>
          </div>
          <SubmitButton className="mt-4 w-full">Daftarkan Anggota</SubmitButton>
        </ServerForm>
      </Dialog>
    </>
  );
}

function Field({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1 ${className ?? ""}`}>{children}</div>;
}