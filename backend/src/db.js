import 'dotenv/config';
import mysql from 'mysql2/promise';

export const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || 'dolcevia_db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
});

export const query = (sql, values = []) => db.query(sql, values);