import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Alert, Button, Field, Input, fieldError } from '../../components/ui';
import { AuthCard } from './Login';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register(form);
      navigate('/app', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard title="Create your account" subtitle="Start exploring energy data in a minute.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && !error.details?.length && <Alert>{error.message}</Alert>}
        <Field label="Full name" error={fieldError(error, 'name')}>
          <Input name="name" autoComplete="name" value={form.name} onChange={onChange} required />
        </Field>
        <Field label="Email" error={fieldError(error, 'email')}>
          <Input name="email" type="email" autoComplete="email" value={form.email} onChange={onChange} required />
        </Field>
        <Field label="Password" error={fieldError(error, 'password')} hint="At least 8 characters.">
          <Input name="password" type="password" autoComplete="new-password" value={form.password} onChange={onChange} required />
        </Field>
        <Button type="submit" className="w-full" loading={submitting}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already registered?{' '}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
