import type { Role, StatusKepegawaian } from "@/generated/prisma/enums";

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export type { Role, StatusKepegawaian };

export const R6_ROLES: Role[] = [
  "ROLE_SUPERADMIN",
  "ROLE_PENGURUS",
  "ROLE_ADMIN_SP",
  "ROLE_KASIR",
  "ROLE_HRD",
  "ROLE_ANGGOTA",
];

export const DEFAULT_KONSTANTA = {
  SIMPANAN_POKOK: 500000,
  SIMPANAN_WAJIB: 100000,
  SALDO_MENGENDAP: 50000,
  BATAS_DSR: 40,
};