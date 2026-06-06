/**
 * Mock data for the student-exam module.
 * Derived from backend seed.js and service layer sample data.
 * Used for standalone frontend testing without the backend.
 */

export const MOCK_STUDENT = {
  _id: '101',
  role: 'student',
  rollNumber: '12345',
  name: 'Ahmed Khan',
};

export const MOCK_EXAMS = [
  {
    _id: '401',
    instructorId: '101',
    instructorName: 'Dr. Sarah Ahmed',
    subject: 'Mathematics',
    scheduledTime: '2026-06-10T09:00:00.000Z',
    timeAllowed: 60,
    totalMarks: 15,
    status: 'published',
    questions: [
      {
        _id: 'q1',
        type: 'mcq',
        marks: 5,
        questionText: 'What is 2 + 2?',
        referenceAnswer: '4',
        options: ['1', '2', '3', '4'],
      },
      {
        _id: 'q2',
        type: 'text',
        marks: 5,
        questionText:
          'Explain the Pythagorean theorem and provide a real-world application.',
        referenceAnswer:
          'The Pythagorean theorem states that in a right triangle, a² + b² = c².',
      },
      {
        _id: 'q3',
        type: 'mcq',
        marks: 5,
        questionText: 'What is the derivative of x²?',
        referenceAnswer: '2x',
        options: ['x', '2x', 'x²', '2'],
      },
    ],
  },
  {
    _id: '101',
    instructorId: '102',
    instructorName: 'Prof. Ali Raza',
    subject: 'Physics',
    scheduledTime: '2026-06-08T10:00:00.000Z',
    timeAllowed: 90,
    totalMarks: 20,
    status: 'published',
    questions: [
      {
        _id: 'q1',
        type: 'mcq',
        marks: 5,
        questionText: 'What is Newton\'s first law of motion?',
        options: [
          'Force equals mass times acceleration',
          'An object at rest stays at rest unless acted upon',
          'For every action there is an equal and opposite reaction',
          'Energy cannot be created or destroyed',
        ],
      },
      {
        _id: 'q2',
        type: 'text',
        marks: 10,
        questionText:
          'Explain the theory of relativity and its significance in modern physics.',
      },
      {
        _id: 'q3',
        type: 'mcq',
        marks: 5,
        questionText: 'What is the SI unit of force?',
        options: ['Watt', 'Joule', 'Newton', 'Pascal'],
      },
    ],
  },
  {
    _id: '201',
    instructorId: '101',
    instructorName: 'Dr. Sarah Ahmed',
    subject: 'Linear Algebra',
    scheduledTime: '2026-05-24T12:17:00.000Z',
    timeAllowed: 60,
    totalMarks: 10,
    status: 'published',
  },
  {
    _id: '301',
    instructorId: '103',
    instructorName: 'Dr. Fatima Noor',
    subject: 'Data Structures',
    scheduledTime: '2026-05-20T08:00:00.000Z',
    timeAllowed: 120,
    totalMarks: 30,
    status: 'published',
  },
];

export const MOCK_SUBMISSIONS = [
  {
    _id: 'sub_001',
    examId: '201',
    studentId: '101',
    answers: [
      { questionId: 'q1', submittedAnswer: '4' },
      {
        questionId: 'q2',
        submittedAnswer:
          'This is a detailed explanation of the linear algebra concept.',
      },
    ],
    status: 'graded',
    submittedAt: '2026-05-24T13:10:00.000Z',
  },
  {
    _id: 'sub_002',
    examId: '301',
    studentId: '101',
    answers: [
      { questionId: 'q1', submittedAnswer: '4' },
      {
        questionId: 'q2',
        submittedAnswer:
          'Comprehensive explanation of linked lists and their time complexities.',
      },
      {
        questionId: 'q3',
        submittedAnswer:
          'A well-structured answer about binary search trees.',
      },
    ],
    status: 'pending_grading',
    submittedAt: '2026-05-20T09:55:00.000Z',
  },
];

/**
 * Helper: simulate network delay
 */
function delay(ms = 600) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock API handlers
 */
export const mockApi = {
  async getAllExams() {
    await delay();
    return { success: true, data: MOCK_EXAMS };
  },

  async getExamDetails(examId) {
    await delay();
    const exam = MOCK_EXAMS.find((e) => e._id === examId);
    if (!exam) throw new Error('Exam not found');
    return { success: true, data: exam };
  },

  async submitExam(examId, answers) {
    await delay(1000);
    const existing = MOCK_SUBMISSIONS.find(
      (s) => s.examId === examId && s.studentId === MOCK_STUDENT._id
    );
    if (existing) throw new Error('Exam has already been submitted by this student');

    const submission = {
      _id: `sub_${Date.now()}`,
      examId,
      studentId: MOCK_STUDENT._id,
      answers: answers.map((a) => ({
        questionId: a.question.questionId,
        submittedAnswer: a.submittedAnswer,
      })),
      status: 'pending_grading',
      submittedAt: new Date().toISOString(),
    };
    MOCK_SUBMISSIONS.push(submission);
    return { success: true, data: submission };
  },

  async getSubmissionResult(examId, studentId) {
    await delay();
    const submission = MOCK_SUBMISSIONS.find(
      (s) => s.examId === examId && s.studentId === (studentId || MOCK_STUDENT._id)
    );
    if (!submission) return { success: true, data: null };
    return { success: true, data: submission };
  },
};
