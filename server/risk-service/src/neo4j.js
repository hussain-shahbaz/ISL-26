const neo4j = require('neo4j-driver');
const config = require('./config');

let driver = null;

function getDriver() {
  if (!driver) {
    driver = neo4j.driver(
      config.neo4j.uri,
      neo4j.auth.basic(config.neo4j.user, config.neo4j.password),
      { disableLosslessIntegers: true },
    );
  }
  return driver;
}

// Run a Cypher statement in a short-lived session and return plain records.
async function run(cypher, params = {}) {
  const session = getDriver().session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => r.toObject());
  } finally {
    await session.close();
  }
}

// Ensure uniqueness constraints (idempotent) so the graph stays normalized.
async function initSchema() {
  const constraints = [
    'CREATE CONSTRAINT student_id IF NOT EXISTS FOR (s:Student) REQUIRE s.id IS UNIQUE',
    'CREATE CONSTRAINT device_fp IF NOT EXISTS FOR (d:Device) REQUIRE d.fingerprint IS UNIQUE',
    'CREATE CONSTRAINT network_ip IF NOT EXISTS FOR (n:Network) REQUIRE n.ip IS UNIQUE',
    'CREATE CONSTRAINT exam_id IF NOT EXISTS FOR (e:Exam) REQUIRE e.id IS UNIQUE',
  ];
  for (const c of constraints) {
    await run(c);
  }
}

async function verifyConnectivity() {
  await getDriver().verifyConnectivity();
}

async function close() {
  if (driver) await driver.close();
  driver = null;
}

module.exports = { getDriver, run, initSchema, verifyConnectivity, close };
