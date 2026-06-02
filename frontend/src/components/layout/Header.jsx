import { useLocation, Link } from 'react-router-dom';
import { Bell, LogOut, Sun, Moon, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useUnit } from '../../context/UnitContext';
import { ROLE_LABELS } from '../../utils/constants';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/exposure':  'Exposure Logs',
  '/alerts':    'Alerts',
  '/devices':   'Device Management',
  '/hospitals': 'Hospitals',
  '/users':     'User Management',
  '/reports':   'Reports',
  '/audit':     'Audit Log',
  '/profile':   'My Profile',
};

export default function Header({ alertCount = 0, onMenuOpen }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const { unit, toggle: toggleUnit } = useUnit();

  const title = PAGE_TITLES[pathname] || 'RadiGuard';

  const btnClass = 'p-2 rounded-lg transition-colors';
  const btnStyle = { color: 'var(--text-muted)' };

  return (
    <header className="app-header h-14 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuOpen}
          className="lg:hidden p-2 rounded-lg transition-colors"
          style={btnStyle}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="font-semibold text-page text-sm sm:text-base truncate">{title}</h1>
          <p className="text-[11px] text-muted hidden sm:block">{ROLE_LABELS[user?.role]}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Unit toggle */}
        <button
          onClick={toggleUnit}
          className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all border"
          style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--bg-surface2)',
            color: unit === 'µSv' ? '#0ea5e9' : 'var(--text-secondary)',
            fontFamily: 'monospace',
          }}
          title={`Switch to ${unit === 'mSv' ? 'µSv' : 'mSv'}`}
        >
          {unit}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className={btnClass}
          style={btnStyle}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark
            ? <Sun className="w-4 h-4 text-amber-400" />
            : <Moon className="w-4 h-4 text-primary-500" />}
        </button>

        {/* Alert bell */}
        <Link to="/alerts" className={`${btnClass} relative`} style={btnStyle}>
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </Link>

        {/* Logout */}
        <button
          onClick={logout}
          className={`${btnClass} flex items-center gap-2 px-3 py-1.5 text-sm`}
          style={btnStyle}
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
