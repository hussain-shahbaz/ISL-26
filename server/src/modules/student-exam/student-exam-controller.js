const studentExamService = require('./student-exam-service');

class StudentExamController {

    async submitExam(req, res) {
        try {
            const id = req.user.userId; // verified identity propagated by the gateway
            const { examId } = req.params;
            const { answers } = req.body;
            const submittedAt = new Date(); // server-authoritative submission time
            const submissionData = {
                studentId: id,
                examId: examId,
                answers: answers.map(ans => {
                    return {
                        questionId: ans.question.questionId,
                        submittedAnswer: ans.submittedAnswer
                    };
                }),
                submittedAt,
            }

            
            const result = await studentExamService.submitExam(submissionData);
            console.log('controller: success')
            res.status(200).json({
                success: true,
                message: 'Exam submitted successfully',
                statusCode: 200,
                data: result
            })
        }
        catch (error) {
            console.log(`ontroller: failure ${error.message}`)
            return res.status(500).json({
                success: false,
                error: error.message,
                statusCode: 500,
                data : {}
            });
        }


        // request attributes needed :
            //  id(from token)
            //  examId (from params)
            //  answers (from body)

        // checks:
            // id is student    
            // examId is valid
            // exam is published
            // exam is assigned to the student
            // exam is not already submitted
            // API hit time is before the exam end time (examDate + examTime + duration) and after the exam start time (examDate + examTime)

        // response:
            // success message
    }

    async getAllExams(req, res) {
        try {
            const studentId = req.user.userId; // verified identity from the gateway
            const exams = await studentExamService.getAllExams(studentId);
            return res.status(200).json({
                success: true,
                message: 'Exams fetched successfully',
                statusCode: 200,
                data: exams
            })
        }
        catch (error) {
            console.log(`controller: failure ${error.message}`)
            return res.status(500).json({
                success: false,
                error: error.message,
                statusCode: 500,
                data : {}
            })
        }
         
    }

    async getExamDetails(req, res) {
        try {
            const id = req.user.userId; // verified identity from the gateway
            const { examId } = req.params;
            const currentTime = new Date(); // server-authoritative time of request
            const examDetails = await studentExamService.getExamDetails(examId, id, currentTime);
            return res.status(200).json({
                success: true,
                message: 'Exam details fetched successfully',
                statusCode: 200,
                data: examDetails
            })
        }
        catch (error) {
            console.log(`controller: failure ${error.message}`)
            return res.status(500).json({
                success: false,
                error: error.message,
                statusCode: 500,
                data : {}
            })
        }
    }

    async getSubmissionByExamIdAndStudentId(req, res) {
        try {
            const { examId } = req.params
            const { studentId } = req.query
            const details = await studentExamService.getSubmissionByExamIdAndStudentId(examId, studentId)
            return res.status(200).json({
                success: true,
                message: 'Submission details fetched successfully',
                statusCode: 200,
                data: details
            })
        }
        catch (error) {
            console.log(`controller: failure ${error.message}`)
            return res.status(500).json({
                success: false,
                error: error.message,
                statusCode: 500,
                data : {}
            })
        }
    }
}

module.exports = new StudentExamController();


 // request attributes needed :
            //  id(from token)
            // examId (from params)

        // checks:
            // id is student
            // examId is valid
            // exam is published
            // exam is assigned to the student
            // API hit time is before the exam end time (examDate + examTime + duration) and after the exam start time (examDate + examTime)
    

// getMyExams
  


// getExamDetails
    

    // call exam-module endpoint from service layer

    // reposonse: 
        // exam {
        //     id,teacher,subject,examDate,examTime,duration,totalMarks,examType, examStatus
        //     questions
        // }


// getExamResult
    // request attributes needed :
        //  id(from token)
        //  examId (from params)
    
    // checks:
        // id is student
        // examId is valid
        // exam is marked
        // exam is assigned to the student
        // API hit time is after the exam end time (examDate + examTime + duration)

// submitExam


// request attritubes needed :
            //  id(from token)
            //  (roll number, khud nikal lenge (cuz agar input lya to cehck bhi krna pre ga k apna hai ke nahi))
            // 
        // checks :
            // get his user data
            // check user exists
            // check user is student
        // filter : give exams that have his roll number in the array ... and are wither pusblished or sumbitted by student/marked by teacher
        // call exam-module endpoint from service layer
        // response attributes :
            //  [
            //      exam {
                        // id,teacher,subject,examDate,examTime,duration,totalMarks,examType, examStatus
                        // allow filters like teacher, subject, examType, date range etc
            //      }
            // ]
        

// bonus
// askForRecheck


