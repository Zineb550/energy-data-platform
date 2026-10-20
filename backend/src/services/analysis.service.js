// Saved analyses: create, list, read, update, delete.
const { query } = require('../config/db');
const AppError = require('../utils/AppError');
const { logActivity } = require('./activity.service');
const { getDatasetForUser } = require('./dataset.service');
const { runAnalysis } = require('./analysis.engine');
const { Params } = require('./queryBuilder');

const SELECT_ANALYSIS = `
  SELECT a.*, u.name AS owner_name, d.title AS dataset_title, d.columns AS dataset_columns
    FROM analyses a
    JOIN users u    ON u.id = a.owner_id
    JOIN datasets d ON d.id = a.dataset_id`;

// Access rules
//   owner, admin -> read + edit
//   others       -> read only if visibility = 'shared'
// Reading a shared analysis shows its aggregated RESULT, even if the
// underlying dataset is private: results are shared, not raw rows.
function checkAccess(analysis, user, write) {
  const canWrite = !!user && (analysis.owner_id === user.id || user.role === 'admin');
  const canRead = canWrite || (!!user && analysis.visibility === 'shared');
  if (!canRead || (write && !canWrite)) throw new AppError(403, 'You do not have access to this analysis');
  return canWrite;
}

async function getAnalysis(id, user, { write = false } = {}) {
  const { rows } = await query(`${SELECT_ANALYSIS} WHERE a.id = $1`, [id]);
  const analysis = rows[0];
  if (!analysis) throw new AppError(404, 'Analysis not found');
  const canEdit = checkAccess(analysis, user, write);
  return { ...analysis, can_edit: canEdit };
}

// Runs an analysis on its dataset, optionally with extra (dashboard) filters.
async function getResult(analysis, extraFilters = []) {
  const dataset = { id: analysis.dataset_id, columns: analysis.dataset_columns };
  return runAnalysis(dataset, analysis.config, extraFilters);
}

// Preview from the builder: the user must be allowed to read the dataset.
async function preview(user, { datasetId, config }) {
  const dataset = await getDatasetForUser(datasetId, user);
  return runAnalysis(dataset, config);
}

async function list(user, { scope = 'all', datasetId } = {}) {
  const params = new Params([user.id]);
  const where = [];
  if (scope === 'mine') where.push('a.owner_id = $1');
  else if (scope === 'shared') where.push("a.owner_id <> $1 AND a.visibility = 'shared'");
  else where.push("(a.owner_id = $1 OR a.visibility = 'shared')");
  if (datasetId) where.push(`a.dataset_id = ${params.add(datasetId)}`);

  const { rows } = await query(
    `SELECT a.id, a.name, a.description, a.visibility, a.config, a.dataset_id, a.owner_id,
            a.created_at, a.updated_at, u.name AS owner_name, d.title AS dataset_title,
            d.columns AS dataset_columns
       FROM analyses a JOIN users u ON u.id = a.owner_id JOIN datasets d ON d.id = a.dataset_id
      WHERE ${where.join(' AND ')}
      ORDER BY a.updated_at DESC`,
    params.values
  );
  return rows;
}

async function create(user, data) {
  const dataset = await getDatasetForUser(data.datasetId, user);
  await runAnalysis(dataset, data.config); // refuses a config that does not work on this dataset

  const { rows } = await query(
    `INSERT INTO analyses (owner_id, dataset_id, name, description, config, visibility)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [user.id, dataset.id, data.name, data.description, JSON.stringify(data.config), data.visibility]
  );
  await logActivity(user.id, 'ANALYSIS_CREATE', data.name);
  return getAnalysis(rows[0].id, user);
}

async function update(analysis, user, changes) {
  if (changes.config) {
    await runAnalysis({ id: analysis.dataset_id, columns: analysis.dataset_columns }, changes.config);
  }
  const allowed = ['name', 'description', 'visibility', 'config'].filter((f) => changes[f] !== undefined);
  if (allowed.length) {
    const params = new Params();
    const sets = allowed.map((f) => `${f} = ${params.add(f === 'config' ? JSON.stringify(changes[f]) : changes[f])}`);
    await query(`UPDATE analyses SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ${params.add(analysis.id)}`, params.values);
    await logActivity(user.id, 'ANALYSIS_UPDATE', changes.name || analysis.name);
  }
  return getAnalysis(analysis.id, user);
}

async function remove(analysis, user) {
  await query('DELETE FROM analyses WHERE id = $1', [analysis.id]);
  await logActivity(user.id, 'ANALYSIS_DELETE', analysis.name);
}

module.exports = { getAnalysis, getResult, preview, list, create, update, remove, SELECT_ANALYSIS };
