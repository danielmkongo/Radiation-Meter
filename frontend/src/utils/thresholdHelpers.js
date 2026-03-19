import { DOSE_LIMITS } from './constants';

export function getDoseStatus(annualDose) {
  if (annualDose >= DOSE_LIMITS.ANNUAL_LIMIT)  return 'critical';
  if (annualDose >= DOSE_LIMITS.ANNUAL_WARNING) return 'warning';
  return 'safe';
}

export function getDoseColor(annualDose) {
  const status = getDoseStatus(annualDose);
  return {
    safe:     'text-emerald-400',
    warning:  'text-amber-400',
    critical: 'text-red-400',
  }[status];
}

export function getDoseBgColor(annualDose) {
  const status = getDoseStatus(annualDose);
  return {
    safe:     'bg-emerald-500',
    warning:  'bg-amber-500',
    critical: 'bg-red-500',
  }[status];
}

export function getPercentOfAnnualLimit(dose) {
  return Math.min(100, (dose / DOSE_LIMITS.ANNUAL_LIMIT) * 100);
}

export function getPercentOfLimit(dose, limit) {
  return Math.min(100, (dose / limit) * 100);
}

export function getSeverityBadgeClass(type) {
  return type === 'critical' ? 'badge-critical' : 'badge-warning';
}
