import type { Role } from "@/generated/prisma/enums";

export enum RouteAccess {
  SUPERADMIN_ONLY = "SUPERADMIN_ONLY",
  PENGURUS_ADMIN = "PENGURUS_ADMIN", // simpanan & pinjaman
  HRD = "HRD", // anggota, payroll
  KASIR = "KASIR", // kasir POS
  INVENTORI = "INVENTORI",
  VOUCHER = "VOUCHER",
  AKUNTANSI = "AKUNTANSI",
  PORTAL = "PORTAL", // portal anggota mandiri
  PUBLIC = "PUBLIC",
}

const MATRIKS: Record<RouteAccess, Role[]> = {
  [RouteAccess.SUPERADMIN_ONLY]: ["ROLE_SUPERADMIN"],
  [RouteAccess.PENGURUS_ADMIN]: ["ROLE_SUPERADMIN", "ROLE_PENGURUS", "ROLE_ADMIN_SP"],
  [RouteAccess.HRD]: ["ROLE_SUPERADMIN", "ROLE_HRD"],
  [RouteAccess.KASIR]: ["ROLE_SUPERADMIN", "ROLE_KASIR"],
  [RouteAccess.INVENTORI]: ["ROLE_SUPERADMIN", "ROLE_KASIR", "ROLE_ADMIN_SP", "ROLE_PENGURUS"],
  [RouteAccess.VOUCHER]: ["ROLE_SUPERADMIN", "ROLE_KASIR", "ROLE_ADMIN_SP", "ROLE_PENGURUS"],
  [RouteAccess.AKUNTANSI]: ["ROLE_SUPERADMIN", "ROLE_PENGURUS", "ROLE_HRD"],
  [RouteAccess.PORTAL]: ["ROLE_ANGGOTA", "ROLE_SUPERADMIN", "ROLE_ADMIN_SP", "ROLE_HRD", "ROLE_PENGURUS", "ROLE_KASIR"],
  [RouteAccess.PUBLIC]: [],
};

export const ROUTE_RULES: { prefix: string; access: RouteAccess }[] = [
  { prefix: "/login", access: RouteAccess.PUBLIC },
  { prefix: "/api/", access: RouteAccess.PUBLIC },
  { prefix: "/kasir", access: RouteAccess.KASIR },
  { prefix: "/anggota", access: RouteAccess.HRD },
  { prefix: "/payroll", access: RouteAccess.HRD },
  { prefix: "/akuntansi", access: RouteAccess.AKUNTANSI },
  { prefix: "/simpanan", access: RouteAccess.PENGURUS_ADMIN },
  { prefix: "/pinjaman", access: RouteAccess.PENGURUS_ADMIN },
  { prefix: "/inventori", access: RouteAccess.INVENTORI },
  { prefix: "/voucher", access: RouteAccess.VOUCHER },
  { prefix: "/portal/anggota", access: RouteAccess.PORTAL },
  { prefix: "/", access: RouteAccess.PUBLIC },
];

export function rolesFor(access: RouteAccess): Role[] {
  return MATRIKS[access] ?? [];
}

export function resolveRouteAccess(pathname: string): RouteAccess {
  const rule = ROUTE_RULES.find((r) => pathname.startsWith(r.prefix));
  return rule?.access ?? RouteAccess.PUBLIC;
}

export function roleAllowed(access: RouteAccess, role: Role | undefined): boolean {
  if (access === RouteAccess.PUBLIC) return true;
  if (!role) return false;
  return rolesFor(access).includes(role);
}

export const ROLE_LABEL: Record<Role, string> = {
  ROLE_SUPERADMIN: "Super Admin",
  ROLE_PENGURUS: "Pengurus",
  ROLE_ADMIN_SP: "Admin Simpan Pinjam",
  ROLE_KASIR: "Kasir",
  ROLE_HRD: "HRD",
  ROLE_ANGGOTA: "Anggota",
};