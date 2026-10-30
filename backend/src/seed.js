import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = await fs.readFile(path.join(here, '..', 'sql', 'schema.sql'), 'utf8');
const connection = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
});
try {
  await connection.query(schema);
  const password = await bcrypt.hash('password', 12);
  const demoUsers = [['Demo','Administrator','admin@dolcevia.test','admin'],['Demo','Staff','staff@dolcevia.test','staff'],['Demo','Customer','customer@dolcevia.test','customer']];
  for (const [first,last,email,role] of demoUsers) await connection.execute('INSERT IGNORE INTO users (first_name,last_name,name,email,password_hash,phone_number,role,status) VALUES (?,?,?,?,?,?,?,?)',[first,last,`${first} ${last}`,email,password,'09123456789',role,'active']);
  const services = [
    ['Hair Services','Haircut','Salon haircut service.',100,45,'01_Haircut.jpg'],['Hair Services','Blowdry w/ Shampoo','Blowdry styling with shampoo.',150,45,'02_Blowdry_with_Shampoo.jpg'],['Hair Services','Hair Iron','Hair ironing service.',200,45,'03_Hair_Iron.jpg'],['Hair Services','Hair Rebond','Hair rebonding service.',500,120,'04_Hair_Reborn.jpg'],['Hair Services','Collagen Hairmask','Collagen hairmask treatment.',500,60,'05_Collagen_Hairmask.jpg'],['Hair Services','Hair Color','Starting price; final price varies by hair length.',500,120,'14_Hair_Color.jpg'],['Hair Services','Balayage / Ombre','Starting price; final price varies by hair length.',1500,180,'17_Bayalage_Ombre.jpg'],['Rebonding Services','Strands Protein Rebond','Price varies by hair length.',1000,150,'08_Strands_Protein_Rebond.jpg'],['Rebonding Services','Rebond w/ Collagen Treatment','Price varies by hair length.',1500,180,'09_Rebond_with_Collagen_Treatment.jpg'],['Hair & Makeup','Hair and Makeup','Hair styling and makeup service.',1000,120,'20_Hair_and_Make_up.jpg'],['Spa & Nail Services','Classic Manicure','Classic manicure service.',250,45,'21_Manicure.jpg'],['Spa & Nail Services','Classic Pedicure','Classic pedicure service.',300,60,'22_Pedicure.jpg'],['Spa & Nail Services','Gel Manicure','Gel manicure service.',500,60,'25_Gel_Polish_Manicure_Pedicure.jpg'],['Spa & Nail Services','Gel Pedicure','Gel pedicure service.',550,75,'25_Gel_Polish_Manicure_Pedicure.jpg'],['Spa & Nail Services','Soft Gel','Soft gel service; stones are priced separately.',1200,90,'27_PolyGel_Nail_Extension.jpg'],['Spa & Nail Services','Full Nail Extensions','Full nail extensions; stones are priced separately.',1500,120,'27_PolyGel_Nail_Extension.jpg'],['Waxing Services','Eyebrow Waxing','Eyebrow waxing service.',200,20,'31_Eyebrow_Waxing.jpg'],['Waxing Services','Underarm Waxing','Underarm waxing service.',250,30,'33_Under_Arm_Waxing.jpg'],['Waxing Services','Brazilian Waxing','Brazilian waxing service.',500,60,'35_Brazilian_Waxing.jpg'],['Massage Services','Shiatsu Massage','Shiatsu massage service.',350,60,'37_Shiatsu_Massage.jpg'],['Massage Services','Swedish Massage','Swedish massage service.',350,60,'39_Swedish_Massage.jpg'],['Massage Services','Hot Stone','Hot stone massage service.',500,60,'41_Hot_Stone_Massage.jpg'],['Eyelash & Eyebrow Services','Korean Eyelash Lift','Korean eyelash lift service.',500,60,'44_Korean_Eyelash_Lift.jpg'],['Eyelash & Eyebrow Services','Eyelash Extension','Starting price; final price varies by selected style.',500,120,'45_Eyelash_Extension.jpg'],['Eyelash & Eyebrow Services','Eyebrow Threading','Eyebrow threading service.',150,20,'47_Eyebrow_Threading.jpg']
  ];
  for (const [category, name, description, price, minutes, image] of services) { await connection.execute('INSERT IGNORE INTO service_categories (name) VALUES (?)',[category]); const [[row]] = await connection.execute('SELECT id FROM service_categories WHERE name=?',[category]); await connection.execute('INSERT IGNORE INTO services (category_id,name,description,price,duration_minutes,image) VALUES (?,?,?,?,?,?)',[row.id,name,description,price,minutes,`/service-photos/${image}`]); }
  console.log('MariaDB schema and Dolce Vita demo data are ready. Demo password: password');
} finally { await connection.end(); }