// Small reusable building blocks, so every page looks consistent.

export function Button({ variant = 'primary', size = 'md', className = '', loading, children, ...props }) {
  const variants = {
    primary: 'bg-brand-700 text-white hover:bg-brand-800 disabled:bg-brand-700/50',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50',
    danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50',
    ghost: 'text-slate-600 hover:bg-slate-100 disabled:opacity-50',
  };
  const sizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-4 py-2 text-sm' };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors cursor-pointer disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

// Fields are full width unless the caller gives a width class (w-40, w-auto…).
const width = (className) => (/(^|\s)w-/.test(className) ? '' : 'w-full');
const fieldClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100';

export function Field({ label, error, hint, children }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export const Input = ({ className = '', ...props }) => <input className={`${fieldClass} ${width(className)} ${className}`} {...props} />;
export const Textarea = ({ className = '', ...props }) => (
  <textarea className={`${fieldClass} ${width(className)} ${className}`} {...props} />
);
export const Select = ({ className = '', children, ...props }) => (
  <select className={`${fieldClass} ${width(className)} ${className}`} {...props}>
    {children}
  </select>
);

export function Card({ className = '', children }) {
  return <div className={`rounded-xl border border-slate-200 bg-white ${className}`}>{children}</div>;
}

export function Badge({ color = 'slate', children }) {
  const colors = {
    slate: 'bg-slate-100 text-slate-700',
    brand: 'bg-brand-50 text-brand-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
    red: 'bg-red-50 text-red-700',
  };
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${colors[color]}`}>{children}</span>;
}

export const TYPE_COLORS = { number: 'blue', text: 'slate', date: 'violet' };
export const TypeBadge = ({ type }) => <Badge color={TYPE_COLORS[type]}>{type}</Badge>;

export const VisibilityBadge = ({ visibility }) => {
  const map = { private: ['slate', 'Private'], shared: ['brand', 'Shared'], public: ['amber', 'Public'] };
  const [color, label] = map[visibility] || map.private;
  return <Badge color={color}>{label}</Badge>;
};

export function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'h-3.5 w-3.5 border-2' : 'h-6 w-6 border-[3px]';
  return <span className={`inline-block animate-spin rounded-full border-current border-r-transparent ${s}`} />;
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <Spinner /> <span className="text-sm">{label}</span>
    </div>
  );
}

export function Alert({ type = 'error', children }) {
  if (!children) return null;
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-brand-200 bg-brand-50 text-brand-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  };
  return <div className={`rounded-lg border px-4 py-3 text-sm ${styles[type]}`}>{children}</div>;
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      {text && <p className="max-w-sm text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

// Returns the validation message of one field from an API error.
export const fieldError = (error, field) => error?.details?.find((d) => d.field === field)?.message;
