import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ActionResult } from "@/types/shared";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatIDR(
  nilai: number | string | { toString(): string } | null | undefined,
  withPrefix = true
): string {
  const num = typeof nilai === "number" ? nilai : Number(nilai ?? 0);
  const fmt = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(num) ? num : 0);
  return withPrefix ? `Rp${fmt}` : fmt;
}

export function parseRupiah(value: string | number): number {
  if (typeof value === "number") return value;
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

export function formatTanggal(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatPeriode(periode: string): string {
  const [tahun, bulan] = periode.split("-");
  const namaBulan = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const idx = Number(bulan) - 1;
  return `${namaBulan[idx] ?? bulan} ${tahun}`;
}

export function periodeBulanIni(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function periodeSekarang(offsetBulan = 0): string {
  const now = new Date();
  now.setMonth(now.getMonth() + offsetBulan);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

export function pad4(n: number): string {
  return String(n).padStart(4, "0");
}

export function tanggalStamp(d = new Date()): string {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

export function generateNomor(prefix: string, urut: number): string {
  const now = new Date();
  return `${prefix}-${String(now.getUTCFullYear().toString().slice(2))}${tanggalStamp(now).slice(4)}-${pad4(urut)}`;
}

export function hitungUmurHari(tanggal: Date | string, dariTanggal: Date | string = new Date()): number {
  const t = typeof tanggal === "string" ? new Date(tanggal) : tanggal;
  const d = typeof dariTanggal === "string" ? new Date(dariTanggal) : dariTanggal;
  const ms = Math.max(0, d.getTime() - t.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function awalBulan(periode: string): Date {
  const [tahun, bulan] = periode.split("-").map(Number);
  return new Date(tahun, bulan - 1, 1);
}

export function akhirBulan(periode: string): Date {
  const [tahun, bulan] = periode.split("-").map(Number);
  return new Date(tahun, bulan, 0, 23, 59, 59, 999);
}

export function tambahBulan(tanggal: Date, bulan: number): Date {
  const d = new Date(tanggal);
  d.setMonth(d.getMonth() + bulan);
  return d;
}

export function berhasil<T = unknown>(data?: T): ActionResult<T> {
  return { success: true, data };
}

export function gagal(error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> {
  return { success: false, error, fieldErrors };
}