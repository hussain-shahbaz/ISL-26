import mongoose from "mongoose";
import config from "./config.js";
let mongoReady = false;
export function isMongoReady() {
  return mongoReady;
}

export async function connectMongo() {
  if (!config.MONGO_URI) {
    console.warn(
      "MONGO_URI is not set. Token blacklist checks are disabled until MongoDB is configured."
    );
    return;
  }
  try {
    await mongoose.connect(config.MONGO_URI, { connectTimeoutMS: 10000 });
    mongoReady = true;
    console.log("User service connected to MongoDB (blacklist)");
  } catch (error) {
    mongoReady = false;
    console.error("MongoDB connection failed:", error.message || error);
    console.warn(
      "User service will start without blacklist support. Start MongoDB, then restart this service."
    );
    console.warn(
      'Windows: run "net start MongoDB" in an Administrator terminal.'
    );
  }
}
