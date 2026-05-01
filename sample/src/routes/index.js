class Routes {
  register() {
    return { modules: ["auth"] };
  }
}
module.exports = new Routes();