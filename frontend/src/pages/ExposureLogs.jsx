import { useState, useEffect, useCallback } from 'react';
import { Zap, Search, X, Trash2, AlertTriangle, SlidersHorizontal } from 'lucide-react';
import { exposureApi, dashboardApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ExposureTrendChart from '../components/charts/ExposureTrendChart';
import { formatDateTime, formatDoseInUnit } from '../utils/formatters';
import { useUnit } from '../context/UnitContext';

const PAGE_SIZE = 20;

export default function ExposureLogs() {
  const { user } = useAuth();
  const toast = useToast();

  const [logs, setLogs]             = useState([]);
  const [pagination, setPagination] = useState({});
  const [trend, setTrend]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [anomalyOnly, setAnomalyOnly] = useState(false);
  const [deleting, setDeleting]     = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = {
      page,
      limit: PAGE_SIZE,
      ...(search && { card_number: search.toUpperCase() }),
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
      ...(anomalyOnly && { anomaly_only: 'true' }),
    };
    Promise.all([
      exposureApi.list(params),
      dashboardApi.chartData({ period: '30d', ...(search && { card_number: search.toUpperCase() }) }),
    ])
      .then(([logsRes, trendRes]) => {
        setLogs(logsRes.data.data || []);
        setPagination(logsRes.data.pagination || {});
        setTrend(trendRes.data.data || []);
      })
      .catch((e) => toast.error(e.response?.data?.message || 'Failed to load exposure logs'))
      .finally(() => setLoading(false));
  }, [page, search, startDate, endDate, anomalyOnly]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(confirmDelete);
    try {
      await exposureApi.delete(confirmDelete);
      toast.success('Record deleted');
      setConfirmDelete(null);
      fetchLogs();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  }

  const { unit } = useUnit();
  const isAdmin = user?.role === 'admin';
  const hasFilters = search || startDate || endDate || anomalyOnly;

  function clearFilters() {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setAnomalyOnly(false);
    setPage(1);
  }

  return (
    <div className="space-y-5">
      {/* 30-day trend */}
      <Card title="30-Day Exposure Trend" subtitle="Accumulated daily dose">
        <ExposureTrendChart data={trend} height={200} />
      </Card>

      {/* Filters */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted" />
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">Filters</span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-muted hover:text-page transition-colors"
            >
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-40">
            <Input
              label="Card Number"
              placeholder="MNH-RAD-001"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              icon={Search}
            />
          </div>
          <div className="w-40">
            <Input
              label="From"
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            />
          </div>
          <div className="w-40">
            <Input
              label="To"
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            />
          </div>
          <label className="flex items-center gap-2 mb-0.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={anomalyOnly}
              onChange={(e) => { setAnomalyOnly(e.target.checked); setPage(1); }}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-secondary flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Anomalies only
            </span>
          </label>
        </div>
      </Card>

      {/* Table */}
      <Card
        title="Exposure Records"
        subtitle={`${pagination.total || 0} total records${anomalyOnly ? ' · anomalies only' : ''}`}
        noPadding
      >
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
        ) : !logs.length ? (
          <EmptyState
            icon={Zap}
            title="No exposure records"
            description={hasFilters ? 'No data matches your current filters.' : 'No exposure data has been submitted yet.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['Timestamp', 'Worker', 'Dose', 'Device', 'Status', ...(isAdmin ? [''] : [])].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr
                      key={log.id}
                      className={`transition-colors ${log.is_anomaly ? 'bg-amber-500/3' : ''}`}
                      style={{ borderTop: i > 0 ? '1px solid var(--border-color)' : undefined }}
                    >
                      <td className="px-5 py-3 text-xs text-muted font-mono whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-medium text-page text-sm">{log.full_name || '—'}</p>
                        <p className="text-xs font-mono text-primary-500 mt-0.5">{log.card_number}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-semibold text-page font-mono">{formatDoseInUnit(log.radiation_value, unit)}</span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm text-secondary">{log.device_name || log.device_id}</p>
                        {log.location && (
                          <p className="text-xs text-muted mt-0.5">{log.location}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {log.is_anomaly ? (
                          <Badge variant="warning" className="flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> Anomaly
                          </Badge>
                        ) : (
                          <Badge variant="safe">Normal</Badge>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3">
                          <button
                            onClick={() => setConfirmDelete(log.id)}
                            className="p-1.5 rounded transition-colors text-muted hover:text-red-400 hover:bg-red-500/10"
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ borderTop: '1px solid var(--border-color)' }}
              >
                <p className="text-xs text-muted">
                  Page {pagination.page} of {pagination.pages} · {pagination.total} records
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Prev
                  </Button>
                  <Button variant="secondary" size="xs" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        loading={!!deleting}
        title="Delete Record"
        message="This will permanently remove this exposure record. The action is logged in the audit trail and cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
