const mongoose = require('mongoose');

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

module.exports = mongoose.model('Exam', examSchema);