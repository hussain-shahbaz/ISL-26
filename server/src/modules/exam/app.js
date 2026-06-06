const express        = require('express');
const examRoutes     = require('./routes/exam_routes');
const questionRoutes = require('./routes/question_routes');

class App {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    // Identity is verified at the gateway and forwarded via x-user-* headers.
    this.app.use((req, res, next) => {
      req.user = {
        userId: req.headers['x-user-id'],
        role: req.headers['x-user-role'],
        sessionId: req.headers['x-session-id'],
        username: req.headers['x-username'],
      };
      next();
    });
    const health = (req, res) => res.status(200).json({
      module: 'exam-service', status: 'healthy', dependencies: ['mongodb'], version: '1.0.0',
    });
    this.app.get('/health', health);
    this.app.get('/api/exam/health', health);
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