const express        = require('express');
const examRoutes     = require('./routes/exam_routes');
const questionRoutes = require('./routes/question_routes');

class App {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      req.user = { userId: '101', role: 'teacher' };
      next();
    });
    this.app.use('/health', (req, res) => res.status(200).json({ status: 'success', message: 'Exam module is healthy' }));
    this.app.use('/api/exam', examRoutes.getRouter());
    this.app.use('/api/exam/question', questionRoutes.getRouter());
  }

  start() {
    this.app.listen(process.env.PORT || 3002, () => {
      console.log(`Server chal raha hai port ${process.env.PORT || 3002} pe`);
    });
  }
}
module.exports = new App();