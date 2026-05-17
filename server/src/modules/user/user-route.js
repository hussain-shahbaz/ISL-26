const express        = require('express');
const UserController = require('./user-controller');

class UserRoutes {
  constructor() {
    this.router = express.Router();
    this._bindRoutes();
  }

  _bindRoutes() {
    // Basic CRUD routes
    this.router.post('/create',                    (req, res) => UserController.createUser(req, res));
    this.router.get('/get-users',                  (req, res) => UserController.getUsers(req, res));
    this.router.get('/statistics',                 (req, res) => UserController.getStatistics(req, res));
    this.router.get('/get/:id',                    (req, res) => UserController.getUser(req, res));
    this.router.put("/update/:id",                 (req, res) => UserController.updateUser(req, res));
    this.router.delete('/delete/:id',              (req, res) => UserController.deleteUser(req, res));
    this.router.post('/restore/:id',               (req, res) => UserController.restoreUser(req, res));
    
    // User Identifier routes
    this.router.post('/:id/identifier',            (req, res) => UserController.createUserIdentifier(req, res));
    this.router.get('/:id/identifier',             (req, res) => UserController.getUserIdentifier(req, res));
    this.router.put('/:id/identifier',             (req, res) => UserController.updateUserIdentifier(req, res));
    
    // Approval routes
    this.router.get('/approvals/pending',          (req, res) => UserController.getPendingApprovals(req, res));
    this.router.get('/approvals/:status',          (req, res) => UserController.getUsersByApprovalStatus(req, res));
    this.router.post('/approve/:id',               (req, res) => UserController.approveUser(req, res));
    this.router.post('/reject/:id',                (req, res) => UserController.rejectUser(req, res));
  }

  getRouter() {
    return this.router;
  }
}

module.exports = new UserRoutes();