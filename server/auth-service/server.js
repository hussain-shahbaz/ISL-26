import app from "./src/app.js";
import connectDB from "./src/config/database.js";
import config from "./src/config/config.js";
import { connectRedis } from "./src/config/redis.js";
await connectRedis();
await connectDB();
const port = config.PORT || 5000;
app.listen(port, () => {
  console.log(`Auth service is running on port ${port}`);
});
