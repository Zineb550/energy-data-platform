// Business logic of accounts: register, login, profile.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../config/db');
const AppError = require('../utils/AppError');
const { logActivity } = require('./activity.service');

const SALT_ROUNDS = 10;
const PUBLIC_FIELDS = 'id, name, email, role, status, created_at';

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

async function register({ name, email, password }) {
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) throw new AppError(409, 'An account already exists with this email');

  // The password is hashed with bcrypt: the database never stores it in clear text.
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING ${PUBLIC_FIELDS}`,
    [name, email, passwordHash]
  );
  const user = rows[0];
  await logActivity(user.id, 'REGISTER');
  return { user, token: signToken(user) };
}

async function login({ email, password }) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  // Same message whether the email or the password is wrong:
  // an attacker cannot learn which emails have an account.
  const valid = user && (await bcrypt.compare(password, user.password_hash));
  if (!valid) throw new AppError(401, 'Incorrect email or password');
  if (user.status !== 'active') throw new AppError(403, 'This account is disabled');

  await logActivity(user.id, 'LOGIN');
  const { password_hash, ...publicUser } = user;
  return { user: publicUser, token: signToken(user) };
}

async function updateProfile(userId, { name }) {
  const { rows } = await query(`UPDATE users SET name = $1 WHERE id = $2 RETURNING ${PUBLIC_FIELDS}`, [
    name,
    userId,
  ]);
  return rows[0];
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  const ok = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!ok) throw new AppError(400, 'Current password is incorrect');

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, userId]);
  await logActivity(userId, 'PASSWORD_CHANGE');
}

module.exports = { register, login, updateProfile, changePassword, SALT_ROUNDS };
