import { useState, useEffect, useCallback } from 'react';
import { Bell, AlertCircle, AlertTriangle, CheckCircle, Filter } from 'lucide-react';
import { alertsApi } from '../api/api';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { formatDateTime, formatRelative } from '../utils/formatters';

const PAGE_SIZE = 30;

export default function Alerts() {
  const toast = useToast();
  const [alerts, setAlerts]     = useState([]);
  const [pagination, setPagination] = useState({});
  const [counts, setCounts]     = useState({ critical: 0, warning: 0, total: 0 });
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [ackFilter, setAckFilter]   = useState('false');
  const [acking, setAcking]         = useState(null);

  const fetchAlerts = useCallback(() => {
    setLoading(true);
    Promise.all([
      alertsApi.list({ page, limit: PAGE_SIZE, ...(typeFilter && { type: typeFilter }), acknowledged: ackFilter }),
      alertsApi.unreadCount(),
    ])
      .then(([alertsRes, countRes]) => {
        setAlerts(alertsRes.data.data || []);
        setPagination(alertsRes.data.pagination || {});
        setCounts(countRes.data.data || {});
      })
      .catch(() => toast.error('Failed to load alerts'))
      .finally(() => setLoading(false));
  }, [page, typeFilter, ackFilter]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  async function handleAcknowledge(id) {
    setAcking(id);
    try {
      await alertsApi.acknowledge(id);
      toast.success('Alert acknowledged');
      fetchAlerts();
    } catch {
      toast.error('Failed to acknowledge alert');
    } finally {
      setAcking(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Critical',     value: counts.critical || 0, icon: AlertCircle,   color: 'danger' },
          { label: 'Warning',      value: counts.warning  || 0, icon: AlertTriangle,  color: 'warning' },
          { label: 'Unread Total', value: counts.total    || 0, icon: Bell,           color: counts.total > 0 ? 'warning' : 'success' },
        ].map((s) => {
          const Icon = s.icon;
          const colors = {
            danger:  'border-red-500/20 bg-red-500/5',
            warning: 'border-amber-500/20 bg-amber-500/5',
            success: 'border-emerald-500/20 bg-emerald-500/5',
          };
          return (
            <div key={s.label} className={`glass-card p-4 border ${colors[s.color]}`}>
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${s.color === 'danger' ? 'text-red-400' : s.color === 'warning' ? 'text-amber-400' : 'text-emerald-400'}`} />
                <div>
                  <p className="text-2xl font-bold text-slate-100">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-end gap-3">
          <Select
            label="Severity"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            options={[{ value: 'warning', label: 'Warning' }, { value: 'critical', label: 'Critical' }]}
            placeholder="All severities"
            className="w-44"
          />
          <Select
            label="Status"
            value={ackFilter}
            onChange={(e) => { setAckFilter(e.target.value); setPage(1); }}
            options={[{ value: 'false', label: 'Unacknowledged' }, { value: 'true', label: 'Acknowledged' }]}
            placeholder="All"
            className="w-44"
          />
          <Button variant="secondary" icon={Filter} onClick={() => { setTypeFilter(''); setAckFilter(''); setPage(1); }}>Reset</Button>
        </div>
      </Card>

      {/* Alert list */}
      <Card title="Alerts" subtitle={`${pagination.total || 0} alerts`} noPadding>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
        ) : !alerts.length ? (
          <EmptyState icon={CheckCircle} title="No alerts" description="No alerts match your filters." />
        ) : (
          <>
            <div className="divide-y divide-surface-700/30">
              {alerts.map((alert) => {
                const isCritical = alert.type === 'critical';
                const Icon = isCritical ? AlertCircle : AlertTriangle;
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-4 px-5 py-4 ${alert.is_acknowledged ? 'opacity-50' : ''} ${isCritical && !alert.is_acknowledged ? 'bg-red-500/3' : ''} hover:bg-surface-700/20 transition-colors`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isCritical ? 'text-red-400' : 'text-amber-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200">{alert.message}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <Badge variant={alert.type}>{alert.type}</Badge>
                        <Badge variant="neutral" className="capitalize">{alert.category?.replace('_', ' ')}</Badge>
                        {alert.period && <Badge variant="info">{alert.period}</Badge>}
                        {alert.full_name && <span className="text-xs text-slate-500">{alert.full_name}</span>}
                        {alert.radiation_value && (
                          <span className="text-xs text-slate-500">
                            {alert.radiation_value.toFixed(4)} mSv {alert.threshold_value ? `(limit: ${alert.threshold_value})` : ''}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1.5">{formatDateTime(alert.created_at)} · {formatRelative(alert.created_at)}</p>
                      {alert.is_acknowledged && alert.acknowledged_at && (
                        <p className="text-xs text-emerald-500/70 mt-1">✓ Acknowledged {formatRelative(alert.acknowledged_at)}</p>
                      )}
                    </div>
                    {!alert.is_acknowledged && (
                      <Button
                        variant="secondary"
                        size="xs"
                        loading={acking === alert.id}
                        onClick={() => handleAcknowledge(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-surface-700/50">
                <p className="text-xs text-slate-500">Page {pagination.page} of {pagination.pages}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                  <Button variant="secondary" size="xs" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
