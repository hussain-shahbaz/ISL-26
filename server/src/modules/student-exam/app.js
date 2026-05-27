const express = require('express');
const studentExamRoutes = require('./student-exam-route');

class App {
    constructor() {
        this.app = express()
        this.app.use(express.json());
        this.app.use('/api/v1/student-exam', studentExamRoutes.getRouter());
    }

    start() {
        this.app.listen(process.env.PORT, () => {
                console.log(`Student Exam Service is running on port ${process.env.PORT}`);     
            }
        )
    }
}

module.exports = new App();