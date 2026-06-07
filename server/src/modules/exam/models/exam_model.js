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

// Hot query paths: teacher listings, status filters, and student enrollment lookups.
examSchema.index({ instructorId: 1, status: 1 });
examSchema.index({ instructorId: 1, subject: 1 });
examSchema.index({ students: 1 });

module.exports = mongoose.model('Exam', examSchema);