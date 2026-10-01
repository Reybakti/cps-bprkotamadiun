import type { NextAuthConfig } from "next-auth";
import { resolveRouteAccess, roleAllowed } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/enums";

/**
 * Shared NextAuth v5 config (edge-safe: TANPA impor database).
 * Dipakai oleh route handler di src/auth.ts dan middleware.
 */
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [], // provider Credentials lengkap diracik di src/auth.ts
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.username = (user as { username?: string }).username;
        token.role = (user as { role: Role }).role;
        token.anggotaId = (user as { anggotaId?: string }).anggotaId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
        session.user.role = token.role as Role;
        session.user.anggotaId = token.anggotaId as string | undefined;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const access = resolveRouteAccess(pathname);
      return roleAllowed(access, auth?.user?.role);
    },
  },
} satisfies NextAuthConfig;