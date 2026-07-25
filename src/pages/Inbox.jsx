import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function Inbox() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, setUnreadCount } = useAppContext();
  const isAdmin = user?.role === 'admin';

  const fetchNotifications = async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.markNotificationsRead();
      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  const clearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all notifications?")) return;
    try {
      await api.clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to clear notifications", err);
    }
  };

  const deleteOne = async (e, id, wasUnread) => {
    e.stopPropagation();
    try {
      await api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => fetchNotifications(false), 30000); 
    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = async (notif) => {
    // Mark as read immediately in UI
    if (!notif.is_read) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    // Trigger backend mark-read for this specific ID
    try {
      await api.markNotificationReadById(notif.id);
    } catch (e) {
      console.error(e);
    }

    if (notif.task_id) {
      if (isAdmin) {
        navigate('/technical-team', { state: { openTaskId: notif.task_id } });
      } else {
        navigate('/my-tasks', { state: { openTaskId: notif.task_id } });
      }
    } else if (notif.demo_id || notif.type === 'lead_assigned') {
      navigate('/demos');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isAdmin ? 'Inbox' : 'Notifications'}</h1>
          <p className="text-sm text-gray-500">{isAdmin ? 'Centralized notifications for Technical Team and CRM activities.' : 'Updates on your tasks and CRM activities.'}</p>
        </div>
        <div className="flex gap-3">
          {notifications.some(n => !n.is_read) && (
            <button 
              onClick={markAllRead}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-xl transition shadow-sm"
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button 
              onClick={clearAll}
              className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 px-4 py-2 rounded-xl transition shadow-sm"
            >
              Clear all
            </button>
          )}
          <button 
            onClick={() => fetchNotifications(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-indigo-600"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-indigo-600">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">No Notifications</h3>
          <p className="text-gray-500 max-w-xs mx-auto mt-1">{isAdmin ? "When interns send messages or demos are scheduled, they'll appear here." : "Stay tuned! You'll be notified here when admins update your activities."}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div 
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`bg-white rounded-2xl border transition-all duration-300 cursor-pointer relative group overflow-hidden ${
                notif.is_read 
                  ? 'border-gray-100 shadow-sm opacity-80' 
                  : 'border-green-100 shadow-lg ring-1 ring-green-50 shadow-green-100/50 scale-[1.01]'
              }`}
            >
              {!notif.is_read && (
                <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500 animate-pulse" />
              )}
              
              <div className="flex gap-4 p-5">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-500 ${
                  notif.is_read 
                    ? 'bg-gray-100 text-gray-400' 
                    : 'bg-green-50 text-green-600 shadow-[0_0_15px_rgba(34,197,94,0.2)] animate-pulse'
                }`}>
                  {notif.type.startsWith('demo_') ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  ) : notif.type === 'lead_assigned' ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className={`font-bold transition-colors ${notif.is_read ? 'text-gray-600' : 'text-gray-900 group-hover:text-green-600'}`}>{notif.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">{new Date(notif.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
                      <button 
                        onClick={(e) => deleteOne(e, notif.id, !notif.is_read)}
                        className="p-1 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded transition opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  
                  {notif.sender_name && !notif.message.includes(notif.sender_name) && (
                    <p className="text-[11px] font-bold text-indigo-600 mb-0.5">From: {notif.sender_name}</p>
                  )}
                  <p className={`text-sm mt-1 line-clamp-2 ${notif.is_read ? 'text-gray-400' : 'text-gray-600'}`}>{notif.message}</p>

                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase ${
                      notif.is_read ? 'bg-gray-50 text-gray-400' : 'bg-green-50 text-green-600'
                    }`}>
                      {(notif.type || 'info').replace('demo_', '').replace('tech_', '').replace('_', ' ')}
                    </span>
                    {notif.task_title && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${notif.is_read ? 'bg-gray-50 text-gray-400' : 'bg-gray-100 text-gray-800'}`}>
                        Task: {notif.task_title}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shadow-sm ${notif.is_read ? 'bg-gray-200 text-gray-500' : 'bg-green-500 text-white'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
