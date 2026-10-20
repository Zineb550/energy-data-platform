// Records what users do. Feeds the admin dashboard ("activité générale").
const { query } = require('../config/db');

async function logActivity(userId, action, target = null) {
  try {
    await query('INSERT INTO activity_log (user_id, action, target) VALUES ($1, $2, $3)', [
      userId,
      action,
      target,
    ]);
  } catch (err) {
    // A logging failure must never break the user's action.
    console.error('Activity log failed:', err.message);
  }
}

module.exports = { logActivity };
