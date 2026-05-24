const express        = require('express');
const examController = require('../controllers/exam_controller');
const examAuthMiddleware = require('../middleware/exam_auth_middleware');

class ExamRoutes {
  constructor() {
    this.router = express.Router();
    this._bindRoutes();
  }

  _bindRoutes() {
    this.router.post('/',                             (req, res) => examController.createExam(req, res)); //body
    this.router.get('/',                              (req, res) => examController.getAllExams(req, res)); //params and query
    this.router.get('/student',                       (req, res) => examController.getExamsByStudent(req, res));
    
    this.router.patch('/:id',        examAuthMiddleware.verifyExamOwner.bind(examAuthMiddleware), (req, res) => examController.updateExam(req, res));
    this.router.patch('/:id/status', examAuthMiddleware.verifyExamOwner.bind(examAuthMiddleware), (req, res) => examController.updateStatus(req, res));
    this.router.delete('/:id',       examAuthMiddleware.verifyExamOwner.bind(examAuthMiddleware), (req, res) => examController.deleteExam(req, res));
  }

  getRouter() {
    return this.router;
  }
}

module.exports = new ExamRoutes();