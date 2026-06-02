import { useState, useEffect, useCallback } from 'react';
import { Users as UsersIcon, Plus, Edit, Trash2, Search, UserCheck, UserX } from 'lucide-react';
import { usersApi, hospitalsApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import ComboInput from '../components/ui/ComboInput';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { formatDate } from '../utils/formatters';
import { ROLE_LABELS } from '../utils/constants';

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }));

const COMMON_DEPARTMENTS = [
  'Diagnostic Radiology',
  'Interventional Radiology',
  'Nuclear Medicine',
  'Radiation Therapy',
  'Radiology Management',
  'Oncology',
  'Emergency Radiology',
];

function initials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

const ROLE_COLOR = {
  admin:            'bg-sky-500/15 text-sky-500',
  hospital_manager: 'bg-violet-500/15 text-violet-400',
  regulator:        'bg-orange-500/15 text-orange-400',
  radiologist:      'bg-cyan-500/15 text-cyan-400',
};

// ─── User Form Modal ──────────────────────────────────────────────────────────
function UserFormModal({ open, onClose, onSaved, initial }) {
  const toast = useToast();
  const blank = {
    full_name: '', email: '', password: '', card_number: '',
    role: 'radiologist', department: '', hospital: '',
  };
  const [form, setForm]         = useState(blank);
  const [loading, setLoading]   = useState(false);
  const [hospitals, setHospitals] = useState([]);

  useEffect(() => {
    setForm(initial ? { ...initial, password: '' } : blank);
  }, [initial, open]);

  useEffect(() => {
    if (!open) return;
    hospitalsApi.list()
      .then((r) => setHospitals((r.data.data || []).map((h) => h.name)))
      .catch(() => {});
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!initial && (!form.full_name || !form.email || !form.password || !form.card_number || !form.role)) {
      toast.error('Please fill in all required fields'); return;
    }
    setLoading(true);
    try {
      if (initial?.id) {
        await usersApi.update(initial.id, form);
        toast.success('User updated successfully');
      } else {
        await usersApi.create(form);
        toast.success('User created successfully');
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
      open={open}
      onClose={onClose}
      title={initial?.id ? 'Edit User' : 'Create New User'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={loading}>
            {initial?.id ? 'Save Changes' : 'Create User'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5">
        {/* Identity */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Identity</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Full Name *"
              value={form.full_name}
              onChange={set('full_name')}
              placeholder="Dr. Jane Smith"
              className="col-span-2"
            />
            <Input
              label="Email Address *"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="jane@hospital.go.tz"
            />
            <Input
              label={initial?.id ? 'New Password (leave blank to keep)' : 'Password *'}
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="Min. 8 characters"
            />
          </div>
        </div>

        {/* Dosimeter */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Dosimeter & Role</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Card Number *"
              value={form.card_number}
              onChange={set('card_number')}
              placeholder="MNH-RAD-001"
              disabled={!!initial?.id}
              hint={initial?.id ? 'Card number cannot be changed after creation' : undefined}
            />
            <Select
              label="Role *"
              value={form.role}
              onChange={set('role')}
              options={ROLE_OPTIONS}
            />
          </div>
        </div>

        {/* Affiliation */}
        <div>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Affiliation</p>
          <div className="grid grid-cols-2 gap-3">
            <ComboInput
              label="Hospital"
              value={form.hospital}
              onChange={set('hospital')}
              placeholder="Select or type hospital name"
              options={hospitals}
              className="col-span-2"
            />
            <ComboInput
              label="Department"
              value={form.department}
              onChange={set('department')}
              placeholder="e.g. Diagnostic Radiology"
              options={COMMON_DEPARTMENTS}
              className="col-span-2"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Users() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const [users, setUsers]           = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [formModal, setFormModal]   = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting]     = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    usersApi.list({
      page,
      limit: 20,
      ...(search && { search }),
      ...(roleFilter && { role: roleFilter }),
    })
      .then((r) => { setUsers(r.data.data || []); setPagination(r.data.pagination || {}); })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await usersApi.delete(confirmDelete);
      toast.success('User deactivated');
      setConfirmDelete(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  const filterRoleOptions = [{ value: '', label: 'All roles' }, ...ROLE_OPTIONS];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Users</h2>
          <p className="text-sm text-muted mt-0.5">
            {pagination.total || 0} registered staff members
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" icon={Plus} onClick={() => setFormModal({})}>
            Add User
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-48">
            <Input
              label="Search"
              placeholder="Name, email or card number…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              icon={Search}
            />
          </div>
          <div className="w-44">
            <Select
              label="Role"
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              options={filterRoleOptions}
            />
          </div>
          {(search || roleFilter) && (
            <Button
              variant="secondary"
              onClick={() => { setSearch(''); setRoleFilter(''); setPage(1); }}
            >
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card noPadding>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : !users.length ? (
          <EmptyState
            icon={UsersIcon}
            title="No users found"
            description={search || roleFilter ? 'Try adjusting your filters.' : 'No users have been registered yet.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['User', 'Card #', 'Role', 'Department / Hospital', 'Status', 'Joined', ...(isAdmin ? [''] : [])].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs font-medium text-muted uppercase tracking-wider px-5 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr
                      key={u.id}
                      className={`transition-colors ${!u.is_active ? 'opacity-40' : ''}`}
                      style={{ borderTop: i > 0 ? '1px solid var(--border-color)' : undefined }}
                    >
                      {/* User cell with avatar */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${ROLE_COLOR[u.role] || 'bg-slate-500/15 text-slate-400'}`}>
                            {initials(u.full_name)}
                          </div>
                          <div>
                            <p className="font-medium text-page leading-snug">{u.full_name}</p>
                            <p className="text-xs text-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-primary-500 whitespace-nowrap">
                        {u.card_number}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={u.role}>{ROLE_LABELS[u.role] || u.role}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-xs text-secondary">{u.department || '—'}</p>
                        {u.hospital && (
                          <p className="text-[11px] text-muted mt-0.5">{u.hospital}</p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {u.is_active
                            ? <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                            : <UserX className="w-3.5 h-3.5 text-red-400" />
                          }
                          <span className={`text-xs ${u.is_active ? 'text-emerald-500' : 'text-red-400'}`}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted whitespace-nowrap">
                        {formatDate(u.created_at)}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setFormModal(u)}
                              className="p-1.5 rounded transition-colors text-muted hover:text-primary-500 hover:bg-primary-500/10"
                              title="Edit user"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {u.is_active && (
                              <button
                                onClick={() => setConfirmDelete(u.id)}
                                className="p-1.5 rounded transition-colors text-muted hover:text-red-400 hover:bg-red-500/10"
                                title="Deactivate user"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
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
                  Page {pagination.page} of {pagination.pages} · {pagination.total} users
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

      <UserFormModal
        open={formModal !== null}
        onClose={() => setFormModal(null)}
        onSaved={fetchUsers}
        initial={formModal?.id ? formModal : null}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Deactivate User"
        message="This will deactivate the user's account. They will no longer be able to log in. Existing exposure records are preserved."
        confirmLabel="Deactivate"
        variant="danger"
      />
    </div>
  );
}
