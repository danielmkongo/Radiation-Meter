import { useLocation, Link } from 'react-router-dom';
import { Bell, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ROLE_LABELS } from '../../utils/constants';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/exposure':  'Exposure Logs',
  '/alerts':    'Alerts',
  '/devices':   'Device Management',
  '/users':     'User Management',
  '/reports':   'Reports',
  '/audit':     'Audit Log',
  '/profile':   'My Profile',
};

export default function Header({ alertCount = 0 }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();

  const title = PAGE_TITLES[pathname] || 'RadiGuard';

  const btnClass = 'p-2 rounded-lg transition-colors';
  const btnStyle = {
    color: 'var(--text-muted)',
  };

  return (
    <header className="app-header h-14 px-6 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="font-semibold text-page">{title}</h1>
        <p className="text-[11px] text-muted">{ROLE_LABELS[user?.role]}</p>
      </div>

      <div className="flex items-center gap-1">
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
        <Link
          to="/alerts"
          className={`${btnClass} relative`}
          style={btnStyle}
        >
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2" style={{ ringColor: 'var(--bg-surface)' }} />
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
