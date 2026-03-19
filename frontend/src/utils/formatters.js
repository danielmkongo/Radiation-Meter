import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { DOSE_LIMITS } from './constants';

export function formatDose(mSv, decimals = 4) {
  if (mSv === null || mSv === undefined) return '—';
  return `${parseFloat(mSv).toFixed(decimals)} mSv`;
}

export function formatDoseShort(mSv) {
  if (mSv === null || mSv === undefined) return '—';
  const v = parseFloat(mSv);
  if (v < 0.001) return '<0.001 mSv';
  if (v >= 1) return `${v.toFixed(3)} mSv`;
  return `${v.toFixed(4)} mSv`;
}

export function formatDate(ts) {
  if (!ts) return '—';
  try { return format(parseISO(ts), 'MMM d, yyyy'); }
  catch { return ts; }
}

export function formatDateTime(ts) {
  if (!ts) return '—';
  try { return format(parseISO(ts), 'MMM d, yyyy HH:mm'); }
  catch { return ts; }
}

export function formatRelative(ts) {
  if (!ts) return '—';
  try { return formatDistanceToNow(parseISO(ts), { addSuffix: true }); }
  catch { return ts; }
}

export function formatPercent(value, total) {
  if (!total) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

export function getDoseStatusLabel(annualDose) {
  if (annualDose >= DOSE_LIMITS.ANNUAL_LIMIT)  return 'Critical';
  if (annualDose >= DOSE_LIMITS.ANNUAL_WARNING) return 'Warning';
  return 'Safe';
}
