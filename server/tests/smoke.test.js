// Dependency-free smoke tests for the core normalization logic.
// Run with: npm run test:smoke   (no databases required)

process.env.JWT_SECRET = 'test-secret';

const assert = require('node:assert');
const jwt = require('jsonwebtoken');

const { authenticate, normalizeRole } = require('../src/common/middleware/auth');
const Validator = require('../src/modules/student-exam/student-exam-validator');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ok  - ${name}`);
  } catch (err) {
    console.error(`  FAIL - ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

// Minimal Express-like req/res doubles.
function makeReq({ headers = {}, path = '/exam/123' } = {}) {
  return { headers: { ...headers }, path };
}
function makeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

console.log('Gateway identity normalization');

test('role: instructor normalizes to teacher', () => {
  assert.strictEqual(normalizeRole('instructor'), 'teacher');
  assert.strictEqual(normalizeRole('STUDENT'), 'student');
});

test('valid token propagates trusted identity headers', () => {
  const token = jwt.sign(
    { user_id: 'u-1', role: 'instructor', session_id: 's-1', username: 'a@b.com' },
    process.env.JWT_SECRET,
  );
  const req = makeReq({ headers: { authorization: `Bearer ${token}` } });
  let nextCalled = false;
  authenticate(req, makeRes(), () => { nextCalled = true; });

  assert.ok(nextCalled, 'next() should be called');
  assert.strictEqual(req.headers['x-user-id'], 'u-1');
  assert.strictEqual(req.headers['x-user-role'], 'teacher');
  assert.strictEqual(req.headers['x-session-id'], 's-1');
  assert.strictEqual(req.user.userId, 'u-1');
});

test('spoofed identity headers are stripped before verification', () => {
  const token = jwt.sign({ user_id: 'real', role: 'student' }, process.env.JWT_SECRET);
  const req = makeReq({
    headers: { authorization: `Bearer ${token}`, 'x-user-id': 'attacker', 'x-user-role': 'admin' },
  });
  authenticate(req, makeRes(), () => {});
  assert.strictEqual(req.headers['x-user-id'], 'real');
  assert.strictEqual(req.headers['x-user-role'], 'student');
});

test('missing token returns 401', () => {
  const req = makeReq();
  const res = makeRes();
  let nextCalled = false;
  authenticate(req, res, () => { nextCalled = true; });
  assert.strictEqual(nextCalled, false);
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.status, 'error');
});

test('invalid token returns 401', () => {
  const req = makeReq({ headers: { authorization: 'Bearer not-a-jwt' } });
  const res = makeRes();
  authenticate(req, res, () => {});
  assert.strictEqual(res.statusCode, 401);
});

test('health path is public (no token required)', () => {
  const req = makeReq({ path: '/exam/health' });
  let nextCalled = false;
  authenticate(req, makeRes(), () => { nextCalled = true; });
  assert.ok(nextCalled);
});

console.log('Student-exam submission validator');

test('accepts answers that belong to the exam', () => {
  const questions = [{ _id: 'q1' }, { _id: 'q2' }];
  const result = Validator.validateQuestions([{ questionId: 'q1' }], questions);
  assert.strictEqual(result.isValid, true);
});

test('rejects an answer for a question outside the exam', () => {
  const questions = [{ _id: 'q1' }];
  const result = Validator.validateQuestions([{ questionId: 'qX' }], questions);
  assert.strictEqual(result.isValid, false);
});

if (process.exitCode) {
  console.log(`\n${passed} passed, with failures.`);
} else {
  console.log(`\nAll ${passed} smoke tests passed.`);
}
