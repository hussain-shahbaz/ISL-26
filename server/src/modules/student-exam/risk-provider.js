const axios = require('axios');

// Fire-and-forget link of a submission into the Neo4j risk graph. Non-critical:
// failures never affect the submission result.
const RISK_SERVICE_URL = process.env.RISK_SERVICE_URL || 'http://localhost:3007';
const SERVICE_SECRET = process.env.SERVICE_SECRET || 'dev-service-secret';

function emitSubmission(studentId, examId) {
  axios
    .post(
      `${RISK_SERVICE_URL}/risk/events`,
      { type: 'submission', studentId, examId },
      { headers: { 'x-service-secret': SERVICE_SECRET }, timeout: 2000 },
    )
    .catch(() => {
      /* best-effort */
    });
}

module.exports = { emitSubmission };
