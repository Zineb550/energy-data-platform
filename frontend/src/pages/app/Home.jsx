// First page after login: a short overview of the user's workspace.
import { Link } from 'react-router-dom';
import { datasetsApi } from '../../api/datasets';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { Card, Loading, PageHeader, StatCard, VisibilityBadge } from '../../components/ui';
import { formatDate, formatNumber } from '../../utils/format';

export default function Home() {
  const { user } = useAuth();
  const { data, loading } = useApi(() => datasetsApi.list({ scope: 'all' }), []);
  const datasets = data?.datasets || [];
  const mine = datasets.filter((d) => d.owner_id === user.id);
  const totalRows = datasets.reduce((s, d) => s + d.row_count, 0);

  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]}`} subtitle="Here is what is available in your workspace." />
      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="My datasets" value={mine.length} />
            <StatCard label="Datasets available" value={datasets.length} hint="Mine + shared with me" />
            <StatCard label="Rows available" value={formatNumber(totalRows)} />
          </div>

          <div className="mt-8 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent datasets</h2>
            <Link to="/app/datasets" className="text-sm font-medium text-brand-700 hover:underline">
              See all
            </Link>
          </div>
          <Card className="mt-3 divide-y divide-slate-100">
            {datasets.slice(0, 5).map((d) => (
              <Link key={d.id} to={`/app/datasets/${d.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{d.title}</p>
                  <p className="text-xs text-slate-500">
                    {d.category} · {formatNumber(d.row_count)} rows · by {d.owner_name} · {formatDate(d.created_at)}
                  </p>
                </div>
                <VisibilityBadge visibility={d.visibility} />
              </Link>
            ))}
            {!datasets.length && (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                No dataset yet.{' '}
                <Link to="/app/datasets/new" className="font-medium text-brand-700 hover:underline">
                  Import your first CSV
                </Link>
              </p>
            )}
          </Card>
        </>
      )}
    </>
  );
}
