// Blocks a page for visitors, or for users without the right role.
//   <ProtectedRoute>              -> any logged-in user
//   <ProtectedRoute roles={['admin']}> -> admins only
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading } from './ui';

export default function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />;
  return <Outlet />;
}
