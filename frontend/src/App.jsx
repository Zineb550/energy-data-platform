// All the pages of the app and who can open them.
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import PublicLayout from './components/layout/PublicLayout';
import AppLayout from './components/layout/AppLayout';
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import NotFound from './pages/public/NotFound';
import Home from './pages/app/Home';
import Datasets from './pages/app/Datasets';
import DatasetImport from './pages/app/DatasetImport';
import DatasetExplorer from './pages/app/explorer/DatasetExplorer';
import Profile from './pages/app/Profile';
import Analyses from './pages/app/analyses/Analyses';
import AnalysisBuilder from './pages/app/analyses/AnalysisBuilder';
import Dashboards from './pages/app/dashboards/Dashboards';
import DashboardView from './pages/app/dashboards/DashboardView';
import PublicDashboard from './pages/public/PublicDashboard';
import AdminOverview from './pages/admin/AdminOverview';
import AdminUsers from './pages/admin/AdminUsers';
import AdminDatasets from './pages/admin/AdminDatasets';
import AdminActivity from './pages/admin/AdminActivity';

export default function App() {
  return (
    <Routes>
      {/* Visitor pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/p/:slug" element={<PublicDashboard />} />
      </Route>

      {/* Logged-in users (user and admin) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="datasets" element={<Datasets />} />
          <Route path="datasets/new" element={<DatasetImport />} />
          <Route path="datasets/:id" element={<DatasetExplorer />} />
          <Route path="analyses" element={<Analyses />} />
          <Route path="analyses/new" element={<AnalysisBuilder key="new" />} />
          <Route path="analyses/:id" element={<AnalysisBuilder />} />
          <Route path="dashboards" element={<Dashboards />} />
          <Route path="dashboards/:id" element={<DashboardView />} />
          <Route path="profile" element={<Profile />} />

          {/* Administrators only */}
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="admin" element={<AdminOverview />} />
            <Route path="admin/users" element={<AdminUsers />} />
            <Route path="admin/datasets" element={<AdminDatasets />} />
            <Route path="admin/activity" element={<AdminActivity />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
