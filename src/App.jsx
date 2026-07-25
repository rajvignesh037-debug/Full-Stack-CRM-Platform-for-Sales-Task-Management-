import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext';
import Login from './pages/Login';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import MyWork from './pages/MyWork';
import DemoTracker from './pages/DemoTracker';
import Performance from './pages/Performance';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import DemoManagement from './pages/DemoManagement';
import ConvertedLeads from './pages/ConvertedLeads';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import InternActivity from './pages/InternActivity';
import InternControl from './pages/InternControl';
import ProtectedRoute from './components/ProtectedRoute';
import Reports from './pages/Reports';
import TechnicalTeam from './pages/TechnicalTeam';
import MyTasks from './pages/MyTasks';
import Inbox from './pages/Inbox';

function AppRoutes() {
  const { user } = useAppContext();
  const isAdmin = user?.role === 'admin';
  const crmGroups = ['Sales'];
  const isCrmIntern = user?.role === 'intern' && crmGroups.includes(user.group_name);
  const isCustomIntern = user?.role === 'intern' && user.group_name === 'Technical';


  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          {/* CRM Intern & Admin Shared */}
          {(isAdmin || isCrmIntern) && (
            <>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-work" element={<MyWork />} />
              <Route path="/reports" element={<Reports />} />
            </>
          )}

          {/* Technical Intern & Admin Shared */}
          {(isAdmin || isCustomIntern) && (
            <Route path="/my-tasks" element={<MyTasks />} />
          )}

          {/* Admin Only Exclusive */}
          {isAdmin && (
            <>
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/demos" element={<DemoTracker />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/demo-management" element={<DemoManagement />} />
              <Route path="/converted-leads" element={<ConvertedLeads />} />
              <Route path="/intern-activity" element={<InternActivity />} />
              <Route path="/intern-control" element={<InternControl />} />
              <Route path="/technical-team" element={<TechnicalTeam />} />
            </>
          )}

          {/* Common Routes */}
          <Route path="/settings" element={<Settings />} />
          <Route path="/inbox" element={<Inbox />} />
          
          {/* Default Redirects based on role */}
          <Route path="*" element={
            isAdmin ? <Navigate to="/admin" replace /> : 
            isCrmIntern ? <Navigate to="/dashboard" replace /> :
            <Navigate to="/my-tasks" replace />
          } />
        </Route>
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
