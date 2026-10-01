import Link from "next/link";
import {
  Landmark,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  Users,
  Wallet,
  ShoppingBag,
  PieChart,
  ScrollText,
  WalletCards,
  HandCoins as HandCoinsIcon,
  ReceiptText,
  QrCode,
  CheckCircle2,
  PackageSearch,
  Calculator,
  TicketPercent,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/utils";
import { getStatistikKoperasi } from "@/modules/core/statistik-publik";
import { ROLE_LABEL } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/enums";

// Halaman depan menampilkan angka nyata dari database, jadi jangan
// di-prerender saat build (lingkungan build tidak selalu punya akses DB).
export const dynamic = "force-dynamic";

const NAMA = process.env.KOOPERASI_NAMA || "KOPERASI KARYAWAN BPR SEJAHTERA";
const ALAMAT = process.env.KOOPERASI_ALAMAT || "Madiun, Jawa Timur";
const BATAS_DSR = Number(process.env.KOOPERASI_BATAS_DSR || 40);

const BENTO = [
  {
    icon: HandCoinsIcon,
    title: "Simpan Pinjam",
    desc: "Simpanan pokok, wajib, dan sukarela. Pinjaman dengan tiga skema bunga (flat, efektif, anuitas) plus simulasi dan pelunasan dini.",
    span: "md:col-span-2",
    preview: "chart",
    accent: "from-emerald-500 to-teal-500",
  },
  {
    icon: QrCode,
    title: "POS Waserda & Voucher",
    desc: "Penjualan tunai, QRIS, dan kasbon di titik kasir. Diskon voucher per kuota dan segmentasi.",
    span: "",
    preview: "barcode",
    accent: "from-amber-500 to-orange-500",
  },
  {
    icon: PackageSearch,
    title: "Inventori & Stok",
    desc: "Purchase order, HPP moving average, dan berita acara stock opname yang langsung dijurnal.",
    span: "",
    preview: "stats",
    accent: "from-sky-500 to-indigo-500",
  },
  {
    icon: PieChart,
    title: "Akuntansi SAK",
    desc: "Bagan akun, jurnal berpasangan, buku besar, dan alokasi SHU. Selisih stok dan biaya operasional masuk akun beban secara otomatis.",
    span: "",
    preview: "stats",
    accent: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: ScrollText,
    title: "Payroll & Potongan",
    desc: "Potongan gaji dari simpanan wajib, angsuran kredit, dan kasbon waserda. Ekspor CSV untuk impor ke bank.",
    span: "md:col-span-2",
    preview: "payroll",
    accent: "from-rose-500 to-pink-500",
  },
];

const ALUR_PINJAMAN = [
  { kode: "DRAFT", label: "Diajukan anggota" },
  { kode: "VERIFIKASI_ADMIN", label: "Verifikasi admin" },
  { kode: "REVIEW_HRD", label: "Review HRD" },
  { kode: "APPROVED", label: "Disetujui pengurus" },
  { kode: "DISBURSED", label: "Dana dicairkan" },
];

// Contoh rasio DSR (%) untuk visualisasi ambang batas.
const CONTOH_DSR = [18, 25, 22, 30, 27, 34, 31, 44];

export default async function LandingPage() {
  const s = await getStatistikKoperasi();
  const namaSingkat = NAMA.replace(/^KOPERASI\s+/i, "");

  const STATS = [
    { value: `${s.totalAnggota}`, label: "Anggota Terdaftar", icon: Users },
    { value: formatIDR(s.totalSimpanan, false), label: "Total Simpanan", icon: Wallet },
    { value: `${s.pinjamanBerjalan}`, label: "Pinjaman Berjalan", icon: HandCoinsIcon },
    { value: `${s.produkWaserda}`, label: "Produk Waserda", icon: ShoppingBag },
  ];

  return (
    <main className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
      {/* ===== NAVBAR ===== */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
              <Landmark className="h-5 w-5 text-white" />
            </span>
            <div className="leading-tight">
              <p className="font-bold tracking-tight">CPS Koperasi</p>
              <p className="text-[11px] text-slate-400">{namaSingkat}</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 text-sm text-slate-300 md:flex">
            <a href="#fitur" className="rounded-md px-3 py-2 transition hover:bg-white/10 hover:text-white">Fitur</a>
            <a href="#alur" className="rounded-md px-3 py-2 transition hover:bg-white/10 hover:text-white">Alur Pinjaman</a>
            <a href="#statistik" className="rounded-md px-3 py-2 transition hover:bg-white/10 hover:text-white">Statistik</a>
            <a href="#akses" className="rounded-md px-3 py-2 transition hover:bg-white/10 hover:text-white">Akses</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/portal/anggota">
              <Button variant="ghost" size="sm" className="text-slate-200 hover:bg-white/10 hover:text-white">
                Portal Anggota
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="sm"
                className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 transition hover:shadow-emerald-400/50 hover:ring-4 hover:ring-emerald-400/30"
              >
                Masuk <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section
        id="tentang"
        className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-900 to-cyan-950"
      >
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)] [background-size:32px_32px]" />
        <div className="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-emerald-500/30 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-[28rem] w-[28rem] rounded-full bg-cyan-500/25 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-28">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1.5 text-xs font-medium shadow-[0_0_24px_rgba(52,211,153,0.35)]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              Sistem Informasi Koperasi Karyawan
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
            </span>

            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
                Simpan, Pinjam, &amp; Belanja
              </span>{" "}
              &mdash; satu pintu untuk seluruh karyawan.
            </h1>

            <p className="max-w-xl text-lg text-slate-300">
              Simpanan, pinjaman, POS waserda, payroll, dan pembukuan SAK dalam
              satu aplikasi. Setiap modul menulis jurnal sendiri, sehingga angka
              di laporan selalu cocok dengan transaksi yang terjadi.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/login">
                <Button
                  size="lg"
                  className="group rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-7 text-base shadow-xl shadow-emerald-500/30 transition-all hover:shadow-emerald-400/50 hover:ring-4 hover:ring-emerald-400/30"
                >
                  Masuk ke Sistem
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href="/portal/anggota">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10"
                >
                  Portal Anggota
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-sm text-slate-400">
              {["Simpanan & mutasi", "Batas DSR otomatis", "Jurnal otomatis"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Mockup: isi dengan angka sungguhan dari database */}
          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-0.5 backdrop-blur-xl shadow-2xl shadow-black/40">
              <div className="rounded-[15px] bg-slate-900/90 p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                      <Landmark className="h-5 w-5 text-white" />
                    </span>
                    <div className="leading-tight">
                      <p className="text-sm font-semibold">Dashboard CPS</p>
                      <p className="text-[11px] text-slate-500">{ALAMAT}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <WalletCards className="mb-2 h-4 w-4 text-emerald-400" />
                    <p className="text-[11px] text-slate-400">Simpanan</p>
                    <p className="text-sm font-bold">{formatIDR(s.totalSimpanan)}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <HandCoinsIcon className="mb-2 h-4 w-4 text-cyan-400" />
                    <p className="text-[11px] text-slate-400">Pinjaman</p>
                    <p className="text-sm font-bold">{formatIDR(s.nilaiPinjamanBerjalan)}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <ShoppingBag className="mb-2 h-4 w-4 text-amber-400" />
                    <p className="text-[11px] text-slate-400">Produk</p>
                    <p className="text-sm font-bold">{s.produkWaserda} SKU</p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs text-slate-400">Batas DSR Otomatis</p>
                    <span className="inline-flex items-center text-[11px] font-semibold text-emerald-400">
                      <Calculator className="mr-0.5 h-3.5 w-3.5" /> {BATAS_DSR}%
                    </span>
                  </div>
                  <div className="flex h-16 items-end gap-1.5">
                    {CONTOH_DSR.map((dsr) => {
                      const melewati = dsr > BATAS_DSR;
                      // Bar yang melewati batas tetap digambar setinggi
                      // maksimum supaya tidak meluber dari container.
                      const tinggi = Math.min(100, Math.round((dsr / BATAS_DSR) * 100));
                      return (
                        <div
                          key={dsr}
                          className={melewati
                            ? "flex-1 rounded-t-md bg-gradient-to-t from-rose-600 to-rose-400 opacity-80"
                            : "flex-1 rounded-t-md bg-gradient-to-t from-emerald-500 to-cyan-400 opacity-80"}
                          style={{ height: `${tinggi}%` }}
                        />
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500">
                    Pengajuan otomatis ditolak bila DSR &gt; {BATAS_DSR}% (bar merah).
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -left-10 bottom-10 hidden items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-xl sm:flex">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
                <ReceiptText className="h-5 w-5 text-white" />
              </span>
              <div>
                <p className="text-xs font-semibold">Struk Waserda</p>
                <p className="text-[11px] text-emerald-400">Tunai &middot; QRIS &middot; Kasbon</p>
              </div>
            </div>

            <div className="absolute -right-6 top-8 hidden items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 shadow-2xl shadow-black/50 backdrop-blur-xl sm:flex">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                <TicketPercent className="h-5 w-5 text-white" />
              </span>
              <div>
                <p className="text-xs font-semibold">Voucher Aktif</p>
                <p className="text-[11px] text-emerald-400">{s.voucherAktif} program berjalan</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== STATISTIK (live dari DB) ===== */}
      <section id="statistik" className="border-y border-white/10 bg-white/5">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 lg:grid-cols-4">
          {STATS.map((st) => (
            <div key={st.label} className="flex flex-col items-center gap-2 text-center">
              <st.icon className="h-6 w-6 text-emerald-400" />
              <p className="text-3xl font-extrabold tracking-tight">{st.value}</p>
              <p className="text-sm text-slate-400">{st.label}</p>
            </div>
          ))}
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
          <p className="text-center text-xs text-slate-500">
            Angka diperbarui dari basis data — {s.akunCoa} akun chart of accounts aktif.
          </p>
        </div>
      </section>

      {/* ===== BENTO GRID ===== */}
      <section id="fitur" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-12 flex flex-col items-center gap-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Satu Aplikasi, Semua Modul
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Platform koperasi lengkap,{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              dari simpan hingga laporan
            </span>
          </h2>
          <p className="max-w-2xl text-slate-400">
            Setiap modul operasional menghasilkan jurnal berpasangan otomatis,
            sehingga pembukuan dan laporan keuangan tidak perlu diinput dua kali.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {BENTO.map((b) => (
            <article
              key={b.title}
              className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/20 ${b.span}`}
            >
              <div className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${b.accent} opacity-20 blur-2xl transition group-hover:opacity-40`} />

              <div className="relative">
                <span className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${b.accent} shadow-lg`}>
                  <b.icon className="h-6 w-6 text-white" />
                </span>
                <h3 className="mb-2 text-lg font-bold">{b.title}</h3>
                <p className="mb-4 text-sm text-slate-400">{b.desc}</p>

                {b.preview === "chart" && (
                  <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                    <div className="mb-2 flex justify-between text-[11px]">
                      <span className="text-slate-400">Skema bunga</span>
                      <span className="font-semibold text-emerald-300">3 metode</span>
                    </div>
                    <div className="flex h-16 items-end gap-1.5">
                      {[50, 65, 55, 72, 60, 78, 68, 88].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-md bg-gradient-to-t from-emerald-500 to-cyan-400 opacity-80"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {b.preview === "barcode" && (
                  <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
                    <div className="flex h-14 items-end gap-[3px]">
                      {[2, 1, 3, 1, 2, 1, 4, 1, 2, 3, 1, 2, 1, 3, 1, 1, 2, 1, 3, 1, 2, 1, 3, 1, 1, 2, 1, 4, 1, 2].map((w, i) => (
                        <div
                          key={i}
                          className="bg-slate-200/80"
                          style={{ width: `${w}px`, height: `${w === 1 ? 55 : 100}%` }}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] text-slate-500">
                      {s.voucherAktif} voucher &middot; {s.produkWaserda} produk &middot; HPP moving average
                    </p>
                  </div>
                )}

                {b.preview === "stats" && (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { l: "Akun COA", v: String(s.akunCoa) },
                      { l: "Anggota", v: String(s.totalAnggota) },
                      { l: "Voucher", v: String(s.voucherAktif) },
                    ].map((x) => (
                      <div key={x.l} className="rounded-lg border border-white/10 bg-slate-900/70 px-2 py-2 text-center">
                        <p className="text-[10px] text-slate-400">{x.l}</p>
                        <p className="text-[11px] font-bold text-emerald-300">{x.v}</p>
                      </div>
                    ))}
                  </div>
                )}

                {b.preview === "payroll" && (
                  <ul className="space-y-1.5 text-[12px]">
                    {["Potongan Simpanan Wajib", "Angsuran Pinjaman", "Kasbon Waserda"].map((p) => (
                      <li
                        key={p}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/70 px-3 py-1.5"
                      >
                        <span className="text-slate-400">{p}</span>
                        <span className="font-semibold text-emerald-300">dipotong otomatis</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ===== ALUR PINJAMAN ===== */}
      <section id="alur" className="border-y border-white/10 bg-white/5">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mb-10 flex flex-col items-center gap-3 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Alur persetujuan pinjaman
            </h2>
            <p className="max-w-2xl text-slate-400">
              Pengajuan tidak langsung cair. Setiap tahap punya penanggung jawab
              dan dicek otomatis oleh sistem sebelum lanjut.
            </p>
          </div>

          <ol className="grid gap-4 md:grid-cols-5">
            {ALUR_PINJAMAN.map((step, i) => (
              <li
                key={step.kode}
                className="relative rounded-2xl border border-white/10 bg-slate-900/60 p-5"
              >
                <span className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="text-sm font-semibold">{step.label}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                  {step.kode.replace(/_/g, " ")}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== AKSES / PERAN ===== */}
      <section id="akses" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Hak akses per peran
          </h2>
          <p className="max-w-2xl text-slate-400">
            Setiap pengguna hanya melihat modul yang menjadi tanggung jawabnya.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
            <div
              key={role}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                <Users className="h-4 w-4 text-white" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{ROLE_LABEL[role]}</p>
                <p className="truncate font-mono text-[10px] uppercase text-slate-500">{role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-14 text-center sm:px-12">
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.25)_1px,transparent_0)] [background-size:28px_28px]" />
          <div className="relative mx-auto max-w-2xl space-y-5">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Siap mengelola koperasi secara transparan?
            </h2>
            <p className="text-emerald-50">
              Masuk dengan akun yang diberikan pengurus, lalu kelola simpanan,
              pinjaman, waserda, payroll, dan pembukuan dari satu dashboard.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/login">
                <Button
                  size="lg"
                  className="group rounded-full bg-white px-7 text-emerald-700 shadow-lg hover:bg-emerald-50"
                >
                  Masuk ke Sistem
                  <ArrowUpRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Button>
              </Link>
              <Link href="/portal/anggota">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10"
                >
                  Portal Anggota
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/10 bg-slate-900/60">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                <Landmark className="h-5 w-5 text-white" />
              </span>
              <div className="leading-tight">
                <p className="font-bold">CPS Koperasi</p>
                <p className="text-[11px] text-slate-400">{NAMA}</p>
              </div>
            </div>
            <p className="max-w-xs text-sm text-slate-400">
              Sistem informasi koperasi karyawan: simpan pinjam, POS waserda,
              payroll, dan pembukuan SAK dalam satu aplikasi.
            </p>
            <p className="text-xs text-slate-500">{ALAMAT}</p>
          </div>

          {[
            {
              h: "Modul",
              links: [
                { l: "Simpanan", h: "/simpanan" },
                { l: "Pinjaman", h: "/pinjaman" },
                { l: "Payroll", h: "/payroll" },
                { l: "Akuntansi", h: "/akuntansi" },
                { l: "Inventori", h: "/inventori" },
                { l: "Voucher", h: "/voucher" },
              ],
            },
            {
              h: "Akses",
              links: [
                { l: "Masuk", h: "/login" },
                { l: "Portal Anggota", h: "/portal/anggota" },
                { l: "Dashboard", h: "/dashboard" },
              ],
            },
          ].map((c) => (
            <div key={c.h}>
              <h4 className="mb-4 font-semibold">{c.h}</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                {c.links.map((x) => (
                  <li key={x.l}>
                    <Link href={x.h} className="transition hover:text-emerald-300">
                      {x.l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:px-6">
            <p>
              &copy; {new Date().getFullYear()} {NAMA}. Seluruh hak cipta.
            </p>
            <p className="inline-flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Pembukuan SAK &middot; Jurnal otomatis
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
