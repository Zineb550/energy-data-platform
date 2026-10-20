const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

// Years are shown as "2024", not "2,024".
export const isYearColumn = (name = '') => /^(year|annee|année)$/i.test(name);

export function formatValue(value, columnName) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return isYearColumn(columnName) ? String(value) : nf.format(value);
  return String(value);
}

export function formatNumber(value, columnName) {
  if (value === null || value === undefined) return '—';
  return isYearColumn(columnName) && Number.isInteger(value) ? String(value) : nf.format(value);
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// "renewables_share_energy" -> "Renewables share energy"
export function humanize(name) {
  const s = String(name).replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
