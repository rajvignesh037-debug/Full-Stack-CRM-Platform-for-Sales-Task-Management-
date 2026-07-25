import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

export default function DemoManagement() {
  const { demos, setDemos, leads, setLeads, interns, fetchAllData } = useAppContext();

  const [conversionDrafts, setConversionDrafts] = useState({});
  const [confirmModal, setConfirmModal] = useState(null); // stores {demo, lead, draft}

  const [dateFilter, setDateFilter] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' or 'completed'
  const [editingDemo, setEditingDemo] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', time: '' });
  const [planForm, setPlanForm] = useState({ planValue: '', duration: '' });
  const [error, setError] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);

  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');

  const filteredDemos = demos.filter(d => {
    if (dateFilter) {
      return d.date === dateFilter || d.demoDate === dateFilter;
    }
    return true;
  });

  const getStatus = (status) => {
    if (status === 'Converted' || status === 'Not Converted' || status === 'Completed') return 'Completed';
    return 'Scheduled';
  };

  const currentDemos = filteredDemos
    .filter(d => activeTab === 'upcoming' ? getStatus(d.status) === 'Scheduled' : getStatus(d.status) === 'Completed')
    .sort((a, b) => {
      if (sortField === 'date') {
        const dateA = new Date(a.date || a.demoDate || 0);
        const dateB = new Date(b.date || b.demoDate || 0);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
      if (sortField === 'name') {
        const nameA = (a.lead_name || a.clientName || '').toLowerCase();
        const nameB = (b.lead_name || b.clientName || '').toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      return 0;
    });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const openEdit = (demo) => {
    setEditingDemo(demo);
    setEditForm({ date: demo.date || demo.demoDate || '', time: demo.time || '' });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await api.updateDemo(editingDemo.id, { date: editForm.date, time: editForm.time });
      await fetchAllData();
      setEditingDemo(null);
    } catch (err) {
      console.error(err);
      setError('Failed to update demo.');
    }
  };

  const openPlanEdit = (demo) => {
    setEditingPlan(demo);
    setPlanForm({
      planValue: demo.plan_value || '',
      duration: demo.duration || ''
    });
  };

  const handlePlanSave = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      await api.updateDemoPlan(editingPlan.id, {
        plan_value: Number(planForm.planValue),
        duration: Number(planForm.duration)
      });
      await fetchAllData();
      setEditingPlan(null);
    } catch (err) {
      console.error(err);
      setError('Failed to update plan.');
    }
  };

  const handleConvStatusChange = (demoId, status) => {
    setConversionDrafts(prev => ({
      ...prev,
      [demoId]: { ...(prev[demoId] || {}), status, planValue: '', duration: '' }
    }));
  };

  const handlePlanChange = (demoId, planValue) => {
    setConversionDrafts(prev => ({
      ...prev,
      [demoId]: { ...(prev[demoId] || {}), planValue: Number(planValue) }
    }));
  };

  const handleDurationChange = (demoId, duration) => {
    setConversionDrafts(prev => ({
      ...prev,
      [demoId]: { ...(prev[demoId] || {}), duration: Number(duration) }
    }));
  };

  const [loading, setLoading] = useState(false);

  const initSave = (demo, lead, draft) => {
    setError(null);
    if (!lead && !demo.lead_id) {
      setError("Lead not found. Cannot convert this demo.");
      return;
    }
    if (draft.status === 'Converted') {
      if (!draft.planValue || !draft.duration) {
        setError('Please select both a plan and a duration before saving.');
        return;
      }
      setConfirmModal({ demo, lead, draft });
    } else {
      saveConversion(demo, lead, draft);
    }
  };

  const saveConversion = async (demo, lead, draft) => {
    setError(null);
    if (!lead && !demo.lead_id) {
      setError('Lead not found. Cannot convert this demo.');
      return;
    }
    setLoading(true);
    try {
      await api.convertDemo(demo.id, {
        status: draft.status,
        plan_value: draft.planValue || lead?.planValue || 0,
        duration: draft.duration || lead?.duration || 0
      });

      // TASK 4: Call fetchAllData after mutations
      await fetchAllData();

      setConversionDrafts(prev => {
        const newDrafts = { ...prev };
        delete newDrafts[demo.id];
        return newDrafts;
      });
      setConfirmModal(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update conversion status.');
    } finally {
      setLoading(false);
    }
  };

  const ExpandableText = ({ text, title, maxLength = 25, className = "" }) => {
    if (!text || String(text).trim() === "") return <span>-</span>;
    const str = String(text);
    if (str.length <= maxLength) return <span className={className}>{str}</span>;
    return (
      <div className={`flex flex-col ${className}`}>
        <span className="truncate max-w-[180px]">{str.substring(0, maxLength)}...</span>
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedDetail({ title, content: str }); }}
          className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold text-left mt-0.5"
        >
          Read More
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Demo Management</h1>
        <p className="text-gray-500 text-sm mt-1">Review demos and control the conversion pipeline seamlessly.</p>
      </div>

      {/* BUG FIX: Error rendering */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'upcoming' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Upcoming Demos
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${activeTab === 'completed' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Completed Demos
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-200">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => toggleSort('name')}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Client Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Employee Details</th>
                <th
                  onClick={() => toggleSort('date')}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:bg-gray-100"
                >
                  Demo Timeline {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Lead Details (Address)</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Conversion Control</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentDemos.map(demo => {
                const intern = interns.find(i => i.id === demo.intern_id);
                const lead = leads.find(l => l.id === demo.lead_id);

                const currentDraft = conversionDrafts[demo.id] || {};
                const displayStatus = currentDraft.status || demo.lead_status || 'Not Contacted';

                return (
                  <tr key={demo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <ExpandableText text={demo.lead_name || demo.clientName} title="Client Name" />
                      <div className="text-xs text-gray-500 mt-1 font-normal">{demo.lead_contact || 'No Phone'}</div>
                      <div className="text-xs text-indigo-500 font-normal">{demo.lead_email || 'No Email'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {demo.intern_name ? (
                        <div>
                          <p className="text-sm font-medium text-gray-800">{demo.intern_name}</p>
                          <p className="text-xs text-gray-500 font-mono">{demo.intern_account_id} • {demo.intern_group}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Unassigned</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <p>{demo.date || demo.demoDate || 'N/A'}</p>
                      <p className="text-xs text-gray-500">{demo.time || ''}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>
                        <div className="text-gray-900 font-medium">
                          <ExpandableText text={demo.lead_location || demo.lead_address || demo.location} title="Full Address" />
                        </div>
                        <p className="text-xs text-gray-400 font-medium mt-1">{demo.lead_city || 'No City'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <select
                          value={displayStatus}
                          onChange={(e) => handleConvStatusChange(demo.id, e.target.value)}
                          disabled={demo.lead_status === 'Converted'}
                          className={`border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-indigo-500 outline-none w-full bg-white ${demo.lead_status === 'Converted' ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          <option value="Demo Scheduled">Demo Scheduled</option>
                          <option value="Converted">Converted</option>
                        </select>

                        {displayStatus === 'Converted' && (
                          <div className="space-y-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                            {demo.lead_status === 'Converted' ? (
                              <div className="text-xs space-y-1">
                                <p className="font-bold text-emerald-700">Plan: ₹{demo.plan_value || lead?.planValue}</p>
                                <p className="text-gray-600">Duration: {demo.duration || lead?.duration} Months</p>
                              </div>
                            ) : (
                              <>
                                <select
                                  value={currentDraft.planValue || ''}
                                  onChange={(e) => handlePlanChange(demo.id, e.target.value)}
                                  className="border border-green-300 bg-white text-green-800 rounded-lg px-2 py-1.5 text-xs focus:ring-green-500 outline-none w-full"
                                >
                                  <option value="">Select Plan...</option>
                                  <option value="499">Standard (₹499)</option>
                                  <option value="1499">Premium (₹1499)</option>
                                  <option value="2499">Enterprise (₹2499)</option>
                                </select>

                                <input
                                  type="number"
                                  placeholder="Months"
                                  value={currentDraft.duration || ''}
                                  onChange={(e) => handleDurationChange(demo.id, e.target.value)}
                                  className="border border-blue-300 bg-white text-blue-800 rounded-lg px-2 py-1.5 text-xs focus:ring-blue-500 outline-none w-full"
                                />
                              </>
                            )}
                          </div>
                        )}

                        {(Object.keys(currentDraft).length > 0 && demo.lead_status !== 'Converted') && (
                          <button
                            onClick={() => initSave(demo, lead, currentDraft)}
                            disabled={loading}
                            className="bg-indigo-600 text-white text-xs font-semibold py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                          >
                            {loading ? 'Saving...' : 'Save Changes'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {activeTab === 'upcoming' ? (
                        <button onClick={() => openEdit(demo)} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">Edit</button>
                      ) : (
                        <button onClick={() => openPlanEdit(demo)} className="text-emerald-600 hover:text-emerald-900 text-sm font-medium">Edit Plan</button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {currentDemos.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No demos match the current filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Conversion</h2>
            <div className="space-y-3 mb-6">
              <div>
                <p className="text-xs text-gray-500">Lead Name</p>
                <p className="text-sm font-semibold text-gray-900">{confirmModal.lead.clientName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Assigned Employee</p>
                <p className="text-sm font-semibold text-gray-900">
                  {interns.find(i => i.id === confirmModal.lead.assignedToId)?.name || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Plan</p>
                <p className="text-sm font-semibold text-gray-900">₹{confirmModal.draft.planValue}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="text-sm font-semibold text-gray-900">{confirmModal.draft.duration} Months</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={() => saveConversion(confirmModal.demo, confirmModal.lead, confirmModal.draft)}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl shadow-sm transition"
              >
                {loading ? 'Processing...' : 'Confirm Conversion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl transform transition-all scale-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">{selectedDetail.title}</h2>
              <button
                onClick={() => setSelectedDetail(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 min-h-[150px] max-h-[400px] overflow-y-auto">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {selectedDetail.content}
              </p>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setSelectedDetail(null)}
                className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editing Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Subscription Plan</h2>
            <form onSubmit={handlePlanSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Plan</label>
                <select
                  value={planForm.planValue}
                  onChange={e => setPlanForm({ ...planForm, planValue: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select Plan...</option>
                  <option value="499">Standard (₹499)</option>
                  <option value="1499">Premium (₹1499)</option>
                  <option value="2499">Enterprise (₹2499)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Months)</label>
                <input
                  type="number"
                  value={planForm.duration}
                  onChange={e => setPlanForm({ ...planForm, duration: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                  min="1"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-2">
                <button type="button" onClick={() => setEditingPlan(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition">Save Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Editing Demo Modal */}
      {editingDemo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Demo Details</h2>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={editForm.time}
                  onChange={e => setEditForm({ ...editForm, time: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-2">
                <button type="button" onClick={() => setEditingDemo(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
