const examRepository = require('../repository/exam_repository');
const questionRepository = require('../repository/question_repository');
const ROLES = require('../config/roles');

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

  async getWholeExamByExamId(examId, user) {
    const exam = await examRepository.findById(examId);
    if (!exam) throw new Error('Exam not found');

    if (user.role === ROLES.STUDENT) {
      if (exam.status !== 'published') {
        throw new Error('Exam is not available');
      }
      if (new Date() < new Date(exam.scheduledTime)) {
        throw new Error('Exam has not started yet');
      }
      if (!exam.students.includes(user.rollNumber)) {
        throw new Error('You are not allowed in this exam');
      }
    }else if(user.role === ROLES.TEACHER){
      if(user.userId !== exam.instructorId){
        throw new Error("Not authorized")
      }
    }
    const questions = await questionRepository.findByExamId(examId);
    // student ko referenceAnswer nahi dikhna
     if (user.role === ROLES.STUDENT) {
      return {
        exam: {
          _id:           exam._id,
          title:         exam.title,
          subject:       exam.subject,
          teacherName:   exam.teacherName,
          scheduledTime: exam.scheduledTime,
          timeAllowed:   exam.timeAllowed,
          totalMarks:    exam.totalMarks,
          status:        exam.status
        },
        questions: questions.map(q => {
          const { referenceAnswer, ...safe } = q.toObject();
          return safe;
        })
      };
    }
    else if(user.role === ROLES.TEACHER){
      return {
        exam:      exam,
        questions: questions
      };
    }
    else{
      throw new Error("Only teacher or students can access this")
    }
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