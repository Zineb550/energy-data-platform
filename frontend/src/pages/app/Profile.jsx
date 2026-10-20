// The user's profile: change name and password.
import { useState } from 'react';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { Alert, Badge, Button, Card, Field, Input, PageHeader, fieldError } from '../../components/ui';
import { formatDate } from '../../utils/format';

export default function Profile() {
  const { user, setUser } = useAuth();

  return (
    <>
      <PageHeader title="My profile" subtitle="Manage your personal information and password." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold text-slate-900">Account</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Email" value={user.email} />
            <Row label="Role" value={<Badge color={user.role === 'admin' ? 'amber' : 'brand'}>{user.role}</Badge>} />
            <Row label="Member since" value={formatDate(user.created_at)} />
          </dl>
          <div className="mt-6 border-t border-slate-200 pt-6">
            <NameForm user={user} onSaved={setUser} />
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold text-slate-900">Change password</h2>
          <PasswordForm />
        </Card>
      </div>
    </>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function NameForm({ user, onSaved }) {
  const [name, setName] = useState(user.name);
  const [status, setStatus] = useState({});

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus({ saving: true });
    try {
      const data = await authApi.updateProfile({ name });
      onSaved(data.user);
      setStatus({ success: 'Name updated.' });
    } catch (error) {
      setStatus({ error });
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {status.success && <Alert type="success">{status.success}</Alert>}
      <Field label="Full name" error={fieldError(status.error, 'name') || (!status.error?.details?.length && status.error?.message)}>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Button type="submit" loading={status.saving}>
        Save
      </Button>
    </form>
  );
}

function PasswordForm() {
  const empty = { currentPassword: '', newPassword: '' };
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState({});

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus({ saving: true });
    try {
      await authApi.changePassword(form);
      setForm(empty);
      setStatus({ success: 'Password changed.' });
    } catch (error) {
      setStatus({ error });
    }
  };

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4" noValidate>
      {status.success && <Alert type="success">{status.success}</Alert>}
      {status.error && !status.error.details?.length && <Alert>{status.error.message}</Alert>}
      <Field label="Current password" error={fieldError(status.error, 'currentPassword')}>
        <Input type="password" name="currentPassword" autoComplete="current-password" value={form.currentPassword} onChange={onChange} />
      </Field>
      <Field label="New password" error={fieldError(status.error, 'newPassword')} hint="At least 8 characters.">
        <Input type="password" name="newPassword" autoComplete="new-password" value={form.newPassword} onChange={onChange} />
      </Field>
      <Button type="submit" loading={status.saving}>
        Change password
      </Button>
    </form>
  );
}
