import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

function buildPool(): Pool {
  if (globalForPrisma.pool) return globalForPrisma.pool;
  const connectionString =
    process.env.DATABASE_URL ?? "postgresql://localhost:5432/postgres";
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
  if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;
  return pool;
}

function buildClient(): PrismaClient {
  const adapter = new PrismaPg(buildPool());
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;