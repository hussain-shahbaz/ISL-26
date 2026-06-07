const studentExamRepository = require('./student-exam-repository');
const SubmitExamValidator = require('./student-exam-validator');
const dataProvider = require('./data-provider');
const { emitSubmission } = require('./risk-provider');

class StudentExamService {
  // The exam-service enforces published/started/enrolled rules for students.
  // student-exam additionally enforces the closing time and the
  // one-submission-per-student rule, and persists submissions.

  async submitExam(submissionData) {
    const { studentId, examId, answers } = submissionData;

    const { exam, questions } = await dataProvider.getExamForStudent(examId, studentId);

    if (!this._isWithinWindow(exam, submissionData.submittedAt)) {
      throw new Error('Exam has ended');
    }

    const validateQuestions = SubmitExamValidator.validateQuestions(answers, questions);
    if (!validateQuestions.isValid) {
      throw new Error(`Validation failed: ${validateQuestions.errors.join(', ')}`);
    }

    const existingSubmission = await studentExamRepository.findByExamIdAndStudentId(examId, studentId);
    if (existingSubmission) {
      throw new Error('Exam has already been submitted by this student');
    }

    const saved = await studentExamRepository.createSubmission(submissionData);
    emitSubmission(studentId, examId); // link into the risk graph (best-effort)
    return saved;
  }

  async getAllExams(studentId) {
    return await dataProvider.getStudentExams(studentId);
  }

  async getExamDetails(examId, studentId, currentTime) {
    const { exam, questions } = await dataProvider.getExamForStudent(examId, studentId);
    if (!this._isWithinWindow(exam, currentTime)) {
      throw new Error('Exam has ended');
    }
    return { ...exam, questions };
  }

  getSubmissionByExamIdAndStudentId(examId, studentId) {
    if (studentId) {
      return studentExamRepository.findByExamIdAndStudentId(examId, studentId);
    }
    return studentExamRepository.findAllByExamId(examId);
  }

  _isWithinWindow(exam, at) {
    const start = new Date(exam.scheduledTime);
    const end = new Date(start.getTime() + exam.timeAllowed * 60 * 1000);
    return new Date(at) <= end;
  }
}

module.exports = new StudentExamService();
