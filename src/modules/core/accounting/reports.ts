import { prisma } from "@/lib/db";
import type { KlasifikasiAkun } from "@/generated/prisma/enums";

export interface SaldoAkunRow {
  kode: string;
  nama: string;
  klasifikasi: KlasifikasiAkun;
  sumDebit: number;
  sumKredit: number;
  saldo: number; // sesuai posisi normal (debit-normal => saldo debet; kredit-normal => saldo kredit)
}

interface Rentang {
  dari?: Date;
  sampai?: Date;
}

async function ambilSaldoAkun(rentang: Rentang = {}): Promise<SaldoAkunRow[]> {
  const entries = await prisma.jurnalEntry.findMany({
    where: {
      jurnal: {
        tanggal: { gte: rentang.dari, lte: rentang.sampai },
      },
    },
    select: {
      debit: true,
      kredit: true,
      akun: {
        select: {
          kode: true,
          nama: true,
          klasifikasi: true,
          posisiNormal: true,
        },
      },
    },
  });

  const map = new Map<string, SaldoAkunRow>();
  for (const e of entries) {
    const key = e.akun.kode;
    const cur = map.get(key) ?? {
      kode: e.akun.kode,
      nama: e.akun.nama,
      klasifikasi: e.akun.klasifikasi,
      sumDebit: 0,
      sumKredit: 0,
      saldo: 0,
    };
    cur.sumDebit += Number(e.debit);
    cur.sumKredit += Number(e.kredit);
    map.set(key, cur);
  }

  const rows = Array.from(map.values())
    .map((r) => {
      const selisih = r.sumDebit - r.sumKredit;
      // posisiNormal DEBIT => saldo debet = selisih; KREDIT => saldo kredit = -selisih
      const saldoKreditNormal = r.kode.startsWith("1.1299") || r.kode.startsWith("1.1499");
      void saldoKreditNormal;
      return { ...r, saldo: selisih };
    })
    .sort((a, b) => a.kode.localeCompare(b.kode));

  return rows;
}

export interface BarisNeraca {
  kode: string;
  nama: string;
  saldo: number;
  pengurang: boolean; // kontra aset / pengurang
}

export interface NeracaResult {
  tanggal: Date;
  aset: BarisNeraca[];
  totalAset: number;
  kewajiban: BarisNeraca[];
  totalKewajiban: number;
  ekuitas: BarisNeraca[];
  labaBerjalan: number;
  totalEkuitas: number;
  totalPasiva: number;
  seimbang: boolean;
}

export async function getNeraca(tanggal?: Date): Promise<NeracaResult> {
  const sampai = tanggal ? new Date(tanggal.toISOString()) : new Date();
  sampai.setHours(23, 59, 59, 999);
  const rows = await ambilSaldoAkun({ sampai });

  const aset: BarisNeraca[] = [];
  const kewajiban: BarisNeraca[] = [];
  const ekuitas: BarisNeraca[] = [];
  let totalAset = 0;
  let totalKewajiban = 0;
  let totalEkuitas = 0;
  let pendapatanTotal = 0;
  let bebanTotal = 0;
  let labaBerjalan = 0;

  for (const r of rows) {
    const posisiKredit = r.kode === "1.1299" || r.kode === "1.1499";
    const saldoNilai = posisiKredit ? -r.saldo : r.saldo;

    if (r.klasifikasi === "PENDAPATAN") {
      // saldo pendapatan = -r.saldo (karena normal kredit)
      pendapatanTotal += -r.saldo;
      continue;
    }
    if (r.klasifikasi === "BEBAN") {
      bebanTotal += r.saldo;
      continue;
    }
    if (r.klasifikasi === "ASET") {
      aset.push({ kode: r.kode, nama: r.nama, saldo: saldoNilai, pengurang: posisiKredit });
      totalAset += saldoNilai;
    } else if (r.klasifikasi === "KEWAJIBAN") {
      kewajiban.push({ kode: r.kode, nama: r.nama, saldo: -r.saldo, pengurang: false });
      totalKewajiban += -r.saldo;
    } else if (r.klasifikasi === "EKUITAS") {
      if (r.kode === "3.1301") continue; // SHU dihitung dari laba berjalan
      ekuitas.push({ kode: r.kode, nama: r.nama, saldo: -r.saldo, pengurang: false });
      totalEkuitas += -r.saldo;
    }
  }

  labaBerjalan = pendapatanTotal - bebanTotal;
  ekuitas.push({ kode: "3.1301", nama: "SHU Tahun Berjalan", saldo: labaBerjalan, pengurang: false });
  totalEkuitas += labaBerjalan;

  const totalPasiva = totalKewajiban + totalEkuitas;
  return {
    tanggal: sampai,
    aset,
    totalAset: Math.round(totalAset),
    kewajiban,
    totalKewajiban: Math.round(totalKewajiban),
    ekuitas,
    labaBerjalan: Math.round(labaBerjalan),
    totalEkuitas: Math.round(totalEkuitas),
    totalPasiva: Math.round(totalPasiva),
    seimbang: Math.abs(totalAset - totalPasiva) <= 1,
  };
}

export interface BarisPHU {
  kode: string;
  nama: string;
  saldo: number;
}

export interface PhuResult {
  dari: Date;
  sampai: Date;
  pendapatan: BarisPHU[];
  totalPendapatan: number;
  beban: BarisPHU[];
  totalBeban: number;
  labaBersih: number;
}

export async function getLabaRugi(dari: Date, sampai: Date): Promise<PhuResult> {
  sampai = new Date(sampai);
  sampai.setHours(23, 59, 59, 999);
  const rows = await ambilSaldoAkun({ dari, sampai });

  const pendapatan: BarisPHU[] = [];
  const beban: BarisPHU[] = [];
  let totalPendapatan = 0;
  let totalBeban = 0;

  for (const r of rows) {
    if (r.klasifikasi === "PENDAPATAN") {
      const saldo = -r.saldo;
      if (saldo !== 0) {
        pendapatan.push({ kode: r.kode, nama: r.nama, saldo });
        totalPendapatan += saldo;
      }
    } else if (r.klasifikasi === "BEBAN") {
      const saldo = r.saldo;
      if (saldo !== 0) {
        beban.push({ kode: r.kode, nama: r.nama, saldo });
        totalBeban += saldo;
      }
    }
  }

  return {
    dari,
    sampai,
    pendapatan,
    totalPendapatan: Math.round(totalPendapatan),
    beban,
    totalBeban: Math.round(totalBeban),
    labaBersih: Math.round(totalPendapatan - totalBeban),
  };
}

export interface BarisBukuBesar {
  tanggal: Date;
  noJurnal: string;
  keterangan: string;
  referensi?: string;
  debit: number;
  kredit: number;
  saldo: number;
}

export async function getBukuBesar(
  kodeAkun: string,
  dari?: Date,
  sampai?: Date
): Promise<{ kodeAkun: string; nama: string; baris: BarisBukuBesar[] }> {
  const akun = await prisma.account.findUnique({ where: { kode: kodeAkun } });
  if (!akun) throw new Error(`Akun ${kodeAkun} tidak ditemukan.`);

  const entries = await prisma.jurnalEntry.findMany({
    where: {
      akunId: akun.id,
      jurnal: {
        tanggal: {
          ...(dari ? { gte: dari } : {}),
          ...(sampai ? { lte: sampai } : {}),
        },
      },
    },
    select: {
      debit: true,
      kredit: true,
      keterangan: true,
      jurnal: { select: { noJurnal: true, tanggal: true, keterangan: true, referensi: true } },
    },
    orderBy: { jurnal: { tanggal: "asc" } },
  });

  let saldoBerjalan = 0;
  const baris = entries.map((e) => {
    saldoBerjalan += Number(e.debit) - Number(e.kredit);
    return {
      tanggal: e.jurnal.tanggal,
      noJurnal: e.jurnal.noJurnal,
      keterangan: e.jurnal.keterangan,
      referensi: e.jurnal.referensi ?? undefined,
      debit: Number(e.debit),
      kredit: Number(e.kredit),
      saldo: saldoBerjalan,
    };
  });

  return { kodeAkun: akun.kode, nama: akun.nama, baris };
}

export async function getDaftarJurnal(limit = 50, sumber?: string) {
  return prisma.jurnal.findMany({
    where: sumber ? { sumber: sumber as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      lines: { include: { akun: true } },
    },
  });
}