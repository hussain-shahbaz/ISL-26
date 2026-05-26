const axios = require('axios');
const studentExamRepository = require('./student-exam-repository');
const SubmitExamValidator = require('./student-exam-validator');

class StudentExamService {
    async submitExam(submissionData) {
        try {
            // user
                // const user = axios.get(`${process.env['user-module-service']}/${submissionData.studentId}`)
                //correct user
                const user = {
                  data: {
                    id : '101',
                    id : '201',
                    role: 'student',
                    rollNumber: '12345'
                  }
                }
                // incorrect role
                // user = {
                //   data: {
                //     id : '101',
                //     id : '201',
                //     role: 'teacher',
                //     rollNumber: '12345'
                //   }
                // }
            // exam
                // const exam = axios.get(`${process.env['exam-module-service']}/${submissionData.examId}`)
                const exam = {
                  data :{
                    "id": '201',
                    // "id": '202',
                    "instructorId": "101",
                    "subject": "Mathematics",
                    "scheduledTime": "2026-05-24T12:17:00.000Z",
                    "timeAllowed": 60,
                    "totalMarks": 10,
                    "students": ["roll-001", "roll-002"],
                    "status":'published',
                  }
                }
                // console.log(exam.data.scheduledTime);
            // getExamQuestions
                // const examQuestions = axios.get(`${process.env['exam-module-service']}/questions/${submissionData.examId}`)
            // check questions are in this exam or not


            // studentEnrolledInExam
                // const studentEnrolledInExam = axios.get(`${process.env['exam-module-service']}/assigned/${submissionData.examId}/${user.rollNumber}`)
            const studentEnrolledInExam = true
            // const studentEnrolledInExam = false

            const validateSubmit = SubmitExamValidator.validateSubmit(submissionData, user.data, exam.data, studentEnrolledInExam);
            if(!validateSubmit.isValid){
              throw new Error(`Validation failed: ${validateSubmit.errors.join(", ")}`);
            }
            const existingSubmission = await studentExamRepository.findByExamIdAndStudentId(submissionData.examId, submissionData.studentId);
            if (existingSubmission) {
              throw new Error('Exam has already been submitted by this student');
            }
            
            const result = await studentExamRepository.createSubmission(submissionData);
            console.log("yaha issue??")
            console.log(`Service: Exam submission successful with ID ${result._id}`);
            return result;
            // checks:
                // id is student    
                // examId is valid
                // exam is published
                // exam is assigned to the student
                // exam is not already submitted
                // API hit time is before the exam end time (examDate + examTime + duration) and after the exam start time (examDate + examTime)
                // check exam already submitted

            // response:
                // success message
        }
        catch (error) {
            throw new Error(`Service: Failed to submit Exam: ${error.message}`);
        }
    }
}

module.exports = new StudentExamService();