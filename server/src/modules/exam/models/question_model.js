const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    examId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    type:            { type: String, enum: ['mcq', 'text'], required: true },
    questionText:    { type: String, required: true },
    imageUrl:        { type: String, default: null },
    options:         [{ type: String }],
    marks:           { type: Number, required: true },
    obtainedMarks:   { type: Number },
    referenceAnswer: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Question', questionSchema);