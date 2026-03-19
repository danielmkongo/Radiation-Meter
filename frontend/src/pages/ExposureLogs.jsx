import { useState, useEffect, useCallback } from 'react';
import { Zap, Search, Filter, Trash2, AlertTriangle } from 'lucide-react';
import { exposureApi, dashboardApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ExposureTrendChart from '../components/charts/ExposureTrendChart';
import { formatDateTime, formatDoseShort } from '../utils/formatters';

const PAGE_SIZE = 20;

export default function ExposureLogs() {
  const { user } = useAuth();
  const toast = useToast();

  const [logs, setLogs]         = useState([]);
  const [pagination, setPagination] = useState({});
  const [trend, setTrend]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]   = useState('');
  const [anomalyOnly, setAnomalyOnly] = useState(false);
  const [deleting, setDeleting] = useState(null);
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

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-5">
      {/* Chart */}
      <Card title="30-Day Exposure Trend" subtitle="Accumulated daily dose">
        <ExposureTrendChart data={trend} height={200} />
      </Card>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-40">
            <Input
              label="Search Card #"
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
          <div className="flex items-center gap-2 mb-0.5">
            <input
              type="checkbox"
              id="anomaly"
              checked={anomalyOnly}
              onChange={(e) => { setAnomalyOnly(e.target.checked); setPage(1); }}
              className="w-4 h-4 rounded border-surface-600 bg-surface-700"
            />
            <label htmlFor="anomaly" className="text-sm text-slate-400 flex items-center gap-1 cursor-pointer">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Anomalies only
            </label>
          </div>
          <Button variant="secondary" icon={Filter} onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); setAnomalyOnly(false); setPage(1); }}>
            Reset
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card
        title="Exposure Records"
        subtitle={`${pagination.total || 0} total records`}
        noPadding
      >
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
        ) : !logs.length ? (
          <EmptyState icon={Zap} title="No exposure records" description="No data matches your current filters." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-surface-700/50">
                  <tr>
                    {['Timestamp', 'Card #', 'Name', 'Dose', 'Device', 'Location', 'Status', ...(isAdmin ? [''] : [])].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/30">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-700/20 transition-colors">
                      <td className="px-5 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                      <td className="px-5 py-3 text-xs font-mono text-primary-400">{log.card_number}</td>
                      <td className="px-5 py-3 text-slate-200">{log.full_name || '—'}</td>
                      <td className="px-5 py-3 text-slate-100 font-semibold">{formatDoseShort(log.radiation_value)}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{log.device_name || log.device_id}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{log.location || '—'}</td>
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
                            className="text-slate-600 hover:text-red-400 transition-colors p-1 rounded"
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
              <div className="flex items-center justify-between px-5 py-3 border-t border-surface-700/50">
                <p className="text-xs text-slate-500">
                  Page {pagination.page} of {pagination.pages} ({pagination.total} records)
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                  <Button variant="secondary" size="xs" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
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
        message="This will permanently delete this exposure record. This action is logged in the audit trail."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
