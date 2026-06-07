const mongoose = require('mongoose');

const studentAnswerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  submittedAnswer: { type: String, required: true }, // Option string for MCQ, full text string for open-ended
//   questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  // Snapshotting crucial fields to preserve the integrity of the submission history
//   questionType: { type: String, enum: ['mcq', 'text'], required: true },
//   marksAllocated: { type: Number, required: true }, // Max marks possible for this question at submission time
  
  // The actual student input
//   submittedAnswer: { type: String, required: true }, // Option string for MCQ, full text string for open-ended
  
  // Grading fields (populated during auto-grading or teacher evaluation)
//   isCorrect: { type: Boolean, default: null }, // true/false for MCQs (auto), null for pending manual grading
//   marksObtained: { type: Number, default: 0 }  // Populated after grading
});

// A single proctoring event captured by the client during the exam
// (tab switch, focus loss, fullscreen exit, clipboard, right-click, devtools).
const proctoringViolationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const submittedExamSchema = new mongoose.Schema(
  {
    examId: { type: String , required: true },
    studentId: { type: String, required: true }, // Pulled securely from JWT
    
    answers: [studentAnswerSchema], // Array of subdocuments containing answers

    // Proctoring telemetry: integrity signals captured while the student
    // sat the exam. Teachers/admins review these per submission.
    violations: { type: [proctoringViolationSchema], default: [] },
    violationCount: { type: Number, default: 0 },
    
    // Summary statistics for quick querying (calculates student performance metrics)
    // totalMarksPossible: { type: Number, required: true }, // Snapshot of Exam.totalMarks at submission
    
    status: { 
      type: String, 
      enum: ['pending_grading', 'graded'], 
      default: 'pending_grading' 
    },
    
    // startedAt: { type: Date, required: true }, // Tracked to calculate if they exceeded timeAllowed
    submittedAt: { type: Date, required: true }
  },
  { timestamps: true }
);

// CRITICAL SECURITY INDEX: Prevents a student from submitting the same exam twice!
submittedExamSchema.index({ examId: 1, studentId: 1 }, { unique: true });

// PERFORMANCE INDEX: For teachers loading all submissions for a single exam
submittedExamSchema.index({ examId: 1, status: 1 });

module.exports = mongoose.model('SubmittedExam', submittedExamSchema);