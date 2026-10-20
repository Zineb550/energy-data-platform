// The analysis engine: turns an analysis configuration into ONE SQL query.
//
// Example config:
//   { metrics: [{ agg: 'avg', column: 'renewables_share_energy' }],
//     groupBy: 'year', filters: [{ column: 'country', op: 'eq', value: 'Morocco' }],
//     sort: 'label_asc', limit: 50 }
//
// becomes, roughly:
//   SELECT (data->>'year')::numeric AS label,
//          AVG((data->>'renewables_share_energy')::numeric) AS m0
//     FROM dataset_rows
//    WHERE dataset_id = 1 AND (data->>'country') = 'Morocco'
//    GROUP BY 1 ORDER BY 1 ASC LIMIT 50
//
// As in the explorer, column names and values are always SQL parameters.
const { query } = require('../config/db');
const AppError = require('../utils/AppError');
const { Params, getColumn, columnExpr, buildFilterSql } = require('./queryBuilder');
const { linearForecast } = require('./forecast');

const AGG_SQL = { sum: 'SUM', avg: 'AVG', min: 'MIN', max: 'MAX', count: 'COUNT' };
const AGG_LABEL = { sum: 'Sum', avg: 'Average', min: 'Minimum', max: 'Maximum', count: 'Count' };
const ORDER_SQL = {
  label_asc: '1 ASC',
  label_desc: '1 DESC',
  value_desc: '2 DESC NULLS LAST',
  value_asc: '2 ASC NULLS LAST',
};

const round = (v) => (v === null ? null : Math.round(Number(v) * 1000) / 1000);

function metricLabel(m) {
  return m.agg === 'count' && !m.column ? 'Number of rows' : `${AGG_LABEL[m.agg]} of ${m.column}`;
}

function metricExpr(m, columns, params) {
  if (m.agg === 'count' && !m.column) return 'COUNT(*)';
  const col = getColumn(columns, m.column);
  if (m.agg === 'count') return `COUNT(${columnExpr(col, params)})`;
  if (col.type !== 'number') throw new AppError(400, `"${m.column}" is not numeric: only "count" is possible`);
  return `${AGG_SQL[m.agg]}(${columnExpr(col, params)})`;
}

// Dashboard filters replace the analysis' own filters on the same column
// (e.g. the dashboard says country = Spain, the analysis said Morocco).
function mergeFilters(analysisFilters, extraFilters, columns) {
  const usable = (extraFilters || []).filter((f) => columns.some((c) => c.name === f.column));
  const overridden = new Set(usable.map((f) => f.column));
  return [...analysisFilters.filter((f) => !overridden.has(f.column)), ...usable];
}

async function runAnalysis(dataset, config, extraFilters = []) {
  const columns = dataset.columns;
  const params = new Params([dataset.id]);
  const filters = mergeFilters(config.filters || [], extraFilters, columns);

  const metricExprs = config.metrics.map((m) => metricExpr(m, columns, params));
  const where = ['dataset_id = $1', ...buildFilterSql(columns, filters, params)];

  let select;
  let groupSql = '';
  let groupCol = null;
  if (config.forecast) {
    const g = config.groupBy && getColumn(columns, config.groupBy);
    if (!g || g.type !== 'number') {
      throw new AppError(400, 'A forecast needs a grouping by a numeric time column, such as year');
    }
  }
  if (config.groupBy) {
    groupCol = getColumn(columns, config.groupBy);
    const groupExpr = columnExpr(groupCol, params);
    where.push(`${groupExpr} IS NOT NULL`);
    select = `${groupExpr} AS label`;
    groupSql = 'GROUP BY 1';
  } else {
    select = 'NULL AS label';
  }

  // Skip groups where every indicator is empty (e.g. a year with no data).
  const having = `HAVING COALESCE(${metricExprs.join(', ')}) IS NOT NULL`;
  // A forecast always works on the time series in chronological order.
  const sort = config.forecast ? 'label_asc' : config.sort;
  const order = config.groupBy ? `ORDER BY ${ORDER_SQL[sort] || ORDER_SQL.label_asc}` : '';
  const limit = params.add(config.groupBy ? config.limit : 1);

  const sql = `SELECT ${select}, ${metricExprs.map((e, i) => `${e} AS m${i}`).join(', ')}
                 FROM dataset_rows
                WHERE ${where.join(' AND ')}
                ${groupSql} ${having} ${order}
                LIMIT ${limit}`;

  const { rows } = await query(sql, params.values);

  const result = {
    groupBy: config.groupBy || null,
    groupType: groupCol?.type || null,
    metrics: config.metrics.map((m, i) => ({ key: `m${i}`, label: metricLabel(m), ...m })),
    appliedFilters: filters,
    rows: rows.map((r) => {
      const out = { label: groupCol?.type === 'number' ? Number(r.label) : r.label };
      config.metrics.forEach((_, i) => {
        out[`m${i}`] = round(r[`m${i}`]);
      });
      return out;
    }),
  };

  if (config.forecast) return linearForecast(result, config.forecast.periods);
  return result;
}

module.exports = { runAnalysis, mergeFilters, metricLabel };
