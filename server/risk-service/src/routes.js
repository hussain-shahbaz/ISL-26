const express = require('express');
const riskService = require('./service');
const config = require('./config');

const router = express.Router();

// Every /risk route requires the shared service secret (added by the gateway).
router.use((req, res, next) => {
  if (req.path === '/health') return next();
  const secret = req.headers['x-service-secret'];
  if (!secret || secret !== config.serviceSecret) {
    return res.status(403).json({ status: 'error', message: 'Unauthorized service call' });
  }
  next();
});

function ok(res, data) {
  return res.status(200).json({ status: 'success', data });
}

function fail(res, err) {
  const unavailable = /ServiceUnavailable|ECONNREFUSED|Could not perform discovery/i.test(err.message || '');
  const code = unavailable ? 503 : 400;
  return res.status(code).json({
    status: 'error',
    error_code: code,
    message: unavailable ? 'Graph database unavailable' : err.message,
    timestamp: new Date().toISOString(),
  });
}

router.get('/health', (req, res) =>
  res.status(200).json({ module: 'risk-service', status: 'healthy', dependencies: ['neo4j'], version: '1.0.0' }),
);

router.post('/events', async (req, res) => {
  try {
    ok(res, await riskService.ingest(req.body || {}));
  } catch (err) {
    fail(res, err);
  }
});

router.get('/overview', async (req, res) => {
  try {
    ok(res, await riskService.overview());
  } catch (err) {
    fail(res, err);
  }
});

router.get('/collusion', async (req, res) => {
  try {
    const examId = req.query.examId || null;
    const [rings, pairs] = await Promise.all([
      riskService.collusionRings(examId),
      riskService.collusionPairs(examId),
    ]);
    ok(res, { rings, pairs, ringCount: rings.length, pairCount: pairs.length });
  } catch (err) {
    fail(res, err);
  }
});

router.get('/student/:studentId', async (req, res) => {
  try {
    ok(res, await riskService.studentRisk(req.params.studentId));
  } catch (err) {
    fail(res, err);
  }
});

module.exports = router;
