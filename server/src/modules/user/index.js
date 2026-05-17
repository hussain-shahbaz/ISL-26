// /**
//  * User Module Index
//  * Exports all user module components
//  */

// const UserModule = require("./user-module");
// const UserController = require("./user-controller");
// const UserService = require("./user-service");
// const UserRepository = require("./user-repository");
// const UserValidator = require("./user-validator");
// const UserModel = require("./user-model");
// const UserRoutes = require("./user-route");
// const prisma = require("./db");
// const connectDB = require("./db");
// const disconnectDB = require("./db");

// const express = require("express");
// const cors = require("cors");


// const app = express();
// const PORT = process.env.PORT || 6000;
// app.use(express.json())
// app.use(cors({
//   origin: 'http://localhost:5173', // Must match your React dev URL exactly
//   credentials: true,               // Allows the frontend to send/receive cookies
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

// connectDB()
// .then( () => {
//     app.listen(PORT, () => {
//     console.log(`User module server running on port ${PORT}`);
//     });
// } )
// .catch( (error) => {
//     console.error("Failed to connect to database:", error);
//     process.exit(1);
// });


// module.exports = {
//   UserModule,
//   UserController,
//   UserService,
//   UserRepository,
//   UserValidator,
//   UserModel,
//   UserRoutes,
//   prisma
// };