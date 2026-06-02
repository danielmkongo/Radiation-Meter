import { DOSE_LIMITS } from '../../utils/constants';
import { useUnit } from '../../context/UnitContext';
import { formatDoseInUnit, convertToUnit } from '../../utils/formatters';

function DosePeriodBar({ label, valueMSv, limitMSv, warningMSv, unit }) {
  const pct   = Math.min(100, (valueMSv / limitMSv) * 100);
  const color = valueMSv >= limitMSv ? 'bg-red-500' : valueMSv >= warningMSv ? 'bg-amber-500' : 'bg-emerald-500';
  const textColor = valueMSv >= limitMSv ? 'text-red-400' : valueMSv >= warningMSv ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted">{label}</span>
        <span className={`text-xs font-semibold ${textColor}`}>
          {formatDoseInUnit(valueMSv, unit)}
          <span className="font-normal text-muted mx-1">/</span>
          {formatDoseInUnit(limitMSv, unit)}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface3)' }}>
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-muted mt-0.5 text-right">{pct.toFixed(1)}% of limit</p>
    </div>
  );
}

export default function ExposureMeter({ doseSummary }) {
  const { unit } = useUnit();
  if (!doseSummary) return null;
  const { annual, monthly, weekly, daily } = doseSummary;

  const annualPct = Math.min(100, (annual.value / DOSE_LIMITS.ANNUAL_LIMIT) * 100);
  const statusColor =
    annual.value >= DOSE_LIMITS.ANNUAL_LIMIT   ? 'text-red-400' :
    annual.value >= DOSE_LIMITS.ANNUAL_WARNING ? 'text-amber-400' : 'text-emerald-400';
  const statusLabel =
    annual.value >= DOSE_LIMITS.ANNUAL_LIMIT   ? 'CRITICAL' :
    annual.value >= DOSE_LIMITS.ANNUAL_WARNING ? 'WARNING'  : 'SAFE';

  const annualDisplay = formatDoseInUnit(annual.value, unit);
  const annualLimit   = formatDoseInUnit(DOSE_LIMITS.ANNUAL_LIMIT, unit);

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
            <span className="text-xl font-bold text-page">{annualPct.toFixed(0)}%</span>
            <span className="text-[10px] text-muted">annual</span>
          </div>
        </div>
        <p className={`text-sm font-bold ${statusColor}`}>{statusLabel}</p>
        <p className="text-xs text-muted mt-0.5">
          {annualDisplay} / {annualLimit} per year
        </p>
      </div>

      {/* Period bars */}
      <div className="space-y-3">
        <DosePeriodBar label="Monthly" valueMSv={monthly.value} limitMSv={DOSE_LIMITS.MONTHLY_LIMIT} warningMSv={DOSE_LIMITS.MONTHLY_WARNING} unit={unit} />
        <DosePeriodBar label="Weekly"  valueMSv={weekly.value}  limitMSv={DOSE_LIMITS.WEEKLY_LIMIT}  warningMSv={DOSE_LIMITS.WEEKLY_WARNING}  unit={unit} />
        <DosePeriodBar label="Daily"   valueMSv={daily.value}   limitMSv={DOSE_LIMITS.DAILY_LIMIT}   warningMSv={DOSE_LIMITS.DAILY_WARNING}   unit={unit} />
      </div>
    </div>
  );
}
