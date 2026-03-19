import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, size = 'md', footer }) {
  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose?.();
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full ${sizes[size]} glass-card shadow-2xl animate-fade-in`}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h2 className="font-semibold text-page">{title}</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-page transition-colors p-1 rounded-md"
            style={{ ':hover': { backgroundColor: 'var(--bg-surface2)' } }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: '1px solid var(--border-color)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
