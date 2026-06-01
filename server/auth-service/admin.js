import { hashValue } from "./src/utils/hash.js";
const hash = await hashValue("Admin@123");
console.log(hash);