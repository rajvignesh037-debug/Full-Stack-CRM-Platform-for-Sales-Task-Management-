import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';

export default function ProtectedRoute() {
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { setUser, user } = useAppContext();
  const location = useLocation();

  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem('token');
      const localUser = localStorage.getItem('user');
      
      if (!token) {
        setIsValidating(false);
        return;
      }
      
      // Assume authenticated if token exists, to prevent logout on non-401 errors
      if (localUser) {
          setIsAuthenticated(true);
      }
      
      try {
        const response = await api.verifyToken();
        if (response.success && response.data.valid) {
          setUser(response.data.user);
          setIsAuthenticated(true);
        } else {
            // let interceptor handle 401
        }
      } catch (err) {
        // If API fails with non-401 (e.g. 500 error), stay authenticated if we have local data.
        console.error("Token verification failed:", err);
      }
      setIsValidating(false);
    };

    verifyUser();
  }, []);

  if (isValidating) {
    return <div className="min-h-screen flex items-center justify-center">Loading secure environment...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const currentUser = user || JSON.parse(localStorage.getItem('user') || '{}');
  
  // ROLE BASED ACCESS
  const path = location.pathname;
  const adminRoutes = ['/admin', '/demos', '/demo-management', '/converted-leads', '/analytics', '/intern-activity'];
  const internRoutes = ['/dashboard', '/my-work'];

  if (currentUser.role === 'intern' && adminRoutes.includes(path)) {
    return <Navigate to="/my-work" replace />;
  }

  if (currentUser.role === 'admin' && internRoutes.includes(path)) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
