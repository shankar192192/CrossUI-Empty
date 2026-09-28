import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Recreates just the login accounts (and default lead sources) without
// touching any clients — safe to run anytime, e.g. after a
// `prisma migrate reset --skip-seed` wiped the User table but you don't
// want to bring back the 12 demo clients.
async function main() {
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const salesPasswordHash = await bcrypt.hash("sales123", 10);

  await prisma.user.upsert({
    where: { email: "admin@prepseven.com" },
    update: {},
    create: { name: "Shankar Mutneja", email: "admin@prepseven.com", passwordHash: adminPasswordHash, role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "sarah@prepseven.com" },
    update: {},
    create: { name: "Sarah Reyes", email: "sarah@prepseven.com", passwordHash: salesPasswordHash, role: "SALESPERSON" },
  });
  await prisma.user.upsert({
    where: { email: "raj@prepseven.com" },
    update: {},
    create: { name: "Raj Malhotra", email: "raj@prepseven.com", passwordHash: salesPasswordHash, role: "SALESPERSON" },
  });

  for (const name of ["SEO", "Google Ads", "ChatGPT Ads"]) {
    const existing = await prisma.leadSource.findFirst({ where: { name } });
    if (!existing) await prisma.leadSource.create({ data: { name } });
  }

  console.log("Accounts ready. Login with: admin@prepseven.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
