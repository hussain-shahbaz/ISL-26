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

  async getExamWithQuestions(id, user) {
      const exam = await examRepository.findByIdWithQuestions(id);
      if (!exam) throw new Error('Exam not found');

      if (user.role === 'teacher') {
        return exam;
      }

      if (user.role === 'student') {
        if (exam.status !== 'published') {
          throw new Error('Exam is not available');
        }
        if (new Date() < new Date(exam.scheduledTime)) {
          throw new Error('Exam has not started yet');
        }
        if (!exam.students.includes(user.rollNumber)) {
          throw new Error('You are not enrolled in this exam');
        }
      }

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

    if (['published', 'submitted', 'checked'].includes(exam.status)) {
      throw new Error('Published, submitted or checked exam cannot be updated');
    }

    if (data.status === 'published' && (!exam.students || exam.students.length === 0)) {
      throw new Error('Cannot publish exam without students');
    }

    delete data.instructorId
    delete data.status

    return await examRepository.updateById(id, data);
  }

  async updateStatus(id, newStatus) {
    const exam = await examRepository.findById(id);
    if (!exam) throw new Error('Exam not found');

    const lockedStatuses = ['submitted', 'checked'];

    if (['submitted', 'checked'].includes(newStatus) && exam.status !== 'published' && !['submitted', 'checked'].includes(exam.status)) {
      throw new Error('Exam must be published first');
    }

    if (lockedStatuses.includes(exam.status) && !lockedStatuses.includes(newStatus)) {
      throw new Error('Cannot move back from submitted or checked');
    }

    // checking before publishing
    if (newStatus === 'published') {
      if (!exam.subject || exam.subject.trim() === '') {
        throw new Error('Cannot publish exam without subject');
      }

      if (!exam.scheduledTime || new Date(exam.scheduledTime) <= new Date()) {
        throw new Error('Cannot publish exam — scheduled time has passed');
      }

      if (!exam.timeAllowed || !Number.isInteger(exam.timeAllowed) || exam.timeAllowed <= 0) {
        throw new Error('timeAllowed must be a positive integer');
      }

      if (!exam.totalMarks || !Number.isInteger(exam.totalMarks) || exam.totalMarks <= 0) {
        throw new Error('totalMarks must be a positive integer');
      }

      if (!exam.students || exam.students.length === 0) {
        throw new Error('Cannot publish exam without students');
      }

      const questions = await questionRepository.findByExamId(id);
      if (!questions || questions.length === 0) {
        throw new Error('Cannot publish exam without questions');
      }

      const totalAssignedMarks = questions.reduce((sum, q) => sum + q.marks, 0);
      if (totalAssignedMarks !== exam.totalMarks) {
        throw new Error(`Marks mismatch — exam totalMarks: ${exam.totalMarks}, questions marks: ${totalAssignedMarks}`);
      }
    }

    return await examRepository.updateById(id, { status: newStatus });
  }

  async deleteExam(id) {
    const exam = await examRepository.findById(id);
    if (!exam) throw new Error('Exam not found');

    if (['published', 'submitted', 'checked'].includes(exam.status)) {
      throw new Error('Published, submitted or checked exam cannot be updated');
    }

    await questionRepository.deleteByExamId(id);
    return await examRepository.deleteById(id);
  }
}

module.exports = new ExamService();