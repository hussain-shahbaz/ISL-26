const studentExamRepository = require('./student-exam-repository');
const SubmitExamValidator = require('./student-exam-validator');
const dataProvider = require('./data-provider');
const { emitSubmission } = require('./risk-provider');
const { triggerGrading, fetchExamResults } = require('./grade-provider');

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

    // Auto-grade once every enrolled student has submitted. Best-effort: the
    // teacher can also trigger grading manually from the proctor report.
    try {
      const roster = Array.isArray(exam.students) ? exam.students.length : 0;
      if (roster > 0) {
        const submitted = await studentExamRepository.countByExamId(examId);
        if (submitted >= roster) triggerGrading(examId);
      }
    } catch {
      /* never let auto-grade detection affect the submission result */
    }

    return saved;
  }

  async getAllExams(studentId) {
    const exams = await dataProvider.getStudentExams(studentId);
    if (!Array.isArray(exams)) return exams;

    // Annotate each exam with this student's submission state so the client can
    // correctly gate "Enter exam" (hide it once submitted) without leaking other
    // students' data. The exam's global status doesn't track per-student state.
    const submissions = await studentExamRepository.findByStudentId(studentId);
    const byExam = new Map(submissions.map((s) => [String(s.examId), s]));

    return exams.map((exam) => {
      const sub = byExam.get(String(exam._id));
      return {
        ...exam,
        submitted: Boolean(sub),
        submittedAt: sub ? sub.submittedAt : null,
      };
    });
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

  // A student's own result: their submission joined with the grading output (if the
  // exam has been graded). Plagiarism / integrity internals are intentionally
  // stripped — a student sees their score and feedback, never the cheating signals
  // (those are teacher/admin only). Returns null if they never submitted.
  async getMyResult(examId, studentId) {
    const submission = await studentExamRepository.findByExamIdAndStudentId(examId, studentId);
    if (!submission) return null;

    // Exam + questions (referenceAnswer already stripped by exam-service for
    // students). Optional: degrade gracefully if it can't be fetched.
    let exam = null;
    let questions = [];
    try {
      const data = await dataProvider.getExamForStudent(examId, studentId);
      exam = data.exam;
      questions = data.questions || [];
    } catch {
      /* show the result even if exam/question text can't be loaded */
    }

    const results = await fetchExamResults(examId);
    const mine = Array.isArray(results)
      ? results.find((r) => String(r.studentId) === String(studentId))
      : null;

    const result = mine
      ? {
          totalScore: mine.totalScore,
          totalMarks: mine.totalMarks,
          percentage: mine.percentage,
          gradedAt: mine.gradedAt,
          results: (mine.results || []).map((q) => ({
            questionId: q.questionId,
            score: q.score,
            maxMarks: q.maxMarks,
            isCorrect: q.isCorrect,
            feedback: q.feedback,
          })),
        }
      : null;

    return {
      examId,
      status: result ? 'graded' : submission.status,
      submittedAt: submission.submittedAt,
      answers: submission.answers,
      violations: submission.violations,
      violationCount: submission.violationCount,
      totalMarks: exam ? exam.totalMarks : result ? result.totalMarks : null,
      questions,
      result,
    };
  }

  _isWithinWindow(exam, at) {
    const start = new Date(exam.scheduledTime);
    const end = new Date(start.getTime() + exam.timeAllowed * 60 * 1000);
    return new Date(at) <= end;
  }
}

module.exports = new StudentExamService();
