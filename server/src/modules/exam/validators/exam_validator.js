xconst questionValidator = require('./question_validator');

class ExamValidator {

  validateCreate(body) {
    const errors = [];

    if (!body.instructorId || !Number.isInteger(Number(body.instructorId))) {
      errors.push('instructorId is required and must be an integer');
    }

    if (!body.subject || body.subject.trim() === '') {
      errors.push('subject is required');
    }

    if (!body.title || body.title.trim() === '') {
      errors.push('title is required');
    }

    if (!body.totalMarks || !Number.isInteger(body.totalMarks) || body.totalMarks <= 0) {
      errors.push('totalMarks is required and must be a positive integer');
    }

    if (!body.scheduledTime) {
      errors.push('scheduledTime is required');
    } else if (new Date(body.scheduledTime) <= new Date()) {
      errors.push('scheduledTime must be a future date');
    }

    if (!body.timeAllowed || !Number.isInteger(body.timeAllowed) || body.timeAllowed <= 0) {
      errors.push('timeAllowed is required and must be a positive integer');
    }

    if (!body.questions || !Array.isArray(body.questions) || body.questions.length === 0) {
        errors.push('questions list is required');
    } else {
        body.questions.forEach((q, i) => {
        const { isValid, errors: qErrors } = questionValidator.validateCreate(q);
        if (!isValid) {
            qErrors.forEach(e => errors.push(`question ${i + 1}: ${e}`));
        }
    });
  }

    return { isValid: errors.length === 0, errors };
  }

  validateUpdate(body) {
    const errors = [];
    const allowed = ['draft', 'saved', 'published', 'submitted', 'checked'];

    if (body.instructorId !== undefined && !Number.isInteger(Number(body.instructorId))) {
      errors.push('instructorId must be an integer');
    }

    if (body.title !== undefined && body.title.trim() === '') {
      errors.push('title cannot be empty');
    }

    if (body.subject !== undefined && body.subject.trim() === '') {
      errors.push('subject cannot be empty');
    }

    if (body.scheduledTime !== undefined && new Date(body.scheduledTime) <= new Date()) {
      errors.push('scheduledTime must be a future date');
    }

<<<<<<< HEAD
    if (body.timeAllowed !== undefined && body.timeAllowed <= 0) {
      errors.push('timeAllowed must be greater than 0');
    }

    if (body.totalMarks !== undefined && body.totalMarks <= 0) {
      errors.push('totalMarks must be greater than 0');
=======
    if (body.timeAllowed !== undefined && (!Number.isInteger(body.timeAllowed) || body.timeAllowed <= 0)) {
      errors.push('timeAllowed must be a positive integer');
    }

    if (body.totalMarks !== undefined && (!Number.isInteger(body.totalMarks) || body.totalMarks <= 0)) {
      errors.push('totalMarks must be a positive integer');
>>>>>>> exam-module
    }

    return { isValid: errors.length === 0, errors };
  }

  validateStatus(body) {
    const errors = [];
<<<<<<< HEAD
    const allowed = ['draft', 'saved', 'published'];
=======
    const allowed = ['draft', 'saved', 'published', 'submitted', 'checked'];
>>>>>>> exam-module

    if (!body.status) {
      errors.push('status is required');
    } else if (!allowed.includes(body.status)) {
<<<<<<< HEAD
      errors.push('status must be draft, saved or published');
=======
      errors.push('status must be draft, saved, published, submitted or checked');
>>>>>>> exam-module
    }

    return { isValid: errors.length === 0, errors };
  }

  validateExamId(id) {
    const errors = [];

    if (!id || !/^[a-fA-F0-9]{24}$/.test(id)) {
      errors.push('Invalid exam id');
    }

    return { isValid: errors.length === 0, errors };
  }

  validateTotalMarks(totalMarks, questions) {
    const errors = [];

    const assignedMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    if (assignedMarks !== totalMarks) {
      errors.push(`totalMarks (${totalMarks}) must equal sum of all question marks (${assignedMarks})`);
    }

    return { isValid: errors.length === 0, errors };
  }
}

module.exports = new ExamValidator();