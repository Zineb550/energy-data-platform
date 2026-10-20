// List of dashboards + creation of a new one.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardsApi } from '../../../api/dashboards';
import { useApi } from '../../../hooks/useApi';
import { Alert, Button, Card, EmptyState, Field, Input, Loading, PageHeader, VisibilityBadge, fieldError } from '../../../components/ui';
import { ScopeTabs } from '../analyses/Analyses';
import { formatDate } from '../../../utils/format';

const SCOPES = [
  ['all', 'All'],
  ['mine', 'My dashboards'],
  ['shared', 'Shared with me'],
];

export default function Dashboards() {
  const [scope, setScope] = useState('all');
  const [creating, setCreating] = useState(false);
  const { data, loading, error } = useApi(() => dashboardsApi.list({ scope }), [scope]);
  const dashboards = data?.dashboards || [];

  return (
    <>
      <PageHeader
        title="Dashboards"
        subtitle="Group several analyses on one page, with filters that update them all."
        actions={<Button onClick={() => setCreating(true)}>New dashboard</Button>}
      />
      {creating && <CreateForm onCancel={() => setCreating(false)} />}
      <div className="mb-4">
        <ScopeTabs scopes={SCOPES} value={scope} onChange={setScope} />
      </div>

      {error && <Alert>{error.message}</Alert>}
      {loading ? (
        <Loading />
      ) : !dashboards.length ? (
        <EmptyState title="No dashboard yet" text="Create a dashboard, then add your saved analyses to it." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {dashboards.map((d) => (
            <Link key={d.id} to={`/app/dashboards/${d.id}`}>
              <Card className="h-full p-5 transition hover:border-brand-500 hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-slate-900">{d.name}</h3>
                  <VisibilityBadge visibility={d.visibility} />
                </div>
                {d.description && <p className="mt-2 text-sm text-slate-600">{d.description}</p>}
                <p className="mt-4 text-xs text-slate-500">
                  {d.widget_count} widget{d.widget_count === 1 ? '' : 's'} · by {d.owner_name}, {formatDate(d.updated_at)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function CreateForm({ onCancel }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [status, setStatus] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    setStatus({ saving: true });
    try {
      const { dashboard } = await dashboardsApi.create({ name });
      navigate(`/app/dashboards/${dashboard.id}?edit=1`);
    } catch (error) {
      setStatus({ error });
    }
  };

  return (
    <Card className="mb-6 p-5">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3" noValidate>
        <div className="min-w-64 flex-1">
          <Field label="Name of the new dashboard" error={fieldError(status.error, 'name') || (!status.error?.details?.length && status.error?.message)}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="e.g. Renewables in North Africa" />
          </Field>
        </div>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={status.saving}>
          Create
        </Button>
      </form>
    </Card>
  );
}
