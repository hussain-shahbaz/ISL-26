import mongoose from "mongoose";
import config from "./config.js";
async function connectDB() {
  const mongoUri = config.mongoURI;
  if (!mongoUri) {
    console.error(
      "MongoDB URI is not configured. Make sure MONGO_URI is set in .env."
    );
    process.exit(1);
  }
  console.log("Connecting to MongoDB:", mongoUri);
  try {
    await mongoose.connect(mongoUri, {
      connectTimeoutMS: 10000,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message || error);
    process.exit(1);
  }
}
export default connectDB;
