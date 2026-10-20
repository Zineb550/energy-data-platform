// Administration: global indicators, user management, supervision of datasets and activity.
const { query } = require('../config/db');
const AppError = require('../utils/AppError');
const { logActivity } = require('./activity.service');
const { Params } = require('./queryBuilder');

// Global indicators for the admin dashboard.
async function getStats() {
  const [totals, activityByDay, actions, topUsers, recentUsers] = await Promise.all([
    query(`
      SELECT (SELECT COUNT(*) FROM users)::int                                   AS users,
             (SELECT COUNT(*) FROM users WHERE status = 'disabled')::int         AS disabled_users,
             (SELECT COUNT(*) FROM users WHERE role = 'admin')::int              AS admins,
             (SELECT COUNT(*) FROM datasets)::int                                AS datasets,
             (SELECT COALESCE(SUM(row_count), 0) FROM datasets)::int             AS rows,
             (SELECT COUNT(*) FROM analyses)::int                                AS analyses,
             (SELECT COUNT(*) FROM dashboards)::int                              AS dashboards,
             (SELECT COUNT(*) FROM dashboards WHERE visibility = 'public')::int  AS public_dashboards,
             (SELECT COUNT(DISTINCT user_id) FROM activity_log
               WHERE action = 'LOGIN' AND created_at > NOW() - INTERVAL '7 days')::int AS active_users_7d`),
    // Number of actions per day over the last 30 days (days without activity = 0).
    query(`
      SELECT to_char(d.day, 'YYYY-MM-DD') AS day, COUNT(a.id)::int AS actions,
             COUNT(a.id) FILTER (WHERE a.action = 'LOGIN')::int AS logins
        FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, INTERVAL '1 day') AS d(day)
        LEFT JOIN activity_log a ON a.created_at::date = d.day::date
       GROUP BY d.day ORDER BY d.day`),
    query(`
      SELECT action, COUNT(*)::int AS count FROM activity_log
       WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY action ORDER BY count DESC`),
    query(`
      SELECT u.id, u.name, COUNT(a.id)::int AS actions
        FROM activity_log a JOIN users u ON u.id = a.user_id
       WHERE a.created_at > NOW() - INTERVAL '30 days'
       GROUP BY u.id, u.name ORDER BY actions DESC LIMIT 5`),
    query('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 5'),
  ]);

  return {
    totals: totals.rows[0],
    activityByDay: activityByDay.rows,
    actions: actions.rows,
    topUsers: topUsers.rows,
    recentUsers: recentUsers.rows,
  };
}

async function listUsers({ search = '' } = {}) {
  const params = new Params();
  let where = '';
  if (search) {
    const p = params.add(`%${search}%`);
    where = `WHERE u.name ILIKE ${p} OR u.email ILIKE ${p}`;
  }
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
            (SELECT COUNT(*) FROM datasets d WHERE d.owner_id = u.id)::int   AS datasets,
            (SELECT COUNT(*) FROM analyses a WHERE a.owner_id = u.id)::int   AS analyses,
            (SELECT COUNT(*) FROM dashboards b WHERE b.owner_id = u.id)::int AS dashboards,
            (SELECT MAX(created_at) FROM activity_log l WHERE l.user_id = u.id AND l.action = 'LOGIN') AS last_login
       FROM users u ${where}
      ORDER BY u.created_at ASC`,
    params.values
  );
  return rows;
}

// An admin cannot change or delete their own account here,
// so the platform can never end up without any active admin by mistake.
async function updateUser(admin, userId, { role, status }) {
  if (admin.id === userId) throw new AppError(400, 'You cannot change your own role or status');
  const params = new Params();
  const sets = [];
  if (role) sets.push(`role = ${params.add(role)}`);
  if (status) sets.push(`status = ${params.add(status)}`);
  if (!sets.length) throw new AppError(400, 'Nothing to update');

  const { rows } = await query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = ${params.add(userId)} RETURNING id, name, email, role, status`,
    params.values
  );
  if (!rows[0]) throw new AppError(404, 'User not found');
  const what = [role && `role=${role}`, status && `status=${status}`].filter(Boolean).join(', ');
  await logActivity(admin.id, 'ADMIN_USER_UPDATE', `${rows[0].email} (${what})`);
  return rows[0];
}

async function deleteUser(admin, userId) {
  if (admin.id === userId) throw new AppError(400, 'You cannot delete your own account');
  const { rows } = await query('DELETE FROM users WHERE id = $1 RETURNING email', [userId]);
  if (!rows[0]) throw new AppError(404, 'User not found');
  await logActivity(admin.id, 'ADMIN_USER_DELETE', rows[0].email);
}

// Every dataset of the platform, whoever owns it.
async function listDatasets() {
  const { rows } = await query(
    `SELECT d.id, d.title, d.category, d.visibility, d.row_count, d.created_at,
            jsonb_array_length(d.columns) AS column_count,
            u.name AS owner_name, u.email AS owner_email,
            (SELECT COUNT(*) FROM analyses a WHERE a.dataset_id = d.id)::int AS analyses
       FROM datasets d JOIN users u ON u.id = d.owner_id
      ORDER BY d.created_at DESC`
  );
  return rows;
}

async function listActivity({ page = 1, pageSize = 25, action } = {}) {
  const params = new Params();
  const where = action ? `WHERE a.action = ${params.add(action)}` : '';
  const countParams = [...params.values];
  const limit = params.add(pageSize);
  const offset = params.add((page - 1) * pageSize);
  const [data, count] = await Promise.all([
    query(
      `SELECT a.id, a.action, a.target, a.created_at, u.name AS user_name, u.email AS user_email
         FROM activity_log a LEFT JOIN users u ON u.id = a.user_id
         ${where} ORDER BY a.created_at DESC, a.id DESC LIMIT ${limit} OFFSET ${offset}`,
      params.values
    ),
    query(`SELECT COUNT(*)::int AS total FROM activity_log a ${where}`, countParams),
  ]);
  const total = count.rows[0].total;
  return { rows: data.rows, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

module.exports = { getStats, listUsers, updateUser, deleteUser, listDatasets, listActivity };
