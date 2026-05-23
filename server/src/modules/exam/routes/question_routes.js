const express            = require('express');
const questionController = require('../controllers/question_controller');
const questionAuthMiddleware = require('../middleware/question_auth_middleware');

class QuestionRoutes {
  constructor() {
    this.router = express.Router();
    this._bindRoutes();
  }

  _bindRoutes() {
    const questionAuthMiddleware = require('../middleware/question_auth_middleware');
  }

_bindRoutes() {
  this.router.post('/:examId',     questionAuthMiddleware.verifyQuestionOwner.bind(questionAuthMiddleware), (req, res) => questionController.createQuestion(req, res));
  this.router.get('/question/:examId',       (req, res) => questionController.getQuestionsByExam(req, res));
  // this.router.get('/detail/:id',   questionAuthMiddleware.verifyQuestionOwner.bind(questionAuthMiddleware), (req, res) => questionController.getQuestionById(req, res));
  this.router.patch('/question/:id',        questionAuthMiddleware.verifyQuestionOwner.bind(questionAuthMiddleware), (req, res) => questionController.updateQuestion(req, res));
  this.router.delete('/question/:id',       questionAuthMiddleware.verifyQuestionOwner.bind(questionAuthMiddleware), (req, res) => questionController.deleteQuestion(req, res));
}
  
  getRouter() {
    return this.router;
  }
}

module.exports = new QuestionRoutes();