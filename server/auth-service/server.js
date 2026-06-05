import app from "./src/app.js";
import connectDB from "./src/config/database.js";
import config from "./src/config/config.js";
connectDB();
const port = config.PORT || 3000;
app.listen(port, () => {
  console.log(`Auth service is running on port ${port}`);
});
