// Last middleware of the app: turns every error into the same JSON format
//   { "error": { "message": "...", "details": [...] } }
const multer = require('multer');
const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message;

  if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 10 MB)' : err.message;
  } else if (err.code === '23505') {
    // PostgreSQL unique violation
    status = 409;
    message = 'This value already exists';
  } else if (!(err instanceof AppError) && status === 500) {
    console.error(err);
    message = 'Internal server error';
  }

  res.status(status).json({ error: { message, details: err.details } });
}

module.exports = { notFound, errorHandler };
