const express = require('express');
const StudentExamController = require('./student-exam-controller');
const serviceAuth = require('./service_auth_middleware');

class StudentExamRoutes {
    constructor() {
        this.router = express.Router();
        this._bindRoutes();
    }

    _bindRoutes() {
        this.router.use(serviceAuth.verify.bind(serviceAuth));
        
        this.router.post('/submit/:examId', StudentExamController.submitExam);
        this.router.get('/', StudentExamController.getAllExams);
        // this.router.get('/:id', StudentExamController.getExamDetails);
        // A student's own graded result (score + feedback, no integrity internals).
        this.router.get('/my-result/:examId', StudentExamController.getMyResult);
        this.router.get('/result/:examId', StudentExamController.getSubmissionByExamIdAndStudentId);
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new StudentExamRoutes();