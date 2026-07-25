// DemoTracker.jsx
import { useState } from 'react';
import { useAppContext } from '../context/AppContext';

export default function DemoTracker() {
  const { demos, interns } = useAppContext();

  const [internFilterId, setInternFilterId] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDetail, setSelectedDetail] = useState(null); // stores {title, content}

  const uniqueInternIds = [...new Set(demos.map(d => d.intern_id).filter(Boolean))];
  const uniqueGroups = [...new Set(demos.map(d => d.intern_group).filter(Boolean))];

  const filteredDemos = demos.filter(d => {
    const matchIntern = internFilterId ? String(d.intern_id) === String(internFilterId) : true;
    const matchGroup = groupFilter ? d.intern_group === groupFilter : true;
    const matchStatus = statusFilter ? d.lead_status === statusFilter : true;
    return matchIntern && matchGroup && matchStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Demo Scheduled': return <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-700">Scheduled</span>;
      case 'Converted': return <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-700">Converted</span>;
      case 'Follow-up Required': return <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-700">Follow-up</span>;
      default: return <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">{status || 'Not Contacted'}</span>;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  const ExpandableText = ({ text, title, maxLength = 30, className = "" }) => {
    if (!text || String(text).trim() === "") return <span>-</span>;
    const str = String(text);
    if (str.length <= maxLength) return <span className={className}>{str}</span>;
    return (
      <div className={`flex flex-col ${className}`}>
        <span className="truncate max-w-[200px]">{str.substring(0, maxLength)}...</span>
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
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demo Tracker</h1>
          <p className="text-gray-500 text-sm mt-1">Track upcoming and past product demonstrations across allEmployees.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-indigo-500 outline-none"
          >
            <option value="">All Lead Statuses</option>
            <option value="Not Contacted">Not Contacted</option>
            <option value="Follow-up Required">Follow-up Required</option>
            <option value="Demo Scheduled">Demo Scheduled</option>
            <option value="Converted">Converted</option>
          </select>
          <select
            value={internFilterId}
            onChange={e => setInternFilterId(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-indigo-500 outline-none"
          >
            <option value="">All Employees</option>
            {uniqueInternIds.map(id => {
              const intern = interns.find(i => i.id === id);
              return <option key={id} value={id}>{intern ? intern.name : `Unknown Intern (${id})`}</option>;
            })}
          </select>
          <select
            value={groupFilter}
            onChange={e => setGroupFilter(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-indigo-500 outline-none"
          >
            <option value="">All Groups</option>
            {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-2xl overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Client Name & Address</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Client Contact</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Demo Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Lead Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Feedback</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Assigned Employee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase text-right">Employee Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDemos.map((demo) => {
                const leadAddress = demo.lead_location || demo.lead_address || 'No Address';
                return (
                  <tr key={demo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <ExpandableText text={demo.lead_name || demo.clientName} title="Client Name" maxLength={25} />
                      <div style={{ color: 'gray', fontSize: '10px', textTransform: 'uppercase', marginTop: '4px' }}>
                        <ExpandableText text={leadAddress} title="Full Address" maxLength={30} />
                        <span className="mt-1 block">{demo.lead_city || 'No City'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      <ExpandableText text={demo.lead_email} title="Website / Email" maxLength={20} className="text-indigo-600" />
                      <div className="text-gray-500 text-xs mt-1">{demo.lead_contact || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(demo.date || demo.demoDate)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(demo.lead_status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px]">
                      <ExpandableText text={demo.feedback} title="Intern Feedback" maxLength={40} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{demo.intern_name || 'Unassigned'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      <div>ID: {demo.intern_account_id || '-'}</div>
                      <div>Group: {demo.intern_group || '-'}</div>
                    </td>
                  </tr>
                );
              })}
              {filteredDemos.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">No demos found matching the filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}
