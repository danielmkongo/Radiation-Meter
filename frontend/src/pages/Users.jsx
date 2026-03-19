import { useState, useEffect, useCallback } from 'react';
import { Users as UsersIcon, Plus, Edit, Trash2, Search } from 'lucide-react';
import { usersApi } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { formatDate } from '../utils/formatters';
import { ROLE_LABELS } from '../utils/constants';

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }));

function UserFormModal({ open, onClose, onSaved, initial }) {
  const toast = useToast();
  const blank = { full_name: '', email: '', password: '', card_number: '', role: 'radiologist', department: '', hospital: '' };
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setForm(initial ? { ...initial, password: '' } : blank); }, [initial]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (!initial && (!form.full_name || !form.email || !form.password || !form.card_number || !form.role)) {
      toast.error('All required fields must be filled'); return;
    }
    setLoading(true);
    try {
      if (initial?.id) {
        await usersApi.update(initial.id, form);
        toast.success('User updated');
      } else {
        await usersApi.create(form);
        toast.success('User created');
      }
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial?.id ? 'Edit User' : 'Create User'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={loading}>{initial?.id ? 'Save' : 'Create'}</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Full Name *" value={form.full_name} onChange={set('full_name')} placeholder="Dr. Jane Smith" className="col-span-2" />
          <Input label="Email *" type="email" value={form.email} onChange={set('email')} placeholder="jane@hospital.go.tz" />
          <Input label={`Password ${initial ? '(leave blank)' : '*'}`} type="password" value={form.password} onChange={set('password')} placeholder="Min 8 characters" />
          <Input label="Card Number *" value={form.card_number} onChange={set('card_number')} placeholder="MNH-RAD-001" disabled={!!initial?.id} />
          <Select label="Role *" value={form.role} onChange={set('role')} options={ROLE_OPTIONS} />
          <Input label="Department" value={form.department} onChange={set('department')} placeholder="Radiology" />
          <Input label="Hospital" value={form.hospital} onChange={set('hospital')} placeholder="Muhimbili National Hospital" className="col-span-2" />
        </div>
      </form>
    </Modal>
  );
}

export default function Users() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';

  const [users, setUsers]       = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [formModal, setFormModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetch = useCallback(() => {
    setLoading(true);
    usersApi.list({ page, limit: 20, ...(search && { search }), ...(roleFilter && { role: roleFilter }) })
      .then((r) => { setUsers(r.data.data || []); setPagination(r.data.pagination || {}); })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, [page, search, roleFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await usersApi.delete(confirmDelete);
      toast.success('User deactivated');
      setConfirmDelete(null);
      fetch();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  const roleOptions = [{ value: '', label: 'All roles' }, ...ROLE_OPTIONS];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title">Users</h2>
          <p className="text-sm text-slate-500">{pagination.total || 0} total users</p>
        </div>
        {isAdmin && (
          <Button variant="primary" icon={Plus} onClick={() => setFormModal({})}>Add User</Button>
        )}
      </div>

      <Card>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input label="Search" placeholder="Name, email, or card number" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={Search} />
          </div>
          <Select label="Role" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} options={ROLE_OPTIONS} placeholder="All roles" className="w-44" />
        </div>
      </Card>

      <Card noPadding>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
        ) : !users.length ? (
          <EmptyState icon={UsersIcon} title="No users found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-surface-700/50">
                  <tr>
                    {['Name', 'Email', 'Card #', 'Role', 'Department', 'Hospital', 'Status', 'Joined', ...(isAdmin ? [''] : [])].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-700/30">
                  {users.map((u) => (
                    <tr key={u.id} className={`hover:bg-surface-700/20 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-5 py-3 text-slate-200 font-medium">{u.full_name}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{u.email}</td>
                      <td className="px-5 py-3 text-primary-400 font-mono text-xs">{u.card_number}</td>
                      <td className="px-5 py-3"><Badge variant={u.role}>{ROLE_LABELS[u.role] || u.role}</Badge></td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{u.department || '—'}</td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{u.hospital || '—'}</td>
                      <td className="px-5 py-3"><Badge variant={u.is_active ? 'safe' : 'neutral'}>{u.is_active ? 'Active' : 'Inactive'}</Badge></td>
                      <td className="px-5 py-3 text-slate-500 text-xs">{formatDate(u.created_at)}</td>
                      {isAdmin && (
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setFormModal(u)} className="p-1.5 text-slate-500 hover:text-primary-400 hover:bg-surface-700 rounded transition-colors">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setConfirmDelete(u.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-surface-700 rounded transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-surface-700/50">
                <p className="text-xs text-slate-500">Page {pagination.page} of {pagination.pages} ({pagination.total} users)</p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                  <Button variant="secondary" size="xs" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <UserFormModal open={formModal !== null} onClose={() => setFormModal(null)} onSaved={fetch} initial={formModal?.id ? formModal : null} />
      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete} loading={deleting} title="Deactivate User" message="This will deactivate the user account. They will no longer be able to login." confirmLabel="Deactivate" />
    </div>
  );
}
