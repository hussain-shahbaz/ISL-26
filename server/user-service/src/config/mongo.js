import mongoose from "mongoose";
import config from "./config.js";

export async function connectMongo() {
  if (!config.MONGO_URI) {
    console.error(
      "MONGO_URI is not configured. Token blacklist checks require MongoDB."
    );
    process.exit(1);
  }

  try {
    await mongoose.connect(config.MONGO_URI, { connectTimeoutMS: 10000 });
    console.log("User service connected to MongoDB (blacklist)");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message || error);
    process.exit(1);
  }
}
