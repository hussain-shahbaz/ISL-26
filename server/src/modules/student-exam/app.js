const express = require('express');
const studentExamRoutes = require('./student-exam-route');

class App {
    constructor() {
        this.app = express()
        this.app.use(express.json());
        this.app.get('/health', (req, res) => res.status(200).json({ status: 'success', message: 'Student Exam service is healthy' }));
        this.app.get('/api/v1/student-exam/health', (req, res) => res.status(200).json({ status: 'success', message: 'Student Exam service is healthy' }));
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