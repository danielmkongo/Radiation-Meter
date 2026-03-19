export default function Card({ children, className = '', title, subtitle, action, noPadding = false }) {
  return (
    <div className={`glass-card ${noPadding ? '' : 'p-5'} ${className}`}>
      {(title || action) && (
        <div className={`flex items-center justify-between ${noPadding ? 'px-5 pt-5 pb-4' : 'mb-4'}`}>
          <div>
            {title    && <h3 className="font-semibold text-page">{title}</h3>}
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
