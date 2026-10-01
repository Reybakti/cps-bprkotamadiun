import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { JenisJurnal } from "@/generated/prisma/client";
import { pad4, tanggalStamp } from "@/lib/utils";

export interface EntriJurnal {
  kodeAkun: string;
  debit?: number;
  kredit?: number;
  keterangan?: string;
}

export interface BuatJurnalParams {
  tanggal?: Date;
  keterangan: string;
  sumber: JenisJurnal;
  referensi?: string;
  dibuatOlehId?: string;
  entries: EntriJurnal[];
}

/**
 * Mesin jurnal otomatis double-entry.
 * Memvalidasi keseimbangan debet = kredit sebelum menyimpan.
 * WAJIB dipanggil di dalam blok prisma.$transaction agar ACID.
 */
export async function buatJurnal(
  params: BuatJurnalParams,
  client: Prisma.TransactionClient = prisma
): Promise<string> {
  const bersih = params.entries.filter((e) => (e.debit ?? 0) !== 0 || (e.kredit ?? 0) !== 0);
  if (bersih.length === 0) throw new Error("Jurnal tanpa entri tidak dapat dibuat.");

  const totalDebit = bersih.reduce((s, e) => s + (e.debit ?? 0), 0);
  const totalKredit = bersih.reduce((s, e) => s + (e.kredit ?? 0), 0);

  if (Math.abs(totalDebit - totalKredit) > 0.005) {
    throw new Error(
      `Jurnal tidak seimbang: Debit ${totalDebit.toFixed(2)} vs Kredit ${totalKredit.toFixed(2)}`
    );
  }

  const kodeAkun = bersih.map((e) => e.kodeAkun);
  const akun = await client.account.findMany({
    where: { kode: { in: kodeAkun }, active: true },
  });
  if (akun.length !== new Set(kodeAkun).size) {
    const ada = new Set(akun.map((a) => a.kode));
    const kurang = kodeAkun.filter((k) => !ada.has(k));
    throw new Error(`Akun tidak ditemukan / nonaktif: ${kurang.join(", ")}`);
  }
  const akunMap = new Map(akun.map((a) => [a.kode, a.id]));

  const now = params.tanggal ?? new Date();
  const count = await client.jurnal.count();
  const noJurnal = `JRN-${tanggalStamp(now)}-${pad4(count + 1)}`;

  await client.jurnal.create({
    data: {
      noJurnal,
      tanggal: now,
      keterangan: params.keterangan,
      sumber: params.sumber,
      referensi: params.referensi,
      dibuatOlehId: params.dibuatOlehId,
      lines: {
        create: bersih.map((e) => ({
          akunId: akunMap.get(e.kodeAkun)!,
          debit: new Prisma.Decimal(e.debit ?? 0),
          kredit: new Prisma.Decimal(e.kredit ?? 0),
          keterangan: e.keterangan,
        })),
      },
    },
  });

  return noJurnal;
}

/** Membuat akun CoA default bila belum ada (seed ulang akuntansi). */
export async function seedCoA(client: Prisma.TransactionClient = prisma): Promise<void> {
  const { COA_LIST } = await import("./coa");
  for (const c of COA_LIST) {
    const ada = await client.account.findUnique({ where: { kode: c.kode } });
    if (!ada) {
      await client.account.create({
        data: { ...c },
      });
    }
  }
}

export async function getCoA(client: Prisma.TransactionClient = prisma) {
  return client.account.findMany({ where: { active: true }, orderBy: { kode: "asc" } });
}