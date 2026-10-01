"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { berhasil, gagal, pad4, tanggalStamp } from "@/lib/utils";
import type { ActionResult } from "@/types/shared";
import { objectFromForm } from "@/lib/formdata";
import { catatAudit } from "@/modules/core/audit";
import { buatJurnal } from "@/modules/core/accounting/jurnal";
import { wajibRole } from "@/modules/core/actions";
import { hitungDiskonVoucher } from "@/modules/waserda/voucher-math";
import { checkoutSchema, voidSchema } from "@/modules/waserda/validations";

interface DetailKeranjang {
  produkId: string;
  qty: number;
  namaBarang: string;
  hargaSatuan: number;
  subtotal: number;
  hppSatuan: number;
}

export async function checkout(input: unknown): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN", "ROLE_KASIR");
    const parsed = checkoutSchema.safeParse(input);
    if (!parsed.success) return gagal("Data transaksi tidak valid.", parsed.error.flatten().fieldErrors);

    const hasil = await prisma.$transaction(async (tx) => {
      const sekarang = new Date();
      const jmlHariIni = await tx.penjualan.count({
        where: { createdAt: { gte: new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate()) } },
      });
      const noInvoice = `INV-${tanggalStamp(sekarang)}-${pad4(jmlHariIni + 1)}`;

      const isKasbon = parsed.data.metodeBayar === "KASBON";
      if (isKasbon && !parsed.data.anggotaId) throw new Error("Metode kasbon wajib memilih anggota.");
      const isAnggota = !!parsed.data.anggotaId;

      const kasir = await tx.user.findUniqueOrThrow({ where: { id: parsed.data.kasirId } });
      if (kasir.role !== "ROLE_KASIR" && kasir.role !== "ROLE_SUPERADMIN") {
        throw new Error("Kasir tidak valid.");
      }

      const anggotaObj = parsed.data.anggotaId
        ? await tx.anggota.findUnique({
            where: { id: parsed.data.anggotaId },
            select: { statusAnggota: true, statusKepegawaian: true, limitKasbonToko: true },
          })
        : null;
      if (parsed.data.anggotaId && !anggotaObj) throw new Error("Anggota tidak ditemukan.");

      const produkIds = parsed.data.items.map((i) => i.produkId);
      const produkList = await tx.produk.findMany({ where: { id: { in: produkIds } } });
      const pMap = new Map(produkList.map((p) => [p.id, p]));

      const details: DetailKeranjang[] = [];
      for (const it of parsed.data.items) {
        const produk = pMap.get(it.produkId);
        if (!produk) throw new Error("Produk tidak ditemukan.");
        if (Number(produk.stok) < it.qty) {
          throw new Error(`Stok ${produk.namaBarang} tidak mencukupi (sisa ${Number(produk.stok)}).`);
        }
        const harga = isAnggota ? Number(produk.hargaJualAnggota) : Number(produk.hargaJualUmum);
        details.push({
          produkId: produk.id,
          qty: it.qty,
          namaBarang: produk.namaBarang,
          hargaSatuan: harga,
          subtotal: Math.round(harga * it.qty),
          hppSatuan: Number(produk.hargaBeliHpp),
        });
      }

      const subtotal = details.reduce((s, d) => s + d.subtotal, 0);
      const hppTotal = details.reduce((s, d) => s + Math.round(d.hppSatuan * d.qty), 0);

      // ----- VALIDASI & APLIKASI VOUCHER -----
      let diskonVoucher = 0;
      let voucherRecord = null;
      if (parsed.data.kodeVoucher) {
        const voucher = await tx.voucher.findUnique({
          where: { kodeVoucher: parsed.data.kodeVoucher },
        });
        if (!voucher) throw new Error("Kode voucher tidak dikenal.");
        if (voucher.status !== "AKTIF") throw new Error("Voucher tidak aktif.");
        if (sekarang < voucher.berlakuMulai || sekarang > voucher.berlakuSampai) {
          throw new Error("Voucher di luar periode berlaku.");
        }
        if (voucher.kuotaTerpakai >= voucher.kuotaTotal) throw new Error("Kuota voucher sudah habis.");
        if (Number(voucher.minBelanja) > subtotal) {
          throw new Error(`Minimal belanja Rp${Number(voucher.minBelanja).toLocaleString("id-ID")} untuk voucher ${voucher.kodeVoucher}.`);
        }
        if (voucher.khususAnggota && !isAnggota) throw new Error("Voucher hanya untuk anggota.");
        if (voucher.segmentasi === "ANGGOTA" && !isAnggota) throw new Error("Voucher khusus anggota.");
        if (voucher.segmentasi === "TETAP") {
          if (!isAnggota || anggotaObj?.statusKepegawaian !== "TETAP") {
            throw new Error("Voucher khusus karyawan tetap.");
          }
        }
        if (voucher.kuotaPerUser && parsed.data.anggotaId) {
          const pakai = await tx.voucherUsage.count({
            where: { voucherId: voucher.id, anggotaId: parsed.data.anggotaId },
          });
          if (pakai >= voucher.kuotaPerUser) {
            throw new Error("Kuota pemakaian voucher per user sudah habis.");
          }
        }
        diskonVoucher = hitungDiskonVoucher(
          {
            tipePotongan: voucher.tipePotongan,
            nilaiPotongan: Number(voucher.nilaiPotongan),
            maksimalPotongan: voucher.maksimalPotongan
              ? Number(voucher.maksimalPotongan)
              : null,
          },
          subtotal
        );
        voucherRecord = voucher;
      }

      const totalAkhir = subtotal - diskonVoucher;

      // ----- CEK LIMIT KASBON -----
      if (isKasbon) {
        if (anggotaObj!.statusAnggota !== "AKTIF") throw new Error("Anggota tidak aktif.");
        const sisaLimit = Number(anggotaObj!.limitKasbonToko);
        if (totalAkhir > sisaLimit) {
          throw new Error(`Melebihi sisa limit kasbon (sisa Rp${sisaLimit.toLocaleString("id-ID")}).`);
        }
      }

      const akunLawan = parsed.data.metodeBayar === "TUNAI" ? "1.1101" : parsed.data.metodeBayar === "QRIS" ? "1.1110" : "1.1202";

      const penjualan = await tx.penjualan.create({
        data: {
          noInvoice,
          kasirId: parsed.data.kasirId,
          anggotaId: parsed.data.anggotaId ?? null,
          subtotal,
          diskonVoucher,
          totalAkhir,
          metodeBayar: parsed.data.metodeBayar,
          statusBayar: isKasbon ? "BELUM_LUNAS" : "LUNAS",
          referensiPembayaran: parsed.data.referensiPembayaran,
          details: {
            create: details.map((d) => ({
              produkId: d.produkId,
              qty: d.qty,
              hargaSatuan: d.hargaSatuan,
              subtotal: d.subtotal,
            })),
          },
        },
      });

      // ----- MUTASI STOK + HPP -----
      for (const d of details) {
        const produk = pMap.get(d.produkId)!;
        await tx.produk.update({
          where: { id: d.produkId },
          data: { stok: Number(produk.stok) - d.qty },
        });
      }

      // ----- VOUCHER USAGE -----
      if (voucherRecord) {
        await tx.voucherUsage.create({
          data: {
            voucherId: voucherRecord.id,
            penjualanId: penjualan.id,
            anggotaId: parsed.data.anggotaId ?? null,
            nominalDiskon: diskonVoucher,
          },
        });
        await tx.voucher.update({
          where: { id: voucherRecord.id },
          data: { kuotaTerpakai: { increment: 1 } },
        });
      }

      // ----- KASBON: POTONG LIMIT -----
      if (isKasbon) {
        await tx.anggota.update({
          where: { id: parsed.data.anggotaId! },
          data: { limitKasbonToko: { decrement: totalAkhir } },
        });
      }

      // ----- JURNAL SAK (balanced) -----
      const entries: { kodeAkun: string; debit?: number; kredit?: number; keterangan?: string }[] = [
        { kodeAkun: akunLawan, debit: totalAkhir, keterangan: `Pembayaran ${parsed.data.metodeBayar}` },
        { kodeAkun: "4.2101", kredit: subtotal, keterangan: "Pendapatan penjualan" },
        { kodeAkun: "5.1101", debit: hppTotal, keterangan: "HPP terjual" },
        { kodeAkun: "1.1301", kredit: hppTotal, keterangan: "Persediaan keluar" },
      ];
      if (diskonVoucher > 0) entries.push({ kodeAkun: "5.1201", debit: diskonVoucher, keterangan: "Diskon voucher" });

      const jurnal = await buatJurnal(
        {
          keterangan: `Penjualan POS ${noInvoice} (${parsed.data.metodeBayar})`,
          sumber: "PENJUALAN",
          referensi: noInvoice,
          tanggal: sekarang,
          entries,
        },
        tx
      );
      await tx.penjualan.update({ where: { id: penjualan.id }, data: { jurnalId: jurnal } });

      return { ...penjualan, details, diskonVoucher, subtotal, jurnalId: jurnal };
    });

    await catatAudit("POS", "CHECKOUT", {
      noInvoice: hasil.noInvoice,
      total: hasil.totalAkhir,
      metode: hasil.metodeBayar,
    });
    revalidatePath("/kasir");
    revalidatePath("/inventori");
    return berhasil(hasil);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal memproses transaksi.");
  }
}

/** Void transaksi (hanya TUNAI/QRIS; kasbon yang sudah lunas tidak bisa di-void). */
export async function voidPenjualan(input: unknown): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN", "ROLE_KASIR");
    const parsed = voidSchema.safeParse(input);
    if (!parsed.success) return gagal("Data void tidak valid.", parsed.error.flatten().fieldErrors);

    const hasil = await prisma.$transaction(async (tx) => {
      const penjualan = await tx.penjualan.findUniqueOrThrow({
        where: { id: parsed.data.penjualanId },
        include: { details: true },
      });
      if (penjualan.statusBayar === "VOID") throw new Error("Transaksi sudah void.");
      if (penjualan.metodeBayar === "KASBON" && penjualan.statusBayar === "LUNAS") {
        throw new Error("Kasbon sudah dilunasi, tidak dapat di-void.");
      }

      // kembalikan stok
      for (const d of penjualan.details) {
        await tx.produk.update({
          where: { id: d.produkId },
          data: { stok: { increment: Number(d.qty) } },
        });
      }

      // kembalikan limit kasbon bila belum lunas
      if (penjualan.metodeBayar === "KASBON" && penjualan.anggotaId) {
        await tx.anggota.update({
          where: { id: penjualan.anggotaId },
          data: { limitKasbonToko: { increment: Number(penjualan.totalAkhir) } },
        });
      }

      const akunLawan = penjualan.metodeBayar === "TUNAI" ? "1.1101" : penjualan.metodeBayar === "QRIS" ? "1.1110" : "1.1202";
      const diskon = Number(penjualan.diskonVoucher ?? 0);
      const entries: { kodeAkun: string; debit?: number; kredit?: number; keterangan?: string }[] = [
        { kodeAkun: "4.2101", debit: Number(penjualan.subtotal), keterangan: "Pembatalan penjualan" },
        { kodeAkun: akunLawan, kredit: Number(penjualan.totalAkhir), keterangan: "Pengembalian pembayaran" },
      ];
      if (diskon > 0) entries.push({ kodeAkun: "5.1201", kredit: diskon, keterangan: "Reversing diskon" });

      const jurnal = await buatJurnal(
        {
          keterangan: `VOID ${penjualan.noInvoice} - ${parsed.data.alasan}`,
          sumber: "PENJUALAN",
          referensi: `${penjualan.noInvoice}/VOID`,
          entries,
        },
        tx
      );

      await tx.penjualan.update({ where: { id: penjualan.id }, data: { statusBayar: "VOID" } });

      const usage = await tx.voucherUsage.findUnique({ where: { penjualanId: penjualan.id } });
      if (usage) {
        await tx.voucher.update({
          where: { id: usage.voucherId },
          data: { kuotaTerpakai: { decrement: 1 } },
        });
      }

      return { id: penjualan.id, jurnalId: jurnal };
    });

    revalidatePath("/kasir");
    return berhasil(hasil);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal void transaksi.");
  }
}

export async function getDaftarPenjualan(periode?: string, hanyaVoid?: boolean) {
  await wajibRole("ROLE_SUPERADMIN", "ROLE_KASIR", "ROLE_ADMIN_SP", "ROLE_PENGURUS");
  return prisma.penjualan.findMany({
    where: {
      ...(periode
        ? {
            createdAt: {
              gte: new Date(`${periode}-01T00:00:00`),
              lte: new Date(
                `${periode}-${hitungHariBulan(periode)}T23:59:59`
              ),
            },
          }
        : {}),
      ...(hanyaVoid ? { statusBayar: "VOID" } : { statusBayar: { not: "VOID" } }),
    },
    include: {
      details: { include: { produk: { select: { namaBarang: true, barcode: true } } } },
      kasir: { select: { username: true, nama: true } },
      voucherUsage: { include: { voucher: { select: { kodeVoucher: true } } } },
      anggota: { select: { namaLengkap: true, nak: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
}

function hitungHariBulan(periode: string): number {
  const [y, m] = periode.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export async function getRekapPenjualanHariIni() {
  const sekarang = new Date();
  const from = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate());
  const daftar = await prisma.penjualan.findMany({
    where: { createdAt: { gte: from }, statusBayar: { not: "VOID" } },
    select: { totalAkhir: true, metodeBayar: true, statusBayar: true },
  });
  const rekap = { transaksi: daftar.length, omzet: 0, tunai: 0, qris: 0, kasbon: 0, belumLunas: 0 };
  for (const d of daftar) {
    const t = Number(d.totalAkhir);
    rekap.omzet += t;
    if (d.metodeBayar === "TUNAI") rekap.tunai += t;
    else if (d.metodeBayar === "QRIS") rekap.qris += t;
    else rekap.kasbon += t;
    if (d.statusBayar === "BELUM_LUNAS") rekap.belumLunas += 1;
  }
  return rekap;
}

// ------------------------------------------------------------------
// FORM WRAPPERS
// ------------------------------------------------------------------

export async function voidPenjualanForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  return voidPenjualan(objectFromForm(fd));
}