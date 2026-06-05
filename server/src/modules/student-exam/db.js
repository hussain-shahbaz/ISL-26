const mongoose = require('mongoose');

const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/student_exam');
        console.log('Connected to MongoDB');
    }
    catch (err) {
        console.error('Error connecting to MongoDB', err);
        process.exit(1);
    }
}

module.exports = {
    connect
}