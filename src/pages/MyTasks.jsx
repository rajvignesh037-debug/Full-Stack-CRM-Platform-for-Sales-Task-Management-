import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';
import { useLocation } from 'react-router-dom';

export default function MyTasks() {
  const { user } = useAppContext();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [comment, setComment] = useState('');
  const [filterStatus, setFilterStatus] = useState(null); // Filter by status
  const location = useLocation();

  const fetchTasks = async () => {
    try {
      const data = await api.getTechTasks();
      setTasks(data);
    } catch (err) {
      console.error("Failed to fetch tasks", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskDetails = async (id) => {
    try {
      const data = await api.getTechTaskDetails(id);
      setSelectedTask(data);
      // Mark task as read
      if (data.intern_unread) {
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === id ? { ...t, intern_unread: false } : t));
        await api.markTechTaskRead(id);
      }
    } catch (err) {
      console.error("Failed to fetch task details", err);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (location.state?.openTaskId) {
      fetchTaskDetails(location.state.openTaskId);
    }
    if (location.state?.filter) {
      setFilterStatus(location.state.filter);
    }
  }, [location.state]);

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await api.updateTechTaskStatus(taskId, newStatus);
      fetchTasks();
      if (selectedTask?.id === taskId) {
        fetchTaskDetails(taskId);
      }
    } catch (err) {
      alert("Failed to update status.");
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

  if (loading) return <div className="flex items-center justify-center h-64 text-indigo-600">Loading your tasks...</div>;

  const tasksByStatus = {
    Todo: tasks.filter(t => t.status === 'Todo'),
    Ongoing: tasks.filter(t => t.status === 'Ongoing'),
    Review: tasks.filter(t => t.status === 'Review'),
    Completed: tasks.filter(t => t.status === 'Completed'),
  };

  return (
    <div className="space-y-6 font-sans pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Technical Tasks</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your assigned technical work and status.</p>
      </div>

      <div className="flex gap-4 mb-4">
        <button 
          onClick={() => setFilterStatus(null)} 
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${!filterStatus ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}
        >
          All Tasks ({tasks.length})
        </button>
        {Object.entries(tasksByStatus).map(([status, items]) => (
          <button 
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${filterStatus === status ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            <span className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
            {status} ({items.length})
          </button>
        ))}
      </div>

      {!filterStatus ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-[calc(100vh-250px)]">
          {Object.entries(tasksByStatus).map(([status, items]) => (
            <div key={status} onClick={() => setFilterStatus(status)} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col h-full cursor-pointer hover:bg-gray-100/50 transition">
              <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                {status}
              </h3>
              <span className="text-xs font-bold text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-100 shadow-sm">{items.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {items.map(task => (
                <div 
                  key={task.id} 
                  onClick={() => fetchTaskDetails(task.id)}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-indigo-300 hover:shadow-md transition cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPriorityStyle(task.priority)}`}>
                      {task.priority}
                    </span>
                    <div className="flex items-center gap-2">
                       {task.intern_unread && (
                         <span className="bg-green-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md animate-pulse shadow-sm">NEW</span>
                       )}
                       {task.intern_unread && <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />}
                       <span className="text-[10px] text-gray-400 font-medium">{new Date(task.due_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <h4 className="font-bold text-gray-800 text-sm group-hover:text-indigo-600 transition mb-1">{task.title}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-3">{task.description}</p>
                  <div className="flex justify-between items-center mt-auto pt-3 border-t border-gray-50">
                    <div className="flex -space-x-2">
                      <div className="h-6 w-6 rounded-full bg-gray-50 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-400" title={user?.name || 'Unassigned'}>
                        {user?.name && user.name.length > 0 ? (
                          <span className="text-indigo-600">{user.name[0].toUpperCase()}</span>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        )}
                      </div>
                    </div>
                    {task.comment_count > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                        {task.comment_count}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-xs text-gray-400 italic">
                  No tasks in {status}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Task Title</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Assigned By</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.filter(t => t.status === filterStatus).map(task => (
                <tr key={task.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {task.intern_unread && (
                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
                          {task.title}
                          {task.intern_unread && <span className="text-[8px] bg-green-500 text-white px-1.5 py-0.5 rounded-md font-black uppercase animate-pulse shadow-sm">New</span>}
                        </span>
                        <span className="text-[10px] text-gray-400">#{task.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(task.due_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">Admin</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusBadgeStyle(task.status)}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => fetchTaskDetails(task.id)} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold bg-indigo-50 px-3 py-1.5 rounded-lg transition">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
                  <p className="text-xs text-gray-500 font-medium">Due by {new Date(selectedTask.due_date).toLocaleDateString()} • {selectedTask.priority} Priority</p>
                </div>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left Side: Info */}
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
                      <h3 className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3">Role</h3>
                      <div className="bg-indigo-50 text-indigo-700 font-bold text-xs px-3 py-2 rounded-lg inline-block">
                        {selectedTask.job_type || 'Technical'}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3">Status</h3>
                      <select 
                        value={selectedTask.status} 
                        onChange={(e) => handleUpdateStatus(selectedTask.id, e.target.value)}
                        className={`bg-white border border-gray-200 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg outline-none transition ${selectedTask.status === 'Review' || selectedTask.status === 'Completed' ? 'cursor-not-allowed opacity-70' : 'focus:ring-2 focus:ring-indigo-500'}`}
                        disabled={selectedTask.status === 'Review' || selectedTask.status === 'Completed'}
                      >
                        <option value="Todo">Todo</option>
                        <option value="Ongoing">Ongoing</option>
                        <option value="Review">Review</option>
                        {selectedTask.status === 'Completed' && <option value="Completed">Completed</option>}
                      </select>
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
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656 0l-4 4a4 4 0 005.656 5.656l1.1-1.1" /></svg>
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


                  <div>
                    <h3 className="text-xs font-bold uppercase text-gray-400 tracking-widest mb-3">Action History</h3>
                    <div className="space-y-3">
                      <div className="flex gap-3 text-xs">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1" />
                        <div>
                          <p className="text-gray-700 font-medium">Task created</p>
                          <p className="text-gray-400">{new Date(selectedTask.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Chat */}
              <div className="w-1/2 flex flex-col bg-gray-50/30">
                <div className="p-4 border-b border-gray-100 bg-white">
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Discussion
                  </h3>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedTask.comments?.map(c => (
                    <div key={c.id} className={`flex flex-col ${c.user_role === 'admin' ? 'items-start' : 'items-end'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${c.user_role === 'admin' ? 'bg-white border border-gray-100 text-gray-800 rounded-tl-none' : 'bg-indigo-600 text-white rounded-tr-none'}`}>
                        {c.comment}
                      </div>
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <span className="text-[10px] font-bold text-gray-400">{c.user_name}</span>
                        <span className="text-[10px] text-gray-300">•</span>
                        <span className="text-[10px] text-gray-300">{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {c.is_read ? <span className="text-gray-300">✓</span> : <span className="text-green-500 font-bold">●</span>}
                      </div>
                    </div>
                  ))}
                  {(!selectedTask.comments || selectedTask.comments.length === 0) && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                      <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      <p className="text-xs font-medium">Start a discussion...</p>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-white border-t border-gray-100">
                  <form onSubmit={handleAddComment} className="relative">
                    <input 
                      type="text" 
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      disabled={selectedTask.status === 'Review' || selectedTask.status === 'Completed'}
                      placeholder={selectedTask.status === 'Review' || selectedTask.status === 'Completed' ? "Task is locked during review/completion" : "Type a message..."} 
                      className={`w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition ${selectedTask.status === 'Review' || selectedTask.status === 'Completed' ? 'cursor-not-allowed opacity-70' : 'focus:ring-2 focus:ring-indigo-500 focus:bg-white'}`}
                    />
                    <button 
                      type="submit" 
                      disabled={selectedTask.status === 'Review' || selectedTask.status === 'Completed'}
                      className={`absolute right-2 top-2 bottom-2 px-4 rounded-lg font-bold text-xs transition ${selectedTask.status === 'Review' || selectedTask.status === 'Completed' ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
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
    </div>
  );
}

function getStatusBadgeStyle(status) {
  const styles = {
    Todo: 'bg-gray-100 text-gray-600',
    Ongoing: 'bg-blue-100 text-blue-600',
    Review: 'bg-purple-100 text-purple-600',
    Completed: 'bg-green-100 text-green-600',
  };
  return styles[status] || styles.Todo;
}

function getStatusColor(status) {
  const colors = {
    Todo: 'bg-gray-400',
    Ongoing: 'bg-blue-500',
    Review: 'bg-purple-500',
    Completed: 'bg-green-500',
  };
  return colors[status] || 'bg-gray-400';
}

function getPriorityStyle(priority) {
  const styles = {
    Low: 'bg-gray-100 text-gray-500',
    Medium: 'bg-blue-50 text-blue-600',
    High: 'bg-orange-50 text-orange-600',
    Urgent: 'bg-red-50 text-red-600',
  };
  return styles[priority] || styles.Medium;
}
