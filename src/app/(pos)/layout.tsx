import Link from "next/link";
import { LogOut, LayoutDashboard } from "lucide-react";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex h-14 items-center justify-between border-b bg-[#1E293B] px-4 text-white">
        <div className="flex items-center gap-2">
          <span className="font-bold">POS Waserda</span>
          <span className="hidden text-xs text-slate-400 sm:inline">
            {session?.user?.nama || session?.user?.username}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-300 hover:text-white">
            <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
          </Link>
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
      </header>
      <main className="p-3 lg:p-4">{children}</main>
    </div>
  );
}