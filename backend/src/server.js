import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { db, query } from './db.js';
import { authenticate, authorize, createToken, publicUser } from './auth.js';
import { bootstrap, catalogue, appointmentsFor, inquiriesFor } from './data.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const root = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(root, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ storage: multer.diskStorage({ destination: uploadDir, filename: (_, file, done) => done(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-')}`) }), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_, file, done) => done(null, file.mimetype.startsWith('image/')) });

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadDir));
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const fail = (res, message, status = 400) => res.status(status).json({ message });
const roleHome = (role) => role === 'admin' ? '/admin' : role === 'staff' ? '/staff' : '/dashboard';

app.get('/api/health', asyncRoute(async (_, res) => { await query('SELECT 1'); res.json({ ok: true }); }));
app.get('/api/catalogue', asyncRoute(async (_, res) => res.json(await catalogue({ publicOnly: true }))));

app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const { first_name, last_name, email, phone_number = '', address = '', password, password_confirmation, account_type = 'customer' } = req.body;
  if (!first_name || !last_name || !email || !password) return fail(res, 'First name, last name, email, and password are required.');
  if (!['customer', 'staff'].includes(account_type)) return fail(res, 'Invalid account type.');
  if (password.length < 8 || password !== password_confirmation) return fail(res, 'Passwords must match and contain at least 8 characters.');
  const [existing] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email.toLowerCase()]);
  if (existing[0]) return fail(res, 'This email address is already registered.', 409);
  const role = account_type === 'staff' ? 'staff' : 'customer';
  const status = role === 'staff' ? 'pending' : 'active';
  const [result] = await query('INSERT INTO users (first_name,last_name,name,email,password_hash,phone_number,address,role,status) VALUES (?,?,?,?,?,?,?,?,?)', [first_name.trim(), last_name.trim(), `${first_name.trim()} ${last_name.trim()}`, email.toLowerCase(), await bcrypt.hash(password, 12), phone_number.trim(), address.trim(), role, status]);
  const [rows] = await query('SELECT * FROM users WHERE id=?', [result.insertId]);
  if (role === 'staff') return res.status(201).json({ message: 'Staff registration submitted. An administrator must approve the account before sign-in.' });
  const user = rows[0];
  res.status(201).json({ message: 'Account created.', token: createToken(user), user: publicUser(user), redirect: '/book' });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const { email, password, account_type } = req.body;
  const [rows] = await query('SELECT * FROM users WHERE email=? LIMIT 1', [(email || '').toLowerCase()]);
  const user = rows[0];
  if (!user || !await bcrypt.compare(password || '', user.password_hash)) return fail(res, 'The provided credentials do not match our records.', 401);
  if (user.status !== 'active') return fail(res, 'Your staff account is awaiting administrator approval.', 403);
  if ((account_type === 'customer' && user.role !== 'customer') || (account_type === 'staff' && !['staff', 'admin'].includes(user.role))) return fail(res, 'Please select the account type assigned to this account.', 403);
  res.json({ token: createToken(user), user: publicUser(user), redirect: roleHome(user.role) });
}));

app.get('/api/auth/me', authenticate, asyncRoute(async (req, res) => res.json({ user: publicUser(req.user) })));
app.get('/api/bootstrap', authenticate, asyncRoute(async (req, res) => res.json(await bootstrap(req.user))));

app.post('/api/customer/appointments', authenticate, authorize('customer'), asyncRoute(async (req, res) => {
  const { service_ids, appointment_date, start_time, contact_number, notes = '' } = req.body;
  if (!Array.isArray(service_ids) || !service_ids.length || !appointment_date || !start_time || !contact_number) return fail(res, 'Select services, date, time, and contact number.');
  const [busy] = await query("SELECT id FROM appointments WHERE appointment_date=? AND start_time=? AND status IN ('pending','confirmed')", [appointment_date, start_time]);
  if (busy[0]) return fail(res, 'This appointment time is no longer available.', 409);
  const [services] = await query(`SELECT * FROM services WHERE id IN (${service_ids.map(() => '?').join(',')}) AND is_active=1 AND is_available=1`, service_ids);
  if (services.length !== new Set(service_ids).size) return fail(res, 'One or more selected services are unavailable.');
  const total = services.reduce((sum, service) => sum + Number(service.price), 0);
  const duration = services.reduce((sum, service) => sum + Number(service.duration_minutes), 0);
  const reference = `DV-${appointment_date.replaceAll('-', '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [created] = await connection.execute('INSERT INTO appointments (booking_reference,customer_id,appointment_date,start_time,estimated_total,estimated_duration_minutes,contact_number,notes) VALUES (?,?,?,?,?,?,?,?)', [reference, req.user.id, appointment_date, start_time, total, duration, contact_number, notes]);
    for (const service of services) await connection.execute('INSERT INTO appointment_items (appointment_id,service_id,service_name,unit_price,duration_minutes,line_total) VALUES (?,?,?,?,?,?)', [created.insertId, service.id, service.name, service.price, service.duration_minutes, service.price]);
    await connection.execute('INSERT INTO appointment_status_history (appointment_id,status,changed_by,notes) VALUES (?,?,?,?)', [created.insertId, 'pending', req.user.id, 'Appointment request created']);
    await connection.commit();
    res.status(201).json({ message: 'Appointment request submitted.', appointment_id: created.insertId });
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}));
app.get('/api/customer/appointments', authenticate, authorize('customer'), asyncRoute(async (req, res) => res.json(await appointmentsFor('customer', req.user.id))));

app.post('/api/customer/inquiries', authenticate, authorize('customer'), asyncRoute(async (req, res) => {
  const message = String(req.body.message || '').trim(); if (!message) return fail(res, 'A support message is required.');
  const [created] = await query('INSERT INTO customer_inquiries (customer_id,is_critical) VALUES (?,?)', [req.user.id, Boolean(req.body.is_critical)]);
  await query("INSERT INTO customer_inquiry_messages (inquiry_id,sender_id,sender_role,message) VALUES (?,?, 'customer', ?)", [created.insertId, req.user.id, message]);
  res.status(201).json({ message: 'Support conversation created.', inquiry_id: created.insertId });
}));
app.post('/api/customer/inquiries/:id/messages', authenticate, authorize('customer'), asyncRoute(async (req, res) => {
  const message = String(req.body.message || '').trim(); if (!message) return fail(res, 'A message is required.');
  const [inquiries] = await query('SELECT * FROM customer_inquiries WHERE id=? AND customer_id=?', [req.params.id, req.user.id]); if (!inquiries[0]) return fail(res, 'Conversation not found.', 404);
  await query("INSERT INTO customer_inquiry_messages (inquiry_id,sender_id,sender_role,message) VALUES (?,?, 'customer', ?)", [req.params.id, req.user.id, message]);
  await query("UPDATE customer_inquiries SET status='open' WHERE id=?", [req.params.id]); res.json({ message: 'Message sent.' });
}));

app.get('/api/staff/appointments', authenticate, authorize('staff'), asyncRoute(async (_, res) => res.json(await appointmentsFor('staff'))));
app.patch('/api/staff/appointments/:id/status', authenticate, authorize('staff'), asyncRoute(async (req, res) => {
  const { status, actual_total, payment_method = 'cash', receipt_number = '' } = req.body;
  if (!['confirmed', 'completed', 'rejected', 'cancelled'].includes(status)) return fail(res, 'Invalid appointment status.');
  const [rows] = await query('SELECT * FROM appointments WHERE id=?', [req.params.id]); const appointment = rows[0]; if (!appointment) return fail(res, 'Appointment not found.', 404);
  await query('UPDATE appointments SET status=? WHERE id=?', [status, appointment.id]);
  await query('INSERT INTO appointment_status_history (appointment_id,status,changed_by,notes) VALUES (?,?,?,?)', [appointment.id, status, req.user.id, req.body.notes || 'Updated by staff']);
  if (status === 'completed') await query('INSERT INTO sales (appointment_id,actual_total,payment_method,receipt_number,collected_by) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE actual_total=VALUES(actual_total),payment_method=VALUES(payment_method),receipt_number=VALUES(receipt_number),collected_by=VALUES(collected_by)', [appointment.id, Number(actual_total || appointment.estimated_total), payment_method, receipt_number || null, req.user.id]);
  res.json({ message: 'Appointment updated.' });
}));
app.get('/api/staff/inquiries', authenticate, authorize('staff'), asyncRoute(async (_, res) => res.json(await inquiriesFor('staff'))));
app.post('/api/staff/inquiries/:id/messages', authenticate, authorize('staff'), asyncRoute(async (req, res) => {
  const message = String(req.body.message || '').trim(); if (!message) return fail(res, 'A message is required.');
  const [rows] = await query('SELECT id FROM customer_inquiries WHERE id=?', [req.params.id]); if (!rows[0]) return fail(res, 'Conversation not found.', 404);
  await query("INSERT INTO customer_inquiry_messages (inquiry_id,sender_id,sender_role,message) VALUES (?,?, 'staff', ?)", [req.params.id, req.user.id, message]);
  await query('UPDATE customer_inquiries SET assigned_to=?, status=? WHERE id=?', [req.user.id, ['open','responded','closed'].includes(req.body.status) ? req.body.status : 'responded', req.params.id]); res.json({ message: 'Response sent.' });
}));

app.get('/api/admin/services', authenticate, authorize('admin'), asyncRoute(async (_, res) => res.json(await catalogue())));
const asBoolean = (value) => value === true || value === 'true' || value === 1 || value === '1';
const servicePayload = (body) => [Number(body.category_id), body.name?.trim(), body.description?.trim(), Number(body.price), Number(body.duration_minutes), asBoolean(body.is_active), asBoolean(body.is_available)];
app.post('/api/admin/services', authenticate, authorize('admin'), upload.single('image'), asyncRoute(async (req, res) => {
  const values = servicePayload(req.body); if (!values[0] || !values[1] || !values[2] || values[3] < 0 || values[4] < 1) return fail(res, 'Complete all service details.');
  const image = req.file ? `/uploads/${req.file.filename}` : req.body.image || null;
  const [result] = await query('INSERT INTO services (category_id,name,description,price,duration_minutes,is_active,is_available,image) VALUES (?,?,?,?,?,?,?,?)', [...values, image]); res.status(201).json({ id: result.insertId, message: 'Service created.' });
}));
app.patch('/api/admin/services/:id', authenticate, authorize('admin'), upload.single('image'), asyncRoute(async (req, res) => {
  const values = servicePayload(req.body); const image = req.file ? `/uploads/${req.file.filename}` : req.body.image || null;
  await query('UPDATE services SET category_id=?,name=?,description=?,price=?,duration_minutes=?,is_active=?,is_available=?,image=COALESCE(?,image) WHERE id=?', [...values, image, req.params.id]); res.json({ message: 'Service updated.' });
}));
app.post('/api/admin/categories', authenticate, authorize('admin'), asyncRoute(async (req, res) => { const name = String(req.body.name || '').trim(); if (!name) return fail(res, 'Category name is required.'); const [result] = await query('INSERT INTO service_categories (name) VALUES (?)', [name]); res.status(201).json({ id: result.insertId, name, is_active: true }); }));
app.patch('/api/admin/staff/:id/approve', authenticate, authorize('admin'), asyncRoute(async (req, res) => { await query("UPDATE users SET status='active' WHERE id=? AND role='staff'", [req.params.id]); res.json({ message: 'Staff account approved.' }); }));
app.get('/api/admin/sales', authenticate, authorize('admin'), asyncRoute(async (_, res) => { const [sales] = await query('SELECT s.*,a.booking_reference,a.customer_id,u.name AS collector_name FROM sales s JOIN appointments a ON a.id=s.appointment_id JOIN users u ON u.id=s.collected_by ORDER BY s.collected_at DESC'); res.json(sales); }));
app.get('/api/admin/appointments', authenticate, authorize('admin'), asyncRoute(async (_, res) => res.json(await appointmentsFor('admin'))));
app.get('/api/admin/inquiries', authenticate, authorize('admin'), asyncRoute(async (_, res) => res.json(await inquiriesFor('admin'))));

app.use((error, _, res, __) => { console.error(error); const message = error.code === 'ER_DUP_ENTRY' ? 'A record with this value already exists.' : error.message || 'Server error.'; res.status(500).json({ message }); });
app.listen(port, () => console.log(`Dolce Vita API listening on http://localhost:${port}`));