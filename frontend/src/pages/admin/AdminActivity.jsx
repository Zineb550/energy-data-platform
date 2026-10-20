// Activity log: who did what, and when.
import { useState } from 'react';
import { adminApi } from '../../api/admin';
import { useApi } from '../../hooks/useApi';
import { Alert, Badge, Card, Loading, PageHeader, Select } from '../../components/ui';

export const ACTION_LABELS = {
  REGISTER: 'Registration',
  LOGIN: 'Login',
  PASSWORD_CHANGE: 'Password change',
  DATASET_IMPORT: 'Dataset import',
  DATASET_UPDATE: 'Dataset update',
  DATASET_DELETE: 'Dataset deletion',
  ANALYSIS_CREATE: 'Analysis created',
  ANALYSIS_UPDATE: 'Analysis updated',
  ANALYSIS_DELETE: 'Analysis deleted',
  DASHBOARD_CREATE: 'Dashboard created',
  DASHBOARD_UPDATE: 'Dashboard updated',
  DASHBOARD_PUBLISH: 'Dashboard published',
  DASHBOARD_DELETE: 'Dashboard deleted',
  ADMIN_USER_UPDATE: 'Admin: user updated',
  ADMIN_USER_DELETE: 'Admin: user deleted',
};

const actionColor = (a) => (a.startsWith('ADMIN') ? 'amber' : a.includes('DELETE') ? 'red' : a === 'LOGIN' ? 'slate' : 'brand');

const dateTime = (v) =>
  new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function AdminActivity() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const { data, loading, error } = useApi(() => adminApi.activity({ page, pageSize: 25, action: action || undefined }), [page, action]);

  return (
    <>
      <PageHeader title="Activity log" subtitle="Every important action performed on the platform." />
      <div className="mb-4 flex justify-end">
        <Select
          className="w-64"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All actions</option>
          {Object.entries(ACTION_LABELS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </Select>
      </div>
      {error && <Alert>{error.message}</Alert>}
      {loading && !data ? (
        <Loading />
      ) : (
        <Card className="overflow-hidden">
          <table className={`w-full text-sm ${loading ? 'opacity-60' : ''}`}>
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                {['Date', 'User', 'Action', 'Target'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-600">{dateTime(r.created_at)}</td>
                  <td className="px-4 py-2.5">
                    {r.user_name || <span className="text-slate-400">Deleted user</span>}
                    {r.user_email && <span className="block text-xs text-slate-400">{r.user_email}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge color={actionColor(r.action)}>{ACTION_LABELS[r.action] || r.action}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{r.target || '—'}</td>
                </tr>
              ))}
              {!data.rows.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    No activity.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
            <span>{data.total} entries</span>
            <div className="flex items-center gap-3">
              <span>
                Page {data.page} of {data.totalPages}
              </span>
              <button
                className="cursor-pointer rounded-md border border-slate-300 px-3 py-1 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                className="cursor-pointer rounded-md border border-slate-300 px-3 py-1 font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
