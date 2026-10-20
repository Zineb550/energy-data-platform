// Visitor home page: presents the platform and lists public dashboards.
import { Link } from 'react-router-dom';
import { publicApi } from '../../api/dashboards';
import { useApi } from '../../hooks/useApi';

const STEPS = [
  ['Import', 'Upload a CSV file. Column types are detected automatically.'],
  ['Explore', 'Search, filter and sort the data, with an automatic summary of every column.'],
  ['Analyze', 'Compute sums, averages, rankings and trends over time on any column.'],
  ['Visualize', 'Turn results into bar, line and pie charts or KPI cards, grouped in dashboards.'],
  ['Share', 'Keep analyses private, share them with the team, or publish a dashboard.'],
];

export default function Landing() {
  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Energy data platform</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
              Understand the energy transition, one dataset at a time.
            </h1>
            <p className="mt-5 text-lg text-slate-600">
              EnergyInsight brings your energy data together: import it, explore it, build indicators and share
              interactive dashboards with your team.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="rounded-lg bg-brand-700 px-5 py-3 text-sm font-medium text-white hover:bg-brand-800">
                Get started for free
              </Link>
              <Link to="/login" className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Log in
              </Link>
            </div>
          </div>
          <HeroChart />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold text-slate-900">From raw files to decisions</h2>
        <p className="mt-2 text-slate-600">The whole life cycle of a dataset, in one place.</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map(([title, text], i) => (
            <li key={title} className="rounded-xl border border-slate-200 bg-white p-5">
              <span className="text-sm font-semibold text-brand-700">0{i + 1}</span>
              <h3 className="mt-2 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <PublicDashboards />
    </>
  );
}

function PublicDashboards() {
  const { data } = useApi(() => publicApi.dashboards(), []);
  const dashboards = data?.dashboards || [];
  if (!dashboards.length) return null;
  return (
    <section className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold text-slate-900">Public dashboards</h2>
        <p className="mt-2 text-slate-600">Published by our analysts. No account needed.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {dashboards.map((d) => (
            <Link key={d.id} to={`/p/${d.public_slug}`} className="rounded-xl border border-slate-200 p-5 transition hover:border-brand-500 hover:shadow-sm">
              <h3 className="font-semibold text-slate-900">{d.name}</h3>
              {d.description && <p className="mt-1 text-sm text-slate-600">{d.description}</p>}
              <p className="mt-3 text-xs text-slate-500">
                {d.widget_count} charts · by {d.owner_name}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// Decorative illustration (static SVG, no data).
function HeroChart() {
  const bars = [18, 22, 25, 31, 36, 44, 52, 61];
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-slate-700">Renewable share of electricity</p>
        <p className="text-xs text-slate-500">illustration</p>
      </div>
      <div className="mt-6 flex h-48 items-end gap-3">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-t-md bg-brand-600" style={{ height: `${h + 30}%`, opacity: 0.45 + i * 0.07 }} />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          ['Datasets', 'CSV'],
          ['Charts', '4 types'],
          ['Sharing', '3 levels'],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-white p-3 text-center">
            <p className="text-xs text-slate-500">{k}</p>
            <p className="font-semibold text-slate-900">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
