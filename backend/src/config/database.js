const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/radiation_meter.db';
const dbDir = path.dirname(path.resolve(DB_PATH));

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

function getDb() {
  if (!db) {
    db = new Database(path.resolve(DB_PATH));
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('synchronous = NORMAL');
    initializeSchema();
  }
  return db;
}

function initializeSchema() {
  db.exec(`
    -- ─── Users ────────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      full_name   TEXT NOT NULL,
      email       TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      card_number TEXT UNIQUE NOT NULL,
      role        TEXT NOT NULL CHECK(role IN ('admin','hospital_manager','regulator','radiologist')),
      department  TEXT,
      hospital    TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- ─── Devices ──────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS devices (
      id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      device_id        TEXT UNIQUE NOT NULL,
      name             TEXT NOT NULL,
      location         TEXT NOT NULL,
      hospital         TEXT,
      api_key          TEXT UNIQUE NOT NULL,
      last_seen        DATETIME,
      firmware_version TEXT DEFAULT '1.0.0',
      is_active        INTEGER NOT NULL DEFAULT 1,
      created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    -- ─── Exposure Logs (time-series, core data) ───────────────────────────────
    CREATE TABLE IF NOT EXISTS exposure_logs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id       TEXT NOT NULL,
      card_number     TEXT NOT NULL,
      radiation_value REAL NOT NULL CHECK(radiation_value >= 0),
      unit            TEXT NOT NULL DEFAULT 'mSv',
      timestamp       DATETIME NOT NULL,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      is_anomaly      INTEGER NOT NULL DEFAULT 0,
      is_deleted      INTEGER NOT NULL DEFAULT 0,
      deleted_by      TEXT,
      deleted_at      DATETIME,
      FOREIGN KEY (device_id) REFERENCES devices(device_id),
      FOREIGN KEY (card_number) REFERENCES users(card_number)
    );

    -- Indexes for common query patterns
    CREATE INDEX IF NOT EXISTS idx_exposure_card_number  ON exposure_logs(card_number, timestamp);
    CREATE INDEX IF NOT EXISTS idx_exposure_device_id    ON exposure_logs(device_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_exposure_timestamp    ON exposure_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_exposure_anomaly      ON exposure_logs(is_anomaly) WHERE is_anomaly = 1;

    -- ─── Alerts ───────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS alerts (
      id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      type              TEXT NOT NULL CHECK(type IN ('warning','critical')),
      category          TEXT NOT NULL,
      card_number       TEXT,
      device_id         TEXT,
      message           TEXT NOT NULL,
      radiation_value   REAL,
      threshold_value   REAL,
      period            TEXT,
      is_acknowledged   INTEGER NOT NULL DEFAULT 0,
      acknowledged_by   TEXT,
      acknowledged_at   DATETIME,
      created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_number) REFERENCES users(card_number)
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_card_number     ON alerts(card_number);
    CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged    ON alerts(is_acknowledged);
    CREATE INDEX IF NOT EXISTS idx_alerts_created_at      ON alerts(created_at);

    -- ─── Audit Logs ───────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS audit_logs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id       TEXT,
      user_email    TEXT,
      action        TEXT NOT NULL,
      resource_type TEXT,
      resource_id   TEXT,
      details       TEXT,
      ip_address    TEXT,
      user_agent    TEXT,
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_audit_user_id    ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action     ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
  `);
}

module.exports = { getDb };
