import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildPayrollCsv, getPayrollRows } from "@/modules/core/payroll";
import { periodeBulanIni } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !["ROLE_SUPERADMIN", "ROLE_HRD"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const periode = url.searchParams.get("periode") ?? periodeBulanIni();

  const rows = await getPayrollRows(periode);
  const csv = buildPayrollCsv(rows);

  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payroll-${periode}.csv"`,
    },
  });
}