const axios = require('axios');
const studentExamRepository = require('./student-exam-repository');
const SubmitExamValidator = require('./student-exam-validator');

class StudentExamService {
  async getStudentById(studentId) {
    try {
      // const user = axios.get(`${process.env['user-module-service']}/${submissionData.studentId}`)
      //correct user
      const user = {
        data: {
          // _id : '101',
          // _id : '201',
          _id : '301',
          role: 'student',
          rollNumber: '12345'
        }
      }
      // incorrect role
      // user = {
      //   data: {
      //     _id : '101',
      //  // _id : '201',
      //     role: 'teacher',
      //     rollNumber: '12345'
      //   }
      // }
      return user;
    }
    catch (error) {
      throw new Error(`Failed to fetch student data: ${error.message}`);
    }
  }

  async getExamById(examId) {
    try {
      // exam
      // const exam = axios.get(`${process.env['exam-module-service']}/questions/${submissionData.examId}`)
      const exam = {
        data :{
          "_id": '401',
          // "id": '202',
          "instructorId": "101",
          "subject": "Mathematics",
          "scheduledTime": "2026-05-24T12:17:00.000Z",
          "timeAllowed": 60,
          "totalMarks": 10,
          "students": ["roll-001", "roll-002"],
          "status":'published',
          "questions": [
            {
              "_id" : "q1",
              "type" : "mcq",
              "marks": 5,
              "questionText": "What is 2 + 2?",
              "referenceAnswer": "4",
              "options": ["1", "2", "3", "4"]
            },
            {
              "_id" : "q2",
              "type": "text",
              "marks" : 5,
              "questionText": "Explain the theory of relativity.",
              "referenceAnswer": "The theory of relativity encompasses two interrelated theories by Albert Einstein: special relativity and general relativity. Special relativity applies to all physical phenomena in the absence of gravity and introduces the concept that the laws of physics are the same for all non-accelerating observers, and that the speed of light is constant regardless of the motion of the light source. General relativity, on the other hand, provides a unified description of gravity as a geometric property of space and time, or spacetime. It posits that massive objects cause a distortion in spacetime, which is felt as gravity. This theory has been confirmed by numerous experiments and observations, such as the bending of light around massive objects and the precise orbit of Mercury."
            },
            {
              "_id" : "q3",
              "type": "text",
              "marks" : 5,
              "questionText": "Explain the theory of relativity.",
              "referenceAnswer": "The theory of relativity encompasses two interrelated theories by Albert Einstein: special relativity and general relativity. Special relativity applies to all physical phenomena in the absence of gravity and introduces the concept that the laws of physics are the same for all non-accelerating observers, and that the speed of light is constant regardless of the motion of the light source. General relativity, on the other hand, provides a unified description of gravity as a geometric property of space and time, or spacetime. It posits that massive objects cause a distortion in spacetime, which is felt as gravity. This theory has been confirmed by numerous experiments and observations, such as the bending of light around massive objects and the precise orbit of Mercury."
            }
          ]
        }
      }
      return exam;
    }
    catch (error) {
      throw new Error(`Failed to fetch exam data: ${error.message}`);
    }
  }

  async getStudentExamMap(studentId) {
    try {
      // const studentExamMap = axios.get(`${process.env['exam-module-service']}/exam/student/${user.rollNumber}`)
      const studentExamMap = [
        {
          examId: '201',
          studentRollNumber: '12345'
        },
        {
          examId: '101',
          studentRollNumber: '12345'
        },
        {
          examId: '301',
          studentRollNumber: '12345'
        },
        {
          examId: '401',
          studentRollNumber: '12345'
        }
      ]
      return studentExamMap;
    }
    catch (error) {
      throw new Error(`Failed to fetch student exam map: ${error.message}`);
    }
  }

  async getAllExamsByStudentId(stundetId) {
    try {  //const exams = axios.get(`${process.env['exam-module-service']}/exam/student/${studentId}`)
      const exams = {
        data : [
          {
            "_id": '401',
            // "id": '202',
            "instructorId": "101",
            "subject": "Mathematics",
            "scheduledTime": "2026-05-24T12:17:00.000Z",
            "timeAllowed": 60,
            "totalMarks": 10,
            "students": ["roll-001", "roll-002"],
            "status":'published',
          },
          {
            "_id": '101',
            // "id": '202',
            "instructorId": "101",
            "subject": "Mathematics",
            "scheduledTime": "2026-05-24T12:17:00.000Z",
            "timeAllowed": 60,
            "totalMarks": 10,
            "students": ["roll-001", "roll-002"],
            "status":'published',
          },
          {
            "_id": '201',
            // "id": '202',
            "instructorId": "101",
            "subject": "Mathematics",
            "scheduledTime": "2026-05-24T12:17:00.000Z",
            "timeAllowed": 60,
            "totalMarks": 10,
            "students": ["roll-001", "roll-002"],
            "status":'published',
          },
          {
            "_id": '301',
            // "id": '202',
            "instructorId": "101",
            "subject": "Mathematics",
            "scheduledTime": "2026-05-24T12:17:00.000Z",
            "timeAllowed": 60,
            "totalMarks": 10,
            "students": ["roll-001", "roll-002"],
            "status":'published',
          },
        ]
      }
      return exams
    }
    catch (error) {      
      throw new Error(`Failed to fetch exams for student: ${error.message}`);
    }
  }

  async submitExam(submissionData) {
    try {
      // user
      const user = await this.getStudentById(submissionData.studentId)
      // exam with questions
      const exam = await this.getExamById(submissionData.examId)
      if (!user) {
        throw new Error('Invalid student ID');
      }
      if (!exam) {
        throw new Error('Invalid exam ID');
      }
      // studentExamMap
      const studentExamMap = await this.getStudentExamMap(submissionData.studentId);
      // console.log(exam.data.status);
      
      const validateSubmit = SubmitExamValidator.validateSubmit(submissionData, user.data, exam.data, studentExamMap);
      if(!validateSubmit.isValid){
        throw new Error(`Validation failed: ${validateSubmit.errors.join(", ")}`);
      }
      const validateQuestions = SubmitExamValidator.validateQuestions(submissionData.answers, exam.data.questions);
      if(!validateQuestions.isValid){
        throw new Error(`Validation failed: ${validateQuestions.errors.join(", ")}`);
      }
      console.log("yaha issue??")
      const existingSubmission = await studentExamRepository.findByExamIdAndStudentId(submissionData.examId, submissionData.studentId);
      if (existingSubmission) {
        throw new Error('Exam has already been submitted by this student');
      }
      
      const result = await studentExamRepository.createSubmission(submissionData);
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

  async getAllExams(studentId) {
    try {
      const user = await this.getStudentById(studentId);
      console.log(user)
      if (!user || user.data.role !== 'student') {
        throw new Error('Invalid student ID');
      }
      const exams = await this.getAllExamsByStudentId(studentId);
      return exams.data;
    }
    catch (error) {
      throw new Error(`Failed to fetch exams: ${error.message}`);
    }
    // checks :
            // get his user data
            // check user exists
            // check user is student
        // filter : give exams that have his roll number in the array ... and are wither pusblished or sumbitted by student/marked by teacher
        // call exam-module endpoint from service layer
  }
}

module.exports = new StudentExamService();