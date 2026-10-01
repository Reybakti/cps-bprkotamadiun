"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth-utils";
import { berhasil, gagal, pad3, pad4 } from "@/lib/utils";
import type { ActionResult } from "@/types/shared";
import { objectFromForm } from "@/lib/formdata";
import { catatAudit } from "@/modules/core/audit";
import { buatJurnal } from "@/modules/core/accounting/jurnal";
import { hitungClearance } from "@/modules/core/math/clearance";
import {
  STATUS_LIMIT_KASBON,
  STATUS_PLAFON_PINJAMAN,
} from "@/modules/core/contracts";
import { anggotaSchema, clearanceSchema, resetPasswordSchema, userSchema } from "@/modules/core/validations";
import type { Role, StatusAnggota } from "@/generated/prisma/enums";
import { DEFAULT_KONSTANTA } from "@/types/shared";

export async function wajibRole(...roles: Role[]): Promise<{ userId: string; role: Role }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized: silakan login terlebih dahulu.");
  if (roles.length > 0 && !roles.includes(session.user.role)) {
    throw new Error("Forbidden: role Anda tidak diizinkan melakukan aksi ini.");
  }
  return { userId: session.user.id, role: session.user.role };
}

function kodeKantor(kantor: string): string {
  const clean = kantor.replace(/[^a-zA-Z]/g, "").toUpperCase();
  return (clean.slice(0, 3) || "PUS").padStart(3, "0").slice(0, 3);
}

export async function generateNak(kantorCabang: string): Promise<string> {
  const tahun = new Date().getFullYear();
  const kode = kodeKantor(kantorCabang);
  const count = await prisma.anggota.count({ where: { kantorCabang } });
  return `KOP-${kode}-${tahun}-${pad4(count + 1)}`;
}

export async function buatAnggota(input: unknown): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN", "ROLE_HRD");

    const parsed = anggotaSchema.safeParse(input);
    if (!parsed.success) {
      return gagal("Data anggota tidak valid.", parsed.error.flatten().fieldErrors);
    }
    const data = parsed.data;

    const cekNip = await prisma.anggota.findUnique({ where: { nipKaryawan: data.nipKaryawan } });
    if (cekNip) return gagal(`NIP ${data.nipKaryawan} sudah terdaftar.`);

    const username = data.username?.trim() || data.nipKaryawan;
    const cekUser = await prisma.user.findUnique({ where: { username } });
    if (cekUser) return gagal(`Username ${username} sudah dipakai.`);

    const password = data.password?.trim() || randomPassword();
    const nak = await generateNak(data.kantorCabang);

    const tanggals = data.tanggalMasuk ? new Date(data.tanggalMasuk + "T00:00:00") : undefined;
    const kontrak = data.tanggalBerakhirKontrak
      ? new Date(data.tanggalBerakhirKontrak + "T00:00:00")
      : undefined;

    const limitKasbon = STATUS_LIMIT_KASBON[data.statusKepegawaian];
    const plafon = STATUS_PLAFON_PINJAMAN[data.statusKepegawaian];

    const hasil = await prisma.$transaction(async (tx) => {
      const passwordHash = await hashPassword(password);

      const user = await tx.user.create({
        data: {
          username,
          passwordHash,
          nama: data.namaLengkap,
          role: "ROLE_ANGGOTA",
        },
      });

      const anggota = await tx.anggota.create({
        data: {
          userId: user.id,
          nak,
          nipKaryawan: data.nipKaryawan,
          namaLengkap: data.namaLengkap,
          divisi: data.divisi,
          kantorCabang: data.kantorCabang,
          jabatan: data.jabatan ?? null,
          statusKepegawaian: data.statusKepegawaian,
          tanggalMasuk: tanggals ?? null,
          tanggalBerakhirKontrak: kontrak ?? null,
          rekeningPayroll: data.rekeningPayroll ?? null,
          gajiBersih: data.gajiBersih,
          limitKasbonBulanan: limitKasbon,
          limitKasbonToko: limitKasbon,
          plafonPinjamanMaks: plafon,
        },
      });

      // Simpanan Pokok dicatat saat registrasi (SAK ETAP - ekuitas)
      const nominalPokok = Number(process.env.KOOPERASI_SIMPANAN_POKOK || DEFAULT_KONSTANTA.SIMPANAN_POKOK);
      const mutasiPokok = await tx.simpananMutasi.create({
        data: {
          anggotaId: anggota.id,
          jenisSimpanan: "POKOK",
          tipeMutasi: "SETOR",
          nominal: nominalPokok,
          saldoAkhir: nominalPokok,
          referensiTrx: `REG-${nak}`,
          keterangan: "Registrasi anggota baru",
        },
      });

      await buatJurnal(
        {
          keterangan: `Penerimaan Simpanan Pokok - registrasi ${data.namaLengkap} (${nak})`,
          sumber: "SIMPANAN",
          referensi: `REG-${nak}`,
          entries: [
            { kodeAkun: "1.1102", debit: nominalPokok },
            { kodeAkun: "3.1101", kredit: nominalPokok },
          ],
        },
        tx
      );

      return { anggota, mutasiPokok, password };
    });

    await catatAudit("CORE-HR", "BUAT_ANGGOTA", {
      anggotaId: hasil.anggota.id,
      nak: hasil.anggota.nak,
      nip: hasil.anggota.nipKaryawan,
    });

    revalidatePath("/anggota");
    return berhasil({
      ...hasil.anggota,
      passwordSementara: hasil.password,
      nak: hasil.anggota.nak,
    });
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal membuat anggota.");
  }
}

function randomPassword(): string {
  const charset = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += charset[Math.floor(Math.random() * charset.length)];
  return out;
}

export async function ubahAnggota(id: string, input: unknown): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN", "ROLE_HRD");
    const parsed = anggotaSchema.partial().safeParse(input);
    if (!parsed.success) return gagal("Data tidak valid.", parsed.error.flatten().fieldErrors);
    const data = parsed.data;

    const hasil = await prisma.$transaction(async (tx) => {
      const anggota = await tx.anggota.update({
        where: { id },
        data: {
          namaLengkap: data.namaLengkap ?? undefined,
          divisi: data.divisi ?? undefined,
          kantorCabang: data.kantorCabang ?? undefined,
          jabatan: data.jabatan ?? undefined,
          statusKepegawaian: data.statusKepegawaian ?? undefined,
          tanggalMasuk: data.tanggalMasuk ? new Date(data.tanggalMasuk + "T00:00:00") : undefined,
          tanggalBerakhirKontrak: data.tanggalBerakhirKontrak
            ? new Date(data.tanggalBerakhirKontrak + "T00:00:00")
            : undefined,
          rekeningPayroll: data.rekeningPayroll ?? undefined,
          gajiBersih: data.gajiBersih ?? undefined,
          nipKaryawan: data.nipKaryawan ?? undefined,
        },
      });
      return anggota;
    });

    revalidatePath("/anggota");
    revalidatePath(`/anggota/${id}`);
    return berhasil(hasil);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal memperbarui anggota.");
  }
}

export async function ubahStatusAnggota(
  id: string,
  status: StatusAnggota
): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN", "ROLE_HRD");
    const hasil = await prisma.anggota.update({ where: { id }, data: { statusAnggota: status } });
    revalidatePath("/anggota");
    return berhasil(hasil);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal mengubah status anggota.");
  }
}

export async function oneClickClearance(input: unknown): Promise<ActionResult> {
  try {
    const user = await wajibRole("ROLE_SUPERADMIN", "ROLE_HRD");
    const parsed = clearanceSchema.safeParse(input);
    if (!parsed.success) return gagal("Data clearance tidak valid.");

    const hasil = await prisma.$transaction(async (tx) => {
      const calc = await hitungClearance(parsed.data.anggotaId, tx);

      const clearance = await tx.clearance.create({
        data: {
          anggotaId: parsed.data.anggotaId,
          totalSimpananPokok: calc.totalSimpananPokok,
          totalSimpananWajib: calc.totalSimpananWajib,
          totalSimpananSukarela: calc.totalSimpananSukarela,
          sisaPokokKredit: calc.sisaPokokKredit,
          bungaBerjalan: calc.bungaBerjalan,
          kasbonToko: calc.kasbonToko,
          saldoHakBersih: calc.saldoHakBersih,
          status: calc.status,
          keterangan: parsed.data.keterangan,
        },
      });

      // Seluruh simpanan dibalikkan; utang diselesaikan dari simpanan.
      const entries: { kodeAkun: string; debit?: number; kredit?: number; keterangan?: string }[] = [];
      if (calc.totalSimpananPokok > 0)
        entries.push({ kodeAkun: "3.1101", debit: calc.totalSimpananPokok, keterangan: "Pengembalian simpanan pokok" });
      if (calc.totalSimpananWajib > 0)
        entries.push({ kodeAkun: "3.1102", debit: calc.totalSimpananWajib, keterangan: "Pengembalian simpanan wajib" });
      if (calc.totalSimpananSukarela > 0)
        entries.push({ kodeAkun: "2.1101", debit: calc.totalSimpananSukarela, keterangan: "Pengembalian simpanan sukarela" });

      let sisa = calc.totalSimpananPokok + calc.totalSimpananWajib + calc.totalSimpananSukarela;
      if (calc.kasbonToko > 0) {
        const bayar = Math.min(sisa, calc.kasbonToko);
        if (bayar > 0) entries.push({ kodeAkun: "1.1202", kredit: bayar, keterangan: "Pelunasan kasbon toko" });
        sisa -= bayar;
      }
      if (calc.bungaBerjalan > 0) {
        const bayar = Math.min(sisa, calc.bungaBerjalan);
        if (bayar > 0) entries.push({ kodeAkun: "4.1101", kredit: bayar, keterangan: "Setoran bunga berjalan" });
        sisa -= bayar;
      }
      if (calc.sisaPokokKredit > 0) {
        const bayar = Math.max(0, Math.min(sisa, calc.sisaPokokKredit));
        if (bayar > 0) entries.push({ kodeAkun: "1.1201", kredit: bayar, keterangan: "Pelunasan pokok pinjaman" });
      }
      if (calc.saldoHakBersih > 0) {
        entries.push({ kodeAkun: "1.1102", debit: calc.saldoHakBersih, keterangan: "Pembayaran hak bersih anggota" });
      }

      await buatJurnal(
        {
          keterangan: `Clearance anggota ${parsed.data.anggotaId} - saldo hak bersih ${calc.saldoHakBersih.toLocaleString("id-ID")}`,
          sumber: "PEMBUKUAN",
          referensi: `CLR-${clearance.id.slice(0, 8)}`,
          dibuatOlehId: user.userId,
          entries,
        },
        tx
      );

      const statusAnggotaBaru = calc.status === "FROZEN" ? "FROZEN" : "RESIGN";
      await tx.anggota.update({
        where: { id: parsed.data.anggotaId },
        data: { statusAnggota: statusAnggotaBaru },
      });

      return { clearance, statusAnggotaBaru };
    });

    await catatAudit("CORE-CLEARANCE", "ONE_CLICK_CLEARANCE", {
      anggotaId: parsed.data.anggotaId,
      saldoHakBersih: hasil.clearance.saldoHakBersih,
    });
    revalidatePath("/anggota");
    return berhasil(hasil);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal memproses clearance.");
  }
}

export async function buatUser(input: unknown): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN");
    const parsed = userSchema.safeParse(input);
    if (!parsed.success) return gagal("Data user tidak valid.", parsed.error.flatten().fieldErrors);

    const ada = await prisma.user.findUnique({ where: { username: parsed.data.username } });
    if (ada) return gagal("Username sudah dipakai.");

    const user = await prisma.user.create({
      data: {
        username: parsed.data.username,
        passwordHash: await hashPassword(parsed.data.password),
        nama: parsed.data.nama,
        role: parsed.data.role,
      },
    });
    revalidatePath("/anggota");
    return berhasil(user);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal membuat user.");
  }
}

export async function resetPassword(input: unknown): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN");
    const parsed = resetPasswordSchema.safeParse(input);
    if (!parsed.success) return gagal("Data tidak valid.", parsed.error.flatten().fieldErrors);
    await prisma.user.update({
      where: { id: parsed.data.userId },
      data: { passwordHash: await hashPassword(parsed.data.passwordBaru) },
    });
    return berhasil(true);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal reset password.");
  }
}

export async function ubahPasswordSendiri(
  passwordLama: string,
  passwordBaru: string
): Promise<ActionResult> {
  try {
    const { userId } = await wajibRole();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ok = await verifyPassword(passwordLama, user.passwordHash);
    if (!ok) return gagal("Password lama tidak sesuai.");
    if (passwordBaru.length < 6) return gagal("Password baru minimal 6 karakter.");
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(passwordBaru) },
    });
    return berhasil(true);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal mengganti password.");
  }
}

export async function getDaftarAnggota(search?: string, divisi?: string, status?: string) {
  await wajibRole("ROLE_SUPERADMIN", "ROLE_HRD", "ROLE_PENGURUS", "ROLE_ADMIN_SP", "ROLE_KASIR");
  return prisma.anggota.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { namaLengkap: { contains: search, mode: "insensitive" } },
              { nipKaryawan: { contains: search, mode: "insensitive" } },
              { nak: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(divisi ? { divisi } : {}),
      ...(status ? { statusAnggota: status as StatusAnggota } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function getDetailAnggota(id: string) {
  await wajibRole("ROLE_SUPERADMIN", "ROLE_HRD", "ROLE_PENGURUS", "ROLE_ADMIN_SP", "ROLE_KASIR");
  const anggota = await prisma.anggota.findUnique({
    where: { id },
    include: {
      simpananMutasi: { orderBy: { createdAt: "desc" }, take: 15 },
      pinjaman: { include: { angsuranJadwal: { orderBy: { angsuranKe: "asc" } } } },
      clearance: true,
      user: { select: { id: true, username: true, role: true } },
    },
  });
  if (!anggota) throw new Error("Anggota tidak ditemukan.");
  return anggota;
}

export async function getDaftarUser() {
  await wajibRole("ROLE_SUPERADMIN");
  return prisma.user.findMany({ where: { role: { not: "ROLE_ANGGOTA" } }, orderBy: { createdAt: "asc" } });
}

export { pad3, pad4 };

// ------------------------------------------------------------------
// FORM WRAPPERS (server-action + useActionState)
// ------------------------------------------------------------------

export async function buatAnggotaForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  return buatAnggota(objectFromForm(fd));
}

export async function ubahStatusAnggotaForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  const o = objectFromForm(fd);
  return ubahStatusAnggota(String(o.id), o.statusAnggota as StatusAnggota);
}

export async function oneClickClearanceForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  return oneClickClearance(objectFromForm(fd));
}

export async function resetPasswordForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  return resetPassword(objectFromForm(fd));
}