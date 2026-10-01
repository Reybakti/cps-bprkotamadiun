// ============================================================
// Day-0 Seed CPS (Jadwal WBS Sprint 1 - Aktivitas 1.4)
// Menjalankan: npx tsx prisma/seed.ts   (atau `prisma db seed`)
// Idempotent - aman dijalankan berulang.
// ============================================================

import { prisma } from "../src/lib/db";
import bcrypt from "bcryptjs";
import { COA_LIST } from "../src/modules/core/accounting/coa";

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || "superadmin";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "Superadmin123!";
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || "Cps12345!";
const SIMPANAN_POKOK = Number(process.env.KOOPERASI_SIMPANAN_POKOK || 500000);
const SIMPANAN_WAJIB = Number(process.env.KOOPERASI_SIMPANAN_WAJIB || 100000);

async function seedCoa() {
  for (const c of COA_LIST) {
    await prisma.account.upsert({
      where: { kode: c.kode },
      create: { ...c },
      update: { nama: c.nama, klasifikasi: c.klasifikasi, posisiNormal: c.posisiNormal },
    });
  }
  const count = await prisma.account.count();
  console.log(`[COA] ${count} akun siap.`);
}

const AKUN_SUKARELA = "2.1101";
const AKUN_POKOK = "3.1101";
const AKUN_WAJIB = "3.1102";

async function seedSimpananAwal(nip: string, nama: string, statusAnggota: string) {
  const anggota = await prisma.anggota.findUnique({ where: { nipKaryawan: nip } });
  if (!anggota) return;

  const sudahPokok = await prisma.simpananMutasi.findFirst({
    where: { anggotaId: anggota.id, jenisSimpanan: "POKOK" },
  });
  if (!sudahPokok) {
    const mutasi = await prisma.simpananMutasi.create({
      data: {
        anggotaId: anggota.id,
        jenisSimpanan: "POKOK",
        tipeMutasi: "SETOR",
        nominal: SIMPANAN_POKOK,
        saldoAkhir: SIMPANAN_POKOK,
        referensiTrx: "SEED-DAY0",
        keterangan: "Simpanan pokok saat registrasi",
      },
    });
    const jurnal = await prisma.jurnal.create({
      data: {
        noJurnal: `JRN-POKOK-${anggota.nak}`,
        keterangan: `Simpanan pokok ${name(nama)} (${anggota.nak}) - seed`,
        sumber: "SIMPANAN",
        referensi: `REG-${anggota.nak}`,
        lines: {
          create: [
            { akunId: (await akun("1.1102")).id, debit: SIMPANAN_POKOK },
            { akunId: (await akun(AKUN_POKOK)).id, kredit: SIMPANAN_POKOK },
          ],
        },
      },
    });
    await prisma.simpananMutasi.update({ where: { id: mutasi.id }, data: { jurnalId: jurnal.id } });
    console.log(`  [SIMPANAN] Pokok ${anggota.nak} tercatat.`);
  }

  const sudahWajib = await prisma.simpananMutasi.findFirst({
    where: { anggotaId: anggota.id, jenisSimpanan: "WAJIB" },
  });
  if (!sudahWajib) {
    await prisma.simpananMutasi.create({
      data: {
        anggotaId: anggota.id,
        jenisSimpanan: "WAJIB",
        tipeMutasi: "SETOR",
        nominal: SIMPANAN_WAJIB,
        saldoAkhir: SIMPANAN_WAJIB,
        referensiTrx: "SEED-DAY0",
        keterangan: "Simpanan wajib bulan pertama",
      },
    });
  }
  void statusAnggota;
}

let akunCache: Record<string, { id: string }> = {};
async function akun(kode: string) {
  if (!akunCache[kode]) {
    akunCache[kode] = await prisma.account.findUniqueOrThrow({ where: { kode } });
  }
  return akunCache[kode];
}

function name(n: string) {
  return n;
}

async function seedUserDanAnggota() {
  const akunRes = await prisma.account.findMany({ select: { kode: true, id: true } });
  akunCache = Object.fromEntries(akunRes.map((a) => [a.kode, { id: a.id }]));

  const pengguna = [
    { username: ADMIN_USERNAME, role: "ROLE_SUPERADMIN", nama: "Super Admin Koperasi", password: ADMIN_PASSWORD },
    { username: "pengurus", role: "ROLE_PENGURUS", nama: "Pengurus Koperasi", password: DEFAULT_PASSWORD },
    { username: "admin_sp", role: "ROLE_ADMIN_SP", nama: "Admin Simpan Pinjam", password: DEFAULT_PASSWORD },
    { username: "kasir", role: "ROLE_KASIR", nama: "Kasir Waserda", password: DEFAULT_PASSWORD },
    { username: "hrd", role: "ROLE_HRD", nama: "Staf HRD", password: DEFAULT_PASSWORD },
  ] as const;

  for (const u of pengguna) {
    const hash = bcrypt.hashSync(u.password, 12);
    await prisma.user.upsert({
      where: { username: u.username },
      create: { username: u.username, passwordHash: hash, nama: u.nama, role: u.role },
      update: { nama: u.nama },
    });
    console.log(`[USER] ${u.username} (${u.role})`);
  }

  const anggotaSampel = [
    {
      nip: "BPR-0001",
      nama: "Andi Wijaya",
      divisi: "Operasional",
      kantor: "Pusat",
      status: "TETAP",
      jabatan: "Teller",
      gaji: 4500000,
    },
    {
      nip: "BPR-0002",
      nama: "Siti Rahma",
      divisi: "Marketing",
      kantor: "Pusat",
      status: "KONTRAK",
      jabatan: "Marketing Staff",
      gaji: 3800000,
    },
    {
      nip: "BPR-0003",
      nama: "Budi Santoso",
      divisi: "Operasional",
      kantor: "Cabang Madiun",
      status: "PROBATION",
      jabatan: "CS",
      gaji: 3000000,
    },
  ] as const;

  const limitMap: Record<string, number> = { TETAP: 2500000, KONTRAK: 1000000, PROBATION: 500000 };
  const plafonMap: Record<string, number> = { TETAP: 100000000, KONTRAK: 25000000, PROBATION: 0 };

  for (const a of anggotaSampel) {
    const user = await prisma.user.upsert({
      where: { username: a.nip },
      create: {
        username: a.nip,
        passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 12),
        nama: a.nama,
        role: "ROLE_ANGGOTA",
      },
      update: { nama: a.nama },
    });

    const tahun = new Date().getFullYear();
    const urut = anggotaSampel.findIndex((x) => x.nip === a.nip) + 1;
    const nak = `KOP-PUS-${tahun}-${String(urut).padStart(4, "0")}`;

    const anggota = await prisma.anggota.upsert({
      where: { nipKaryawan: a.nip },
      create: {
        userId: user.id,
        nak,
        nipKaryawan: a.nip,
        namaLengkap: a.nama,
        divisi: a.divisi,
        kantorCabang: a.kantor,
        jabatan: a.jabatan,
        statusKepegawaian: a.status as "TETAP" | "KONTRAK" | "PROBATION",
        gajiBersih: a.gaji,
        limitKasbonBulanan: limitMap[a.status],
        limitKasbonToko: limitMap[a.status],
        plafonPinjamanMaks: plafonMap[a.status],
      },
      update: { namaLengkap: a.nama },
    });
    console.log(`[ANGGOTA] ${anggota.nak} - ${a.nama} (${a.status})`);
    await seedSimpananAwal(a.nip, a.nama, a.status);
  }
}

async function seedProdukVoucher() {
  const produk = [
    { barcode: "8991002100341", nama: "Air Mineral 600ml", kategori: "Minuman", satuan: "PCS", beli: 2500, jualUmum: 3500, jualAnggota: 3000 },
    { barcode: "8991002200782", nama: "Kopi Sachet (10x)", kategori: "Makanan", satuan: "DUS", beli: 9000, jualUmum: 12000, jualAnggota: 10500 },
    { barcode: "8992750470761", nama: "Mie Instan Goreng", kategori: "Makanan", satuan: "PCS", beli: 2800, jualUmum: 3500, jualAnggota: 3200 },
    { barcode: "8992989880013", nama: "Sabun Cuci Piring 750ml", kategori: "Kebutuhan Rumah", satuan: "PCS", beli: 6000, jualUmum: 8000, jualAnggota: 7200 },
    { barcode: "8999999999998", nama: "Beras 5kg Premium", kategori: "Sembako", satuan: "KARUNG", beli: 58000, jualUmum: 65000, jualAnggota: 60000 },
  ] as const;

  for (const p of produk) {
    await prisma.produk.upsert({
      where: { barcode: p.barcode },
      create: {
        barcode: p.barcode,
        namaBarang: p.nama,
        kategori: p.kategori,
        satuan: p.satuan,
        hargaBeliHpp: p.beli,
        hargaJualUmum: p.jualUmum,
        hargaJualAnggota: p.jualAnggota,
        stok: 50,
        stokMinimum: 10,
      },
      update: { namaBarang: p.nama, hargaJualUmum: p.jualUmum, hargaJualAnggota: p.jualAnggota },
    });
  }
  console.log(`[PRODUK] ${produk.length} produk dummy.`);

  const mulai = new Date();
  const selesai = new Date();
  selesai.setDate(selesai.getDate() + 30);

  await prisma.voucher.upsert({
    where: { kodeVoucher: "HEMAT10" },
    create: {
      kodeVoucher: "HEMAT10",
      namaVoucher: "Diskon 10% max Rp25.000",
      tipePotongan: "PERSEN",
      nilaiPotongan: 10,
      maksimalPotongan: 25000,
      minBelanja: 100000,
      kuotaTotal: 100,
      kuotaPerUser: 1,
      khususAnggota: false,
      segmentasi: "UMUM",
      berlakuMulai: mulai,
      berlakuSampai: selesai,
      status: "AKTIF",
    },
    update: {},
  });

  await prisma.voucher.upsert({
    where: { kodeVoucher: "ANGGOTA100" },
    create: {
      kodeVoucher: "ANGGOTA100",
      namaVoucher: "Cashback Anggota Rp100.000",
      tipePotongan: "NOMINAL",
      nilaiPotongan: 100000,
      minBelanja: 250000,
      kuotaTotal: 20,
      kuotaPerUser: 1,
      khususAnggota: true,
      segmentasi: "ANGGOTA",
      berlakuMulai: mulai,
      berlakuSampai: selesai,
      status: "AKTIF",
    },
    update: {},
  });
  console.log("[VOUCHER] HEMAT10 & ANGGOTA100 siap.");
}

async function main() {
  console.log("=== Day-0 Seed CPS ===");
  await seedCoa();
  await seedUserDanAnggota();
  await seedProdukVoucher();
  console.log("=== Seed selesai ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });