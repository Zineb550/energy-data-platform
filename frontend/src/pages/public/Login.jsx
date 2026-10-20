import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Alert, Button, Card, Field, Input, fieldError } from '../../components/ui';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(form);
      // Go back to the page the user wanted, or to their home.
      navigate(location.state?.from || '/app', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Log in to your workspace.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && !error.details?.length && <Alert>{error.message}</Alert>}
        <Field label="Email" error={fieldError(error, 'email')}>
          <Input name="email" type="email" autoComplete="email" value={form.email} onChange={onChange} required />
        </Field>
        <Field label="Password" error={fieldError(error, 'password')}>
          <Input name="password" type="password" autoComplete="current-password" value={form.password} onChange={onChange} required />
        </Field>
        <Button type="submit" className="w-full" loading={submitting}>
          Log in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        No account yet?{' '}
        <Link to="/register" className="font-medium text-brand-700 hover:underline">
          Create one
        </Link>
      </p>
    </AuthCard>
  );
}

export function AuthCard({ title, subtitle, children }) {
  return (
    <div className="flex justify-center px-4 py-16">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">{subtitle}</p>
        {children}
      </Card>
    </div>
  );
}
