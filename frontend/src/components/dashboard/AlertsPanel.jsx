import { AlertTriangle, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { formatRelative } from '../../utils/formatters';
import Badge from '../ui/Badge';
import { alertsApi } from '../../api/api';
import { useToast } from '../../context/ToastContext';

export default function AlertsPanel({ alerts = [], onRefresh }) {
  const toast = useToast();

  async function acknowledge(id, e) {
    e.stopPropagation();
    try {
      await alertsApi.acknowledge(id);
      toast.success('Alert acknowledged');
      onRefresh?.();
    } catch {
      toast.error('Failed to acknowledge alert');
    }
  }

  if (!alerts.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
        <p className="text-sm text-muted">All clear — no active alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => {
        const isCritical = alert.type === 'critical';
        const Icon = isCritical ? AlertCircle : AlertTriangle;
        const iconColor = isCritical ? 'text-red-500' : 'text-amber-500';
        const borderColor = isCritical ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)';
        const bgColor     = isCritical ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.05)';

        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 rounded-lg ${alert.is_acknowledged ? 'opacity-50' : ''} ${isCritical && !alert.is_acknowledged ? 'alert-critical-pulse' : ''}`}
            style={{ border: `1px solid ${borderColor}`, backgroundColor: bgColor }}
          >
            <Icon className={`w-4 h-4 ${iconColor} shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-page leading-relaxed">{alert.message}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant={alert.type}>{alert.type}</Badge>
                {alert.full_name && <span className="text-[10px] text-muted">{alert.full_name}</span>}
                <div className="flex items-center gap-1 text-[10px] text-muted">
                  <Clock className="w-2.5 h-2.5" />
                  {formatRelative(alert.created_at)}
                </div>
              </div>
            </div>
            {!alert.is_acknowledged && (
              <button
                onClick={(e) => acknowledge(alert.id, e)}
                className="shrink-0 text-[10px] text-muted px-2 py-1 rounded transition-colors glass-card hover:border-primary-500/40"
              >
                Ack
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
