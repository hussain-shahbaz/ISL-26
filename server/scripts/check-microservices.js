const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const mainPort = process.env.MAIN_SERVER_PORT || 3000;
const mainUrl = process.env.MAIN_SERVER_URL || `http://localhost:${mainPort}`;
const logServiceUrl = process.env.LOG_SERVICE_URL || 'http://localhost:3001';

const services = [
  {
    name: 'Main server',
    url: `${mainUrl}/health`,
    route: '/health',
  },
  {
    name: 'Auth service',
    url: `${mainUrl}/api/auth/health`,
    route: '/api/auth/health',
  },
  {
    name: 'Exam service',
    url: `${mainUrl}/api/modules/exam/health`,
    route: '/api/modules/exam/health',
  },
  {
    name: 'Student Exam service',
    url: `${mainUrl}/api/modules/student-exam/health`,
    route: '/api/modules/student-exam/health',
  },
  {
    name: 'Grade Cheat service',
    url: `${mainUrl}/api/modules/grade-cheat/health`,
    route: '/api/modules/grade-cheat/health',
  },
  {
    name: 'Log service',
    url: `${logServiceUrl}/health`,
    route: '/health (log service)',
  },
];

async function checkService(service) {
  try {
    const response = await axios.get(service.url, { timeout: 5000 });
    return {
      name: service.name,
      route: service.route,
      status: response.status,
      healthy: response.status >= 200 && response.status < 300,
      data: response.data,
    };
  } catch (error) {
    const status = error.response?.status || 'NO RESPONSE';
    const message = error.response?.data?.message || error.message || 'Unknown error';
    return {
      name: service.name,
      route: service.route,
      status,
      healthy: false,
      error: message,
    };
  }
}

(async () => {
  console.log(`Checking main server and proxied microservice health on ${mainUrl}`);

  const results = await Promise.all(services.map(checkService));

  results.forEach((result) => {
    if (result.healthy) {
      console.log(`✅ ${result.name} is healthy on route ${result.route} (status ${result.status})`);
    } else {
      console.log(`❌ ${result.name} failed on route ${result.route} (status ${result.status})`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  });

  const anyFailed = results.some((result) => !result.healthy);
  process.exit(anyFailed ? 1 : 0);
})();
