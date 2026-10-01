"use client";

import * as React from "react";
import { ServerForm } from "@/components/server-form";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { buatVoucherForm } from "@/modules/waserda/voucher";

export function TambahVoucherDialog() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} type="button">
        + Buat Voucher
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Buat Voucher Baru"
        description="Voucher dipakai pada POS waserda untuk diskon belanja."
      >
        <ServerForm action={buatVoucherForm} successMessage="Voucher berhasil dibuat." onSuccess={() => setTimeout(() => setOpen(false), 700)}>
          <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Kode</Label>
                <Input name="kodeVoucher" placeholder="MANIS10" required />
              </div>
              <div className="space-y-1">
                <Label>Nama</Label>
                <Input name="namaVoucher" placeholder="Promo Manis 10%" required />
              </div>
              <div className="space-y-1">
                <Label>Tipe Potongan</Label>
                <Select name="tipePotongan" defaultValue="PERSEN" options={[
                  { value: "PERSEN", label: "Persentase (%)" },
                  { value: "NOMINAL", label: "Nominal (Rp)" },
                ]} />
              </div>
              <div className="space-y-1">
                <Label>Nilai</Label>
                <Input name="nilaiPotongan" type="number" min={1} step="0.01" placeholder="10" required />
              </div>
              <div className="space-y-1">
                <Label>Maksimal Potongan (Rp)</Label>
                <Input name="maksimalPotongan" type="number" min={0} placeholder="50000" />
              </div>
              <div className="space-y-1">
                <Label>Min. Belanja (Rp)</Label>
                <Input name="minBelanja" type="number" min={0} defaultValue={0} />
              </div>
              <div className="space-y-1">
                <Label>Kuota Total</Label>
                <Input name="kuotaTotal" type="number" min={1} defaultValue={10} />
              </div>
              <div className="space-y-1">
                <Label>Kuota / User</Label>
                <Input name="kuotaPerUser" type="number" min={1} defaultValue={1} />
              </div>
              <div className="space-y-1">
                <Label>Segmentasi</Label>
                <Select name="segmentasi" defaultValue="UMUM" options={[
                  { value: "UMUM", label: "Umum" },
                  { value: "ANGGOTA", label: "Anggota" },
                  { value: "TETAP", label: "Karyawan Tetap" },
                ]} />
              </div>
              <div className="space-y-1">
                <Label>Khusus Anggota?</Label>
                <Select name="khususAnggota" defaultValue="false" options={[
                  { value: "false", label: "Tidak" },
                  { value: "true", label: "Ya" },
                ]} />
              </div>
              <div className="space-y-1">
                <Label>Berlaku Mulai</Label>
                <Input name="berlakuMulai" type="date" required />
              </div>
              <div className="space-y-1">
                <Label>Berlaku Sampai</Label>
                <Input name="berlakuSampai" type="date" required />
              </div>
              <SubmitButton className="col-span-2 w-full">Buat Voucher</SubmitButton>
          </div>
        </ServerForm>
      </Dialog>
    </>
  );
}