// Explorer of one dataset: Data, Overview, Data quality, Outliers, Settings.
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { datasetsApi } from '../../../api/datasets';
import { useApi } from '../../../hooks/useApi';
import { Alert, Badge, Button, Loading, PageHeader, VisibilityBadge } from '../../../components/ui';
import { formatDate, formatNumber } from '../../../utils/format';
import DataTab from './DataTab';
import OverviewTab from './OverviewTab';
import SettingsTab from './SettingsTab';
import QualityTab from './QualityTab';
import OutliersTab from './OutliersTab';

export default function DatasetExplorer() {
  const { id } = useParams();
  const { data, loading, error, setData } = useApi(() => datasetsApi.get(id), [id]);
  const [tab, setTab] = useState('data');

  if (loading) return <Loading />;
  if (error)
    return (
      <div className="space-y-4">
        <Alert>{error.message}</Alert>
        <Link to="/app/datasets" className="text-sm font-medium text-brand-700 hover:underline">
          Back to datasets
        </Link>
      </div>
    );

  const dataset = data.dataset;
  const tabs = [
    ['data', 'Data'],
    ['overview', 'Overview & statistics'],
    ['quality', 'Data quality'],
    ['outliers', 'Outliers'],
    ...(dataset.canEdit ? [['settings', 'Settings']] : []),
  ];

  return (
    <>
      <Link to="/app/datasets" className="text-sm text-slate-500 hover:text-slate-800">
        ← Datasets
      </Link>
      <div className="mt-2">
        <PageHeader
          title={dataset.title}
          subtitle={dataset.description}
          actions={
            <Link to={`/app/analyses/new?dataset=${dataset.id}`}>
              <Button>Analyze this dataset</Button>
            </Link>
          }
        />
      </div>
      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Badge color="brand">{dataset.category}</Badge>
        <VisibilityBadge visibility={dataset.visibility} />
        <span>
          {formatNumber(dataset.rowCount)} rows · {dataset.columns.length} columns · by {dataset.ownerName} ·{' '}
          {formatDate(dataset.createdAt)}
        </span>
        {dataset.source && <span>· Source: {dataset.source}</span>}
      </div>

      <div className="mb-5 flex gap-6 border-b border-slate-200">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px cursor-pointer border-b-2 pb-3 text-sm font-medium ${
              tab === key ? 'border-brand-700 text-brand-800' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'data' && <DataTab dataset={dataset} />}
      {tab === 'overview' && <OverviewTab dataset={dataset} />}
      {tab === 'quality' && <QualityTab dataset={dataset} />}
      {tab === 'outliers' && <OutliersTab dataset={dataset} />}
      {tab === 'settings' && <SettingsTab dataset={dataset} onSaved={(d) => setData({ dataset: d })} />}
    </>
  );
}
