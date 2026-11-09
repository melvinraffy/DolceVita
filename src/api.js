import { supabase } from './supabase.js';

const fail = (error, fallback = 'The server could not complete this request.') => {
  if (error) throw new Error(error.message || fallback);
};

const rpc = async (name, args = {}) => {
  const { data, error } = await supabase.rpc(name, args);
  fail(error);
  return data;
};

const publicUser = (profile) => profile && ({
  id: profile.id,
  first_name: profile.first_name,
  last_name: profile.last_name,
  name: profile.name,
  email: profile.email,
  phone_number: profile.phone_number,
  address: profile.address,
  role: profile.role,
  status: profile.status,
});

export async function apiCatalogue() {
  const { data, error } = await supabase.rpc('public_catalogue');
  fail(error);
  return data;
}

export async function apiBootstrap() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return apiCatalogue();
  return rpc('app_bootstrap');
}

export async function apiLogin({ email, password, account_type }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  fail(error, 'The provided credentials do not match our records.');
  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
  fail(profileError);
  if (profile.status !== 'active') {
    await supabase.auth.signOut();
    throw new Error(profile.status === 'inactive' ? 'Your staff registration was not approved. Please contact the salon administrator.' : 'Your staff account is awaiting administrator approval.');
  }
  if ((account_type === 'customer' && profile.role !== 'customer') || (account_type === 'staff' && !['staff', 'admin'].includes(profile.role))) {
    await supabase.auth.signOut();
    throw new Error('Please select the account type assigned to this account.');
  }
  return { user: publicUser(profile), redirect: profile.role === 'admin' ? '/admin' : profile.role === 'staff' ? '/staff' : '/dashboard' };
}

export async function apiRequestPasswordReset(email) {
  const redirectTo = `${window.location.origin}${window.location.pathname}?recovery=1`;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  fail(error, 'We could not send the password reset email. Please try again.');
}

export async function apiUpdatePassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  fail(error, 'We could not update your password. Please request a new reset link and try again.');
}

export async function apiRegister(details) {
  const { first_name, last_name, email, phone_number, address, password, password_confirmation, account_type } = details;
  if (password !== password_confirmation || password.length < 8) throw new Error('Passwords must match and contain at least 8 characters.');
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { first_name, last_name, phone_number, address, account_type } } });
  fail(error);
  if (account_type === 'staff') {
    await supabase.auth.signOut();
    return { message: 'Staff registration submitted. An administrator must approve the account before sign-in.' };
  }
  if (!data.session) return { message: 'Account created. Check your email to confirm your account, then sign in.' };
  const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
  fail(profileError);
  return { user: publicUser(profile), redirect: '/book' };
}

export const apiCreateAppointment = async (details) => {
  const result = await rpc('create_appointment', { request: details });
  return { ...result, appointment_id: result.appointment_id || result.id };
};
export const apiCreateInquiry = (message) => rpc('create_inquiry', { body: message, critical: true });
export const apiCustomerMessage = (id, message) => rpc('customer_inquiry_message', { inquiry: id, body: message });
export const apiStaffAppointmentStatus = (id, details) => rpc('staff_update_appointment', { appointment: id, update_data: details });
export const apiStaffInquiryMessage = (id, message, status) => rpc('staff_inquiry_message', { inquiry: id, body: message, next_status: status || 'responded' });
export const apiApproveStaff = (id) => rpc('approve_staff', { staff_id: id });
export const apiRejectStaff = (id) => rpc('reject_staff', { staff_id: id });

export async function apiCreateCategory(name) {
  const { data, error } = await supabase.from('service_categories').insert({ name }).select().single();
  fail(error);
  return data;
}

export async function apiSaveService(service) {
  let categoryId = Number(service.category_id);
  const newCategory = service.new_category?.trim();
  if (newCategory) {
    const category = await apiCreateCategory(newCategory);
    categoryId = category.id;
  }
  let image = typeof service.image === 'string' ? service.image : null;
  if (service.image instanceof File) {
    const extension = service.image.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `services/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('service-images').upload(path, service.image, { upsert: false, contentType: service.image.type });
    fail(uploadError, 'The service image could not be uploaded.');
    const { data } = supabase.storage.from('service-images').getPublicUrl(path);
    image = data.publicUrl;
  }
  const payload = { category_id: categoryId, name: service.name?.trim(), description: service.description?.trim(), price: Number(service.price), duration_minutes: Number(service.duration_minutes), is_active: Boolean(service.is_active), is_available: Boolean(service.is_available), ...(image ? { image } : {}) };
  const query = service.id ? supabase.from('services').update(payload).eq('id', service.id).select().single() : supabase.from('services').insert(payload).select().single();
  const { data, error } = await query;
  fail(error);
  return { ...data, message: service.id ? 'Service updated.' : 'Service created.' };
}

export const signOut = async () => { const { error } = await supabase.auth.signOut(); fail(error); };