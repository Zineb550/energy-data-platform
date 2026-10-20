// Business logic of datasets: import, list, read rows, edit, delete.
const { query, withTransaction } = require('../config/db');
const AppError = require('../utils/AppError');
const { parseCsv } = require('./csv.service');
const { logActivity } = require('./activity.service');
const { Params, getColumn, columnExpr, buildFilterSql, buildSearchSql } = require('./queryBuilder');

const INSERT_BATCH = 2000;

// ---------------------------------------------------------------
// Access rules
//   owner  -> everything
//   admin  -> everything (supervision)
//   others -> read only, and only if the dataset is "shared"
// ---------------------------------------------------------------
async function getDatasetForUser(id, user, { write = false } = {}) {
  const { rows } = await query(
    `SELECT d.*, u.name AS owner_name
       FROM datasets d JOIN users u ON u.id = d.owner_id
      WHERE d.id = $1`,
    [id]
  );
  const dataset = rows[0];
  if (!dataset) throw new AppError(404, 'Dataset not found');

  const isOwner = dataset.owner_id === user.id;
  const isAdmin = user.role === 'admin';
  const canRead = isOwner || isAdmin || dataset.visibility === 'shared';
  const canWrite = isOwner || isAdmin;

  if (!canRead || (write && !canWrite)) {
    throw new AppError(403, 'You do not have access to this dataset');
  }
  return { ...dataset, can_edit: canWrite };
}

// Inserts rows in batches: one SQL statement per 2,000 rows instead of one per row.
async function insertRows(client, datasetId, rows) {
  for (let start = 0; start < rows.length; start += INSERT_BATCH) {
    const batch = rows.slice(start, start + INSERT_BATCH);
    await client.query(
      `INSERT INTO dataset_rows (dataset_id, row_index, data)
       SELECT $1, $2 + t.ord - 1, t.value
         FROM jsonb_array_elements($3::jsonb) WITH ORDINALITY AS t(value, ord)`,
      [datasetId, start, JSON.stringify(batch)]
    );
  }
}

async function createFromCsv(user, meta, fileBuffer) {
  const { columns, rows } = parseCsv(fileBuffer);

  const dataset = await withTransaction(async (client) => {
    const { rows: created } = await client.query(
      `INSERT INTO datasets (owner_id, title, description, category, source, visibility, columns, row_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [user.id, meta.title, meta.description, meta.category, meta.source, meta.visibility, JSON.stringify(columns), rows.length]
    );
    await insertRows(client, created[0].id, rows);
    return created[0];
  });

  await logActivity(user.id, 'DATASET_IMPORT', dataset.title);
  return dataset;
}

// "mine" = my datasets, "shared" = shared by others, "all" = both
async function list(user, { scope = 'all', search = '' } = {}) {
  const params = new Params([user.id]);
  const where = [];
  if (scope === 'mine') where.push('d.owner_id = $1');
  else if (scope === 'shared') where.push("d.owner_id <> $1 AND d.visibility = 'shared'");
  else where.push("(d.owner_id = $1 OR d.visibility = 'shared')");

  if (search) {
    const p = params.add(`%${search}%`);
    where.push(`(d.title ILIKE ${p} OR d.description ILIKE ${p} OR d.category ILIKE ${p})`);
  }

  const { rows } = await query(
    `SELECT d.id, d.title, d.description, d.category, d.source, d.row_count, d.visibility,
            jsonb_array_length(d.columns) AS column_count, d.created_at, d.updated_at,
            d.owner_id, u.name AS owner_name
       FROM datasets d JOIN users u ON u.id = d.owner_id
      WHERE ${where.join(' AND ')}
      ORDER BY d.created_at DESC`,
    params.values
  );
  return rows;
}

// Paginated, searchable, filterable, sortable rows (the explorer table).
async function getRows(dataset, { page, pageSize, search, sortBy, sortDir, filters }) {
  const params = new Params([dataset.id]);
  const where = ['dataset_id = $1', ...buildFilterSql(dataset.columns, filters, params)];
  if (search) where.push(buildSearchSql(search, params));
  const whereSql = where.join(' AND ');

  let orderSql = 'row_index ASC';
  if (sortBy) {
    const col = getColumn(dataset.columns, sortBy);
    const dir = sortDir === 'desc' ? 'DESC' : 'ASC'; // whitelisted, never user text
    orderSql = `${columnExpr(col, params)} ${dir} NULLS LAST, row_index ASC`;
  }

  // Count query uses only the WHERE parameters (no sort parameter).
  const countParams = new Params([dataset.id]);
  const countWhere = ['dataset_id = $1', ...buildFilterSql(dataset.columns, filters, countParams)];
  if (search) countWhere.push(buildSearchSql(search, countParams));

  const limit = params.add(pageSize);
  const offset = params.add((page - 1) * pageSize);

  const [data, count] = await Promise.all([
    query(
      `SELECT row_index, data FROM dataset_rows WHERE ${whereSql} ORDER BY ${orderSql} LIMIT ${limit} OFFSET ${offset}`,
      params.values
    ),
    query(`SELECT COUNT(*)::int AS total FROM dataset_rows WHERE ${countWhere.join(' AND ')}`, countParams.values),
  ]);

  const total = count.rows[0].total;
  return {
    rows: data.rows.map((r) => ({ _row: r.row_index + 1, ...r.data })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

async function update(dataset, user, changes) {
  const fields = ['title', 'description', 'category', 'source', 'visibility'].filter((f) => changes[f] !== undefined);
  if (!fields.length) return dataset;

  const params = new Params();
  const sets = fields.map((f) => `${f} = ${params.add(changes[f])}`); // f comes from the fixed list above
  const id = params.add(dataset.id);
  const { rows } = await query(
    `UPDATE datasets SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ${id} RETURNING *`,
    params.values
  );
  await logActivity(user.id, 'DATASET_UPDATE', rows[0].title);
  return rows[0];
}

async function remove(dataset, user) {
  await query('DELETE FROM datasets WHERE id = $1', [dataset.id]); // rows, analyses deleted by CASCADE
  await logActivity(user.id, 'DATASET_DELETE', dataset.title);
}

module.exports = { getDatasetForUser, createFromCsv, list, getRows, update, remove, insertRows };
