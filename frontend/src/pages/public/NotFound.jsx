import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
      <Link to="/" className="text-sm font-medium text-brand-700 hover:underline">
        Back to home
      </Link>
    </div>
  );
}
