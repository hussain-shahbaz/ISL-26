/**
 * seed.js – Seeding script for two microservices
 * 
 * Exam Service DB (examdb): Exam, Question, StudentExam
 * Submission Service DB (submissiondb): SubmittedExam
 * 
 * Maintains cross‑referential integrity without altering any schema.
 * Run with: node seed.js
 */

const mongoose = require('mongoose');

// ===============================
// 1. DATABASE CONNECTIONS (adjust URIs as needed)
// ===============================
const EXAM_DB_URI = 'mongodb://localhost:27017/exam';
const SUBMISSION_DB_URI = 'mongodb://localhost:27017/submission';

const examDbConnection = mongoose.createConnection(EXAM_DB_URI);
const submissionDbConnection = mongoose.createConnection(SUBMISSION_DB_URI);

// ===============================
// 2. MODELS – EXACTLY AS PROVIDED (no changes)
// ===============================
// ----- Exam Service models (question_model.js, exam_model.js, student_exam_model.js) -----
const examSchema = new mongoose.Schema(
  {
    instructorId:  { type: String, required: true },
    title:          { type: String, required: true, trim: true },
    teacherName:    { type: String, required: true, trim: true },
    subject:       { type: String, required: true },
    scheduledTime: { type: Date,   required: true },
    timeAllowed:   { type: Number, required: true },
    totalMarks:    { type: Number, required: true },
    students:      [{ type: String }],
    status:        { type: String, enum: ['draft', 'saved', 'published', 'submitted', 'checked'], default: 'draft' }
  },
  { timestamps: true }
);

const questionSchema = new mongoose.Schema(
  {
    examId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    type:            { type: String, enum: ['mcq', 'text'], required: true },
    questionText:    { type: String, required: true },
    imageUrl:        { type: String, default: null },
    options:         [{ type: String }],
    marks:           { type: Number, required: true },
    referenceAnswer: { type: String, required: true }
  },
  { timestamps: true }
);

const studentExamSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true },
    examIds:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exam' }]
  },
  { timestamps: true }
);

// ----- Submission Service model (student-exam-model.js) -----
const studentAnswerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  submittedAnswer: { type: String, required: true }
});

const submittedExamSchema = new mongoose.Schema(
  {
    examId: { type: String, required: true },
    studentId: { type: String, required: true },
    answers: [studentAnswerSchema],
    status: { 
      type: String, 
      enum: ['pending_grading', 'graded'], 
      default: 'pending_grading' 
    },
    submittedAt: { type: Date, required: true }
  },
  { timestamps: true }
);

submittedExamSchema.index({ examId: 1, studentId: 1 }, { unique: true });
submittedExamSchema.index({ examId: 1, status: 1 });

// Register models with their respective connections
const Exam = examDbConnection.model('Exam', examSchema);
const Question = examDbConnection.model('Question', questionSchema);
const StudentExam = examDbConnection.model('StudentExam', studentExamSchema);
const SubmittedExam = submissionDbConnection.model('SubmittedExam', submittedExamSchema);

// ===============================
// 3. HELPER FUNCTIONS
// ===============================
const log = (msg, obj = null) => {
  console.log(`[${new Date().toISOString()}] ${msg}`);
  if (obj) console.log(obj);
};

const clearCollections = async () => {
  log('Clearing existing data...');
  await Exam.deleteMany({});
  await Question.deleteMany({});
  await StudentExam.deleteMany({});
  await SubmittedExam.deleteMany({});
  log('All collections cleared.');
};

// ===============================
// 4. SEED DATA GENERATION
// ===============================
const generateQuestions = (examId) => [
  {
    examId,
    type: 'mcq',
    questionText: 'What is the capital of France?',
    imageUrl: null,
    options: ['Berlin', 'Madrid', 'Paris', 'Lisbon'],
    marks: 2,
    referenceAnswer: 'Paris'
  },
  {
    examId,
    type: 'mcq',
    questionText: 'Which planet is known as the Red Planet?',
    imageUrl: null,
    options: ['Mars', 'Jupiter', 'Venus', 'Saturn'],
    marks: 2,
    referenceAnswer: 'Mars'
  },
  {
    examId,
    type: 'text',
    questionText: 'Explain the theory of relativity in one paragraph.',
    imageUrl: null,
    options: [],
    marks: 5,
    referenceAnswer: 'The theory of relativity, developed by Albert Einstein, comprises special relativity and general relativity...'
  }
];

const generateAnswers = (questions) =>
  questions.map(q => ({
    questionId: q._id.toString(),
    submittedAnswer: q.type === 'mcq'
      ? q.options[Math.floor(Math.random() * q.options.length)]
      : 'This is a sample answer for the open‑ended question.'
  }));

// ===============================
// 5. MAIN SEED FUNCTION
// ===============================
async function seed() {
  try {
    log('Starting seed process...');

    await clearCollections();  // comment out if you want to keep old data

    // ---- Create exam ----
    const exam = new Exam({
      instructorId: 'inst_001',
      title: 'Computer Science 101 - Midterm',
      teacherName: 'Dr. Smith',
      subject: 'Computer Science',
      scheduledTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      timeAllowed: 90,
      totalMarks: 0,
      students: [],
      status: 'published'
    });
    await exam.save();
    log(`Exam created: ${exam._id}`);

    // ---- Create questions ----
    const questions = await Question.insertMany(generateQuestions(exam._id));
    log(`Created ${questions.length} questions.`);

    // ---- Update exam totalMarks ----
    exam.totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    await exam.save();
    log(`Exam totalMarks set to ${exam.totalMarks}`);

    // ---- Assign students (StudentExam) ----
    const studentIds = ['S001', 'S002', 'S003'];
    await StudentExam.insertMany(
      studentIds.map(id => ({ studentId: id, examIds: [exam._id] }))
    );
    log(`Assigned ${studentIds.length} students.`);

    // ---- Create submissions (SubmittedExam) ----
    const submissions = studentIds.map(id => ({
      examId: exam._id.toString(),
      studentId: id,
      answers: generateAnswers(questions),
      status: 'pending_grading',
      submittedAt: new Date()
    }));
    await SubmittedExam.insertMany(submissions);
    log(`Created ${submissions.length} submissions.`);

    // ---- Update exam.students array (optional) ----
    exam.students = studentIds;
    await exam.save();

    // ---- Verification ----
    log('\n========== SEEDING COMPLETE ==========');
    log(`Exam DB: Exams=${await Exam.countDocuments()}, Questions=${await Question.countDocuments()}, StudentExam=${await StudentExam.countDocuments()}`);
    log(`Submission DB: SubmittedExams=${await SubmittedExam.countDocuments()}`);
    log('======================================\n');

    // Integrity check
    const sub = await SubmittedExam.findOne();
    if (sub) {
      const examExists = await Exam.findById(sub.examId);
      const studentExists = await StudentExam.findOne({ studentId: sub.studentId });
      const allQuestionIdsValid = (await Question.find({ examId: sub.examId }))
        .every(q => sub.answers.some(a => a.questionId === q._id.toString()));
      log('Integrity check:');
      log(`  - Exam exists: ${!!examExists}`);
      log(`  - Student exists: ${!!studentExists}`);
      log(`  - All questionIds valid: ${allQuestionIdsValid}`);
    }

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await examDbConnection.close();
    await submissionDbConnection.close();
    log('Database connections closed.');
  }
}

seed();