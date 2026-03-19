import { useState, useEffect, useCallback } from 'react';
import {
  Monitor, Plus, Key, Trash2, Edit, Wifi, WifiOff, Clock,
  Users, Activity, ChevronRight,
} from 'lucide-react';
import { devicesApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Drawer from '../components/ui/Drawer';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { formatRelative, formatDate } from '../utils/formatters';
import { ROLE_LABELS } from '../utils/constants';

// ─── Device Form Modal ────────────────────────────────────────────────────────
function DeviceFormModal({ open, onClose, onSaved, initial }) {
  const toast = useToast();
  const blank = { device_id: '', name: '', location: '', hospital: '', firmware_version: '' };
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setForm(initial ? { ...blank, ...initial } : blank); }, [initial]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (initial?.id) {
        await devicesApi.update(initial.id, form);
        toast.success('Device updated');
      } else {
        const res = await devicesApi.create(form);
        if (res.data.data.api_key) {
          alert(`IMPORTANT — Save this API key now, it won't be shown again:\n\n${res.data.data.api_key}`);
        }
        toast.success('Device registered');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title={initial?.id ? 'Edit Device' : 'Register Device'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={loading}>{initial?.id ? 'Save' : 'Register'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input label="Device ID *" placeholder="DEV-MNH-001" value={form.device_id} onChange={set('device_id')} disabled={!!initial?.id} />
        <Input label="Name *" placeholder="Dosimeter Unit A" value={form.name} onChange={set('name')} />
        <Input label="Location *" placeholder="CT Scan Room 1" value={form.location} onChange={set('location')} />
        <Input label="Hospital" placeholder="Muhimbili National Hospital" value={form.hospital} onChange={set('hospital')} />
        <Input label="Firmware Version" placeholder="1.0.0" value={form.firmware_version} onChange={set('firmware_version')} />
      </form>
    </Modal>
  );
}

// ─── Device Detail Drawer ─────────────────────────────────────────────────────
function DeviceDrawer({ device, open, onClose }) {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !device) return;
    setLoading(true);
    devicesApi.getUsers(device.id)
      .then((r) => setUsers(r.data.data?.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, device]);

  if (!device) return null;

  const statusIcon = (s) =>
    s === 'online'  ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> :
    s === 'stale'   ? <Clock className="w-3.5 h-3.5 text-amber-400" /> :
                      <WifiOff className="w-3.5 h-3.5 text-red-400" />;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={device.name}
      subtitle={`Device ID: ${device.device_id}`}
      width="max-w-2xl"
    >
      {/* Device meta */}
      <div className="glass-card p-4 grid grid-cols-2 gap-3 text-xs">
        {[
          ['Location',   device.location],
          ['Hospital',   device.hospital || '—'],
          ['Firmware',   device.firmware_version],
          ['Last Seen',  device.last_seen ? formatRelative(device.last_seen) : 'Never'],
          ['Registered', formatDate(device.created_at)],
          ['Status',     null],
        ].map(([label, val]) => (
          <div key={label}>
            <p className="text-muted mb-0.5">{label}</p>
            {label === 'Status' ? (
              <div className="flex items-center gap-1.5">
                {statusIcon(device.status)}
                <span className="text-page capitalize">{device.status}</span>
              </div>
            ) : (
              <p className="text-page font-medium">{val}</p>
            )}
          </div>
        ))}
      </div>

      {/* Users section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary-500" />
          <h3 className="text-sm font-semibold text-page">Users who used this device</h3>
          {!loading && <span className="text-xs text-muted">({users.length})</span>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8"><Spinner /></div>
        ) : !users.length ? (
          <div className="glass-card p-6 text-center">
            <p className="text-sm text-muted">No exposure data logged through this device yet.</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {['Name', 'Card No.', 'Department', 'Role', 'Readings', 'Total Dose', 'Last Reading'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-muted font-medium uppercase tracking-wide text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr
                    key={u.card_number}
                    className="transition-colors"
                    style={{ borderTop: i > 0 ? '1px solid var(--border-color)' : undefined }}
                  >
                    <td className="px-4 py-2.5 font-medium text-page">{u.full_name}</td>
                    <td className="px-4 py-2.5 font-mono text-primary-500">{u.card_number}</td>
                    <td className="px-4 py-2.5 text-secondary">{u.department || '—'}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="info">{ROLE_LABELS[u.role] || u.role}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-secondary">{u.total_readings}</td>
                    <td className="px-4 py-2.5 font-semibold text-page">
                      {parseFloat(u.total_dose).toFixed(4)} mSv
                    </td>
                    <td className="px-4 py-2.5 text-muted">
                      {u.last_reading ? formatRelative(u.last_reading) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Drawer>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Devices() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const [devices, setDevices]         = useState([]);
  const [pagination, setPagination]   = useState({});
  const [loading, setLoading]         = useState(true);
  const [page, setPage]               = useState(1);
  const [formModal, setFormModal]     = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting]       = useState(false);
  const [regening, setRegening]       = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const fetchDevices = useCallback(() => {
    setLoading(true);
    devicesApi.list({ page, limit: 20 })
      .then((r) => { setDevices(r.data.data || []); setPagination(r.data.pagination || {}); })
      .catch(() => toast.error('Failed to load devices'))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await devicesApi.delete(confirmDelete);
      toast.success('Device deactivated');
      setConfirmDelete(null);
      fetchDevices();
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  async function handleRegenKey(e, id) {
    e.stopPropagation();
    if (!window.confirm('Regenerate API key? The old key will stop working immediately.')) return;
    setRegening(id);
    try {
      const res = await devicesApi.regenerateKey(id);
      alert(`New API Key (save this now):\n\n${res.data.data.api_key}`);
      toast.success('API key regenerated');
    } catch {
      toast.error('Failed to regenerate key');
    } finally {
      setRegening(null);
    }
  }

  const statusIcon = (s) =>
    s === 'online' ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> :
    s === 'stale'  ? <Clock className="w-3.5 h-3.5 text-amber-400" /> :
                     <WifiOff className="w-3.5 h-3.5 text-red-400" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Devices</h2>
          <p className="text-sm text-muted">{pagination.total || 0} registered devices · click a row to inspect</p>
        </div>
        {isAdmin && (
          <Button variant="primary" icon={Plus} onClick={() => setFormModal({})}>Register Device</Button>
        )}
      </div>

      <Card noPadding>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
        ) : !devices.length ? (
          <EmptyState icon={Monitor} title="No devices" description="No IoT dosimeter devices registered." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['Device ID', 'Name', 'Location', 'Hospital', 'Status', 'Last Seen', 'Firmware', ...(isAdmin ? ['Actions'] : []), ''].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d, i) => (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedDevice(d)}
                      className="cursor-pointer transition-colors group"
                      style={{ borderTop: i > 0 ? '1px solid var(--border-color)' : undefined }}
                    >
                      <td className="px-5 py-3 text-primary-500 font-mono text-xs">{d.device_id}</td>
                      <td className="px-5 py-3 font-medium text-page">{d.name}</td>
                      <td className="px-5 py-3 text-secondary">{d.location}</td>
                      <td className="px-5 py-3 text-secondary text-xs">{d.hospital || '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {statusIcon(d.status)}
                          <Badge variant={d.status} className="capitalize">{d.status}</Badge>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted text-xs whitespace-nowrap">
                        {d.last_seen ? formatRelative(d.last_seen) : 'Never'}
                      </td>
                      <td className="px-5 py-3 text-muted text-xs font-mono">{d.firmware_version}</td>
                      {isAdmin && (
                        <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setFormModal(d)}
                              className="p-1.5 rounded transition-colors text-muted hover:text-primary-400"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleRegenKey(e, d.id)}
                              disabled={regening === d.id}
                              className="p-1.5 rounded transition-colors text-muted hover:text-amber-400"
                              title="Regenerate API Key"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(d.id)}
                              className="p-1.5 rounded transition-colors text-muted hover:text-red-400"
                              title="Deactivate"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <ChevronRight className="w-4 h-4 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid var(--border-color)' }}>
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

      <DeviceFormModal
        open={!!formModal}
        onClose={() => setFormModal(null)}
        onSaved={fetchDevices}
        initial={formModal?.id ? formModal : null}
      />

      <DeviceDrawer
        device={selectedDevice}
        open={!!selectedDevice}
        onClose={() => setSelectedDevice(null)}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Deactivate Device"
        message="This device will be marked inactive and can no longer ingest data. Existing logs are preserved."
        confirmLabel="Deactivate"
        variant="danger"
      />
    </div>
  );
}
