// Draws the result of an analysis as a bar, line or pie chart, KPI cards or a table.
// The same component is used in the analysis builder and in dashboards.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber, humanize } from '../../utils/format';

// Categorical colours, always used in this order (validated for colour-blind readers).
export const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const OTHER_COLOR = '#a8a29e';
const AXIS = { stroke: '#94a3b8', fontSize: 12, tickLine: false };
// Tooltip text stays in neutral ink; the coloured square carries the series identity.
const legendText = (value) => <span style={{ color: '#334155' }}>{value}</span>;
const TOOLTIP = {
  contentStyle: { borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 },
  itemStyle: { color: '#334155' },
  labelStyle: { color: '#0f172a', fontWeight: 600 },
};

const AGG_LABELS = { sum: 'Total', avg: 'Average', min: 'Minimum', max: 'Maximum', count: 'Count' };
export const metricName = (m) => (m.agg === 'count' && !m.column ? 'Number of rows' : `${AGG_LABELS[m.agg]} ${humanize(m.column)}`);

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const formatTick = (v) => (typeof v === 'number' ? compact.format(v) : v);

export default function ChartView({ result: rawResult, chart, height = 320 }) {
  if (!rawResult) return null;
  // Forecast points are only drawn on line charts.
  const result =
    rawResult.forecast && chart !== 'line' ? { ...rawResult, rows: rawResult.rows.filter((r) => !r.forecast) } : rawResult;
  if (!result.rows.length) {
    return (
      <div className="flex items-center justify-center text-sm text-slate-500" style={{ height }}>
        No data for these filters.
      </div>
    );
  }

  const metrics = result.metrics.map((m) => ({ ...m, name: m.name || metricName(m) }));
  const labelName = result.groupBy ? humanize(result.groupBy) : null;
  const labelOf = (v) => (v === null || v === undefined ? 'All rows' : String(v));

  if (chart === 'kpi') return <KpiCards result={result} metrics={metrics} labelOf={labelOf} />;
  if (chart === 'table') return <ResultTable result={result} metrics={metrics} labelName={labelName} labelOf={labelOf} />;
  if (chart === 'pie') return <PieView result={result} metrics={metrics} labelOf={labelOf} height={height} />;

  // Without grouping there is one row: show one bar per indicator.
  if (!result.groupBy) {
    const data = metrics.map((m) => ({ label: m.name, value: result.rows[0][m.key] }));
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} tickFormatter={formatTick} width={56} />
          <Tooltip {...TOOLTIP} formatter={(v) => formatNumber(v)} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="value" name="Value" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
            {data.map((_, i) => (
              <Cell key={i} fill={SERIES_COLORS[i]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const data = result.rows.map((r) => ({ ...r, label: labelOf(r.label) }));
  const showLegend = metrics.length > 1;

  if (chart === 'line') {
    // Advanced feature: forecast. Dashed lines (f0, f1...) continue the real ones (m0, m1...).
    const models = (result.forecast?.models || []).filter((md) => md.available);
    const lastReal = [...data].reverse().find((r) => !r.forecast)?.label;
    const hasForecast = models.length > 0 && data.some((r) => r.forecast);
    return (
      <>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="label" {...AXIS} minTickGap={16} />
            <YAxis {...AXIS} tickFormatter={formatTick} width={56} />
            <Tooltip {...TOOLTIP} formatter={(v) => formatNumber(v)} labelFormatter={(l) => `${labelName}: ${l}`} />
            {(showLegend || hasForecast) && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} formatter={legendText} />}
            {hasForecast && (
              <ReferenceLine x={lastReal} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: 'Forecast →', position: 'insideTopRight', fill: '#64748b', fontSize: 11 }} />
            )}
            {metrics.map((m, i) => (
              <Line
                key={m.key}
                type="monotone"
                dataKey={m.key}
                name={m.name}
                stroke={SERIES_COLORS[i]}
                strokeWidth={2}
                dot={data.length <= 12 ? { r: 3 } : false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
            {hasForecast &&
              models.map((md) => {
                const i = metrics.findIndex((m) => m.key === md.metric);
                return (
                  <Line
                    key={md.key}
                    type="linear"
                    dataKey={md.key}
                    name={`${metrics[i].name} (trend)`}
                    stroke={SERIES_COLORS[i]}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                );
              })}
          </LineChart>
        </ResponsiveContainer>
        {result.forecast && <ForecastNote forecast={result.forecast} metrics={metrics} labelName={labelName} />}
      </>
    );
  }

  // Bar chart. Text categories (countries...) are drawn horizontally so names stay readable.
  const horizontal = result.groupType === 'text';
  const barHeight = horizontal ? Math.max(height, data.length * (24 * metrics.length + 10) + 40) : height;
  return (
    <ResponsiveContainer width="100%" height={barHeight}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
        barGap={2}
      >
        <CartesianGrid horizontal={!horizontal} vertical={horizontal} stroke="#e2e8f0" />
        {horizontal ? (
          <>
            <XAxis type="number" {...AXIS} tickFormatter={formatTick} />
            <YAxis type="category" dataKey="label" {...AXIS} width={120} interval={0} />
          </>
        ) : (
          <>
            <XAxis dataKey="label" {...AXIS} minTickGap={8} />
            <YAxis {...AXIS} tickFormatter={formatTick} width={56} />
          </>
        )}
        <Tooltip {...TOOLTIP} formatter={(v) => formatNumber(v)} cursor={{ fill: '#f1f5f9' }} />
        {showLegend && <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />}
        {metrics.map((m, i) => (
          <Bar
            key={m.key}
            dataKey={m.key}
            name={m.name}
            fill={SERIES_COLORS[i]}
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={40}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// Explains the trend under the chart: change per period and R².
function ForecastNote({ forecast, metrics, labelName }) {
  if (forecast.note) return <p className="mt-2 text-xs text-amber-700">{forecast.note}</p>;
  const unit = labelName?.toLowerCase() === 'year' ? 'year' : 'period';
  return (
    <div className="mt-2 space-y-0.5 text-xs text-slate-500">
      {forecast.models
        .filter((md) => md.available)
        .map((md) => {
          const m = metrics.find((x) => x.key === md.metric);
          const sign = md.slopePerStep >= 0 ? '+' : '';
          return (
            <p key={md.key}>
              <span className="font-medium text-slate-700">{m.name}</span>: linear trend {sign}
              {formatNumber(md.slopePerStep)} per {unit}, R² = {md.r2} ({md.points} points)
            </p>
          );
        })}
    </div>
  );
}

function PieView({ result, metrics, labelOf, height }) {
  // No grouping: one slice per indicator. With grouping: one slice per group (first indicator).
  let slices = result.groupBy
    ? result.rows.map((r) => ({ name: labelOf(r.label), value: r[metrics[0].key] }))
    : metrics.map((m) => ({ name: m.name, value: result.rows[0][m.key] }));
  slices = slices.filter((s) => s.value > 0);

  // More than 7 slices: the smallest are grouped into "Other".
  if (slices.length > 8) {
    const sorted = [...slices].sort((a, b) => b.value - a.value);
    const other = sorted.slice(7).reduce((sum, s) => sum + s.value, 0);
    slices = [...sorted.slice(0, 7), { name: 'Other', value: other }];
  }
  const total = slices.reduce((s, x) => s + x.value, 0);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="name"
          innerRadius="45%"
          outerRadius="75%"
          paddingAngle={1}
          stroke="#fff"
          strokeWidth={2}
          label={({ percent, x, y, textAnchor }) =>
            percent >= 0.04 ? (
              <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" fill="#334155" fontSize={12}>
                {`${(percent * 100).toFixed(0)}%`}
              </text>
            ) : null
          }
          labelLine={false}
          isAnimationActive={false}
        >
          {slices.map((s, i) => (
            <Cell key={s.name} fill={s.name === 'Other' ? OTHER_COLOR : SERIES_COLORS[i]} />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP} formatter={(v) => `${formatNumber(v)} (${((v / total) * 100).toFixed(1)}%)`} />
        <Legend wrapperStyle={{ fontSize: 12 }} formatter={legendText} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function KpiCards({ result, metrics, labelOf }) {
  const row = result.rows[0];
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(170px, 1fr))` }}>
      {metrics.map((m) => (
        <div key={m.key} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-500">{m.name}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{formatNumber(row[m.key])}</p>
          {result.groupBy && <p className="mt-1 text-xs text-slate-500">{labelOf(row.label)}</p>}
        </div>
      ))}
    </div>
  );
}

function ResultTable({ result, metrics, labelName, labelOf }) {
  return (
    <div className="max-h-96 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 text-xs text-slate-600">
          <tr>
            {labelName && <th className="px-3 py-2 text-left font-medium">{labelName}</th>}
            {metrics.map((m) => (
              <th key={m.key} className="px-3 py-2 text-right font-medium">
                {m.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {result.rows.map((r, i) => (
            <tr key={i}>
              {labelName && <td className="px-3 py-2 text-slate-800">{labelOf(r.label)}</td>}
              {metrics.map((m) => (
                <td key={m.key} className="px-3 py-2 text-right tabular-nums">
                  {formatNumber(r[m.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
