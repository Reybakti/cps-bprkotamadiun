import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { formatIDR, periodeBulanIni } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, HandCoins, ShoppingBag, PiggyBank } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortalAnggotaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const anggotaId = session.user.anggotaId;
  if (!anggotaId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <PiggyBank className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Akun Anda belum terhubung ke data anggota.</p>
          <p className="text-sm text-muted-foreground">Hubungi pengurus koperasi untuk penghubungan data.</p>
        </CardContent>
      </Card>
    );
  }

  const anggota = await prisma.anggota.findUnique({
    where: { id: anggotaId },
    include: {
      simpananMutasi: { orderBy: { createdAt: "desc" } },
      pinjaman: {
        include: { angsuranJadwal: { orderBy: { angsuranKe: "asc" } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!anggota) return <p className="text-muted-foreground">Data anggota tidak ditemukan.</p>;

  const simpanan = anggota.simpananMutasi.reduce<Record<string, number>>((acc, m) => {
    const key = m.jenisSimpanan;
    acc[key] = (acc[key] ?? 0) + (m.tipeMutasi === "SETOR" ? Number(m.nominal) : -Number(m.nominal));
    return acc;
  }, {});

  const kasbonBelum = await prisma.penjualan.aggregate({
    where: { anggotaId, metodeBayar: "KASBON", statusBayar: "BELUM_LUNAS" },
    _sum: { totalAkhir: true },
    _count: true,
  });

  const pinjamanAktif = anggota.pinjaman.find((p) => p.statusApproval === "DISBURSED");
  const sisaPokok = pinjamanAktif
    ? pinjamanAktif.angsuranJadwal.filter((a) => a.statusBayar === "PENDING").reduce((s, a) => s + Number(a.angsuranPokok), 0)
    : 0;
  const angsuranBulanIni = pinjamanAktif
    ? pinjamanAktif.angsuranJadwal.find(
        (a) => new Date(a.tglJatuhTempo).toISOString().slice(0, 7) === periodeBulanIni() && a.statusBayar === "PENDING"
      )
    : undefined;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profil Keanggotaan</CardTitle>
          <CardDescription>
            {anggota.nak} · NIP {anggota.nipKaryawan}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Info label="Divisi / Cabang" value={`${anggota.divisi} - ${anggota.kantorCabang}`} />
          <Info label="Status" value={anggota.statusAnggota} />
          <Info label="Status Kerja" value={anggota.statusKepegawaian} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Mini icon={Wallet} label="Simpanan Pokok" value={formatIDR(simpanan.POKOK ?? 0)} />
        <Mini icon={Wallet} label="Simpanan Wajib" value={formatIDR(simpanan.WAJIB ?? 0)} />
        <Mini icon={Wallet} label="Simpanan Sukarela" value={formatIDR(simpanan.SUKARELA ?? 0)} />
        <Mini icon={ShoppingBag} label="Kasbon Toko" value={formatIDR(kasbonBelum._sum.totalAkhir ?? 0)} sub={`${kasbonBelum._count} transaksi belum lunas`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HandCoins className="h-4 w-4 text-primary" /> Pinjaman
            </CardTitle>
          </CardHeader>
          <CardContent>
            {anggota.pinjaman.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Belum ada riwayat pinjaman.</p>
            ) : (
              <div className="space-y-2">
                {anggota.pinjaman.map((p) => {
                  const sisa = p.angsuranJadwal.filter((a) => a.statusBayar === "PENDING").reduce((s, a) => s + Number(a.angsuranPokok), 0);
                  return (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                      <div>
                        <p className="font-mono text-xs font-semibold">{p.noKontrak}</p>
                        <p className="text-xs text-muted-foreground">{p.jenisPinjaman} · {p.metodeBunga}</p>
                      </div>
                      <div className="text-right">
                        <p className="tnum font-semibold">{formatIDR(p.nominalPengajuan)}</p>
                        <p className="text-xs text-muted-foreground">sisa pokok {formatIDR(sisa)}</p>
                      </div>
                      <Badge variant={p.statusApproval === "LUNAS" ? "success" : p.statusApproval === "DISBURSED" ? "info" : "warning"}>
                        {p.statusApproval}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tagihan Estimasi Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row
              label="Angsuran pinjaman (bulan ini)"
              value={angsuranBulanIni ? formatIDR(Number(angsuranBulanIni.angsuranPokok) + Number(angsuranBulanIni.angsuranBunga)) : "0"}
              sub={pinjamanAktif ? `sisa pokok ${formatIDR(sisaPokok)}` : undefined}
            />
            <Row label="Kasbon toko (belum lunas)" value={formatIDR(kasbonBelum._sum.totalAkhir ?? 0)} />
            <Row label="Simpanan (Pokok + Wajib)" value={formatIDR((simpanan.POKOK ?? 0) + (simpanan.WAJIB ?? 0))} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}

function Mini({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <p className="text-xs font-medium">{label}</p>
        </div>
        <p className="tnum mt-1 text-xl font-bold">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
      <div>
        <p className="text-muted-foreground">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
      </div>
      <p className="tnum font-semibold">{value}</p>
    </div>
  );
}