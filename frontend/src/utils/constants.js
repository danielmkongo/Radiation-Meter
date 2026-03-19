export const DOSE_LIMITS = {
  ANNUAL_LIMIT: 20,
  ANNUAL_WARNING: 15,
  ANNUAL_SINGLE_MAX: 50,
  MONTHLY_LIMIT: 1.667,
  MONTHLY_WARNING: 1.25,
  WEEKLY_LIMIT: 0.385,
  WEEKLY_WARNING: 0.288,
  DAILY_LIMIT: 0.0548,
  DAILY_WARNING: 0.041,
};

export const ROLES = {
  ADMIN: 'admin',
  HOSPITAL_MANAGER: 'hospital_manager',
  REGULATOR: 'regulator',
  RADIOLOGIST: 'radiologist',
};

export const ROLE_LABELS = {
  admin: 'Administrator',
  hospital_manager: 'Hospital Manager',
  regulator: 'TAEC Regulator',
  radiologist: 'Radiologist',
};

export const POLL_INTERVAL = 30000; // 30s
