import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatsCard({ title, value, unit, icon: Icon, trend, trendLabel, color = 'primary', subtitle }) {
  const colors = {
    primary:  { bg: 'bg-primary-500/10',  icon: 'text-primary-400',  border: 'border-primary-500/20' },
    success:  { bg: 'bg-emerald-500/10',  icon: 'text-emerald-400',  border: 'border-emerald-500/20' },
    warning:  { bg: 'bg-amber-500/10',    icon: 'text-amber-400',    border: 'border-amber-500/20' },
    danger:   { bg: 'bg-red-500/10',      icon: 'text-red-400',      border: 'border-red-500/20' },
    neutral:  { bg: 'bg-surface-700/30',  icon: 'text-slate-400',    border: 'border-surface-600' },
  };
  const c = colors[color] || colors.primary;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-red-400' : trend < 0 ? 'text-emerald-400' : 'text-slate-500';

  return (
    <div className={`stat-card border ${c.border}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-100">{value}</span>
            {unit && <span className="text-sm text-slate-500">{unit}</span>}
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
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
