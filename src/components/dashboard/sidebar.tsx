"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Landmark,
  LayoutDashboard,
  Users,
  Wallet,
  HandCoins,
  ShoppingCart,
  TicketPercent,
  PackageSearch,
  Calculator,
  LogOut,
  ChevronRight,
  LandPlot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/shared";

const NAV: { href: string; label: string; icon: React.ElementType; roles: Role[] }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["ROLE_SUPERADMIN", "ROLE_PENGURUS", "ROLE_ADMIN_SP", "ROLE_KASIR", "ROLE_HRD", "ROLE_ANGGOTA"] },
  { href: "/anggota", label: "Anggota & HR", icon: Users, roles: ["ROLE_SUPERADMIN", "ROLE_HRD", "ROLE_PENGURUS"] },
  { href: "/payroll", label: "Payroll & Potongan", icon: Calculator, roles: ["ROLE_SUPERADMIN", "ROLE_HRD"] },
  { href: "/akuntansi", label: "Akuntansi (SAK)", icon: Calculator, roles: ["ROLE_SUPERADMIN", "ROLE_PENGURUS", "ROLE_HRD"] },
  { href: "/simpanan", label: "Simpanan", icon: Wallet, roles: ["ROLE_SUPERADMIN", "ROLE_PENGURUS", "ROLE_ADMIN_SP"] },
  { href: "/pinjaman", label: "Pinjaman", icon: HandCoins, roles: ["ROLE_SUPERADMIN", "ROLE_PENGURUS", "ROLE_ADMIN_SP", "ROLE_HRD"] },
  { href: "/inventori", label: "Inventori", icon: PackageSearch, roles: ["ROLE_SUPERADMIN", "ROLE_ADMIN_SP", "ROLE_KASIR", "ROLE_PENGURUS"] },
  { href: "/voucher", label: "Voucher", icon: TicketPercent, roles: ["ROLE_SUPERADMIN", "ROLE_ADMIN_SP", "ROLE_KASIR", "ROLE_PENGURUS"] },
  { href: "/kasir", label: "POS Kasir", icon: ShoppingCart, roles: ["ROLE_SUPERADMIN", "ROLE_KASIR"] },
  { href: "/portal/anggota", label: "Portal Anggota", icon: LandPlot, roles: ["ROLE_SUPERADMIN", "ROLE_PENGURUS", "ROLE_ADMIN_SP", "ROLE_KASIR", "ROLE_HRD", "ROLE_ANGGOTA"] },
];

export function Sidebar({
  username,
  nama,
  role,
}: {
  username: string;
  nama: string;
  role: Role;
}) {
  const pathname = usePathname();
  const items = NAV.filter((n) => n.roles.includes(role));

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r bg-[#1E293B] text-slate-200 max-lg:hidden">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Landmark className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-white">CPS Koperasi</p>
          <p className="text-[11px] text-slate-400">Karyawan BPR</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary/90 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {active && <ChevronRight className="ml-auto h-4 w-4" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 rounded-md bg-white/5 px-3 py-2">
          <p className="truncate text-xs font-semibold text-white">{nama || username}</p>
          <p className="text-[11px] text-slate-400">{role.replace("ROLE_", "")}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>
    </aside>
  );
}