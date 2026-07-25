import axios from 'axios';
import * as XLSX from "xlsx";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Auto attach token
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token'); // BUG FIX: read fresh every time
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, error => Promise.reject(error));

// Global error handling
apiClient.interceptors.response.use(response => response, error => {
  if (error.response?.status === 401 || error.response?.status === 403) {
    if (localStorage.getItem('token')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  }
  // BUG FIX: Log all errors for debugging
  console.error('API Error:', error.response?.status, error.response?.data);
  return Promise.reject(error);
});

export const api = {
  login: async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },
  verifyToken: async () => {
    const res = await apiClient.get('/auth/verify');
    return res.data;
  },
  logout: async () => {
    await apiClient.post('/auth/logout');
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
  fetchUsers: async () => {
    const res = await apiClient.get('/users');
    return res.data?.data || [];
  },
  getUsers: async () => {
    const res = await apiClient.get('/users');
    return res.data?.data || [];
  },
  createUser: async (userData) => {
    const res = await apiClient.post('/users', userData);
    return res.data?.data || res.data;
  },
  updateUserGroup: async (id, group_name, job_type) => {
    const res = await apiClient.put(`/users/${id}/group`, { group_name, job_type });
    return res.data?.data || res.data;
  },
  deactivateUser: async (id) => {
    const res = await apiClient.put(`/users/${id}/deactivate`);
    return res.data?.data || res.data;
  },
  getPerformance: async () => {
    const res = await apiClient.get('/performance');
    return res.data?.data || [];
  },
  _mapLead: (d) => ({
    id: d.id,
    clientName: d.lead_name || d.name,
    phone: d.contact,
    email: d.email,
    address: d.location,
    city: d.city,
    status: d.status || "Not Contacted",
    assignedToId: d.assigned_to_id,
    internName: d.intern_name,
    internAccountId: d.account_id,
    internGroup: d.group_name,
    internJobType: d.job_type,
    actionDate: d.created_at || new Date().toISOString(),
    planValue: d.plan_value,
    duration: d.duration
  }),

  fetchLeads: async () => {
    const res = await apiClient.get('/leads');
    console.log("Fetched leads:", res.data);
    if (!Array.isArray(res.data?.data)) return [];
    return res.data.data.map(d => api._mapLead(d));
  },
  fetchDemos: async () => {
    const res = await apiClient.get('/demos');
    if (!Array.isArray(res.data?.data)) return [];
    return res.data.data.map(d => ({
        ...d,
        clientName: d.lead_name,
        assignedToId: d.intern_id,
        date: d.date,
        time: d.time,
        group: d.intern_group
    }));
  },
  fetchActivity: async () => {
    const res = await apiClient.get('/activity');
    return res.data?.data || [];
  },
  getReports: async (params = {}) => {
    const res = await apiClient.get('/reports', { params });
    return res.data?.data || null;
  },
  createDemo: async (payload) => {
    const res = await apiClient.post('/demos', payload);
    return res.data?.data || res.data;
  },
  deleteLead: async (id) => {
    const res = await apiClient.delete(`/leads/${id}`);
    return res.data;
  },
  editLead: async (id, payload) => {
    const res = await apiClient.put(`/leads/${id}`, payload);
    return api._mapLead(res.data?.data || res.data);
  },
  updateDemo: async (id, updates) => {
    const res = await apiClient.put(`/demos/${id}`, updates);
    return res.data?.data || res.data;
  },
  convertDemo: async (id, payload) => {
    const res = await apiClient.put(`/demos/${id}/convert`, payload);
    return res.data?.data || res.data;
  },
  updateDemoPlan: async (id, payload) => {
    const res = await apiClient.put(`/demos/${id}/plan`, payload);
    return res.data?.data || res.data;
  },
  updateDemoFeedback: async (id, feedback) => {
    const res = await apiClient.put(`/demos/${id}/feedback`, { feedback });
    return res.data?.data || res.data;
  },
  uploadLeads: async (payload) => {
    const res = await apiClient.post('/leads/upload', payload);
    return res.data;
  },
  assignLeads: async (group, leadIds) => {
    const res = await apiClient.post('/leads/assign', { group, leadIds });
    return res.data;
  },
  resetPassword: async (id, payload) => {
    const res = await apiClient.put(`/admin/reset-password/${id}`, payload);
    return res.data;
  },

  // Technical Team Module
  getTechOverview: async () => {
    const res = await apiClient.get('/tech-team/overview');
    return res.data?.data || null;
  },
  getTechGroups: async () => {
    const res = await apiClient.get('/tech-team/groups');
    return res.data?.data || [];
  },
  createTechGroup: async (data) => {
    const res = await apiClient.post('/tech-team/groups', data);
    return res.data?.data || res.data;
  },
  updateTechGroup: async (id, data) => {
    const res = await apiClient.put(`/tech-team/groups/${id}`, data);
    return res.data?.data || res.data;
  },
  deleteTechGroup: async (id) => {
    const res = await apiClient.delete(`/tech-team/groups/${id}`);
    return res.data;
  },
  getTechTasks: async () => {
    const res = await apiClient.get('/tech-team/tasks');
    return res.data?.data || [];
  },
  createTechTask: async (data) => {
    const res = await apiClient.post('/tech-team/tasks', data);
    return res.data?.data || res.data;
  },
  getTechTaskDetails: async (id) => {
    const res = await apiClient.get(`/tech-team/tasks/${id}`);
    return res.data?.data || null;
  },
  markTechTaskRead: async (id) => {
    const res = await apiClient.post(`/tech-team/tasks/${id}/mark-read`);
    return res.data;
  },
  updateTechTaskStatus: async (id, status) => {
    const res = await apiClient.put(`/tech-team/tasks/${id}/status`, { status });
    return res.data?.data || res.data;
  },
  addTechTaskComment: async (taskId, comment) => {
    const res = await apiClient.post(`/tech-team/tasks/${taskId}/comments`, { comment });
    return res.data?.data || res.data;
  },
  updateTechTask: async (id, data) => {
    const res = await apiClient.put(`/tech-team/tasks/${id}`, data);
    return res.data?.data || res.data;
  },
  deleteTechTask: async (id) => {
    const res = await apiClient.delete(`/tech-team/tasks/${id}`);
    return res.data;
  },

  // Notifications
  getNotifications: async () => {
    const res = await apiClient.get('/notifications');
    return res.data?.data || [];
  },
  markNotificationsRead: async () => {
    const res = await apiClient.post('/notifications/mark-read');
    return res.data;
  },
  markNotificationReadById: async (id) => {
    const res = await apiClient.post(`/notifications/${id}/mark-read`);
    return res.data;
  },
  getUnreadCount: async () => {
    const res = await apiClient.get('/notifications/unread-count');
    return res.data?.count || 0;
  },
  deleteNotification: async (id) => {
    const res = await apiClient.delete(`/notifications/${id}`);
    return res.data;
  },
  clearAllNotifications: async () => {
    const res = await apiClient.delete('/notifications');
    return res.data;
  },
  uploadTechFile: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/tech-team/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  parseExcel: (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                      defval: "",
                      raw: false
                    });
          
          const mappedData = jsonData.map(row => {
            const data = {
                            name: String(row.Name || row.name || "").trim(),
                            contact: String(row.Contact || row.contact || row.Phone || row.phone || "No Contact"||"").trim(),
                            email: String(row.Email || row.email || row.Website || row.website || "No Email"||"").trim(),
                            location: String(
                              row.Location ||
                              row.location ||
                              row.Address ||
                              row.address ||
                              row["Client Address"] ||
                              ""
                            ).trim(),
                            city: String(row.City || row.city || "").trim()
                          };
            if (!data.name || !data.contact || !data.email ) {
              console.log("Field mismatch/missing formatting:", row);
            }
            return data;
          });
          resolve(mappedData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }
};
