import Spinner from './Spinner';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  icon: Icon,
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg';

  const variantClass = {
    primary: 'bg-primary-600 hover:bg-primary-500 text-white focus:ring-primary-500/40',
    danger:  'bg-red-500/15 hover:bg-red-500/25 text-red-500 border border-red-500/30 focus:ring-red-400/30',
    ghost:   'focus:ring-slate-400/30',
    success: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 border border-emerald-500/30',
  };

  const sizes = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base',
  };

  // secondary uses CSS vars
  if (variant === 'secondary') {
    return (
      <button
        type={type}
        disabled={disabled || loading}
        onClick={onClick}
        className={`${base} ${sizes[size]} btn-secondary ${className}`}
      >
        {loading ? <Spinner size="sm" /> : Icon && <Icon className="w-4 h-4" />}
        {children}
      </button>
    );
  }

  // ghost uses CSS vars
  if (variant === 'ghost') {
    return (
      <button
        type={type}
        disabled={disabled || loading}
        onClick={onClick}
        className={`${base} ${sizes[size]} ${className} text-muted`}
        style={{ color: 'var(--text-secondary)' }}
      >
        {loading ? <Spinner size="sm" /> : Icon && <Icon className="w-4 h-4" />}
        {children}
      </button>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${variantClass[variant] || variantClass.primary} ${sizes[size]} ${className}`}
    >
      {loading ? <Spinner size="sm" /> : Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}
