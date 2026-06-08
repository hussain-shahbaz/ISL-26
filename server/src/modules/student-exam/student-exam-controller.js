const studentExamService = require('./student-exam-service');

// Map a business error to an HTTP status. Validation/eligibility failures are
// client errors (400); anything unexpected surfaces as 500.
function statusFor(message) {
  const clientErrorMarkers = [
    'Validation failed',
    'Validator:',
    'already been submitted',
    'Exam has ended',
    'not allowed',
    'not assigned',
    'not available',
    'not started',
    'not published',
    'Exam not found',
  ];
  return clientErrorMarkers.some((m) => message.includes(m)) ? 400 : 500;
}

function fail(res, error) {
  const code = statusFor(error.message || '');
  return res.status(code).json({
    status: 'error',
    error_code: code,
    message: error.message,
    timestamp: new Date().toISOString(),
  });
}

class StudentExamController {

    async submitExam(req, res) {
        try {
            const studentId = req.user.userId; // verified identity propagated by the gateway
            const { examId } = req.params;
            const { answers, violations } = req.body;

            if (!Array.isArray(answers) || answers.length === 0) {
                return res.status(400).json({
                    status: 'error', error_code: 400,
                    message: 'answers must be a non-empty array',
                    timestamp: new Date().toISOString(),
                });
            }

            // Accept the canonical flat shape { questionId, submittedAnswer }.
            const normalizedAnswers = answers.map((ans) => ({
                questionId: ans.questionId ?? ans.question?.questionId,
                submittedAnswer: ans.submittedAnswer,
            }));

            if (normalizedAnswers.some((a) => !a.questionId)) {
                return res.status(400).json({
                    status: 'error', error_code: 400,
                    message: 'Each answer must include a questionId',
                    timestamp: new Date().toISOString(),
                });
            }

            // Proctoring telemetry is advisory and untrusted; sanitize and cap it.
            const normalizedViolations = Array.isArray(violations)
                ? violations
                      .filter((v) => v && typeof v.type === 'string')
                      .slice(0, 200)
                      .map((v) => ({
                          type: String(v.type).slice(0, 40),
                          at: v.at ? new Date(v.at) : new Date(),
                      }))
                : [];

            const submissionData = {
                studentId,
                examId,
                answers: normalizedAnswers,
                violations: normalizedViolations,
                violationCount: normalizedViolations.length,
                submittedAt: new Date(), // server-authoritative submission time
            };

            const result = await studentExamService.submitExam(submissionData);
            return res.status(201).json({
                status: 'success',
                message: 'Exam submitted successfully',
                data: result,
            });
        } catch (error) {
            return fail(res, error);
        }
    }

    async getAllExams(req, res) {
        try {
            const exams = await studentExamService.getAllExams(req.user.userId);
            return res.status(200).json({
                status: 'success',
                message: 'Exams fetched successfully',
                data: exams,
            });
        } catch (error) {
            return fail(res, error);
        }
    }

    async getExamDetails(req, res) {
        try {
            const { examId } = req.params;
            const examDetails = await studentExamService.getExamDetails(
                examId,
                req.user.userId,
                new Date(),
            );
            return res.status(200).json({
                status: 'success',
                message: 'Exam details fetched successfully',
                data: examDetails,
            });
        } catch (error) {
            return fail(res, error);
        }
    }

    async getMyResult(req, res) {
        try {
            const { examId } = req.params;
            const studentId = req.user.userId; // own result only — taken from JWT
            const data = await studentExamService.getMyResult(examId, studentId);
            if (!data) {
                return res.status(404).json({
                    status: 'error', error_code: 404,
                    message: 'No submission found for this exam',
                    timestamp: new Date().toISOString(),
                });
            }
            return res.status(200).json({
                status: 'success',
                message: 'Result fetched successfully',
                data,
            });
        } catch (error) {
            return fail(res, error);
        }
    }

    async getSubmissionByExamIdAndStudentId(req, res) {
        try {
            const { examId } = req.params;
            // Students may only ever read their own submission; teachers/admins
            // may target a specific student or list all submissions for an exam.
            // A service-secret call with no forwarded user identity (e.g. the
            // grading service) is treated as an internal privileged reader.
            const isPrivileged =
                req.user.role === 'teacher' ||
                req.user.role === 'admin' ||
                !req.user.role;
            const studentId = isPrivileged ? req.query.studentId : req.user.userId;

            const details = await studentExamService.getSubmissionByExamIdAndStudentId(examId, studentId);
            return res.status(200).json({
                status: 'success',
                message: 'Submission details fetched successfully',
                data: details,
            });
        } catch (error) {
            return fail(res, error);
        }
    }
}

module.exports = new StudentExamController();
