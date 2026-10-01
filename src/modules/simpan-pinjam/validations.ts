import { z } from "zod";

export const jenisSimpananSchema = z.enum(["POKOK", "WAJIB", "SUKARELA"]);

export const setorSimpananSchema = z.object({
  anggotaId: z.string().min(1, "Anggota wajib dipilih"),
  jenisSimpanan: jenisSimpananSchema,
  nominal: z.coerce.number().int().positive("Nominal harus di atas nol"),
  keterangan: z.string().optional().nullable(),
});

export const tarikSimpananSchema = z.object({
  anggotaId: z.string().min(1, "Anggota wajib dipilih"),
  nominal: z.coerce.number().int().positive("Nominal harus di atas nol"),
  keterangan: z.string().optional().nullable(),
});

export const pengajuanPinjamanSchema = z.object({
  anggotaId: z.string().min(1, "Anggota wajib dipilih"),
  jenisPinjaman: z.enum(["MULTIGUNA", "DARURAT", "BARANG"]),
  nominalPengajuan: z.coerce
    .number()
    .int()
    .min(250000, "Minimal pengajuan Rp250.000"),
  tenorBulan: z.coerce.number().int().min(3, "Minimal 3 bulan").max(36, "Maksimal 36 bulan"),
  sukuBungaTahunan: z.coerce.number().positive().max(30),
  metodeBunga: z.enum(["FLAT", "EFEKTIF", "ANUITAS"]),
  estimasiKasbon: z.coerce.number().int().min(0).default(0),
});

export const approvePinjamanSchema = z.object({
  pinjamanId: z.string().min(1),
  catatanReview: z.string().optional().nullable(),
});

export const cairkanPinjamanSchema = z.object({
  pinjamanId: z.string().min(1),
  biayaAdministrasi: z.coerce.number().int().min(0).default(0),
  sumberDana: z.enum(["BANK", "KAS"]).default("BANK"),
});

export const bayarAngsuranSchema = z.object({
  pinjamanAngsuranId: z.string().min(1),
  keterangan: z.string().optional().nullable(),
});

export const pelunasanDiniSchema = z.object({
  pinjamanId: z.string().min(1),
  keterangan: z.string().optional().nullable(),
});