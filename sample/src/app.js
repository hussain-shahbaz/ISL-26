class App {
  start() {
    return { status: "server running", port: 3000 };
  }
}
module.exports = new App();