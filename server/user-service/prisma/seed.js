// Admin seed — creates a working, login-capable admin across BOTH stores:
//   1. the auth identity in MongoDB  (email + bcrypt password + role "admin")
//   2. the user profile in PostgreSQL (role ADMIN, pre-approved)
// linked by a SHARED userId (auth.userId === profile.id), which is what the
// JWT's x-user-id resolves to downstream. Idempotent: re-running resets the
// password and reconciles/links the two records.
//
// Credentials are env-driven (override at deploy time):
//   ADMIN_EMAIL (default admin@uet.edu.pk), ADMIN_PASSWORD (default Admin@12345),
//   ADMIN_NAME, ADMIN_UNIVERSITY.
//
// Run (Docker):  docker compose exec user-service node prisma/seed.js
// Run (local):   ADMIN_PASSWORD=... node prisma/seed.js   (from server/user-service)

import { PrismaClient } from "@prisma/client";
import { v4 as uuid } from "uuid";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@uet.edu.pk").toLowerCase();
const ADMIN_NAME = process.env.ADMIN_NAME || "Super Admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@12345";
const ADMIN_UNIVERSITY = process.env.ADMIN_UNIVERSITY || "UET";
const MONGO_URI =
  process.env.MONGODB_URI || process.env.AUTH_MONGO_URI || "mongodb://localhost:27017/auth";

// Minimal schema matching auth-service's AuthIdentity (collection: authidentities).
const authIdentitySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["student", "instructor", "admin"], required: true },
    isEmailVerified: { type: Boolean, default: false, index: true },
    isBlocked: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);
const AuthIdentity =
  mongoose.models.AuthIdentity || mongoose.model("AuthIdentity", authIdentitySchema);

async function main() {
  console.log("🌱 Seeding admin...");
  if (!process.env.ADMIN_PASSWORD) {
    console.warn(
      '⚠️  ADMIN_PASSWORD not set — using default "Admin@12345". ' +
        "Set ADMIN_PASSWORD and re-run to change it."
    );
  }

  await mongoose.connect(MONGO_URI);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // 1) Auth identity in Mongo is the source of truth for the shared userId.
  let identity = await AuthIdentity.findOne({ email: ADMIN_EMAIL });
  let userId;
  if (identity) {
    userId = identity.userId;
    identity.passwordHash = passwordHash;
    identity.role = "admin";
    identity.isEmailVerified = true;
    identity.isBlocked = false;
    await identity.save();
    console.log(`↻ Updated admin auth identity (userId=${userId}); password reset.`);
  } else {
    userId = uuid();
    await AuthIdentity.create({
      userId,
      email: ADMIN_EMAIL,
      passwordHash,
      role: "admin",
      isEmailVerified: true,
    });
    console.log(`✅ Created admin auth identity (userId=${userId}).`);
  }

  // 2) Postgres profile must share the SAME id as the auth userId.
  const existingProfile = await prisma.userProfile.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existingProfile && existingProfile.id !== userId) {
    // Unlinked profile (e.g. from an older random-id seed) — recreate it linked.
    await prisma.userProfile.delete({ where: { email: ADMIN_EMAIL } });
    console.log(`↻ Removed unlinked admin profile (old id=${existingProfile.id}).`);
  }

  await prisma.userProfile.upsert({
    where: { id: userId },
    update: { role: "ADMIN", approvalStatus: "APPROVED", isProfileComplete: true },
    create: {
      id: userId,
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      role: "ADMIN",
      university: ADMIN_UNIVERSITY,
      isProfileComplete: true,
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
      approvedBy: null,
    },
  });

  console.log("🌱 Seeding complete!");
  console.log(`   Admin email : ${ADMIN_EMAIL}`);
  console.log("   Log in with that email and your ADMIN_PASSWORD.");
}

main()
  .catch((e) => {
    console.error("❌ Admin seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await mongoose.disconnect();
  });
