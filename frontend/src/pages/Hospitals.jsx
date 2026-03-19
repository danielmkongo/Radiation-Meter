import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Monitor, Users, Activity, Wifi, WifiOff, Clock,
  ChevronRight, ArrowLeft, TrendingUp,
} from 'lucide-react';
import { hospitalsApi } from '../api/api';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { formatRelative, formatDate } from '../utils/formatters';
import { DOSE_LIMITS, ROLE_LABELS } from '../utils/constants';

function statusIcon(s) {
  if (s === 'online') return <Wifi className="w-3.5 h-3.5 text-emerald-400" />;
  if (s === 'stale')  return <Clock className="w-3.5 h-3.5 text-amber-400" />;
  return <WifiOff className="w-3.5 h-3.5 text-red-400" />;
}

function complianceVariant(annualExposure) {
  if (annualExposure >= DOSE_LIMITS.ANNUAL_LIMIT)   return 'critical';
  if (annualExposure >= DOSE_LIMITS.ANNUAL_WARNING)  return 'warning';
  return 'safe';
}

// ─── Hospital Detail View ─────────────────────────────────────────────────────
function HospitalDetail({ name, onBack }) {
  const toast = useToast();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState('devices'); // 'devices' | 'staff'

  useEffect(() => {
    setLoading(true);
    hospitalsApi.details(name)
      .then((r) => setData(r.data.data))
      .catch(() => toast.error('Failed to load hospital details'))
      .finally(() => setLoading(false));
  }, [name]);

  if (loading) return <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>;
  if (!data)   return null;

  return (
    <div className="space-y-5">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg transition-colors text-muted hover:text-page glass-card">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="page-title">{data.name}</h2>
          <p className="text-sm text-muted">
            {data.devices.length} device{data.devices.length !== 1 ? 's' : ''} · {data.staff.length} staff
          </p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ backgroundColor: 'var(--bg-surface2)' }}>
        {[
          { key: 'devices', label: 'Devices', icon: Monitor },
          { key: 'staff',   label: 'Staff',   icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-primary-600 text-white shadow'
                : 'text-muted hover:text-page'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Devices tab */}
      {tab === 'devices' && (
        <Card noPadding title={`Devices at ${data.name}`}>
          {!data.devices.length ? (
            <EmptyState icon={Monitor} title="No devices" description="No active devices registered to this hospital." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['Device ID', 'Name', 'Location', 'Status', 'Last Seen', 'Firmware'].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.devices.map((d, i) => (
                    <tr key={d.id} className="transition-colors" style={{ borderTop: i > 0 ? '1px solid var(--border-color)' : undefined }}>
                      <td className="px-5 py-3 font-mono text-xs text-primary-500">{d.device_id}</td>
                      <td className="px-5 py-3 font-medium text-page">{d.name}</td>
                      <td className="px-5 py-3 text-secondary">{d.location}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {statusIcon(d.status)}
                          <Badge variant={d.status} className="capitalize">{d.status}</Badge>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted text-xs">{d.last_seen ? formatRelative(d.last_seen) : 'Never'}</td>
                      <td className="px-5 py-3 text-muted text-xs font-mono">{d.firmware_version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Staff tab */}
      {tab === 'staff' && (
        <Card noPadding title={`Staff linked to ${data.name}`} subtitle="Based on device usage and registration">
          {!data.staff.length ? (
            <EmptyState icon={Users} title="No staff" description="No staff linked to this hospital yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['Name', 'Card No.', 'Role', 'Department', 'Readings', 'Total Dose', 'Last Reading', 'Status'].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.staff.map((u, i) => {
                    const pct = DOSE_LIMITS.ANNUAL_LIMIT > 0
                      ? ((u.total_dose / DOSE_LIMITS.ANNUAL_LIMIT) * 100).toFixed(1)
                      : 0;
                    const variant = complianceVariant(u.total_dose);
                    return (
                      <tr key={u.card_number} className="transition-colors" style={{ borderTop: i > 0 ? '1px solid var(--border-color)' : undefined }}>
                        <td className="px-5 py-3 font-medium text-page">{u.full_name}</td>
                        <td className="px-5 py-3 font-mono text-xs text-primary-500">{u.card_number}</td>
                        <td className="px-5 py-3"><Badge variant="info">{ROLE_LABELS[u.role] || u.role}</Badge></td>
                        <td className="px-5 py-3 text-secondary">{u.department || '—'}</td>
                        <td className="px-5 py-3 text-secondary">{u.total_readings}</td>
                        <td className="px-5 py-3 font-semibold text-page">
                          {parseFloat(u.total_dose).toFixed(4)} mSv
                        </td>
                        <td className="px-5 py-3 text-muted text-xs">
                          {u.last_reading ? formatRelative(u.last_reading) : 'No data'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface3)' }}>
                              <div
                                className={`h-full rounded-full ${variant === 'critical' ? 'bg-red-500' : variant === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, parseFloat(pct))}%` }}
                              />
                            </div>
                            <Badge variant={variant}>{variant}</Badge>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── Hospital Card ────────────────────────────────────────────────────────────
function HospitalCard({ h, onClick }) {
  const variant = complianceVariant(h.annualExposure);
  return (
    <button
      onClick={onClick}
      className="glass-card p-5 text-left w-full group transition-all hover:border-primary-500/40 hover:shadow-lg"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary-600/15 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary-500" />
        </div>
        <ChevronRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <h3 className="font-semibold text-page text-sm mb-1 leading-tight">{h.name}</h3>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="glass-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Monitor className="w-3 h-3 text-primary-500" />
            <span className="text-[10px] text-muted uppercase tracking-wide">Devices</span>
          </div>
          <p className="text-lg font-bold text-page">{h.deviceCount}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-3 h-3 text-primary-500" />
            <span className="text-[10px] text-muted uppercase tracking-wide">Staff</span>
          </div>
          <p className="text-lg font-bold text-page">{h.staffCount}</p>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Activity className="w-3 h-3 text-primary-500" />
            <span className="text-[10px] text-muted uppercase tracking-wide">Monthly</span>
          </div>
          <p className="text-sm font-semibold text-page">{parseFloat(h.monthlyExposure).toFixed(3)}</p>
          <p className="text-[9px] text-muted">mSv</p>
        </div>
        <div className="glass-card p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-primary-500" />
            <span className="text-[10px] text-muted uppercase tracking-wide">Annual</span>
          </div>
          <p className="text-sm font-semibold text-page">{parseFloat(h.annualExposure).toFixed(3)}</p>
          <p className="text-[9px] text-muted">mSv</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
        <span className="text-[10px] text-muted uppercase tracking-wide">Compliance</span>
        <Badge variant={variant}>{variant === 'safe' ? 'Compliant' : variant === 'warning' ? 'Warning' : 'Exceeded'}</Badge>
      </div>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Hospitals() {
  const toast = useToast();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);

  const fetch = useCallback(() => {
    setLoading(true);
    hospitalsApi.list()
      .then((r) => setHospitals(r.data.data || []))
      .catch(() => toast.error('Failed to load hospitals'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (selected) {
    return <HospitalDetail name={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title">Hospitals</h2>
        <p className="text-sm text-muted">
          {hospitals.length} institution{hospitals.length !== 1 ? 's' : ''} · click to drill down into devices and staff
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Spinner size="lg" /></div>
      ) : !hospitals.length ? (
        <EmptyState
          icon={Building2}
          title="No hospitals found"
          description="Register devices or users with a hospital name to see them here."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hospitals.map((h) => (
            <HospitalCard key={h.name} h={h} onClick={() => setSelected(h.name)} />
          ))}
        </div>
      )}
    </div>
  );
}
