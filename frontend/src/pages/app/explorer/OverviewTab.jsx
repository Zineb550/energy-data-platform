// Automatic summary of the dataset: size, types, missing values, statistics.
import { datasetsApi } from '../../../api/datasets';
import { useApi } from '../../../hooks/useApi';
import { Alert, Card, Loading, StatCard, TypeBadge } from '../../../components/ui';
import { formatNumber, humanize } from '../../../utils/format';

export default function OverviewTab({ dataset }) {
  const { data, loading, error } = useApi(() => datasetsApi.stats(dataset.id), [dataset.id]);
  if (loading) return <Loading label="Computing statistics…" />;
  if (error) return <Alert>{error.message}</Alert>;

  const stats = data.stats;
  const numeric = stats.columns.filter((c) => c.type === 'number');
  const other = stats.columns.filter((c) => c.type !== 'number');

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Rows" value={formatNumber(stats.rowCount)} />
        <StatCard
          label="Columns"
          value={stats.columnCount}
          hint={Object.entries(stats.typeCounts)
            .map(([t, n]) => `${n} ${t}`)
            .join(' · ')}
        />
        <StatCard label="Missing cells" value={formatNumber(stats.missingCells)} hint={`${stats.missingPct}% of all cells`} />
        <StatCard
          label="Complete columns"
          value={stats.columns.filter((c) => c.missing === 0).length}
          hint="Columns without any missing value"
        />
      </div>

      {numeric.length > 0 && (
        <Card className="overflow-hidden">
          <h2 className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-900">Numeric columns</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  {['Column', 'Missing', 'Min', 'Max', 'Mean', 'Median', 'Std. dev.', 'Distinct'].map((h, i) => (
                    <th key={h} className={`px-4 py-2.5 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {numeric.map((c) => (
                  <tr key={c.name}>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{humanize(c.name)}</td>
                    <td className="px-4 py-2.5">
                      <MissingBar pct={c.missingPct} />
                    </td>
                    {[c.min, c.max, c.mean, c.median, c.std, c.distinct].map((v, i) => (
                      <td key={i} className="px-4 py-2.5 text-right tabular-nums">
                        {formatNumber(v, i < 4 ? c.name : undefined)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {other.length > 0 && (
        <Card className="overflow-hidden">
          <h2 className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-900">Text and date columns</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Column</th>
                  <th className="px-4 py-2.5 text-left font-medium">Type</th>
                  <th className="px-4 py-2.5 text-right font-medium">Missing</th>
                  <th className="px-4 py-2.5 text-right font-medium">Distinct</th>
                  <th className="px-4 py-2.5 text-left font-medium">Most frequent values</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {other.map((c) => (
                  <tr key={c.name}>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{humanize(c.name)}</td>
                    <td className="px-4 py-2.5">
                      <TypeBadge type={c.type} />
                    </td>
                    <td className="px-4 py-2.5">
                      <MissingBar pct={c.missingPct} />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(c.distinct)}</td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {c.topValues.map((t) => `${t.value} (${t.count})`).join(', ') || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// Small horizontal bar showing the % of missing values.
function MissingBar({ pct }) {
  const color = pct === 0 ? 'bg-brand-500' : pct < 20 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="ml-auto flex w-32 items-center justify-end gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }} />
      </div>
      <span className="w-12 text-right text-xs tabular-nums text-slate-600">{pct}%</span>
    </div>
  );
}
