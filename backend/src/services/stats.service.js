// Automatic description of a dataset (section 5 of the subject):
// rows, columns, types, missing values and descriptive statistics.
// All calculations run in PostgreSQL, close to the data.
const { query } = require('../config/db');

const round = (v, digits = 2) => (v === null || v === undefined ? null : Number(Number(v).toFixed(digits)));

async function numberColumnStats(datasetId, name) {
  const { rows } = await query(
    `SELECT COUNT(*) FILTER (WHERE data->>$2 IS NULL)::int                         AS missing,
            COUNT(DISTINCT data->>$2)::int                                        AS distinct_count,
            MIN((data->>$2)::numeric)                                              AS min,
            MAX((data->>$2)::numeric)                                              AS max,
            AVG((data->>$2)::numeric)                                              AS mean,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY (data->>$2)::numeric)      AS median,
            STDDEV_SAMP((data->>$2)::numeric)                                      AS std
       FROM dataset_rows WHERE dataset_id = $1`,
    [datasetId, name]
  );
  const s = rows[0];
  return {
    missing: s.missing,
    distinct: s.distinct_count,
    min: round(s.min),
    max: round(s.max),
    mean: round(s.mean),
    median: round(s.median),
    std: round(s.std),
  };
}

async function textColumnStats(datasetId, name) {
  const [summary, top] = await Promise.all([
    query(
      `SELECT COUNT(*) FILTER (WHERE data->>$2 IS NULL)::int AS missing,
              COUNT(DISTINCT data->>$2)::int                AS distinct_count,
              MIN(data->>$2) AS min, MAX(data->>$2) AS max
         FROM dataset_rows WHERE dataset_id = $1`,
      [datasetId, name]
    ),
    query(
      `SELECT data->>$2 AS value, COUNT(*)::int AS count
         FROM dataset_rows WHERE dataset_id = $1 AND data->>$2 IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 5`,
      [datasetId, name]
    ),
  ]);
  const s = summary.rows[0];
  return { missing: s.missing, distinct: s.distinct_count, min: s.min, max: s.max, topValues: top.rows };
}

async function getDatasetStats(dataset) {
  const total = dataset.row_count;
  const columns = await Promise.all(
    dataset.columns.map(async (col) => {
      const stats =
        col.type === 'number'
          ? await numberColumnStats(dataset.id, col.name)
          : await textColumnStats(dataset.id, col.name);
      return {
        name: col.name,
        type: col.type,
        ...stats,
        missingPct: total ? round((stats.missing / total) * 100, 1) : 0,
      };
    })
  );

  const missingCells = columns.reduce((sum, c) => sum + c.missing, 0);
  const totalCells = total * columns.length;
  const typeCounts = columns.reduce((acc, c) => ({ ...acc, [c.type]: (acc[c.type] || 0) + 1 }), {});

  return {
    rowCount: total,
    columnCount: columns.length,
    typeCounts,
    missingCells,
    missingPct: totalCells ? round((missingCells / totalCells) * 100, 1) : 0,
    columns,
  };
}

module.exports = { getDatasetStats };
