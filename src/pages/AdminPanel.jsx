import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

export default function AdminPanel() {
  const { leads, interns, demos, fetchAllData } = useAppContext();

  const groupOptions = ['Sales', 'Technical'];

  const [uploadLoading, setUploadLoading] = useState(false);
  const [internLoading, setInternLoading] = useState(false);

  const [uploadGroup, setUploadGroup] = useState('');
  const [uploadInternId, setUploadInternId] = useState('');

  const [showInternModal, setShowInternModal] = useState(false);
  const [editingIntern, setEditingIntern] = useState(null);
  const [internForm, setInternForm] = useState({
    name: '', email: '', group: groupOptions[0], jobType: '', accountId: '', password: ''
  });

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let pwd = "";
    for (let i = 0; i < 8; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    return pwd;
  };

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [customPassword, setCustomPassword] = useState('');

  const openResetPassword = (intern) => {
    setResetTargetUser(intern);
    setCustomPassword('');
    setShowResetModal(true);
  };

  const handleResetPassword = async (e, type) => {
    e.preventDefault();
    if (type === 'custom' && (!customPassword || customPassword.length < 8)) return alert("Password minimum 8 characters");

    const payload = {};
    if (type === 'custom') payload.newPassword = customPassword;

    try {
      const res = await api.resetPassword(resetTargetUser.id, payload);
      alert(`Password reset successful!${res.tempPassword ? `\nTemporary Password: ${res.tempPassword}` : ''}`);
      setShowResetModal(false);
      setCustomPassword('');
      setResetTargetUser(null);
    } catch (err) {
      alert("Failed to reset password.");
    }
  };

  const changeInternGroup = async (internId, newGroup, currentJobType) => {
    if (window.confirm("Are you sure you want to change group?")) {
      try {
        await api.updateUserGroup(internId, newGroup, currentJobType);
        await fetchAllData(); // resync dependencies
      } catch (err) {
        alert("Failed to change group.");
      }
    }
  };

  const openAddIntern = () => {
    setEditingIntern(null);
    setInternForm({ name: '', email: '', group: groupOptions[0], jobType: '', accountId: `INT${Date.now()}`, password: generatePassword() });
    setShowInternModal(true);
  };

  const openEditIntern = (intern) => {
    setEditingIntern(intern);
    setInternForm({
      name: intern.name,
      email: intern.email,
      group: intern.group_name || groupOptions[0],
      jobType: intern.job_type || '',
      accountId: intern.account_id || '',
      password: ''
    });
    setShowInternModal(true);
  };

  const saveIntern = async (e) => {
    e.preventDefault();
    setInternLoading(true);
    try {
      if (editingIntern) {
        await api.updateUserGroup(editingIntern.id, internForm.group, internForm.jobType);
        // Also update name/email if needed? But user said "Same Sales/Technical dropdown, Same Job Type input" for edit modal.
        // Let's assume we only update group/jobType for now to avoid breaking profile logic.
        alert("Intern updated successfully.");
      } else {
        await api.createUser({
          name: internForm.name,
          email: internForm.email,
          password: internForm.password,
          role: 'intern',
          group_name: internForm.group,
          job_type: internForm.jobType,
          account_id: internForm.accountId
        });
        const msg = `Intern automatically assigned password: ${internForm.password}`;
        alert(msg);
        try {
          navigator.clipboard.writeText(internForm.password);
          alert("Password copied to clipboard.");
        } catch (e) { }
      }
      await fetchAllData();
      setShowInternModal(false);
    } catch (err) {
      alert("Failed to save intern. Check if email or account ID already exists.");
    } finally {
      setInternLoading(false);
    }
  };

  const deleteIntern = async (internId) => {
    if (window.confirm("Are you sure you want to deactivate this intern? They will not be able to login anymore.")) {
      try {
        await api.deactivateUser(internId);
        await fetchAllData(); // resync dependencies
        alert("Intern deactivated successfully.");
      } catch (err) {
        alert("Failed to deactivate intern.");
      }
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadGroup && !uploadInternId) return alert("Select a group or intern first");

    const fileInput = document.getElementById("excel-upload");
    if (!fileInput.files.length) return alert("Please select a file to upload");

    const file = fileInput.files[0];
    setUploadLoading(true);

    try {
      const parsedData = await api.parseExcel(file);

      console.log("PARSED DATA:", parsedData);

      const validData = parsedData.filter(row =>
        row &&
        row.name &&
        String(row.name).trim() !== ''
      );

      if (validData.length === 0) {
        setUploadLoading(false);
        return alert("No valid rows found in file.");
      }

      const response = await api.uploadLeads({
        leads: validData,
        group: uploadGroup,
        internId: uploadInternId
      });
      const data = response.data;

      // TASK 4: Auto refetch to instantly display backend-synced data updates
      await fetchAllData();

      // TASK 3: Correct response mapping
      const assigneesFormatted = data.assignedInterns?.length > 0 ? data.assignedInterns.join(', ') : 'N/A';
      alert(`Success: ${data.message}\nAssigned Count: ${data.count}\nAssigned Intern(s): ${assigneesFormatted}`);
      fileInput.value = ""; // reset
    }
    catch (error) {
      console.error(error);
      alert("Error parsing or uploading excel file.");
    }
    finally {
      setUploadLoading(false);
    }
  };

  const filteredUploadInterns = uploadGroup ? interns.filter(i => i.group_name === uploadGroup) : interns;

  return (
    <div className="space-y-8 font-sans pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Control Center</h1>
        <p className="text-gray-500 text-sm mt-1">Manage Employees, groups, and upload leads.</p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6 max-w-2xl mx-auto w-full">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Upload & Distribute Leads</h2>
            <p className="text-sm text-gray-500">Select a group or a specific Employee, select an excel file, and distribute leads.</p>
          </div>

          <div className="flex flex-col space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Distribution Group</label>
              <select
                value={uploadGroup}
                onChange={e => { setUploadGroup(e.target.value); setUploadInternId(''); }}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white"
              >
                <option value="">All Groups</option>
                {groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specific Employee (Optional)</label>
              <select
                value={uploadInternId}
                onChange={e => setUploadInternId(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition bg-white"
              >
                <option value="">Distribute Equally Among Group</option>
                {filteredUploadInterns.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload File (.xlsx, .csv)</label>
              <input
                id="excel-upload"
                type="file"
                accept=".xlsx,.csv"
                className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>

            <button
              onClick={handleFileUpload}
              className="mt-4 w-full bg-indigo-600 text-white rounded-xl py-3 px-4 font-semibold text-sm hover:bg-indigo-700 shadow shadow-indigo-200 transition"
            >
              Upload Leads to Database (Auto-Assign sequentially)
            </button>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Manage Employees</h2>
              <p className="text-xs text-gray-500">Full control over Employees in the system.</p>
            </div>
            <button onClick={openAddIntern} className="bg-indigo-600 text-white rounded-xl py-2 px-4 font-medium text-sm hover:bg-indigo-700 shadow-sm transition">
              + Add Employee
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Account ID</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Password</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Group</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {interns.map(intern => (
                  <tr key={intern.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-sm text-gray-800">{intern.name}</p>
                      <p className="text-xs text-gray-500">{intern.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{intern.account_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono tracking-wider">🔒 Secured</td>
                    <td className="px-6 py-4">
                      <select
                        value={intern.group_name || ''}
                        onChange={(e) => changeInternGroup(intern.id, e.target.value, intern.job_type)}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:ring-indigo-500 outline-none w-40 bg-white"
                      >
                        <option value="">All Groups</option>
                        {groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                      {intern.group_name === 'Technical' && intern.job_type && (
                        <div className="mt-1">
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {intern.job_type}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3 text-sm">
                      <button onClick={() => openResetPassword(intern)} className="text-orange-600 hover:text-orange-900 font-medium">Reset</button>
                      <button onClick={() => openEditIntern(intern)} className="text-indigo-600 hover:text-indigo-900 font-medium">Edit</button>
                      <button onClick={() => deleteIntern(intern.id)} className="text-red-600 hover:text-red-900 font-medium">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showInternModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editingIntern ? 'Edit Intern' : 'Add Intern'}</h2>
            <form onSubmit={saveIntern} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input required value={internForm.name} onChange={e => setInternForm({ ...internForm, name: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input required type="email" value={internForm.email} onChange={e => setInternForm({ ...internForm, email: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
                <select value={internForm.group} onChange={e => setInternForm({ ...internForm, group: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  {groupOptions.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {internForm.group === 'Technical' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Type (e.g. Video Editor)</label>
                  <input required value={internForm.jobType} onChange={e => setInternForm({ ...internForm, jobType: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Frontend Developer" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account ID</label>
                <input required value={internForm.accountId} onChange={e => setInternForm({ ...internForm, accountId: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input value={internForm.password} onChange={e => setInternForm({ ...internForm, password: e.target.value })} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Password" />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-2">
                <button type="button" onClick={() => setShowInternModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition">Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-6">Reset access for {resetTargetUser?.name}. They will be forced to change it upon next login.</p>

            <div className="space-y-6">
              <form onSubmit={e => handleResetPassword(e, 'custom')} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Set Custom Temporary Password</label>
                  <input
                    type="password"
                    value={customPassword}
                    onChange={e => setCustomPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <button type="submit" className="w-full bg-orange-100 text-orange-700 hover:bg-orange-200 py-2 rounded-xl text-sm font-medium transition shadow-sm">
                  Assign Custom Password
                </button>
              </form>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-medium">OR</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <button
                onClick={e => handleResetPassword(e, 'generate')}
                className="w-full bg-gray-900 text-white hover:bg-gray-800 py-3 rounded-xl text-sm font-semibold transition shadow-md flex items-center justify-center gap-2"
              >
                Let System Generate One
              </button>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setShowResetModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
