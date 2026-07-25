import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  
  const [leads, setLeads] = useState([]);
  const [demos, setDemos] = useState([]);
  const [users, setUsers] = useState([]);
  const [interns, setInterns] = useState([]);
  const [activities, setActivities] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const groups = ['Sales', 'Technical'];

  const fetchLeads = useCallback(async () => {
    try {
      const data = await api.fetchLeads();
      setLeads(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchDemos = useCallback(async () => {
    try {
      const data = await api.fetchDemos();
      setDemos(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.fetchUsers();
      setUsers(data);
      setInterns(data.filter(u => u.role === 'intern'));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchActivity = useCallback(async () => {
    try {
      const data = await api.fetchActivity();
      setActivities(data);
    } catch (e) {
      console.error(e);
    }
  }, []);
  
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await api.getUnreadCount();
      setUnreadCount(count);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!initialDataLoaded) setDataLoading(true);
    await Promise.all([fetchLeads(), fetchDemos(), fetchUsers(), fetchActivity(), fetchUnreadCount()]);
    setDataLoading(false);
    setInitialDataLoaded(true);
  }, [fetchLeads, fetchDemos, fetchUsers, fetchActivity, fetchUnreadCount, initialDataLoaded]);

  useEffect(() => {
    const initSession = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
           setUser(JSON.parse(storedUser));
        }
      } catch (e) {}
      setSessionLoading(false);
    };
    initSession();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 15000);
      return () => clearInterval(interval);
    }
  }, [user, fetchAllData]);

  const loading = sessionLoading || dataLoading;

  return (
    <AppContext.Provider value={{
      user, setUser, token: localStorage.getItem('token'),
      leads, setLeads, fetchLeads,
      demos, setDemos, fetchDemos,
      users, setUsers, fetchUsers,
      activities, setActivities, fetchActivity,
      unreadCount, setUnreadCount, fetchUnreadCount,
      interns, setInterns,
      groups,
      fetchAllData,
      loading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
