import { createClient } from "redis";
import config from "./config.js";

const redisClient = createClient({
  url: config.redisURL,
});

redisClient.on("error", (err) => console.error("Redis error:", err));

export const connectRedis = async () => {
  if (redisClient.isOpen) return redisClient;
  await redisClient.connect();
  console.log("Redis connected");
  return redisClient;
};

export default redisClient;
