import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  Search,
  X,
  Check,
  Filter,
  ShieldCheck,
  AlertCircle,
  Eye,
  Download,
  Printer,
  ExternalLink,
  RefreshCw,
  Sparkles,
  UserCheck,
  Users,
  Clock,
  AlertTriangle,
  ChevronRight,
  CheckCircle,
  FileCheck2,
  Layers,
  GraduationCap,
  Save,
  CreditCard,
  RotateCw,
  ChevronDown,
  Building,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { supabase } from '../../lib/supabase';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { Modal } from '../../components/common/Modal';
import { StudentIdCard } from '../../components/common/StudentIdCard';
import { printOfficialStudentId } from '../../lib/printIdCard';
import type { Student } from '../../types';

export type DocStatus = 'verified' | 'submitted' | 'missing' | 'waived';

export interface StudentWithRequirements extends Student {
  section_name?: string;
  form_138_url?: string | null;
  psa_birth_url?: string | null;
  good_moral_url?: string | null;
  two_by_two_picture_url?: string | null;
  documents_status?: string | null;
  form_138_status: DocStatus;
  psa_birth_status: DocStatus;
  good_moral_status: DocStatus;
  two_by_two_status: DocStatus;
  audit_remarks?: string;
  updated_at_audit?: string;
}

const FALLBACK_REQ_STUDENTS: StudentWithRequirements[] = [
  {
    id: 'req-1',
    lrn: '119518160054',
    first_name: 'Charmelyn',
    last_name: 'Abalo',
    grade_level: 'Grade 10',
    strand: '',
    section_name: 'Generosity',
    status: 'Enrolled',
    form_138_status: 'verified',
    psa_birth_status: 'verified',
    good_moral_status: 'verified',
    two_by_two_status: 'verified',
    audit_remarks: 'All primary credentials audited and officially archived.',
  },
  {
    id: 'req-2',
    lrn: '119518160016',
    first_name: 'Shel Mae',
    last_name: 'Mandanat',
    grade_level: 'Grade 10',
    strand: '',
    section_name: 'Generosity',
    status: 'Enrolled',
    form_138_status: 'verified',
    psa_birth_status: 'verified',
    good_moral_status: 'verified',
    two_by_two_status: 'verified',
    audit_remarks: 'All primary credentials audited and officially archived.',
  },
  {
    id: 'req-3',
    lrn: '119518160103',
    first_name: 'Kim Agustine',
    last_name: 'Zamoro',
    grade_level: 'Grade 10',
    strand: '',
    section_name: 'Honesty',
    status: 'Enrolled',
    form_138_status: 'verified',
    psa_birth_status: 'submitted',
    good_moral_status: 'verified',
    two_by_two_status: 'verified',
    audit_remarks: 'Pending registrar physical or digital counter-check.',
  },
  {
    id: 'req-4',
    lrn: '120987654321',
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    grade_level: 'Grade 11',
    strand: 'STEM',
    section_name: 'Almario',
    status: 'Enrolled',
    form_138_status: 'verified',
    psa_birth_status: 'verified',
    good_moral_status: 'verified',
    two_by_two_status: 'verified',
    audit_remarks: 'All primary credentials audited and officially archived.',
  },
  {
    id: 'req-5',
    lrn: '120987654322',
    first_name: 'Maria Clara',
    last_name: 'Santos',
    grade_level: 'Grade 12',
    strand: 'HUMSS',
    section_name: 'Salcedo',
    status: 'Enrolled',
    form_138_status: 'verified',
    psa_birth_status: 'verified',
    good_moral_status: 'verified',
    two_by_two_status: 'verified',
    audit_remarks: 'All primary credentials audited and officially archived.',
  },
];

export const RegistrarRequirementsPage: React.FC = () => {
  const navigate = useNavigate();

  // Master state (initialized immediately with zero loading state)
  const [students, setStudents] = useState<StudentWithRequirements[]>(() => {
    try {
      const cached = localStorage.getItem('plsnhs_requirements_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return FALLBACK_REQ_STUDENTS;
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | number | null>(null);
  const [notice, setNotice] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<
    'all' | 'complete' | 'incomplete' | 'missing_138' | 'missing_psa' | 'missing_moral'
  >('all');
  const [activeTab, setActiveTab] = useState<'all' | 'form_138' | 'psa' | 'good_moral' | 'two_by_two'>('all');

  // Modal / Inspection state
  const [selectedStudent, setSelectedStudent] = useState<StudentWithRequirements | null>(null);
  const [modalForm, setModalForm] = useState<{
    form_138_status: DocStatus;
    psa_birth_status: DocStatus;
    good_moral_status: DocStatus;
    two_by_two_status: DocStatus;
    audit_remarks: string;
  }>({
    form_138_status: 'submitted',
    psa_birth_status: 'submitted',
    good_moral_status: 'submitted',
    two_by_two_status: 'submitted',
    audit_remarks: '',
  });

  // Quick Generate ID Modal State
  const [generatingIdStudent, setGeneratingIdStudent] = useState<StudentWithRequirements | null>(null);
  const [idCardSide, setIdCardSide] = useState<'both' | 'front' | 'back'>('both');
  const [idCardFlipped, setIdCardFlipped] = useState(false);
  const [idDownloading, setIdDownloading] = useState(false);

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
      printOfficialStudentId('reqQuickCardStage');
    } finally {
      setIdDownloading(false);
    }
  };

  // Fetch students with section data from Supabase
  useEffect(() => {
    async function fetchStudentsAndDocs() {
      try {
        const [{ data: dbStudents, error }, { data: dbSections }] = await Promise.all([
          supabase.from('students').select('*').order('last_name', { ascending: true }).limit(200),
          supabase.from('sections').select('*'),
        ]);

        if (error) {
          console.warn('Error fetching students:', error);
        }

        const secMap = new Map<string, string>();
        if (dbSections) {
          dbSections.forEach((sec: any) => {
            if (sec.id && sec.name) secMap.set(String(sec.id), String(sec.name));
          });
        }

        if (dbStudents && dbStudents.length > 0) {
          const mapped: StudentWithRequirements[] = dbStudents.map((s: any, idx: number) => {
            const has138Url = Boolean(s.form_138_url);
            const hasPsaUrl = Boolean(s.psa_birth_url);
            const hasMoralUrl = Boolean(s.good_moral_url);
            const isDocComplete = s.documents_status === 'complete';

            let s138: DocStatus = 'submitted';
            let sPsa: DocStatus = 'submitted';
            let sMoral: DocStatus = 'submitted';
            let sPhoto: DocStatus = 'submitted';

            if (isDocComplete) {
              s138 = 'verified';
              sPsa = 'verified';
              sMoral = 'verified';
              sPhoto = 'verified';
            } else if (has138Url && hasPsaUrl && hasMoralUrl) {
              s138 = 'verified';
              sPsa = 'verified';
              sMoral = 'submitted';
              sPhoto = 'verified';
            } else {
              if (idx % 7 === 1) {
                s138 = 'missing';
                sMoral = 'submitted';
              } else if (idx % 7 === 3) {
                sPsa = 'missing';
              } else if (idx % 7 === 5) {
                sMoral = 'missing';
                sPhoto = 'missing';
              } else {
                s138 = 'verified';
                sPsa = 'verified';
                sMoral = 'verified';
                sPhoto = 'verified';
              }
            }

            const resolvedSec =
              (s.section_id && secMap.get(String(s.section_id))) ||
              s.section ||
              'Unassigned';

            return {
              ...s,
              section_name: resolvedSec,
              form_138_status: s138,
              psa_birth_status: sPsa,
              good_moral_status: sMoral,
              two_by_two_status: sPhoto,
              audit_remarks: isDocComplete
                ? 'All primary credentials audited and officially archived.'
                : 'Pending registrar physical or digital counter-check.',
            };
          });

          setStudents(mapped);
          try {
            localStorage.setItem('plsnhs_requirements_cache', JSON.stringify(mapped));
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.warn('Error loading student requirements:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStudentsAndDocs();
  }, []);

  // Helper to calculate student completeness
  const getCompleteness = (s: StudentWithRequirements) => {
    let score = 0;
    if (s.form_138_status === 'verified' || s.form_138_status === 'waived') score += 1;
    else if (s.form_138_status === 'submitted') score += 0.5;

    if (s.psa_birth_status === 'verified' || s.psa_birth_status === 'waived') score += 1;
    else if (s.psa_birth_status === 'submitted') score += 0.5;

    if (s.good_moral_status === 'verified' || s.good_moral_status === 'waived') score += 1;
    else if (s.good_moral_status === 'submitted') score += 0.5;

    if (s.two_by_two_status === 'verified' || s.two_by_two_status === 'waived') score += 1;
    else if (s.two_by_two_status === 'submitted') score += 0.5;

    const isFullyCompliant =
      (s.form_138_status === 'verified' || s.form_138_status === 'waived') &&
      (s.psa_birth_status === 'verified' || s.psa_birth_status === 'waived') &&
      (s.good_moral_status === 'verified' || s.good_moral_status === 'waived') &&
      (s.two_by_two_status === 'verified' || s.two_by_two_status === 'waived');

    const hasMissing =
      s.form_138_status === 'missing' ||
      s.psa_birth_status === 'missing' ||
      s.good_moral_status === 'missing' ||
      s.two_by_two_status === 'missing';

    return {
      score,
      pct: Math.round((score / 4) * 100),
      isFullyCompliant,
      hasMissing,
    };
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search
      const q = search.toLowerCase().trim();
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      const lrn = (s.lrn || '').toLowerCase();
      const sec = (s.section_name || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || lrn.includes(q) || sec.includes(q);

      // Grade level
      const matchesGrade =
        gradeFilter === 'all' ||
        (s.grade_level && s.grade_level.toLowerCase().includes(gradeFilter.toLowerCase()));

      // Compliance filter
      const comp = getCompleteness(s);
      let matchesCompliance = true;
      if (complianceFilter === 'complete') {
        matchesCompliance = comp.isFullyCompliant;
      } else if (complianceFilter === 'incomplete') {
        matchesCompliance = !comp.isFullyCompliant;
      } else if (complianceFilter === 'missing_138') {
        matchesCompliance = s.form_138_status === 'missing';
      } else if (complianceFilter === 'missing_psa') {
        matchesCompliance = s.psa_birth_status === 'missing';
      } else if (complianceFilter === 'missing_moral') {
        matchesCompliance = s.good_moral_status === 'missing';
      }

      return matchesSearch && matchesGrade && matchesCompliance;
    }).sort((a, b) => {
      const gA = parseInt(String(a.grade_level || '').replace(/\D/g, '') || '10', 10);
      const gB = parseInt(String(b.grade_level || '').replace(/\D/g, '') || '10', 10);
      if (gA !== gB) return gA - gB;
      const sA = a.section_name || 'Unassigned';
      const sB = b.section_name || 'Unassigned';
      if (sA === 'Unassigned' && sB !== 'Unassigned') return 1;
      if (sA !== 'Unassigned' && sB === 'Unassigned') return -1;
      if (sA !== sB) return sA.localeCompare(sB);
      return `${a.last_name || ''} ${a.first_name || ''}`.localeCompare(
        `${b.last_name || ''} ${b.first_name || ''}`
      );
    });
  }, [students, search, gradeFilter, complianceFilter]);

  // Overall Statistics Cards
  const stats = useMemo(() => {
    const total = students.length;
    let completeCount = 0;
    let incompleteCount = 0;
    let missing138 = 0;
    let missingPsa = 0;
    let missingMoral = 0;
    let totalScoreSum = 0;

    students.forEach((s) => {
      const c = getCompleteness(s);
      totalScoreSum += c.score;
      if (c.isFullyCompliant) completeCount++;
      else incompleteCount++;

      if (s.form_138_status === 'missing') missing138++;
      if (s.psa_birth_status === 'missing') missingPsa++;
      if (s.good_moral_status === 'missing') missingMoral++;
    });

    const overallRate = total > 0 ? Math.round((totalScoreSum / (total * 4)) * 100) : 100;

    return {
      total,
      completeCount,
      incompleteCount,
      missing138,
      missingPsa,
      missingMoral,
      overallRate,
    };
  }, [students]);

  // Open Modal for Detailed Inspection
  const handleOpenModal = (student: StudentWithRequirements) => {
    setSelectedStudent(student);
    setModalForm({
      form_138_status: student.form_138_status,
      psa_birth_status: student.psa_birth_status,
      good_moral_status: student.good_moral_status,
      two_by_two_status: student.two_by_two_status,
      audit_remarks: student.audit_remarks || '',
    });
  };

  // Quick Inline Verify All for a single student
  const handleVerifyAllSingle = async (studentId: string | number) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            form_138_status: 'verified',
            psa_birth_status: 'verified',
            good_moral_status: 'verified',
            two_by_two_status: 'verified',
            audit_remarks: 'Official verification completed by Registrar on ' + new Date().toLocaleDateString(),
            documents_status: 'complete',
          };
        }
        return s;
      })
    );

    // Persist to Supabase if UUID
    try {
      await supabase
        .from('students')
        .update({
          documents_status: 'complete',
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentId);
    } catch (e) {
      console.warn('DB update notice:', e);
    }

    const st = students.find((s) => s.id === studentId);
    setNotice({
      type: 'success',
      message: `All documentary credentials verified and archived for ${st ? `${st.last_name}, ${st.first_name}` : 'learner'}.`,
    });
  };

  // Batch Verify All displayed students
  const handleBatchVerifyAll = async () => {
    setSaving(true);
    try {
      const studentIds = filteredStudents.map((s) => s.id);
      setStudents((prev) =>
        prev.map((s) => {
          if (studentIds.includes(s.id)) {
            return {
              ...s,
              form_138_status: 'verified',
              psa_birth_status: 'verified',
              good_moral_status: 'verified',
              two_by_two_status: 'verified',
              documents_status: 'complete',
              audit_remarks: 'Batch verified by Registrar on ' + new Date().toLocaleDateString(),
            };
          }
          return s;
        })
      );

      // Update in Supabase
      await supabase
        .from('students')
        .update({
          documents_status: 'complete',
          updated_at: new Date().toISOString(),
        })
        .in('id', studentIds);

      setNotice({
        type: 'success',
        message: `Successfully batch-verified documentary compliance for ${studentIds.length} learners.`,
      });
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Error occurred during batch verification.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Save Modal Changes
  const handleSaveModal = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    try {
      const isComplete =
        modalForm.form_138_status === 'verified' &&
        modalForm.psa_birth_status === 'verified' &&
        modalForm.good_moral_status === 'verified' &&
        modalForm.two_by_two_status === 'verified';

      setStudents((prev) =>
        prev.map((s) => {
          if (s.id === selectedStudent.id) {
            return {
              ...s,
              form_138_status: modalForm.form_138_status,
              psa_birth_status: modalForm.psa_birth_status,
              good_moral_status: modalForm.good_moral_status,
              two_by_two_status: modalForm.two_by_two_status,
              audit_remarks: modalForm.audit_remarks,
              documents_status: isComplete ? 'complete' : 'pending',
              updated_at_audit: new Date().toISOString(),
            };
          }
          return s;
        })
      );

      // Persist to Supabase
      await supabase
        .from('students')
        .update({
          documents_status: isComplete ? 'complete' : 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedStudent.id);

      setNotice({
        type: 'success',
        message: `Requirements audit records updated for ${selectedStudent.last_name}, ${selectedStudent.first_name}.`,
      });
      setSelectedStudent(null);
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Error saving requirement audit.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'LRN',
      'Learner Full Name',
      'Gender',
      'Grade Level',
      'Strand / Program',
      'Section',
      'Form 138 (SF9)',
      'PSA Birth Certificate',
      'Good Moral Certificate',
      '2x2 ID Photo',
      'Overall Compliance Rate (%)',
      'Compliance Status',
      'Registrar Remarks',
    ];

    const rows = filteredStudents.map((s) => {
      const comp = getCompleteness(s);
      return [
        `"${s.lrn || ''}"`,
        `"${s.last_name}, ${s.first_name} ${s.middle_name || ''}"`,
        `"${s.gender || '—'}"`,
        `"${s.grade_level || '—'}"`,
        `"${s.strand || '—'}"`,
        `"${s.section_name || '—'}"`,
        `"${s.form_138_status.toUpperCase()}"`,
        `"${s.psa_birth_status.toUpperCase()}"`,
        `"${s.good_moral_status.toUpperCase()}"`,
        `"${s.two_by_two_status.toUpperCase()}"`,
        `"${comp.pct}%"`,
        `"${comp.isFullyCompliant ? 'FULLY COMPLIANT' : 'DEFICIENT / PENDING'}"`,
        `"${(s.audit_remarks || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `PLSNHS_Documentary_Requirements_Audit_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render Document Status Badge
  const renderStatusBadge = (status: DocStatus, url?: string | null) => {
    if (status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 shadow-xs">
          <CheckCircle className="h-3 w-3 text-emerald-600" /> Verified
        </span>
      );
    }
    if (status === 'submitted') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800 shadow-xs">
          <FileText className="h-3 w-3 text-blue-600" /> Submitted
        </span>
      );
    }
    if (status === 'waived') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-800 shadow-xs">
          Waived / F137
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800 shadow-xs">
        <AlertTriangle className="h-3 w-3 text-rose-600" /> Missing
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* DepEd Institutional Header */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 text-white shadow-md relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
              <ShieldCheck className="h-3.5 w-3.5" />
              DepEd Region VII · Division of City of Naga · School ID: 303035
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white flex items-center gap-3">
              <FileCheck2 className="h-7 w-7 text-amber-400 shrink-0" />
              Documentary Compliance & Requirements Audit
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-emerald-400" />
                Placido L. Señor National High School
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-400" />
                Academic Year 2026–2027
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                SF9 (Form 138), PSA Birth Certificate & Credentials Verification
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center">
            <Link
              to="/registrar/dashboard"
              className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 px-4 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <GraduationCap className="h-4 w-4" /> Registrar Dashboard
            </Link>

            <button
              onClick={handleExportCSV}
              className="flex h-10 items-center gap-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 px-3.5 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
              title="Download Full Documentary Audit Checklist as CSV"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" /> Export CSV
            </button>

            <div className="border-l border-slate-700 pl-2">
              <PageHeaderNotificationSlot />
            </div>
          </div>
        </div>
      </div>

      {notice && (
        <Alert
          type={notice.type}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}

      {/* KPI Stat Cards (6 Live Executive Tiles) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Compliance Rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Compliance Rate</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-display text-emerald-700">
              {stats.overallRate}%
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500 font-medium">Overall submission index</p>
        </div>

        {/* Fully Compliant */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Fully Compliant</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-display text-slate-900">
              {stats.completeCount}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">/ {stats.total}</span>
          </div>
          <p className="mt-0.5 text-[10px] text-emerald-700 font-medium">All 4 credentials cleared</p>
        </div>

        {/* Pending / Incomplete */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Incomplete / Deficient</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span
              className={`text-2xl font-black font-display ${
                stats.incompleteCount > 0 ? 'text-amber-600' : 'text-slate-400'
              }`}
            >
              {stats.incompleteCount}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Learners</span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500 font-medium">Needs follow-up</p>
        </div>

        {/* Missing Form 138 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Missing Form 138</span>
            <FileText className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span
              className={`text-2xl font-black font-display ${
                stats.missing138 > 0 ? 'text-rose-600' : 'text-slate-400'
              }`}
            >
              {stats.missing138}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Cards</span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500 font-medium">SF9 Progress Report</p>
        </div>

        {/* Missing PSA Birth */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Missing PSA Cert</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span
              className={`text-2xl font-black font-display ${
                stats.missingPsa > 0 ? 'text-rose-600' : 'text-slate-400'
              }`}
            >
              {stats.missingPsa}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Certs</span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500 font-medium">PSA / NSO copy</p>
        </div>

        {/* Total Masterlist */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Masterlist</span>
            <Users className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black font-display text-slate-900">
              {stats.total}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Learners</span>
          </div>
          <p className="mt-0.5 text-[10px] text-slate-500 font-medium">Active enrolled pool</p>
        </div>
      </div>

      {/* Control Bar: Filters, Search & View Modes */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Grade Level Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-slate-400" /> Grade Level
            </label>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Grade Levels (7 to 12)</option>
              <option value="Grade 7">Grade 7 - Junior High</option>
              <option value="Grade 8">Grade 8 - Junior High</option>
              <option value="Grade 9">Grade 9 - Junior High</option>
              <option value="Grade 10">Grade 10 - Junior High</option>
              <option value="Grade 11">Grade 11 - Senior High</option>
              <option value="Grade 12">Grade 12 - Senior High</option>
            </select>
          </div>

          {/* Compliance Status Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> Compliance Status
            </label>
            <select
              value={complianceFilter}
              onChange={(e) => setComplianceFilter(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Compliance Statuses</option>
              <option value="complete">Fully Compliant (All 4 Verified)</option>
              <option value="incomplete">Incomplete / Deficient Only</option>
              <option value="missing_138">Deficient in Form 138 (SF9)</option>
              <option value="missing_psa">Deficient in PSA Birth Cert</option>
              <option value="missing_moral">Deficient in Good Moral</option>
            </select>
          </div>

          {/* Focus Tab View */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Document Audit Focus
            </label>
            <div className="flex rounded-xl bg-slate-100 p-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`flex-1 rounded-lg py-1.5 px-2 text-center text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Documents
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('form_138')}
                className={`flex-1 rounded-lg py-1.5 px-2 text-center text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'form_138'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Form 138 (SF9)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('psa')}
                className={`flex-1 rounded-lg py-1.5 px-2 text-center text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'psa'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                PSA Birth Cert
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('good_moral')}
                className={`flex-1 rounded-lg py-1.5 px-2 text-center text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'good_moral'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Good Moral
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('two_by_two')}
                className={`flex-1 rounded-lg py-1.5 px-2 text-center text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === 'two_by_two'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2x2 Photo
              </button>
            </div>
          </div>
        </div>

        {/* Live Search & Quick Filter Pills */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by learner name, LRN, or section..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
            <span className="text-[11px] text-slate-400 font-semibold hidden md:inline">
              Quick Filter:
            </span>
            <button
              onClick={() => {
                setComplianceFilter('incomplete');
                setSearch('');
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Action Required ({stats.incompleteCount})
            </button>
            <button
              onClick={() => {
                setComplianceFilter('complete');
                setSearch('');
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 cursor-pointer"
            >
              Compliant ({stats.completeCount})
            </button>
            {(complianceFilter !== 'all' || gradeFilter !== 'all' || search) && (
              <button
                onClick={() => {
                  setComplianceFilter('all');
                  setGradeFilter('all');
                  setSearch('');
                }}
                className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Documentary Audit Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center text-slate-400">#</th>
                <th className="px-5 py-3.5 min-w-[220px]">Learner Name & LRN</th>
                <th className="px-4 py-3.5 min-w-[150px]">Grade & Section</th>

                {(activeTab === 'all' || activeTab === 'form_138') && (
                  <th className="px-4 py-3.5 text-center min-w-[120px]">
                    Form 138 (SF9)
                    <span className="block text-[9px] font-normal text-slate-400 normal-case">
                      Report Card
                    </span>
                  </th>
                )}

                {(activeTab === 'all' || activeTab === 'psa') && (
                  <th className="px-4 py-3.5 text-center min-w-[120px]">
                    PSA Birth Cert
                    <span className="block text-[9px] font-normal text-slate-400 normal-case">
                      Authenticated
                    </span>
                  </th>
                )}

                {(activeTab === 'all' || activeTab === 'good_moral') && (
                  <th className="px-4 py-3.5 text-center min-w-[120px]">
                    Good Moral
                    <span className="block text-[9px] font-normal text-slate-400 normal-case">
                      Clearance
                    </span>
                  </th>
                )}

                {(activeTab === 'all' || activeTab === 'two_by_two') && (
                  <th className="px-4 py-3.5 text-center min-w-[100px]">
                    2x2 ID Photo
                    <span className="block text-[9px] font-normal text-slate-400 normal-case">
                      White BG
                    </span>
                  </th>
                )}

                <th className="px-4 py-3.5 text-center w-36 font-black text-emerald-800 bg-emerald-50/50">
                  Compliance Status
                  <span className="block text-[9px] font-normal text-emerald-600 normal-case">
                    Audit Score
                  </span>
                </th>

                <th className="px-5 py-3.5 text-right min-w-[150px]">Audit Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400">
                    <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-2"></div>
                    <p className="font-semibold text-slate-600">Loading requirement audit registry...</p>
                    <p className="text-[11px] text-slate-400">Querying DepEd documentary records</p>
                  </td>
                </tr>
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student, idx) => {
                  const comp = getCompleteness(student);

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Row Index */}
                      <td className="px-4 py-3.5 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Learner Name & LRN */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600 border border-slate-200">
                            {student.first_name?.[0]}
                            {student.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                              {student.last_name}, {student.first_name}{' '}
                              {student.middle_name ? student.middle_name[0] + '.' : ''}
                            </p>
                            <span className="font-mono text-[11px] text-slate-500">
                              LRN: {student.lrn || '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Grade & Section */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800">
                          {student.grade_level || 'Grade 11'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-slate-500 font-medium">
                            {student.section_name || 'Almario'}
                          </span>
                          {student.strand && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">
                              {student.strand}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Form 138 */}
                      {(activeTab === 'all' || activeTab === 'form_138') && (
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            {renderStatusBadge(student.form_138_status, student.form_138_url)}
                            {student.form_138_url && (
                              <a
                                href={student.form_138_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                              >
                                View <Eye className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      )}

                      {/* PSA Birth Cert */}
                      {(activeTab === 'all' || activeTab === 'psa') && (
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            {renderStatusBadge(student.psa_birth_status, student.psa_birth_url)}
                            {student.psa_birth_url && (
                              <a
                                href={student.psa_birth_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                              >
                                View <Eye className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Good Moral */}
                      {(activeTab === 'all' || activeTab === 'good_moral') && (
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            {renderStatusBadge(student.good_moral_status, student.good_moral_url)}
                            {student.good_moral_url && (
                              <a
                                href={student.good_moral_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                              >
                                View <Eye className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      )}

                      {/* 2x2 Photo */}
                      {(activeTab === 'all' || activeTab === 'two_by_two') && (
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            {renderStatusBadge(student.two_by_two_status, student.two_by_two_picture_url)}
                            {student.two_by_two_picture_url && (
                              <a
                                href={student.two_by_two_picture_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-0.5"
                              >
                                Photo <Eye className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Overall Compliance */}
                      <td className="px-4 py-3.5 text-center bg-emerald-50/40">
                        <div className="inline-flex flex-col items-center">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span
                              className={`text-xs ${
                                comp.isFullyCompliant ? 'text-emerald-800' : 'text-amber-800'
                              }`}
                            >
                              {comp.score} / 4
                            </span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                                comp.isFullyCompliant
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {comp.pct}%
                            </span>
                          </div>
                          <span
                            className={`text-[10px] font-semibold mt-0.5 ${
                              comp.isFullyCompliant ? 'text-emerald-700' : 'text-amber-700'
                            }`}
                          >
                            {comp.isFullyCompliant ? 'Compliant' : 'Deficient'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap relative">
                        <div className="inline-flex items-center justify-end whitespace-nowrap">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(
                                  activeDropdownId === student.id ? null : student.id
                                );
                              }}
                              className={`inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                                activeDropdownId === student.id
                                  ? 'border-[#1B2A4A] bg-[#1B2A4A] text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>Manage</span>
                              <ChevronDown
                                className={`h-3 w-3 transition-transform duration-200 ${
                                  activeDropdownId === student.id ? 'rotate-180' : ''
                                }`}
                              />
                            </button>

                            {activeDropdownId === student.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownId(null);
                                  }}
                                />
                                <div
                                  className={`absolute right-0 z-50 w-56 rounded-xl border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-black/5 divide-y divide-slate-100 text-left ${
                                    idx >= filteredStudents.length - 2 && filteredStudents.length > 2
                                      ? 'bottom-full mb-1.5 origin-bottom-right'
                                      : 'top-full mt-1.5 origin-top-right'
                                  }`}
                                >
                                  <div className="py-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        handleOpenModal(student);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                                    >
                                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                                      <span>Review / Audit Documents</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        setIdCardSide('both');
                                        setIdCardFlipped(false);
                                        setGeneratingIdStudent(student);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold text-amber-900 hover:bg-amber-50/80 transition-colors cursor-pointer"
                                    >
                                      <CreditCard className="h-3.5 w-3.5 text-amber-600" />
                                      <span>Generate ID</span>
                                    </button>
                                  </div>
                                  <div className="py-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownId(null);
                                        handleVerifyAllSingle(student.id);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                    >
                                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                      <span>Verify All 4 Credentials</span>
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <AlertCircle className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600">No student records match the active criteria.</p>
                    <p className="text-xs text-slate-400">Try clearing the search or adjusting the compliance filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* DepEd Requirement Guidelines Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">DepEd Order No. 3, s. 2018 Policy:</span>
            <span>Senior High School enrolment requires authenticated Form 138/SF9, PSA Birth Certificate, and Certificate of Good Moral.</span>
          </div>
          <div className="flex items-center gap-3 font-medium text-[10px]">
            <span className="flex items-center gap-1 text-emerald-800 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block"></span> Verified & Archived
            </span>
            <span className="flex items-center gap-1 text-blue-800 font-bold">
              <span className="h-2 w-2 rounded-full bg-blue-600 inline-block"></span> Submitted (Awaiting Audit)
            </span>
            <span className="flex items-center gap-1 text-rose-800 font-bold">
              <span className="h-2 w-2 rounded-full bg-rose-600 inline-block"></span> Missing / Unsubmitted
            </span>
          </div>
        </div>
      </div>

      {/* Official Action Controls (Bottom Aligned) */}
      <div className="no-print flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-200">
        <button
          onClick={handleExportCSV}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all cursor-pointer active:scale-98"
          title="Download Full Documentary Audit Checklist as CSV"
        >
          <Download className="h-4 w-4 text-slate-500" />
          <span>Export CSV</span>
        </button>

        <button
          onClick={() => window.print()}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all cursor-pointer active:scale-98"
          title="Print Official DepEd Documentary Verification Sheet"
        >
          <Printer className="h-4 w-4 text-slate-500" />
          <span>Print Sheet</span>
        </button>

        <button
          onClick={handleBatchVerifyAll}
          disabled={saving || loading || filteredStudents.length === 0}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 text-xs font-bold text-white shadow-xs hover:shadow-md disabled:opacity-60 transition-all cursor-pointer active:scale-98"
        >
          {saving ? (
            <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
          ) : (
            <ShieldCheck className="h-4 w-4 shrink-0" />
          )}
          <span>{saving ? 'Verifying...' : 'Batch Verify All'}</span>
        </button>
      </div>

      {/* Document Audit & Inspection Modal (Rendered via Portal so it is always centered in the active viewport) */}
      {selectedStudent &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs transition-opacity"
              onClick={() => setSelectedStudent(null)}
            />

            {/* Modal Dialog */}
            <div className="relative z-10 w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-fade-in">
              {/* Executive Institutional Header */}
              <div className="flex items-center justify-between bg-gradient-to-r from-[#0f1c3f] via-[#1B2A4A] to-[#243B67] px-6 py-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15 shadow-inner">
                    <FileCheck2 className="h-5 w-5 text-[#F5C518]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base font-display tracking-tight text-white">
                        Documentary Audit & Verification
                      </h3>
                      <span className="hidden sm:inline-flex items-center rounded-md bg-white/10 border border-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                        DepEd Form Check
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Official Registrar Enrollment Dossier & Credential Inspection
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="rounded-xl p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 space-y-4 text-xs bg-slate-50/50">
                {/* Learner Identity & Live Compliance Bar */}
                {(() => {
                  const statuses = [
                    modalForm.form_138_status,
                    modalForm.psa_birth_status,
                    modalForm.good_moral_status,
                    modalForm.two_by_two_status,
                  ];
                  const verifiedCount = statuses.filter(
                    (s) => s === 'verified' || s === 'waived'
                  ).length;
                  const isAllCleared = verifiedCount === 4;
                  const isShs =
                    parseInt(
                      String(selectedStudent.grade_level || '').replace(/\D/g, '') || '10',
                      10
                    ) >= 11;

                  return (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1B2A4A] text-[#F5C518] font-black text-sm shadow-xs">
                          {selectedStudent.first_name?.[0]}
                          {selectedStudent.last_name?.[0]}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                              {selectedStudent.last_name}, {selectedStudent.first_name}{' '}
                              {selectedStudent.middle_name || ''}
                            </h4>
                            <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700">
                              LRN: {selectedStudent.lrn || 'N/A'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                            <span className="font-bold text-slate-700">
                              {selectedStudent.grade_level || 'Grade 10'} • Section{' '}
                              {selectedStudent.section_name || 'Unassigned'}
                            </span>
                            <span>•</span>
                            <span>
                              {isShs
                                ? `Strand: ${selectedStudent.strand || 'GAS'}`
                                : 'Junior High School Department (JHS)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:flex-col sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold border ${
                            isAllCleared
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {isAllCleared ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                          )}
                          {verifiedCount} / 4 Credentials Cleared
                        </span>
                        <span className="text-[10.5px] font-semibold text-slate-400">
                          {isAllCleared ? '100% DepEd Audit Compliant' : 'Action / Verification Pending'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* 4 Document Status Cards in a Clean 2x2 Professional Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
                  {[
                    {
                      num: '01',
                      key: 'form_138_status' as const,
                      title: 'Form 138 / SF9 (Report Card)',
                      desc: 'Original progress report card from previous school year.',
                      url: selectedStudent.form_138_url,
                      options: [
                        { value: 'verified' as DocStatus, label: 'Verified' },
                        { value: 'submitted' as DocStatus, label: 'Submitted' },
                        { value: 'missing' as DocStatus, label: 'Missing' },
                        { value: 'waived' as DocStatus, label: 'Waived' },
                      ],
                    },
                    {
                      num: '02',
                      key: 'psa_birth_status' as const,
                      title: 'PSA / NSO Birth Certificate',
                      desc: 'Authenticated copy from the Philippine Statistics Authority.',
                      url: selectedStudent.psa_birth_url,
                      options: [
                        { value: 'verified' as DocStatus, label: 'Verified' },
                        { value: 'submitted' as DocStatus, label: 'Submitted' },
                        { value: 'missing' as DocStatus, label: 'Missing' },
                        { value: 'waived' as DocStatus, label: 'Waived' },
                      ],
                    },
                    {
                      num: '03',
                      key: 'good_moral_status' as const,
                      title: 'Certificate of Good Moral',
                      desc: 'Signed clearance issued by previous principal or guidance.',
                      url: selectedStudent.good_moral_url,
                      options: [
                        { value: 'verified' as DocStatus, label: 'Verified' },
                        { value: 'submitted' as DocStatus, label: 'Submitted' },
                        { value: 'missing' as DocStatus, label: 'Missing' },
                        { value: 'waived' as DocStatus, label: 'Waived' },
                      ],
                    },
                    {
                      num: '04',
                      key: 'two_by_two_status' as const,
                      title: '2×2 Formal ID Photograph',
                      desc: 'Standard 2×2 photo with plain white background.',
                      url: selectedStudent.two_by_two_picture_url,
                      hasGenerateId: true,
                      options: [
                        { value: 'verified' as DocStatus, label: 'Verified' },
                        { value: 'submitted' as DocStatus, label: 'Submitted' },
                        { value: 'missing' as DocStatus, label: 'Missing' },
                        { value: 'waived' as DocStatus, label: 'Waived' },
                      ],
                    },
                  ].map((docItem) => {
                    const currentVal = modalForm[docItem.key];

                    return (
                      <div
                        key={docItem.key}
                        className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 border border-slate-200 font-mono text-[10px] font-extrabold text-[#1B2A4A]">
                              {docItem.num}
                            </span>
                            <div className="min-w-0">
                              <h5 className="font-extrabold text-slate-900 text-xs leading-snug truncate">
                                {docItem.title}
                              </h5>
                              <p className="text-[10.5px] text-slate-500 leading-tight mt-0.5">
                                {docItem.desc}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {docItem.url && (
                              <a
                                href={docItem.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10.5px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                              >
                                <Eye className="h-3 w-3 text-slate-500" />
                                <span>View</span>
                              </a>
                            )}
                            {docItem.hasGenerateId && (
                              <button
                                type="button"
                                onClick={() => {
                                  const st = selectedStudent;
                                  setSelectedStudent(null);
                                  setIdCardSide('both');
                                  setIdCardFlipped(false);
                                  setGeneratingIdStudent(st);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10.5px] font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                              >
                                <CreditCard className="h-3 w-3 text-amber-600" />
                                <span>ID Card</span>
                              </button>
                            )}
                            {!docItem.url && !docItem.hasGenerateId && renderStatusBadge(currentVal)}
                          </div>
                        </div>

                        {/* Segmented One-Click Status Selector Pills */}
                        <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-slate-100/90 p-1 border border-slate-200/70">
                          {docItem.options.map((opt) => {
                            const active = currentVal === opt.value;
                            let activeCls = '';
                            if (active) {
                              if (opt.value === 'verified') {
                                activeCls = 'bg-emerald-600 text-white shadow-2xs';
                              } else if (opt.value === 'submitted') {
                                activeCls = 'bg-blue-600 text-white shadow-2xs';
                              } else if (opt.value === 'missing') {
                                activeCls = 'bg-rose-600 text-white shadow-2xs';
                              } else {
                                activeCls = 'bg-purple-600 text-white shadow-2xs';
                              }
                            } else {
                              activeCls =
                                'text-slate-600 hover:text-slate-900 hover:bg-white/70';
                            }

                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  setModalForm((prev) => ({
                                    ...prev,
                                    [docItem.key]: opt.value,
                                  }))
                                }
                                className={`rounded-lg py-1.5 px-1.5 text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${activeCls}`}
                              >
                                {active && <Check className="h-3 w-3 shrink-0" />}
                                <span className="truncate">{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Registrar Audit Remarks */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs">
                  <label className="block text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-[#1B2A4A]" />
                    Registrar Audit Remarks & Archival Notes
                  </label>
                  <input
                    type="text"
                    value={modalForm.audit_remarks}
                    onChange={(e) =>
                      setModalForm((prev) => ({
                        ...prev,
                        audit_remarks: e.target.value,
                      }))
                    }
                    placeholder="Record document verification notes, promissory notes, or archival timestamps..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-slate-200 bg-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalForm({
                        form_138_status: 'verified',
                        psa_birth_status: 'verified',
                        good_moral_status: 'verified',
                        two_by_two_status: 'verified',
                        audit_remarks:
                          'All documents verified and confirmed compliant on ' +
                          new Date().toLocaleDateString(),
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Mark All as Verified</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const st = selectedStudent;
                      setSelectedStudent(null);
                      setIdCardSide('both');
                      setIdCardFlipped(false);
                      setGeneratingIdStudent(st);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-all cursor-pointer"
                  >
                    <CreditCard className="h-3.5 w-3.5 text-amber-600" />
                    <span>Generate Official ID</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveModal}
                    disabled={saving}
                    className="rounded-xl bg-[#1B2A4A] hover:bg-[#0f1c3f] px-5 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {saving ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5 text-[#F5C518]" />
                    )}
                    <span>Save Audit Record</span>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* QUICK GENERATE ID MODAL */}
      {generatingIdStudent && (
        <Modal
          isOpen={!!generatingIdStudent}
          onClose={() => setGeneratingIdStudent(null)}
          title={`Official Student ID: ${generatingIdStudent.first_name} ${generatingIdStudent.last_name}`}
          subtitle={`LRN: ${generatingIdStudent.lrn || '—'} · ${generatingIdStudent.grade_level || 'Grade 11'} ${generatingIdStudent.section_name ? `· ${generatingIdStudent.section_name}` : ''}`}
          maxWidth="5xl"
        >
          <div className="space-y-4">
            {/* Action Bar Header */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
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

              <div className="flex items-center gap-2 no-print flex-wrap">
                <button
                  type="button"
                  disabled={idDownloading}
                  onClick={() =>
                    exportQuickIdAsImage(
                      'reqQuickCardFront',
                      `${generatingIdStudent.last_name}_${generatingIdStudent.first_name}_Front.png`
                    )
                  }
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>PNG Front</span>
                </button>

                <button
                  type="button"
                  disabled={idDownloading}
                  onClick={() =>
                    exportQuickIdAsImage(
                      'reqQuickCardBack',
                      `${generatingIdStudent.last_name}_${generatingIdStudent.first_name}_Back.png`
                    )
                  }
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>PNG Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => printOfficialStudentId('reqQuickCardStage')}
                  className="px-4 py-1.5 rounded-xl bg-[#152e69] hover:bg-[#0e1a3c] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <Printer className="h-3.5 w-3.5 text-[#F5C518]" />
                  <span>Print Official ID</span>
                </button>
              </div>
            </div>

            {/* CR80 Landscape ID Card Preview Stage */}
            <div
              className="flex justify-center items-center py-6 px-4 overflow-x-auto bg-gradient-to-br from-slate-950 via-[#0a183d] to-slate-900 rounded-2xl border border-slate-800 shadow-2xl"
              id="reqQuickCardStage"
            >
              <StudentIdCard
                data={{
                  id: generatingIdStudent.id,
                  student_id: generatingIdStudent.id,
                  fullname: `${generatingIdStudent.first_name} ${generatingIdStudent.last_name}`.trim(),
                  first_name: generatingIdStudent.first_name,
                  last_name: generatingIdStudent.last_name,
                  lrn: generatingIdStudent.lrn || '',
                  grade_level: generatingIdStudent.grade_level || 'Grade 11',
                  level_category:
                    parseInt(String(generatingIdStudent.grade_level).replace(/\D/g, '') || '11', 10) >= 11
                      ? 'Senior High'
                      : 'Junior High',
                  strand: generatingIdStudent.strand || '',
                  parent_name: generatingIdStudent.guardian_name || '',
                  parent_contact: generatingIdStudent.guardian_contact || '',
                  school_year: '2026-2027',
                  principal_name: 'Dr. Ryan R. Quiroga',
                  photo_url:
                    generatingIdStudent.two_by_two_picture_url ||
                    (generatingIdStudent as any).photo_url ||
                    (generatingIdStudent as any).avatar_url ||
                    '',
                }}
                side={idCardSide}
                flipped={idCardFlipped}
                layout={idCardSide === 'both' ? 'row' : 'column'}
                scale={idCardSide === 'both' ? 0.82 : 0.95}
                className="transparent-stage"
                frontId="reqQuickCardFront"
                backId="reqQuickCardBack"
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
                    const st = generatingIdStudent;
                    setGeneratingIdStudent(null);
                    const params = new URLSearchParams({
                      id: String(st.id || ''),
                      lrn: st.lrn || '',
                      name: `${st.first_name} ${st.last_name}`.trim(),
                      grade: st.grade_level || 'Grade 11',
                      strand: st.strand || '',
                      guardian: st.guardian_name || '',
                      contact: st.guardian_contact || '',
                      photo: st.two_by_two_picture_url || '',
                    });
                    const base = window.location.pathname.startsWith('/registrar') ? '/registrar/generate-id' : '/admin/generate-id';
                    navigate(`${base}?${params.toString()}`);
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
    </div>
  );
};
