import { forwardRef, useId } from 'react';

/**
 * Text input with datalist autocomplete.
 * Accepts typed-in custom values AND suggests existing ones from `options`.
 */
const ComboInput = forwardRef(function ComboInput(
  { label, options = [], error, hint, className = '', ...props },
  ref
) {
  const uid = useId();
  const listId = `combo-${uid}`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        ref={ref}
        list={listId}
        className={`input-field ${error ? 'border-red-500/50 focus:ring-red-500/30' : ''} ${className}`}
        autoComplete="off"
        {...props}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
});

export default ComboInput;
