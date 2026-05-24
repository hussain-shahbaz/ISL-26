const Exam = require('../models/exam_model');
const Question = require('../models/question_model')
class ExamRepository {

  async createExam(data) {
    const exam = new Exam(data);
    return await exam.save();
  }

  async findByIdWithQuestions(id) {
    const exam = await Exam.findById(id);
    if (!exam) return null;
    const questions = await Question.find({ examId: id });
    console.log(id)
    return { ...exam.toObject(), questions };
  }
  
  async findAll() {
    return await Exam.find();
  }

  async findByTeacherId(instructorId) {
    return await Exam.find({ instructorId });
  }

  async findBySubject(subject) {
    return await Exam.find({ subject });
  }

  async findByTeacherAndSubject(instructorId, subject) {
    return await Exam.find({ instructorId, subject });
  }

  async findById(id) {
    return await Exam.findById(id);
  }

<<<<<<< HEAD
=======
  async findByIds(ids) {
    return await Exam.find({ _id: { $in: ids } });
  }

>>>>>>> exam-module
  async updateById(id, data) {
    return await Exam.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteById(id) {
    return await Exam.findByIdAndDelete(id);
  }
}

module.exports = new ExamRepository();