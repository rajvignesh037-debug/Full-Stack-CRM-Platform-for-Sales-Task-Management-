import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useAppContext } from '../context/AppContext';

export default function DashboardLayout() {
  const { user, loading } = useAppContext();
  
  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-indigo-600 font-semibold text-lg">Loading CRM...</div>;
  }

  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar />
        <main className="flex-1 p-6 overflow-y-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
