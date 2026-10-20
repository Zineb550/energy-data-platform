// Turns filters coming from the UI into a safe SQL WHERE clause.
//
// Every row is stored as JSONB, so a column is read with  data->>'column'.
// Safety: the column name is (1) checked against the dataset's known columns
// and (2) sent as a SQL parameter ($n), like every value. No user text is
// ever pasted into the SQL string, so SQL injection is impossible.
const AppError = require('../utils/AppError');

const NUMERIC_OPS = { eq: '=', neq: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' };

// Small helper that numbers parameters automatically: p.add(value) -> "$3"
class Params {
  constructor(initial = []) {
    this.values = [...initial];
  }
  add(value) {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

function getColumn(columns, name) {
  const col = columns.find((c) => c.name === name);
  if (!col) throw new AppError(400, `Unknown column: ${name}`);
  return col;
}

// SQL expression reading a column with the right type.
function columnExpr(col, params) {
  const key = params.add(col.name);
  return col.type === 'number' ? `(data->>${key})::numeric` : `(data->>${key})`;
}

function buildFilterSql(columns, filters, params) {
  return filters.map((f) => {
    const col = getColumn(columns, f.column);
    const expr = columnExpr(col, params);

    if (f.op === 'contains') {
      return `${expr}::text ILIKE ${params.add(`%${f.value}%`)}`;
    }
    if (col.type === 'number') {
      const num = Number(f.value);
      if (Number.isNaN(num)) throw new AppError(400, `"${f.column}" expects a number`);
      return `${expr} ${NUMERIC_OPS[f.op]} ${params.add(num)}`;
    }
    if (f.op === 'neq') return `${expr} IS DISTINCT FROM ${params.add(String(f.value))}`;
    return `${expr} ${NUMERIC_OPS[f.op]} ${params.add(String(f.value))}`;
  });
}

// Full-text search on every column of the row.
function buildSearchSql(search, params) {
  return `EXISTS (SELECT 1 FROM jsonb_each_text(data) kv WHERE kv.value ILIKE ${params.add(`%${search}%`)})`;
}

module.exports = { Params, getColumn, columnExpr, buildFilterSql, buildSearchSql };
