const StudentExam = require('../models/student_exam_model');

class StudentExamRepository {

  async addExamToStudent(studentId, examId) {
    return await StudentExam.findOneAndUpdate(
      { studentId },
      { $addToSet: { examIds: examId } },
      { upsert: true, new: true }
    );
  }

  async removeExamFromStudent(studentId, examId) {
    return await StudentExam.findOneAndUpdate(
      { studentId },
      { $pull: { examIds: examId } },
      { new: true }
    );
  }

  async findByStudentId(studentId) {
    return await StudentExam.findOne({ studentId });
  }

  async findExamsByStudentId(studentId) {
    return await StudentExam.findOne({ studentId }).populate('examIds');
  }
}

module.exports = new StudentExamRepository();
