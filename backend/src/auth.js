import jwt from 'jsonwebtoken';
import { query } from './db.js';

const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET must be set in backend/.env.');
  return process.env.JWT_SECRET;
};

export const publicUser = (user) => ({
  id: user.id, name: user.name, first_name: user.first_name, last_name: user.last_name,
  email: user.email, phone_number: user.phone_number, address: user.address,
  role: user.role, status: user.status,
});

export const createToken = (user) => jwt.sign({ id: user.id, role: user.role }, secret(), { expiresIn: '8h' });

export async function authenticate(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication is required.' });
    const payload = jwt.verify(token, secret());
    const [rows] = await query('SELECT * FROM users WHERE id = ? LIMIT 1', [payload.id]);
    if (!rows[0] || rows[0].status !== 'active') return res.status(401).json({ message: 'Your account is not active.' });
    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ message: 'Your session is invalid or expired.' });
  }
}

export const authorize = (...roles) => (req, res, next) => roles.includes(req.user?.role)
  ? next()
  : res.status(403).json({ message: 'You do not have permission to access this resource.' });