import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Atom, Mail, Lock, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuth();
  const toast     = useToast();
  const navigate  = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) { toast.error('Please enter your credentials'); return; }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-page)' }}>
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(14,165,233,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.04) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 shadow-xl shadow-primary-600/25 mb-4">
            <Atom className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-page">RadiGuard</h1>
          <p className="text-sm text-muted mt-1">Radiation Exposure Monitoring Platform</p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Shield className="w-3 h-3 text-primary-500" />
            <span className="text-[11px] text-primary-500">TAEC Compliant · WHO Guidelines</span>
          </div>
        </div>

        {/* Login card */}
        <div className="glass-card p-8 shadow-2xl">
          <h2 className="font-semibold text-page mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder="you@hospital.go.tz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              autoComplete="email"
              autoFocus
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              autoComplete="current-password"
            />
            <Button type="submit" variant="primary" className="w-full mt-2" loading={loading} size="lg">
              Sign in
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border-color)' }}>
            <p className="text-xs text-muted mb-3 uppercase tracking-wider">Demo credentials</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { role: 'Admin',       email: 'admin@taec.go.tz',          pw: 'Admin123!' },
                { role: 'Manager',     email: 'manager@muhimbili.go.tz',   pw: 'Manager123!' },
                { role: 'Regulator',   email: 'regulator@taec.go.tz',     pw: 'Regulator1!' },
                { role: 'Radiologist', email: 'amina@muhimbili.go.tz',    pw: 'Radiol123!' },
              ].map((c) => (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => { setEmail(c.email); setPassword(c.pw); }}
                  className="text-left p-2.5 rounded-lg transition-all glass-card hover:border-primary-500/40"
                >
                  <p className="text-xs font-medium text-primary-500">{c.role}</p>
                  <p className="text-[10px] text-muted truncate mt-0.5">{c.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted mt-4">
          Tanzania Atomic Energy Commission · Regulatory Compliance Platform
        </p>
      </div>
    </div>
  );
}
