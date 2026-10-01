import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function RootGuard({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">{children}</main>
  );
}