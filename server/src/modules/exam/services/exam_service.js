const examRepository = require('../repository/exam_repository');
const questionRepository = require('../repository/question_repository');
<<<<<<< HEAD
=======
const studentExamRepository = require('../repository/student_exam_repository');
>>>>>>> exam-module

class ExamService {

  async createExam(data) {
    const { questions, ...examData } = data;

    const exam = await examRepository.createExam(examData);

    if (questions && questions.length > 0) {
      await questionRepository.createMany(questions, exam._id);
    }

    return exam;
  }

<<<<<<< HEAD
  async getExamWithQuestions(id) {
    const exam = await examRepository.findByIdWithQuestions(id);
    if (!exam) throw new Error('Exam not found');
    return exam;
=======
  async getExamsByStudent(rollNumber) {
    const studentExams = await studentExamRepository.findByRollNumber(rollNumber);
    if (!studentExams) return [];

    const exams = await examRepository.findByIds(studentExams.examIds);
    return exams;
>>>>>>> exam-module
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

<<<<<<< HEAD
    if (exam.status === 'published') {
      throw new Error('Published exam cannot be updated');
=======
    if (['published', 'submitted', 'checked'].includes(exam.status)) {
      throw new Error('Published, submitted or checked exam cannot be updated');
    }

    if (data.status === 'published' && (!exam.students || exam.students.length === 0)) {
      throw new Error('Cannot publish exam without students');
    }

    delete data.instructorId
    delete data.status

    if (data.students) {
      const removed = exam.students.filter(r => !data.students.includes(r));
      const added   = data.students.filter(r => !exam.students.includes(r));

      for (const rollNumber of removed) {
        await studentExamRepository.removeExamFromStudent(rollNumber, id);
      }
      for (const rollNumber of added) {
        await studentExamRepository.addExamToStudent(rollNumber, id);
      }
>>>>>>> exam-module
    }

    return await examRepository.updateById(id, data);
  }

  async updateStatus(id, newStatus) {
    const exam = await examRepository.findById(id);
    if (!exam) throw new Error('Exam not found');
<<<<<<< HEAD
    return await examRepository.updateById(id, { status: newStatus });
=======

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

    // agar published exam ko hata rhy hony tou kya hoga

    if (exam.status === 'published' && newStatus !== 'published') {
      for (const rollNumber of exam.students) {
        await studentExamRepository.removeExamFromStudent(rollNumber, id);
      }
    }

    const updated = await examRepository.updateById(id, { status: newStatus });

  // publish hone ke baad mapping banao
    if (newStatus === 'published') {
      for (const rollNumber of exam.students) {
        await studentExamRepository.addExamToStudent(rollNumber, id);
      }
    }

    return updated;

>>>>>>> exam-module
  }

  async deleteExam(id) {
    const exam = await examRepository.findById(id);
    if (!exam) throw new Error('Exam not found');

<<<<<<< HEAD
    if (exam.status === 'published') {
      throw new Error('Published exam cannot be deleted');
=======
    if (['published', 'submitted', 'checked'].includes(exam.status)) {
      throw new Error('Published, submitted or checked exam cannot be updated');
    }

    for (const rollNumber of exam.students) {
      await studentExamRepository.removeExamFromStudent(rollNumber, id);
>>>>>>> exam-module
    }

    await questionRepository.deleteByExamId(id);
    return await examRepository.deleteById(id);
  }
}

module.exports = new ExamService();