import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import { auditApi } from '../api/api';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import { formatDateTime } from '../utils/formatters';

const ACTION_COLORS = {
  LOGIN:              'info',
  LOGOUT:             'neutral',
  CREATE_USER:        'safe',
  UPDATE_USER:        'info',
  DELETE_USER:        'critical',
  CREATE_DEVICE:      'safe',
  UPDATE_DEVICE:      'info',
  DELETE_DEVICE:      'critical',
  REGENERATE_API_KEY: 'warning',
  DELETE_EXPOSURE:    'critical',
};

export default function AuditLogs() {
  const toast = useToast();
  const [logs, setLogs]         = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]   = useState('');

  const fetch = useCallback(() => {
    setLoading(true);
    auditApi.list({ page, limit: 50, ...(search && { action: search }), ...(startDate && { start_date: startDate }), ...(endDate && { end_date: endDate }) })
      .then((r) => { setLogs(r.data.data || []); setPagination(r.data.pagination || {}); })
      .catch(() => toast.error('Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, [page, search, startDate, endDate]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title">Audit Log</h2>
        <p className="text-sm text-slate-500">Complete record of all system actions</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-40">
            <Input label="Search action" placeholder="LOGIN, DELETE_USER, etc." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={Search} />
          </div>
          <div className="w-40">
            <Input label="From" type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
          </div>
          <div className="w-40">
            <Input label="To" type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
          </div>
          <Button variant="secondary" onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); setPage(1); }}>Reset</Button>
        </div>
      </Card>

      <Card noPadding>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
        ) : !logs.length ? (
          <EmptyState icon={ClipboardList} title="No audit entries" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-surface-700/50">
                  <tr>
                    {['Timestamp', 'User', 'Action', 'Resource', 'Resource ID', 'IP Address', 'Details'].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/30">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-700/20 transition-colors">
                      <td className="px-5 py-3 text-xs text-slate-400 font-mono whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                      <td className="px-5 py-3 text-xs text-slate-300">{log.user_email || '—'}</td>
                      <td className="px-5 py-3">
                        <Badge variant={ACTION_COLORS[log.action] || 'neutral'} className="font-mono text-[10px]">{log.action}</Badge>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400 capitalize">{log.resource_type || '—'}</td>
                      <td className="px-5 py-3 text-xs text-slate-500 font-mono">{log.resource_id ? log.resource_id.slice(0, 16) + '…' : '—'}</td>
                      <td className="px-5 py-3 text-xs text-slate-600 font-mono">{log.ip_address || '—'}</td>
                      <td className="px-5 py-3 text-xs text-slate-600 max-w-[180px] truncate" title={log.details}>
                        {log.details ? JSON.stringify(JSON.parse(log.details || '{}')).slice(0, 60) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-surface-700/50">
                <p className="text-xs text-slate-500">Page {pagination.page} of {pagination.pages} ({pagination.total} entries)</p>
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
