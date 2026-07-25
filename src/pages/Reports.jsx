import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export default function Reports() {
    const { user } = useAppContext();
    const [data, setData] = useState(null);
    const [performance, setPerformance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [timeFilter, setTimeFilter] = useState({ range: '', week: '', month: '' });

    const isAdmin = user?.role === 'admin';

    // Issue 4: Target Tracking Logic - CONVERSIONS ONLY
    const targets = {
        daily: 5,
        weekly: 25,
        monthly: 100
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (isAdmin) {
                    const perfData = await api.getPerformance();
                    const sortedPerf = [...perfData].sort((a, b) => b.conversion_rate - a.conversion_rate);
                    setPerformance(sortedPerf);

                    const agg = perfData.reduce((acc, curr) => ({
                        total_leads: acc.total_leads + Number(curr.total_leads),
                        contacted_leads: acc.contacted_leads + Number(curr.contacted_leads),
                        demo_scheduled: acc.demo_scheduled + Number(curr.demo_scheduled),
                        converted_leads: acc.converted_leads + Number(curr.converted_leads),
                        total_revenue: acc.total_revenue + Number(curr.total_revenue)
                    }), { total_leads: 0, contacted_leads: 0, demo_scheduled: 0, converted_leads: 0, total_revenue: 0 });

                    const total_attempts = agg.demo_scheduled + agg.converted_leads;
                    agg.conversion_rate = total_attempts > 0 ? ((agg.converted_leads / total_attempts) * 100).toFixed(2) : '0.00';
                    setData(agg);
                } else {
                    const reportData = await api.getReports(timeFilter);
                    setData({
                        total_leads: reportData.total_leads,
                        contacted_leads: reportData.contacted_leads,
                        demo_scheduled: reportData.demo_scheduled,
                        converted_leads: reportData.converted_leads,
                        conversion_rate: reportData.conversion_rate,
                        total_revenue: reportData.revenue
                    });
                }
            } catch (err) {
                console.error('Error fetching metrics:', err);
                setError("Failed to load performance metrics.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [isAdmin, timeFilter]);

    if (loading) return <div className="p-8 text-center text-indigo-600 font-semibold animate-pulse">Loading specialized CRM metrics...</div>;

    if (error) return (
        <div className="p-8 text-center">
            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 inline-block">
                {error}
            </div>
        </div>
    );

    if (!data) return <div className="p-8 text-center text-gray-500">No data found.</div>;

    // Chart Data
    const pipelineData = [
        { name: 'Not Contacted', value: data.total_leads - data.contacted_leads },
        { name: 'Contacted', value: data.contacted_leads }
    ];
    const conversionData = [
        { name: 'Scheduled', value: data.demo_scheduled },
        { name: 'Converted', value: data.converted_leads }
    ];

    const COLORS = ['#E5E7EB', '#6366F1', '#10B981', '#F59E0B'];

    const renderProgressBar = (value, target) => {
        const percentage = Math.min((value / target) * 100, 100);
        const achieved = value >= target;
        return (
            <div className="space-y-2">
                <div className="flex justify-between text-xs">
                    <span className="font-medium text-gray-600">{achieved ? '🎯 Target Achieved' : '🚀 In Progress'}</span>
                    <span className="text-gray-400">{value} / {target}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${achieved ? 'bg-green-500' : 'bg-indigo-500'}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 font-sans pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{isAdmin ? 'Admin Intelligence Reports' : 'My Performance Report'}</h1>
                    <p className="text-gray-500 text-sm mt-1">{isAdmin ? 'Aggregated ecosystem data.' : 'Your individual performance metrics.'}</p>
                </div>
                {!isAdmin && (
                    <div className="flex items-center gap-4">
                        <select
                            className="border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-indigo-500 outline-none bg-white shadow-sm"
                            onChange={(e) => {
                                const val = e.target.value;
                                if (!val) setTimeFilter({ range: '', week: '', month: '' });
                                else if (val === 'today') setTimeFilter({ range: 'today', week: '', month: '' });
                                else if (val.startsWith('week-')) setTimeFilter({ range: 'week', week: val.split('-')[1], month: '' });
                                else if (val.startsWith('month-')) setTimeFilter({ range: 'month', week: '', month: val.split('-')[1] });
                            }}
                        >
                            <option value="">Full History</option>
                            <option value="today">Today</option>
                            <optgroup label="Weekly Filters">
                                <option value="week-1">Week 1</option>
                                <option value="week-2">Week 2</option>
                                <option value="week-3">Week 3</option>
                                <option value="week-4">Week 4</option>
                            </optgroup>
                            <optgroup label="Monthly Filters">
                                <option value="month-1">Month 1</option>
                                <option value="month-2">Month 2</option>
                                <option value="month-3">Month 3</option>
                            </optgroup>
                        </select>
                        <div className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold border border-indigo-100 whitespace-nowrap">
                            Daily Target: {data.converted_leads >= targets.daily ? 'Achieved ✅' : 'Pending ⏳'}
                        </div>
                    </div>
                )}
            </div>

            {/* Aggregated Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Leads</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{data.total_leads}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contacted Leads</p>
                    <p className="text-3xl font-bold text-indigo-600 mt-2">{data.contacted_leads}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Demo Attempts</p>
                    <p className="text-3xl font-bold text-amber-500 mt-2">{data.demo_scheduled + data.converted_leads}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 bg-indigo-600">
                    <p className="text-xs font-semibold text-indigo-100 uppercase tracking-wider">Conversion Rate</p>
                    <p className="text-3xl font-bold text-black mt-2">{data.conversion_rate}%</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-6">Conversion Tracking</h3>
                    <div className="space-y-8">
                        <div>
                            <p className="text-sm font-semibold text-gray-900 mb-2">Daily Goal (5 Demo's)</p>
                            {renderProgressBar(data.demo_scheduled + data.converted_leads, targets.daily)}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900 mb-2">Weekly Goal (25 Demo's)</p>
                            {renderProgressBar(data.demo_scheduled + data.converted_leads, targets.weekly)}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900 mb-2">Monthly Goal (100 Demo's)</p>
                            {renderProgressBar(data.demo_scheduled + data.converted_leads, targets.monthly)}
                        </div>
                    </div>
                </div>

                {/* Issue 3: Pie Charts */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-4">Pipeline Distribution</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pipelineData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {pipelineData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={conversionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    <Cell fill="#F59E0B" />
                                    <Cell fill="#10B981" />
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Issue 8: Enhanced Leaderboard */}
            {performance.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900">Employee Performance Leaderboard</h2>
                        <span className="text-xs text-gray-400 font-medium">Sorted by Demos Scheduled</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Rank</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Intern</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Leads</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Demos</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Conversions</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {[...performance].sort((a, b) => b.demo_scheduled - a.demo_scheduled).map((row, index) => (
                                    <tr key={row.intern_id} className={`hover:bg-gray-50 ${row.intern_id === user?.id ? 'bg-indigo-50/50' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{row.intern_name} {row.intern_id === user?.id && <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded ml-1">YOU</span>}</div>
                                            <div className="text-[10px] font-bold text-gray-400">
                                                {row.group_name === 'Technical' ? (row.job_type || 'Technical') : (row.group_name || 'Sales')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-sm text-gray-800">{row.total_leads}</td>
                                        <td className="px-6 py-4 text-center text-sm text-amber-600 font-bold">{row.demo_scheduled}</td>
                                        <td className="px-6 py-4 text-center text-sm text-emerald-600 font-bold">{row.converted_leads}</td>
                                        <td className="px-6 py-4 text-right font-black text-gray-900">₹{Number(row.total_revenue).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center">
                <div>
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-1">Total Ecosystem Revenue</h3>
                    <p className="text-xs text-gray-500 italic">Combined revenue from all successfully converted leads.</p>
                </div>
                <span className="text-4xl font-black text-indigo-600">₹{Number(data.total_revenue || 0).toLocaleString()}</span>
            </div>
        </div>
    );
}
