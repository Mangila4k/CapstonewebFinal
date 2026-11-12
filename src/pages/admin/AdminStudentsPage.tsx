import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Layers,
  Search,
  Filter,
  Eye,
  Phone,
  Mail,
  MapPin,
  Check,
  Edit2,
  AlertCircle,
  Users,
  CheckSquare,
  Square,
  RotateCw,
  Sparkles,
  School,
  ChevronRight,
  BookOpen,
  ArrowRightLeft,
  ChevronDown,
  CreditCard,
  Printer,
  Download,
  Trash2,
  ExternalLink,
  Copy,
  Send,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/common/Badge';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { StudentIdCard } from '../../components/common/StudentIdCard';
import { printOfficialStudentId } from '../../lib/printIdCard';
import { sendStudentApprovalEmail } from '../../lib/enrollmentEmailService';
import type { Student, Section } from '../../types';

// Standard Grade Levels in PLSNHS
const ALL_GRADES = [
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
];

// Default fallback sections per grade level matching Supabase sections table
const DEFAULT_SECTIONS_BY_GRADE: Record<string, string[]> = {
  'Grade 7': ['Chiong', 'De Gracia', 'Mendiola', 'Mendoza', 'Paul Ong', 'Quirante', 'Sayson'],
  'Grade 8': ['Antipolo', 'Banaba', 'Kamagong', 'Mahogany', 'Molave', 'Narra', 'Square', 'Yakal'],
  'Grade 9': ['Batangas', 'Cebu', 'Davao', 'Ilo-Ilo', 'Negros Occidental', 'Palawan', 'Rizal'],
  'Grade 10': ['Generosity', 'Honesty', 'Kindness', 'Perseverance', 'Wisdom'],
  'Grade 11': ['Almario', 'Amorsolo', 'Baltazar', 'Tolentino'],
  'Grade 12': ['Salcedo', 'Santos', 'Velasco', 'Velasquez'],
};

const STUDENTS_CACHE_KEY = 'plsnhs_students_cache_v1';
const SECTIONS_CACHE_KEY = 'plsnhs_sections_cache_v1';

const FALLBACK_INITIAL_STUDENTS: Student[] = [
  {
    id: 'a5501da6-29b8-41ab-b76c-010baa1b32c0',
    first_name: 'Shel Mae',
    last_name: 'Mandanat',
    lrn: '119518160016',
    email: 'shelmae.mandanat.119518160016@gmail.com',
    grade_level: 'Grade 10',
    section: 'Wisdom',
    strand: '',
    status: 'Enrolled',
  },
  {
    id: '1d5b281e-75c4-498d-a87c-2c6c8479ab13',
    first_name: 'Kim Agustine',
    last_name: 'Zamoro',
    lrn: '119518160103',
    email: 'kimagustine.zamoro.119518160103@gmail.com',
    grade_level: 'Grade 10',
    section: 'Wisdom',
    strand: '',
    status: 'Enrolled',
  },
  {
    id: '55198291-2d8d-44ae-adbe-79cd27886a4c',
    first_name: 'Ceaska Antonette',
    last_name: 'Torion',
    lrn: '500312160031',
    email: 'ceaskaantonette.torion.500312160031@gmail.com',
    grade_level: 'Grade 10',
    section: 'Wisdom',
    strand: '',
    status: 'Enrolled',
  },
  {
    id: 'fe030d14-113f-40d7-94ba-58b7cff61d20',
    first_name: 'Angel Mae',
    last_name: 'Tampus',
    lrn: '119236160064',
    email: 'angelmae.tampus.119236160064@gmail.com',
    grade_level: 'Grade 10',
    section: 'Wisdom',
    strand: '',
    status: 'Enrolled',
  },
  {
    id: 'e915ce00-afed-4253-877a-1966179a15ea',
    first_name: 'Dian Faith',
    last_name: 'Selim',
    lrn: '119518160086',
    email: 'dianfaith.selim.119518160086@gmail.com',
    grade_level: 'Grade 10',
    section: 'Wisdom',
    strand: '',
    status: 'Enrolled',
  },
];

function loadCachedStudents(): Student[] {
  try {
    const raw = localStorage.getItem(STUDENTS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return FALLBACK_INITIAL_STUDENTS;
}

function loadCachedSections(): Section[] {
  try {
    const raw = localStorage.getItem(SECTIONS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export const AdminStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(loadCachedStudents);
  const [sections, setSections] = useState<Section[]>(loadCachedSections);
  const [loading] = useState(false);

  // View Mode: 'list' (Table View) | 'grade' (By Grade Level) | 'section' (By Section)
  const [viewMode, setViewMode] = useState<'list' | 'grade' | 'section'>('list');

  // Filters
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [strandFilter, setStrandFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Selected student for details modal
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Quick Section Assign Modal State
  const [assigningStudent, setAssigningStudent] = useState<Student | null>(null);
  const [targetSection, setTargetSection] = useState('');
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Batch Selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string | number>>(new Set());
  const [batchSection, setBatchSection] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);

  // Alerts
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const navigate = useNavigate();

  // Active Dropdown tracking
  const [activeDropdownId, setActiveDropdownId] = useState<string | number | null>(null);

  // Generate ID Modal State
  const [generatingIdStudent, setGeneratingIdStudent] = useState<Student | null>(null);
  const [idCardSide, setIdCardSide] = useState<'both' | 'front' | 'back'>('both');
  const [idCardFlipped, setIdCardFlipped] = useState(false);
  const [idDownloading, setIdDownloading] = useState(false);

  // Edit Student Modal State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Student>>({});
  const [editLoading, setEditLoading] = useState(false);

  // Delete Student Modal State
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [deleteReasonCategory, setDeleteReasonCategory] = useState('');
  const [deleteReasonNotes, setDeleteReasonNotes] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Send to Gmail Modal State
  const [gmailStudent, setGmailStudent] = useState<Student | null>(null);
  const [gmailCopied, setGmailCopied] = useState(false);
  const [gmailSending, setGmailSending] = useState(false);
  const [gmailSentStatus, setGmailSentStatus] = useState<string | null>(null);

  // Handlers for Manage actions
  const handleOpenEditModal = (student: Student) => {
    setEditingStudent(student);
    setEditFormData({
      first_name: student.first_name || '',
      middle_name: student.middle_name || '',
      last_name: student.last_name || '',
      lrn: student.lrn || '',
      grade_level: student.grade_level || 'Grade 10',
      section: student.section || 'Unassigned',
      strand: student.strand || '',
      gender: student.gender || 'Male',
      status: student.status || 'Enrolled',
      email: student.email || '',
      contact_number: student.contact_number || '',
      address: student.address || '',
      guardian_name: student.guardian_name || '',
      guardian_contact: student.guardian_contact || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    setEditLoading(true);
    try {
      const isTransfer = editFormData.status === 'Transferred';
      const finalSection = isTransfer ? 'Unassigned' : (editFormData.section || 'Unassigned');
      const matchedSection = sections.find(
        (s) => s.name.toLowerCase() === finalSection.toLowerCase()
      );
      const resolvedSectionId =
        isTransfer || finalSection === 'Unassigned' ? null : matchedSection?.id || null;

      const updatePayload: any = {
        first_name: editFormData.first_name,
        middle_name: editFormData.middle_name,
        last_name: editFormData.last_name,
        lrn: editFormData.lrn,
        grade_level: editFormData.grade_level,
        section_id: resolvedSectionId,
        strand: editFormData.strand,
        gender: editFormData.gender,
        email: editFormData.email,
        contact_number: editFormData.contact_number,
        address: editFormData.address,
        parent_name: editFormData.guardian_name || (editFormData as any).parent_name,
        parent_contact: editFormData.guardian_contact || (editFormData as any).parent_contact,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('students')
        .update(updatePayload)
        .eq('id', editingStudent.id);

      if (error) {
        console.warn('Database update notice:', error);
      }

      setStudents((prev) =>
        prev.map((st) =>
          st.id === editingStudent.id
            ? ({ ...st, ...editFormData, section: finalSection } as Student)
            : st
        )
      );

      setAlert({
        type: 'success',
        message: isTransfer
          ? `Student ${editFormData.first_name} ${editFormData.last_name} marked as Transferred and removed from section roster.`
          : `Student record for ${editFormData.first_name} ${editFormData.last_name} successfully updated.`,
      });
      setEditingStudent(null);
    } catch (err) {
      console.error('Failed to update student:', err);
      setAlert({
        type: 'error',
        message: 'Failed to update student record. Please try again.',
      });
    } finally {
      setEditLoading(false);
    }
  };

  const handleTransferOut = async (student: Student) => {
    if (
      !window.confirm(
        `Are you sure you want to mark ${student.first_name} ${student.last_name} as Transferred?\n\nPer policy: Transferred students are immediately removed from the active section roster. If they re-enroll, they will be treated as a new student.`
      )
    ) {
      return;
    }
    try {
      const { error } = await supabase
        .from('students')
        .update({
          section_id: null,
          academic_status: 'Transferred',
          updated_at: new Date().toISOString(),
        })
        .eq('id', student.id);

      if (error) {
        console.warn('Database transfer update notice:', error);
      }

      setStudents((prev) =>
        prev.map((st) =>
          st.id === student.id
            ? { ...st, status: 'Transferred' as const, section: 'Unassigned' }
            : st
        )
      );

      setAlert({
        type: 'success',
        message: `Student ${student.first_name} ${student.last_name} marked as Transferred and removed from section roster. If they return, they must be treated as a new student with complete documentary requirements.`,
      });
    } catch (err) {
      console.error('Failed to transfer student:', err);
      setAlert({
        type: 'error',
        message: 'Failed to update student transfer status. Please try again.',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingStudent) return;
    const finalReason =
      deleteReasonCategory === 'Other (Specify Below)'
        ? deleteReasonNotes.trim()
        : deleteReasonNotes.trim()
        ? `${deleteReasonCategory} — ${deleteReasonNotes.trim()}`
        : deleteReasonCategory.trim();

    if (!finalReason) {
      setAlert({
        type: 'error',
        message: 'Please provide a reason before deleting the student record.',
      });
      return;
    }

    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', deletingStudent.id);

      if (error) {
        console.warn('Database delete notice:', error);
      }

      setStudents((prev) => {
        const next = prev.filter((st) => st.id !== deletingStudent.id);
        try {
          localStorage.setItem(STUDENTS_CACHE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });

      try {
        const rawLogs = localStorage.getItem('plsnhs_deletion_audit_logs_v1');
        const logs = rawLogs ? JSON.parse(rawLogs) : [];
        logs.unshift({
          id: `del-stu-${Date.now()}`,
          entity_type: 'Student',
          entity_name: `${deletingStudent.first_name} ${deletingStudent.last_name}`,
          identifier: deletingStudent.lrn,
          grade_section: `${deletingStudent.grade_level} - ${deletingStudent.section || 'Unassigned'}`,
          reason: finalReason,
          deleted_at: new Date().toISOString(),
        });
        localStorage.setItem('plsnhs_deletion_audit_logs_v1', JSON.stringify(logs.slice(0, 200)));
      } catch {
        // ignore
      }

      setAlert({
        type: 'success',
        message: `Student ${deletingStudent.first_name} ${deletingStudent.last_name} removed from masterlist. Reason: ${finalReason}`,
      });
      setDeletingStudent(null);
      setDeleteReasonCategory('');
      setDeleteReasonNotes('');
    } catch (err) {
      console.error('Failed to delete student:', err);
      setAlert({
        type: 'error',
        message: 'Failed to delete student record. Please try again.',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSendToGmail = (student: Student) => {
    if (!student.email || student.email.trim() === '' || student.email === '—') {
      setAlert({
        type: 'error',
        message: `Student ${student.first_name} ${student.last_name} does not have an email address registered. Please edit their record to add an email first.`,
      });
      return;
    }
    setGmailStudent(student);
    setGmailCopied(false);
    setGmailSending(false);
    setGmailSentStatus(null);
  };

  const exportQuickIdAsImage = async (elementId: string, filename: string) => {
    const el = document.getElementById(elementId);
    if (!el) return;

    setIdDownloading(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error exporting card:', err);
      printOfficialStudentId('quickModalCardStage');
    } finally {
      setIdDownloading(false);
    }
  };

  // 1. Fetch Students & Sections and map section_id -> section name
  const fetchStudentsAndSections = async () => {
    try {
      const [{ data: stData, error: stErr }, { data: secData, error: secErr }] = await Promise.all([
        supabase.from('students').select('*').order('last_name', { ascending: true }),
        supabase.from('sections').select('*').order('name', { ascending: true }),
      ]);

      const dbSections: Section[] = !secErr && secData ? secData : [];
      if (dbSections.length > 0) {
        setSections(dbSections);
        try {
          localStorage.setItem(SECTIONS_CACHE_KEY, JSON.stringify(dbSections));
        } catch {
          // ignore
        }
      }

      const secMap = new Map<string, Section>();
      dbSections.forEach((sec) => {
        if (sec.id) secMap.set(String(sec.id), sec);
      });

      if (!stErr && stData && stData.length > 0) {
        const enrichedStudents: Student[] = stData.map((s: any) => {
          const matchedSec = s.section_id ? secMap.get(String(s.section_id)) : undefined;
          const resolvedGrade = matchedSec?.grade_level || s.grade_level || 'Grade 10';
          const resolvedSection =
            matchedSec?.name ||
            s.section ||
            (DEFAULT_SECTIONS_BY_GRADE[resolvedGrade]?.[0] ?? 'Wisdom');

          return {
            ...s,
            grade_level: resolvedGrade,
            section: resolvedSection,
            status: s.status || s.academic_status || 'Enrolled',
          };
        });
        setStudents(enrichedStudents);
        try {
          localStorage.setItem(STUDENTS_CACHE_KEY, JSON.stringify(enrichedStudents));
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn('Error fetching students and sections:', err);
    }
  };

  const fetchStudents = fetchStudentsAndSections;
  const fetchSections = () => {};

  useEffect(() => {
    fetchStudentsAndSections();
  }, []);

  // Compute unique sections available (from DB + students + defaults)
  const availableSections = useMemo(() => {
    if (gradeFilter !== 'All') {
      const list = new Set<string>();
      sections.filter((s) => s.grade_level === gradeFilter && s.name).forEach((s) => list.add(s.name));
      students
        .filter((st) => st.grade_level === gradeFilter && st.section && st.section !== 'Unassigned')
        .forEach((st) => list.add(st.section as string));
      if (DEFAULT_SECTIONS_BY_GRADE[gradeFilter]) {
        DEFAULT_SECTIONS_BY_GRADE[gradeFilter].forEach((s) => list.add(s));
      }
      return Array.from(list).sort();
    }

    const list = new Set<string>();
    sections.forEach((s) => s.name && list.add(s.name));
    students.forEach((st) => st.section && st.section !== 'Unassigned' && list.add(st.section));
    ALL_GRADES.forEach((g) => {
      DEFAULT_SECTIONS_BY_GRADE[g]?.forEach((s) => list.add(s));
    });

    return Array.from(list).sort();
  }, [sections, students, gradeFilter]);

  // Compute list of sections for a specific grade level
  const getSectionsForGrade = (grade: string) => {
    const list = new Set<string>();
    sections.filter((s) => s.grade_level === grade).forEach((s) => list.add(s.name));
    students.filter((st) => st.grade_level === grade && st.section && st.section !== 'Unassigned').forEach((st) => list.add(st.section as string));
    if (DEFAULT_SECTIONS_BY_GRADE[grade]) {
      DEFAULT_SECTIONS_BY_GRADE[grade].forEach((s) => list.add(s));
    }
    return Array.from(list).sort();
  };

  // Filtered & Sorted Students (ordered by Grade Level -> Section -> Last Name so students of a section are all in a row)
  const filteredStudents = useMemo(() => {
    const list = students.filter((s) => {
      const q = search.toLowerCase().trim();
      const name = `${s.first_name} ${s.last_name} ${s.middle_name || ''}`.toLowerCase();
      const lrn = (s.lrn || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const sec = (s.section || 'unassigned').toLowerCase();

      const matchesSearch = !q || name.includes(q) || lrn.includes(q) || email.includes(q) || sec.includes(q);

      const matchesGrade = gradeFilter === 'All' || s.grade_level === gradeFilter;

      let matchesSection = true;
      if (sectionFilter === 'Unassigned') {
        matchesSection = !s.section || s.section.toLowerCase() === 'unassigned';
      } else if (sectionFilter !== 'All') {
        matchesSection = s.section === sectionFilter;
      }

      const matchesStrand = strandFilter === 'All' || s.strand === strandFilter;
      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;

      return matchesSearch && matchesGrade && matchesSection && matchesStrand && matchesStatus;
    });

    return list.sort((a, b) => {
      const gA = parseInt(String(a.grade_level || '10').replace(/\D/g, ''), 10) || 10;
      const gB = parseInt(String(b.grade_level || '10').replace(/\D/g, ''), 10) || 10;
      if (gA !== gB) return gA - gB;

      const secA = (a.section || 'ZZZ').toLowerCase();
      const secB = (b.section || 'ZZZ').toLowerCase();
      if (secA !== secB) return secA.localeCompare(secB);

      return (a.last_name || '').toLowerCase().localeCompare((b.last_name || '').toLowerCase());
    });
  }, [students, search, gradeFilter, sectionFilter, strandFilter, statusFilter]);

  // Group filteredStudents by Year Level and Section so every section is clearly separated with its own header
  const groupedStudentsBySection = useMemo(() => {
    const groups: {
      key: string;
      grade: string;
      section: string;
      items: Student[];
    }[] = [];

    const map = new Map<
      string,
      { key: string; grade: string; section: string; items: Student[] }
    >();

    filteredStudents.forEach((s) => {
      const g = s.grade_level || 'Grade 10';
      const sec = s.section || (DEFAULT_SECTIONS_BY_GRADE[g]?.[0] ?? 'Wisdom');
      const key = `${g}___${sec}`;
      if (!map.has(key)) {
        const entry = { key, grade: g, section: sec, items: [] as Student[] };
        map.set(key, entry);
        groups.push(entry);
      }
      map.get(key)!.items.push(s);
    });

    return groups;
  }, [filteredStudents]);

  // Counts Summary
  const stats = useMemo(() => {
    const total = students.length;
    const unassigned = students.filter((s) => !s.section || s.section.toLowerCase() === 'unassigned').length;
    const assigned = total - unassigned;

    const byGrade: Record<string, number> = {};
    ALL_GRADES.forEach((g) => (byGrade[g] = 0));
    students.forEach((s) => {
      const g = s.grade_level || 'Grade 10';
      if (byGrade[g] !== undefined) byGrade[g]++;
      else byGrade[g] = 1;
    });

    return { total, unassigned, assigned, byGrade };
  }, [students]);

  // Handle Quick Section Assign for a single student
  const handleSaveSection = async (studentId: string | number, newSection: string) => {
    if (!newSection) return;
    setAssigningLoading(true);
    setAlert(null);

    try {
      const matchedSec = sections.find((sec) => sec.name === newSection);
      if (newSection === 'Unassigned') {
        await supabase.from('students').update({ section_id: null }).eq('id', studentId);
      } else if (matchedSec?.id) {
        await supabase.from('students').update({ section_id: matchedSec.id }).eq('id', studentId);
      }

      // Update local state
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, section: newSection } : s))
      );

      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent({ ...selectedStudent, section: newSection });
      }

      setAlert({
        type: 'success',
        message: `Student successfully assigned to Section "${newSection}".`,
      });
      setAssigningStudent(null);
    } catch (err: any) {
      console.error('Section assignment error:', err);
      setAlert({
        type: 'error',
        message: err.message || 'Failed to update section. Please try again.',
      });
    } finally {
      setAssigningLoading(false);
    }
  };

  // Handle Batch Section Assignment
  const handleBatchAssign = async () => {
    if (!batchSection || selectedStudentIds.size === 0) return;
    setBatchLoading(true);
    setAlert(null);

    const ids = Array.from(selectedStudentIds);
    try {
      const matchedSec = sections.find((sec) => sec.name === batchSection);
      if (matchedSec?.id) {
        await supabase.from('students').update({ section_id: matchedSec.id }).in('id', ids);
      }

      // Update local state
      setStudents((prev) =>
        prev.map((s) => (selectedStudentIds.has(s.id) ? { ...s, section: batchSection } : s))
      );

      setAlert({
        type: 'success',
        message: `Successfully assigned ${ids.length} student${ids.length === 1 ? '' : 's'} to Section "${batchSection}".`,
      });
      setSelectedStudentIds(new Set());
      setBatchSection('');
    } catch (err: any) {
      console.error('Batch assignment error:', err);
      setAlert({
        type: 'error',
        message: err.message || 'Failed to update sections.',
      });
    } finally {
      setBatchLoading(false);
    }
  };

  // Toggle selection
  const toggleSelectStudent = (id: string | number) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-extrabold text-[#0f172a] font-display tracking-tight">
            Student Masterlist
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Organize, filter, and manage students by Year Level (Grade 7–12) and Section roster.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 ml-auto pt-0.5">
          <PageHeaderNotificationSlot />
        </div>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* View Mode Switcher & Filter Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
        {/* Top: View Mode Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-[#1B2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📋 By Section Rows
            </button>
            <button
              onClick={() => setViewMode('grade')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grade'
                  ? 'bg-white text-[#1B2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🎓 By Year Level
            </button>
            <button
              onClick={() => setViewMode('section')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'section'
                  ? 'bg-white text-[#1B2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏫 Section Cards
            </button>
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Showing <strong className="text-slate-900">{filteredStudents.length}</strong> of{' '}
            <strong className="text-slate-900">{students.length}</strong> students
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, LRN, email, section..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Year Level Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Year Level:</label>
              <select
                value={gradeFilter}
                onChange={(e) => {
                  setGradeFilter(e.target.value);
                  setSectionFilter('All');
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#1B2A4A] focus:outline-hidden"
              >
                <option value="All">All Year Levels (7–12)</option>
                {ALL_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">Section:</label>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#1B2A4A] focus:outline-hidden"
              >
                <option value="All">All Sections</option>
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#1B2A4A] focus:outline-hidden"
            >
              <option value="All">All Status</option>
              <option value="Enrolled">Enrolled</option>
              <option value="Pending">Pending</option>
              <option value="Transferred">Transferred</option>
              <option value="Rejected">Rejected</option>
              <option value="Dropped">Dropped</option>
              <option value="Graduated">Graduated</option>
            </select>

            {(search || gradeFilter !== 'All' || sectionFilter !== 'All' || statusFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearch('');
                  setGradeFilter('All');
                  setSectionFilter('All');
                  setStatusFilter('All');
                  setStrandFilter('All');
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Batch Action Toolbar when 1+ selected */}
        {selectedStudentIds.size > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-blue-50/80 border border-blue-200 animate-fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-[#1E3A8A]">
              <CheckSquare className="h-4 w-4" />
              <span>{selectedStudentIds.size} student{selectedStudentIds.size === 1 ? '' : 's'} selected</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={batchSection}
                onChange={(e) => setBatchSection(e.target.value)}
                className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-hidden"
              >
                <option value="">-- Assign to Section --</option>
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!batchSection || batchLoading}
                onClick={handleBatchAssign}
                className="px-3.5 py-1.5 rounded-lg bg-[#152e69] hover:bg-[#0f1c3f] text-white text-xs font-bold shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {batchLoading ? 'Assigning...' : 'Apply Section'}
              </button>

              <button
                type="button"
                onClick={() => setSelectedStudentIds(new Set())}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIEW MODE 1: GROUPED BY YEAR LEVEL & SECTION ROWS */}
      {viewMode === 'list' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-visible">
          <div className="overflow-visible rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3.5 w-10 text-center rounded-tl-2xl">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="cursor-pointer text-slate-400 hover:text-slate-700"
                    >
                      {selectedStudentIds.size > 0 && selectedStudentIds.size === filteredStudents.length ? (
                        <CheckSquare className="h-4 w-4 text-[#1B2A4A]" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-5 py-3.5">Learner Name</th>
                  <th className="px-5 py-3.5">LRN</th>
                  <th className="px-5 py-3.5">Year Level</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right rounded-tr-2xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1B2A4A] border-t-transparent mb-2"></div>
                      <p>Loading students directory...</p>
                    </td>
                  </tr>
                ) : groupedStudentsBySection.length > 0 ? (
                  groupedStudentsBySection.map((group, gIdx) => {
                    const gradeNum = parseInt(
                      String(group.grade).replace(/\D/g, '') || '10',
                      10
                    );
                    const isShsGroup = gradeNum >= 11;
                    const isLastGroup = gIdx === groupedStudentsBySection.length - 1;

                    return (
                      <React.Fragment key={group.key}>
                        {/* Year Level & Section Header Row */}
                        <tr className="bg-slate-100/90 border-y border-slate-200">
                          <td colSpan={6} className="px-5 py-2.5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 rounded-lg bg-[#1B2A4A] px-2.5 py-1 text-[11px] font-extrabold text-white">
                                  <GraduationCap className="h-3.5 w-3.5 text-[#F5C518]" />
                                  {group.grade}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-300 px-3 py-1 text-xs font-extrabold text-[#1B2A4A] shadow-2xs">
                                  <Layers className="h-3.5 w-3.5 text-[#1B2A4A]" />
                                  Section {group.section}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-500">
                                  {isShsGroup ? 'Senior High School (SHS)' : 'Junior High School (JHS)'}
                                </span>
                              </div>
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-[#1B2A4A] whitespace-nowrap">
                                <Users className="h-3 w-3" />
                                {group.items.length}{' '}
                                {group.items.length === 1 ? 'Student' : 'Students'}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Consecutive Student Rows in this Section */}
                        {group.items.map((s, rIdx) => {
                          const isSelected = selectedStudentIds.has(s.id);
                          const openUpward = isLastGroup && rIdx >= group.items.length - 2 && filteredStudents.length > 2;

                          return (
                            <tr
                              key={s.id}
                              className={`hover:bg-slate-50/70 transition-colors ${
                                isSelected ? 'bg-blue-50/30' : ''
                              }`}
                            >
                              {/* Checkbox */}
                              <td className="px-4 py-3.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleSelectStudent(s.id)}
                                  className="cursor-pointer text-slate-400 hover:text-slate-700"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="h-4 w-4 text-[#1B2A4A]" />
                                  ) : (
                                    <Square className="h-4 w-4" />
                                  )}
                                </button>
                              </td>

                              {/* Learner Name */}
                              <td className="px-5 py-3.5">
                                <div className="font-bold text-slate-900 text-[13px]">
                                  {s.last_name}, {s.first_name} {s.middle_name || ''}
                                </div>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {s.email || 'No email registered'}
                                </div>
                              </td>

                              {/* LRN */}
                              <td className="px-5 py-3.5 font-mono font-bold text-slate-700">
                                {s.lrn || '—'}
                              </td>

                              {/* Year Level (& Strand for SHS only) */}
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-800">
                                    {s.grade_level || 'Grade 10'}
                                  </span>
                                  {s.strand &&
                                    s.strand !== 'N/A' &&
                                    isShsGroup && (
                                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#1E3A8A]">
                                        {s.strand}
                                      </span>
                                    )}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="px-5 py-3.5">
                                <Badge
                                  variant={
                                    String(s.status) === 'Enrolled' || String(s.status) === 'Passed'
                                      ? 'success'
                                      : s.status === 'Pending'
                                      ? 'warning'
                                      : s.status === 'Transferred'
                                      ? 'purple'
                                      : 'neutral'
                                  }
                                  size="sm"
                                >
                                  {s.status || 'Enrolled'}
                                </Badge>
                              </td>

                              {/* Action: Manage Dropdown Menu */}
                              <td className="px-5 py-3.5 text-right relative">
                                <div className="relative inline-block text-left">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveDropdownId(activeDropdownId === s.id ? null : s.id);
                                    }}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                                      activeDropdownId === s.id
                                        ? 'border-[#152e69] bg-[#152e69] text-white shadow-xs'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                                    }`}
                                    title="Manage Student Record"
                                  >
                                    <span>Manage</span>
                                    <ChevronDown
                                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                        activeDropdownId === s.id ? 'rotate-180' : ''
                                      }`}
                                    />
                                  </button>

                                  {activeDropdownId === s.id && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-40"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveDropdownId(null);
                                        }}
                                      />
                                      <div
                                        className={`absolute right-0 z-50 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-black/5 divide-y divide-slate-100 ${
                                          openUpward
                                            ? 'bottom-full mb-1.5 origin-bottom-right'
                                            : 'top-full mt-1.5 origin-top-right'
                                        }`}
                                      >
                                        <div className="py-1">
                                          {/* View Profile */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveDropdownId(null);
                                              setSelectedStudent(s);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#152e69] transition-colors cursor-pointer"
                                          >
                                            <Eye className="h-4 w-4 text-slate-400" />
                                            <span>View Profile</span>
                                          </button>

                                          {/* Generate ID Option */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveDropdownId(null);
                                              setGeneratingIdStudent(s);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold text-[#152e69] hover:bg-amber-50/70 transition-colors cursor-pointer"
                                          >
                                            <CreditCard className="h-4 w-4 text-amber-500" />
                                            <span className="flex-1">Generate ID</span>
                                            <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-black uppercase text-amber-800">
                                              Card
                                            </span>
                                          </button>

                                          {/* Edit Record */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveDropdownId(null);
                                              handleOpenEditModal(s);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#152e69] transition-colors cursor-pointer"
                                          >
                                            <Edit2 className="h-4 w-4 text-slate-400" />
                                            <span>Edit Record</span>
                                          </button>

                                          {/* Change Section */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveDropdownId(null);
                                              setAssigningStudent(s);
                                              setTargetSection(s.section || '');
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#152e69] transition-colors cursor-pointer"
                                          >
                                            <School className="h-4 w-4 text-slate-400" />
                                            <span>Change Section</span>
                                          </button>

                                          {/* Send to Gmail */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveDropdownId(null);
                                              handleSendToGmail(s);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#152e69] transition-colors cursor-pointer"
                                          >
                                            <Mail className="h-4 w-4 text-slate-400" />
                                            <span>Send to Gmail</span>
                                          </button>

                                          {/* Transfer Out (Remove from Roster) */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveDropdownId(null);
                                              handleTransferOut(s);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                                            title="Mark student as transferred and remove from section roster"
                                          >
                                            <ArrowRightLeft className="h-4 w-4 text-amber-600" />
                                            <span>Transfer Out (Roster)</span>
                                          </button>
                                        </div>

                                        <div className="py-1">
                                          {/* Delete Student */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveDropdownId(null);
                                              setDeletingStudent(s);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                          >
                                            <Trash2 className="h-4 w-4 text-rose-500" />
                                            <span>Delete Student</span>
                                          </button>
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No students found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: BY GRADE LEVEL */}
      {viewMode === 'grade' && (
        <div className="space-y-6">
          {ALL_GRADES.map((grade) => {
            const gradeStudents = students.filter((s) => s.grade_level === grade);
            const gradeSections = getSectionsForGrade(grade);
            const gradeUnassigned = gradeStudents.filter((s) => !s.section || s.section.toLowerCase() === 'unassigned').length;

            return (
              <div key={grade} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                {/* Grade Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1B2A4A] text-white font-extrabold text-sm">
                      {grade.replace('Grade ', 'G')}
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                        {grade}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {parseInt(grade.replace(/\D/g, '') || '10', 10) >= 11 ? 'Senior High School' : 'Junior High School'} ·{' '}
                        {gradeStudents.length} Students Enrolled
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-xs font-semibold text-slate-700">
                      {gradeSections.length} Sections
                    </span>
                    {gradeUnassigned > 0 ? (
                      <span className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {gradeUnassigned} Unassigned
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">
                        All Assigned
                      </span>
                    )}
                  </div>
                </div>

                {/* Section Pills breakdown */}
                <div className="flex flex-wrap gap-2">
                  {gradeSections.map((secName) => {
                    const count = gradeStudents.filter((s) => s.section === secName).length;
                    return (
                      <button
                        key={secName}
                        onClick={() => {
                          setGradeFilter(grade);
                          setSectionFilter(secName);
                          setViewMode('list');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-xs font-medium text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Layers className="h-3 w-3 text-[#1B2A4A]" />
                        <span className="font-bold">{secName}</span>
                        <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-200 text-[10px] font-bold">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                  {gradeUnassigned > 0 && (
                    <button
                      onClick={() => {
                        setGradeFilter(grade);
                        setSectionFilter('Unassigned');
                        setViewMode('list');
                      }}
                      className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <AlertCircle className="h-3 w-3 text-amber-600" />
                      <span>Unassigned Roster ({gradeUnassigned})</span>
                    </button>
                  )}
                </div>

                {/* Sample Student Table for this Grade */}
                <div className="border border-slate-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-4 py-2">Learner Name</th>
                        <th className="px-4 py-2">LRN</th>
                        <th className="px-4 py-2">Section</th>
                        <th className="px-4 py-2 text-right">Quick Assign</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gradeStudents.slice(0, 5).map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2 font-bold text-slate-800">
                            {s.last_name}, {s.first_name}
                          </td>
                          <td className="px-4 py-2 font-mono text-slate-600">{s.lrn || '—'}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                !s.section || s.section === 'Unassigned'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-blue-50 text-[#1E3A8A]'
                              }`}
                            >
                              {s.section || 'Unassigned'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setAssigningStudent(s);
                                setTargetSection(s.section || '');
                              }}
                              className="text-[11px] font-bold text-[#1E3A8A] hover:underline cursor-pointer"
                            >
                              Edit Section
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {gradeStudents.length > 5 && (
                    <div className="p-2 text-center bg-slate-50 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setGradeFilter(grade);
                          setViewMode('list');
                        }}
                        className="text-xs font-bold text-[#1B2A4A] hover:underline"
                      >
                        View all {gradeStudents.length} {grade} students →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 3: BY SECTION */}
      {viewMode === 'section' && (
        <div className="space-y-6">
          {/* Quick grade level selector for sections */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setGradeFilter('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                gradeFilter === 'All'
                  ? 'bg-[#1B2A4A] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Grades
            </button>
            {ALL_GRADES.map((g) => (
              <button
                key={g}
                onClick={() => setGradeFilter(g)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  gradeFilter === g
                    ? 'bg-[#1B2A4A] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Section Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Unassigned Pool Card */}
            <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <span>Unassigned Roster</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-xs font-black">
                  {students.filter((s) => !s.section || s.section.toLowerCase() === 'unassigned').length} Learners
                </span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Students who completed enrollment but have not yet been assigned to a classroom section.
              </p>
              <button
                onClick={() => {
                  setSectionFilter('Unassigned');
                  setViewMode('list');
                }}
                className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs"
              >
                View & Assign All Unassigned Students →
              </button>
            </div>

            {/* Configured Sections */}
            {availableSections.map((secName) => {
              const secStudents = students.filter((s) => s.section === secName && s.status !== 'Transferred');
              const matchedDbSection = sections.find((s) => s.name === secName);
              const capacity = matchedDbSection?.capacity || 45;
              const grade = matchedDbSection?.grade_level || secStudents[0]?.grade_level || 'Grade 10';

              return (
                <div
                  key={secName}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-[#1B2A4A]" /> Section {secName}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">{grade}</p>
                    </div>

                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#1E3A8A] font-mono text-xs font-bold border border-blue-200">
                      {secStudents.length} / {capacity}
                    </span>
                  </div>

                  {matchedDbSection?.adviser && (
                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      <span>Adviser: <strong>{matchedDbSection.adviser}</strong></span>
                    </div>
                  )}

                  {/* Student preview list */}
                  <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                    {secStudents.slice(0, 3).map((st) => (
                      <div key={st.id} className="p-2 flex items-center justify-between bg-slate-50/50">
                        <span className="font-semibold text-slate-800 truncate">
                          {st.last_name}, {st.first_name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{st.lrn}</span>
                      </div>
                    ))}
                    {secStudents.length === 0 && (
                      <div className="p-3 text-center text-slate-400 text-xs">No students in this section yet.</div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSectionFilter(secName);
                      setViewMode('list');
                    }}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer text-center"
                  >
                    Manage Roster ({secStudents.length}) →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* QUICK SECTION ASSIGN MODAL */}
      {assigningStudent && (
        <Modal
          isOpen={!!assigningStudent}
          onClose={() => setAssigningStudent(null)}
          title={`Assign Section: ${assigningStudent.first_name} ${assigningStudent.last_name}`}
          subtitle={`LRN: ${assigningStudent.lrn} · Grade Level: ${assigningStudent.grade_level || 'Grade 10'}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <p className="font-bold text-slate-900 text-sm">
                {assigningStudent.last_name}, {assigningStudent.first_name} {assigningStudent.middle_name || ''}
              </p>
              <p className="text-slate-500">
                Grade: <strong>{assigningStudent.grade_level}</strong>
                {assigningStudent.strand ? ` · Strand: ${assigningStudent.strand}` : ''}
              </p>
              <p className="text-slate-500">
                Current Section:{' '}
                <strong className={!assigningStudent.section || assigningStudent.section === 'Unassigned' ? 'text-amber-600' : 'text-blue-700'}>
                  {assigningStudent.section || 'Unassigned'}
                </strong>
              </p>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Select New Section:
              </label>
              <select
                value={targetSection}
                onChange={(e) => setTargetSection(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs font-semibold text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden"
              >
                <option value="">-- Choose a Section --</option>
                <option value="Unassigned">⚠️ Mark as Unassigned</option>
                {getSectionsForGrade(assigningStudent.grade_level || 'Grade 10').map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssigningStudent(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!targetSection || assigningLoading}
                onClick={() => handleSaveSection(assigningStudent.id, targetSection)}
                className="px-5 py-2 rounded-xl bg-[#152e69] hover:bg-[#0f1c3f] text-white font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {assigningLoading ? 'Saving...' : 'Save Section Assignment'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* STUDENT DETAILS PROFILE MODAL */}
      {selectedStudent && (
        <Modal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          title={`Student Profile: ${selectedStudent.first_name} ${selectedStudent.last_name}`}
          subtitle={`LRN: ${selectedStudent.lrn || 'Not assigned'}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 border border-slate-100">
              <div>
                <span className="font-semibold text-slate-400">Grade & Strand</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {selectedStudent.grade_level} {selectedStudent.strand ? `- ${selectedStudent.strand}` : ''}
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Enrollment Status</span>
                <div className="mt-1">
                  <Badge variant="success">{selectedStudent.status || 'Enrolled'}</Badge>
                </div>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Assigned Section</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {selectedStudent.section || 'Unassigned'}
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Gender</span>
                <p className="font-bold text-slate-900 mt-0.5">{selectedStudent.gender || '—'}</p>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3">
              <h4 className="font-bold text-slate-800 uppercase text-[11px]">Contact & Guardian</h4>
              <p className="text-slate-600 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <span>{selectedStudent.email || 'None'}</span>
              </p>
              <p className="text-slate-600 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <span>{selectedStudent.contact_number || 'None'}</span>
              </p>
              <p className="text-slate-600 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span>{selectedStudent.address || 'Address not recorded'}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const st = selectedStudent;
                    setSelectedStudent(null);
                    setGeneratingIdStudent(st);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 font-bold text-xs hover:bg-amber-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <CreditCard className="h-3.5 w-3.5 text-amber-600" /> Generate ID
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const st = selectedStudent;
                    setSelectedStudent(null);
                    handleOpenEditModal(st);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Edit Record
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAssigningStudent(selectedStudent);
                    setTargetSection(selectedStudent.section || '');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-50 text-[#1E3A8A] font-bold text-xs hover:bg-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <School className="h-3.5 w-3.5" /> Change Section
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* QUICK GENERATE ID MODAL */}
      {generatingIdStudent && (
        <Modal
          isOpen={!!generatingIdStudent}
          onClose={() => setGeneratingIdStudent(null)}
          title={`Official Student ID: ${generatingIdStudent.first_name} ${generatingIdStudent.last_name}`}
          subtitle={`LRN: ${generatingIdStudent.lrn || '—'} · ${generatingIdStudent.grade_level || 'Grade 10'} ${generatingIdStudent.section ? `· Section ${generatingIdStudent.section}` : ''}`}
          maxWidth="5xl"
        >
          <div className="space-y-4">
            {/* Action Bar Header */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              {/* Left: View Switcher */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setIdCardSide('both')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    idCardSide === 'both'
                      ? 'bg-[#152e69] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Both Sides (Side-by-Side)
                </button>
                <button
                  type="button"
                  onClick={() => setIdCardSide('front')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    idCardSide === 'front'
                      ? 'bg-[#152e69] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Front
                </button>
                <button
                  type="button"
                  onClick={() => setIdCardSide('back')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    idCardSide === 'back'
                      ? 'bg-[#152e69] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setIdCardFlipped(!idCardFlipped)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1 cursor-pointer"
                  title="Flip Card View"
                >
                  <RotateCw className="h-3 w-3" />
                  Flip
                </button>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 no-print flex-wrap">
                <button
                  type="button"
                  disabled={idDownloading}
                  onClick={() => {
                    exportQuickIdAsImage(
                      'quickModalCardFront',
                      `${generatingIdStudent.last_name}_${generatingIdStudent.first_name}_Front.png`
                    );
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                  title="Download Front (PNG)"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>PNG Front</span>
                </button>

                <button
                  type="button"
                  disabled={idDownloading}
                  onClick={() => {
                    exportQuickIdAsImage(
                      'quickModalCardBack',
                      `${generatingIdStudent.last_name}_${generatingIdStudent.first_name}_Back.png`
                    );
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                  title="Download Back (PNG)"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>PNG Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => printOfficialStudentId('quickModalCardStage')}
                  className="px-4 py-1.5 rounded-xl bg-[#152e69] hover:bg-[#0e1a3c] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  title="Print Official CR80 ID Card"
                >
                  <Printer className="h-3.5 w-3.5 text-[#F5C518]" />
                  <span>Print Official ID</span>
                </button>
              </div>
            </div>

            {/* CR80 Landscape ID Card Preview Stage */}
            <div
              className="flex justify-center items-center py-6 px-4 overflow-x-auto bg-gradient-to-br from-slate-950 via-[#0a183d] to-slate-900 rounded-2xl border border-slate-800 shadow-2xl"
              id="quickModalCardStage"
            >
              <StudentIdCard
                data={{
                  id: generatingIdStudent.id,
                  student_id: generatingIdStudent.id,
                  fullname: `${generatingIdStudent.first_name} ${generatingIdStudent.last_name}`.trim(),
                  first_name: generatingIdStudent.first_name,
                  last_name: generatingIdStudent.last_name,
                  lrn: generatingIdStudent.lrn,
                  grade_level: generatingIdStudent.grade_level || 'Grade 10',
                  level_category:
                    parseInt(String(generatingIdStudent.grade_level).replace(/\D/g, '') || '10', 10) >= 11
                      ? 'Senior High'
                      : 'Junior High',
                  strand: generatingIdStudent.strand || '',
                  parent_name: generatingIdStudent.guardian_name || '',
                  parent_contact: generatingIdStudent.guardian_contact || '',
                  school_year: '2026-2027',
                  principal_name: 'Dr. Ryan R. Quiroga',
                  photo_url:
                    (generatingIdStudent as any).two_by_two_picture_url ||
                    (generatingIdStudent as any).photo_url ||
                    (generatingIdStudent as any).avatar_url ||
                    '',
                }}
                side={idCardSide}
                flipped={idCardFlipped}
                layout={idCardSide === 'both' ? 'row' : 'column'}
                scale={idCardSide === 'both' ? 0.82 : 0.95}
                className="transparent-stage"
                frontId="quickModalCardFront"
                backId="quickModalCardBack"
              />
            </div>

            {/* Footer with Deep Studio Redirect */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 no-print">
              <div className="text-[11px] text-slate-500 font-medium">
                Official DepEd CR80 PVC Card Standard (85.6mm × 54mm) · QR Gate Authentication Enabled
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    const sid = generatingIdStudent.id;
                    const lrn = generatingIdStudent.lrn || '';
                    setGeneratingIdStudent(null);
                    const base = window.location.pathname.startsWith('/registrar') ? '/registrar/generate-id' : '/admin/generate-id';
                    navigate(`${base}?id=${sid}&lrn=${lrn}`);
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-[#152e69]" />
                  <span>Customize in Full ID Studio</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGeneratingIdStudent(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT STUDENT RECORD MODAL */}
      {editingStudent && (
        <Modal
          isOpen={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          title={`Edit Student Record: ${editingStudent.first_name} ${editingStudent.last_name}`}
          subtitle={`LRN: ${editingStudent.lrn || '—'} · ID: ${editingStudent.id}`}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveEdit();
            }}
            className="space-y-4 text-xs"
          >
            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.first_name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-medium text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={editFormData.middle_name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, middle_name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-medium text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.last_name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-medium text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Academic Information */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  LRN (12 Digits) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={12}
                  value={editFormData.lrn || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, lrn: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 font-mono text-xs font-bold text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Grade Level
                </label>
                <select
                  value={editFormData.grade_level || 'Grade 10'}
                  onChange={(e) => {
                    const newGrade = e.target.value;
                    const gradeSections = getSectionsForGrade(newGrade);
                    setEditFormData({
                      ...editFormData,
                      grade_level: newGrade,
                      section: gradeSections[0] || 'Unassigned',
                      strand:
                        parseInt(newGrade.replace(/\D/g, '') || '10', 10) >= 11
                          ? editFormData.strand || 'TVL-ICT'
                          : '',
                    });
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                >
                  {ALL_GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Section
                </label>
                <select
                  value={editFormData.section || 'Unassigned'}
                  onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                >
                  <option value="Unassigned">⚠️ Unassigned</option>
                  {getSectionsForGrade(editFormData.grade_level || 'Grade 10').map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Strand (SHS)
                </label>
                <select
                  disabled={parseInt(String(editFormData.grade_level).replace(/\D/g, '') || '10', 10) < 11}
                  value={editFormData.strand || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, strand: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:border-[#152e69] focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">None / JHS</option>
                  <option value="TVL-ICT">TVL - ICT</option>
                  <option value="STEM">STEM</option>
                  <option value="HUMSS">HUMSS</option>
                  <option value="GAS">GAS</option>
                  <option value="ABM">ABM</option>
                </select>
              </div>
            </div>

            {/* Status and Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Enrollment Status
                </label>
                <select
                  value={editFormData.status || 'Enrolled'}
                  onChange={(e) => {
                    const newStatus = e.target.value as any;
                    if (newStatus === 'Transferred') {
                      setEditFormData({
                        ...editFormData,
                        status: newStatus,
                        section: 'Unassigned',
                      });
                    } else {
                      setEditFormData({ ...editFormData, status: newStatus });
                    }
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                >
                  <option value="Enrolled">Enrolled</option>
                  <option value="Pending">Pending</option>
                  <option value="Transferred">Transferred (Removes from Roster)</option>
                  <option value="Graduated">Graduated</option>
                  <option value="Dropped">Dropped / Inactive</option>
                </select>
                {editFormData.status === 'Transferred' && (
                  <p className="mt-1 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 leading-tight">
                    ⚠️ <strong>Transfer Rule:</strong> This student will be marked as Transferred and removed from their section roster. If they re-enroll, they must submit a fresh enrollment application as a new student with complete documentary requirements.
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Gender
                </label>
                <select
                  value={editFormData.gender || 'Male'}
                  onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Student Gmail / Email
                </label>
                <input
                  type="email"
                  placeholder="student@gmail.com"
                  value={editFormData.email || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-medium text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Contact Number
                </label>
                <input
                  type="tel"
                  placeholder="09XXXXXXXXX"
                  value={editFormData.contact_number || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, contact_number: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-medium text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Parent / Guardian Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Parent / Guardian Name
                </label>
                <input
                  type="text"
                  placeholder="Full name of guardian"
                  value={editFormData.guardian_name || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, guardian_name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-medium text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Parent / Guardian Contact
                </label>
                <input
                  type="tel"
                  placeholder="09XXXXXXXXX"
                  value={editFormData.guardian_contact || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, guardian_contact: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-medium text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                Home Address
              </label>
              <input
                type="text"
                placeholder="Barangay, City, Province"
                value={editFormData.address || ''}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-medium text-slate-800 focus:border-[#152e69] focus:outline-hidden"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="px-5 py-2 rounded-xl bg-[#152e69] hover:bg-[#0f1c3f] text-white font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingStudent && (
        <Modal
          isOpen={!!deletingStudent}
          onClose={() => {
            setDeletingStudent(null);
            setDeleteReasonCategory('');
            setDeleteReasonNotes('');
          }}
          title="Confirm Student Deletion"
          subtitle="A valid reason is required to permanently remove a student record"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1.5">
              <p className="font-bold text-sm text-rose-900">
                Are you sure you want to delete this student record?
              </p>
              <p className="leading-relaxed">
                You are about to remove <strong>{deletingStudent.first_name} {deletingStudent.last_name}</strong> (LRN: <span className="font-mono">{deletingStudent.lrn}</span>) from the official student masterlist and unassign them from section <strong>{deletingStudent.section || 'Unassigned'}</strong>.
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
                <option value="Transferred to Another School">Transferred to Another School</option>
                <option value="Withdrawn by Parent / Guardian">Withdrawn by Parent / Guardian</option>
                <option value="Dropped Out / Discontinued Studies">Dropped Out / Discontinued Studies</option>
                <option value="Duplicate / Erroneous Enrollment Entry">Duplicate / Erroneous Enrollment Entry</option>
                <option value="Graduated / Completed Curriculum">Graduated / Completed Curriculum</option>
                <option value="Disciplinary / Administrative Action">Disciplinary / Administrative Action</option>
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
                  setDeletingStudent(null);
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
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deleteLoading ? 'Deleting...' : 'Confirm & Delete Student'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* SEND TO GMAIL MODAL */}
      {gmailStudent && (() => {
        const studentEmail = (gmailStudent.email || '').trim().toLowerCase();
        const safeFirstName = (gmailStudent.first_name || 'Student').trim();
        const safeLastName = (gmailStudent.last_name || 'Learner').trim();
        const tempPassword = safeLastName; // Temporary password is student's last name
        const studentLrn =
          gmailStudent.lrn && String(gmailStudent.lrn).trim() !== 'N/A'
            ? String(gmailStudent.lrn).trim()
            : 'Pending Assignment';
        const sectionDisplay = `${gmailStudent.grade_level || 'Grade 10'} - ${gmailStudent.section || 'Unassigned'}`;

        const emailSubject = 'Placido L. Señor National High School - Student Portal Access Credentials';

        const emailBody = `Dear ${safeFirstName} ${safeLastName},

Your student portal account for Placido L. Señor National High School has been approved and prepared:

• Portal Link: ${window.location.origin}/login
• Username (Gmail): ${studentEmail}
• Temporary Password: ${tempPassword}
• Learner Reference No. (LRN): ${studentLrn}
• Grade & Section: ${sectionDisplay}

Please keep your credentials safe and log in to verify your enrollment status. For your security, please update your password after your first login.

Warm regards,
Placido L. Señor National High School
Registrar & Admissions Office`;

        const gmailWebComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
          studentEmail
        )}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

        return (
          <Modal
            isOpen={!!gmailStudent}
            onClose={() => {
              setGmailStudent(null);
              setGmailSentStatus(null);
            }}
            title={`Send Credentials to Gmail: ${safeFirstName} ${safeLastName}`}
            subtitle={`Target Address: ${studentEmail}`}
          >
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-2 text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#152e69] text-xs">Email Payload Preview</span>
                  <span className="font-mono text-[11px] text-blue-700">{studentEmail}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-white border border-blue-100 font-mono text-[11px] text-slate-800 whitespace-pre-wrap leading-relaxed shadow-2xs">
{`Subject: Placido L. Señor National High School - Student Portal Access Credentials

Dear ${safeFirstName} ${safeLastName},

Your student portal account has been prepared:
• Portal Link: ${window.location.origin}/login
• Username (Gmail): ${studentEmail}
• Temporary Password: ${tempPassword}
• Learner Reference No. (LRN): ${studentLrn}
• Grade & Section: ${sectionDisplay}

Please keep your credentials safe and log in to verify your enrollment status.`}
                </div>
              </div>

              {gmailSentStatus && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{gmailSentStatus}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(emailBody);
                    setGmailCopied(true);
                    setTimeout(() => setGmailCopied(false), 2500);
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>{gmailCopied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGmailStudent(null);
                      setGmailSentStatus(null);
                    }}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer transition-all"
                  >
                    Cancel
                  </button>

                  {/* 1-Click Direct Delivery via Gmail Web */}
                  <a
                    href={gmailWebComposeUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={async () => {
                      try {
                        await sendStudentApprovalEmail({
                          toEmail: studentEmail,
                          firstName: safeFirstName,
                          lastName: safeLastName,
                          gradeLevel: gmailStudent.grade_level || 'Grade 10',
                          strand: gmailStudent.strand,
                          sectionName: gmailStudent.section,
                          studentId: gmailStudent.id,
                        });
                      } catch {
                        // background sync
                      }
                      setAlert({
                        type: 'success',
                        message: `Opened Gmail composer for ${studentEmail}. Click 'Send' in Gmail to deliver immediately!`,
                      });
                      setGmailStudent(null);
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#ea4335] hover:bg-[#d93025] text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                    title="Open directly in Gmail web composer to send"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Send via Gmail Web</span>
                  </a>

                  {/* Direct Cloud Auto-Dispatch */}
                  <button
                    type="button"
                    disabled={gmailSending}
                    onClick={async () => {
                      setGmailSending(true);
                      try {
                        const res = await sendStudentApprovalEmail({
                          toEmail: studentEmail,
                          firstName: safeFirstName,
                          lastName: safeLastName,
                          gradeLevel: gmailStudent.grade_level || 'Grade 10',
                          strand: gmailStudent.strand,
                          sectionName: gmailStudent.section,
                          studentId: gmailStudent.id,
                        });
                        setGmailSentStatus(res.message);
                        setAlert({
                          type: 'success',
                          message: `Credentials dispatched for ${studentEmail}. Username: ${studentEmail} | Temp Password: ${tempPassword}`,
                        });
                      } catch (err: any) {
                        setAlert({
                          type: 'error',
                          message: `Dispatch note: ${err?.message || 'Error sending'}. Please use 'Send via Gmail Web'.`,
                        });
                      } finally {
                        setGmailSending(false);
                      }
                    }}
                    className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#152e69] hover:bg-[#0f1c3f] text-white font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Send className="h-4 w-4 text-[#F5C518]" />
                    <span>{gmailSending ? 'Dispatching...' : 'Auto-Dispatch'}</span>
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
