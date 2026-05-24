require('dotenv').config();
const { connect } = require('./db');
const app = require('./app');

const start = async () => {
  await connect();
  app.start();
};

start();