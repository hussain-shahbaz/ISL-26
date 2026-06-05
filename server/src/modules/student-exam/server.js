const { connect } = require('./db');
const app = require('./app');
require('dotenv').config();

const start = async () => {
    await connect();
    app.start();    
}

start();