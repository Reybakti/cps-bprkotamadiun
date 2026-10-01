import { formatIDR, formatTanggal } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableFooter, TableRow } from "@/components/ui/table";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { NeracaResult, PhuResult } from "@/modules/core/accounting/reports";

export function AkuntansiTabs({ neraca, labaRugi }: { neraca: NeracaResult; labaRugi: PhuResult }) {
  return (
    <Tabs defaultValue="neraca">
      <TabsList>
        <TabsTrigger value="neraca">Neraca</TabsTrigger>
        <TabsTrigger value="labaRugi">Laba Rugi</TabsTrigger>
      </TabsList>

      <TabsContent value="neraca">
        <div className="space-y-3">
          {neraca.seimbang ? null : (
            <Alert variant="warning">
              Neraca tidak seimbang (Aset Rp{formatIDR(neraca.totalAset)} vs Pasiva Rp{formatIDR(neraca.totalPasiva)}).
            </Alert>
          )}
          <p className="text-sm text-muted-foreground">
            Posisi per {formatTanggal(neraca.tanggal)}
          </p>
        </div>

        <div className="mt-3 grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aset</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {neraca.aset.map((r) => (
                    <TableRow key={r.kode}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.kode}</TableCell>
                      <TableCell className="text-sm">{r.nama} {r.pengurang && <Badge variant="secondary">kontra</Badge>}</TableCell>
                      <TableCell className={`tnum text-right ${r.saldo < 0 ? "text-rose-600" : ""}`}>{formatIDR(r.saldo)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="font-semibold">Total Aset</TableCell>
                    <TableCell className="tnum text-right font-bold">{formatIDR(neraca.totalAset)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kewajiban</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {neraca.kewajiban.map((r) => (
                    <TableRow key={r.kode}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.kode}</TableCell>
                      <TableCell className="text-sm">{r.nama}</TableCell>
                      <TableCell className="tnum text-right">{formatIDR(r.saldo)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="font-semibold">Total Kewajiban</TableCell>
                    <TableCell className="tnum text-right font-bold">{formatIDR(neraca.totalKewajiban)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ekuitas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {neraca.ekuitas.map((r) => (
                    <TableRow key={r.kode}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.kode}</TableCell>
                      <TableCell className="text-sm">{r.nama}</TableCell>
                      <TableCell className="tnum text-right">{formatIDR(r.saldo)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="font-semibold">Total Pasiva</TableCell>
                    <TableCell className="tnum text-right font-bold">{formatIDR(neraca.totalPasiva)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="labaRugi">
        <div className="mt-3 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pendapatan</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {labaRugi.pendapatan.map((r) => (
                    <TableRow key={r.kode}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.kode}</TableCell>
                      <TableCell className="text-sm">{r.nama}</TableCell>
                      <TableCell className="tnum text-right">{formatIDR(r.saldo)}</TableCell>
                    </TableRow>
                  ))}
                  {labaRugi.pendapatan.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">Belum ada pendapatan.</TableCell></TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="font-semibold">Total Pendapatan</TableCell>
                    <TableCell className="tnum text-right font-bold">{formatIDR(labaRugi.totalPendapatan)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Beban</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {labaRugi.beban.map((r) => (
                    <TableRow key={r.kode}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.kode}</TableCell>
                      <TableCell className="text-sm">{r.nama}</TableCell>
                      <TableCell className="tnum text-right">{formatIDR(r.saldo)}</TableCell>
                    </TableRow>
                  ))}
                  {labaRugi.beban.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">Belum ada beban.</TableCell></TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="font-semibold">Total Beban</TableCell>
                    <TableCell className="tnum text-right font-bold">{formatIDR(labaRugi.totalBeban)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Laba (Rugi) Bersih</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`tnum text-3xl font-bold ${labaRugi.labaBersih < 0 ? "text-rose-600" : "text-primary"}`}>
              {formatIDR(labaRugi.labaBersih)}
            </p>
            <p className="text-sm text-muted-foreground">
              Periode {formatTanggal(labaRugi.dari)} s.d. {formatTanggal(labaRugi.sampai)}
            </p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-card text-card-foreground shadow-sm ${className ?? ""}`}>
      {children}
    </div>
  );
}
function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-col space-y-1.5 p-5 pb-2 ${className ?? ""}`}>{children}</div>;
}
function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={`font-semibold leading-none tracking-tight ${className ?? ""}`}>{children}</h3>;
}
function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-5 pt-2 ${className ?? ""}`}>{children}</div>;
}