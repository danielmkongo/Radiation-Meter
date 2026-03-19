import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Zap, Monitor, Bell, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../api/api';
import StatsCard from '../components/ui/StatsCard';
import AlertsPanel from '../components/dashboard/AlertsPanel';
import ExposureMeter from '../components/dashboard/ExposureMeter';
import ExposureTrendChart from '../components/charts/ExposureTrendChart';
import ComparisonBarChart from '../components/charts/ComparisonBarChart';
import DevicePieChart from '../components/charts/DevicePieChart';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import { formatDoseShort, formatRelative } from '../utils/formatters';
import { getDoseStatus } from '../utils/thresholdHelpers';
import { DOSE_LIMITS } from '../utils/constants';

export default function Dashboard() {
  const { refreshKey } = useOutletContext() || {};
  const { user } = useAuth();
  const [data, setData]     = useState(null);
  const [trend, setTrend]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      dashboardApi.get(),
      dashboardApi.chartData({ period: '30d' }),
    ])
      .then(([dashRes, chartRes]) => {
        setData(dashRes.data.data);
        setTrend(chartRes.data.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!data) return null;

  const role = user?.role;

  // ── Radiologist Dashboard ─────────────────────────────────────────────────
  if (role === 'radiologist') {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-page">My Radiation Exposure</h2>
            <p className="text-sm text-muted mt-0.5">Card: {user.card_number} · {user.department}</p>
          </div>
          <Badge variant={getDoseStatus(data.dose_summary?.annual?.value || 0)} className="text-sm px-3 py-1">
            {getDoseStatus(data.dose_summary?.annual?.value || 0).toUpperCase()}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Dose meter */}
          <Card title="Dose Status" subtitle="Current period exposure vs. limits">
            <ExposureMeter doseSummary={data.dose_summary} />
          </Card>

          {/* 30-day trend */}
          <Card title="30-Day Trend" subtitle="Daily accumulated dose" className="lg:col-span-2">
            <ExposureTrendChart data={trend} height={260} />
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Recent readings */}
          <Card title="Recent Readings" subtitle="Last 10 measurements">
            {data.recent_readings?.length ? (
              <div className="space-y-1 -mx-1">
                {data.recent_readings.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-700/30 transition-colors">
                    <Zap className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 font-medium">{formatDoseShort(r.radiation_value)}</p>
                      <p className="text-[11px] text-slate-500 truncate">{r.device_name} · {r.location}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {r.is_anomaly ? <Badge variant="warning" className="text-[9px]">Anomaly</Badge> : null}
                      <p className="text-[10px] text-slate-600 mt-0.5">{formatRelative(r.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8">No readings yet</p>
            )}
          </Card>

          {/* Alerts */}
          <Card
            title="My Alerts"
            subtitle={`${data.unread_alerts || 0} unread`}
            action={data.unread_alerts > 0 && <Badge variant="critical">{data.unread_alerts}</Badge>}
          >
            <AlertsPanel alerts={data.recent_alerts || []} />
          </Card>
        </div>
      </div>
    );
  }

  // ── Admin / Manager / Regulator Dashboard ─────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-page">
          {role === 'regulator' ? 'Regulatory Overview' : role === 'hospital_manager' ? 'Facility Dashboard' : 'System Dashboard'}
        </h2>
        <p className="text-sm text-muted mt-0.5">
          {user.hospital ? `${user.hospital} · ` : ''}{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatsCard
          title="Today's Total Dose"
          value={data.totals?.today?.toFixed(4) || '0.0000'}
          unit="mSv"
          icon={Zap}
          color="primary"
        />
        <StatsCard
          title="Active Devices"
          value={data.devices?.online || 0}
          unit={`/ ${(data.devices?.online || 0) + (data.devices?.stale || 0) + (data.devices?.offline || 0)}`}
          icon={Monitor}
          color={data.devices?.offline > 0 ? 'warning' : 'success'}
        />
        <StatsCard
          title="Critical Alerts"
          value={data.alerts?.critical || 0}
          icon={AlertCircle}
          color={data.alerts?.critical > 0 ? 'danger' : 'success'}
          subtitle={`${data.alerts?.warning || 0} warnings pending`}
        />
        <StatsCard
          title="Staff at Risk"
          value={data.users?.at_risk || 0}
          unit={`/ ${data.users?.total || 0}`}
          icon={Users}
          color={data.users?.at_risk > 0 ? 'warning' : 'success'}
          subtitle="Above warning threshold"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="30-Day Exposure Trend" subtitle="System-wide daily dose accumulation" className="lg:col-span-2">
          <ExposureTrendChart data={trend} height={240} />
        </Card>
        <Card title="Device Health" subtitle="Real-time device status">
          <DevicePieChart data={data.devices} />
          <div className="mt-3 space-y-1.5">
            {[
              { label: 'Online',  count: data.devices?.online  || 0, color: 'bg-emerald-500' },
              { label: 'Stale',   count: data.devices?.stale   || 0, color: 'bg-amber-500' },
              { label: 'Offline', count: data.devices?.offline || 0, color: 'bg-red-500' },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span className="text-slate-400">{s.label}</span>
                </div>
                <span className="text-slate-300 font-medium">{s.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top exposure users */}
        <Card title="Highest Exposure (Annual)" subtitle="Top 10 staff by yearly accumulated dose">
          {data.top_users?.length ? (
            <ComparisonBarChart data={data.top_users.slice(0, 8)} height={240} />
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No data</p>
          )}
        </Card>

        {/* Recent alerts */}
        <Card
          title="Recent Alerts"
          subtitle={`${data.alerts?.total || 0} unacknowledged`}
          action={data.alerts?.critical > 0 && <Badge variant="critical">{data.alerts.critical} critical</Badge>}
        >
          <AlertsPanel alerts={data.recent_alerts || []} />
        </Card>
      </div>

      {/* At-risk users table */}
      {data.at_risk_users?.length > 0 && (
        <Card title="Staff Approaching Dose Limits" subtitle={`${data.at_risk_users.length} individuals above warning threshold`}>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-700/50">
                  {['Name', 'Card No.', 'Department', 'Hospital', 'Annual Dose', '% of Limit', 'Status'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider pb-2 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.at_risk_users.map((u) => {
                  const pct = ((u.annual_dose / DOSE_LIMITS.ANNUAL_LIMIT) * 100).toFixed(1);
                  const status = u.annual_dose >= DOSE_LIMITS.ANNUAL_LIMIT ? 'critical' : 'warning';
                  return (
                    <tr key={u.card_number} className="table-row">
                      <td className="py-2 px-3 text-slate-200 font-medium">{u.full_name}</td>
                      <td className="py-2 px-3 text-slate-400 font-mono text-xs">{u.card_number}</td>
                      <td className="py-2 px-3 text-slate-400">{u.department || '—'}</td>
                      <td className="py-2 px-3 text-slate-400">{u.hospital || '—'}</td>
                      <td className="py-2 px-3 text-slate-300 font-semibold">{parseFloat(u.annual_dose).toFixed(4)} mSv</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface3)' }}>
                            <div className={`h-full ${status === 'critical' ? 'bg-red-500' : 'bg-amber-500'} rounded-full`} style={{ width: `${Math.min(100, parseFloat(pct))}%` }} />
                          </div>
                          <span className="text-xs text-muted">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-3"><Badge variant={status}>{status}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
