const express = require('express');
const cors = require('cors');
const studentExamRoutes = require('./student-exam-route');

class App {
    constructor() {
        this.app = express()
        this.app.use(express.json());
        const whitelist = process.env.ALLOWED_ORIGINS
            ? process.env.ALLOWED_ORIGINS.split(',')
            : ['http://localhost:5173'];
        const corsOptions = {
            origin: function (origin, callback) {
                if (!origin || whitelist.includes(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Blocked by CORS: Origin not whitelisted in .env'));
                }
            },
            credentials: true,
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE'
        };
        this.app.use(cors(corsOptions));
        // remove this when you get token from API 
        this.app.use((req, res, next) => {
            req.user = { userId: '101', role: 'student' };
            next();
        });
        this.app.use('/api/v1/student-exam', studentExamRoutes.getRouter());
    }

    start() {
        this.app.listen(process.env.PORT || 3005, () => {
            console.log(`Student Exam Service is running on port ${process.env.PORT || 3005}`);
        }
        )
    }
}

module.exports = new App();