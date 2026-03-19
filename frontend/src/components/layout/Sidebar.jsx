import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from './navConfig';
import { Atom } from 'lucide-react';

export default function Sidebar({ alertCount = 0 }) {
  const { user } = useAuth();

  const filteredItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user?.role)
  );

  return (
    <aside className="app-sidebar w-60 shrink-0 h-screen sticky top-0 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/25">
          <Atom className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-semibold text-page text-sm">RadiGuard</span>
          <p className="text-[10px] text-muted uppercase tracking-wider">Monitoring Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
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
        <NavLink to="/profile" className="glass-card p-3 flex items-center gap-3 hover:border-primary-500/30 transition-all no-underline block">
          <div className="w-8 h-8 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-500 font-semibold text-sm">
            {user?.full_name?.[0] || 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-page truncate">{user?.full_name}</p>
            <p className="text-[11px] text-muted truncate capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </NavLink>
      </div>
    </aside>
  );
}
