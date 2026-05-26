const questionRepository = require('../repository/question_repository');
const examRepository     = require('../repository/exam_repository');
const ROLES = require('../config/roles');

class QuestionAuthMiddleware {

  async verifyQuestionOwner(req, res, next) {
    try {
      
      if (req.user.role !== ROLES.TEACHER) {
        return res.status(403).json({ status: 'error', message: 'Only teachers can access this' });
      }
      const instructorId = req.user.userId;

      // examId params mein hai (create/getAll)
      if (req.params.examId) {
        const exam = await examRepository.findById(req.params.examId);
        if (!exam) {
          return res.status(404).json({ status: 'error', message: 'Exam not found' });
        }
        if (exam.instructorId !== instructorId) {
          return res.status(403).json({ status: 'error', message: 'Not authorized' });
        }
        req.exam = exam;
        return next();
      }

      // questionId params mein hai (update/delete/getOne)
      if (req.params.id) {
        const question = await questionRepository.findById(req.params.id);
        if (!question) {
          return res.status(404).json({ status: 'error', message: 'Question not found' });
        }
        const exam = await examRepository.findById(question.examId);
        if (exam.instructorId !== instructorId) {
          return res.status(403).json({ status: 'error', message: 'Not authorized' });
        }
        req.exam     = exam;
        req.question = question;
        return next();
      }

    } catch (err) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }
}

module.exports = new QuestionAuthMiddleware();