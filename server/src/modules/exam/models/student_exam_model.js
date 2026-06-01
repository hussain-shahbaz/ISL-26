const mongoose = require('mongoose');

const studentExamSchema = new mongoose.Schema(
  {
    rollNumber: { type: String, required: true, unique: true },
    examIds:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exam' }]
  },
  { timestamps: true }
);

module.exports = mongoose.model('StudentExam', studentExamSchema);