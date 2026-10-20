// Build an analysis: choose indicators, grouping, filters and chart type,
// see the result live, then save it (private or shared).
//   /app/analyses/new?dataset=1   -> new analysis
//   /app/analyses/5               -> open a saved analysis
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { analysesApi } from '../../../api/analyses';
import { datasetsApi } from '../../../api/datasets';
import { useApi, useDebounce } from '../../../hooks/useApi';
import { Alert, Button, Card, Field, Input, Loading, PageHeader, Select, Spinner, Textarea, fieldError } from '../../../components/ui';
import ChartView from '../../../components/charts/ChartView';
import FilterBar, { FilterChips } from '../explorer/FilterBar';
import { humanize } from '../../../utils/format';

const AGGS = [
  ['avg', 'Average'],
  ['sum', 'Sum'],
  ['min', 'Minimum'],
  ['max', 'Maximum'],
  ['count', 'Count'],
];
const CHARTS = [
  ['bar', 'Bar'],
  ['line', 'Line'],
  ['pie', 'Pie'],
  ['kpi', 'KPI cards'],
  ['table', 'Table'],
];
const SORTS = [
  ['label_asc', 'Group A → Z / oldest first'],
  ['label_desc', 'Group Z → A / newest first'],
  ['value_desc', 'Highest value first'],
  ['value_asc', 'Lowest value first'],
];

const emptyConfig = (columns) => {
  const firstNumber = columns.find((c) => c.type === 'number');
  return {
    metrics: [firstNumber ? { agg: 'avg', column: firstNumber.name } : { agg: 'count', column: null }],
    groupBy: null,
    filters: [],
    sort: 'label_asc',
    limit: 20,
    chart: 'bar',
  };
};

export default function AnalysisBuilder() {
  const { id } = useParams();
  const isNew = !id;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [datasetId, setDatasetId] = useState(Number(searchParams.get('dataset')) || null);
  const [dataset, setDataset] = useState(null);
  const [config, setConfig] = useState(null);
  const [meta, setMeta] = useState({ name: '', description: '', visibility: 'private' });
  const [analysis, setAnalysis] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // Datasets the user can choose from (new analysis only).
  const { data: dsList } = useApi(() => (isNew ? datasetsApi.list({ scope: 'all' }) : Promise.resolve(null)), [isNew]);

  // Opening a saved analysis: load it and its dataset columns.
  useEffect(() => {
    if (isNew) return;
    analysesApi
      .get(id)
      .then(({ analysis }) => {
        setAnalysis(analysis);
        setDataset({ id: analysis.datasetId, title: analysis.datasetTitle, columns: analysis.datasetColumns });
        setConfig(analysis.config);
        setMeta({ name: analysis.name, description: analysis.description || '', visibility: analysis.visibility });
      })
      .catch(setLoadError);
  }, [id, isNew]);

  // New analysis: when a dataset is chosen, load its columns and start a default config.
  useEffect(() => {
    if (!isNew || !datasetId) return;
    datasetsApi
      .get(datasetId)
      .then(({ dataset }) => {
        setDataset(dataset);
        setConfig(emptyConfig(dataset.columns));
      })
      .catch(setLoadError);
  }, [datasetId, isNew]);

  if (loadError) return <Alert>{loadError.message}</Alert>;

  if (isNew && !datasetId) {
    return (
      <>
        <PageHeader title="New analysis" subtitle="Choose the dataset to analyze." />
        <Card className="max-w-lg p-6">
          <Field label="Dataset">
            <Select value="" onChange={(e) => setDatasetId(Number(e.target.value))}>
              <option value="" disabled>
                Choose a dataset…
              </option>
              {dsList?.datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </Select>
          </Field>
        </Card>
      </>
    );
  }

  if (!dataset || !config) return <Loading />;

  return (
    <>
      <Link to="/app/analyses" className="text-sm text-slate-500 hover:text-slate-800">
        ← Analyses
      </Link>
      <div className="mt-2">
        <PageHeader
          title={isNew ? 'New analysis' : meta.name}
          subtitle={
            <>
              Dataset:{' '}
              <Link to={`/app/datasets/${dataset.id}`} className="font-medium text-brand-700 hover:underline">
                {dataset.title}
              </Link>
              {analysis && !analysis.canEdit && <> · shared by {analysis.ownerName}: your changes can be saved as a copy</>}
            </>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <ConfigPanel columns={dataset.columns} config={config} setConfig={setConfig} />
        <div className="min-w-0 space-y-6">
          <Preview datasetId={dataset.id} config={config} />
          <SavePanel
            isNew={isNew}
            analysis={analysis}
            datasetId={dataset.id}
            config={config}
            meta={meta}
            setMeta={setMeta}
            onSaved={(a, created) => (created ? navigate(`/app/analyses/${a.id}`) : setAnalysis(a))}
            onDeleted={() => navigate('/app/analyses')}
          />
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Left column: the configuration form
// ---------------------------------------------------------------------------
function ConfigPanel({ columns, config, setConfig }) {
  const numeric = columns.filter((c) => c.type === 'number');
  const groupCol = columns.find((c) => c.name === config.groupBy);
  const canForecast = groupCol?.type === 'number';
  // Changing the grouping to something that cannot be forecast removes the forecast.
  const set = (patch) => {
    const next = { ...config, ...patch };
    const g = columns.find((c) => c.name === next.groupBy);
    if (next.forecast && (g?.type !== 'number' || next.chart !== 'line')) next.forecast = null;
    setConfig(next);
  };

  const setMetric = (i, patch) => {
    const metrics = config.metrics.map((m, j) => (j === i ? { ...m, ...patch } : m));
    set({ metrics });
  };
  const addMetric = () => set({ metrics: [...config.metrics, { agg: 'avg', column: numeric[0]?.name || null }] });
  const removeMetric = (i) => set({ metrics: config.metrics.filter((_, j) => j !== i) });

  return (
    <Card className="h-fit p-5">
      <div className="space-y-6">
        <Section title="1. Indicators" hint="What do you want to measure?">
          <div className="space-y-2">
            {config.metrics.map((m, i) => (
              <div key={i} className="flex gap-2">
                <Select
                  className="w-28 shrink-0"
                  value={m.agg}
                  onChange={(e) => setMetric(i, { agg: e.target.value, column: e.target.value === 'count' ? null : m.column || numeric[0]?.name })}
                >
                  {AGGS.map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </Select>
                <Select className="min-w-0" value={m.column || ''} onChange={(e) => setMetric(i, { column: e.target.value || null })}>
                  {m.agg === 'count' && <option value="">All rows</option>}
                  {(m.agg === 'count' ? columns : numeric).map((c) => (
                    <option key={c.name} value={c.name}>
                      {humanize(c.name)}
                    </option>
                  ))}
                </Select>
                {config.metrics.length > 1 && (
                  <button type="button" onClick={() => removeMetric(i)} className="cursor-pointer px-1 text-slate-400 hover:text-red-600" aria-label="Remove">
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {config.metrics.length < 4 && (
            <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={addMetric}>
              + Add an indicator
            </Button>
          )}
        </Section>

        <Section title="2. Group by" hint="One value per country, per year…">
          <Select value={config.groupBy || ''} onChange={(e) => set({ groupBy: e.target.value || null })}>
            <option value="">No grouping (one global value)</option>
            {columns.map((c) => (
              <option key={c.name} value={c.name}>
                {humanize(c.name)}
              </option>
            ))}
          </Select>
          {config.groupBy && (
            <div className="mt-2 grid grid-cols-[1fr_80px] gap-2">
              <Select value={config.sort} onChange={(e) => set({ sort: e.target.value })}>
                {SORTS.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                min={1}
                max={500}
                title="Maximum number of groups"
                value={config.limit}
                onChange={(e) => set({ limit: Math.min(500, Math.max(1, Number(e.target.value) || 1)) })}
              />
            </div>
          )}
        </Section>

        <Section title="3. Filters" hint="Keep only some rows.">
          <CompactFilterBar columns={columns} onAdd={(f) => set({ filters: [...config.filters, f] })} />
          <div className="mt-2">
            <FilterChips filters={config.filters} onRemove={(i) => set({ filters: config.filters.filter((_, j) => j !== i) })} />
            {!config.filters.length && <p className="text-xs text-slate-400">No filter: all rows are used.</p>}
          </div>
        </Section>

        <Section title="4. Visualization">
          <div className="grid grid-cols-3 gap-1.5">
            {CHARTS.map(([k, l]) => (
              <button
                type="button"
                key={k}
                onClick={() => set({ chart: k })}
                className={`cursor-pointer rounded-lg border px-2 py-2 text-xs font-medium ${
                  config.chart === k ? 'border-brand-700 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {config.chart === 'line' && !config.groupBy && <p className="mt-2 text-xs text-amber-700">A line chart needs a grouping (for example by year).</p>}
        </Section>

        <Section title="5. Forecast" hint="Extend the trend into the future (linear regression).">
          {canForecast ? (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="accent-brand-700"
                  checked={!!config.forecast}
                  onChange={(e) => set({ forecast: e.target.checked ? { periods: 5 } : null, chart: 'line', sort: 'label_asc' })}
                />
                Add a trend forecast
              </label>
              {config.forecast && (
                <Select className="w-28" value={config.forecast.periods} onChange={(e) => set({ forecast: { periods: Number(e.target.value) } })}>
                  {[1, 2, 3, 5, 6, 10].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'period' : 'periods'}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Available when grouping by a numeric time column such as year.</p>
          )}
        </Section>
      </div>
    </Card>
  );
}

function Section({ title, hint, children }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {hint && <p className="mb-2 text-xs text-slate-500">{hint}</p>}
      {!hint && <div className="mb-2" />}
      {children}
    </div>
  );
}

// The explorer filter bar, stacked to fit the narrow column.
function CompactFilterBar(props) {
  return (
    <div className="[&_form]:grid [&_form]:grid-cols-2 [&_form>*]:w-full [&_form>*:first-child]:col-span-2">
      <FilterBar {...props} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live preview: runs the configuration (without saving) after each change
// ---------------------------------------------------------------------------
function Preview({ datasetId, config }) {
  const debounced = useDebounce(config, 400);
  const { data, loading, error } = useApi(() => analysesApi.run(datasetId, debounced), [datasetId, JSON.stringify(debounced)]);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Result</h2>
        {loading && <Spinner size="sm" />}
      </div>
      {error ? (
        <Alert>{error.details?.[0]?.message || error.message}</Alert>
      ) : data ? (
        <div className={loading ? 'opacity-60' : ''}>
          <ChartView result={data.result} chart={config.chart} />
          {config.groupBy && data.result.rows.length === config.limit && (
            <p className="mt-2 text-xs text-slate-500">Showing the first {config.limit} groups. Increase the limit to see more.</p>
          )}
        </div>
      ) : (
        <Loading />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Save: name, description, visibility. Owner saves; others save a copy.
// ---------------------------------------------------------------------------
function SavePanel({ isNew, analysis, datasetId, config, meta, setMeta, onSaved, onDeleted }) {
  const [status, setStatus] = useState({});
  const canEdit = isNew || analysis?.canEdit;
  const onChange = (e) => setMeta({ ...meta, [e.target.name]: e.target.value });

  const save = async (asCopy = false) => {
    setStatus({ saving: true });
    try {
      if (isNew || asCopy) {
        const name = asCopy && !isNew ? `${meta.name} (copy)` : meta.name;
        const { analysis: created } = await analysesApi.create({ ...meta, name, datasetId, config });
        onSaved(created, true);
      } else {
        const { analysis: updated } = await analysesApi.update(analysis.id, { ...meta, config });
        onSaved(updated, false);
        setStatus({ success: 'Analysis saved.' });
      }
    } catch (error) {
      setStatus({ error });
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete the analysis "${analysis.name}"?`)) return;
    await analysesApi.remove(analysis.id);
    onDeleted();
  };

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-semibold text-slate-900">{canEdit ? 'Save the analysis' : 'Save a copy'}</h2>
      {status.success && <div className="mb-4"><Alert type="success">{status.success}</Alert></div>}
      {status.error && !status.error.details?.length && <div className="mb-4"><Alert>{status.error.message}</Alert></div>}
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <Field label="Name" error={fieldError(status.error, 'name')}>
          <Input name="name" value={meta.name} onChange={onChange} placeholder="e.g. Renewable share of Morocco" />
        </Field>
        <Field label="Visibility">
          <Select name="visibility" value={meta.visibility} onChange={onChange}>
            <option value="private">Private (only me)</option>
            <option value="shared">Shared with all users</option>
          </Select>
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Description (optional)">
          <Textarea name="description" rows={2} value={meta.description} onChange={onChange} />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {!isNew && canEdit && (
          <Button variant="danger" onClick={remove} className="mr-auto">
            Delete
          </Button>
        )}
        {!isNew && (
          <Button variant="secondary" onClick={() => save(true)} loading={status.saving}>
            Save as a copy
          </Button>
        )}
        {canEdit && (
          <Button onClick={() => save(false)} loading={status.saving}>
            {isNew ? 'Save analysis' : 'Save changes'}
          </Button>
        )}
      </div>
    </Card>
  );
}
