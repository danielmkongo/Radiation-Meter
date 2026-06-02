import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { DOSE_LIMITS } from './constants';

/**
 * Format a stored mSv value for display in the selected unit.
 * Device sends µSv → backend converts to mSv → this function converts back for display.
 * Always shows full precision — no truncation, no "<" notation.
 */
export function formatDoseInUnit(mSv, unit = 'mSv') {
  if (mSv === null || mSv === undefined) return '—';
  const v = parseFloat(mSv);
  if (isNaN(v)) return '—';

  if (unit === 'µSv') {
    const uSv = v * 1000;
    if (uSv === 0)     return `0.000 µSv`;
    if (uSv >= 1000)   return `${uSv.toFixed(2)} µSv`;
    if (uSv >= 100)    return `${uSv.toFixed(3)} µSv`;
    if (uSv >= 10)     return `${uSv.toFixed(4)} µSv`;
    if (uSv >= 1)      return `${uSv.toFixed(5)} µSv`;
    return `${uSv.toFixed(6)} µSv`;
  }

  // mSv — enough decimals to always show at least 4 significant figures
  if (v === 0)       return `0.000000 mSv`;
  if (v >= 10)       return `${v.toFixed(4)} mSv`;
  if (v >= 0.1)      return `${v.toFixed(5)} mSv`;
  if (v >= 0.001)    return `${v.toFixed(6)} mSv`;
  return `${v.toFixed(7)} mSv`;
}

/** Limit value formatted in the chosen unit (for threshold bars, axis labels) */
export function formatLimitInUnit(mSv, unit = 'mSv') {
  if (mSv === null || mSv === undefined) return '—';
  const v = parseFloat(mSv);
  if (unit === 'µSv') return `${(v * 1000).toFixed(2)} µSv`;
  return `${v} mSv`;
}

/** Convert a stored mSv value to the display unit (number only, no label) */
export function convertToUnit(mSv, unit = 'mSv') {
  if (mSv === null || mSv === undefined) return 0;
  const v = parseFloat(mSv);
  return unit === 'µSv' ? v * 1000 : v;
}

/** Legacy — mSv only, kept for ExposureMeter internal use */
export function formatDose(mSv, decimals = 6) {
  if (mSv === null || mSv === undefined) return '—';
  return `${parseFloat(mSv).toFixed(decimals)} mSv`;
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
