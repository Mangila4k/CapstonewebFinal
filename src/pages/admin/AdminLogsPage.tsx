import React, { useState, useEffect } from 'react';
import { FileText, Search, Clock, User, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDateTime } from '../../lib/utils';
import { Badge } from '../../components/common/Badge';
import type { ActivityLog } from '../../types';

export const AdminLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          setLogs(data);
        }
      } catch (err) {
        console.warn('Error fetching logs:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, []);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    const action = (l.action || '').toLowerCase();
    const email = (l.user_email || '').toLowerCase();
    const details = (l.details || '').toLowerCase();
    return action.includes(q) || email.includes(q) || details.includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 sm:pr-14">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            System Activity Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Chronological records of user authentications, enrollment approvals, and administrative actions.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search log by action or user..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Action Type</th>
                <th className="px-5 py-3">User & Role</th>
                <th className="px-5 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-2"></div>
                    <p>Loading activity logs...</p>
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-slate-500 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-900">{log.action}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">{log.user_email}</div>
                      <Badge variant="neutral" size="sm" className="mt-0.5">
                        {log.user_role || 'User'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{log.details || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    No activity logs recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
