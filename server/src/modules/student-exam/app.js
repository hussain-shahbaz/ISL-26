const express = require('express');
const studentExamRoutes = require('./student-exam-route');

class App {
    constructor() {
        this.app = express()
        this.app.use(express.json());
        // Identity is verified at the gateway and forwarded via x-user-* headers.
        this.app.use((req, res, next) => {
            req.user = {
                userId: req.headers['x-user-id'],
                role: req.headers['x-user-role'],
                sessionId: req.headers['x-session-id'],
                username: req.headers['x-username'],
            };
            next();
        });
        const health = (req, res) => res.status(200).json({
            module: 'student-exam-service', status: 'healthy', dependencies: ['mongodb'], version: '1.0.0',
        });
        this.app.get('/health', health);
        this.app.get('/api/v1/student-exam/health', health);
        this.app.use('/api/v1/student-exam', studentExamRoutes.getRouter());
    }

    start() {
        const port = process.env.STUDENT_EXAM_PORT || process.env.PORT || 3004;
        this.app.listen(port, () => {
            console.log(`student-exam-service listening on port ${port}`);
        });
    }
}

module.exports = new App();