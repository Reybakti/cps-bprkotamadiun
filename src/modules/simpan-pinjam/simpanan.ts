"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { berhasil, gagal } from "@/lib/utils";
import type { ActionResult } from "@/types/shared";
import { objectFromForm } from "@/lib/formdata";
import { catatAudit } from "@/modules/core/audit";
import { buatJurnal } from "@/modules/core/accounting/jurnal";
import { wajibRole } from "@/modules/core/actions";
import { getSaldoSimpanan } from "@/modules/simpan-pinjam/contracts";
import { setorSimpananSchema, tarikSimpananSchema } from "@/modules/simpan-pinjam/validations";
import { DEFAULT_KONSTANTA } from "@/types/shared";

const MIN_SALDO_MENGENDAP = () =>
  Number(process.env.KOOPERASI_SALDO_MENGENDAP || DEFAULT_KONSTANTA.SALDO_MENGENDAP);

function akunSimpanan(jenis: "POKOK" | "WAJIB" | "SUKARELA"): string {
  return jenis === "POKOK" ? "3.1101" : jenis === "WAJIB" ? "3.1102" : "2.1101";
}

export async function setorSimpanan(input: unknown): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN", "ROLE_PENGURUS", "ROLE_ADMIN_SP");
    const parsed = setorSimpananSchema.safeParse(input);
    if (!parsed.success) return gagal("Data tidak valid.", parsed.error.flatten().fieldErrors);

    const hasil = await prisma.$transaction(async (tx) => {
      const saldoNow = await getSaldoSimpanan(parsed.data.anggotaId, tx);
      const saldoJenis =
        parsed.data.jenisSimpanan === "POKOK"
          ? saldoNow.pokok
          : parsed.data.jenisSimpanan === "WAJIB"
            ? saldoNow.wajib
            : saldoNow.sukarela;

      if (parsed.data.jenisSimpanan === "POKOK" && saldoJenis > 0) {
        throw new Error("Simpanan pokok hanya dapat disetor satu kali.");
      }

      const saldoAkhir = saldoJenis + parsed.data.nominal;
      const mutasi = await tx.simpananMutasi.create({
        data: {
          anggotaId: parsed.data.anggotaId,
          jenisSimpanan: parsed.data.jenisSimpanan,
          tipeMutasi: "SETOR",
          nominal: parsed.data.nominal,
          saldoAkhir,
          keterangan: parsed.data.keterangan ?? "Setoran tunai",
        },
      });

      const jurnal = await buatJurnal(
        {
          keterangan: `Simpanan ${parsed.data.jenisSimpanan} anggota ${parsed.data.anggotaId}`,
          sumber: "SIMPANAN",
          referensi: `ST-${parsed.data.anggotaId.slice(0, 8)}`,
          entries: [
            { kodeAkun: "1.1102", debit: parsed.data.nominal },
            { kodeAkun: akunSimpanan(parsed.data.jenisSimpanan), kredit: parsed.data.nominal },
          ],
        },
        tx
      );
      await tx.simpananMutasi.update({
        where: { id: mutasi.id },
        data: { jurnalId: jurnal },
      });
      return mutasi;
    });

    await catatAudit("SIMPANAN", "SETOR", {
      anggotaId: parsed.data.anggotaId,
      nominal: parsed.data.nominal,
    });
    revalidatePath("/simpanan");
    return berhasil(hasil);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal setor simpanan.");
  }
}

export async function tarikSimpananSukarela(input: unknown): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN", "ROLE_PENGURUS", "ROLE_ADMIN_SP");
    const parsed = tarikSimpananSchema.safeParse(input);
    if (!parsed.success) return gagal("Data tidak valid.", parsed.error.flatten().fieldErrors);

    const hasil = await prisma.$transaction(async (tx) => {
      const saldo = await getSaldoSimpanan(parsed.data.anggotaId, tx);
      if (parsed.data.nominal > saldo.sukarela) {
        throw new Error("Saldo simpanan sukarela tidak mencukupi.");
      }
      const sisaMengendap = saldo.sukarela - parsed.data.nominal;
      if (sisaMengendap < MIN_SALDO_MENGENDAP()) {
        throw new Error(
          `Tidak dapat ditarik: saldo mengendap min Rp${MIN_SALDO_MENGENDAP().toLocaleString("id-ID")}.`
        );
      }

      const mutasi = await tx.simpananMutasi.create({
        data: {
          anggotaId: parsed.data.anggotaId,
          jenisSimpanan: "SUKARELA",
          tipeMutasi: "TARIK",
          nominal: parsed.data.nominal,
          saldoAkhir: sisaMengendap,
          keterangan: parsed.data.keterangan ?? "Penarikan tunai",
        },
      });
      const jurnal = await buatJurnal(
        {
          keterangan: `Penarikan simpanan sukarela anggota ${parsed.data.anggotaId}`,
          sumber: "SIMPANAN",
          referensi: `TRK-${parsed.data.anggotaId.slice(0, 8)}`,
          entries: [
            { kodeAkun: "2.1101", debit: parsed.data.nominal },
            { kodeAkun: "1.1102", kredit: parsed.data.nominal },
          ],
        },
        tx
      );
      await tx.simpananMutasi.update({ where: { id: mutasi.id }, data: { jurnalId: jurnal } });
      return mutasi;
    });

    await catatAudit("SIMPANAN", "TARIK", {
      anggotaId: parsed.data.anggotaId,
      nominal: parsed.data.nominal,
    });
    revalidatePath("/simpanan");
    return berhasil(hasil);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal menarik simpanan.");
  }
}

export async function getRiwayatSimpanan(anggotaId: string) {
  await wajibRole("ROLE_SUPERADMIN", "ROLE_PENGURUS", "ROLE_ADMIN_SP", "ROLE_HRD");
  return prisma.simpananMutasi.findMany({
    where: { anggotaId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

// ------------------------------------------------------------------
// FORM WRAPPERS
// ------------------------------------------------------------------

export async function setorSimpananForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  return setorSimpanan(objectFromForm(fd));
}

export async function tarikSimpananSukarelaForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  return tarikSimpananSukarela(objectFromForm(fd));
}