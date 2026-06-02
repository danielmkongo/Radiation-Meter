/**
 * Minimal seed — creates only the admin account and one starter hospital.
 * Run: node src/utils/seed.js
 *
 * All other users, devices, and hospitals are created through the app by the admin.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');

const ROUNDS = 10;

async function seed() {
  const db = getDb();

  console.log('🌱 Seeding database (minimal — admin + 1 hospital)...\n');

  // Wipe everything
  db.exec('DELETE FROM audit_logs; DELETE FROM alerts; DELETE FROM exposure_logs; DELETE FROM devices; DELETE FROM users; DELETE FROM hospitals;');
  console.log('  ✓ Database cleared\n');

  // ── Admin user ───────────────────────────────────────────────────────────
  const adminId   = uuidv4();
  const adminHash = bcrypt.hashSync('Admin123!', ROUNDS);
  db.prepare(
    `INSERT INTO users (id, full_name, email, password_hash, card_number, role, hospital, department)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(adminId, 'System Administrator', 'admin@taec.go.tz', adminHash, 'TAEC-ADMIN-001', 'admin', 'TAEC HQ', 'Administration');
  console.log('  ✓ Admin created  →  admin@taec.go.tz  /  Admin123!');

  // ── Starter hospital ─────────────────────────────────────────────────────
  db.prepare('INSERT OR IGNORE INTO hospitals (name) VALUES (?)').run('Muhimbili National Hospital');
  console.log('  ✓ Hospital added →  Muhimbili National Hospital');

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Admin login:  admin@taec.go.tz  /  Admin123!');
  console.log('  Log in and add hospitals, users, and devices from the UI.');
  console.log('═══════════════════════════════════════════════════════════\n');
}

seed().catch(console.error);
