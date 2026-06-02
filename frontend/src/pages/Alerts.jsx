import { useState, useEffect, useCallback } from 'react';
import { Bell, AlertCircle, AlertTriangle, CheckCircle, Check, Filter } from 'lucide-react';
import { alertsApi } from '../api/api';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { formatDateTime, formatRelative, formatDoseInUnit } from '../utils/formatters';
import { useUnit } from '../context/UnitContext';

const PAGE_SIZE = 30;

const CATEGORY_LABELS = {
  threshold_exceeded: 'Threshold',
  anomaly_detected:   'Anomaly',
  device_offline:     'Device Offline',
  spike_detected:     'Spike',
};

export default function Alerts() {
  const toast = useToast();
  const { unit } = useUnit();
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
      alertsApi.list({
        page,
        limit: PAGE_SIZE,
        ...(typeFilter && { type: typeFilter }),
        acknowledged: ackFilter,
      }),
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
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Critical',
            value: counts.critical || 0,
            icon: AlertCircle,
            bg: 'bg-red-500/8 border-red-500/20',
            iconColor: 'text-red-400',
            valueColor: 'text-red-400',
          },
          {
            label: 'Warnings',
            value: counts.warning || 0,
            icon: AlertTriangle,
            bg: 'bg-amber-500/8 border-amber-500/20',
            iconColor: 'text-amber-400',
            valueColor: 'text-amber-400',
          },
          {
            label: 'Total Unread',
            value: counts.total || 0,
            icon: Bell,
            bg: counts.total > 0 ? 'bg-primary-500/8 border-primary-500/20' : 'bg-emerald-500/8 border-emerald-500/20',
            iconColor: counts.total > 0 ? 'text-primary-400' : 'text-emerald-400',
            valueColor: counts.total > 0 ? 'text-page' : 'text-emerald-400',
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`glass-card p-4 border ${s.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted uppercase tracking-wide font-medium">{s.label}</p>
                <Icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
              <p className={`text-3xl font-bold ${s.valueColor}`}>{s.value}</p>
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
            options={[
              { value: 'warning',  label: 'Warning' },
              { value: 'critical', label: 'Critical' },
            ]}
            placeholder="All severities"
            className="w-44"
          />
          <Select
            label="Status"
            value={ackFilter}
            onChange={(e) => { setAckFilter(e.target.value); setPage(1); }}
            options={[
              { value: 'false', label: 'Unacknowledged' },
              { value: 'true',  label: 'Acknowledged' },
            ]}
            placeholder="All"
            className="w-44"
          />
          {(typeFilter || ackFilter) && (
            <Button
              variant="secondary"
              icon={Filter}
              onClick={() => { setTypeFilter(''); setAckFilter(''); setPage(1); }}
            >
              Reset
            </Button>
          )}
        </div>
      </Card>

      {/* Alert list */}
      <Card
        title="Alerts"
        subtitle={`${pagination.total || 0} alerts`}
        noPadding
      >
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
        ) : !alerts.length ? (
          <EmptyState
            icon={CheckCircle}
            title="No alerts"
            description="No alerts match your current filters."
          />
        ) : (
          <>
            <div>
              {alerts.map((alert, i) => {
                const isCritical = alert.type === 'critical';
                const Icon = isCritical ? AlertCircle : AlertTriangle;
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-4 px-5 py-4 transition-colors
                      ${i > 0 ? 'border-t' : ''}
                      ${alert.is_acknowledged ? 'opacity-50' : ''}
                      ${isCritical && !alert.is_acknowledged ? 'bg-red-500/5' : 'hover:bg-surface-700/10'}
                    `}
                    style={i > 0 ? { borderColor: 'var(--border-color)' } : undefined}
                  >
                    <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isCritical ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                      <Icon className={`w-4 h-4 ${isCritical ? 'text-red-400' : 'text-amber-400'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-page leading-snug">{alert.message}</p>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant={alert.type}>{alert.type}</Badge>
                        <Badge variant="neutral" className="capitalize">
                          {CATEGORY_LABELS[alert.category] || alert.category?.replace(/_/g, ' ')}
                        </Badge>
                        {alert.period && (
                          <Badge variant="info" className="capitalize">{alert.period}</Badge>
                        )}
                        {alert.full_name && (
                          <span className="text-xs text-muted">{alert.full_name}</span>
                        )}
                        {alert.radiation_value != null && (
                          <span className="text-xs text-muted font-mono">
                            {formatDoseInUnit(alert.radiation_value, unit)}
                            {alert.threshold_value ? ` · limit ${formatDoseInUnit(alert.threshold_value, unit)}` : ''}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted mt-2">
                        {formatDateTime(alert.created_at)} · {formatRelative(alert.created_at)}
                      </p>

                      {alert.is_acknowledged && alert.acknowledged_at && (
                        <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Acknowledged {formatRelative(alert.acknowledged_at)}
                        </p>
                      )}
                    </div>

                    {!alert.is_acknowledged && (
                      <Button
                        variant="secondary"
                        size="xs"
                        loading={acking === alert.id}
                        onClick={() => handleAcknowledge(alert.id)}
                        className="shrink-0"
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {pagination.pages > 1 && (
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ borderTop: '1px solid var(--border-color)' }}
              >
                <p className="text-xs text-muted">Page {pagination.page} of {pagination.pages}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                  <Button variant="secondary" size="xs" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
