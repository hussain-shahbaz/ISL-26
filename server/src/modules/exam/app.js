const express        = require('express');
const cors = require('cors');
const examRoutes     = require('./routes/exam_routes');
const questionRoutes = require('./routes/question_routes');

const corsOptions = {
  
  // 1. Sirf apne frontend ka exact URL allow karein
  origin: process.env.ORIGIN, // Agar Vite use kar rahe hain toh default yeh hota hai
  
  // 2. Cookies aur Authorization headers ko cross-origin allow karne ke liye yeh LAZMI hai
  // credentials: true, 
  
  // 3. Jo methods aap use kar rahe hain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  
  // 4. Allowed headers
  allowedHeaders: ['Content-Type', 'Authorization', 'x-service-secret']
};

class App {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.app.use(cors(corsOptions));
    this.app.use((req, res, next) => {
      req.user = { userId: '101', role: 'teacher' };
      next();
    });
    this.app.use('/health', (req, res) => res.status(200).json({ status: 'success', message: 'Exam module is healthy' }));
    this.app.use('/api/v1/exam', examRoutes.getRouter());
    this.app.use('/api/v1/exam/question', questionRoutes.getRouter());
  }

  start() {
    this.app.listen(process.env.PORT || 3002, () => {
      console.log(`Server chal raha hai port ${process.env.PORT || 3002} pe`);
    });
  }
}
module.exports = new App();