import "dotenv/config";
import app from "./src/app.js";
import config from "./src/config/config.js";
import { connectMongo } from "./src/config/mongo.js";
const PORT = config.PORT;
await connectMongo();

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
