import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

export default function ConvertedLeads() {
  const { leads, interns, fetchAllData } = useAppContext();

  const [editingLead, setEditingLead] = useState(null);
  const [editForm, setEditForm] = useState({ planValue: '', duration: '' });
  const [selectedDetail, setSelectedDetail] = useState(null);

  // Filter only "Converted" leads
  const convertedLeads = leads.filter(lead => lead.status === 'Converted');

  const openEdit = (lead) => {
    setEditingLead(lead);
    setEditForm({ planValue: lead.planValue || '', duration: lead.duration || '' });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await api.editLead(editingLead.id, {
        name: editingLead.clientName,
        contact: editingLead.phone,
        email: editingLead.email,
        location: editingLead.address,
        city: editingLead.city,
        status: editingLead.status,
        plan_value: Number(editForm.planValue),
        duration: Number(editForm.duration)
      });
      await fetchAllData();
      setEditingLead(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save changes.");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('en-US', options);
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
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
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Converted Leads</h1>
        <p className="text-gray-500 text-sm mt-1">Review all successfully closed deals and their specific plans.</p>
      </div>

      <div className="bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Client Details</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Group</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Plan Value</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Conversion Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {convertedLeads.map((lead) => {
                return (
                  <tr key={lead.id} className="hover:bg-green-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <ExpandableText text={lead.clientName} title="Client Name" className="text-sm font-bold text-gray-900" />
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">{lead.phone}</span>
                        <span className="text-gray-300">|</span>
                        <ExpandableText text={lead.email} title="Website / Email" maxLength={20} className="text-xs text-gray-600" />
                      </div>
                      <div className="mt-1">
                        <ExpandableText
                          text={lead.address}
                          title="Full Address"
                          maxLength={30}
                          className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter"
                        />
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">, {lead.city || 'No City'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {lead.internName || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.internGroup || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {formatCurrency((lead.planValue || 0) * (lead.duration || 1))}
                      </span>
                      <div className="text-[10px] text-gray-400 mt-0.5">{lead.planValue} × {lead.duration} Months</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(lead.actionDate)}
                    </td>
                  </tr>
                );
              })}
              {convertedLeads.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No converted leads yet.</td>
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
