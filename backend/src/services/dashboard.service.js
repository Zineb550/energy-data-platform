// Dashboards: a list of analyses (widgets) + filters that update every widget at once.
const crypto = require('crypto');
const { query } = require('../config/db');
const AppError = require('../utils/AppError');
const { logActivity } = require('./activity.service');
const { SELECT_ANALYSIS } = require('./analysis.service');
const { runAnalysis } = require('./analysis.engine');
const { Params } = require('./queryBuilder');

const SELECT_DASHBOARD = `
  SELECT db.*, u.name AS owner_name
    FROM dashboards db JOIN users u ON u.id = db.owner_id`;

// Access rules
//   owner, admin -> read + edit
//   other users  -> read if 'shared' or 'public'
//   visitors     -> read only through the public link, if 'public'
function checkAccess(dashboard, user, write) {
  const canWrite = !!user && (dashboard.owner_id === user.id || user.role === 'admin');
  const canRead = canWrite || (!!user && ['shared', 'public'].includes(dashboard.visibility));
  if (!canRead || (write && !canWrite)) throw new AppError(403, 'You do not have access to this dashboard');
  return canWrite;
}

async function getDashboard(id, user, { write = false } = {}) {
  const { rows } = await query(`${SELECT_DASHBOARD} WHERE db.id = $1`, [id]);
  const dashboard = rows[0];
  if (!dashboard) throw new AppError(404, 'Dashboard not found');
  return { ...dashboard, can_edit: checkAccess(dashboard, user, write) };
}

async function getPublicDashboard(slug) {
  const { rows } = await query(`${SELECT_DASHBOARD} WHERE db.public_slug = $1 AND db.visibility = 'public'`, [slug]);
  if (!rows[0]) throw new AppError(404, 'This dashboard does not exist or is no longer public');
  return { ...rows[0], can_edit: false };
}

async function listPublic() {
  const { rows } = await query(
    `SELECT db.id, db.name, db.description, db.public_slug, db.updated_at, u.name AS owner_name,
            jsonb_array_length(db.widgets) AS widget_count
       FROM dashboards db JOIN users u ON u.id = db.owner_id
      WHERE db.visibility = 'public' ORDER BY db.updated_at DESC`
  );
  return rows;
}

async function list(user, { scope = 'all' } = {}) {
  let where = "(db.owner_id = $1 OR db.visibility IN ('shared', 'public'))";
  if (scope === 'mine') where = 'db.owner_id = $1';
  if (scope === 'shared') where = "db.owner_id <> $1 AND db.visibility IN ('shared', 'public')";
  const { rows } = await query(
    `SELECT db.id, db.name, db.description, db.visibility, db.public_slug, db.owner_id,
            db.created_at, db.updated_at, u.name AS owner_name, jsonb_array_length(db.widgets) AS widget_count
       FROM dashboards db JOIN users u ON u.id = db.owner_id
      WHERE ${where} ORDER BY db.updated_at DESC`,
    [user.id]
  );
  return rows;
}

// Loads the analyses used by the widgets, in one query.
async function loadAnalyses(dashboard) {
  const ids = dashboard.widgets.map((w) => w.analysisId);
  if (!ids.length) return new Map();
  const { rows } = await query(`${SELECT_ANALYSIS} WHERE a.id = ANY($1::int[])`, [ids]);
  return new Map(rows.map((a) => [a.id, a]));
}

// May this widget be shown to this viewer?
// - logged-in viewer: own analysis, shared analysis, or admin
// - public link: only analyses that belong to the dashboard owner
//   (an owner cannot publish someone else's work)
function widgetVisible(analysis, dashboard, viewer, isPublicView) {
  if (!analysis) return false;
  if (isPublicView) return analysis.owner_id === dashboard.owner_id;
  return (
    analysis.owner_id === viewer.id ||
    viewer.role === 'admin' ||
    analysis.visibility === 'shared' ||
    analysis.owner_id === dashboard.owner_id
  );
}

// Computes every widget with the viewer's filters.
async function getData(dashboard, viewer, filters, { isPublicView = false } = {}) {
  const analyses = await loadAnalyses(dashboard);
  const dashFilters = filters.map((f) => ({ column: f.column, op: 'eq', value: f.value }));

  return Promise.all(
    dashboard.widgets.map(async (w) => {
      const a = analyses.get(w.analysisId);
      if (!widgetVisible(a, dashboard, viewer, isPublicView)) {
        return { analysisId: w.analysisId, size: w.size, error: 'This analysis is not available' };
      }
      const base = {
        analysisId: a.id,
        size: w.size,
        name: a.name,
        description: a.description,
        datasetTitle: a.dataset_title,
        chart: a.config.chart,
      };
      try {
        const result = await runAnalysis({ id: a.dataset_id, columns: a.dataset_columns }, a.config, dashFilters);
        return { ...base, result };
      } catch (err) {
        return { ...base, error: err.message };
      }
    })
  );
}

// Values offered in each dashboard filter (e.g. the list of countries),
// collected from the datasets of the widgets.
async function getFilterOptions(dashboard) {
  const analyses = [...(await loadAnalyses(dashboard)).values()];
  const datasetIds = [...new Set(analyses.map((a) => a.dataset_id))];

  return Promise.all(
    dashboard.filter_columns.map(async (column) => {
      const withColumn = analyses.filter((a) => a.dataset_columns.some((c) => c.name === column));
      const ids = [...new Set(withColumn.map((a) => a.dataset_id))].filter((id) => datasetIds.includes(id));
      if (!ids.length) return { column, type: 'text', values: [] };

      const type = withColumn[0].dataset_columns.find((c) => c.name === column).type;
      const expr = type === 'number' ? '(data->>$1)::numeric' : '(data->>$1)';
      const { rows } = await query(
        `SELECT DISTINCT ${expr} AS v FROM dataset_rows
          WHERE dataset_id = ANY($2::int[]) AND data->>$1 IS NOT NULL
          ORDER BY 1 ${type === 'number' ? 'DESC' : 'ASC'} LIMIT 500`,
        [column, ids]
      );
      return { column, type, values: rows.map((r) => (type === 'number' ? Number(r.v) : r.v)) };
    })
  );
}

// Every widget must be an analysis the user can read.
async function checkWidgets(widgets, user) {
  if (!widgets?.length) return;
  const ids = widgets.map((w) => w.analysisId);
  const { rows } = await query('SELECT id, owner_id, visibility FROM analyses WHERE id = ANY($1::int[])', [ids]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const id of ids) {
    const a = byId.get(id);
    const readable = a && (a.owner_id === user.id || a.visibility === 'shared' || user.role === 'admin');
    if (!readable) throw new AppError(400, `Analysis #${id} does not exist or is not accessible`);
  }
}

const newSlug = () => crypto.randomBytes(6).toString('hex');

async function create(user, data) {
  await checkWidgets(data.widgets, user);
  const slug = data.visibility === 'public' ? newSlug() : null;
  const { rows } = await query(
    `INSERT INTO dashboards (owner_id, name, description, widgets, filter_columns, default_filters, visibility, public_slug)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      user.id,
      data.name,
      data.description,
      JSON.stringify(data.widgets),
      JSON.stringify(data.filterColumns),
      JSON.stringify(data.defaultFilters),
      data.visibility,
      slug,
    ]
  );
  await logActivity(user.id, 'DASHBOARD_CREATE', data.name);
  return getDashboard(rows[0].id, user);
}

async function update(dashboard, user, changes) {
  if (changes.widgets) await checkWidgets(changes.widgets, user);

  const map = {
    name: 'name',
    description: 'description',
    visibility: 'visibility',
    widgets: 'widgets',
    filterColumns: 'filter_columns',
    defaultFilters: 'default_filters',
  };
  const params = new Params();
  const sets = Object.entries(map)
    .filter(([key]) => changes[key] !== undefined)
    .map(([key, col]) => {
      const value = typeof changes[key] === 'object' ? JSON.stringify(changes[key]) : changes[key];
      return `${col} = ${params.add(value)}`;
    });

  // A public link is created when the dashboard becomes public, and removed otherwise.
  if (changes.visibility === 'public' && !dashboard.public_slug) sets.push(`public_slug = ${params.add(newSlug())}`);
  if (changes.visibility && changes.visibility !== 'public') sets.push('public_slug = NULL');

  if (sets.length) {
    await query(`UPDATE dashboards SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ${params.add(dashboard.id)}`, params.values);
    const action = changes.visibility === 'public' && dashboard.visibility !== 'public' ? 'DASHBOARD_PUBLISH' : 'DASHBOARD_UPDATE';
    await logActivity(user.id, action, changes.name || dashboard.name);
  }
  return getDashboard(dashboard.id, user);
}

async function remove(dashboard, user) {
  await query('DELETE FROM dashboards WHERE id = $1', [dashboard.id]);
  await logActivity(user.id, 'DASHBOARD_DELETE', dashboard.name);
}

module.exports = { getDashboard, getPublicDashboard, listPublic, list, getData, getFilterOptions, create, update, remove };
