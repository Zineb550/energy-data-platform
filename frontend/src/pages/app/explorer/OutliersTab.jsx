// Advanced feature 2: outlier detection (IQR method) on numeric columns.
import { useState } from 'react';
import { datasetsApi } from '../../../api/datasets';
import { useApi } from '../../../hooks/useApi';
import { Alert, Badge, Card, Loading } from '../../../components/ui';
import { formatNumber, formatValue, humanize, isYearColumn } from '../../../utils/format';

export default function OutliersTab({ dataset }) {
  const { data, loading, error } = useApi(() => datasetsApi.outliers(dataset.id), [dataset.id]);
  const [selected, setSelected] = useState(null);

  if (loading) return <Loading label="Looking for outliers…" />;
  if (error) return <Alert>{error.message}</Alert>;

  const columns = data.columns.filter((c) => !isYearColumn(c.column));
  const current = selected || columns.slice().sort((a, b) => b.outliers - a.outliers)[0]?.column;

  if (!columns.length) return <Alert type="info">This dataset has no numeric column.</Alert>;

  return (
    <div className="space-y-6">
      <Card className="p-5 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Method: interquartile range (IQR)</p>
        <p className="mt-1">
          For each numeric column, Q1 and Q3 are the 25th and 75th percentiles and IQR = Q3 − Q1. A value is flagged
          as an outlier if it is <b>below Q1 − 1.5 × IQR</b> or <b>above Q3 + 1.5 × IQR</b>. Quartiles are not pulled by
          extreme values, so the method stays reliable even when outliers are present.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <h2 className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-900">Outliers per column</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                {['Column', 'Q1', 'Q3', 'Lower fence', 'Upper fence', 'Outliers', ''].map((h, i) => (
                  <th key={i} className={`px-4 py-2.5 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {columns.map((c) => (
                <tr
                  key={c.column}
                  onClick={() => setSelected(c.column)}
                  className={`cursor-pointer ${current === c.column ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                >
                  <td className="px-4 py-2.5 font-medium text-slate-800">{humanize(c.column)}</td>
                  {[c.q1, c.q3, c.lowerFence, c.upperFence].map((v, i) => (
                    <td key={i} className="px-4 py-2.5 text-right tabular-nums">
                      {formatNumber(v)}
                    </td>
                  ))}
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatNumber(c.outliers)} <span className="text-xs text-slate-400">({c.outlierPct}%)</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs font-medium text-brand-700">{current === c.column ? 'Shown below' : 'Show'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {current && <OutlierDetail key={current} dataset={dataset} column={current} />}
    </div>
  );
}

function OutlierDetail({ dataset, column }) {
  const { data, loading, error } = useApi(() => datasetsApi.outliers(dataset.id, column), [dataset.id, column]);
  if (loading) return <Loading />;
  if (error) return <Alert>{error.message}</Alert>;

  const d = data.detail;
  // Columns that identify a row (country, year...) + the analysed column.
  const idColumns = dataset.columns.filter((c) => c.type !== 'number' || isYearColumn(c.name)).slice(0, 3);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold text-slate-900">Most extreme values of “{humanize(column)}”</h2>
        <p className="text-xs text-slate-500">
          Normal range: {formatNumber(d.lowerFence)} to {formatNumber(d.upperFence)} · {formatNumber(d.below)} below ·{' '}
          {formatNumber(d.above)} above{d.outliers > d.rows.length ? ` · showing the ${d.rows.length} furthest` : ''}
        </p>
      </div>
      {d.rows.length ? (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">#</th>
                {idColumns.map((c) => (
                  <th key={c.name} className="px-4 py-2.5 text-left font-medium">
                    {humanize(c.name)}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right font-medium">{humanize(column)}</th>
                <th className="px-4 py-2.5 text-right font-medium">Side</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.rows.map((r) => (
                <tr key={r._row}>
                  <td className="px-4 py-2 text-xs text-slate-400">{r._row}</td>
                  {idColumns.map((c) => (
                    <td key={c.name} className="px-4 py-2 text-slate-700">
                      {formatValue(r[c.name], c.name) ?? '—'}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-medium tabular-nums text-slate-900">{formatNumber(r[column])}</td>
                  <td className="px-4 py-2 text-right">
                    <Badge color={r._direction === 'high' ? 'red' : 'blue'}>{r._direction === 'high' ? '↑ too high' : '↓ too low'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-10 text-center text-sm text-slate-500">No outlier in this column.</p>
      )}
    </Card>
  );
}
