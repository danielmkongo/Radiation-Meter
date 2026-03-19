import { useState } from 'react';
import { User, Lock, Shield, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../api/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { ROLE_LABELS } from '../utils/constants';

export default function Profile() {
  const { user } = useAuth();
  const toast = useToast();

  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [errors, setErrors]         = useState({});

  async function handleChangePassword(e) {
    e.preventDefault();
    const errs = {};
    if (!currentPw)          errs.current   = 'Required';
    if (!newPw)              errs.new       = 'Required';
    if (newPw.length < 8)   errs.new       = 'Minimum 8 characters';
    if (newPw !== confirmPw) errs.confirm   = 'Passwords do not match';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    setLoading(true);
    try {
      await authApi.changePassword({ current_password: currentPw, new_password: newPw });
      toast.success('Password changed successfully');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="page-title">My Profile</h2>
        <p className="text-sm text-muted mt-0.5">View your account details and manage your password</p>
      </div>

      {/* Account info */}
      <Card title="Account Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: User,       label: 'Full Name',   value: user?.full_name },
            { icon: Shield,     label: 'Role',        value: <Badge variant={user?.role}>{ROLE_LABELS[user?.role]}</Badge> },
            { icon: CreditCard, label: 'Card Number', value: user?.card_number, mono: true },
            { icon: User,       label: 'Email',       value: user?.email },
            { icon: User,       label: 'Department',  value: user?.department || '—' },
            { icon: User,       label: 'Hospital',    value: user?.hospital || '—' },
          ].map(({ icon: Icon, label, value, mono }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-surface2)' }}>
              <Icon className="w-4 h-4 text-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
                <p className={`text-sm font-medium text-page mt-0.5 ${mono ? 'font-mono' : ''}`}>
                  {typeof value === 'string' ? value : value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Change password */}
      <Card title="Change Password" subtitle="Use a strong password of at least 8 characters">
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
          <Input
            label="Current Password"
            type="password"
            placeholder="Your current password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            error={errors.current}
            icon={Lock}
          />
          <Input
            label="New Password"
            type="password"
            placeholder="Min. 8 characters"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            error={errors.new}
            icon={Lock}
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Re-enter new password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            error={errors.confirm}
            icon={Lock}
          />
          <Button type="submit" variant="primary" loading={loading}>
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
