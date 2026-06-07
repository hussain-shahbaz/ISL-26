// Risk-service configuration. All values come from the shared root .env.
module.exports = {
  port: process.env.RISK_PORT || process.env.PORT || 3007,
  serviceSecret: process.env.SERVICE_SECRET || 'dev-service-secret',
  neo4j: {
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    user: process.env.NEO4J_USER || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'neo4j',
  },
};
