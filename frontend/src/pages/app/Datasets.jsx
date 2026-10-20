// List of datasets: mine, shared with me, or all.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { datasetsApi } from '../../api/datasets';
import { useApi, useDebounce } from '../../hooks/useApi';
import { Alert, Badge, Button, Card, EmptyState, Input, Loading, PageHeader, VisibilityBadge } from '../../components/ui';
import { formatDate, formatNumber } from '../../utils/format';

const SCOPES = [
  ['all', 'All'],
  ['mine', 'My datasets'],
  ['shared', 'Shared with me'],
];

export default function Datasets() {
  const [scope, setScope] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { data, loading, error } = useApi(() => datasetsApi.list({ scope, search: debouncedSearch }), [scope, debouncedSearch]);
  const datasets = data?.datasets || [];

  return (
    <>
      <PageHeader
        title="Datasets"
        subtitle="Import, explore and manage your data."
        actions={
          <Link to="/app/datasets/new">
            <Button>Import a CSV</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          {SCOPES.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setScope(key)}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium ${
                scope === key ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Input className="max-w-xs" placeholder="Search by title, description, category…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && <Alert>{error.message}</Alert>}
      {loading ? (
        <Loading />
      ) : !datasets.length ? (
        <EmptyState
          title="No dataset found"
          text={search ? 'Try another search.' : 'Import a CSV file to start exploring your data.'}
          action={
            !search && (
              <Link to="/app/datasets/new">
                <Button>Import a CSV</Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {datasets.map((d) => (
            <Link key={d.id} to={`/app/datasets/${d.id}`}>
              <Card className="h-full p-5 transition hover:border-brand-500 hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-slate-900">{d.title}</h3>
                  <VisibilityBadge visibility={d.visibility} />
                </div>
                {d.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{d.description}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Badge color="brand">{d.category}</Badge>
                  <span>{formatNumber(d.row_count)} rows</span>
                  <span>·</span>
                  <span>{d.column_count} columns</span>
                  <span>·</span>
                  <span>
                    by {d.owner_name}, {formatDate(d.created_at)}
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
