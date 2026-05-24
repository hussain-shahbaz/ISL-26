// Sample auth routes for testing

const express = require('express');
const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password required',
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Login successful',
    token: 'jwt_token_' + Math.random().toString(36).substring(7),
    user: {
      id: 'user-001',
      email,
    },
  });
});

router.post('/register', (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      error: 'Email, password, and name required',
    });
  }

  return res.status(201).json({
    success: true,
    message: 'Registration successful',
    user: {
      id: 'user-' + Date.now(),
      email,
      name,
    },
  });
});

router.get('/profile', (req, res) => {
  const userId = req.get('x-user-id') || 'user-001';

  return res.status(200).json({
    success: true,
    user: {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: '2026-01-01',
    },
  });
});

router.post('/logout', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
});

router.get('/error-test', (req, res) => {
  return res.status(500).json({
    success: false,
    error: 'This is a test error',
  });
});

module.exports = router;
