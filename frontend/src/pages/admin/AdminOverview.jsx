// Administration dashboard: global indicators about the use of the platform.
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { useApi } from '../../hooks/useApi';
import { Alert, Card, Loading, PageHeader, StatCard } from '../../components/ui';
import ChartView from '../../components/charts/ChartView';
import { formatDate, formatNumber } from '../../utils/format';
import { ACTION_LABELS } from './AdminActivity';

export default function AdminOverview() {
  const { data, loading, error } = useApi(() => adminApi.stats(), []);
  if (loading) return <Loading />;
  if (error) return <Alert>{error.message}</Alert>;

  const t = data.totals;

  // The admin charts reuse the same ChartView component as the analyses.
  const activityResult = {
    groupBy: 'day',
    groupType: 'date',
    metrics: [
      { key: 'm0', name: 'All actions' },
      { key: 'm1', name: 'Logins' },
    ],
    rows: data.activityByDay.map((d) => ({ label: d.day.slice(5), m0: d.actions, m1: d.logins })),
  };
  const actionsResult = {
    groupBy: 'action',
    groupType: 'text',
    metrics: [{ key: 'm0', name: 'Number of actions' }],
    rows: data.actions.map((a) => ({ label: ACTION_LABELS[a.action] || a.action, m0: a.count })),
  };

  return (
    <>
      <PageHeader title="Administration" subtitle="Overview of the platform's content and activity." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={t.users} hint={`${t.admins} admin · ${t.disabled_users} disabled`} />
        <StatCard label="Active users (7 days)" value={t.active_users_7d} hint="Logged in at least once" />
        <StatCard label="Datasets" value={t.datasets} hint={`${formatNumber(t.rows)} rows in total`} />
        <StatCard label="Analyses · Dashboards" value={`${t.analyses} · ${t.dashboards}`} hint={`${t.public_dashboards} public dashboard(s)`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="min-w-0 p-5">
          <h2 className="font-semibold text-slate-900">Activity over the last 30 days</h2>
          <div className="mt-4">
            <ChartView result={activityResult} chart="line" height={260} />
          </div>
        </Card>
        <Card className="min-w-0 p-5">
          <h2 className="font-semibold text-slate-900">Actions (30 days)</h2>
          <div className="mt-4">
            {data.actions.length ? <ChartView result={actionsResult} chart="bar" height={260} /> : <p className="text-sm text-slate-500">No activity yet.</p>}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900">Most active users (30 days)</h2>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {data.topUsers.map((u) => (
              <li key={u.id} className="flex justify-between py-2">
                <span className="text-slate-800">{u.name}</span>
                <span className="tabular-nums text-slate-500">{u.actions} actions</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Latest accounts</h2>
            <Link to="/app/admin/users" className="text-sm font-medium text-brand-700 hover:underline">
              Manage users
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {data.recentUsers.map((u) => (
              <li key={u.id} className="flex justify-between gap-4 py-2">
                <span className="truncate text-slate-800">
                  {u.name} <span className="text-slate-400">· {u.email}</span>
                </span>
                <span className="shrink-0 text-slate-500">{formatDate(u.created_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
