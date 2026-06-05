import app from "./src/app.js";
import { connectMongo } from "./src/config/mongo.js";

const PORT = 3001;

await connectMongo();

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
