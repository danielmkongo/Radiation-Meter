require('dotenv').config();
const app = require('./app');
const { getDb } = require('./config/database');

const PORT = parseInt(process.env.PORT || '3003', 10);

// Initialize database on startup
getDb();

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Radiation Monitor API running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DB_PATH || './data/radiation_meter.db'}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down...');
  server.close(() => process.exit(0));
});

module.exports = server;
