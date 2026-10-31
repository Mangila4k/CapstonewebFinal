import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Filter, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import type { Subject } from '../../types';

export const AdminSubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState('');
  const [strandFilter, setStrandFilter] = useState('All');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [form, setForm] = useState({
    code: '',
    title: '',
    gradeLevel: 'Grade 11',
    strand: 'STEM',
    semester: '1st Semester',
    units: 3,
  });

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      let query = supabase.from('subjects').select('*').order('code', { ascending: true });
      if (strandFilter !== 'All') {
        query = query.eq('strand', strandFilter);
      }
      if (gradeFilter !== 'All') {
        query = query.eq('grade_level', gradeFilter);
      }
      const { data, error } = await query;
      if (!error && data) {
        setSubjects(data);
      }
    } catch (err) {
      console.warn('Error fetching subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [strandFilter, gradeFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        title: form.title.trim(),
        grade_level: form.gradeLevel,
        strand: form.strand,
        semester: form.semester,
        units: Number(form.units) || 3,
      };

      const { error } = await supabase.from('subjects').insert([payload]);
      if (error) throw new Error(error.message);

      setNotice({ type: 'success', message: `Subject "${form.code}" registered.` });
      setIsModalOpen(false);
      setForm({ code: '', title: '', gradeLevel: 'Grade 11', strand: 'STEM', semester: '1st Semester', units: 3 });
      fetchSubjects();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to add subject' });
    }
  };

  const filtered = subjects.filter((sub) => {
    const q = search.toLowerCase();
    const code = (sub.code || '').toLowerCase();
    const title = (sub.title || '').toLowerCase();
    return code.includes(q) || title.includes(q);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 sm:pr-14">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            Senior High Curriculum Subjects
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Core, applied, and specialized subjects defined for Placido L. Señor NHS senior high tracks.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Subject
        </button>
      </div>

      {notice && (
        <Alert
          type={notice.type}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subject title or code..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:outline-hidden"
          >
            <option value="All">All Grades</option>
            <option value="Grade 11">Grade 11</option>
            <option value="Grade 12">Grade 12</option>
          </select>

          <select
            value={strandFilter}
            onChange={(e) => setStrandFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:outline-hidden"
          >
            <option value="All">All Strands</option>
            <option value="STEM">STEM</option>
            <option value="HUMSS">HUMSS</option>
            <option value="GAS">GAS</option>
            <option value="TVL">TVL</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Subject Code</th>
                <th className="px-5 py-3">Subject Title</th>
                <th className="px-5 py-3">Grade & Strand</th>
                <th className="px-5 py-3">Semester</th>
                <th className="px-5 py-3 text-right">Credit Units</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-2"></div>
                    <p>Loading subjects...</p>
                  </td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-emerald-800">
                      {s.code}
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-900">{s.title}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-semibold text-slate-700">{s.grade_level}</span>
                      <span className="ml-2 rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800">
                        {s.strand}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{s.semester || '1st Semester'}</td>
                    <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-800">
                      {s.units || 3}.0
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No subjects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Subject Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Curriculum Subject"
        subtitle="Register a core, applied, or specialized Senior High course"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Subject Code
              </label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. PRE-CALC"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Units
              </label>
              <input
                type="number"
                min={1}
                max={5}
                required
                value={form.units}
                onChange={(e) => setForm({ ...form, units: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Descriptive Title
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Pre-Calculus for STEM"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Grade Level
              </label>
              <select
                value={form.gradeLevel}
                onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Strand
              </label>
              <select
                value={form.strand}
                onChange={(e) => setForm({ ...form, strand: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="STEM">STEM</option>
                <option value="HUMSS">HUMSS</option>
                <option value="GAS">GAS</option>
                <option value="TVL">TVL</option>
              </select>
            </div>
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
              Save Subject
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
