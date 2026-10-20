// The body of a dashboard: filter row on top, widgets below.
// When a filter changes, every widget is recomputed by the API.
// Used both inside the app and on the public page.
import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { Alert, Card, Loading, Select, Spinner } from '../ui';
import ChartView from '../charts/ChartView';
import { humanize } from '../../utils/format';

export default function DashboardBoard({ dashboard, filterOptions, loadData, filters, onFiltersChange }) {
  const [internalFilters, setInternalFilters] = useState(dashboard.defaultFilters || []);
  const current = filters ?? internalFilters;
  const setFilters = onFiltersChange ?? setInternalFilters;

  const { data, loading, error } = useApi(() => loadData(current), [dashboard.id, JSON.stringify(current), JSON.stringify(dashboard.widgets)]);

  const setFilter = (column, rawValue, type) => {
    const others = current.filter((f) => f.column !== column);
    if (rawValue === '') return setFilters(others);
    setFilters([...others, { column, value: type === 'number' ? Number(rawValue) : rawValue }]);
  };

  return (
    <div className="space-y-5">
      {filterOptions.length > 0 && (
        <Card className="flex flex-wrap items-end gap-4 p-4">
          {filterOptions.map((opt) => {
            const value = current.find((f) => f.column === opt.column)?.value ?? '';
            return (
              <label key={opt.column} className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">{humanize(opt.column)}</span>
                <Select className="w-56" value={value} onChange={(e) => setFilter(opt.column, e.target.value, opt.type)}>
                  <option value="">Not filtered</option>
                  {opt.values.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </Select>
              </label>
            );
          })}
          {loading && data && (
            <span className="mb-2.5 flex items-center gap-2 text-xs text-slate-500">
              <Spinner size="sm" /> Updating…
            </span>
          )}
        </Card>
      )}

      {error && <Alert>{error.message}</Alert>}
      {!data && loading && <Loading label="Computing the dashboard…" />}

      {data && !data.widgets.length && (
        <Card className="px-6 py-12 text-center text-sm text-slate-500">This dashboard has no widget yet.</Card>
      )}

      {data && (
        <div className={`grid gap-5 md:grid-cols-2 ${loading ? 'opacity-60' : ''}`}>
          {data.widgets.map((w, i) => (
            <Card key={`${w.analysisId}-${i}`} className={`min-w-0 p-5 ${w.size === 'full' ? 'md:col-span-2' : ''}`}>
              <h3 className="font-semibold text-slate-900">{w.name || 'Unavailable analysis'}</h3>
              {w.description && <p className="mt-0.5 text-xs text-slate-500">{w.description}</p>}
              <div className="mt-4">
                {w.error ? <p className="py-10 text-center text-sm text-slate-500">{w.error}</p> : <ChartView result={w.result} chart={w.chart} height={w.chart === 'kpi' ? undefined : 280} />}
              </div>
              {w.datasetTitle && <p className="mt-3 text-[11px] text-slate-400">Source: {w.datasetTitle}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
