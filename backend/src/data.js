import { query } from './db.js';
import { publicUser } from './auth.js';

const placeholders = (items) => items.map(() => '?').join(',');

export async function catalogue({ publicOnly = false } = {}) {
  const condition = publicOnly ? 'WHERE s.is_active = 1 AND s.is_available = 1 AND c.is_active = 1' : '';
  const [categories] = await query(`SELECT c.* FROM service_categories c ${publicOnly ? 'WHERE c.is_active = 1' : ''} ORDER BY c.name`);
  const [services] = await query(`SELECT s.* FROM services s JOIN service_categories c ON c.id=s.category_id ${condition} ORDER BY s.name`);
  return { categories, services };
}

export async function appointmentsFor(role, userId) {
  const where = role === 'customer' ? 'WHERE a.customer_id = ?' : '';
  const values = role === 'customer' ? [userId] : [];
  const [appointments] = await query(`SELECT a.*, u.name AS customer_name, u.email AS customer_email FROM appointments a JOIN users u ON u.id=a.customer_id ${where} ORDER BY a.appointment_date DESC, a.start_time DESC`, values);
  if (!appointments.length) return [];
  const [items] = await query(`SELECT * FROM appointment_items WHERE appointment_id IN (${placeholders(appointments)}) ORDER BY id`, appointments.map(a => a.id));
  return appointments.map(a => ({ ...a, items: items.filter(item => item.appointment_id === a.id) }));
}

export async function inquiriesFor(role, userId) {
  const where = role === 'customer' ? 'WHERE i.customer_id = ?' : '';
  const values = role === 'customer' ? [userId] : [];
  const [inquiries] = await query(`SELECT i.*, c.name AS customer_name, c.email AS customer_email, a.name AS assignee_name FROM customer_inquiries i JOIN users c ON c.id=i.customer_id LEFT JOIN users a ON a.id=i.assigned_to ${where} ORDER BY i.updated_at DESC`, values);
  if (!inquiries.length) return [];
  const [messages] = await query(`SELECT * FROM customer_inquiry_messages WHERE inquiry_id IN (${placeholders(inquiries)}) ORDER BY created_at`, inquiries.map(i => i.id));
  return inquiries.map(i => ({ ...i, messages: messages.filter(m => m.inquiry_id === i.id) }));
}

export async function bootstrap(user) {
  const [{ categories, services }, appointments, inquiries] = await Promise.all([
    catalogue(), appointmentsFor(user.role, user.id), inquiriesFor(user.role, user.id),
  ]);
  const [users] = await query('SELECT * FROM users ORDER BY name');
  const [sales] = user.role === 'admin'
    ? await query('SELECT s.*, a.booking_reference, a.customer_id, u.name AS collector_name FROM sales s JOIN appointments a ON a.id=s.appointment_id JOIN users u ON u.id=s.collected_by ORDER BY s.collected_at DESC')
    : [[]];
  return { user: publicUser(user), users: users.map(publicUser), categories, services, appointments, inquiries, sales };
}