// List of saved analyses: mine, or shared with me by other users.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { analysesApi } from '../../../api/analyses';
import { useApi } from '../../../hooks/useApi';
import { Alert, Badge, Button, Card, EmptyState, Loading, PageHeader, VisibilityBadge } from '../../../components/ui';
import { metricName } from '../../../components/charts/ChartView';
import { formatDate, humanize } from '../../../utils/format';

const SCOPES = [
  ['all', 'All'],
  ['mine', 'My analyses'],
  ['shared', 'Shared with me'],
];
const CHART_LABELS = { bar: 'Bar chart', line: 'Line chart', pie: 'Pie chart', kpi: 'KPI cards', table: 'Table' };

export function ScopeTabs({ scopes, value, onChange }) {
  return (
    <div className="flex w-fit rounded-lg border border-slate-200 bg-white p-1">
      {scopes.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium ${value === key ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function Analyses() {
  const [scope, setScope] = useState('all');
  const { data, loading, error } = useApi(() => analysesApi.list({ scope }), [scope]);
  const analyses = data?.analyses || [];

  return (
    <>
      <PageHeader
        title="Analyses"
        subtitle="Indicators computed on your datasets, ready to be added to dashboards."
        actions={
          <Link to="/app/analyses/new">
            <Button>New analysis</Button>
          </Link>
        }
      />
      <div className="mb-4">
        <ScopeTabs scopes={SCOPES} value={scope} onChange={setScope} />
      </div>

      {error && <Alert>{error.message}</Alert>}
      {loading ? (
        <Loading />
      ) : !analyses.length ? (
        <EmptyState
          title="No analysis yet"
          text="Open a dataset and build your first indicator."
          action={
            <Link to="/app/analyses/new">
              <Button>New analysis</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {analyses.map((a) => (
            <Link key={a.id} to={`/app/analyses/${a.id}`}>
              <Card className="h-full p-5 transition hover:border-brand-500 hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-slate-900">{a.name}</h3>
                  <VisibilityBadge visibility={a.visibility} />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {a.config.metrics.map(metricName).join(', ')}
                  {a.config.groupBy && <> · by {humanize(a.config.groupBy)}</>}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Badge color="blue">{CHART_LABELS[a.config.chart]}</Badge>
                  <span>{a.dataset_title}</span>
                  <span>·</span>
                  <span>
                    by {a.owner_name}, {formatDate(a.updated_at)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
