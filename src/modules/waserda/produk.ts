"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { berhasil, gagal, pad4 } from "@/lib/utils";
import type { ActionResult } from "@/types/shared";
import { jsonField, objectFromForm } from "@/lib/formdata";
import { catatAudit } from "@/modules/core/audit";
import { buatJurnal } from "@/modules/core/accounting/jurnal";
import { wajibRole } from "@/modules/core/actions";
import { hitungHppMovingAverage } from "@/modules/waserda/math/hpp";
import { opnameSchema, poSchema, produkSchema } from "@/modules/waserda/validations";

export async function buatProduk(input: unknown): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN", "ROLE_ADMIN_SP");
    const parsed = produkSchema.safeParse(input);
    if (!parsed.success) return gagal("Data produk tidak valid.", parsed.error.flatten().fieldErrors);

    const ada = await prisma.produk.findUnique({ where: { barcode: parsed.data.barcode } });
    if (ada) return gagal(`Barcode ${parsed.data.barcode} sudah terdaftar.`);

    const produk = await prisma.produk.create({ data: parsed.data });
    revalidatePath("/inventori");
    revalidatePath("/kasir");
    return berhasil(produk);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal membuat produk.");
  }
}

export async function ubahProduk(id: string, input: unknown): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN", "ROLE_ADMIN_SP");
    const parsed = produkSchema.partial().safeParse(input);
    if (!parsed.success) return gagal("Data produk tidak valid.", parsed.error.flatten().fieldErrors);
    const produk = await prisma.produk.update({ where: { id }, data: parsed.data });
    revalidatePath("/inventori");
    revalidatePath("/kasir");
    return berhasil(produk);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal memperbarui produk.");
  }
}

/** Pembelian barang (PO in). HPP dihitung ulang dengan moving average. */
export async function catatPurchaseOrder(input: unknown): Promise<ActionResult> {
  try {
    await wajibRole("ROLE_SUPERADMIN", "ROLE_ADMIN_SP", "ROLE_PENGURUS");
    const parsed = poSchema.safeParse(input);
    if (!parsed.success) return gagal("Data PO tidak valid.", parsed.error.flatten().fieldErrors);

    const hasil = await prisma.$transaction(async (tx) => {
      const tahun = new Date().getFullYear();
      const count = await tx.purchaseOrder.count({ where: { createdAt: { gte: new Date(`${tahun}-01-01`) } } });
      const noPO = `PO-${tahun}-${pad4(count + 1)}`;

      let totalNilai = 0;
      for (const d of parsed.data.details) {
        const produk = await tx.produk.findUniqueOrThrow({
          where: { id: d.produkId },
          select: { stok: true, hargaBeliHpp: true },
        });
        const hppBaru = hitungHppMovingAverage(
          Number(produk.stok),
          Number(produk.hargaBeliHpp),
          d.qty,
          d.hargaBeli
        );
        await tx.produk.update({
          where: { id: d.produkId },
          data: { stok: Number(produk.stok) + d.qty, hargaBeliHpp: hppBaru },
        });
        totalNilai += d.qty * d.hargaBeli;
      }

      const po = await tx.purchaseOrder.create({
        data: {
          noPO,
          supplier: parsed.data.supplier,
          tanggal: parsed.data.tanggal ? new Date(parsed.data.tanggal + "T00:00:00") : new Date(),
          status: "CLOSED",
          totalNilai,
          details: {
            create: parsed.data.details.map((d) => ({
              produkId: d.produkId,
              qty: d.qty,
              hargaBeli: d.hargaBeli,
              subtotal: d.qty * d.hargaBeli,
            })),
          },
        },
      });

      const jurnal = await buatJurnal(
        {
          keterangan: `Pembelian barang - PO ${noPO} (${parsed.data.supplier})`,
          sumber: "PERSEDIAAN",
          referensi: noPO,
          tanggal: po.tanggal,
          entries: [
            { kodeAkun: "1.1301", debit: totalNilai, keterangan: "Persediaan barang" },
            { kodeAkun: "2.1201", kredit: totalNilai, keterangan: "Hutang dagang" },
          ],
        },
        tx
      );
      await tx.purchaseOrder.update({ where: { id: po.id }, data: { jurnalId: jurnal } });
      return { po, jurnalId: jurnal };
    });

    await catatAudit("INVENTORI", "PO_MASUK", { poId: hasil.po.id, totalNilai: hasil.po.totalNilai });
    revalidatePath("/inventori");
    return berhasil(hasil.po);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal mencatat pembelian.");
  }
}

/** Stock opname: sesuaikan stok fisik, selisih dibukukan. */
export async function catatStockOpname(input: unknown): Promise<ActionResult> {
  try {
    const user = await wajibRole("ROLE_SUPERADMIN", "ROLE_ADMIN_SP", "ROLE_KASIR");
    const parsed = opnameSchema.safeParse(input);
    if (!parsed.success) return gagal("Data opname tidak valid.", parsed.error.flatten().fieldErrors);

    const hasil = await prisma.$transaction(async (tx) => {
      const ada = await tx.stockOpname.findUnique({
        where: { noBeritaAcara: parsed.data.noBeritaAcara },
      });
      if (ada) throw new Error("No berita acara sudah terpakai.");

      let selisihTotal = 0;
      const opnameRows = [];
      for (const it of parsed.data.items) {
        const produk = await tx.produk.findUniqueOrThrow({ where: { id: it.produkId } });
        const selisih = it.stokFisik - Number(produk.stok);
        const nilaiSelisih = selisih * Number(produk.hargaBeliHpp);
        selisihTotal += nilaiSelisih;
        opnameRows.push({
          produkId: it.produkId,
          stokSistem: Number(produk.stok),
          stokFisik: it.stokFisik,
          selisih,
          hargaBeliHpp: Number(produk.hargaBeliHpp),
          nilaiSelisih,
        });
        await tx.produk.update({
          where: { id: it.produkId },
          data: { stok: it.stokFisik },
        });
      }

      const opname = await tx.stockOpname.create({
        data: {
          noBeritaAcara: parsed.data.noBeritaAcara,
          catatan: parsed.data.catatan,
          selisihTotal,
          dibuatOlehId: user.userId,
          items: { create: opnameRows },
        },
      });

      if (selisihTotal !== 0) {
        // Kurang stok = beban selisih stok; lebih stok = pendapatan lain
        const isKurang = selisihTotal < 0;
        const jurnal = await buatJurnal(
          {
            keterangan: `Stock opname ${opname.noBeritaAcara} - selisih ${selisihTotal.toLocaleString("id-ID")}`,
            sumber: "PERSEDIAAN",
            referensi: opname.noBeritaAcara,
            entries: isKurang
              ? [
                  { kodeAkun: "6.1205", debit: Math.abs(selisihTotal), keterangan: "Beban selisih stok" },
                  { kodeAkun: "1.1301", kredit: Math.abs(selisihTotal), keterangan: "Persediaan berkurang" },
                ]
              : [
                  { kodeAkun: "1.1301", debit: selisihTotal, keterangan: "Persediaan bertambah" },
                  { kodeAkun: "4.3101", kredit: selisihTotal, keterangan: "Surplus stock opname" },
                ],
          },
          tx
        );
        await tx.stockOpname.update({ where: { id: opname.id }, data: { jurnalId: jurnal } });
      }

      return opname;
    });

    revalidatePath("/inventori");
    return berhasil(hasil);
  } catch (e) {
    return gagal(e instanceof Error ? e.message : "Gagal stock opname.");
  }
}

export async function getDaftarProduk(search?: string) {
  await wajibRole("ROLE_SUPERADMIN", "ROLE_ADMIN_SP", "ROLE_KASIR", "ROLE_PENGURUS");
  return prisma.produk.findMany({
    where: search
      ? {
          OR: [
            { namaBarang: { contains: search, mode: "insensitive" } },
            { barcode: { contains: search, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { namaBarang: "asc" },
    take: 500,
  });
}

export async function getProdukStokRendah() {
  await wajibRole("ROLE_SUPERADMIN", "ROLE_ADMIN_SP", "ROLE_KASIR", "ROLE_PENGURUS");
  return prisma.produk.findMany({
    where: { stok: { lte: 0 } },
    orderBy: { stok: "asc" },
    take: 50,
  });
}

// ------------------------------------------------------------------
// FORM WRAPPERS
// ------------------------------------------------------------------

export async function buatProdukForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  return buatProduk(objectFromForm(fd));
}

export async function ubahProdukForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  const o = objectFromForm(fd);
  const { id, ...rest } = o;
  return ubahProduk(String(id), rest);
}

export async function catatPurchaseOrderForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  const o = objectFromForm(fd);
  const details = jsonField<{ produkId: string; qty: number; hargaBeli: number }[]>(o.details);
  return catatPurchaseOrder({ ...o, details });
}

export async function catatStockOpnameForm(
  _prev: ActionResult | null,
  fd: FormData
): Promise<ActionResult | null> {
  const o = objectFromForm(fd);
  const items = jsonField<{ produkId: string; stokFisik: number }[]>(o.items);
  return catatStockOpname({ ...o, items });
}