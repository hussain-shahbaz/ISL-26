const studentExam = require('./student-exam-model');

class StudentExamRepository {
    async createSubmission(submissionData) {
        console.log(submissionData);
        const submission = new studentExam(submissionData);
        return await submission.save();
    }
    async findByExamIdAndStudentId(examId, studentId) {
        return await studentExam.findOne({ examId, studentId });
    }
}
module.exports = new StudentExamRepository();