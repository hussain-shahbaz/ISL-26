const studentExam = require('./student-exam-model');

class StudentExamRepository {
    async createSubmission(submissionData) {
        const submission = new studentExam(submissionData);
        return await submission.save();
    }
    async findByExamIdAndStudentId(examId, studentId) {
        return await studentExam.findOne({ examId, studentId });
    }
    async findAllByExamId(examId) {
        return await studentExam.find({ examId });
    }
    async findByStudentId(studentId) {
        return await studentExam.find({ studentId });
    }
    async countByExamId(examId) {
        return await studentExam.countDocuments({ examId });
    }
}
module.exports = new StudentExamRepository();