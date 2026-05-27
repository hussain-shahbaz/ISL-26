const express = require('express');
const StudentExamController = require('./student-exam-controller');

class StudentExamRoutes {
    constructor() {
        this.router = express.Router();
        this._bindRoutes();
    }

    _bindRoutes() {
        this.router.post('/submit/:examId', StudentExamController.submitExam);
        this.router.get('/', StudentExamController.getAllExams);
        this.router.get('/:id', StudentExamController.getExamDetails);
    }

    getRouter() {
        return this.router;
    }
}

module.exports = new StudentExamRoutes();