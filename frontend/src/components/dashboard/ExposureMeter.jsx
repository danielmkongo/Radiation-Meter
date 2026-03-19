import { DOSE_LIMITS } from '../../utils/constants';

function DosePeriodBar({ label, value, limit, warning }) {
  const pct = Math.min(100, (value / limit) * 100);
  const color = value >= limit ? 'bg-red-500' : value >= warning ? 'bg-amber-500' : 'bg-emerald-500';
  const textColor = value >= limit ? 'text-red-400' : value >= warning ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-400">{label}</span>
        <span className={`text-xs font-semibold ${textColor}`}>
          {value.toFixed(4)} / {limit} mSv
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface3)' }}>
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-600 mt-0.5 text-right">{pct.toFixed(1)}% of limit</p>
    </div>
  );
}

export default function ExposureMeter({ doseSummary }) {
  if (!doseSummary) return null;
  const { annual, monthly, weekly, daily } = doseSummary;

  const annualPct = Math.min(100, (annual.value / DOSE_LIMITS.ANNUAL_LIMIT) * 100);
  const statusColor =
    annual.value >= DOSE_LIMITS.ANNUAL_LIMIT   ? 'text-red-400' :
    annual.value >= DOSE_LIMITS.ANNUAL_WARNING ? 'text-amber-400' : 'text-emerald-400';
  const statusLabel =
    annual.value >= DOSE_LIMITS.ANNUAL_LIMIT   ? 'CRITICAL' :
    annual.value >= DOSE_LIMITS.ANNUAL_WARNING ? 'WARNING' : 'SAFE';

  return (
    <div className="space-y-5">
      {/* Annual gauge */}
      <div className="text-center">
        <div className="relative w-28 h-28 mx-auto mb-3">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-surface3)" strokeWidth="10" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke={annual.value >= DOSE_LIMITS.ANNUAL_LIMIT ? '#ef4444' : annual.value >= DOSE_LIMITS.ANNUAL_WARNING ? '#f59e0b' : '#10b981'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - annualPct / 100)}`}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-slate-100">{annualPct.toFixed(0)}%</span>
            <span className="text-[10px] text-slate-500">annual</span>
          </div>
        </div>
        <p className={`text-sm font-bold ${statusColor}`}>{statusLabel}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {annual.value.toFixed(4)} / {DOSE_LIMITS.ANNUAL_LIMIT} mSv/year
        </p>
      </div>

      {/* Period bars */}
      <div className="space-y-3">
        <DosePeriodBar label="Monthly" value={monthly.value} limit={DOSE_LIMITS.MONTHLY_LIMIT} warning={DOSE_LIMITS.MONTHLY_WARNING} />
        <DosePeriodBar label="Weekly"  value={weekly.value}  limit={DOSE_LIMITS.WEEKLY_LIMIT}  warning={DOSE_LIMITS.WEEKLY_WARNING} />
        <DosePeriodBar label="Daily"   value={daily.value}   limit={DOSE_LIMITS.DAILY_LIMIT}   warning={DOSE_LIMITS.DAILY_WARNING} />
      </div>
    </div>
  );
}
