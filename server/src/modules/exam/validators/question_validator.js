class QuestionValidator {

  validateCreate(body) {
    const errors = [];

    if (!body.type || !['mcq', 'text'].includes(body.type)) {
      errors.push('type is required and must be mcq or text');
    }

    if (!body.questionText || body.questionText.trim() === '') {
      errors.push('questionText is required');
    }

    if (!body.referenceAnswer || body.referenceAnswer.trim() === '') {
      errors.push('referenceAnswer is required');
    }

    if (!body.marks || !Number.isInteger(body.marks) || body.marks <= 0) {
      errors.push('marks is required and must be a positive integer');
    }

    if (body.type === 'mcq') {
      if (!body.options || !Array.isArray(body.options) || body.options.length !== 4) {
        errors.push('mcq must have exactly 4 options');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  validateUpdate(body) {
    const errors = [];

    if (body.type !== undefined && !['mcq', 'text'].includes(body.type)) {
      errors.push('type must be mcq or text');
    }

    if (body.questionText !== undefined && body.questionText.trim() === '') {
      errors.push('questionText cannot be empty');
    }

    if (!body.marks || !Number.isInteger(body.marks) || body.marks <= 0) {
      errors.push('marks is required and must be a positive integer');
    }

    if (body.referenceAnswer !== undefined && body.referenceAnswer.trim() === '') {
      errors.push('referenceAnswer cannot be empty');
    }

    if (body.type === 'mcq' && body.options !== undefined) {
      if (!Array.isArray(body.options) || body.options.length !== 4) {
        errors.push('mcq must have exactly 4 options');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  validateQuestionId(id) {
    const errors = [];

    if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
      errors.push('questionId must be a valid MongoDB ObjectId');
    }

    return { isValid: errors.length === 0, errors };
  }

  validateExamId(id) {
    const errors = [];

    if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
      errors.push('examId must be a valid MongoDB ObjectId');
    }

    return { isValid: errors.length === 0, errors };
  }
}

module.exports = new QuestionValidator();