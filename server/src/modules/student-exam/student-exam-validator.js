class StudentExamValidator {
  // Ensures every submitted answer maps to a question that belongs to the exam.
  // Enrollment, publication and start-time rules are enforced by the
  // exam-service; closing-time is enforced in the student-exam service.
  static validateQuestions(submittedAnswers, examQuestions) {
    for (const ans of submittedAnswers) {
      if (!examQuestions.some(q => String(q._id) === ans.questionId)) {
        return {
          isValid: false,
          errors: [`Validator: Question ID ${ans.questionId} is not part of the exam`]
        };
      }
    }
    return {
      isValid: true,
      errors: []
    };
  }
}

module.exports = StudentExamValidator;
