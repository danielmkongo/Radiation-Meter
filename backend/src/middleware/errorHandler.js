function errorHandler(err, req, res, next) {
  const isDev = process.env.NODE_ENV === 'development';

  console.error('[ERROR]', err.message, isDev ? err.stack : '');

  // SQLite constraint errors
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists.',
    });
  }

  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist.',
    });
  }

  const status = err.status || err.statusCode || 500;
  const message =
    status < 500 || isDev ? err.message : 'Internal server error';

  res.status(status).json({
    success: false,
    message,
    ...(isDev && { stack: err.stack }),
  });
}

module.exports = errorHandler;
