import React, { useState, useEffect, useMemo } from 'react';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import {
  BookOpen,
  Search,
  Filter,
  Plus,
  Edit3,
  Trash2,
  Layers,
  GraduationCap,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import type { Subject } from '../../types';

interface SubjectFormData {
  code: string;
  name: string;
  grade_level: string;
  strand: string;
  subject_type: 'Core' | 'Applied' | 'Specialized';
  semester: string;
  description: string;
}

const defaultFormData: SubjectFormData = {
  code: '',
  name: '',
  grade_level: '11',
  strand: 'TVL-ICT',
  subject_type: 'Core',
  semester: '1st Semester',
  description: '',
};

const YEAR_LEVELS = [
  { key: '7', label: 'Grade 7', level: 'JHS', title: 'Grade 7 · Junior High School', badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { key: '8', label: 'Grade 8', level: 'JHS', title: 'Grade 8 · Junior High School', badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { key: '9', label: 'Grade 9', level: 'JHS', title: 'Grade 9 · Junior High School', badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { key: '10', label: 'Grade 10', level: 'JHS', title: 'Grade 10 · Junior High School', badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { key: '11', label: 'Grade 11', level: 'SHS', title: 'Grade 11 · Senior High School', badgeColor: 'bg-blue-50 text-blue-800 border-blue-200' },
  { key: '12', label: 'Grade 12', level: 'SHS', title: 'Grade 12 · Senior High School', badgeColor: 'bg-purple-50 text-purple-800 border-purple-200' },
];

export const AdminSubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Year Level Filter Tab: 'all' | '7' | '8' | '9' | '10' | '11' | '12'
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [strandFilter, setStrandFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [semesterFilter, setSemesterFilter] = useState<'All' | '1st Semester' | '2nd Semester'>('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState<SubjectFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation State
  const [deletingSubject, setDeletingSubject] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch all curriculum subjects
  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw error;
      setSubjects(data || []);
    } catch (err: any) {
      console.warn('Error fetching subjects:', err);
      setNotice({ type: 'error', message: err.message || 'Failed to fetch curriculum subjects' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  // Compute year level counts & stats
  const stats = useMemo(() => {
    const total = subjects.length;
    const countByYear: Record<string, number> = {
      '7': 0,
      '8': 0,
      '9': 0,
      '10': 0,
      '11': 0,
      '12': 0,
    };

    subjects.forEach((s) => {
      const g = (s.grade_level || '').replace('Grade ', '').trim();
      if (countByYear[g] !== undefined) {
        countByYear[g]++;
      }
    });

    const jhsTotal = countByYear['7'] + countByYear['8'] + countByYear['9'] + countByYear['10'];
    const shsTotal = countByYear['11'] + countByYear['12'];

    const shsSemStats = {
      '11': {
        sem1: subjects.filter((s) => (s.grade_level || '').replace('Grade ', '').trim() === '11' && s.semester === '1st Semester').length,
        sem2: subjects.filter((s) => (s.grade_level || '').replace('Grade ', '').trim() === '11' && s.semester === '2nd Semester').length,
      },
      '12': {
        sem1: subjects.filter((s) => (s.grade_level || '').replace('Grade ', '').trim() === '12' && s.semester === '1st Semester').length,
        sem2: subjects.filter((s) => (s.grade_level || '').replace('Grade ', '').trim() === '12' && s.semester === '2nd Semester').length,
      },
    };

    return { total, countByYear, jhsTotal, shsTotal, shsSemStats };
  }, [subjects]);

  // Filtered Subject List
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const g = (s.grade_level || '').replace('Grade ', '').trim();
      const isSHS = g === '11' || g === '12';

      // Year Level Filter check
      if (selectedYear !== 'all' && g !== selectedYear) {
        return false;
      }

      // Semester Filter check (applies to SHS)
      if (semesterFilter !== 'All') {
        if (isSHS) {
          if (s.semester !== semesterFilter) return false;
        }
      }

      // Strand Filter check
      if (strandFilter !== 'All') {
        if (strandFilter === 'None') {
          if (s.strand) return false;
        } else if (s.strand !== strandFilter) {
          return false;
        }
      }

      // Type Filter check
      if (typeFilter !== 'All' && s.subject_type !== typeFilter) {
        return false;
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const code = (s.code || '').toLowerCase();
        const name = (s.name || s.title || '').toLowerCase();
        const strand = (s.strand || '').toLowerCase();
        const type = (s.subject_type || '').toLowerCase();
        const sem = (s.semester || '').toLowerCase();
        return code.includes(q) || name.includes(q) || strand.includes(q) || type.includes(q) || sem.includes(q);
      }

      return true;
    });
  }, [subjects, selectedYear, semesterFilter, strandFilter, typeFilter, search]);

  // Group filtered subjects by Year Level
  const groupedByYear = useMemo(() => {
    const groups: { [key: string]: Subject[] } = {
      '7': [],
      '8': [],
      '9': [],
      '10': [],
      '11': [],
      '12': [],
    };

    filteredSubjects.forEach((s) => {
      const g = (s.grade_level || '').replace('Grade ', '').trim();
      if (groups[g]) {
        groups[g].push(s);
      } else {
        if (!groups['other']) groups['other'] = [];
        groups['other'].push(s);
      }
    });

    return groups;
  }, [filteredSubjects]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingSubject(null);
    const initialGrade = selectedYear !== 'all' ? selectedYear : '11';
    const isJHS = ['7', '8', '9', '10'].includes(initialGrade);
    setFormData({
      ...defaultFormData,
      grade_level: initialGrade,
      strand: isJHS ? 'none' : 'TVL-ICT',
      semester: isJHS ? 'Full Year' : semesterFilter !== 'All' ? semesterFilter : '1st Semester',
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (subject: Subject) => {
    setEditingSubject(subject);
    const g = (subject.grade_level || '').replace('Grade ', '').trim();
    setFormData({
      code: subject.code || '',
      name: subject.name || subject.title || '',
      grade_level: g || '11',
      strand: subject.strand || 'none',
      subject_type: (subject.subject_type as any) || 'Core',
      semester: subject.semester || (['7', '8', '9', '10'].includes(g) ? 'Full Year' : '1st Semester'),
      description: subject.description || '',
    });
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) {
      setNotice({ type: 'warning', message: 'Subject Code and Subject Title are required.' });
      return;
    }

    setSubmitting(true);
    try {
      const g = formData.grade_level.replace('Grade ', '').trim();
      const isJHS = ['7', '8', '9', '10'].includes(g);

      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        grade_level: g,
        strand: formData.strand === 'none' || isJHS ? null : formData.strand,
        subject_type: formData.subject_type,
        semester: isJHS || formData.semester === 'Full Year' ? null : formData.semester,
        description: formData.description.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (editingSubject) {
        const { error } = await supabase
          .from('subjects')
          .update(payload)
          .eq('id', editingSubject.id);

        if (error) throw error;
        setNotice({ type: 'success', message: `Subject "${payload.code}" updated successfully.` });
      } else {
        const { error } = await supabase
          .from('subjects')
          .insert([payload]);

        if (error) throw error;
        setNotice({ type: 'success', message: `Subject "${payload.code}" added to the official curriculum.` });
      }

      setIsModalOpen(false);
      setEditingSubject(null);
      fetchSubjects();
    } catch (err: any) {
      console.error('Error saving subject:', err);
      setNotice({ type: 'error', message: err.message || 'Failed to save subject' });
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Subject
  const handleDelete = async () => {
    if (!deletingSubject) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', deletingSubject.id);

      if (error) {
        if (error.code === '23503') {
          throw new Error('Cannot delete this subject because it is linked to existing student grades or schedules.');
        }
        throw error;
      }

      setNotice({ type: 'success', message: `Subject "${deletingSubject.code}" removed from curriculum.` });
      setDeletingSubject(null);
      fetchSubjects();
    } catch (err: any) {
      console.error('Error deleting subject:', err);
      setNotice({ type: 'error', message: err.message || 'Failed to delete subject' });
    } finally {
      setDeleting(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setSelectedYear('all');
    setStrandFilter('All');
    setTypeFilter('All');
    setSemesterFilter('All');
  };

  // Active Year Levels to render
  const activeYearSections = useMemo(() => {
    if (selectedYear === 'all') {
      return YEAR_LEVELS;
    }
    return YEAR_LEVELS.filter((yl) => yl.key === selectedYear);
  }, [selectedYear]);

  // Reusable Subject Table Rows Renderer
  const renderSubjectTable = (subjectList: Subject[], yl: (typeof YEAR_LEVELS)[0]) => {
    const isSHS = yl.level === 'SHS';

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-white border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
            <tr>
              <th className="px-5 py-2.5 w-36">Subject Code</th>
              <th className="px-5 py-2.5">Subject Title & Classification</th>
              <th className="px-5 py-2.5 w-48">Year & Strand</th>
              <th className="px-5 py-2.5 w-44">Semester / Term</th>
              <th className="px-5 py-2.5 text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subjectList.map((s) => {
              const subjectTitle = s.name || s.title || 'Untitled Subject';

              // Classification badge color
              const type = s.subject_type || 'Core';
              const typeColors =
                type === 'Specialized'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : type === 'Applied'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200';

              return (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Code */}
                  <td className="px-5 py-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-800 text-[11px]">
                      {s.code}
                    </span>
                  </td>

                  {/* Title & Classification */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-[13px] leading-snug">
                        {subjectTitle}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeColors}`}>
                        {type}
                      </span>
                    </div>
                    {s.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{s.description}</p>
                    )}
                  </td>

                  {/* Year Level & Strand */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-700">
                        Grade {yl.key}
                      </span>
                      {s.strand ? (
                        <span className="rounded-md bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 font-bold text-[10px] text-indigo-700">
                          {s.strand}
                        </span>
                      ) : (
                        <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 font-semibold text-[10px] text-slate-600">
                          {isSHS ? 'General' : 'DepEd Core'}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Semester / Academic Period */}
                  <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                    {isSHS ? (
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{s.semester || '1st Semester'}</span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium text-[11px]">
                        Full Year · Quarters 1–4
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(s)}
                        title="Edit Subject"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingSubject(s)}
                        title="Delete Subject"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* HEADER SECTION */}
      <div className="border-b border-slate-200 pb-4 sm:pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-display tracking-tight leading-snug">
                Curriculum Subjects by Year Level &amp; Semester
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Sparkles className="h-3 w-3 text-emerald-600" /> DepEd K–12 Aligned
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Official masterlist of Core, Applied, and Specialized learning areas categorized by educational year level, with Senior High School organized by academic semester.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-auto pt-0.5">
            <button
              onClick={handleOpenAdd}
              className="hidden sm:inline-flex h-10 items-center gap-2 rounded-xl bg-[#1a225a] hover:bg-[#25327d] px-4 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Subject</span>
            </button>
            <PageHeaderNotificationSlot />
          </div>
        </div>

        {/* Mobile Action Button Row */}
        <div className="sm:hidden mt-3 flex items-center">
          <button
            onClick={handleOpenAdd}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#1a225a] hover:bg-[#25327d] px-3.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Subject</span>
          </button>
        </div>
      </div>

      {/* NOTICE ALERT */}
      {notice && (
        <Alert
          type={notice.type}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}


      {/* YEAR LEVEL TABS (HORIZONTAL PILL SELECTOR) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-slate-200 shadow-xs overflow-x-auto">
          <button
            onClick={() => setSelectedYear('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedYear === 'all'
                ? 'bg-[#1a225a] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>All Year Levels</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
              selectedYear === 'all' ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'
            }`}>
              {stats.total}
            </span>
          </button>

          {YEAR_LEVELS.map((yl) => {
            const count = stats.countByYear[yl.key] || 0;
            const isSelected = selectedYear === yl.key;
            return (
              <button
                key={yl.key}
                onClick={() => setSelectedYear(yl.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[#1a225a] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{yl.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 font-semibold px-1 text-right">
          Showing <span className="font-bold text-slate-900">{filteredSubjects.length}</span> of {subjects.length} subjects
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code (e.g. APP-1), title, or strand..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#1a225a] focus:bg-white focus:outline-hidden transition-all"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Semester Filter (Especially for SHS) */}
          {(selectedYear === 'all' || selectedYear === '11' || selectedYear === '12') && (
            <div className="relative">
              <select
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value as any)}
                className="appearance-none rounded-xl border border-slate-200 bg-slate-50/80 pl-3 pr-8 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100/70 focus:border-[#1a225a] focus:bg-white focus:outline-hidden cursor-pointer transition-colors"
              >
                <option value="All">All Semesters</option>
                <option value="1st Semester">1st Semester Only</option>
                <option value="2nd Semester">2nd Semester Only</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
          )}

          {/* Strand Filter */}
          <div className="relative">
            <select
              value={strandFilter}
              onChange={(e) => setStrandFilter(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-slate-50/80 pl-3 pr-8 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100/70 focus:border-[#1a225a] focus:bg-white focus:outline-hidden cursor-pointer transition-colors"
            >
              <option value="All">All Strands</option>
              <option value="TVL-ICT">TVL-ICT Track</option>
              <option value="STEM">STEM Strand</option>
              <option value="HUMSS">HUMSS Strand</option>
              <option value="GAS">GAS Strand</option>
              <option value="None">Non-Strand / JHS Core</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Classification Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-slate-50/80 pl-3 pr-8 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100/70 focus:border-[#1a225a] focus:bg-white focus:outline-hidden cursor-pointer transition-colors"
            >
              <option value="All">All Classifications</option>
              <option value="Core">Core Curriculum</option>
              <option value="Applied">Applied Track</option>
              <option value="Specialized">Specialized Track</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Reset Filters button if any active */}
          {(search || strandFilter !== 'All' || typeFilter !== 'All' || semesterFilter !== 'All' || selectedYear !== 'all') && (
            <button
              onClick={handleResetFilters}
              title="Reset all filters"
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* TABLES GROUPED BY YEAR LEVEL & SEMESTER */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center text-slate-400 shadow-xs">
          <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-[#1a225a] border-t-transparent mb-2"></div>
          <p className="font-semibold text-slate-600 text-xs">Loading curriculum subjects...</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center text-slate-400 shadow-xs">
          <BookOpen className="h-8 w-8 mx-auto text-slate-300 mb-2" />
          <p className="font-bold text-slate-700 text-sm">No curriculum subjects found</p>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search terms, semester selection, or year level.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#1a225a] hover:underline"
          >
            <RotateCcw className="h-3 w-3" /> Reset all filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeYearSections.map((yl) => {
            const list = groupedByYear[yl.key] || [];
            if (list.length === 0) return null;

            const isSHS = yl.level === 'SHS';
            const firstSemList = list.filter((s) => s.semester === '1st Semester');
            const secondSemList = list.filter((s) => s.semester === '2nd Semester');
            const otherList = list.filter((s) => s.semester !== '1st Semester' && s.semester !== '2nd Semester');

            return (
              <div key={yl.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                {/* Year Level Main Header */}
                <div className="bg-slate-50/90 border-b border-slate-200 px-5 py-3.5 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-[#1a225a] text-white flex items-center justify-center font-bold text-xs">
                      {yl.key}
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-slate-900 font-display">
                        {yl.title}
                      </h2>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {isSHS
                          ? 'Senior High Academic & TVL Specializations (Organized by Semester)'
                          : 'Junior High DepEd Standard Full-Year Curriculum'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isSHS && (
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 mr-2">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                          1st Sem: {firstSemList.length}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                          2nd Sem: {secondSemList.length}
                        </span>
                      </div>
                    )}
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      {list.length} {list.length === 1 ? 'Subject' : 'Subjects'}
                    </span>
                  </div>
                </div>

                {/* For SHS: Subdivided by Semester */}
                {isSHS ? (
                  <div className="divide-y divide-slate-200">
                    {/* 1st Semester Section */}
                    {(semesterFilter === 'All' || semesterFilter === '1st Semester') && (
                      <div>
                        <div className="bg-gradient-to-r from-blue-50/80 via-blue-50/30 to-white px-5 py-2.5 flex items-center justify-between border-b border-blue-100">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                            <span className="font-extrabold text-xs text-blue-950 uppercase tracking-wider">
                              1st Semester Subjects
                            </span>
                            <span className="text-[11px] text-blue-700 font-semibold">· Academic Term 1</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white border border-blue-200 text-blue-900 shadow-2xs">
                            {firstSemList.length} {firstSemList.length === 1 ? 'Subject' : 'Subjects'}
                          </span>
                        </div>
                        {firstSemList.length > 0 ? (
                          renderSubjectTable(firstSemList, yl)
                        ) : (
                          <div className="py-6 text-center text-xs text-slate-400">
                            No 1st Semester subjects found for the selected filters.
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2nd Semester Section */}
                    {(semesterFilter === 'All' || semesterFilter === '2nd Semester') && (
                      <div>
                        <div className="bg-gradient-to-r from-purple-50/80 via-purple-50/30 to-white px-5 py-2.5 flex items-center justify-between border-b border-purple-100">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-purple-600"></span>
                            <span className="font-extrabold text-xs text-purple-950 uppercase tracking-wider">
                              2nd Semester Subjects
                            </span>
                            <span className="text-[11px] text-purple-700 font-semibold">· Academic Term 2</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white border border-purple-200 text-purple-900 shadow-2xs">
                            {secondSemList.length} {secondSemList.length === 1 ? 'Subject' : 'Subjects'}
                          </span>
                        </div>
                        {secondSemList.length > 0 ? (
                          renderSubjectTable(secondSemList, yl)
                        ) : (
                          <div className="py-6 text-center text-xs text-slate-400">
                            No 2nd Semester subjects found for the selected filters.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Any unassigned / other semester items if exist */}
                    {otherList.length > 0 && semesterFilter === 'All' && (
                      <div>
                        <div className="bg-slate-100 px-5 py-2 flex items-center justify-between border-b border-slate-200">
                          <span className="font-bold text-xs text-slate-700">Other / Year-Round Subjects</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-700">
                            {otherList.length} Subjects
                          </span>
                        </div>
                        {renderSubjectTable(otherList, yl)}
                      </div>
                    )}
                  </div>
                ) : (
                  // Junior High School Table (Full-year)
                  renderSubjectTable(list, yl)
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT SUBJECT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingSubject ? 'Edit Curriculum Subject' : 'Add New Curriculum Subject'}
        subtitle="Manage course code, descriptive title, year level, and track specialization"
        maxWidth="lg"
      >
        <form onSubmit={handleSave} className="space-y-4 pt-1">
          {/* Code & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Subject Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. CORE-18"
                className="w-full font-mono uppercase rounded-xl border border-slate-300 bg-slate-50/80 px-3 py-2 text-xs text-slate-900 focus:border-[#1a225a] focus:bg-white focus:outline-hidden"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Descriptive Subject Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Oral Communication in Context"
                className="w-full rounded-xl border border-slate-300 bg-slate-50/80 px-3 py-2 text-xs text-slate-900 focus:border-[#1a225a] focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Year Level & Classification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Year Level
              </label>
              <select
                value={formData.grade_level}
                onChange={(e) => {
                  const newGrade = e.target.value;
                  const isJHS = ['7', '8', '9', '10'].includes(newGrade);
                  setFormData({
                    ...formData,
                    grade_level: newGrade,
                    strand: isJHS ? 'none' : formData.strand === 'none' ? 'TVL-ICT' : formData.strand,
                    semester: isJHS ? 'Full Year' : formData.semester === 'Full Year' ? '1st Semester' : formData.semester,
                  });
                }}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/80 px-3 py-2 text-xs text-slate-800 font-semibold focus:border-[#1a225a] focus:bg-white focus:outline-hidden"
              >
                <optgroup label="Junior High School (JHS)">
                  <option value="7">Grade 7</option>
                  <option value="8">Grade 8</option>
                  <option value="9">Grade 9</option>
                  <option value="10">Grade 10</option>
                </optgroup>
                <optgroup label="Senior High School (SHS)">
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Subject Classification
              </label>
              <select
                value={formData.subject_type}
                onChange={(e) => setFormData({ ...formData, subject_type: e.target.value as any })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/80 px-3 py-2 text-xs text-slate-800 font-semibold focus:border-[#1a225a] focus:bg-white focus:outline-hidden"
              >
                <option value="Core">Core Curriculum</option>
                <option value="Applied">Track Applied Subject</option>
                <option value="Specialized">Track Specialized Subject</option>
              </select>
            </div>
          </div>

          {/* Strand & Semester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Track / Strand Specialization
              </label>
              <select
                disabled={['7', '8', '9', '10'].includes(formData.grade_level)}
                value={['7', '8', '9', '10'].includes(formData.grade_level) ? 'none' : formData.strand}
                onChange={(e) => setFormData({ ...formData, strand: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50/80 px-3 py-2 text-xs text-slate-800 font-semibold focus:border-[#1a225a] focus:bg-white focus:outline-hidden disabled:opacity-60"
              >
                <option value="none">None / Common to All (Core)</option>
                <option value="TVL-ICT">TVL - ICT Track</option>
                <option value="STEM">Academic - STEM Strand</option>
                <option value="HUMSS">Academic - HUMSS Strand</option>
                <option value="GAS">Academic - GAS Strand</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Semester / Term
              </label>
              {['7', '8', '9', '10'].includes(formData.grade_level) ? (
                <input
                  type="text"
                  disabled
                  value="Full Academic Year (4 Quarters)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500 font-medium cursor-not-allowed"
                />
              ) : (
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/80 px-3 py-2 text-xs text-slate-800 font-semibold focus:border-[#1a225a] focus:bg-white focus:outline-hidden"
                >
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                </select>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Brief Scope / Learning Description (Optional)
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Focus on technical computer servicing and hardware maintenance"
              className="w-full rounded-xl border border-slate-300 bg-slate-50/80 px-3 py-2 text-xs text-slate-900 focus:border-[#1a225a] focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#1a225a] hover:bg-[#25327d] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
            >
              {submitting && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              <span>{editingSubject ? 'Update Subject' : 'Save Subject'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deletingSubject}
        onClose={() => !deleting && setDeletingSubject(null)}
        title="Confirm Delete Curriculum Subject"
        subtitle="This action permanently removes this learning area from the course directory"
        maxWidth="md"
      >
        {deletingSubject && (
          <div className="space-y-4 pt-1">
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-900 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Are you sure you want to delete this subject?</p>
                <div className="mt-2 font-mono font-bold text-slate-900 bg-white/80 p-2 rounded-lg border border-rose-200">
                  {deletingSubject.code} — {deletingSubject.name || deletingSubject.title}
                </div>
                <p className="text-[11px] text-rose-700 mt-2">
                  Warning: If any student grades or class schedules are linked to this subject, deletion will be blocked by system integrity checks.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeletingSubject(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
              >
                {deleting && <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                <span>Delete Subject</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
