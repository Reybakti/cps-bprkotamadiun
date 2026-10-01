import { z } from "zod";

export const anggotaSchema = z.object({
  nipKaryawan: z.string().min(1, "NIP wajib diisi"),
  namaLengkap: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  divisi: z.string().min(1, "Divisi wajib diisi"),
  kantorCabang: z.string().min(1, "Kantor cabang wajib diisi"),
  statusKepegawaian: z.enum(["TETAP", "KONTRAK", "PROBATION"]),
  jabatan: z.string().optional().nullable(),
  tanggalMasuk: z.string().optional().nullable(),
  tanggalBerakhirKontrak: z.string().optional().nullable(),
  rekeningPayroll: z.string().optional().nullable(),
  gajiBersih: z.coerce.number().min(0).default(0),
  username: z.string().min(3, "Username minimal 3 karakter").optional(),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
});

export const userSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  nama: z.string().min(1, "Nama wajib diisi"),
  role: z.enum([
    "ROLE_SUPERADMIN",
    "ROLE_PENGURUS",
    "ROLE_ADMIN_SP",
    "ROLE_KASIR",
    "ROLE_HRD",
    "ROLE_ANGGOTA",
  ]),
});

export const ubahStatusSchema = z.object({
  statusAnggota: z.enum(["AKTIF", "NONAKTIF", "FROZEN", "RESIGN"]),
});

export const resetPasswordSchema = z.object({
  userId: z.string().min(1),
  passwordBaru: z.string().min(6, "Password baru minimal 6 karakter"),
});

export const clearanceSchema = z.object({
  anggotaId: z.string().min(1),
  keterangan: z.string().optional(),
});

export const payrollGenerateSchema = z.object({
  periodeBulan: z.string().regex(/^\d{4}-\d{2}$/, "Format periode YYYY-MM"),
});

export const importSettlementSchema = z.object({
  periodeBulan: z.string().regex(/^\d{4}-\d{2}$/, "Format periode YYYY-MM"),
  noRefBayer: z.string().min(1, "Nomor referensi pembayaran wajib diisi"),
});