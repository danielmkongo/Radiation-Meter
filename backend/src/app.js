require('dotenv').config();
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');
const path    = require('path');
const fs      = require('fs');

const routes       = require('./routes/index');
const errorHandler = require('./middleware/errorHandler');

const app = express();

const FRONTEND_DIST = process.env.FRONTEND_DIST
  || path.join(__dirname, '../../frontend/dist');
const serveFrontend = fs.existsSync(FRONTEND_DIST);

// ─── Security headers ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // allow Vite assets inline
}));

// ─── CORS (only needed in dev; same-origin in production) ────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(cors({ origin: true, credentials: true }));
}

// ─── Request parsing ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ─── Logging ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/v1', routes);

// ─── Serve frontend (production) ─────────────────────────────────────────────
if (serveFrontend) {
  app.use(express.static(FRONTEND_DIST));
  // SPA fallback — send index.html for any non-API route
  app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
} else {
  app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
  });
}

// ─── Global error handler ────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
