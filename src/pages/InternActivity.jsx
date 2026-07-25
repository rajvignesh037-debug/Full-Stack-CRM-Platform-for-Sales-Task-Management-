import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

export default function InternActivity() {
  const { interns, user, activities: logs, fetchActivity } = useAppContext();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const userStats = interns.map(intern => {
    const userLogs = logs.filter(l => l.user_id === intern.id);
    const logins = userLogs.filter(l => l.action === 'Login').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const logouts = userLogs.filter(l => l.action === 'Logout').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return {
      ...intern,
      lastLogin: logins.length ? logins[0].timestamp : null,
      lastLogout: logouts.length ? logouts[0].timestamp : null,
      totalActions: userLogs.length
    }
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'Login': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Update Lead': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Schedule Demo': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Convert Lead': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Employee Activity Tracking</h1>
        <p className="text-gray-500 text-sm mt-1">Audit trail and recent actions performed by team members.</p>
      </div>

      <div className="bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Recent Login</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Recent Logout</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Total Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {userStats.map((stat) => (
                <tr key={stat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900">{stat.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[10px] text-gray-400 font-mono">{stat.account_id || stat.accountId}</p>
                      <span className="text-[10px] text-gray-300">•</span>
                      <span className={`text-[10px] font-bold ${stat.group_name === 'Technical' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                        {stat.group_name === 'Technical' ? (stat.job_type || 'Technical') : (stat.group_name || 'Sales')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(stat.lastLogin)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(stat.lastLogout)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-bold">
                    {stat.totalActions}
                  </td>
                </tr>
              ))}
              {userStats.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No Employees found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
