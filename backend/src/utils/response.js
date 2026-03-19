/**
 * Standardized API response helpers
 */

function success(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function created(res, data, message = 'Created') {
  return success(res, data, message, 201);
}

function error(res, message, statusCode = 400, details = null) {
  const payload = { success: false, message };
  if (details) payload.details = details;
  return res.status(statusCode).json(payload);
}

function unauthorized(res, message = 'Unauthorized') {
  return error(res, message, 401);
}

function forbidden(res, message = 'Forbidden') {
  return error(res, message, 403);
}

function notFound(res, message = 'Not found') {
  return error(res, message, 404);
}

function paginated(res, data, pagination, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination,
  });
}

module.exports = { success, created, error, unauthorized, forbidden, notFound, paginated };
