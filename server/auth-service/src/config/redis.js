import { createClient } from "redis";
import config from "./config.js";
const redisClient = createClient({
<<<<<<< HEAD
  url: config.REDIS_URL,
=======
  url:  "redis://172.28.244.79:6379",
>>>>>>> f1b8ac1980ddb18175483e9feac06d7ce1da373f
});
redisClient.on("error", (err) => console.error("Redis error:", err));
export const connectRedis = async () => {
  await redisClient.connect();
  console.log("Redis connected");
};
export default redisClient;
