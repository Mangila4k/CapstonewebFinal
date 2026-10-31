import React, { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Search, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { Badge } from '../../components/common/Badge';
import { formatDate } from '../../lib/utils';
import type { Violation } from '../../types';

export const GuidanceViolationsPage: React.FC = () => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [form, setForm] = useState({
    studentName: '',
    violationType: 'Uniform / Dress Code Policy',
    severity: 'Minor' as 'Minor' | 'Moderate' | 'Major',
    description: '',
    actionTaken: 'Verbal Warning & Counseling',
  });

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('student_violations')
        .select('*')
        .order('date_reported', { ascending: false });

      if (data && data.length > 0) {
        setViolations(data);
      } else {
        setViolations([
          { id: 1, student_name: 'Carlos Mendoza', violation_type: 'Late Attendance Pattern', severity: 'Minor', description: 'Repeated late arrival during morning flag ceremony.', action_taken: 'Parent notified', status: 'Resolved', date_reported: '2026-10-19' },
          { id: 2, student_name: 'Bryan Garcia', violation_type: 'Campus Dress Code', severity: 'Minor', description: 'Incomplete uniform.', action_taken: 'Verbal reminder', status: 'Resolved', date_reported: '2026-10-12' },
        ]);
      }
    } catch (err) {
      console.warn('Violations error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        student_name: form.studentName.trim(),
        violation_type: form.violationType,
        severity: form.severity,
        description: form.description.trim(),
        action_taken: form.actionTaken.trim(),
        status: 'Under Investigation',
        date_reported: new Date().toISOString(),
      };

      await supabase.from('student_violations').insert([payload]);
      setNotice({ type: 'success', message: 'Incident record filed.' });
      setIsModalOpen(false);
      setForm({ studentName: '', violationType: 'Uniform / Dress Code Policy', severity: 'Minor', description: '', actionTaken: 'Verbal Warning & Counseling' });
      fetchViolations();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to log incident' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 sm:pr-14">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            Student Incident & Behavioral Violations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Log and manage disciplinary cases according to DepEd Child Protection & School Conduct Policies.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Log Incident
        </button>
      </div>

      {notice && (
        <Alert
          type={notice.type}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-5 py-3">Student Involved</th>
              <th className="px-5 py-3">Violation Type</th>
              <th className="px-5 py-3">Severity</th>
              <th className="px-5 py-3">Action Taken</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {violations.map((v) => (
              <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5 font-bold text-slate-900">{v.student_name}</td>
                <td className="px-5 py-3.5 font-medium text-slate-700">{v.violation_type}</td>
                <td className="px-5 py-3.5">
                  <Badge variant={v.severity === 'Major' ? 'danger' : 'warning'} size="sm">
                    {v.severity}
                  </Badge>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{v.action_taken || 'Counseling'}</td>
                <td className="px-5 py-3.5 text-slate-400">{formatDate(v.date_reported)}</td>
                <td className="px-5 py-3.5 text-right">
                  <Badge variant="neutral" size="sm">{v.status || 'Resolved'}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Log Disciplinary Incident"
        subtitle="Record behavioral infraction for guidance review"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Student Full Name
            </label>
            <input
              type="text"
              required
              value={form.studentName}
              onChange={(e) => setForm({ ...form, studentName: e.target.value })}
              placeholder="e.g. Juan Dela Cruz"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Violation Type
              </label>
              <input
                type="text"
                required
                value={form.violationType}
                onChange={(e) => setForm({ ...form, violationType: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Severity Level
              </label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value as any })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="Minor">Minor</option>
                <option value="Moderate">Moderate</option>
                <option value="Major">Major</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Incident Narrative / Description
            </label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
            />
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
              className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
            >
              Log Incident
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
