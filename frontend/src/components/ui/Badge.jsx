const VARIANTS = {
  safe:     'badge-safe',
  warning:  'badge-warning',
  critical: 'badge-critical',
  info:     'badge-info',
  neutral:  'badge-neutral',
  online:   'badge-safe',
  offline:  'badge-critical',
  stale:    'badge-warning',
  admin:             'badge-info',
  hospital_manager:  'bg-violet-500/15 text-violet-400 border border-violet-500/20 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
  regulator:         'bg-orange-500/15 text-orange-400 border border-orange-500/20 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
  radiologist:       'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
};

export default function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span className={`${VARIANTS[variant] || VARIANTS.neutral} ${className}`}>
      {children}
    </span>
  );
}
