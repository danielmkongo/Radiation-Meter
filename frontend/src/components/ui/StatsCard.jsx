import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatsCard({ title, value, unit, icon: Icon, trend, trendLabel, color = 'primary', subtitle }) {
  const colors = {
    primary:  { bg: 'bg-primary-500/10',  icon: 'text-primary-500',  border: 'rgba(14,165,233,0.2)' },
    success:  { bg: 'bg-emerald-500/10',  icon: 'text-emerald-500',  border: 'rgba(16,185,129,0.2)' },
    warning:  { bg: 'bg-amber-500/10',    icon: 'text-amber-500',    border: 'rgba(245,158,11,0.2)' },
    danger:   { bg: 'bg-red-500/10',      icon: 'text-red-500',      border: 'rgba(239,68,68,0.2)' },
    neutral:  { bg: '',                   icon: 'text-muted',        border: 'var(--border-color)' },
  };
  const c = colors[color] || colors.primary;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-red-500' : trend < 0 ? 'text-emerald-500' : 'text-muted';

  return (
    <div className="stat-card" style={{ borderColor: c.border }}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted uppercase tracking-wider">{title}</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-page">{value}</span>
            {unit && <span className="text-sm text-muted">{unit}</span>}
          </div>
          {subtitle && <p className="text-xs text-muted mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              <span>{trendLabel}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${c.icon}`} />
          </div>
        )}
      </div>
    </div>
  );
}
