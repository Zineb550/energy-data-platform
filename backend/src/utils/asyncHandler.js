// Wraps an async controller so any error goes to the error middleware
// instead of crashing the server. Avoids a try/catch in every controller.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
