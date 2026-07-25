import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const routeNames = {
  '/dashboard': 'Dashboard',
  '/my-work': 'My Assigned Leads',
  '/demos': 'Demo Tracker',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/admin': 'Admin Control Panel',
  '/technical-team': 'Technical Team Management',
  '/my-tasks': 'My Technical Tasks',
  '/inbox': 'Notifications & Inbox',
};

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useAppContext();
  const pageTitle = routeNames[location.pathname] || 'Overview';

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <h2 className="text-xl font-semibold text-gray-800">{pageTitle}</h2>
      <div className="flex items-center space-x-6">
        <div className="flex items-center gap-3">
          {user?.avatar ? (
             <img src={user.avatar} alt="Profile" className="h-9 w-9 rounded-full object-cover border border-gray-200 bg-indigo-50" />
          ) : (
             <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                {user ? user.name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase() : 'U'}
             </div>
          )}
        </div>
        <button onClick={handleLogout} className="text-sm font-medium text-gray-500 hover:text-red-600 transition-colors">Logout</button>
      </div>
    </header>
  );
}
