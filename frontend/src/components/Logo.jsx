import { Link } from 'react-router-dom';

export default function Logo({ to = '/' }) {
  return (
    <Link to={to} className="flex items-center gap-2 font-semibold text-slate-900">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#0f766e" />
        <path d="M18 5 9 18h6l-2 9 10-14h-6l1-8z" fill="#fde68a" />
      </svg>
      EnergyInsight
    </Link>
  );
}
