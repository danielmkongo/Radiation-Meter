/**
 * Fresh-start seed — one account per role under a single hospital (Muhimbili).
 * Run: node src/utils/seed.js
 *
 * Wipes ALL data (users, devices, exposure logs, alerts, audit logs, hospitals)
 * and recreates only the four demo login accounts shown on the login page,
 * plus the Muhimbili hospital. No devices or readings are seeded — those come
 * from real firmware / are added by the admin in the UI.
 *
 * Credentials below MUST stay in sync with the quick-login buttons in
 * frontend/src/pages/LoginPage.jsx.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');

const ROUNDS = 10;

const USERS = [
  { full_name: 'Admin System',      email: 'admin@taec.go.tz',        password: 'Admin123!',     card_number: 'TAEC-ADMIN-001', role: 'admin',            department: 'Administration',         hospital: 'TAEC HQ' },
  { full_name: 'Dr. Fatuma Mwanga', email: 'manager@muhimbili.go.tz', password: 'Manager123!',   card_number: 'MNH-MGR-001',    role: 'hospital_manager', department: 'Radiology Management',   hospital: 'Muhimbili National Hospital' },
  { full_name: 'Inspector Juma Ally', email: 'regulator@taec.go.tz',  password: 'Regulator1!',   card_number: 'TAEC-REG-001',   role: 'regulator',        department: 'Compliance & Audit',    hospital: 'TAEC HQ' },
  { full_name: 'Dr. Amina Hassan',  email: 'amina@muhimbili.go.tz',   password: 'Radiol123!',    card_number: 'MNH-RAD-001',    role: 'radiologist',      department: 'Diagnostic Radiology',  hospital: 'Muhimbili National Hospital' },
];

const HOSPITALS = ['Muhimbili National Hospital'];

async function seed() {
  const db = getDb();

  console.log('🌱 Seeding database (fresh start — one account per role)...\n');

  // Wipe everything
  db.exec('DELETE FROM audit_logs; DELETE FROM alerts; DELETE FROM exposure_logs; DELETE FROM devices; DELETE FROM users; DELETE FROM hospitals;');
  console.log('  ✓ Database cleared (users, devices, exposure logs, alerts, audit logs, hospitals)\n');

  // ── Users ──────────────────────────────────────────────────────────────────
  const insertUser = db.prepare(
    `INSERT INTO users (id, full_name, email, password_hash, card_number, role, hospital, department)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const u of USERS) {
    insertUser.run(uuidv4(), u.full_name, u.email, bcrypt.hashSync(u.password, ROUNDS), u.card_number, u.role, u.hospital, u.department);
    console.log(`  ✓ ${u.role.padEnd(16)} →  ${u.email}  /  ${u.password}`);
  }

  // ── Hospitals ────────────────────────────────────────────────────────────────
  const insertHospital = db.prepare('INSERT OR IGNORE INTO hospitals (name) VALUES (?)');
  for (const h of HOSPITALS) {
    insertHospital.run(h);
    console.log(`  ✓ Hospital added →  ${h}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Fresh start complete. No devices or readings seeded.');
  console.log('  Log in as admin to add devices and additional users.');
  console.log('═══════════════════════════════════════════════════════════\n');
}

seed().catch(console.error);
