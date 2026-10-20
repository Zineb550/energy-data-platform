// Advanced feature 1: data quality score (0-100)
//
//   Completeness (50 pts) = share of cells that are filled
//   Uniqueness   (25 pts) = share of rows that are not exact duplicates
//   Consistency  (25 pts) = share of columns that are usable
//                           (not entirely empty, not a single constant value)
//
// The score comes with a grade (A-D) and concrete recommendations.
const { query } = require('../config/db');
const { Params } = require('./queryBuilder');

const pct = (part, total) => (total ? Math.round((part / total) * 1000) / 10 : 0);

function grade(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

async function getQuality(dataset) {
  const { columns } = dataset;

  // One query: missing values and distinct values for every column.
  const params = new Params([dataset.id]);
  const parts = columns.map((c, i) => {
    const key = params.add(c.name);
    return `COUNT(*) FILTER (WHERE data->>${key} IS NULL) AS miss${i}, COUNT(DISTINCT data->>${key}) AS dist${i}`;
  });
  const [{ rows: counts }, { rows: dup }] = await Promise.all([
    query(`SELECT COUNT(*)::int AS total, ${parts.join(', ')} FROM dataset_rows WHERE dataset_id = $1`, params.values),
    // Exact duplicates: rows whose whole content appears more than once.
    query(
      `SELECT COALESCE(SUM(n - 1), 0)::int AS duplicates
         FROM (SELECT COUNT(*) AS n FROM dataset_rows WHERE dataset_id = $1 GROUP BY data HAVING COUNT(*) > 1) t`,
      [dataset.id]
    ),
  ]);

  const total = counts[0].total;
  const duplicates = dup[0].duplicates;

  const perColumn = columns.map((c, i) => {
    const missing = Number(counts[0][`miss${i}`]);
    const distinct = Number(counts[0][`dist${i}`]);
    let issue = null;
    if (missing === total) issue = 'empty';
    else if (distinct === 1) issue = 'constant';
    else if (pct(missing, total) >= 50) issue = 'mostly empty';
    return { name: c.name, type: c.type, missing, missingPct: pct(missing, total), distinct, issue };
  });

  const totalCells = total * columns.length;
  const missingCells = perColumn.reduce((s, c) => s + c.missing, 0);
  const usableColumns = perColumn.filter((c) => c.issue !== 'empty' && c.issue !== 'constant').length;

  const completeness = totalCells ? 1 - missingCells / totalCells : 1;
  const uniqueness = total ? 1 - duplicates / total : 1;
  const consistency = columns.length ? usableColumns / columns.length : 1;
  const score = Math.round(completeness * 50 + uniqueness * 25 + consistency * 25);

  // Human-readable advice, most important first.
  const recommendations = [];
  perColumn
    .filter((c) => c.issue)
    .sort((a, b) => b.missingPct - a.missingPct)
    .forEach((c) => {
      if (c.issue === 'empty') recommendations.push(`Column "${c.name}" is completely empty: remove it.`);
      else if (c.issue === 'constant') recommendations.push(`Column "${c.name}" always has the same value: it brings no information.`);
      else recommendations.push(`Column "${c.name}" is ${c.missingPct}% empty: use it with care, or filter the empty rows out.`);
    });
  if (duplicates) recommendations.push(`${duplicates} row(s) are exact duplicates: they can distort sums and counts.`);
  if (!recommendations.length) recommendations.push('No problem detected. This dataset is ready for analysis.');

  return {
    score,
    grade: grade(score),
    rowCount: total,
    dimensions: [
      { key: 'completeness', label: 'Completeness', weight: 50, value: Math.round(completeness * 1000) / 10, detail: `${missingCells} missing cells out of ${totalCells}` },
      { key: 'uniqueness', label: 'Uniqueness', weight: 25, value: Math.round(uniqueness * 1000) / 10, detail: `${duplicates} duplicate rows` },
      { key: 'consistency', label: 'Consistency', weight: 25, value: Math.round(consistency * 1000) / 10, detail: `${usableColumns} usable columns out of ${columns.length}` },
    ],
    columns: perColumn,
    recommendations,
  };
}

module.exports = { getQuality };
