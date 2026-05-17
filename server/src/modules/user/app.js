const express        = require('express');
const userRoutes     = require('./user-route');


class App {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.app.use('/api/v1/user', userRoutes.getRouter());
  }

  start() {
    this.app.listen(process.env.PORT, () => {
        console.log(`Server chal raha hai port ${process.env.PORT} pe`);
    });
    
  }
}

module.exports = new App();