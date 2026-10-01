import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkout } from "@/modules/waserda/penjualan";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!["ROLE_SUPERADMIN", "ROLE_KASIR"].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ success: false, error: "Body tidak valid" }, { status: 400 });

  const result = await checkout(body);
  if (!result.success || !result.data) {
    return NextResponse.json(result, { status: 422 });
  }
  return NextResponse.json(result, { status: 200 });
}