import { forwardRef } from 'react';

const Input = forwardRef(function Input({ label, error, hint, icon: Icon, className = '', ...props }, ref) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <Icon className="w-4 h-4" />
          </span>
        )}
        <input
          ref={ref}
          className={`input-field ${Icon ? 'pl-9' : ''} ${error ? 'border-red-500/50 focus:ring-red-500/30' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
});

export default Input;
