import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: {
    default: "CPS - Koperasi Karyawan BPR",
    template: "%s | CPS Koperasi",
  },
  description:
    "Sistem Informasi Koperasi Karyawan BPR - Simpan Pinjam, POS Waserda, Voucher, Payroll dan Akuntansi SAK",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen font-sans text-slate-900 antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}