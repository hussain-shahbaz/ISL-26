const axios = require('axios');

// Fire-and-forget kick of the grading pipeline once an exam is fully submitted.
// The grade-cheat service is idempotent (returns 409 if already graded/running),
// so re-triggering is safe and never blocks the student's submission response.
const GRADE_CHEAT_SERVICE_URL =
  process.env.GRADE_CHEAT_SERVICE_URL || 'http://localhost:3005';
const SERVICE_SECRET = process.env.SERVICE_SECRET || 'dev-service-secret';
const DEFAULT_MODE = process.env.GRADING_MODE || 'medium';

function triggerGrading(examId) {
  axios
    .post(`${GRADE_CHEAT_SERVICE_URL}/api/grade/async`, {}, {
      params: { examId, mode: DEFAULT_MODE },
      headers: { 'x-service-secret': SERVICE_SECRET },
      timeout: 4000,
    })
    .catch(() => {
      /* best-effort: teacher can still grade manually from the report */
    });
}

// Read the stored grading results for an exam from grade-cheat. Used to surface a
// student's own result through student-exam (the grade-cheat routes are themselves
// teacher/admin-only at the gateway). Best-effort: returns [] if not graded yet or
// the grader is unreachable, so the caller can show "awaiting grading".
async function fetchExamResults(examId) {
  try {
    const res = await axios.get(`${GRADE_CHEAT_SERVICE_URL}/api/results`, {
      params: { examId },
      headers: { 'x-service-secret': SERVICE_SECRET },
      timeout: 5000,
      validateStatus: () => true,
    });
    if (res.status !== 200) return [];
    return res.data?.data?.results ?? [];
  } catch {
    return [];
  }
}

module.exports = { triggerGrading, fetchExamResults };
