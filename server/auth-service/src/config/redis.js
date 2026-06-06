import { createClient } from "redis";
const redisClient = createClient({
  url:  "redis://172.28.244.79:6379",
});
redisClient.on("error", (err) => console.error("Redis error:", err));
redisClient.on("connect", () => console.log("Redis connected"));
await redisClient.connect();
export default redisClient;
