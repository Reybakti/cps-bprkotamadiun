import { prisma } from "@/lib/db";

export async function catatAudit(
  modul: string,
  aksi: string,
  detail?: unknown,
  opts?: { userId?: string; username?: string; ip?: string }
): Promise<void> {
  try {
    await prisma.auditTrail.create({
      data: {
        userId: opts?.userId,
        username: opts?.username,
        modul,
        aksi,
        detail: detail ? JSON.parse(JSON.stringify(detail)) : undefined,
        ip: opts?.ip,
      },
    });
  } catch {
    // audit trail tidak boleh menggagalkan transaksi utama
  }
}

export function getClientIp(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip")?.trim() ??
    undefined
  );
}