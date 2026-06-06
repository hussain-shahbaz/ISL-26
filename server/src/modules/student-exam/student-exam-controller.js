const studentExamService = require('./student-exam-service');

class StudentExamController {

    async submitExam(req, res) {
        try {
            // manipulate this according to the request body
            const id = req.user.id; // from token
            // const id = '101'; // for testing purpose, change it to above line when token is implemented
            // const id = '201'; // for testing purpose, change it to above line when token is implemented
            // const id = '301'; // for testing purpose, change it to above line when token is implemented
            const { examId } = req.params;
            const { submissionTimeRaw } = req.query;
            const { answers } = req.body;
            const submissionTime = new Date(submissionTimeRaw);
            // const submissionData = {
            //     studentId: id,
            //     examId:examId,
            //     answers:  answers.map(ans => {
            //             return {
            //                 questionId: ans.question.questionId,
            //                 submittedAnswer: ans.submittedAnswer
            //             }
            //             // 
            //         })
            //     ,
            //     submittedAt : new Date(submissionTime),
            // }


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
                data: {}
            });
        }



    }

    async getAllExams(req, res) {
        try {
            const id = req.user.id; // from token
            // const studentId = '101'; // for testing purpose, change it to above line when token is implemented
            // const id = '201'; // for testing purpose, change it to above line when token is implemented
            // const id = '301'; // for testing purpose, change it to above line when token is implemented
            const exams = await studentExamService.getAllExams(id);
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
                data: {}
            })
        }

    }

    async getExamDetails(req, res) {
        try {
            const id = req.user.id; // from token
            // const id = '101'; // for testing purpose, change it to above line when token is implemented
            // const id = '201'; // for testing purpose, change it to above line when token is implemented
            // const id = '301'; // for testing purpose, change it to above line when token is implemented
            const { examId } = req.params;
            const { currentTimeRaw } = req.query;
            const currentTime = new Date(currentTimeRaw); // time of api hit
            const examDetails = await studentExamService.getExamDetails(id, examId, currentTime);
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
                data: {}
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
                data: {}
            })
        }
    }
}

module.exports = new StudentExamController();