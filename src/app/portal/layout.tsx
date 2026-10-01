import Link from "next/link";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-[#1E293B] px-4 py-3 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="font-bold">Portal Anggota</p>
            <p className="text-xs text-slate-400">Koperasi Karyawan BPR</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm">{session.user.nama || session.user.username}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-300 hover:text-white" type="submit">
                <LogOut className="h-3.5 w-3.5" /> Keluar
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 lg:p-6">{children}</main>
      <footer className="mx-auto max-w-5xl px-4 pb-6 text-xs text-muted-foreground">
        <Link href="/dashboard" className="hover:underline">← Kembali ke Dashboard</Link>
      </footer>
    </div>
  );
}