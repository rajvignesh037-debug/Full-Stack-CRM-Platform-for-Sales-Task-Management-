import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

export default function InternControl() {
    const { users, leads, demos, fetchAllData } = useAppContext();

    const [selectedGroup, setSelectedGroup] = useState('');
    const [selectedIntern, setSelectedIntern] = useState('');

    const [editingLead, setEditingLead] = useState(null);
    const [editingDemo, setEditingDemo] = useState(null);
    const [leadForm, setLeadForm] = useState({ name: '', contact: '', email: '', location: '', city: '', status: '', plan_value: 0, duration: 0 });
    const [demoForm, setDemoForm] = useState({ date: '', time: '' });
    const [error, setError] = useState(null);

    const interns = users.filter(u => u.role === 'intern');
    const groups = [...new Set(interns.map(i => i.group_name))].filter(Boolean);

    const filteredInterns = selectedGroup ? interns.filter(i => i.group_name === selectedGroup) : interns;

    const internLeads = selectedIntern ? leads.filter(l => l.assignedToId === parseInt(selectedIntern)) : [];
    // Demos internally map the intern id to intern_id or assignedToId
    const internDemos = selectedIntern ? demos.filter(d => (d.intern_id === parseInt(selectedIntern) || d.assignedToId === parseInt(selectedIntern))) : [];

    const handleEditLeadClick = (lead) => {
        setEditingLead(lead);
        setLeadForm({
            name: lead.clientName || '',
            contact: lead.phone || '',
            email: lead.email || '',
            location: lead.address || '',
            city: lead.city || '',
            status: lead.status || '',
            plan_value: lead.planValue || 0,
            duration: lead.duration || 0
        });
    };

    const submitEditLead = async (e) => {
        e.preventDefault();
        try {
            setError(null);
            // FIX 1: Send all fields including city
            await api.editLead(editingLead.id, {
                name: leadForm.name,
                contact: leadForm.contact,
                email: leadForm.email,
                location: leadForm.location,
                city: leadForm.city,
                status: leadForm.status,
                plan_value: leadForm.plan_value,
                duration: leadForm.duration
            });
            await fetchAllData(); // BUG FIX: Refetch after edit to sync data globally
            setEditingLead(null);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to edit lead.");
        }
    };

    const handleDeleteLead = async (leadId) => {
        if (window.confirm("Delete lead? Demos associated will be deleted too.")) {
            try {
                setError(null);
                await api.deleteLead(leadId);
                await fetchAllData(); // BUG FIX: Refetch after delete to sync data globally
            } catch (err) {
                setError(err.response?.data?.error || "Failed to delete lead.");
            }
        }
    };

    const handleEditDemoClick = (demo) => {
        setEditingDemo(demo);
        setDemoForm({
            date: demo.date || '',
            time: demo.time || ''
        });
    };

    const submitEditDemo = async (e) => {
        e.preventDefault();
        try {
            setError(null);
            await api.updateDemo(editingDemo.id, {
                date: demoForm.date,
                time: demoForm.time
            });
            await fetchAllData();
            setEditingDemo(null);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to edit demo.");
        }
    };

    const handleDeleteDemo = async (demoId) => {
        setError("Delete Demo API not available yet, cascade delete via leads is verified.");
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Employee Control Panel</h1>
                {error && <div className="text-red-600 text-sm font-medium">{error}</div>}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold mb-4">Filters</h2>
                <div className="flex gap-4">
                    <select
                        value={selectedGroup}
                        onChange={e => { setSelectedGroup(e.target.value); setSelectedIntern(''); }}
                        className="border border-gray-300 rounded-xl px-3 py-2 outline-none focus:ring-indigo-500"
                    >
                        <option value="">Select Group</option>
                        {groups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select
                        value={selectedIntern}
                        onChange={e => setSelectedIntern(e.target.value)}
                        className="border border-gray-300 rounded-xl px-3 py-2 outline-none focus:ring-indigo-500"
                    >
                        <option value="">Select Employee</option>
                        {filteredInterns.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                </div>
            </div>

            {selectedIntern && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1 min-h-0">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b">
                            <h3 className="font-semibold text-gray-800">Assigned Leads ({internLeads.length})</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Contact/Location</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {internLeads.map(l => (
                                        <tr key={l.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 text-sm font-medium">{l.clientName}</td>
                                            <td className="px-4 py-3 text-xs text-gray-600">
                                                <div>{l.phone}</div>
                                                <div className="text-gray-900 font-medium">{l.address}</div>
                                                <div style={{ color: 'gray', fontSize: '10px' }}>{l.city}</div>
                                            </td>
                                            <td className="px-4 py-3 text-xs font-semibold text-indigo-600">{l.status}</td>
                                            <td className="px-4 py-3 space-x-2 text-right">
                                                <button onClick={() => handleEditLeadClick(l)} className="text-blue-600 hover:text-blue-800 text-xs font-bold">Edit</button>
                                                <button onClick={() => handleDeleteLead(l.id)} className="text-red-600 hover:text-red-800 text-xs font-bold">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b">
                            <h3 className="font-semibold text-gray-800">Linked Demos ({internDemos.length})</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Lead Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Date & Time</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {internDemos.map(d => {
                                        const leadMatch = leads.find(l => l.id === d.lead_id) || { clientName: 'Unknown' };
                                        return (
                                            <tr key={d.id} className="hover:bg-gray-50 transition">
                                                <td className="px-4 py-3 text-sm font-medium">{leadMatch.clientName}</td>
                                                <td className="px-4 py-3 text-xs text-gray-600">{new Date(d.date).toLocaleDateString()}<br />{d.time}</td>
                                                <td className="px-4 py-3 text-xs font-semibold text-emerald-600">{d.status}</td>
                                                <td className="px-4 py-3 space-x-2 text-right">
                                                    <button onClick={() => handleEditDemoClick(d)} className="text-blue-600 hover:text-blue-800 text-xs font-bold">Edit</button>
                                                    <button onClick={() => handleDeleteDemo(d.id)} className="text-red-600 hover:text-red-800 text-xs font-bold">Delete</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {editingLead && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Lead</h2>
                        <form onSubmit={submitEditLead} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                                <input value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" required />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Contact</label>
                                <input value={leadForm.contact} onChange={e => setLeadForm({ ...leadForm, contact: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" value={leadForm.email} onChange={e => setLeadForm({ ...leadForm, email: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                                <input value={leadForm.location} onChange={e => setLeadForm({ ...leadForm, location: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                                <input value={leadForm.city} onChange={e => setLeadForm({ ...leadForm, city: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <div className="flex justify-end gap-3 mt-6 pt-2">
                                <button type="button" onClick={() => setEditingLead(null)} className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {editingDemo && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Demo</h2>
                        <form onSubmit={submitEditDemo} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                                <input type="date" value={demoForm.date} onChange={e => setDemoForm({ ...demoForm, date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" required />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
                                <input type="time" value={demoForm.time} onChange={e => setDemoForm({ ...demoForm, time: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" required />
                            </div>
                            <div className="flex justify-end gap-3 mt-6 pt-2">
                                <button type="button" onClick={() => setEditingDemo(null)} className="px-4 py-2 text-sm font-medium bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
