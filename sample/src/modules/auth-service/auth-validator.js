class AuthValidator {
  validateLogin(body) {
    return { isValid: true, errors: [] };
  }
  validateRegister(body) {
    return { isValid: true, errors: [] };
  }
}
module.exports = new AuthValidator();