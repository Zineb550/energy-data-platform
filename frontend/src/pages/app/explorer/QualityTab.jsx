// Advanced feature 1: data quality score, its three dimensions and recommendations.
import { datasetsApi } from '../../../api/datasets';
import { useApi } from '../../../hooks/useApi';
import { Alert, Card, Loading, TypeBadge } from '../../../components/ui';
import { formatNumber, humanize } from '../../../utils/format';

const GRADE_STYLE = {
  A: { ring: '#0d9488', text: 'text-brand-700', label: 'Excellent' },
  B: { ring: '#2a78d6', text: 'text-blue-700', label: 'Good' },
  C: { ring: '#eda100', text: 'text-amber-700', label: 'Fair' },
  D: { ring: '#e34948', text: 'text-red-700', label: 'Poor' },
};

export default function QualityTab({ dataset }) {
  const { data, loading, error } = useApi(() => datasetsApi.quality(dataset.id), [dataset.id]);
  if (loading) return <Loading label="Computing the quality score…" />;
  if (error) return <Alert>{error.message}</Alert>;

  const q = data.quality;
  const style = GRADE_STYLE[q.grade];
  const columns = [...q.columns].sort((a, b) => b.missingPct - a.missingPct);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="flex flex-col items-center justify-center p-6 text-center">
          <ScoreRing score={q.score} color={style.ring} />
          <p className={`mt-3 text-lg font-semibold ${style.text}`}>
            Grade {q.grade} · {style.label}
          </p>
          <p className="mt-1 text-xs text-slate-500">Quality score out of 100</p>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold text-slate-900">How the score is computed</h2>
          <div className="mt-4 space-y-4">
            {q.dimensions.map((d) => (
              <div key={d.key}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-slate-800">
                    {d.label} <span className="font-normal text-slate-400">· {d.weight} pts</span>
                  </span>
                  <span className="tabular-nums text-slate-700">{d.value}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-600" style={{ width: `${d.value}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{d.detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            Score = 50 × completeness + 25 × uniqueness + 25 × consistency
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold text-slate-900">Recommendations</h2>
        <ul className="mt-3 space-y-2">
          {q.recommendations.map((r, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700">
              <span className="mt-0.5 text-brand-700">•</span>
              {r}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="overflow-hidden">
        <h2 className="border-b border-slate-200 px-4 py-3 font-semibold text-slate-900">Missing values by column</h2>
        <div className="divide-y divide-slate-100">
          {columns.map((c) => (
            <div key={c.name} className="grid grid-cols-[minmax(140px,240px)_70px_1fr_90px] items-center gap-3 px-4 py-2 text-sm">
              <span className="truncate font-medium text-slate-800">{humanize(c.name)}</span>
              <TypeBadge type={c.type} />
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${c.missingPct === 0 ? 'bg-brand-500' : c.missingPct < 20 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ width: `${Math.max(c.missingPct, c.missingPct > 0 ? 1 : 0)}%` }}
                />
              </div>
              <span className="text-right text-xs tabular-nums text-slate-600">
                {c.missingPct}% <span className="text-slate-400">({formatNumber(c.missing)})</span>
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function ScoreRing({ score, color }) {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="h-36 w-36" role="img" aria-label={`Quality score ${score} out of 100`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${(score / 100) * circumference} ${circumference}`}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="58" textAnchor="middle" dominantBaseline="middle" className="fill-slate-900" fontSize="30" fontWeight="600">
        {score}
      </text>
      <text x="60" y="82" textAnchor="middle" className="fill-slate-500" fontSize="11">
        / 100
      </text>
    </svg>
  );
}
