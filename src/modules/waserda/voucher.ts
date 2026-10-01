"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { berhasil, gagal } from "@/lib/utils";
import type { ActionResult } from "@/types/shared";
import { objectFromForm } from "@/lib/formdata";
import { wajibRole } from "@/modules/core/actions";
import { voucherSchema } from "@/modules/waserda/validations";
import type { StatusVoucher } from "@/generated/prisma/enums";

export async function buatVoucher(input: unknown): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN", "ROLE_ADMIN_SP", "ROLE_PENGURUS");
    const parsed = voucherSchema.safeParse(input);
    if (!parsed.success) return gagal("Data voucher tidak valid.", parsed.error.flatten().fieldErrors);

    const ada = await prisma.voucher.findUnique({ where: { kodeVoucher: parsed.data.kodeVoucher } });
    if (ada) return gagal("Kode voucher sudah dipakai.");

    const voucher = await prisma.voucher.create({
      data: {
        kodeVoucher: parsed.data.kodeVoucher,
        namaVoucher: parsed.data.namaVoucher,
        tipePotongan: parsed.data.tipePotongan,
        nilaiPotongan: parsed.data.nilaiPotongan,
        maksimalPotongan: parsed.data.maksimalPotongan ?? null,
        minBelanja: parsed.data.minBelanja,
        kuotaTotal: parsed.data.kuotaTotal,
        kuotaPerUser: parsed.data.kuotaPerUser,
        khususAnggota: parsed.data.khususAnggota,
        segmentasi: parsed.data.segmentasi,
        berlakuMulai: new Date(parsed.data.berlakuMulai + "T00:00:00"),
        berlakuSampai: new Date(parsed.data.berlakuSampai + "T23:59:59"),
      },
    });
    revalidatePath("/voucher");
    return berhasil(voucher);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal membuat voucher.");
  }
}

export async function ubahStatusVoucher(id: string, status: StatusVoucher): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN", "ROLE_ADMIN_SP", "ROLE_PENGURUS");
    const voucher = await prisma.voucher.update({ where: { id }, data: { status } });
    revalidatePath("/voucher");
    return berhasil(voucher);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal ubah status voucher.");
  }
}

export async function getDaftarVoucher(aktifSaja?: boolean) {
  await wajibRole("ROLE_SUPERADMIN", "ROLE_ADMIN_SP", "ROLE_PENGURUS", "ROLE_KASIR");
  const now = new Date();
  return prisma.voucher.findMany({
    where: {
      ...(aktifSaja
        ? {
            status: "AKTIF",
            berlakuMulai: { lte: now },
            berlakuSampai: { gte: now },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getStatistikVoucher() {
  await wajibRole("ROLE_SUPERADMIN", "ROLE_ADMIN_SP", "ROLE_PENGURUS", "ROLE_KASIR");
  const [total, terpakai, aktif] = await Promise.all([
    prisma.voucher.count(),
    prisma.voucher.aggregate({ _sum: { kuotaTerpakai: true } }),
    prisma.voucher.count({ where: { status: "AKTIF" } }),
  ]);
  return { total, terpakai: Number(terpakai._sum.kuotaTerpakai ?? 0), aktif };
}

// ------------------------------------------------------------------
// FORM WRAPPERS
// ------------------------------------------------------------------

export async function buatVoucherForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  return buatVoucher(objectFromForm(fd));
}

export async function ubahStatusVoucherForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  const o = objectFromForm(fd);
  return ubahStatusVoucher(String(o.id), o.status as StatusVoucher);
}