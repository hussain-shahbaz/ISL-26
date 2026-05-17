const { connect } = require('./db');
const app = require('./app');
require('dotenv').config();
// const prisma         = require('./db');
const { connectDB } = require('./db');

const start = async () => {

  await connectDB();
  app.start();
};

start();