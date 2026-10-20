// An error we throw on purpose, with the HTTP status to send back.
// Example: throw new AppError(404, 'Dataset not found');
class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

module.exports = AppError;
