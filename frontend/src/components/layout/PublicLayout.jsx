// Layout of the visitor pages: top bar + content.
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../Logo';

export default function PublicLayout() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="flex items-center gap-2 text-sm">
            {user ? (
              <Link to="/app" className="rounded-lg bg-brand-700 px-4 py-2 font-medium text-white hover:bg-brand-800">
                Open my workspace
              </Link>
            ) : (
              <>
                <Link to="/login" className="rounded-lg px-4 py-2 font-medium text-slate-700 hover:bg-slate-100">
                  Log in
                </Link>
                <Link to="/register" className="rounded-lg bg-brand-700 px-4 py-2 font-medium text-white hover:bg-brand-800">
                  Create an account
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        EnergyInsight — data from Our World in Data (CC BY 4.0)
      </footer>
    </div>
  );
}
