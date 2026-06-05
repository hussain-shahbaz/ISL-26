const mongoose = require('mongoose');

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/exam');
    console.log('MongoDB connected');
  } catch (err) {
    console.log('MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

module.exports = { connect };