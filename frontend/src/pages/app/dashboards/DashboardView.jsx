// One dashboard: view it with its filters, and (owner) edit it.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { dashboardsApi } from '../../../api/dashboards';
import { analysesApi } from '../../../api/analyses';
import { useApi } from '../../../hooks/useApi';
import { Alert, Button, Card, Field, Input, Loading, PageHeader, Select, Textarea, VisibilityBadge, fieldError } from '../../../components/ui';
import DashboardBoard from '../../../components/dashboard/DashboardBoard';
import { humanize, isYearColumn } from '../../../utils/format';

export default function DashboardView() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const editing = searchParams.get('edit') === '1';
  const { data, loading, error, setData } = useApi(() => dashboardsApi.get(id), [id]);
  const [filters, setFilters] = useState(null);

  // Start with the dashboard's default filters.
  useEffect(() => {
    if (data && filters === null) setFilters(data.dashboard.defaultFilters || []);
  }, [data, filters]);

  if (loading && !data) return <Loading />;
  if (error) return <Alert>{error.message}</Alert>;

  const { dashboard, filterOptions } = data;
  const setEditing = (on) => setSearchParams(on ? { edit: '1' } : {});

  return (
    <>
      <Link to="/app/dashboards" className="text-sm text-slate-500 hover:text-slate-800">
        ← Dashboards
      </Link>
      <div className="mt-2">
        <PageHeader
          title={dashboard.name}
          subtitle={dashboard.description}
          actions={
            <>
              {dashboard.visibility === 'public' && <PublicLinkButton slug={dashboard.publicSlug} />}
              {dashboard.canEdit && !editing && <Button onClick={() => setEditing(true)}>Edit</Button>}
            </>
          }
        />
      </div>
      <div className="-mt-3 mb-5 flex items-center gap-2 text-xs text-slate-500">
        <VisibilityBadge visibility={dashboard.visibility} /> by {dashboard.ownerName}
      </div>

      {editing && dashboard.canEdit && (
        <DashboardEditor
          dashboard={dashboard}
          currentFilters={filters || []}
          onSaved={(fresh) => {
            setData(fresh);
            setFilters(fresh.dashboard.defaultFilters || []);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      {filters !== null && (
        <DashboardBoard
          dashboard={dashboard}
          filterOptions={filterOptions}
          filters={filters}
          onFiltersChange={setFilters}
          loadData={(f) => dashboardsApi.data(dashboard.id, f)}
        />
      )}
    </>
  );
}

function PublicLinkButton({ slug }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/p/${slug}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Public link:', url);
    }
  };
  return (
    <>
      <a href={`/p/${slug}`} target="_blank" rel="noreferrer">
        <Button variant="secondary">Open public page</Button>
      </a>
      <Button variant="secondary" onClick={copy}>
        {copied ? 'Link copied' : 'Copy public link'}
      </Button>
    </>
  );
}

// ---------------------------------------------------------------------------
// Editor: information, widgets (add, order, size, remove) and filters
// ---------------------------------------------------------------------------
function DashboardEditor({ dashboard, currentFilters, onSaved, onCancel }) {
  const navigate = useNavigate();
  const { data: analysesData } = useApi(() => analysesApi.list({ scope: 'all' }), []);
  const analyses = analysesData?.analyses || [];
  const byId = new Map(analyses.map((a) => [a.id, a]));

  const [form, setForm] = useState({
    name: dashboard.name,
    description: dashboard.description || '',
    visibility: dashboard.visibility,
  });
  const [widgets, setWidgets] = useState(dashboard.widgets);
  const [filterColumns, setFilterColumns] = useState(dashboard.filterColumns);
  const [keepFilters, setKeepFilters] = useState(true);
  const [toAdd, setToAdd] = useState('');
  const [status, setStatus] = useState({});

  // Columns that can be used as filters: text and date columns of the widgets' datasets,
  // plus "year" (numeric columns like population would make useless drop-downs).
  const availableColumns = [
    ...new Set(
      widgets.flatMap((w) =>
        (byId.get(w.analysisId)?.dataset_columns || [])
          .filter((c) => c.type !== 'number' || isYearColumn(c.name))
          .map((c) => c.name)
      )
    ),
  ];

  const move = (i, delta) => {
    const next = [...widgets];
    const [w] = next.splice(i, 1);
    next.splice(i + delta, 0, w);
    setWidgets(next);
  };
  const toggleSize = (i) => setWidgets(widgets.map((w, j) => (j === i ? { ...w, size: w.size === 'full' ? 'half' : 'full' } : w)));
  const removeWidget = (i) => setWidgets(widgets.filter((_, j) => j !== i));
  const addWidget = () => {
    if (!toAdd) return;
    setWidgets([...widgets, { analysisId: Number(toAdd), size: 'half' }]);
    setToAdd('');
  };
  const toggleFilterColumn = (name) =>
    setFilterColumns(filterColumns.includes(name) ? filterColumns.filter((c) => c !== name) : [...filterColumns, name]);

  const save = async () => {
    setStatus({ saving: true });
    try {
      const defaultFilters = keepFilters ? currentFilters.filter((f) => filterColumns.includes(f.column)) : [];
      await dashboardsApi.update(dashboard.id, { ...form, widgets, filterColumns, defaultFilters });
      onSaved(await dashboardsApi.get(dashboard.id));
    } catch (error) {
      setStatus({ error });
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete the dashboard "${dashboard.name}"?`)) return;
    await dashboardsApi.remove(dashboard.id);
    navigate('/app/dashboards');
  };

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <Card className="mb-6 border-brand-200 p-6">
      <h2 className="font-semibold text-slate-900">Edit dashboard</h2>
      {status.error && (
        <div className="mt-3">
          <Alert>{status.error.details?.[0]?.message || status.error.message}</Alert>
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_220px]">
        <Field label="Name" error={fieldError(status.error, 'name')}>
          <Input name="name" value={form.name} onChange={onChange} />
        </Field>
        <Field label="Visibility" hint={form.visibility === 'public' ? 'Anyone with the link can view it, without an account.' : undefined}>
          <Select name="visibility" value={form.visibility} onChange={onChange}>
            <option value="private">Private (only me)</option>
            <option value="shared">Shared with all users</option>
            <option value="public">Public (link for visitors)</option>
          </Select>
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Description">
          <Textarea name="description" rows={2} value={form.description} onChange={onChange} />
        </Field>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Widgets</p>
          <p className="mb-2 text-xs text-slate-500">Saved analyses shown on the dashboard, in this order.</p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {widgets.map((w, i) => (
              <li key={`${w.analysisId}-${i}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-slate-800">{byId.get(w.analysisId)?.name || `Analysis #${w.analysisId}`}</span>
                <Button size="sm" variant="ghost" onClick={() => toggleSize(i)} title="Width">
                  {w.size === 'full' ? 'Full width' : 'Half width'}
                </Button>
                <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                  ↑
                </Button>
                <Button size="sm" variant="ghost" disabled={i === widgets.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                  ↓
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeWidget(i)} aria-label="Remove">
                  ×
                </Button>
              </li>
            ))}
            {!widgets.length && <li className="px-3 py-4 text-center text-sm text-slate-500">No widget yet.</li>}
          </ul>
          <div className="mt-2 flex gap-2">
            <Select value={toAdd} onChange={(e) => setToAdd(e.target.value)}>
              <option value="">Add an analysis…</option>
              {analyses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.owner_name}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={addWidget} disabled={!toAdd}>
              Add
            </Button>
          </div>
          {!analyses.length && analysesData && (
            <p className="mt-2 text-xs text-slate-500">
              No saved analysis yet. <Link to="/app/analyses/new" className="text-brand-700 hover:underline">Create one first.</Link>
            </p>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-900">Filters for viewers</p>
          <p className="mb-2 text-xs text-slate-500">Each chosen column becomes a drop-down that updates every widget (max 4).</p>
          {availableColumns.length ? (
            <div className="flex flex-wrap gap-2">
              {availableColumns.map((c) => (
                <label
                  key={c}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                    filterColumns.includes(c) ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <input type="checkbox" className="accent-brand-700" checked={filterColumns.includes(c)} onChange={() => toggleFilterColumn(c)} />
                  {humanize(c)}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Add widgets to choose filters.</p>
          )}
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="accent-brand-700" checked={keepFilters} onChange={(e) => setKeepFilters(e.target.checked)} />
            Use the filters currently selected below as the default view
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
        <Button variant="danger" className="mr-auto" onClick={remove}>
          Delete dashboard
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={save} loading={status.saving}>
          Save dashboard
        </Button>
      </div>
    </Card>
  );
}
