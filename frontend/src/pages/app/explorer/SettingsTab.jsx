// Edit the dataset metadata, or delete it (owner and admin only).
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { datasetsApi } from '../../../api/datasets';
import { useApi } from '../../../hooks/useApi';
import { Alert, Button, Card, Field, Input, Select, Textarea, TypeBadge, fieldError } from '../../../components/ui';

export default function SettingsTab({ dataset, onSaved }) {
  const navigate = useNavigate();
  const { data: catData } = useApi(() => datasetsApi.categories(), []);
  const [form, setForm] = useState({
    title: dataset.title,
    description: dataset.description || '',
    category: dataset.category,
    source: dataset.source || '',
    visibility: dataset.visibility,
  });
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { dataset: updated } = await datasetsApi.update(dataset.id, form);
      onSaved(updated);
      setSaved(true);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm(`Delete "${dataset.title}" and all its rows? This cannot be undone.`)) return;
    try {
      await datasetsApi.remove(dataset.id);
      navigate('/app/datasets');
    } catch (err) {
      setError(err);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-6 lg:col-span-2">
        <h2 className="mb-4 font-semibold text-slate-900">Information</h2>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {error && !error.details?.length && <Alert>{error.message}</Alert>}
          {saved && <Alert type="success">Changes saved.</Alert>}
          <Field label="Title" error={fieldError(error, 'title')}>
            <Input name="title" value={form.title} onChange={onChange} />
          </Field>
          <Field label="Description">
            <Textarea name="description" rows={3} value={form.description} onChange={onChange} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select name="category" value={form.category} onChange={onChange}>
                {(catData?.categories || [form.category]).map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Visibility">
              <Select name="visibility" value={form.visibility} onChange={onChange}>
                <option value="private">Private (only me)</option>
                <option value="shared">Shared with all users</option>
              </Select>
            </Field>
          </div>
          <Field label="Source">
            <Input name="source" value={form.source} onChange={onChange} />
          </Field>
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="mb-3 font-semibold text-slate-900">Detected columns</h2>
          <ul className="space-y-1.5 text-sm">
            {dataset.columns.map((c) => (
              <li key={c.name} className="flex items-center justify-between gap-2">
                <span className="truncate text-slate-700">{c.name}</span>
                <TypeBadge type={c.type} />
              </li>
            ))}
          </ul>
        </Card>
        <Card className="border-red-200 p-6">
          <h2 className="font-semibold text-slate-900">Delete dataset</h2>
          <p className="mt-1 mb-4 text-sm text-slate-600">Removes the dataset, its rows and the analyses built on it.</p>
          <Button variant="danger" onClick={onDelete}>
            Delete this dataset
          </Button>
        </Card>
      </div>
    </div>
  );
}
