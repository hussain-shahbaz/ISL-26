const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    instructorId:  { type: String, required: true },
    subject:       { type: String, required: true },
    scheduledTime: { type: Date,   required: true },
    timeAllowed:   { type: Number, required: true },
    totalMarks:    { type: Number, required: true },
    students:      [{ type: String }],
    status:        { type: String, enum: ['draft', 'saved', 'published'], default: 'draft' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Exam', examSchema);