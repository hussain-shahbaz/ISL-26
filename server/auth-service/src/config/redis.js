import { createClient } from "redis";
import config from "./config.js";
const redisClient = createClient({
  url:  "redis://172.28.244.79:6379",
});
redisClient.on("error", (err) => console.error("Redis error:", err));
export const connectRedis = async () => {
  await redisClient.connect();
  console.log("Redis connected");
};
export default redisClient;
