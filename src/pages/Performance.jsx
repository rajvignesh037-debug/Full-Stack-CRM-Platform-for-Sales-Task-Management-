import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';

export default function Performance() {
  const { interns } = useAppContext();
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const data = await api.getPerformance();
        setPerformanceData(data);
      } catch (err) {
        setError('Failed to fetch performance data');
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  if (loading) {
    return <div className="p-6 text-indigo-600 font-semibold">Loading Performance Data...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600 font-semibold">{error}</div>;
  }

  const activePerformance = performanceData.filter(p => interns.some(i => i.id === p.intern_id));

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Employee Performance Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Real-time statistics on Employee conversions and activity.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Total Leads</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Contacted</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Demos Scheduled</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Converted</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Conversion Rate</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activePerformance.map((row, index) => (
                <tr key={row.intern_id} className={`hover:bg-gray-50 ${index === 0 && row.conversion_rate > 0 ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      {index === 0 && row.conversion_rate > 0 && <span className="text-yellow-500 text-lg">🏆</span>}
                      {row.intern_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {row.group_name === 'Technical' ? (row.job_type || 'Technical') : row.group_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{row.total_leads}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{row.contacted_leads}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{row.demo_scheduled}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-600">{row.converted_leads}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="text-sm font-bold text-gray-900 mr-2">{row.conversion_rate}%</span>
                      <div className="w-16 bg-gray-200 rounded-full h-1.5 flex-1">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min(row.conversion_rate, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">
                    ₹{row.total_revenue.toLocaleString()}
                  </td>
                </tr>
              ))}
              {activePerformance.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">No performance data found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
