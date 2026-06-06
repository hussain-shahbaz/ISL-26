class StudentExamValidator {
  /**
   * Validate user creation data
   * Expects plain password field (will be hashed in repository)
   */
  static validateSubmit(submissionData, user, exam, studentExamMap) {
    const errors = []
    
    if (!user || user.role!== 'student') {
      errors.push(' Validator: Invalid student ID');
    }
    
    if (exam.status !== 'published') {
      errors.push(' Validator: Exam is not published yet');
    }
    const studentEnrolledInExam = studentExamMap.some(se => se.examId === submissionData.examId && se.studentRollNumber === user.rollNumber);
    if (!studentEnrolledInExam) {
      errors.push(' Validator: Exam is not assigned to this student');
    }
    const date = new Date(exam.scheduledTime);
    const submittedTime = new Date(date.getTime() + (exam.timeAllowed * 60 * 1000));
    if(new Date(submissionData.submittedAt) < date){
      errors.push(' Validator: Exam has not started yet');
    }
    if(new Date(submissionData.submittedAt) > submittedTime){
      errors.push(' Validator: Exam has ended');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateExamDetailsEligibility(user, exam, studentExamMap, currentTime) {
    const errors = []
    if (!user || user.role!== 'student') {
      errors.push(' Validator: Invalid student ID');
    }
    if (exam.status !== 'published') {
      errors.push(' Validator: Exam is not published yet');
    }
    const studentEnrolledInExam = studentExamMap.some(se => se.examId === exam._id.toString() && se.studentRollNumber === user.rollNumber);
    if (!studentEnrolledInExam) {
      errors.push(' Validator: Exam is not assigned to this student');
    }
    
    const date = new Date(exam.scheduledTime);
    const submittedTime = new Date(date.getTime() + (exam.timeAllowed * 60 * 1000));
    if(currentTime > submittedTime){
      errors.push(' Validator: Exam has ended');
    }
    if (currentTime < date){
      errors.push(' Validator: Exam has not started yet');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateQuestions(submittedAnswers, examQuestions) {
    for (const ans of submittedAnswers) {
      if (!examQuestions.some(q => q._id.toString() === ans.questionId)) {
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