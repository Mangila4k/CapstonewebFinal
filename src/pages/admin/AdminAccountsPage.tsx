import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  Shield,
  GraduationCap,
  Briefcase,
  UserCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { formatDate } from '../../lib/utils';
import type { UserRole } from '../../types';

interface AccountItem {
  id: string | number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  created_at?: string;
}

export const AdminAccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<AccountItem | null>(null);
  const [deleteReasonCategory, setDeleteReasonCategory] = useState('');
  const [deleteReasonNotes, setDeleteReasonNotes] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'teacher' as UserRole,
  });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      let query = supabase.from('users').select('*').order('created_at', { ascending: false });

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      const { data, error } = await query;
      if (!error && data) {
        setAccounts(data);
      }
    } catch (err) {
      console.warn('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [roleFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setSubmitting(true);

    try {
      const payload = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password.trim(),
        role: form.role,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('users').insert([payload]);

      if (error) {
        throw new Error(error.message);
      }

      setNotice({ type: 'success', message: `Account created successfully for ${form.email}` });
      setIsModalOpen(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'teacher' });
      fetchAccounts();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to create user account' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (acc: AccountItem) => {
    setDeletingAccount(acc);
    setDeleteReasonCategory('');
    setDeleteReasonNotes('');
  };

  const handleConfirmDeleteAccount = async () => {
    if (!deletingAccount) return;
    const finalReason =
      deleteReasonCategory === 'Other (Specify Below)'
        ? deleteReasonNotes.trim()
        : deleteReasonNotes.trim()
        ? `${deleteReasonCategory} — ${deleteReasonNotes.trim()}`
        : deleteReasonCategory.trim();

    if (!finalReason) {
      setNotice({ type: 'error', message: 'Please provide a reason before deleting the account.' });
      return;
    }

    setDeleteLoading(true);
    try {
      const { error } = await supabase.from('users').delete().eq('id', deletingAccount.id);
      if (error) throw new Error(error.message);

      try {
        const rawLogs = localStorage.getItem('plsnhs_deletion_audit_logs_v1');
        const logs = rawLogs ? JSON.parse(rawLogs) : [];
        logs.unshift({
          id: `del-acc-${Date.now()}`,
          entity_type: `Account (${deletingAccount.role})`,
          entity_name:
            `${deletingAccount.first_name || ''} ${deletingAccount.last_name || ''}`.trim() ||
            deletingAccount.email,
          identifier: deletingAccount.email,
          reason: finalReason,
          deleted_at: new Date().toISOString(),
        });
        localStorage.setItem('plsnhs_deletion_audit_logs_v1', JSON.stringify(logs.slice(0, 200)));
      } catch {
        // ignore
      }

      setNotice({
        type: 'success',
        message: `Account ${deletingAccount.email} deleted. Reason: ${finalReason}`,
      });
      setDeletingAccount(null);
      setDeleteReasonCategory('');
      setDeleteReasonNotes('');
      fetchAccounts();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Could not delete account.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const q = search.toLowerCase();
    const name = `${acc.first_name || ''} ${acc.last_name || ''}`.toLowerCase();
    const email = (acc.email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 sm:pr-12">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            User Accounts Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Create, monitor, and configure role credentials for faculty, staff, and learners.
          </p>
        </div>

        <button
          onClick={() => {
            setForm({ firstName: '', lastName: '', email: '', password: '', role: 'teacher' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add New Account
        </button>
      </div>

      {notice && (
        <Alert
          type={notice.type}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="registrar">Registrar</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="parent">Parent</option>
            <option value="guidance">Guidance</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Account Holder</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Email Address</th>
                <th className="px-5 py-3">Registered Date</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-2"></div>
                    <p>Loading accounts...</p>
                  </td>
                </tr>
              ) : filteredAccounts.length > 0 ? (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">
                        {acc.first_name || acc.last_name
                          ? `${acc.first_name || ''} ${acc.last_name || ''}`.trim()
                          : 'User'}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="capitalize">
                        <Badge
                          variant={
                            acc.role === 'admin'
                              ? 'danger'
                              : acc.role === 'registrar'
                              ? 'info'
                              : acc.role === 'teacher'
                              ? 'warning'
                              : acc.role === 'student'
                              ? 'success'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {acc.role}
                        </Badge>
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-600">{acc.email}</td>
                    <td className="px-5 py-3.5 text-slate-400">{formatDate(acc.created_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(acc)}
                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                        title="Delete account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No accounts found matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Account Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New User Account"
        subtitle="Provision portal credentials for faculty, students, or administrative staff"
      >
        <form onSubmit={handleCreate} autoComplete="off" className="space-y-4">
          <input type="text" name="fake_acc_user_trap" autoComplete="username" className="hidden" tabIndex={-1} />
          <input type="password" name="fake_acc_pass_trap" autoComplete="current-password" className="hidden" tabIndex={-1} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="First name"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Last name"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="new_account_email_address"
              required
              readOnly
              onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="user@gmail.com"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Password
            </label>
            <input
              type="password"
              name="new_account_initial_password"
              required
              readOnly
              onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Temporary password"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            >
              <option value="admin">Administrator</option>
              <option value="registrar">Registrar</option>
              <option value="teacher">Teacher / Faculty</option>
              <option value="student">Student</option>
              <option value="parent">Parent</option>
              <option value="guidance">Guidance Counselor</option>
            </select>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Account Deletion Modal with Required Reason */}
      {deletingAccount && (
        <Modal
          isOpen={!!deletingAccount}
          onClose={() => {
            setDeletingAccount(null);
            setDeleteReasonCategory('');
            setDeleteReasonNotes('');
          }}
          title="Confirm Account Deletion"
          subtitle="A valid reason is required to delete a user account"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1.5">
              <p className="font-bold text-sm text-rose-900">
                Are you sure you want to delete this account?
              </p>
              <p className="leading-relaxed">
                You are about to permanently remove the{' '}
                <strong className="capitalize">{deletingAccount.role}</strong> account for{' '}
                <strong>
                  {`${deletingAccount.first_name || ''} ${deletingAccount.last_name || ''}`.trim() ||
                    deletingAccount.email}
                </strong>{' '}
                (<span className="font-mono">{deletingAccount.email}</span>).
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                Reason for Deletion <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={deleteReasonCategory}
                onChange={(e) => setDeleteReasonCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-800 focus:border-rose-600 focus:bg-white focus:outline-hidden"
              >
                <option value="">— Select Reason for Deletion —</option>
                <option value="Transferred / Left School">Transferred / Left School</option>
                <option value="Resigned / Retired / End of Term">
                  Resigned / Retired / End of Term
                </option>
                <option value="Graduated / Completed Studies">
                  Graduated / Completed Studies
                </option>
                <option value="Duplicate / Erroneous Account">
                  Duplicate / Erroneous Account
                </option>
                <option value="Security / Policy Violation">
                  Security / Policy Violation
                </option>
                <option value="Other (Specify Below)">Other (Specify Below)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                Additional Remarks / Explanation{' '}
                {deleteReasonCategory === 'Other (Specify Below)' && (
                  <span className="text-rose-500">*</span>
                )}
              </label>
              <textarea
                rows={3}
                value={deleteReasonNotes}
                onChange={(e) => setDeleteReasonNotes(e.target.value)}
                placeholder="Enter official reason or remarks for audit log..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs font-medium text-slate-800 focus:border-rose-600 focus:bg-white focus:outline-hidden resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeletingAccount(null);
                  setDeleteReasonCategory('');
                  setDeleteReasonNotes('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  deleteLoading ||
                  !deleteReasonCategory ||
                  (deleteReasonCategory === 'Other (Specify Below)' && !deleteReasonNotes.trim())
                }
                onClick={handleConfirmDeleteAccount}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deleteLoading ? 'Deleting...' : 'Confirm & Delete Account'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
