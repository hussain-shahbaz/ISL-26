const examRepository = require('../repository/exam_repository');
const questionRepository = require('../repository/question_repository');

class QuestionService {

  async createQuestion(examId, data) {
    const exam = await examRepository.findById(examId);
    if (!exam) throw new Error('Exam not found');

    if (['published', 'submitted', 'checked'].includes(exam.status)) {
      throw new Error('Cannot add question to a published, submitted or checked exam');
    }

    const result = await questionRepository.createQuestion({ ...data, examId });

    await examRepository.updateById(examId, { 
      totalMarks: exam.totalMarks + data.marks 
    });

    return result;
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
    if (['published', 'submitted', 'checked'].includes(exam.status)) {
      throw new Error('Cannot update question of a published, submitted or checked exam');
    }

    delete data.examId;

    const result = await questionRepository.updateById(id, data);
    if (data.marks !== undefined) {
      const difference = data.marks - question.marks;
      await examRepository.updateById(question.examId, { 
        totalMarks: exam.totalMarks + difference 
      });
    }

    return result;
  }

  async deleteQuestion(id) {
    const question = await questionRepository.findById(id);
    if (!question) throw new Error('Question not found');

    const exam = await examRepository.findById(question.examId);
    if (['published', 'submitted', 'checked'].includes(exam.status)) {
      throw new Error('Cannot delete question of a published, submitted or checked exam');
    }

    const result = await questionRepository.deleteById(id);

    await examRepository.updateById(question.examId, { 
      totalMarks: exam.totalMarks - question.marks 
    });

    return result;
  }

}

module.exports = new QuestionService();