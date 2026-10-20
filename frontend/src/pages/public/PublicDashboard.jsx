// Public dashboard, reachable by visitors without an account: /p/:slug
import { useParams } from 'react-router-dom';
import { publicApi } from '../../api/dashboards';
import { useApi } from '../../hooks/useApi';
import { Alert, Badge, Loading } from '../../components/ui';
import DashboardBoard from '../../components/dashboard/DashboardBoard';

export default function PublicDashboard() {
  const { slug } = useParams();
  const { data, loading, error } = useApi(() => publicApi.dashboard(slug), [slug]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      {loading && <Loading />}
      {error && <Alert>{error.message}</Alert>}
      {data && (
        <>
          <div className="mb-6">
            <Badge color="amber">Public dashboard</Badge>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{data.dashboard.name}</h1>
            {data.dashboard.description && <p className="mt-1 text-slate-600">{data.dashboard.description}</p>}
            <p className="mt-1 text-xs text-slate-500">Published by {data.dashboard.ownerName}</p>
          </div>
          <DashboardBoard
            dashboard={data.dashboard}
            filterOptions={data.filterOptions}
            loadData={(filters) => publicApi.data(slug, filters)}
          />
        </>
      )}
    </div>
  );
}
