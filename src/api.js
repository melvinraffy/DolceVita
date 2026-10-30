const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'dolce-vita-access-token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'The server could not complete this request.');
  return body;
}

export const apiLogin = (credentials) => api('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
export const apiRegister = (details) => api('/auth/register', { method: 'POST', body: JSON.stringify(details) });
export const apiBootstrap = () => api('/bootstrap');
export const apiCatalogue = () => api('/catalogue');
export const apiCreateAppointment = (details) => api('/customer/appointments', { method: 'POST', body: JSON.stringify(details) });
export const apiCreateInquiry = (message) => api('/customer/inquiries', { method: 'POST', body: JSON.stringify({ message, is_critical: true }) });
export const apiCustomerMessage = (id, message) => api(`/customer/inquiries/${id}/messages`, { method: 'POST', body: JSON.stringify({ message }) });
export const apiStaffAppointmentStatus = (id, details) => api(`/staff/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify(details) });
export const apiStaffInquiryMessage = (id, message, status) => api(`/staff/inquiries/${id}/messages`, { method: 'POST', body: JSON.stringify({ message, status }) });
export const apiApproveStaff = (id) => api(`/admin/staff/${id}/approve`, { method: 'PATCH' });
export const apiCreateCategory = (name) => api('/admin/categories', { method: 'POST', body: JSON.stringify({ name }) });
export const apiSaveService = (service) => {
  const form = new FormData();
  Object.entries(service).forEach(([key, value]) => { if (key !== 'id' && value !== undefined && value !== null) form.append(key, value); });
  return api(service.id ? `/admin/services/${service.id}` : '/admin/services', { method: service.id ? 'PATCH' : 'POST', body: form });
};