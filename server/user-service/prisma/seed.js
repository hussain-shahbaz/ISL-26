import { PrismaClient } from "@prisma/client";
import { v4 as uuid } from "uuid";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // check if admin already exists
  const existingAdmin = await prisma.userProfile.findFirst({
    where: {
      role: "ADMIN",
      university: "UET",
    },
  });

  if (existingAdmin) {
    console.log("✅ Admin already exists, skipping seed.");
    return;
  }

  // create admin profile
  const admin = await prisma.userProfile.create({
    data: {
      id: uuid(),
      name: "Super Admin",
      email: "admin@uet.edu.pk",
      role: "ADMIN",
      university: "UET",
      isProfileComplete: true,
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
      approvedBy: null, // first admin, no one approved
    },
  });

  console.log(`✅ Admin created: ${admin.email} | id: ${admin.id}`);
  console.log("🌱 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });