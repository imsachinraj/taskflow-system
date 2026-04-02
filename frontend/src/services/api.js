import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Request interceptor: Attach token ────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: Handle token refresh ───────────────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { refreshToken, setTokens, logout } = useAuthStore.getState();
        if (!refreshToken) throw new Error('No refresh token');

        const response = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        toast.error('Session expired. Please log in again.');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── API methods ───────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

export const teamAPI = {
  getMyTeams: () => api.get('/teams'),
  createTeam: (data) => api.post('/teams', data),
  getTeam: (id) => api.get(`/teams/${id}`),
  updateTeam: (id, data) => api.patch(`/teams/${id}`, data),
  joinTeam: (inviteCode) => api.post('/teams/join', { inviteCode }),
  updateMemberRole: (teamId, userId, role) => api.patch(`/teams/${teamId}/members/${userId}/role`, { role }),
  removeMember: (teamId, userId) => api.delete(`/teams/${teamId}/members/${userId}`),
  regenerateInviteCode: (teamId) => api.post(`/teams/${teamId}/invite-code`),
};

export const taskAPI = {
  getTasks: (params) => api.get('/tasks', { params }),
  getTask: (id) => api.get(`/tasks/${id}`),
  createTask: (data) => api.post('/tasks', data),
  updateTask: (id, data) => api.patch(`/tasks/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  bulkUpdate: (tasks) => api.patch('/tasks/bulk-update', { tasks }),
  getAnalytics: (teamId) => api.get('/tasks/analytics', { params: { teamId } }),
};

export const commentAPI = {
  getComments: (taskId) => api.get('/comments', { params: { taskId } }),
  addComment: (data) => api.post('/comments', data),
  updateComment: (id, content) => api.patch(`/comments/${id}`, { content }),
  deleteComment: (id) => api.delete(`/comments/${id}`),
  toggleReaction: (id, emoji) => api.post(`/comments/${id}/reactions`, { emoji }),
};

export const activityAPI = {
  getActivities: (params) => api.get('/activities', { params }),
};

export const userAPI = {
  updateProfile: (data) => api.patch('/users/me', data),
  changePassword: (data) => api.patch('/users/me/password', data),
  searchUsers: (q, teamId) => api.get('/users/search', { params: { q, teamId } }),
};
