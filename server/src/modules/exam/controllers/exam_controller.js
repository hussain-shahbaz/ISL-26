const examService   = require('../services/exam_service');
const examValidator = require('../validators/exam_validator');

class ExamController {

  async createExam(req, res) {

    if (req.user.role !== 'teacher') {
      return res.status(403).json({ status: 'error', message: 'Only teachers can create exams' });
    }

    const { isValid, errors } = examValidator.validateCreate(req.body);
    if (!isValid) return res.status(400).json({ status: 'error', errors });

    const { isValid: marksValid, errors: marksErrors } = examValidator.validateTotalMarks(
      req.body.totalMarks,
      req.body.questions || []
    );
    if (!marksValid) return res.status(400).json({ status: 'error', errors: marksErrors });

    try {
      const exam = await examService.createExam(req.body);
      res.status(201).json({ status: 'success', data: exam });
    } catch (err) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  async getAllExams(req, res) {
    try {
  
      const { subject } = req.query;
      const instructorId = req.user.userId

      let exams;
      if (instructorId && subject) {
        exams = await examService.getExamsByTeacherAndSubject(instructorId, subject);
      } else if (instructorId) {
        exams = await examService.getExamsByTeacher(instructorId);
      } 

      res.status(200).json({ status: 'success', data: exams });
    } catch (err) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  async getExamById(req, res) {
    const { isValid, errors } = examValidator.validateExamId(req.params.id);
    if (!isValid) return res.status(400).json({ status: 'error', errors });

    try {
      const exam = await examService.getExamWithQuestions(req.params.id, req.user);
      res.status(200).json({ status: 'success', data: exam });
    } catch (err) {
      res.status(404).json({ status: 'error', message: err.message });
    }
  }

  async updateExam(req, res) {
    const { isValid: idValid, errors: idErrors } = examValidator.validateExamId(req.params.id);
    if (!idValid) return res.status(400).json({ status: 'error', errors: idErrors });

    const { isValid, errors } = examValidator.validateUpdate(req.body);
    if (!isValid) return res.status(400).json({ status: 'error', errors });

    try {
      const exam = await examService.updateExam(req.params.id, req.body);
      res.status(200).json({ status: 'success', data: exam });
    } catch (err) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  async updateStatus(req, res) {
    const { isValid: idValid, errors: idErrors } = examValidator.validateExamId(req.params.id);
    if (!idValid) return res.status(400).json({ status: 'error', errors: idErrors });

    const { isValid, errors } = examValidator.validateStatus(req.body);
    if (!isValid) return res.status(400).json({ status: 'error', errors });

    try {
      const exam = await examService.updateStatus(req.params.id, req.body.status);
      res.status(200).json({ status: 'success', data: exam });
    } catch (err) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  async deleteExam(req, res) {
    const { isValid, errors } = examValidator.validateExamId(req.params.id);
    if (!isValid) return res.status(400).json({ status: 'error', errors });

    try {
      await examService.deleteExam(req.params.id);
      res.status(200).json({ status: 'success', message: 'Exam deleted successfully' });
    } catch (err) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }
}

module.exports = new ExamController();