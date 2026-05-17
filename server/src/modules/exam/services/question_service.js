const examRepository = require('../repository/exam_repository');
const questionRepository = require('../repository/question_repository');

class QuestionService {

  async createQuestion(examId, data) {
    const exam = await examRepository.findById(examId);
    if (!exam) throw new Error('Exam not found');

    if (exam.status === 'published') {
      throw new Error('Cannot add question to a published exam');
    }

    return await questionRepository.createQuestion({ ...data, examId });
  }

  async getQuestionsByExam(examId) {
    const exam = await examRepository.findById(examId);
    if (!exam) throw new Error('Exam not found');

    return await questionRepository.findByExamId(examId);
  }

  async getQuestionById(id) {
    const question = await questionRepository.findById(id);
    if (!question) throw new Error('Question not found');
    return question;
  }

  async updateQuestion(id, data) {
    const question = await questionRepository.findById(id);
    if (!question) throw new Error('Question not found');

    const exam = await examRepository.findById(question.examId);
    if (exam.status === 'published') {
      throw new Error('Cannot update question of a published exam');
    }

    delete data.examId;

    return await questionRepository.updateById(id, data);
  }

  async deleteQuestion(id) {
    const question = await questionRepository.findById(id);
    if (!question) throw new Error('Question not found');

    const exam = await examRepository.findById(question.examId);
    if (exam.status === 'published') {
      throw new Error('Cannot delete question of a published exam');
    }

    return await questionRepository.deleteById(id);
  }
}

module.exports = new QuestionService();