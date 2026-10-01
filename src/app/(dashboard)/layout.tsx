import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ROLE_SUPERADMIN", "ROLE_MANAGER", "ROLE_AWASERDA", "ROLE_AKUNTANSI", "ROLE_HRD", "ROLE_KASIR"].includes(session.user.role))
    redirect("/");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        username={session.user.username ?? "user"}
        nama={session.user.nama ?? ""}
        role={session.user.role}
      />
      <div className="flex-1 overflow-x-hidden">
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}