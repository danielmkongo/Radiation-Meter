import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ExposureLogs from './pages/ExposureLogs';
import Alerts from './pages/Alerts';
import Devices from './pages/Devices';
import Users from './pages/Users';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Profile from './pages/Profile';
import Hospitals from './pages/Hospitals';
import Spinner from './components/ui/Spinner';

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-300 text-lg font-semibold">Access Denied</p>
        <p className="text-slate-500 text-sm">You don't have permission to view this page.</p>
        <a href="/dashboard" className="text-primary-400 hover:underline text-sm">Back to Dashboard</a>
      </div>
    );
  }
  return children;
}

function AuthRedirect() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="xl" /></div>;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<AuthRedirect />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="profile"   element={<Profile />} />
              <Route path="exposure" element={<ExposureLogs />} />
              <Route path="alerts" element={<Alerts />} />
              <Route
                path="devices"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hospital_manager', 'regulator']}>
                    <Devices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="hospitals"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hospital_manager', 'regulator']}>
                    <Hospitals />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hospital_manager']}>
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="reports"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'hospital_manager', 'regulator']}>
                    <Reports />
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'regulator']}>
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}
