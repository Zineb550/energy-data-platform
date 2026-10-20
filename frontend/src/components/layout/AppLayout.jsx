// Layout of the logged-in area: sidebar navigation + page content.
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../Logo';

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  data: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  board: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21a7 7 0 0114 0M17 11a3 3 0 100-6M22 21a6 6 0 00-4-5.6',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
};

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-5">
        <div className="px-2">
          <Logo to="/app" />
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          <NavLink to="/app" end className={linkClass}>
            <Icon d={ICONS.home} /> Home
          </NavLink>
          <NavLink to="/app/datasets" className={linkClass}>
            <Icon d={ICONS.data} /> Datasets
          </NavLink>
          <NavLink to="/app/analyses" className={linkClass}>
            <Icon d={ICONS.chart} /> Analyses
          </NavLink>
          <NavLink to="/app/dashboards" className={linkClass}>
            <Icon d={ICONS.board} /> Dashboards
          </NavLink>
          <NavLink to="/app/profile" className={linkClass}>
            <Icon d={ICONS.user} /> Profile
          </NavLink>

          {isAdmin && (
            <>
              <p className="mt-6 mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Administration</p>
              <NavLink to="/app/admin" end className={linkClass}>
                <Icon d={ICONS.shield} /> Overview
              </NavLink>
              <NavLink to="/app/admin/users" className={linkClass}>
                <Icon d={ICONS.users} /> Users
              </NavLink>
              <NavLink to="/app/admin/datasets" className={linkClass}>
                <Icon d={ICONS.data} /> All datasets
              </NavLink>
              <NavLink to="/app/admin/activity" className={linkClass}>
                <Icon d={ICONS.list} /> Activity log
              </NavLink>
            </>
          )}
        </nav>
        <div className="border-t border-slate-200 px-2 pt-4">
          <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
          <p className="truncate text-xs text-slate-500">
            {user.email} · {user.role}
          </p>
          <button onClick={handleLogout} className="mt-3 cursor-pointer text-sm font-medium text-slate-600 hover:text-red-600">
            Log out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-8 py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
