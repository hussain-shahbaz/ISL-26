/**
 * User Module
 * Entry point for the user module
 * Exports all module components
 */

const UserController = require("./user-controller");
const UserService = require("./user-service");
const UserRepository = require("./user-repository");
const UserValidator = require("./user-validator");
const UserModel = require("./user-model");
const UserRoutes = require("./user-route");

class UserModule {
  constructor() {
    this.controller = UserController;
    this.service = UserService;
    this.repository = UserRepository;
    this.validator = UserValidator;
    this.model = UserModel;
    this.routes = UserRoutes;
  }

  /**
   * Get all available routes
   */
  getRoutes() {
    return this.routes.getRoutes();
  }

  /**
   * Initialize module with dependencies
   */
  init() {
    return {
      module: "user",
      status: "initialized",
      routes: this.getRoutes()
    };
  }

  /**
   * Static method to initialize module
   */
  static initialize() {
    return new UserModule();
  }
}

module.exports = new UserModule();