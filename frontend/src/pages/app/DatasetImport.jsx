// Form to import a new CSV dataset with its metadata.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { datasetsApi } from '../../api/datasets';
import { useApi } from '../../hooks/useApi';
import { Alert, Button, Card, Field, Input, PageHeader, Select, Textarea, fieldError } from '../../components/ui';

export default function DatasetImport() {
  const navigate = useNavigate();
  const { data: catData } = useApi(() => datasetsApi.categories(), []);
  const categories = catData?.categories || [];

  const [form, setForm] = useState({ title: '', description: '', category: 'Energy', source: '', visibility: 'private' });
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onFile = (e) => {
    const f = e.target.files[0];
    setFile(f || null);
    // Pre-fill the title from the file name: "energy_2024.csv" -> "energy 2024"
    if (f && !form.title) setForm((prev) => ({ ...prev, title: f.name.replace(/\.csv$/i, '').replace(/[_-]+/g, ' ') }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError({ message: 'Please choose a CSV file' });
      return;
    }
    setSubmitting(true);
    setError(null);
    const body = new FormData();
    body.append('file', file);
    Object.entries(form).forEach(([k, v]) => body.append(k, v));
    try {
      const { dataset } = await datasetsApi.create(body);
      navigate(`/app/datasets/${dataset.id}`);
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Import a dataset" subtitle="CSV files up to 10 MB. Comma, semicolon and tab separators are detected automatically." />
      <Card className="max-w-2xl p-6">
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {error && !error.details?.length && <Alert>{error.message}</Alert>}

          <Field label="CSV file">
            <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-brand-500">
              <span className="text-sm font-medium text-slate-800">{file ? file.name : 'Click to choose a .csv file'}</span>
              <span className="text-xs text-slate-500">
                {file ? `${(file.size / 1024).toFixed(0)} KB` : 'The first line must contain the column names'}
              </span>
              <input type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
            </label>
          </Field>

          <Field label="Title" error={fieldError(error, 'title')}>
            <Input name="title" value={form.title} onChange={onChange} />
          </Field>
          <Field label="Description" error={fieldError(error, 'description')}>
            <Textarea name="description" rows={3} value={form.description} onChange={onChange} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category" error={fieldError(error, 'category')}>
              <Select name="category" value={form.category} onChange={onChange}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Visibility" hint="Shared datasets can be explored by every user.">
              <Select name="visibility" value={form.visibility} onChange={onChange}>
                <option value="private">Private (only me)</option>
                <option value="shared">Shared with all users</option>
              </Select>
            </Field>
          </div>
          <Field label="Source" error={fieldError(error, 'source')} hint="Where the data comes from (organisation, website…).">
            <Input name="source" value={form.source} onChange={onChange} />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Link to="/app/datasets">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button type="submit" loading={submitting}>
              {submitting ? 'Importing…' : 'Import'}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
