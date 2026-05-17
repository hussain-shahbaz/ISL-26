/**
 * Prisma Database Client
 * Initializes and exports the Prisma client for database operations
 */

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
require('dotenv').config();
// import { PrismaClient } from "../prisma/generated/client";


const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
  errorFormat: "pretty",
  adapter
});


/**
 * Connect to database and handle disconnection
 */
async function connectDB() {
  try {
    await prisma.$connect();
    console.log("✓ Database connected successfully");
  } catch (error) {
    console.error("✗ Database connection failed:", error);
    process.exit(1);
  }
}

/**
 * Disconnect from database
 */
async function disconnectDB() {
  try {
    await prisma.$disconnect();
    console.log("✓ Database disconnected");
  } catch (error) {
    console.error("✗ Database disconnection failed:", error);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  await disconnectDB();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnectDB();
  process.exit(0);
});



module.exports = prisma;
module.exports.connectDB = connectDB;
module.exports.disconnectDB = disconnectDB;