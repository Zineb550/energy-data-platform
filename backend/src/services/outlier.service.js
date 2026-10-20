// Advanced feature 2: outlier detection with the IQR method (Tukey's fences).
//
//   Q1 = 25th percentile, Q3 = 75th percentile, IQR = Q3 - Q1
//   a value is an outlier if it is below Q1 - 1.5 x IQR or above Q3 + 1.5 x IQR
//
// Robust: unlike mean ± 3 std, the quartiles are not pulled by the outliers themselves.
const { query } = require('../config/db');
const AppError = require('../utils/AppError');
const { getColumn } = require('./queryBuilder');

const round = (v) => (v === null ? null : Math.round(Number(v) * 1000) / 1000);

async function columnFences(datasetId, name) {
  const { rows } = await query(
    `WITH q AS (
       SELECT PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY (data->>$2)::numeric) AS q1,
              PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY (data->>$2)::numeric) AS q3,
              COUNT(data->>$2) AS n
         FROM dataset_rows WHERE dataset_id = $1
     )
     SELECT q1, q3, n, q1 - 1.5 * (q3 - q1) AS low, q3 + 1.5 * (q3 - q1) AS high,
            (SELECT COUNT(*) FROM dataset_rows
              WHERE dataset_id = $1 AND (data->>$2)::numeric < q.q1 - 1.5 * (q.q3 - q.q1)) AS below,
            (SELECT COUNT(*) FROM dataset_rows
              WHERE dataset_id = $1 AND (data->>$2)::numeric > q.q3 + 1.5 * (q.q3 - q.q1)) AS above
       FROM q`,
    [datasetId, name]
  );
  const r = rows[0];
  const n = Number(r.n);
  const outliers = Number(r.below) + Number(r.above);
  return {
    column: name,
    values: n,
    q1: round(r.q1),
    q3: round(r.q3),
    iqr: round(r.q3 - r.q1),
    lowerFence: round(r.low),
    upperFence: round(r.high),
    below: Number(r.below),
    above: Number(r.above),
    outliers,
    outlierPct: n ? Math.round((outliers / n) * 1000) / 10 : 0,
  };
}

// Summary for every numeric column.
async function summary(dataset) {
  const numeric = dataset.columns.filter((c) => c.type === 'number');
  return Promise.all(numeric.map((c) => columnFences(dataset.id, c.name)));
}

// Detail for one column: fences + the outlier rows, most extreme first.
async function detail(dataset, columnName, limit = 50) {
  const col = getColumn(dataset.columns, columnName);
  if (col.type !== 'number') throw new AppError(400, 'Outliers can only be computed on a numeric column');
  const fences = await columnFences(dataset.id, col.name);
  if (fences.lowerFence === null) return { ...fences, rows: [] };

  const median = (fences.q1 + fences.q3) / 2;
  const { rows } = await query(
    `SELECT row_index, data, (data->>$2)::numeric AS v
       FROM dataset_rows
      WHERE dataset_id = $1 AND ((data->>$2)::numeric < $3 OR (data->>$2)::numeric > $4)
      ORDER BY ABS((data->>$2)::numeric - $5) DESC
      LIMIT $6`,
    [dataset.id, col.name, fences.lowerFence, fences.upperFence, median, limit]
  );
  return {
    ...fences,
    rows: rows.map((r) => ({
      _row: r.row_index + 1,
      ...r.data,
      _direction: Number(r.v) > fences.upperFence ? 'high' : 'low',
    })),
  };
}

module.exports = { summary, detail };
