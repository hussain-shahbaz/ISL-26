class StudentExamValidator {
  /**
   * Validate user creation data
   * Expects plain password field (will be hashed in repository)
   */
  static validateSubmit(submissionData, user, exam, studentEnrolledInExam) {
    const errors = []
    
    if (!user || user.role!== 'student') {
      errors.push('Invalid student ID');
    }
    
    if (!exam) {
      errors.push('Invalid exam ID');
    }
    if (exam.status !== 'published') {
      errors.push('Exam is not published yet');
    }
    if (!studentEnrolledInExam) {
      errors.push('Exam is not assigned to this student');
    }
    const date = new Date(exam.scheduledTime);
    const submittedTime = new Date(date.getTime() + (exam.  timeAllowed * 60 * 1000));
    if(new Date(submissionData.submissionTime) < submittedTime){
      errors.push('Exam has not started yet');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

}
module.exports = StudentExamValidator;