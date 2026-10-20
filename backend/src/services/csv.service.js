// Parses a CSV file and detects the type of each column.
//   number : 12, -3.5, 1e6
//   number : also "120,5" (French decimal comma)
//   date   : 2024-05, 2024-05-01, 2024-05-01T10:00, 01/05/2024
//   text   : anything else
// Values are converted to their type, and empty cells become null,
// so later calculations (sum, average...) work directly in SQL.
const Papa = require('papaparse');
const AppError = require('../utils/AppError');

const MAX_ROWS = 200000;
const MAX_COLUMNS = 100;
const EMPTY_VALUES = new Set(['', 'na', 'n/a', 'nan', 'null', 'none', '-']);

const NUMBER_RE = /^-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i;
const COMMA_DECIMAL_RE = /^-?\d+,\d+$/; // French style "120,5"
const ISO_DATE_RE = /^\d{4}-\d{2}(-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?)?$/; // 2024-05, 2024-05-01, 2024-05-01 10:00
const FR_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const isEmpty = (v) => v === undefined || v === null || EMPTY_VALUES.has(String(v).trim().toLowerCase());

function detectType(values) {
  const filled = values.filter((v) => !isEmpty(v)).map((v) => String(v).trim());
  if (filled.length === 0) return 'text';
  if (filled.every((v) => NUMBER_RE.test(v) || COMMA_DECIMAL_RE.test(v))) return 'number';
  if (filled.every((v) => ISO_DATE_RE.test(v) || FR_DATE_RE.test(v))) return 'date';
  return 'text';
}

function convert(value, type) {
  if (isEmpty(value)) return null;
  const v = String(value).trim();
  if (type === 'number') return Number(v.replace(',', '.'));
  if (type === 'date') {
    const fr = v.match(FR_DATE_RE);
    return fr ? `${fr[3]}-${fr[2]}-${fr[1]}` : v.replace(' ', 'T'); // always ISO, so text sorting = date sorting
  }
  return v;
}

// Gives every column a clean, unique, non-empty name.
function cleanHeaders(headers) {
  const seen = new Map();
  return headers.map((h, i) => {
    let name = String(h || '').replace(/^﻿/, '').trim() || `column_${i + 1}`;
    const count = seen.get(name) || 0;
    seen.set(name, count + 1);
    if (count > 0) name = `${name}_${count + 1}`;
    return name;
  });
}

function parseCsv(buffer) {
  const text = buffer.toString('utf8');
  const parsed = Papa.parse(text, { skipEmptyLines: 'greedy' });
  // Papaparse auto-detects the delimiter (comma, semicolon, tab).

  if (!parsed.data.length || parsed.data.length < 2) {
    throw new AppError(400, 'The file must contain a header line and at least one data line');
  }

  const [rawHeaders, ...lines] = parsed.data;
  if (rawHeaders.length > MAX_COLUMNS) throw new AppError(400, `Too many columns (max ${MAX_COLUMNS})`);
  if (lines.length > MAX_ROWS) throw new AppError(400, `Too many rows (max ${MAX_ROWS})`);

  const headers = cleanHeaders(rawHeaders);
  const columns = headers.map((name, i) => ({
    name,
    type: detectType(lines.map((line) => line[i])),
  }));

  const rows = lines.map((line) => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col.name] = convert(line[i], col.type);
    });
    return obj;
  });

  return { columns, rows };
}

module.exports = { parseCsv, detectType };
