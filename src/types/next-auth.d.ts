import type { DefaultSession } from "next-auth";
import "next-auth/jwt";
import type { Role } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    username?: string;
    nama?: string;
    role: Role;
    anggotaId?: string;
  }

  interface Session {
    user: {
      id: string;
      username: string;
      nama?: string;
      role: Role;
      anggotaId?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string;
    nama?: string;
    role?: Role;
    anggotaId?: string;
  }
}