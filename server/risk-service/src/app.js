const express = require('express');
const routes = require('./routes');

const app = express();
app.use(express.json({ limit: '256kb' }));

// Identity is verified at the gateway and forwarded via x-user-* headers.
app.use((req, res, next) => {
  req.user = {
    userId: req.headers['x-user-id'],
    role: req.headers['x-user-role'],
  };
  next();
});

app.get('/health', (req, res) =>
  res.status(200).json({ module: 'risk-service', status: 'healthy', dependencies: ['neo4j'], version: '1.0.0' }),
);

app.use('/risk', routes);

module.exports = app;
