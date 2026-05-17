const examRepository = require('../repository/exam_repository');
const questionRepository = require('../repository/question_repository');

class ExamService {

  async createExam(data) {
    const { questions, ...examData } = data;

    const exam = await examRepository.createExam(examData);

    if (questions && questions.length > 0) {
      await questionRepository.createMany(questions, exam._id);
    }

    return exam;
  }

  async getExamWithQuestions(id) {
    const exam = await examRepository.findByIdWithQuestions(id);
    if (!exam) throw new Error('Exam not found');
    return exam;
  }

  async getAllExams() {
    return await examRepository.findAll();
  }

  async getExamById(id) {
    const exam = await examRepository.findById(id);
    if (!exam) throw new Error('Exam not found');
    return exam;
  }

  async getExamsByTeacher(instructorId) {
    return await examRepository.findByTeacherId(instructorId);
  }

  async getExamsBySubject(subject) {
    return await examRepository.findBySubject(subject);
  }

  async getExamsByTeacherAndSubject(instructorId, subject) {
    return await examRepository.findByTeacherAndSubject(instructorId, subject);
  }

  async updateExam(id, data) {
    const exam = await examRepository.findById(id);
    if (!exam) throw new Error('Exam not found');

    if (exam.status === 'published') {
      throw new Error('Published exam cannot be updated');
    }

    return await examRepository.updateById(id, data);
  }

  async updateStatus(id, newStatus) {
    const exam = await examRepository.findById(id);
    if (!exam) throw new Error('Exam not found');
    return await examRepository.updateById(id, { status: newStatus });
  }

  async deleteExam(id) {
    const exam = await examRepository.findById(id);
    if (!exam) throw new Error('Exam not found');

    if (exam.status === 'published') {
      throw new Error('Published exam cannot be deleted');
    }

    await questionRepository.deleteByExamId(id);
    return await examRepository.deleteById(id);
  }
}

module.exports = new ExamService();