const examRepository = require('../repository/exam_repository');

class ExamAuthMiddleware {

  async verifyExamOwner(req, res, next) {
    try {
      // jwt middleware ny pehly sy req.user set kr diya hoga
      const instructorId = req.user.userId;

      const exam = await examRepository.findById(req.params.id);
      if (!exam) {
        return res.status(404).json({ status: 'error', message: 'Exam not found' });
      }

      if (exam.instructorId !== instructorId) {
        return res.status(403).json({ status: 'error', message: 'Not authorized' });
      }

      req.exam = exam; // controller mein dobara DB call nahi karni
      next();

    } catch (err) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }
}

module.exports = new ExamAuthMiddleware();