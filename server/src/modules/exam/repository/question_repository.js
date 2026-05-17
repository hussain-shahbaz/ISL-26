const Question = require('../models/question_model');

class QuestionRepository {

  async createQuestion(data) {
    const question = new Question(data);
    return await question.save();
  }

  async createMany(questions, examId) {
    const data = questions.map(q => ({ ...q, examId }));
    return await Question.insertMany(data);
  }

  async findByExamId(examId) {
    return await Question.find({ examId });
  }

  async findById(id) {
    return await Question.findById(id);
  }

  async updateById(id, data) {
    return await Question.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteById(id) {
    return await Question.findByIdAndDelete(id);
  }

  async deleteByExamId(examId) {
    return await Question.deleteMany({ examId });
  }
}

module.exports = new QuestionRepository();