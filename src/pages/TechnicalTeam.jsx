import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';

export default function TechnicalTeam() {
  const { interns, user } = useAppContext();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: { totalEmployees: 0, tasks: { total: 0, ongoing: 0, review: 0, completed: 0, todo: 0 } },
    activities: [],
    topMembers: [],
    tasks: []
  });

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', assigned_to_id: '', group_id: '', due_date: '', priority: 'Medium',
    attachments: [], resourceLinks: []
  });
  const [newLink, setNewLink] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [taskFilters, setTaskFilters] = useState({
    employeeId: '',
    status: '',
    groupId: ''
  });

  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [comment, setComment] = useState('');
  const [modalJobRole, setModalJobRole] = useState('');
  const location = useLocation();

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const overview = await api.getTechOverview();
      const tasks = await api.getTechTasks();
      if (overview) {
        setData(prev => ({
          ...prev,
          ...overview,
          stats: overview.stats || prev.stats,
          tasks: tasks || prev.tasks
        }));
      } else {
        setData(prev => ({ ...prev, tasks: tasks || [] }));
      }
      // If a task is selected, refresh its details too (for chat sync)
      if (selectedTask) {
        fetchTaskDetails(selectedTask.id);
      }
    } catch (err) {
      console.error("Failed to fetch tech team data", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchTaskDetails = async (id) => {
    try {
      const res = await api.getTechTaskDetails(id);
      setSelectedTask(res);
      if (res && res.admin_unread) {
        // Optimistic update
        setData(prev => ({
          ...prev,
          tasks: prev.tasks.map(t => t.id === id ? { ...t, admin_unread: false } : t)
        }));
        await api.markTechTaskRead(id);
      }
    } catch (err) {
      console.error("Failed to fetch task details", err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await api.addTechTaskComment(selectedTask.id, comment);
      setComment('');
      fetchTaskDetails(selectedTask.id);
    } catch (err) {
      alert("Failed to add comment.");
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await api.updateTechTaskStatus(taskId, newStatus);
      fetchData();
      if (selectedTask?.id === taskId) {
        fetchTaskDetails(taskId);
      }
    } catch (err) {
      alert("Failed to update status.");
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30000); // Silent refresh
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (location.state?.openTaskId) {
      fetchTaskDetails(location.state.openTaskId);
      setActiveTab('tasks');
    }
  }, [location.state]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.assigned_to_id || !taskForm.due_date) {
      return alert("Please fill all required fields.");
    }
    try {
      // Find the 'Technical' group ID from the interns if needed, 
      // but backend handles migration so we just need ANY valid group_id if it's mandatory.
      // Actually, let's just make sure we pass the group_id if the user doesn't select one.
      const payload = { ...taskForm };
      if (!payload.group_id) {
        // Fallback or default logic if needed
      }

      // Merge file URLs and resource links into attachments for the backend
      const finalAttachments = [...taskForm.attachments.map(a => typeof a === 'string' ? a : a.url), ...taskForm.resourceLinks];

      if (editingTask) {
        await api.updateTechTask(editingTask.id, { ...payload, attachments: finalAttachments });
      } else {
        await api.createTechTask({ ...payload, attachments: finalAttachments });
      }

      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', assigned_to_id: '', group_id: '', due_date: '', priority: 'Medium', attachments: [], resourceLinks: [] });
      setEditingTask(null);
      fetchData();
    } catch (err) {
      alert(`Failed to ${editingTask ? 'update' : 'create'} task.`);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);

    // Parse attachments from strings back to UI objects
    const allAttachments = task.attachments || [];
    const attachments = allAttachments
      .filter(a => a.includes('/uploads/tasks/'))
      .map(url => ({
        url,
        name: url.split('/').pop(),
        type: url.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/i) ? 'image/png' : 'application/octet-stream'
      }));

    const resourceLinks = allAttachments.filter(a => a.startsWith('http') && !a.includes('/uploads/tasks/'));

    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      assigned_to_id: task.assigned_to_id || '',
      group_id: task.group_id || '',
      due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
      priority: task.priority || 'Medium',
      status: task.status || 'Todo',
      attachments: attachments,
      resourceLinks: resourceLinks
    });
    setModalJobRole(task.job_type || '');
    setShowTaskModal(true);
  };

  const handleDeleteTask = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this task? This will remove it from all views and stats.")) {
      try {
        await api.deleteTechTask(id);
        fetchData();
        if (selectedTask?.id === id) setSelectedTask(null);
      } catch (err) {
        alert("Failed to delete task.");
      }
    }
  };

  const handleFileUpload = async (files) => {
    setIsUploading(true);
    const uploadedFiles = [];
    for (const file of files) {
      try {
        const res = await api.uploadTechFile(file);
        if (res.success) {
          uploadedFiles.push({ name: file.name, url: res.url, type: file.type });
        }
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
    setTaskForm(prev => ({ ...prev, attachments: [...prev.attachments, ...uploadedFiles] }));
    setIsUploading(false);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        handleFileUpload([file]);
      }
    }
  };

  const handleAddLink = () => {
    if (!newLink.trim()) return;
    if (!newLink.startsWith('http')) {
      alert("Please enter a valid URL starting with http:// or https://");
      return;
    }
    setTaskForm(prev => ({ ...prev, resourceLinks: [...prev.resourceLinks, newLink.trim()] }));
    setNewLink('');
  };

  const removeAttachment = (index) => {
    setTaskForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const removeLink = (index) => {
    setTaskForm(prev => ({
      ...prev,
      resourceLinks: prev.resourceLinks.filter((_, i) => i !== index)
    }));
  };

  const techInterns = (interns || []).filter(i => i.group_name === 'Technical');

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-indigo-600">Loading Technical Team module...</div>;
  }

  return (
    <div className="space-y-6 font-sans pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isAdmin ? 'Technical Team Management' : 'Technical Team Dashboard'}</h1>
          <p className="text-gray-500 text-sm mt-1">{isAdmin ? 'Oversee groups, tasks, and technical operations.' : 'View team performance, activities, and rankings.'}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-3">
            <button onClick={() => { setEditingTask(null); setModalJobRole(''); setTaskForm({ title: '', description: '', assigned_to_id: '', group_id: '', due_date: '', priority: 'Medium', attachments: [], resourceLinks: [] }); setShowTaskModal(true); }} className="bg-indigo-600 text-white rounded-xl py-2 px-4 font-medium text-sm hover:bg-indigo-700 shadow-sm transition">
              + Assign Task
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {['overview', 'tasks', 'review'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium capitalize transition-colors relative ${activeTab === tab ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <StatCard
                title="Total Employees"
                value={data?.stats?.totalEmployees || 0}
                color="indigo"
                onClick={() => setShowEmployeeModal(true)}
              />
              <StatCard
                title="Total Tasks"
                value={data?.stats?.tasks?.total || 0}
                color="blue"
                onClick={() => { setActiveTab('tasks'); setTaskFilters({ employeeId: '', status: '', groupId: '' }); }}
              />
              <StatCard
                title="Ongoing"
                value={data?.stats?.tasks?.ongoing || 0}
                color="orange"
                onClick={() => { setActiveTab('tasks'); setTaskFilters({ employeeId: '', status: 'Ongoing', groupId: '' }); }}
              />
              <StatCard
                title="Review"
                value={data?.stats?.tasks?.review || 0}
                color="purple"
                onClick={() => setActiveTab('review')}
              />
              <StatCard
                title="Completed"
                value={data?.stats?.tasks?.completed || 0}
                color="green"
                onClick={() => { setActiveTab('tasks'); setTaskFilters({ employeeId: '', status: 'Completed', groupId: '' }); }}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Activities */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">Recent Activities</h3>
                </div>
                <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                  {data.activities.length === 0 ? (
                    <p className="p-6 text-center text-gray-500 italic">No recent activities.</p>
                  ) : (
                    data.activities.map(act => (
                      <div key={act.id} className="p-4 hover:bg-gray-50 transition">
                        <div className="flex gap-4">
                          <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {act.user_name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm text-gray-800"><span className="font-semibold">{act.user_name}</span> {act.action}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{act.details}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{new Date(act.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Top Members */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-bold text-gray-900">Top Active Members</h3>
                </div>
                <div className="p-6 space-y-4">
                  {data.topMembers.length === 0 ? (
                    <p className="text-center text-gray-500 italic text-sm">No members ranked yet.</p>
                  ) : (
                    data.topMembers.map((member, idx) => (
                      <div key={member.id} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                            <div className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-xs font-bold text-indigo-600 border border-indigo-50">
                              {member.name?.[0]?.toUpperCase()}
                            </div>
                            <span className="text-sm font-bold text-gray-700">{member.name}</span>
                          </div>
                          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-wider">
                            {member.job_type === 'Video Editing Group' ? 'Technical' : (member.job_type || 'Technical')}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                          <div className="text-center">
                            <p className="text-[9px] text-gray-400 font-bold uppercase">Done</p>
                            <p className="text-xs font-black text-green-600">{member.completed_count}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-gray-400 font-bold uppercase">Ongoing</p>
                            <p className="text-xs font-black text-blue-600">{member.ongoing_count}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-gray-400 font-bold uppercase">Review</p>
                            <p className="text-xs font-black text-purple-600">{member.review_count}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Removed Groups Tab Content */}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Filter by Employee</label>
                <select
                  value={taskFilters.employeeId}
                  onChange={e => setTaskFilters({ ...taskFilters, employeeId: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Employees</option>
                  {techInterns.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Filter by Status</label>
                <select
                  value={taskFilters.status}
                  onChange={e => setTaskFilters({ ...taskFilters, status: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Statuses</option>
                  <option value="Todo">Todo</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Review">Review</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Filter by Role</label>
                <select
                  value={taskFilters.groupId}
                  onChange={e => setTaskFilters({ ...taskFilters, groupId: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Roles</option>
                  {[...new Set((data?.tasks || []).map(t => t.job_type).filter(Boolean))]
                    .filter(role => role !== 'Video Editing Group')
                    .map(jt => <option key={jt} value={jt}>{jt}</option>)}
                </select>
              </div>
              <button
                onClick={() => setTaskFilters({ employeeId: '', status: '', groupId: '' })}
                className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition"
              >
                Clear Filters
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Task Details</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assigned To</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(data?.tasks || [])
                    .filter(t => !taskFilters.employeeId || String(t.assigned_to_id) === taskFilters.employeeId)
                    .filter(t => !taskFilters.status || t.status === taskFilters.status)
                    .filter(t => !taskFilters.groupId || t.job_type === taskFilters.groupId)
                    .map(task => (
                      <tr key={task.id} onClick={() => fetchTaskDetails(task.id)} className="hover:bg-gray-50 transition cursor-pointer">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {task.admin_unread && (
                              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" title="Unread Message" />
                            )}
                            <div>
                              <p className="font-bold text-sm text-gray-900 flex items-center gap-2">
                                {task.title}
                                {task.admin_unread && <span className="text-[8px] bg-indigo-600 text-white px-1 rounded font-black uppercase">New</span>}
                              </p>
                              <p className="text-xs text-gray-500 line-clamp-1">{task.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
                              {task.assigned_to_name ? (
                                <span className="text-[10px] font-bold text-indigo-600">{task.assigned_to_name[0].toUpperCase()}</span>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              )}
                            </div>
                            <span className={`text-sm ${task.assigned_to_name ? 'text-gray-700 font-medium' : 'text-gray-400 italic'}`}>
                              {task.assigned_to_name || 'Unassigned'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">{task.job_type === 'Video Editing Group' ? 'Technical' : (task.job_type || 'Technical')}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{new Date(task.due_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={task.status} />
                        </td>
                        <td className="px-6 py-4">
                          <PriorityBadge priority={task.priority} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              disabled={task.status === 'Completed'}
                              onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
                              className={`p-1.5 transition ${task.status === 'Completed' ? 'text-gray-200 cursor-not-allowed' : 'text-gray-400 hover:text-indigo-600'}`}
                              title={task.status === 'Completed' ? "Completed tasks cannot be edited" : "Edit Task"}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button
                              onClick={(e) => handleDeleteTask(e, task.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition"
                              title="Delete Task"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {(data?.tasks || [])
                    .filter(t => !taskFilters.employeeId || String(t.assigned_to_id) === taskFilters.employeeId)
                    .filter(t => !taskFilters.status || t.status === taskFilters.status)
                    .filter(t => !taskFilters.groupId || t.job_type === taskFilters.groupId).length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-10 text-center text-gray-500 italic">No tasks match your filters.</td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'review' && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Review Queue</h3>
              <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">
                {(data?.tasks || []).filter(t => t.status === 'Review').length} Pending
              </span>
            </div>
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Task Details</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Submitted By</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.tasks || []).filter(t => t.status === 'Review').map(task => (
                  <tr key={task.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {task.admin_unread && (
                          <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                        )}
                        <div>
                          <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            {task.title}
                            {task.admin_unread && <span className="text-[8px] bg-indigo-600 text-white px-1 rounded font-black uppercase">New</span>}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">#{task.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                          {task.assigned_to_name?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700">{task.assigned_to_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {task.last_submitted_at ? new Date(task.last_submitted_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => fetchTaskDetails(task.id)} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition">
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
                {(data?.tasks || []).filter(t => t.status === 'Review').length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-gray-400 italic text-sm">
                      Review queue is empty.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-indigo-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedTask.title}</h2>
                  <p className="text-xs text-gray-500 font-medium">
                    Assigned to <span className={selectedTask.assigned_to_name ? "text-gray-700 font-bold" : "text-gray-400 italic"}>{selectedTask.assigned_to_name || 'Unassigned'}</span> • Due by {new Date(selectedTask.due_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/2 p-8 overflow-y-auto border-r border-gray-50">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3">Description</h3>
                    <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-xl border border-gray-100">
                      {selectedTask.description || 'No description provided.'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3">Status</h3>
                      <StatusBadge status={selectedTask.status} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3">Priority</h3>
                      <PriorityBadge priority={selectedTask.priority} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3">Attachments & Resources</h3>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      {selectedTask.attachments && selectedTask.attachments.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {selectedTask.attachments.map((file, i) => {
                            const isImage = /\.(jpg|jpeg|png|webp)$/i.test(file);
                            const isLink = file.startsWith('http') && !file.includes('/uploads/tasks/');

                            if (isImage) {
                              return (
                                <a key={i} href={file} target="_blank" rel="noreferrer" className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white">
                                  <img src={file} alt="attachment" className="w-full h-full object-cover transition group-hover:scale-110" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                  </div>
                                </a>
                              );
                            }

                            return (
                              <a key={i} href={file} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-400 transition group shadow-sm text-center">
                                <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 group-hover:bg-indigo-600 group-hover:text-white transition">
                                  {isLink ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                  )}
                                </div>
                                <span className="text-[10px] font-bold text-gray-700 truncate w-full">
                                  {isLink ? 'External Link' : (file.split('/').pop().length > 15 ? '...' + file.split('/').pop().slice(-12) : file.split('/').pop())}
                                </span>
                                <span className="text-[8px] text-gray-400 uppercase mt-1">{isLink ? 'URL' : 'Download'}</span>
                              </a>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No attachments provided.</p>
                      )}
                    </div>
                  </div>

                  {selectedTask.status === 'Review' && (
                    <div className="pt-6 border-t border-gray-100 flex gap-3">
                      <button
                        onClick={() => handleUpdateStatus(selectedTask.id, 'Ongoing')}
                        className="flex-1 bg-orange-50 text-orange-600 font-bold py-3 rounded-xl hover:bg-orange-100 transition shadow-sm border border-orange-100"
                      >
                        Resend to Ongoing
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(selectedTask.id, 'Completed')}
                        className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition shadow-md"
                      >
                        Complete Task
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-1/2 flex flex-col bg-gray-50/30">
                <div className="p-4 border-b border-gray-100 bg-white">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">Discussion</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedTask.comments && selectedTask.comments.map(c => (
                    <div key={c.id} className={`flex flex-col ${c.user_role === 'admin' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${c.user_role === 'admin' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'}`}>
                        {c.comment}
                      </div>
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <span className="text-[10px] font-bold text-gray-400">{c.user_name}</span>
                        <span className="text-[10px] text-gray-300">•</span>
                        <span className="text-[10px] text-gray-300">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-white border-t border-gray-100">
                  <form onSubmit={handleAddComment} className="relative">
                    <input
                      type="text"
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      disabled={selectedTask.status === 'Completed'}
                      placeholder={selectedTask.status === 'Completed' ? "Discussion is locked for completed tasks" : "Type a message..."}
                      className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition ${selectedTask.status === 'Completed' ? 'cursor-not-allowed opacity-70' : 'focus:ring-2 focus:ring-indigo-500'}`}
                    />
                    <button
                      type="submit"
                      disabled={selectedTask.status === 'Completed'}
                      className={`absolute right-2 top-2 bottom-2 px-4 rounded-lg font-bold text-xs transition ${selectedTask.status === 'Completed' ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modals are handled below */}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">{editingTask ? 'Edit Technical Task' : 'Assign Technical Task'}</h2>
              <button onClick={() => setShowTaskModal(false)} className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-full">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">
              <form id="create-task-form" onSubmit={handleCreateTask} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Task Title *</label>
                  <input required disabled={!!editingTask} value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} className={`w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${editingTask ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}`} placeholder="What needs to be done?" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                  <textarea rows="3" disabled={!!editingTask} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} className={`w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 ${editingTask ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}`} placeholder="Add some context..." />
                </div>

                {/* Resources & Attachments Section */}
                <div className="md:col-span-2 space-y-4 border-t border-gray-100 pt-4">
                  <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Resources & Attachments</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Upload & Paste Area */}
                    <div
                      onPaste={handlePaste}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-500', 'bg-indigo-50'); }}
                      onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50'); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-indigo-500', 'bg-indigo-50');
                        handleFileUpload(Array.from(e.dataTransfer.files));
                      }}
                      className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:border-indigo-400 transition cursor-pointer bg-gray-50/50"
                    >
                      <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-gray-700">Click or Drag Files</p>
                        <p className="text-[10px] text-gray-400 mt-1">Paste screenshot (Ctrl+V) also works</p>
                      </div>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                        className="hidden"
                        id="task-file-upload"
                        accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.zip,.txt"
                      />
                      <label htmlFor="task-file-upload" className="mt-2 bg-white border border-gray-200 px-4 py-1.5 rounded-lg text-[10px] font-bold text-gray-600 hover:bg-gray-50 cursor-pointer shadow-sm">
                        Select Files
                      </label>
                    </div>

                    {/* Link Input Area */}
                    <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 flex flex-col gap-3">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Add Resource Link</label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={newLink}
                          onChange={e => setNewLink(e.target.value)}
                          placeholder="https://example.com"
                          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={handleAddLink}
                          className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto max-h-[80px] space-y-1">
                        {taskForm.resourceLinks.map((link, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white px-2 py-1.5 rounded-lg border border-gray-100">
                            <span className="text-[10px] text-gray-600 truncate max-w-[150px]">{link}</span>
                            <button type="button" onClick={() => removeLink(idx)} className="text-red-400 hover:text-red-600">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                        {taskForm.resourceLinks.length === 0 && <p className="text-[10px] text-gray-400 italic text-center mt-2">No links added</p>}
                      </div>
                    </div>
                  </div>

                  {/* Uploaded Files Preview */}
                  {taskForm.attachments.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Uploaded Files</label>
                      <div className="flex flex-wrap gap-3">
                        {taskForm.attachments.map((file, idx) => (
                          <div key={idx} className="relative group w-24 h-24 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                            {file?.type?.startsWith('image/') ? (
                              <img src={file.url} alt="preview" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <p className="text-[8px] text-gray-500 font-medium truncate w-full mt-1">{file?.name || 'File'}</p>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition shadow-md"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {isUploading && <p className="text-xs text-indigo-600 font-bold animate-pulse">Uploading files...</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Assign Job Role *</label>
                  <select 
                    required 
                    value={modalJobRole} 
                    onChange={e => {
                      setModalJobRole(e.target.value);
                      setTaskForm({ ...taskForm, assigned_to_id: '' });
                    }} 
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Select Job Role</option>
                    {[...new Set(techInterns.map(i => i.job_type).filter(jt => jt && jt !== 'Video Editing Group'))].map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Assign Intern *</label>
                  <select 
                    required 
                    value={taskForm.assigned_to_id} 
                    onChange={e => {
                      const internId = e.target.value;
                      const techGroup = data.groups.find(g => g.name === 'Technical');
                      setTaskForm({ 
                        ...taskForm, 
                        assigned_to_id: internId,
                        group_id: techGroup ? techGroup.id : taskForm.group_id 
                      });
                    }} 
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Select Intern</option>
                    {techInterns
                      .filter(i => !modalJobRole || i.job_type === modalJobRole)
                      .map(i => <option key={i.id} value={i.id}>{i.name} ({i.job_type || 'Technical'})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Due Date *</label>
                  <input required type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
                {editingTask && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Task Status</label>
                    <select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                      <option value="Todo">Todo</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Review">Review</option>
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1 italic">Completion is managed through the review approval flow.</p>
                  </div>
                )}
              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button type="button" onClick={() => setShowTaskModal(false)} className="px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition shadow-sm">Discard</button>
              <button form="create-task-form" type="submit" className="px-7 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 transition">{editingTask ? 'Update Task' : 'Create Task'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Listing Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Technical Team Employees</h2>
                <p className="text-xs text-gray-500 font-medium">Breakdown of task distribution across {techInterns.length} members.</p>
              </div>
              <button onClick={() => setShowEmployeeModal(false)} className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-full">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Employee Name</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Role / Job Type</th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Total Tasks</th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Completed</th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Ongoing</th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase">Review</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {techInterns.map(intern => {
                      const internTasks = (data?.tasks || []).filter(t => t.assigned_to_id === intern.id);
                      return (
                        <tr key={intern.id} className="hover:bg-gray-50/50 transition">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                {intern.name[0].toUpperCase()}
                              </div>
                              <span className="text-sm font-bold text-gray-900">{intern.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                              {intern.job_type === 'Video Editing Group' ? 'Technical' : (intern.job_type || 'Technical')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap font-black text-gray-900">{internTasks.length}</td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <span className="text-sm font-bold text-green-600">{internTasks.filter(t => t.status === 'Completed').length}</span>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <span className="text-sm font-bold text-orange-600">{internTasks.filter(t => t.status === 'Ongoing').length}</span>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <span className="text-sm font-bold text-purple-600">{internTasks.filter(t => t.status === 'Review').length}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {techInterns.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-400 italic">No technical interns found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button onClick={() => setShowEmployeeModal(false)} className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-md text-sm">
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, color, onClick }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 hover:scale-[1.02]',
    blue: 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 hover:scale-[1.02]',
    orange: 'bg-orange-50 text-orange-700 border-orange-100 hover:bg-orange-100 hover:scale-[1.02]',
    purple: 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100 hover:scale-[1.02]',
    green: 'bg-green-50 text-green-700 border-green-100 hover:bg-green-100 hover:scale-[1.02]',
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl border ${colors[color]} shadow-sm transition-all cursor-pointer group`}
    >
      <p className="text-xs font-bold uppercase tracking-wider opacity-70">{title}</p>
      <div className="flex justify-between items-end">
        <p className="text-2xl font-black mt-1">{value}</p>
        <svg className="w-5 h-5 opacity-0 group-hover:opacity-50 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Todo: 'bg-gray-100 text-gray-600',
    Ongoing: 'bg-blue-100 text-blue-600',
    Review: 'bg-purple-100 text-purple-600',
    Completed: 'bg-green-100 text-green-600',
  };
  return <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${styles[status] || styles.Todo}`}>{status}</span>;
}

function PriorityBadge({ priority }) {
  const styles = {
    Low: 'text-gray-400',
    Medium: 'text-blue-500',
    High: 'text-orange-500',
    Urgent: 'text-red-500 font-bold',
  };
  return <span className={`text-xs ${styles[priority] || styles.Medium}`}>{priority}</span>;
}
