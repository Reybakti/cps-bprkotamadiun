import { prisma } from "./src/lib/db";

async function main() {
  const users = await prisma.user.findMany({ select: { username: true, role: true, nama: true } });
  console.log("USERS:", JSON.stringify(users, null, 2));
  const accounts = await prisma.account.count();
  console.log("ACCOUNTS:", accounts);
}

main()
  .catch((e) => console.error("DBERR:", e))
  .finally(() => prisma.$disconnect());
