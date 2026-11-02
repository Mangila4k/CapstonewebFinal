import React, { useState, useEffect, useMemo } from 'react';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import {
  Layers,
  Plus,
  Search,
  Users,
  MapPin,
  UserCheck,
  Edit3,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import type { Section } from '../../types';
import {
  loadCachedSections,
  loadCachedTeachers,
  SECTIONS_CACHE_KEY,
  TEACHERS_CACHE_KEY,
  type FacultyRecord,
} from './AdminTeachersPage';

const GRADE_ORDER = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];

export const AdminSectionsPage: React.FC = () => {
  const [sections, setSections] = useState<Section[]>(loadCachedSections);
  const [teachers, setTeachers] = useState<FacultyRecord[]>(loadCachedTeachers);
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [selectedAdviserName, setSelectedAdviserName] = useState('');
  const [customAdviserName, setCustomAdviserName] = useState('');
  const [editRoom, setEditRoom] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [form, setForm] = useState({
    name: '',
    gradeLevel: 'Grade 7',
    strand: 'STEM',
    adviser: '',
    room: '',
  });

  const syncSectionsAndTeachers = async () => {
    try {
      const [secRes, usersRes, teachRes] = await Promise.all([
        supabase
          .from('sections')
          .select('*')
          .order('grade_level', { ascending: true })
          .order('name', { ascending: true }),
        supabase.from('users').select('*').eq('role', 'teacher'),
        supabase.from('teachers').select('*'),
      ]);

      const cachedSecs = loadCachedSections();
      if (!secRes.error && secRes.data && secRes.data.length > 0) {
        for (const dbSec of secRes.data) {
          if (dbSec.grade_level === 'Grade 7' && dbSec.name === 'Chiong' && dbSec.adviser_name === 'Jherico maurin') {
            dbSec.adviser_name = 'Mrs. Generale';
            dbSec.adviser_id = null;
            supabase.from('sections').update({ adviser_name: 'Mrs. Generale', adviser_id: null }).eq('id', dbSec.id).then(() => {});
          }
          if (dbSec.grade_level === 'Grade 7' && dbSec.name === 'De Gracia' && dbSec.adviser_name === 'Ryan Quiroga') {
            dbSec.adviser_name = 'Mrs. Tapasao';
            dbSec.adviser_id = null;
            supabase.from('sections').update({ adviser_name: 'Mrs. Tapasao', adviser_id: null }).eq('id', dbSec.id).then(() => {});
          }
          if (dbSec.grade_level === 'Grade 7' && dbSec.name === 'Sayson' && !dbSec.adviser_name) {
            dbSec.adviser_name = 'Mrs. Llanda';
            dbSec.adviser_id = null;
            supabase.from('sections').update({ adviser_name: 'Mrs. Llanda', adviser_id: null }).eq('id', dbSec.id).then(() => {});
          }
        }

        const merged = secRes.data.map((dbSec: any) => {
          const localMatch = cachedSecs.find((c) => String(c.id) === String(dbSec.id));
          const resolvedAdviser = localMatch?.adviser_name ?? localMatch?.adviser ?? dbSec.adviser_name ?? null;
          return {
            ...dbSec,
            adviser_name: resolvedAdviser,
            adviser: resolvedAdviser,
            adviser_id: localMatch?.adviser_name ? (localMatch?.adviser_id ?? null) : (dbSec.adviser_id ?? null),
            room: dbSec.room || localMatch?.room || 'Main Academic Bldg',
          };
        });
        setSections(merged);
        localStorage.setItem(SECTIONS_CACHE_KEY, JSON.stringify(merged));
      }

      if (!usersRes.error && usersRes.data) {
        const dbTeachMap = new Map<string, any>();
        if (!teachRes.error && teachRes.data) {
          teachRes.data.forEach((r: any) => {
            if (r.user_id) dbTeachMap.set(String(r.user_id), r);
          });
        }
        const currentTeachers = loadCachedTeachers();
        const map = new Map<string, FacultyRecord>();
        currentTeachers.forEach((t) => map.set(String(t.id), t));

        usersRes.data.forEach((u: any) => {
          const tRow = dbTeachMap.get(String(u.id));
          const existing = map.get(String(u.id));
          map.set(String(u.id), {
            id: String(u.id),
            user_id: String(u.id),
            teacher_table_id: tRow?.id ? String(tRow.id) : existing?.teacher_table_id,
            employee_id:
              tRow?.employee_id ||
              existing?.employee_id ||
              `PLSNHS-TCH-${String(u.id).slice(0, 6).toUpperCase()}`,
            first_name: u.first_name || existing?.first_name || 'Teacher',
            last_name: u.last_name || existing?.last_name || '',
            email: u.email || existing?.email || '',
            specialization: tRow?.specialization || existing?.specialization || 'General Education',
            status: 'Active',
          });
        });

        const updatedTeachers = Array.from(map.values());
        setTeachers(updatedTeachers);
        localStorage.setItem(TEACHERS_CACHE_KEY, JSON.stringify(updatedTeachers));
      }
    } catch (err) {
      console.warn('Error syncing sections:', err);
    }
  };

  useEffect(() => {
    syncSectionsAndTeachers();
  }, []);

  const isSeniorHigh = (gradeLevel: string) =>
    gradeLevel === 'Grade 11' || gradeLevel === 'Grade 12';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setSubmitting(true);

    const isShs = isSeniorHigh(form.gradeLevel);
    const matchedTeacher = teachers.find(
      (t) => `${t.first_name} ${t.last_name}`.trim() === form.adviser.trim()
    );

    try {
      const payload = {
        name: form.name.trim(),
        grade_level: form.gradeLevel,
        strand: isShs ? form.strand : null,
        adviser_name: form.adviser.trim() || null,
        adviser_id: matchedTeacher?.teacher_table_id || null,
        room: form.room.trim() || null,
      };

      const { data: inserted, error } = await supabase
        .from('sections')
        .insert([payload])
        .select()
        .single();

      if (error) throw new Error(error.message);

      const newSec: Section = inserted || {
        id: `sec-${Date.now()}`,
        ...payload,
        adviser: payload.adviser_name,
      };

      const updated = [...sections, newSec];
      setSections(updated);
      localStorage.setItem(SECTIONS_CACHE_KEY, JSON.stringify(updated));

      setNotice({
        type: 'success',
        message: `Section "${form.name}" (${form.gradeLevel}) created with Adviser: ${
          payload.adviser_name || 'Unassigned'
        }.`,
      });
      setIsCreateModalOpen(false);
      setForm({ name: '', gradeLevel: 'Grade 7', strand: 'STEM', adviser: '', room: '' });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to create section' });
    } finally {
      setSubmitting(false);
    }
  };

  const openAssignAdviserModal = (sec: Section) => {
    const currentAdv = (sec.adviser_name || sec.adviser || '').trim();
    const matchesPreset = teachers.some(
      (t) => `${t.first_name} ${t.last_name}`.trim().toLowerCase() === currentAdv.toLowerCase()
    );

    setEditingSection(sec);
    if (!currentAdv) {
      setSelectedAdviserName('');
      setCustomAdviserName('');
    } else if (matchesPreset) {
      const matched = teachers.find(
        (t) => `${t.first_name} ${t.last_name}`.trim().toLowerCase() === currentAdv.toLowerCase()
      );
      setSelectedAdviserName(matched ? `${matched.first_name} ${matched.last_name}`.trim() : currentAdv);
      setCustomAdviserName('');
    } else {
      setSelectedAdviserName('__custom__');
      setCustomAdviserName(currentAdv);
    }
    setEditRoom(sec.room || '');
  };

  const handleSaveAdviser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    setSubmitting(true);
    setNotice(null);

    const finalAdviserName =
      selectedAdviserName === '__custom__'
        ? customAdviserName.trim()
        : selectedAdviserName.trim();

    const matchedTeacher = teachers.find(
      (t) => `${t.first_name} ${t.last_name}`.trim().toLowerCase() === finalAdviserName.toLowerCase()
    );
    const adviserUuid = matchedTeacher?.teacher_table_id || null;

    try {
      const updatedSections = sections.map((sec) =>
        String(sec.id) === String(editingSection.id)
          ? {
              ...sec,
              adviser_name: finalAdviserName || null,
              adviser: finalAdviserName || null,
              adviser_id: adviserUuid,
              room: editRoom.trim() || sec.room || null,
            }
          : sec
      );

      setSections(updatedSections);
      localStorage.setItem(SECTIONS_CACHE_KEY, JSON.stringify(updatedSections));

      // If the user typed a brand-new custom adviser name, add them to the cached teachers list so they also appear in Teachers!
      if (finalAdviserName && !matchedTeacher) {
        const parts = finalAdviserName.split(' ');
        const first = parts[0] || 'Teacher';
        const last = parts.slice(1).join(' ') || '';
        const newFaculty: FacultyRecord = {
          id: `tch-${Date.now()}`,
          employee_id: `PLSNHS-TCH-${Math.floor(100000 + Math.random() * 900000)}`,
          first_name: first,
          last_name: last,
          email: `${(last || first).toLowerCase().replace(/[^a-z0-9]/g, '')}@plsnhs.edu.ph`,
          specialization: 'General Education',
          status: 'Active',
        };
        const nextTeachers = [newFaculty, ...teachers];
        setTeachers(nextTeachers);
        localStorage.setItem(TEACHERS_CACHE_KEY, JSON.stringify(nextTeachers));
      }

      const { error } = await supabase
        .from('sections')
        .update({
          adviser_name: finalAdviserName || null,
          adviser_id: adviserUuid,
          room: editRoom.trim() || null,
        })
        .eq('id', editingSection.id);

      if (error) {
        console.warn('Supabase section update warning:', error.message);
      }

      setNotice({
        type: 'success',
        message: finalAdviserName
          ? `Assigned ${finalAdviserName} as Class Adviser for ${editingSection.grade_level} - Section ${editingSection.name}.`
          : `Unassigned Class Adviser for ${editingSection.grade_level} - Section ${editingSection.name}.`,
      });
      setEditingSection(null);
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Failed to update section adviser.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSections = useMemo(() => {
    return sections.filter((s) => {
      if (gradeFilter !== 'All' && s.grade_level !== gradeFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const name = (s.name || '').toLowerCase();
      const grade = (s.grade_level || '').toLowerCase();
      const strand = (s.strand || '').toLowerCase();
      const adviser = (s.adviser_name || s.adviser || '').toLowerCase();
      return (
        name.includes(q) ||
        grade.includes(q) ||
        strand.includes(q) ||
        adviser.includes(q)
      );
    });
  }, [sections, gradeFilter, search]);

  const groupedByGrade = useMemo(() => {
    return GRADE_ORDER.map((grade) => ({
      grade,
      items: filteredSections
        .filter((s) => s.grade_level === grade)
        .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    })).filter((g) => g.items.length > 0);
  }, [filteredSections]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            Sections & Class Advisers
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Organize Grade 7–12 class sections and assign Teachers / Class Advisers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Create Section
          </button>
          <PageHeaderNotificationSlot />
        </div>
      </div>

      {notice && (
        <Alert
          type={notice.type}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sections by name, grade, or class adviser..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
          />
        </div>

        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 focus:border-emerald-600 focus:outline-hidden"
        >
          <option value="All">All Year Levels (Grades 7–12)</option>
          <option value="Grade 7">Grade 7 (Junior High)</option>
          <option value="Grade 8">Grade 8 (Junior High)</option>
          <option value="Grade 9">Grade 9 (Junior High)</option>
          <option value="Grade 10">Grade 10 (Junior High)</option>
          <option value="Grade 11">Grade 11 (Senior High)</option>
          <option value="Grade 12">Grade 12 (Senior High)</option>
        </select>
      </div>

      {/* Sections Organized by Year Level (Grade 7–12) */}
      {groupedByGrade.length > 0 ? (
        <div className="space-y-8">
          {groupedByGrade.map(({ grade, items }) => {
            const isShs = isSeniorHigh(grade);
            return (
              <div key={grade} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-700 text-white text-xs font-extrabold">
                      {grade.replace('Grade ', '')}
                    </span>
                    <h2 className="text-base font-extrabold text-slate-900">
                      {grade} — {isShs ? 'Senior High School' : 'Junior High School'}
                    </h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {items.length} {items.length === 1 ? 'Section' : 'Sections'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((sec) => {
                    const adviserDisplay = (sec.adviser_name || sec.adviser || '').trim();
                    return (
                      <div
                        key={sec.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-base font-extrabold text-slate-900">
                                Section {sec.name}
                              </h3>
                              <span className="text-xs text-slate-500 font-semibold">
                                {sec.grade_level}
                                {isShs && sec.strand ? ` • ${sec.strand}` : ' • Junior High School'}
                              </span>
                            </div>
                            <Badge variant="emerald" size="sm">
                              Active
                            </Badge>
                          </div>

                          <div className="mt-4 space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                                <span className="text-slate-500 font-medium">Class Adviser:</span>
                              </div>
                              <span
                                className={`font-bold truncate ${
                                  adviserDisplay ? 'text-slate-900' : 'text-amber-600 italic'
                                }`}
                              >
                                {adviserDisplay || 'Unassigned'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
                                <span className="text-slate-500 font-medium">Room Assignment:</span>
                              </div>
                              <span className="font-semibold text-slate-700">
                                {sec.room || 'Academic Building'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                          <button
                            type="button"
                            onClick={() => openAssignAdviserModal(sec)}
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-700 hover:text-white hover:border-emerald-700 transition-all cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Assign / Change Teacher Adviser
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-slate-400">
          No sections found matching your filter.
        </div>
      )}

      {/* Assign / Change Class Adviser Modal */}
      <Modal
        isOpen={Boolean(editingSection)}
        onClose={() => setEditingSection(null)}
        title="Assign Teacher / Class Adviser"
        subtitle={
          editingSection
            ? `${editingSection.grade_level} — Section ${editingSection.name}`
            : ''
        }
      >
        {editingSection && (
          <form onSubmit={handleSaveAdviser} className="space-y-4">
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold text-slate-900">
                  {editingSection.grade_level} • Section {editingSection.name}
                </p>
                <p className="text-xs text-slate-500">
                  Current Adviser:{' '}
                  <span className="font-bold text-emerald-800">
                    {editingSection.adviser_name || editingSection.adviser || 'Unassigned'}
                  </span>
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Select Teacher / Class Adviser
              </label>
              <select
                value={selectedAdviserName}
                onChange={(e) => setSelectedAdviserName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              >
                <option value="">— Unassigned (No Adviser) —</option>
                <optgroup label="PLSNHS Registered Teachers & Advisers">
                  {teachers.map((t) => {
                    const fullName = `${t.first_name} ${t.last_name}`.trim();
                    return (
                      <option key={t.id} value={fullName}>
                        {fullName}
                      </option>
                    );
                  })}
                </optgroup>
                <option value="__custom__">+ Enter Another Teacher / Adviser Name...</option>
              </select>
            </div>

            {selectedAdviserName === '__custom__' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Teacher / Adviser Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customAdviserName}
                  onChange={(e) => setCustomAdviserName(e.target.value)}
                  placeholder="e.g. Mrs. Maria Santos"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Room Number / Building
              </label>
              <input
                type="text"
                value={editRoom}
                onChange={(e) => setEditRoom(e.target.value)}
                placeholder="e.g. Bldg A - Rm 101"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Saving...' : 'Save Adviser Assignment'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create Section Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Class Section"
        subtitle="Add a section for Junior High (Grades 7–10) or Senior High (Grades 11–12) and assign an adviser"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Section Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Rizal or Diamond"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className={isSeniorHigh(form.gradeLevel) ? 'grid grid-cols-2 gap-3' : ''}>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Grade Level
              </label>
              <select
                value={form.gradeLevel}
                onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="Grade 7">Grade 7 (Junior High)</option>
                <option value="Grade 8">Grade 8 (Junior High)</option>
                <option value="Grade 9">Grade 9 (Junior High)</option>
                <option value="Grade 10">Grade 10 (Junior High)</option>
                <option value="Grade 11">Grade 11 (Senior High)</option>
                <option value="Grade 12">Grade 12 (Senior High)</option>
              </select>
            </div>

            {isSeniorHigh(form.gradeLevel) && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Senior High Strand
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
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Assign Class Adviser
              </label>
              <select
                value={form.adviser}
                onChange={(e) => setForm({ ...form, adviser: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="">— Unassigned —</option>
                {teachers.map((t) => {
                  const fullName = `${t.first_name} ${t.last_name}`.trim();
                  return (
                    <option key={t.id} value={fullName}>
                      {fullName}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Room Number
              </label>
              <input
                type="text"
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                placeholder="e.g. Bldg A - Rm 104"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Create Section'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
