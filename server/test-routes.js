#!/usr/bin/env node

/**
 * Microservice Integration - Comprehensive HTTP Routes Test
 * 
 * This script tests all HTTP routes for:
 * - Exam Service (Port 3002)
 * - Student-Exam Service (Port 3005)
 * - Grade-Cheat Service (Port 3004)
 * 
 * Run: node test-routes.js
 */

const axios = require('axios');

// Configuration
const MAIN_SERVER_URL = 'http://localhost:3000';
const TIMEOUT = 5000; // 5 seconds
const COLORS = {
  RESET: '\x1b[0m',
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[36m',
  BOLD: '\x1b[1m',
};

// Test statistics
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let startTime = Date.now();

/**
 * Format console output with colors
 */
const log = {
  header: (text) => console.log(`\n${COLORS.BOLD}${COLORS.BLUE}═══ ${text} ═══${COLORS.RESET}`),
  success: (text) => console.log(`${COLORS.GREEN}✅ ${text}${COLORS.RESET}`),
  error: (text) => console.log(`${COLORS.RED}❌ ${text}${COLORS.RESET}`),
  warning: (text) => console.log(`${COLORS.YELLOW}⚠️  ${text}${COLORS.RESET}`),
  info: (text) => console.log(`${COLORS.BLUE}ℹ️  ${text}${COLORS.RESET}`),
  result: (status, code, method, path, time) => {
    const symbol = status === 'PASS' ? '✅' : '❌';
    const color = status === 'PASS' ? COLORS.GREEN : COLORS.RED;
    console.log(`${symbol} ${color}${method.padEnd(6)} ${path.padEnd(50)} [${code}] (${time}ms)${COLORS.RESET}`);
  },
  divider: () => console.log(`${COLORS.BLUE}─────────────────────────────────────────────────────────────${COLORS.RESET}`),
};

/**
 * Make HTTP request and log results
 */
async function testRoute(method, path, data = null, description = '') {
  totalTests++;
  
  try {
    const url = `${MAIN_SERVER_URL}${path}`;
    const startTime = Date.now();
    
    const config = {
      method,
      url,
      timeout: TIMEOUT,
      validateStatus: () => true, // Don't throw on any status
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': `test-${Date.now()}-${totalTests}`,
      }
    };

    if (data && (method === 'POST' || method === 'PATCH')) {
      config.data = data;
    }

    const response = await axios(config);
    const duration = Date.now() - startTime;

    // Determine if test passed (2xx status codes)
    const isPassed = response.status >= 200 && response.status < 300;

    if (isPassed) {
      passedTests++;
      log.result('PASS', response.status, method, path, duration);
    } else {
      failedTests++;
      log.result('FAIL', response.status, method, path, duration);
    }

    // Log response data for successful requests
    if (isPassed && response.data) {
      console.log(`         Response: ${JSON.stringify(response.data).substring(0, 80)}...`);
    } else if (!isPassed && response.data) {
      console.log(`         Error: ${JSON.stringify(response.data).substring(0, 80)}...`);
    }

  } catch (error) {
    failedTests++;
    totalTests++; // Already incremented, don't double count

    if (error.code === 'ECONNREFUSED') {
      log.result('FAIL', 'ECONNREFUSED', method, path, 0);
      log.error(`Connection refused - is the main server running on ${MAIN_SERVER_URL}?`);
    } else if (error.code === 'ETIMEDOUT') {
      log.result('FAIL', 'TIMEOUT', method, path, TIMEOUT);
      log.error(`Request timed out after ${TIMEOUT}ms`);
    } else {
      log.result('FAIL', 'ERROR', method, path, 0);
      log.error(`${error.message}`);
    }
  }
}

/**
 * Main test execution
 */
async function runTests() {
  console.clear();
  log.header('MICROSERVICE INTEGRATION - HTTP ROUTES TEST');
  log.info(`Main Server: ${MAIN_SERVER_URL}`);
  log.info(`Started at: ${new Date().toISOString()}`);
  log.divider();

  // ============================================
  // HEALTH CHECK
  // ============================================
  log.header('HEALTH CHECKS');
  await testRoute('GET', '/health', null, 'Main Server Health');
  
  // ============================================
  // EXAM SERVICE ROUTES (/api/modules/exam)
  // ============================================
  log.header('EXAM SERVICE ROUTES (/api/modules/exam)');
  
  // GET all exams
  await testRoute('GET', '/api/modules/exam/', null, 'Get All Exams');
  
  // Create exam
  const examData = {
    subject: 'Mathematics',
    title: 'Mid-Term Exam',
    totalMarks: 50,
    scheduledTime: '2025-12-01T09:00:00.000Z',
    timeAllowed: 90,
    questions: [
      {
        type: 'mcq',
        questionText: 'What is 2 + 2?',
        options: ['2', '3', '4', '5'],
        referenceAnswer: '4',
        marks: 10
      }
    ]
  };
  await testRoute('POST', '/api/modules/exam/', examData, 'Create Exam');
  
  // Get exam by ID (this will likely fail since no real exam exists)
  await testRoute('GET', '/api/modules/exam/123456789012345678901234', null, 'Get Exam by ID');
  
  // Get student exams  
  await testRoute('GET', '/api/modules/exam/student', null, 'Get Student Exams');
  
  // Update exam (will likely fail)
  await testRoute('PATCH', '/api/modules/exam/123456789012345678901234', 
    { title: 'Updated Title' }, 'Update Exam');
  
  // Update exam status (will likely fail)
  await testRoute('PATCH', '/api/modules/exam/123456789012345678901234/status',
    { status: 'published' }, 'Update Exam Status');
  
  // Delete exam (will likely fail)
  await testRoute('DELETE', '/api/modules/exam/123456789012345678901234', null, 'Delete Exam');
  
  // Add question (will likely fail)
  await testRoute('POST', '/api/modules/exam/123456789012345678901234/question',
    {
      type: 'text',
      questionText: 'Explain something',
      referenceAnswer: 'The answer',
      marks: 20
    }, 'Add Question');
  
  // Get questions (will likely fail)
  await testRoute('GET', '/api/modules/exam/question/123456789012345678901234', null, 'Get Questions');
  
  // Update question (will likely fail)
  await testRoute('PATCH', '/api/modules/exam/question/123456789012345678901234',
    { questionText: 'Updated question' }, 'Update Question');
  
  // Delete question (will likely fail)
  await testRoute('DELETE', '/api/modules/exam/question/123456789012345678901234', null, 'Delete Question');

  // ============================================
  // STUDENT-EXAM SERVICE ROUTES (/api/modules/student-exam)
  // ============================================
  log.header('STUDENT-EXAM SERVICE ROUTES (/api/modules/student-exam)');
  
  // Get assigned exams
  await testRoute('GET', '/api/modules/student-exam/', null, 'Get Assigned Exams');
  
  // Submit exam
  const submitData = {
    answers: [
      {
        question: { questionId: 'q1' },
        submittedAnswer: '4'
      }
    ]
  };
  await testRoute('POST', '/api/modules/student-exam/submit/exam_001', submitData, 'Submit Exam');
  
  // Get submission results
  await testRoute('GET', '/api/modules/student-exam/result/exam_001?studentId=101', null, 'Get Submission Results');

  // ============================================
  // GRADE-CHEAT SERVICE ROUTES (/api/modules/grade-cheat)
  // ============================================
  log.header('GRADE-CHEAT SERVICE ROUTES (/api/modules/grade-cheat)');
  
  // Health check
  await testRoute('GET', '/api/modules/grade-cheat/health', null, 'Grade Service Health');
  
  // Get results
  await testRoute('GET', '/api/modules/grade-cheat/results?examId=exam_001', null, 'Get Grading Results');
  
  // Get analytics
  await testRoute('GET', '/api/modules/grade-cheat/analytics?examId=exam_001', null, 'Get Analytics');
  
  // Start async grading
  await testRoute('POST', '/api/modules/grade-cheat/grade/async?examId=exam_001&mode=medium', 
    {}, 'Start Async Grading');
  
  // Get grading progress
  await testRoute('GET', '/api/modules/grade-cheat/grade/progress?taskId=task_001', null, 'Get Grading Progress');

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================
  log.header('ERROR HANDLING TESTS');
  
  // Invalid route (404)
  await testRoute('GET', '/api/modules/invalid/route', null, '404 - Invalid Route');
  
  // Service unavailable test (if exam service is down)
  await testRoute('GET', '/api/modules/exam/test-error', null, '5xx - Service Error');

  // ============================================
  // SUMMARY
  // ============================================
  const duration = Date.now() - startTime;
  log.divider();
  log.header('TEST SUMMARY');
  
  const passPercent = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0;
  
  log.info(`Total Tests: ${totalTests}`);
  log.success(`Passed: ${passedTests}`);
  log.error(`Failed: ${failedTests}`);
  log.info(`Success Rate: ${passPercent}%`);
  log.info(`Total Duration: ${duration}ms`);
  log.info(`Completed at: ${new Date().toISOString()}`);
  
  log.divider();
  
  if (failedTests === 0) {
    log.success('ALL TESTS PASSED! 🎉');
  } else if (passedTests > 0) {
    log.warning(`${failedTests} tests failed (some errors are expected)`);
  } else {
    log.error('All tests failed - check if services are running');
  }

  console.log('\n');
}

/**
 * Start the test suite
 */
if (require.main === module) {
  runTests().catch((error) => {
    log.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { testRoute, runTests };
