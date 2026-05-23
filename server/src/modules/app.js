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
// validate krty waqt role b lena h
// wo wala kaam b rkna h user roll nuber ky against exam id
module.exports = new App();