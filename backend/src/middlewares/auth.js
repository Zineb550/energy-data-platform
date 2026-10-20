// Authentication and authorization middlewares.
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../config/db');
const AppError = require('../utils/AppError');

// Reads "Authorization: Bearer <token>", verifies it and loads the user.
// The user is reloaded from the database so that a disabled account
// is blocked immediately, even if its token has not expired yet.
async function loadUserFromToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError(401, 'Invalid or expired session, please log in again');
  }

  const { rows } = await query(
    'SELECT id, name, email, role, status, created_at FROM users WHERE id = $1',
    [payload.id]
  );
  const user = rows[0];
  if (!user) throw new AppError(401, 'Account not found');
  if (user.status !== 'active') throw new AppError(403, 'This account is disabled');
  return user;
}

// Route requires a logged-in user.
async function authenticate(req, res, next) {
  try {
    const user = await loadUserFromToken(req);
    if (!user) throw new AppError(401, 'Authentication required');
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Route works for visitors AND users (used for public dashboards).
async function optionalAuth(req, res, next) {
  try {
    req.user = await loadUserFromToken(req);
    next();
  } catch {
    req.user = null;
    next();
  }
}

// Route requires one of the given roles, e.g. requireRole('admin').
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new AppError(403, 'You do not have access to this resource'));
  }
  next();
};

module.exports = { authenticate, optionalAuth, requireRole };
