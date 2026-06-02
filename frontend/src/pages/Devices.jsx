import { useState, useEffect, useCallback } from 'react';
import {
  Monitor, Plus, Key, Trash2, Edit, Wifi, WifiOff, Clock,
  Users, ChevronRight, AlertTriangle, Copy, CheckCheck, Eye, EyeOff,
  RefreshCw, Wand2,
} from 'lucide-react';
import { devicesApi, hospitalsApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Drawer from '../components/ui/Drawer';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { formatRelative, formatDate } from '../utils/formatters';
import { ROLE_LABELS } from '../utils/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hospitalAbbrev(name = '') {
  return name
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['and', 'of', 'the'].includes(w.toLowerCase()))
    .map((w) => w[0].toUpperCase())
    .join('')
    .slice(0, 4);
}

function suggestDeviceId(hospital, existingIds = []) {
  const abbrev = hospitalAbbrev(hospital) || 'DEV';
  const prefix = `DEV-${abbrev}-`;
  const taken = existingIds
    .filter((id) => id.startsWith(prefix))
    .map((id) => parseInt(id.slice(prefix.length), 10))
    .filter((n) => !isNaN(n));
  const next = taken.length ? Math.max(...taken) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

// ─── API Key Display (copyable) ───────────────────────────────────────────────
function ApiKeyBox({ apiKey, label = 'API Key' }) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  function copy() {
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const display = visible ? apiKey : apiKey.slice(0, 6) + '•'.repeat(Math.max(0, apiKey.length - 6));

  return (
    <div>
      <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 input-field font-mono text-sm truncate text-primary-500">
          {display}
        </code>
        <button
          onClick={() => setVisible((v) => !v)}
          className="shrink-0 p-2 rounded-lg transition-colors border"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface2)' }}
          title={visible ? 'Hide key' : 'Reveal key'}
        >
          {visible ? <EyeOff className="w-4 h-4 text-muted" /> : <Eye className="w-4 h-4 text-muted" />}
        </button>
        <button
          onClick={copy}
          className="shrink-0 p-2 rounded-lg transition-colors border"
          style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface2)' }}
          title="Copy to clipboard"
        >
          {copied ? <CheckCheck className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted" />}
        </button>
      </div>
    </div>
  );
}

// ─── API Key Modal (shown after create / regen) ───────────────────────────────
function ApiKeyModal({ apiKey, onClose }) {
  return (
    <Modal
      open={!!apiKey}
      onClose={onClose}
      title="Save Your API Key"
      footer={<Button variant="primary" onClick={onClose}>Done — I've saved it</Button>}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Flash this key into the device firmware now. You can view it again later from the device drawer.
          </p>
        </div>
        <ApiKeyBox apiKey={apiKey} label="New API Key" />
      </div>
    </Modal>
  );
}

// ─── Device Form Modal ────────────────────────────────────────────────────────
function DeviceFormModal({ open, onClose, onSaved, initial, onApiKey }) {
  const toast = useToast();
  const blank = { device_id: '', name: '', location: '', hospital: '', firmware_version: '1.0.0' };
  const [form, setForm]         = useState(blank);
  const [loading, setLoading]   = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [allDeviceIds, setAllDeviceIds] = useState([]);

  useEffect(() => {
    setForm(initial ? { ...blank, ...initial } : blank);
  }, [initial, open]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      hospitalsApi.list(),
      devicesApi.list({ limit: 200 }),
    ])
      .then(([hRes, dRes]) => {
        setHospitals((hRes.data.data || []).map((h) => h.name));
        setAllDeviceIds((dRes.data.data || []).map((d) => d.device_id));
      })
      .catch(() => {});
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function handleHospitalChange(e) {
    const hospital = e.target.value;
    setForm((f) => ({
      ...f,
      hospital,
      // Auto-suggest device_id when hospital changes and device_id is still blank
      device_id: f.device_id || suggestDeviceId(hospital, allDeviceIds),
    }));
  }

  function generateId() {
    if (!form.hospital) { toast.error('Enter a hospital name first'); return; }
    setForm((f) => ({ ...f, device_id: suggestDeviceId(form.hospital, allDeviceIds) }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.device_id || !form.name || !form.location) {
      toast.error('Device ID, name and location are required'); return;
    }
    setLoading(true);
    try {
      if (initial?.id) {
        await devicesApi.update(initial.id, form);
        toast.success('Device updated');
      } else {
        const res = await devicesApi.create(form);
        if (res.data.data.api_key) onApiKey?.(res.data.data.api_key);
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

  const isEdit = !!initial?.id;

  return (
    <Modal
      open={open} onClose={onClose}
      title={isEdit ? 'Edit Device' : 'Register New Device'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={loading}>
            {isEdit ? 'Save Changes' : 'Register Device'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {/* Hospital first — drives device_id suggestion */}
        <Select
          label="Hospital"
          value={form.hospital}
          onChange={handleHospitalChange}
          options={hospitals.map((h) => ({ value: h, label: h }))}
          placeholder="— Select hospital —"
        />

        {/* Device ID with auto-generate */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            Device ID *
          </label>
          <div className="flex gap-2">
            <input
              className="input-field flex-1 font-mono"
              placeholder="DEV-MNH-001"
              value={form.device_id}
              onChange={set('device_id')}
              disabled={isEdit}
            />
            {!isEdit && (
              <button
                type="button"
                onClick={generateId}
                className="shrink-0 px-3 rounded-lg border transition-colors flex items-center gap-1.5 text-xs font-medium text-muted hover:text-page"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-surface2)' }}
                title="Generate ID from hospital name"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Generate
              </button>
            )}
          </div>
          {isEdit && (
            <p className="text-xs text-muted">Device ID cannot be changed after registration</p>
          )}
        </div>

        <Input
          label="Display Name *"
          placeholder="Dosimeter — CT Scan Room 1"
          value={form.name}
          onChange={set('name')}
        />
        <Input
          label="Location *"
          placeholder="CT Scan Room 1"
          value={form.location}
          onChange={set('location')}
        />
        <Input
          label="Firmware Version"
          placeholder="1.0.0"
          value={form.firmware_version}
          onChange={set('firmware_version')}
        />
      </form>
    </Modal>
  );
}

// ─── Device Detail Drawer ─────────────────────────────────────────────────────
function DeviceDrawer({ device, open, onClose, onEdit, isAdmin }) {
  const toast = useToast();
  const [users, setUsers]       = useState([]);
  const [apiKey, setApiKey]     = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingKey, setLoadingKey]     = useState(false);

  useEffect(() => {
    if (!open || !device) { setApiKey(null); return; }
    setLoadingUsers(true);
    devicesApi.getUsers(device.id)
      .then((r) => setUsers(r.data.data?.users || []))
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, [open, device]);

  async function handleViewKey() {
    setLoadingKey(true);
    try {
      const res = await devicesApi.getApiKey(device.id);
      setApiKey(res.data.data.api_key);
    } catch {
      toast.error('Failed to load API key');
    } finally {
      setLoadingKey(false);
    }
  }

  async function handleRegenKey() {
    if (!window.confirm('Regenerate API key? The current key will stop working immediately.')) return;
    setLoadingKey(true);
    try {
      const res = await devicesApi.regenerateKey(device.id);
      setApiKey(res.data.data.api_key);
      toast.success('API key regenerated');
    } catch {
      toast.error('Failed to regenerate key');
    } finally {
      setLoadingKey(false);
    }
  }

  if (!device) return null;

  const statusIcon = (s) =>
    s === 'online' ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> :
    s === 'stale'  ? <Clock className="w-3.5 h-3.5 text-amber-400" /> :
                     <WifiOff className="w-3.5 h-3.5 text-red-400" />;

  const canManage = isAdmin;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={device.name}
      subtitle={`${device.device_id} · ${device.location}`}
      width="max-w-2xl"
    >
      {/* Meta grid */}
      <div className="glass-card p-4 grid grid-cols-2 gap-3 text-xs">
        {[
          ['Hospital',   device.hospital || '—'],
          ['Location',   device.location],
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

      {/* API Key section */}
      {canManage && (
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Firmware Authentication</p>
          <div className="glass-card p-4 space-y-3">
            {apiKey ? (
              <ApiKeyBox apiKey={apiKey} label="Current API Key" />
            ) : (
              <p className="text-xs text-muted">API key is hidden. Reveal it to copy into device firmware.</p>
            )}
            <div className="flex gap-2">
              {!apiKey && (
                <Button
                  variant="secondary"
                  icon={Eye}
                  size="sm"
                  loading={loadingKey}
                  onClick={handleViewKey}
                >
                  View API Key
                </Button>
              )}
              <Button
                variant="secondary"
                icon={RefreshCw}
                size="sm"
                loading={loadingKey}
                onClick={handleRegenKey}
              >
                Regenerate Key
              </Button>
              {canManage && (
                <Button
                  variant="secondary"
                  icon={Edit}
                  size="sm"
                  onClick={() => { onClose(); onEdit(device); }}
                >
                  Edit Device
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Users section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary-500" />
          <h3 className="text-sm font-semibold text-page">Users on this device</h3>
          {!loadingUsers && <span className="text-xs text-muted">({users.length})</span>}
        </div>

        {loadingUsers ? (
          <div className="flex items-center justify-center py-8"><Spinner /></div>
        ) : !users.length ? (
          <div className="glass-card p-6 text-center">
            <p className="text-sm text-muted">No exposure data has been logged through this device yet.</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {['Name', 'Card No.', 'Department', 'Role', 'Readings', 'Total Dose', 'Last Reading'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-muted font-medium uppercase tracking-wide text-[10px]">
                      {h}
                    </th>
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
                    <td className="px-4 py-2.5 font-semibold text-page font-mono">
                      {parseFloat(u.total_dose).toFixed(6)} mSv
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
  const isAdmin   = user?.role === 'admin';
  const canManage = isAdmin;

  const [devices, setDevices]             = useState([]);
  const [pagination, setPagination]       = useState({});
  const [loading, setLoading]             = useState(true);
  const [page, setPage]                   = useState(1);
  const [formModal, setFormModal]         = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting]           = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [newApiKey, setNewApiKey]           = useState(null);

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

  const statusIcon = (s) =>
    s === 'online' ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> :
    s === 'stale'  ? <Clock className="w-3.5 h-3.5 text-amber-400" /> :
                     <WifiOff className="w-3.5 h-3.5 text-red-400" />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Devices</h2>
          <p className="text-sm text-muted mt-0.5">
            {pagination.total || 0} registered dosimeters · click a row to inspect &amp; manage
          </p>
        </div>
        {canManage && (
          <Button variant="primary" icon={Plus} onClick={() => setFormModal({})}>
            Register Device
          </Button>
        )}
      </div>

      <Card noPadding>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
        ) : !devices.length ? (
          <EmptyState icon={Monitor} title="No devices" description="No IoT dosimeter devices registered yet." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['Device ID', 'Name', 'Location', 'Hospital', 'Status', 'Last Seen', 'Firmware', ...(canManage ? [''] : []), ''].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-3">
                        {h}
                      </th>
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
                      <td className="px-5 py-3 text-secondary text-xs">{d.location}</td>
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
                      {canManage && (
                        <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setFormModal(d)}
                              className="p-1.5 rounded transition-colors text-muted hover:text-primary-500 hover:bg-primary-500/10"
                              title="Edit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDelete(d.id); }}
                              className="p-1.5 rounded transition-colors text-muted hover:text-red-400 hover:bg-red-500/10"
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
        onApiKey={(key) => setNewApiKey(key)}
      />

      <DeviceDrawer
        device={selectedDevice}
        open={!!selectedDevice}
        onClose={() => setSelectedDevice(null)}
        onEdit={(d) => { setSelectedDevice(null); setFormModal(d); }}
        isAdmin={isAdmin}
      />

      <ApiKeyModal
        apiKey={newApiKey}
        onClose={() => setNewApiKey(null)}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Deactivate Device"
        message="This device will be marked inactive and can no longer ingest data. All existing exposure logs are preserved."
        confirmLabel="Deactivate"
        variant="danger"
      />
    </div>
  );
}
