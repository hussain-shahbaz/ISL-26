const express            = require('express');
const questionController = require('../controllers/question_controller');

class QuestionRoutes {
  constructor() {
    this.router = express.Router();
    this._bindRoutes();
  }

  _bindRoutes() {
    this.router.post('/:examId/questions',      (req, res) => questionController.createQuestion(req, res));
    this.router.get('/:examId/questions',       (req, res) => questionController.getQuestionsByExam(req, res));
    this.router.get('/questions/:id',           (req, res) => questionController.getQuestionById(req, res));
    this.router.patch('/questions/:id',           (req, res) => questionController.updateQuestion(req, res));
    this.router.delete('/questions/:id',        (req, res) => questionController.deleteQuestion(req, res));
  }

  getRouter() {
    return this.router;
  }
}

module.exports = new QuestionRoutes();