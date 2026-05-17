const express        = require('express');
const examController = require('../controllers/exam_controller');

class ExamRoutes {
  constructor() {
    this.router = express.Router();
    this._bindRoutes();
  }

  _bindRoutes() {
    this.router.post('/',                (req, res) => examController.createExam(req, res));
    this.router.get('/',                 (req, res) => examController.getAllExams(req, res));
    this.router.get('/:id',              (req, res) => examController.getExamById(req, res));
    this.router.patch('/:id',            (req, res) => examController.updateExam(req, res));
    this.router.patch('/:id/status',     (req, res) => examController.updateStatus(req, res));
    this.router.delete('/:id',           (req, res) => examController.deleteExam(req, res));
  }

  getRouter() {
    return this.router;
  }
}

module.exports = new ExamRoutes();