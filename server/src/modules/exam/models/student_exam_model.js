const mongoose = require('mongoose');

// Enrollment index: maps a student (by canonical userId) to the exams they are
// assigned to. studentId mirrors the gateway-propagated x-user-id / JWT user_id.
const studentExamSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, index: true },
    examIds:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exam' }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudentExam', studentExamSchema);
