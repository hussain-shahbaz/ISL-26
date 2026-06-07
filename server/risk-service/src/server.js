const app = require('./app');
const config = require('./config');
const { initSchema, verifyConnectivity, close } = require('./neo4j');

async function start() {
  try {
    await verifyConnectivity();
    await initSchema();
    console.log('risk-service connected to Neo4j');
  } catch (err) {
    // Start anyway so /health is reachable; analytics routes return 503 until
    // Neo4j is available.
    console.warn(`risk-service: Neo4j not reachable yet (${err.message})`);
  }

  const server = app.listen(config.port, () => {
    console.log(`risk-service listening on port ${config.port}`);
  });

  const shutdown = async () => {
    await close();
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start();
