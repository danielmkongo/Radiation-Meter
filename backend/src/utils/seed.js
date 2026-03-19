/**
 * Database seed script — creates realistic demo data
 * Run: node src/utils/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');

const ROUNDS = 10;

const users = [
  { full_name: 'Admin System',        email: 'admin@taec.go.tz',          password: 'Admin123!',    card_number: 'TAEC-ADMIN-001', role: 'admin',            hospital: 'TAEC HQ',                department: 'Administration' },
  { full_name: 'Dr. Fatuma Mwanga',   email: 'manager@muhimbili.go.tz',    password: 'Manager123!',  card_number: 'MNH-MGR-001',    role: 'hospital_manager', hospital: 'Muhimbili National Hospital', department: 'Radiology Management' },
  { full_name: 'Inspector Juma Ally', email: 'regulator@taec.go.tz',      password: 'Regulator1!',  card_number: 'TAEC-REG-001',   role: 'regulator',        hospital: 'TAEC HQ',                department: 'Compliance & Audit' },
  { full_name: 'Dr. Amina Hassan',    email: 'amina@muhimbili.go.tz',     password: 'Radiol123!',   card_number: 'MNH-RAD-001',    role: 'radiologist',      hospital: 'Muhimbili National Hospital', department: 'Diagnostic Radiology' },
  { full_name: 'Dr. Peter Kimani',    email: 'peter@muhimbili.go.tz',     password: 'Radiol123!',   card_number: 'MNH-RAD-002',    role: 'radiologist',      hospital: 'Muhimbili National Hospital', department: 'Interventional Radiology' },
  { full_name: 'Dr. Grace Omondi',    email: 'grace@muhimbili.go.tz',     password: 'Radiol123!',   card_number: 'MNH-RAD-003',    role: 'radiologist',      hospital: 'Muhimbili National Hospital', department: 'Nuclear Medicine' },
  { full_name: 'Dr. Samuel Moshi',    email: 'samuel@aga-khan.go.tz',     password: 'Radiol123!',   card_number: 'AKH-RAD-001',    role: 'radiologist',      hospital: 'Aga Khan Hospital',          department: 'Diagnostic Radiology' },
  { full_name: 'Dr. Zawadi Njoroge',  email: 'zawadi@aga-khan.go.tz',     password: 'Radiol123!',   card_number: 'AKH-RAD-002',    role: 'radiologist',      hospital: 'Aga Khan Hospital',          department: 'Radiation Therapy' },
];

const devices = [
  { device_id: 'DEV-MNH-001', name: 'Dosimeter Unit A',  location: 'MNH CT Scan Room 1',      hospital: 'Muhimbili National Hospital', api_key: 'rm_dev001apikey12345678901234' },
  { device_id: 'DEV-MNH-002', name: 'Dosimeter Unit B',  location: 'MNH X-Ray Room 2',         hospital: 'Muhimbili National Hospital', api_key: 'rm_dev002apikey12345678901234' },
  { device_id: 'DEV-MNH-003', name: 'Dosimeter Unit C',  location: 'MNH Nuclear Medicine Lab', hospital: 'Muhimbili National Hospital', api_key: 'rm_dev003apikey12345678901234' },
  { device_id: 'DEV-AKH-001', name: 'Dosimeter Unit D',  location: 'AKH Radiology Suite A',   hospital: 'Aga Khan Hospital',           api_key: 'rm_dev004apikey12345678901234' },
];

// Generate exposure data for the past 90 days
function generateExposureData(users, devices) {
  const radiologists = users.filter(u => u.role === 'radiologist');
  const records = [];
  const now = new Date();

  // Dr. Grace Omondi (nuclear medicine) — high exposure, approaching limit
  // Dr. Amina Hassan — moderate exposure
  // Others — low to moderate

  const exposureProfiles = {
    'MNH-RAD-001': { mean: 0.025, std: 0.008, daysActive: 0.85 },  // Moderate
    'MNH-RAD-002': { mean: 0.018, std: 0.006, daysActive: 0.75 },  // Low-moderate
    'MNH-RAD-003': { mean: 0.048, std: 0.015, daysActive: 0.90 },  // High (nuclear medicine)
    'AKH-RAD-001': { mean: 0.022, std: 0.007, daysActive: 0.80 },  // Moderate
    'AKH-RAD-002': { mean: 0.035, std: 0.012, daysActive: 0.70 },  // Moderate-high
  };

  for (const rad of radiologists) {
    const profile = exposureProfiles[rad.card_number] || { mean: 0.02, std: 0.006, daysActive: 0.75 };
    const devicePool = devices.filter(d => d.hospital === rad.hospital);

    for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
      if (Math.random() > profile.daysActive) continue; // Skip non-working days

      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);

      // 2-5 readings per day
      const readingsPerDay = Math.floor(Math.random() * 4) + 2;
      for (let r = 0; r < readingsPerDay; r++) {
        const value = Math.max(0.001, profile.mean + (Math.random() - 0.5) * 2 * profile.std);
        const device = devicePool[Math.floor(Math.random() * devicePool.length)];
        const ts = new Date(date);
        ts.setHours(7 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);

        records.push({
          device_id: device.device_id,
          card_number: rad.card_number,
          radiation_value: parseFloat(value.toFixed(5)),
          timestamp: ts.toISOString(),
          is_anomaly: 0,
        });
      }
    }

    // Inject one anomalous spike for Dr. Grace (nuclear medicine)
    if (rad.card_number === 'MNH-RAD-003') {
      const spikeDate = new Date(now);
      spikeDate.setDate(spikeDate.getDate() - 15);
      spikeDate.setHours(10, 30, 0, 0);
      records.push({
        device_id: 'DEV-MNH-003',
        card_number: 'MNH-RAD-003',
        radiation_value: 0.285, // big spike
        timestamp: spikeDate.toISOString(),
        is_anomaly: 1,
      });
    }
  }

  return records;
}

async function seed() {
  const db = getDb();

  console.log('🌱 Seeding database...');

  // Check if already seeded
  const existing = db.prepare("SELECT COUNT(*) as n FROM users").get();
  if (existing.n > 0) {
    console.log('⚠️  Database already has data. Clearing and re-seeding...');
    db.exec('DELETE FROM audit_logs; DELETE FROM alerts; DELETE FROM exposure_logs; DELETE FROM devices; DELETE FROM users;');
  }

  // Seed users
  console.log('👥 Creating users...');
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users (id, full_name, email, password_hash, card_number, role, hospital, department)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const u of users) {
    const hash = bcrypt.hashSync(u.password, ROUNDS);
    insertUser.run(uuidv4(), u.full_name, u.email, hash, u.card_number, u.role, u.hospital, u.department);
    console.log(`  ✓ ${u.role}: ${u.full_name} (${u.email} / ${u.password})`);
  }

  // Seed devices
  console.log('\n📡 Registering devices...');
  const insertDevice = db.prepare(
    `INSERT OR IGNORE INTO devices (id, device_id, name, location, hospital, api_key, last_seen)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  for (const d of devices) {
    const lastSeen = new Date();
    lastSeen.setMinutes(lastSeen.getMinutes() - Math.floor(Math.random() * 45));
    insertDevice.run(uuidv4(), d.device_id, d.name, d.location, d.hospital, d.api_key, lastSeen.toISOString());
    console.log(`  ✓ ${d.device_id} — API Key: ${d.api_key}`);
  }

  // Seed exposure records
  console.log('\n☢️  Generating exposure records (90 days)...');
  const records = generateExposureData(users, devices);
  const insertLog = db.prepare(
    `INSERT INTO exposure_logs (device_id, card_number, radiation_value, unit, timestamp, is_anomaly)
     VALUES (?, ?, ?, 'mSv', ?, ?)`
  );
  const insertMany = db.transaction((recs) => {
    for (const r of recs) {
      insertLog.run(r.device_id, r.card_number, r.radiation_value, r.timestamp, r.is_anomaly);
    }
  });
  insertMany(records);
  console.log(`  ✓ Inserted ${records.length} exposure records`);

  // Create sample alerts
  console.log('\n🚨 Creating sample alerts...');
  const insertAlert = db.prepare(
    `INSERT INTO alerts (id, type, category, card_number, device_id, message, radiation_value, threshold_value, period)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertAlert.run(uuidv4(), 'warning', 'threshold_exceeded', 'MNH-RAD-003', null,
    'Annual dose WARNING: 14.2 mSv/year (warning threshold: 15 mSv)', 14.2, 15, 'annual');
  insertAlert.run(uuidv4(), 'warning', 'anomaly_detected', 'MNH-RAD-003', 'DEV-MNH-003',
    'Anomalous radiation reading detected: 0.285 mSv (Z-score: 4.2)', 0.285, null, null);
  insertAlert.run(uuidv4(), 'warning', 'threshold_exceeded', 'AKH-RAD-002', null,
    'Monthly dose WARNING: 1.35 mSv/month (warning threshold: 1.25 mSv)', 1.35, 1.25, 'monthly');
  console.log('  ✓ Created 3 sample alerts');

  console.log('\n✅ Seed complete!\n');
  console.log('─────────────────────────────────────────────────────');
  console.log('CREDENTIALS:');
  console.log('  Admin:    admin@taec.go.tz       / Admin123!');
  console.log('  Manager:  manager@muhimbili.go.tz / Manager123!');
  console.log('  Regulator:regulator@taec.go.tz   / Regulator1!');
  console.log('  Radiologist: amina@muhimbili.go.tz / Radiol123!');
  console.log('');
  console.log('DEVICE API KEYS:');
  devices.forEach(d => console.log(`  ${d.device_id}: ${d.api_key}`));
  console.log('─────────────────────────────────────────────────────\n');
}

seed().catch(console.error);
