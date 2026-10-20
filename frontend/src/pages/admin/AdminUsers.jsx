// User management: change role, disable / enable, delete.
import { useState } from 'react';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import { useApi, useDebounce } from '../../hooks/useApi';
import { Alert, Badge, Button, Card, Input, Loading, PageHeader, Select } from '../../components/ui';
import { formatDate } from '../../utils/format';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const { data, loading, error, reload } = useApi(() => adminApi.users(debounced), [debounced]);
  const [actionError, setActionError] = useState(null);

  const run = async (fn) => {
    setActionError(null);
    try {
      await fn();
      reload();
    } catch (err) {
      setActionError(err);
    }
  };

  const remove = (u) => {
    if (!window.confirm(`Delete ${u.email}? Their datasets, analyses and dashboards will be deleted too.`)) return;
    run(() => adminApi.deleteUser(u.id));
  };

  return (
    <>
      <PageHeader title="Users" subtitle="Manage accounts, roles and access to the platform." />
      <div className="mb-4 flex justify-end">
        <Input className="max-w-xs" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {(error || actionError) && (
        <div className="mb-4">
          <Alert>{(error || actionError).message}</Alert>
        </div>
      )}
      {loading && !data ? (
        <Loading />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                {['User', 'Role', 'Status', 'Content', 'Last login', 'Member since', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data?.users.map((u) => {
                const isMe = u.id === me.id;
                return (
                  <tr key={u.id} className={u.status === 'disabled' ? 'bg-slate-50 text-slate-400' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {u.name} {isMe && <span className="text-xs font-normal text-slate-400">(you)</span>}
                      </p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        className="w-28 py-1"
                        value={u.role}
                        disabled={isMe}
                        onChange={(e) => run(() => adminApi.updateUser(u.id, { role: e.target.value }))}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={u.status === 'active' ? 'brand' : 'red'}>{u.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {u.datasets} datasets · {u.analyses} analyses · {u.dashboards} dashboards
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{u.last_login ? formatDate(u.last_login) : 'Never'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      {!isMe && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => run(() => adminApi.updateUser(u.id, { status: u.status === 'active' ? 'disabled' : 'active' }))}
                          >
                            {u.status === 'active' ? 'Disable' : 'Enable'}
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => remove(u)}>
                            Delete
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
