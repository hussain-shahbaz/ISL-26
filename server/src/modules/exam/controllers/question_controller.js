const questionService   = require('../services/question_service');
const questionValidator = require('../validators/question_validator');

class QuestionController {

  async createQuestion(req, res) {
    const { isValid: examIdValid, errors: examIdErrors } = questionValidator.validateExamId(req.params.examId);
    if (!examIdValid) return res.status(400).json({ status: 'error', errors: examIdErrors });

    const { isValid, errors } = questionValidator.validateCreate(req.body);
    if (!isValid) return res.status(400).json({ status: 'error', errors });

    try {
      const question = await questionService.createQuestion(req.params.examId, req.body);
      res.status(201).json({ status: 'success', data: question });
    } catch (err) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  async getQuestionsByExam(req, res) {
    const { isValid, errors } = questionValidator.validateExamId(req.params.examId);
    if (!isValid) return res.status(400).json({ status: 'error', errors });

    try {
      const questions = await questionService.getQuestionsByExam(req.params.examId, req.user);
      res.status(200).json({ status: 'success', data: questions });
    } catch (err) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  async getQuestionById(req, res) {
    const { isValid, errors } = questionValidator.validateQuestionId(req.params.id);
    if (!isValid) return res.status(400).json({ status: 'error', errors });

    try {
      const question = await questionService.getQuestionById(req.params.id);
      res.status(200).json({ status: 'success', data: question });
    } catch (err) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  }

  async updateQuestion(req, res) {
    const { isValid: idValid, errors: idErrors } = questionValidator.validateQuestionId(req.params.id);
    if (!idValid) return res.status(400).json({ status: 'error', errors: idErrors });

    const { isValid, errors } = questionValidator.validateUpdate(req.body);
    if (!isValid) return res.status(400).json({ status: 'error', errors });

    try {
      const question = await questionService.updateQuestion(req.params.id, req.body);
      res.status(200).json({ status: 'success', data: question });
    } catch (err) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  async deleteQuestion(req, res) {
    const { isValid, errors } = questionValidator.validateQuestionId(req.params.id);
    if (!isValid) return res.status(400).json({ status: 'error', errors });

    try {
      await questionService.deleteQuestion(req.params.id);
      res.status(200).json({ status: 'success', message: 'Question deleted successfully' });
    } catch (err) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }
}

module.exports = new QuestionController();