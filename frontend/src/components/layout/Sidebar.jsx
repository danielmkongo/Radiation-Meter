import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from './navConfig';
import { Atom, X } from 'lucide-react';

export default function Sidebar({ alertCount = 0, open = false, onClose }) {
  const { user } = useAuth();

  const filteredItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user?.role)
  );

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          app-sidebar w-64 shrink-0 h-screen flex flex-col z-40
          fixed top-0 left-0 transition-transform duration-300 ease-out
          lg:relative lg:translate-x-0 lg:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/25">
              <Atom className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-semibold text-page text-sm">RadiGuard</span>
              <p className="text-[10px] text-muted uppercase tracking-wider">Monitoring Platform</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg text-muted hover:text-page transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `nav-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? 'active' : ''}`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge && alertCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {alertCount > 99 ? '99+' : alertCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User card */}
        <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          <NavLink to="/profile" onClick={onClose} className="glass-card p-3 flex items-center gap-3 hover:border-primary-500/30 transition-all no-underline block">
            <div className="w-8 h-8 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-500 font-semibold text-sm shrink-0">
              {user?.full_name?.[0] || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-page truncate">{user?.full_name}</p>
              <p className="text-[11px] text-muted truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </NavLink>
        </div>
      </aside>
    </>
  );
}
