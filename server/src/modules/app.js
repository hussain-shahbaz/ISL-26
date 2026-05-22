const express        = require('express');
const examRoutes     = require('./exam/routes/exam_routes');
const questionRoutes = require('./exam/routes/question_routes');

class App {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      req.user = { userId: '101', role: 'teacher' };
      next();
    });
    this.app.use('/api/exam', examRoutes.getRouter());
    this.app.use('/api/exam', questionRoutes.getRouter());
  }

  start() {
    this.app.listen(process.env.PORT, () => {
      console.log('Server chal raha hai port 3000 pe');
    });
  }
}
// reference answer ni aana chahiye
// exam publish krny sy pehly fetch ni ho skta
module.exports = new App();