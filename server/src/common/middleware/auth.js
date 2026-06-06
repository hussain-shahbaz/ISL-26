// Gateway authentication & identity normalization.
//
// Verifies the shared JWT once at the edge, then forwards a trusted, normalized
// identity to downstream microservices via x-user-* headers. Client-supplied
// x-user-* headers are stripped first so they cannot be spoofed.

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;

// Contract role vocabulary is student | teacher | admin.
// auth-service issues "instructor"; normalize it to "teacher".
function normalizeRole(role) {
  if (!role) return role;
  const r = String(role).toLowerCase();
  return r === 'instructor' ? 'teacher' : r;
}

function unauthorized(res, message) {
  return res.status(401).json({
    status: 'error',
    error_code: 401,
    message,
    timestamp: new Date().toISOString(),
  });
}

// Strip any inbound identity headers so only the gateway can set them.
function stripIdentityHeaders(req) {
  delete req.headers['x-user-id'];
  delete req.headers['x-user-role'];
  delete req.headers['x-session-id'];
  delete req.headers['x-username'];
}

function authenticate(req, res, next) {
  stripIdentityHeaders(req);

  // Health endpoints stay public so monitoring can reach them.
  if (req.path.endsWith('/health')) return next();

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return unauthorized(res, 'Missing or invalid Authorization header');

  if (!JWT_SECRET) {
    return res.status(500).json({
      status: 'error',
      error_code: 500,
      message: 'Server auth not configured (JWT_SECRET missing)',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = {
      userId: decoded.user_id || decoded.userId,
      role: normalizeRole(decoded.role),
      sessionId: decoded.session_id || decoded.sessionId || '',
      username: decoded.username || decoded.email || '',
    };

    req.user = user;
    // Propagate verified identity to downstream services.
    req.headers['x-user-id'] = user.userId || '';
    req.headers['x-user-role'] = user.role || '';
    req.headers['x-session-id'] = user.sessionId;
    req.headers['x-username'] = user.username;

    next();
  } catch (err) {
    return unauthorized(res, 'Invalid or expired token');
  }
}

// Restrict a proxied route group to specific roles (after authenticate).
function requireRole(...roles) {
  const allowed = roles.map((r) => normalizeRole(r));
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        error_code: 403,
        message: 'Insufficient permissions',
        timestamp: new Date().toISOString(),
      });
    }
    next();
  };
}

module.exports = { authenticate, requireRole, normalizeRole };
