const StudentExam = require('../models/student_exam_model');

class StudentExamRepository {

  async addExamToStudent(rollNumber, examId) {
    return await StudentExam.findOneAndUpdate(
      { rollNumber },
      { $addToSet: { examIds: examId } }, // duplicate nahi aayega
      { upsert: true, new: true }          // record nahi mila toh bana do
    );
  }

  async removeExamFromStudent(rollNumber, examId) {
    return await StudentExam.findOneAndUpdate(
      { rollNumber },
      { $pull: { examIds: examId } },
      { new: true }
    );
  }

  async findByRollNumber(rollNumber) {
    return await StudentExam.findOne({ rollNumber });
  }

  async findExamsByRollNumber(rollNumber) {
    return await StudentExam.findOne({ rollNumber }).populate('examIds');
  }
}

module.exports = new StudentExamRepository();