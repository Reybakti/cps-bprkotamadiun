import { z } from "zod";

export const produkSchema = z.object({
  barcode: z.string().min(3, "Barcode wajib diisi"),
  namaBarang: z.string().min(3, "Nama barang wajib diisi"),
  kategori: z.string().min(2, "Kategori wajib diisi"),
  satuan: z.string().default("PCS"),
  hargaBeliHpp: z.coerce.number().int().min(0),
  hargaJualUmum: z.coerce.number().int().min(0),
  hargaJualAnggota: z.coerce.number().int().min(0),
  stokMinimum: z.coerce.number().int().min(0).default(5),
});

export const poSchema = z.object({
  supplier: z.string().min(2, "Nama supplier wajib diisi"),
  tanggal: z.string().optional(),
  details: z
    .array(
      z.object({
        produkId: z.string().min(1),
        qty: z.coerce.number().positive("Qty harus di atas nol"),
        hargaBeli: z.coerce.number().int().min(0),
      })
    )
    .min(1, "Minimal 1 item PO"),
});

export const voucherSchema = z
  .object({
    kodeVoucher: z.string().min(3, "Kode voucher wajib diisi"),
    namaVoucher: z.string().min(3, "Nama voucher wajib diisi"),
    tipePotongan: z.enum(["NOMINAL", "PERSEN"]),
    nilaiPotongan: z.coerce.number().positive("Nilai potongan harus di atas nol"),
    maksimalPotongan: z.coerce.number().int().min(0).optional().nullable(),
    minBelanja: z.coerce.number().int().min(0).default(0),
    kuotaTotal: z.coerce.number().int().min(1).default(1),
    kuotaPerUser: z.coerce.number().int().min(1).default(1),
    khususAnggota: z
      .enum(["true", "false"])
      .transform((v) => v === "true")
      .default("false"),
    segmentasi: z.enum(["UMUM", "ANGGOTA", "TETAP"]).default("UMUM"),
    berlakuMulai: z.string().min(1, "Tanggal mulai wajib diisi"),
    berlakuSampai: z.string().min(1, "Tanggal selesai wajib diisi"),
  })
  .refine((d) => d.tipePotongan === "PERSEN" && d.nilaiPotongan > 100, {
    message: "Potongan persen maksimal 100%",
    path: ["nilaiPotongan"],
  });

export const checkoutSchema = z.object({
  kasirId: z.string().min(1, "Kasir tidak terdeteksi"),
  items: z
    .array(
      z.object({
        produkId: z.string().min(1),
        qty: z.coerce.number().positive("Qty harus di atas nol"),
      })
    )
    .min(1, "Keranjang kosong"),
  metodeBayar: z.enum(["TUNAI", "QRIS", "KASBON"]),
  anggotaId: z.string().optional().nullable(),
  kodeVoucher: z.string().optional().nullable(),
  referensiPembayaran: z.string().optional().nullable(),
});

export const opnameSchema = z.object({
  noBeritaAcara: z.string().min(3, "No berita acara wajib diisi"),
  catatan: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        produkId: z.string().min(1),
        stokFisik: z.coerce.number().min(0, "Stok fisik tidak boleh negatif"),
      })
    )
    .min(1, "Minimal 1 item opname"),
});

export const voidSchema = z.object({
  penjualanId: z.string().min(1),
  alasan: z.string().min(4, "Alasan void wajib diisi"),
});