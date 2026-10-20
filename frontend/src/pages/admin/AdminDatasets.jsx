// Supervision of every dataset on the platform, whoever owns it.
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import { datasetsApi } from '../../api/datasets';
import { useApi } from '../../hooks/useApi';
import { Alert, Badge, Button, Card, Loading, PageHeader, VisibilityBadge } from '../../components/ui';
import { formatDate, formatNumber } from '../../utils/format';

export default function AdminDatasets() {
  const { data, loading, error, reload } = useApi(() => adminApi.datasets(), []);

  const remove = async (d) => {
    if (!window.confirm(`Delete "${d.title}" (owned by ${d.owner_name})? Its analyses will be deleted too.`)) return;
    await datasetsApi.remove(d.id);
    reload();
  };

  return (
    <>
      <PageHeader title="All datasets" subtitle="Every dataset imported on the platform. As admin you can open, edit or delete any of them." />
      {error && <Alert>{error.message}</Alert>}
      {loading ? (
        <Loading />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                {['Dataset', 'Owner', 'Visibility', 'Rows', 'Columns', 'Analyses', 'Imported', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.datasets.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3">
                    <Link to={`/app/datasets/${d.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                      {d.title}
                    </Link>
                    <div className="mt-0.5">
                      <Badge color="brand">{d.category}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {d.owner_name}
                    <br />
                    <span className="text-slate-400">{d.owner_email}</span>
                  </td>
                  <td className="px-4 py-3">
                    <VisibilityBadge visibility={d.visibility} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatNumber(d.row_count)}</td>
                  <td className="px-4 py-3 tabular-nums">{d.column_count}</td>
                  <td className="px-4 py-3 tabular-nums">{d.analyses}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{formatDate(d.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="danger" onClick={() => remove(d)}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
              {!data.datasets.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    No dataset on the platform yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
