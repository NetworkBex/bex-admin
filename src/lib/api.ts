'use client';

import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.bexnetwork.io/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_access');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      // Token rejected — bounce to login.
      localStorage.removeItem('admin_access');
      localStorage.removeItem('admin_refresh');
      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login?next=' + encodeURIComponent(window.location.pathname);
      }
    }
    return Promise.reject(err);
  },
);

export default api;

export function parseApiError(err: any, fallback = 'Request failed'): string {
  const data = err?.response?.data;
  if (!data) return err?.message || fallback;
  if (typeof data === 'string') return data;
  if (typeof data.detail === 'string') return data.detail;
  if (typeof data.error === 'string') return data.error;
  if (Array.isArray(data.non_field_errors)) return data.non_field_errors.join(', ');
  const msgs = Object.values(data).flat().filter(Boolean) as string[];
  if (msgs.length) return msgs.join(', ');
  return fallback;
}

// ─── Domain APIs (typed wrappers) ─────────────────────────────────────

export const authAPI = {
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login/', data),
  me: () => api.get('/auth/me/'),
};

export const userAPI = {
  list: (params?: any) => api.get('/auth/customers/', { params }),
  get: (id: number) => api.get(`/auth/customers/${id}/`),
  updateProfile: (id: number, data: any) => api.patch(`/auth/customers/${id}/update_profile/`, data),
  suspend: (id: number) => api.post(`/auth/customers/${id}/suspend/`),
  activate: (id: number) => api.post(`/auth/customers/${id}/activate/`),
  adjustBalance: (id: number, data: { amount: number; type: 'credit' | 'debit' }) =>
    api.post(`/auth/customers/${id}/adjust_balance/`, data),
  sendPasswordReset: (id: number) => api.post(`/auth/customers/${id}/send_password_reset/`),
  bulkAction: (data: { ids: number[]; action: 'activate' | 'suspend' | 'verify' }) =>
    api.post('/auth/customers/bulk_action/', data),
  detail: (id: number) => api.get(`/auth/customers/${id}/detail/`),
  referrals: (id: number) => api.get(`/auth/customers/referrals/`),
  verifications: (id: number) => api.get('/auth/verifications/', { params: { customer: id } }),
  kyc: (id: number) => api.get('/auth/kyc/', { params: { customer: id } }),
  wallets: (id: number) => api.get('/auth/wallets/', { params: { customer: id } }),
};

export const transactionAPI = {
  list: (params?: any) => api.get('/transactions/', { params }),
  approve: (id: number) => api.post(`/transactions/${id}/approve/`),
  cancel: (id: number) => api.post(`/transactions/${id}/cancel/`),
  bulkAction: (data: { ids: number[]; action: 'approve' | 'cancel' }) =>
    api.post('/transactions/bulk_action/', data),
  uploadProof: (id: number, file: File) => {
    const fd = new FormData();
    fd.append('transaction_id', String(id));
    fd.append('prove', file);
    return api.post('/transactions/upload_proof/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const investmentAPI = {
  list: (params?: any) => api.get('/investments/', { params }),
  cashout: (id: number) => api.post(`/investments/${id}/cashout/`),
  cancel: (id: number) => api.post(`/investments/${id}/cancel/`),
};

export const earningsAPI = {
  list: (params?: any) => api.get('/earnings/', { params }),
  runs: () => api.get('/earnings/runs/'),
  summary: () => api.get('/earnings/summary/'),
};

export const planAPI = {
  get: () => api.get('/affiliate/plan/'),
  adminGet: () => api.get('/affiliate/admin/plan/'),
  adminUpdate: (data: any) => api.put('/affiliate/admin/plan/', data),
  applications: (status?: string) =>
    api.get('/affiliate/admin/applications/', { params: status ? { status } : {} }),
  decideApplication: (id: number, status: 'approved' | 'rejected') =>
    api.post(`/affiliate/admin/applications/${id}/decide/`, { status }),
  foundingStatus: () => api.get('/affiliate/founding-status/'),
  me: () => api.get('/affiliate/me/'),
};

export const coreAPI = {
  currencies: () => api.get('/core/currencies/'),
  investPlans: () => api.get('/core/invest-plans/'),
  testimonies: () => api.get('/core/testimonies/'),
  blog: () => api.get('/core/blog/'),
  countries: () => api.get('/core/countries/'),
  settings: () => api.get('/core/settings/'),
  updateSettings: (data: any) => api.patch('/core/settings/', data),
  announcements: () => api.get('/core/announcements/'),
  announcement: (id: number) => api.get(`/core/announcements/${id}/`),
  createAnnouncement: (data: any) => api.post('/core/announcements/', data),
  updateAnnouncement: (id: number, data: any) => api.patch(`/core/announcements/${id}/`, data),
  deleteAnnouncement: (id: number) => api.delete(`/core/announcements/${id}/`),
  publishAnnouncement:   (id: number) => api.post(`/core/announcements/${id}/publish/`),
  unpublishAnnouncement: (id: number) => api.post(`/core/announcements/${id}/unpublish/`),
  duplicateAnnouncement: (id: number) => api.post(`/core/announcements/${id}/duplicate/`),
};

export const auditAPI = {
  /** Use this — supports category / severity / action / actor / target_id /
   *  from / to filters, plus `?format=csv` export. */
  search: (params?: any) => api.get('/audit/', { params }),
  /** Legacy single-page endpoint kept for backwards compat. */
  list: (params?: any) => api.get('/audit/', { params }),
  summary: () => api.get('/audit/summary/'),
};

export const opsAPI = {
  health: () => api.get('/ops/health/'),
  stats: () => api.get('/ops/stats/'),
  beat: () => api.get('/ops/beat/'),
  taskResults: () => api.get('/ops/task-results/'),
  logs: (lines = 200) => api.get('/ops/logs/', { params: { lines } }),
  triggerCredit: (date?: string) => api.post('/ops/trigger/credit/', date ? { date } : {}),
  triggerBackfill: (days: number) => api.post('/ops/trigger/backfill/', { days }),
};
