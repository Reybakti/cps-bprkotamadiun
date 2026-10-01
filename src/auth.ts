import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/auth.config";

const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Kredensial Koperasi",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Dynamic import agar modul server (pg/prisma) tidak ikut
        // ter-bundle ke edge middleware.
        const { prisma } = await import("@/lib/db");
        const { verifyPassword } = await import("@/lib/auth-utils");

        const user = await prisma.user.findUnique({
          where: { username: parsed.data.username },
          include: { anggota: true },
        });
        if (!user) return null;

        const ok = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.nama ?? user.username,
          nama: user.nama ?? "",
          username: user.username,
          role: user.role,
          anggotaId: user.anggota?.id,
        };
      },
    }),
  ],
});