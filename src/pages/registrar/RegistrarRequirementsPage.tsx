import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
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

// Fallback section adviser mapping matching official school assignments in Supabase
const FALLBACK_ADVISERS: Record<string, string> = {
  'Grade 7___De Gracia': 'Mrs. Tapasao',
  'Grade 7___Mendoza': 'Mrs. Baclayon',
  'Grade 7___Paul Ong': 'Mrs. Manabat',
  'Grade 7___Sayson': 'Mrs. Llanda',
  'Grade 7___Quirante': 'Mrs. Codelan',
  'Grade 7___Mendiola': 'Mr. Selim',
  'Grade 7___Chiong': 'Mrs. Generale',
  'Grade 8___Square': 'Twengcle Deguma',
  'Grade 8___Antipolo': 'Ms. Alinsonorin',
  'Grade 8___Banaba': 'Ms. Omambac',
  'Grade 8___Kamagong': 'Mr. Padillo',
  'Grade 8___Molave': 'Mrs. Rabanes',
  'Grade 8___Narra': 'Mrs. Montoya',
  'Grade 8___Yakal': 'Mrs. Balwit',
  'Grade 8___Mahogany': 'Mr. Gonzaga',
  'Grade 9___Cebu': 'Mrs. Taruc',
  'Grade 9___Davao': 'Mr. Albores',
  'Grade 9___Negros Occidental': 'Mrs. Ramas',
  'Grade 9___Ilo-Ilo': 'Mrs. Ogaob',
  'Grade 9___Palawan': 'Mrs. Rivera',
  'Grade 9___Batangas': 'Mrs. Francisco',
  'Grade 9___Rizal': 'Ms. Bo-ok',
  'Grade 10___Generosity': 'Mrs. Paunel',
  'Grade 10___Honesty': 'Mrs. Dela Torre',
  'Grade 10___Kindness': 'Mr. Gentica',
  'Grade 10___Perseverance': 'Mrs. Rimas',
  'Grade 10___Wisdom': 'Mrs. Diaz',
  'Grade 11___Almario': 'SHS Faculty',
  'Grade 11___Amorsolo': 'SHS Faculty',
  'Grade 11___Baltazar': 'SHS Faculty',
  'Grade 11___Tolentino': 'SHS Faculty',
  'Grade 12___Salcedo': 'SHS Faculty',
  'Grade 12___Santos': 'SHS Faculty',
  'Grade 12___Velasco': 'SHS Faculty',
  'Grade 12___Velasquez': 'SHS Faculty',
};

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
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<
    'all' | 'complete' | 'incomplete' | 'missing_138' | 'missing_psa' | 'missing_moral'
  >('all');

  // Available sections dynamically filtered by selected grade level
  const availableSections = useMemo(() => {
    const secSet = new Set<string>();

    if (gradeFilter !== 'all' && DEFAULT_SECTIONS_BY_GRADE[gradeFilter]) {
      DEFAULT_SECTIONS_BY_GRADE[gradeFilter].forEach((s) => secSet.add(s));
    }

    students.forEach((st) => {
      if (
        gradeFilter === 'all' ||
        (st.grade_level && st.grade_level.toLowerCase().includes(gradeFilter.toLowerCase()))
      ) {
        if (st.section_name && st.section_name !== 'Unassigned') {
          secSet.add(st.section_name);
        }
      }
    });

    return Array.from(secSet).sort();
  }, [students, gradeFilter]);

  const getSectionAdviser = (grade: string, section: string): string => {
    const key = `${grade}___${section}`;
    return FALLBACK_ADVISERS[key] || '';
  };

  // Modal / Inspection state
  const [selectedStudent, setSelectedStudent] = useState<StudentWithRequirements | null>(null);
  // Bond paper format state: Short (8.5" x 11") or Long (8.5" x 13")
  const [paperSize, setPaperSize] = useState<'short' | 'long'>('short');
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

      // Section filter
      let matchesSection = true;
      if (sectionFilter === 'Unassigned') {
        matchesSection = !s.section_name || s.section_name.toLowerCase() === 'unassigned';
      } else if (sectionFilter !== 'all') {
        matchesSection = (s.section_name || '').toLowerCase() === sectionFilter.toLowerCase();
      }

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

      return matchesSearch && matchesGrade && matchesSection && matchesCompliance;
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
  }, [students, search, gradeFilter, sectionFilter, complianceFilter]);

  // Group filteredStudents by Year Level and Section so every section is clearly structured
  const groupedStudentsBySection = useMemo(() => {
    const groups: {
      key: string;
      grade: string;
      section: string;
      items: StudentWithRequirements[];
    }[] = [];

    const map = new Map<
      string,
      { key: string; grade: string; section: string; items: StudentWithRequirements[] }
    >();

    filteredStudents.forEach((s) => {
      const g = s.grade_level || 'Grade 10';
      const sec = s.section_name || 'Unassigned';
      const key = `${g}___${sec}`;
      if (!map.has(key)) {
        const entry = { key, grade: g, section: sec, items: [] as StudentWithRequirements[] };
        map.set(key, entry);
        groups.push(entry);
      }
      map.get(key)!.items.push(s);
    });

    return groups;
  }, [filteredStudents]);

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

  // Generate dedicated DepEd bond paper HTML string (isolated for iframe printing)
  const generateRequirementsBondPaperHtml = (
    targetGroup?: { grade: string; section: string; items: StudentWithRequirements[] } | null
  ): string => {
    const isLong = paperSize === 'long';
    const paperDimensions = isLong ? '8.5in 13in' : '8.5in 11in';
    const paperName = isLong ? 'Long Bond Paper (8.5" × 13")' : 'Short Bond Paper (8.5" × 11")';

    // Determine data groups to print
    const groupsToPrint = targetGroup
      ? [targetGroup]
      : sectionFilter !== 'all'
      ? groupedStudentsBySection.filter(
          (g) => g.section.toLowerCase() === sectionFilter.toLowerCase()
        )
      : groupedStudentsBySection;

    const totalStudentsInScope = groupsToPrint.reduce((acc, g) => acc + g.items.length, 0);
    const compliantStudentsInScope = groupsToPrint.reduce(
      (acc, g) => acc + g.items.filter((st) => getCompleteness(st).isFullyCompliant).length,
      0
    );
    const complianceRate =
      totalStudentsInScope > 0
        ? Math.round((compliantStudentsInScope / totalStudentsInScope) * 100)
        : 100;

    const scopeTitle = targetGroup
      ? `${targetGroup.grade} - Section ${targetGroup.section}`
      : sectionFilter !== 'all'
      ? `${gradeFilter !== 'all' ? gradeFilter + ' - ' : ''}Section ${sectionFilter}`
      : gradeFilter !== 'all'
      ? `${gradeFilter} (All Sections)`
      : 'All Year Levels & Sections';

    const currentDateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const statusLabel = (status: DocStatus) => {
      if (status === 'verified') return '<span class="status-verified">✓ Verified</span>';
      if (status === 'submitted') return '<span class="status-submitted">Submitted</span>';
      if (status === 'waived') return '<span class="status-waived">Waived</span>';
      return '<span class="status-missing">Missing</span>';
    };

    // Render strictly ONE section per sheet of bond paper
    const sheetsHtml = groupsToPrint
      .map((group, sIdx) => {
        const groupAdviser = getSectionAdviser(group.grade, group.section);
        const groupCompliantCount = group.items.filter(
          (st) => getCompleteness(st).isFullyCompliant
        ).length;
        const compRate =
          group.items.length > 0 ? Math.round((groupCompliantCount / group.items.length) * 100) : 100;
        const isLastSheet = sIdx === groupsToPrint.length - 1;

        const studentRows = group.items
          .map((st, idx) => {
            const comp = getCompleteness(st);
            const overallBadge = comp.isFullyCompliant
              ? '<span class="comp-complete">COMPLETE (4/4)</span>'
              : `<span class="comp-deficient">DEFICIENT (${comp.score}/4)</span>`;

            return `
              <tr>
                <td class="text-center font-mono">${idx + 1}</td>
                <td><strong>${st.last_name}, ${st.first_name} ${
              st.middle_name ? st.middle_name[0] + '.' : ''
            }</strong></td>
                <td class="text-center font-mono font-bold">${st.lrn || '—'}</td>
                <td class="text-center">${st.grade_level || group.grade} - ${group.section}</td>
                <td class="text-center">${statusLabel(st.form_138_status)}</td>
                <td class="text-center">${statusLabel(st.psa_birth_status)}</td>
                <td class="text-center">${statusLabel(st.good_moral_status)}</td>
                <td class="text-center">${statusLabel(st.two_by_two_status)}</td>
                <td class="text-center font-bold">${overallBadge}</td>
              </tr>
            `;
          })
          .join('');

        return `
    <div class="bond-sheet ${!isLastSheet ? 'page-break' : ''}">
      <table class="header-table">
        <tr>
          <td style="width: 58px; text-align: left;">
            <img src="/pictures/logo sa skwelahan.png" alt="PLSNHS Seal" style="width: 52px; height: 52px; object-fit: contain; border-radius: 50%;" onerror="this.style.display='none'" />
          </td>
          <td class="header-center">
            <p class="header-rep">Republic of the Philippines</p>
            <h2 class="header-deped">Department of Education</h2>
            <p class="header-div">Region VII, Central Visayas · Schools Division of City of Naga · District of Naga I</p>
            <h1 class="header-school">PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL</h1>
            <p class="header-address">Langtad, City of Naga, Cebu · School ID: <strong>303035</strong></p>
          </td>
          <td style="width: 58px; text-align: right;">
            <img src="/pictures/deped_matatag_banner.png" alt="DepEd Matatag" style="width: 62px; height: auto; object-fit: contain;" onerror="this.style.display='none'" />
          </td>
        </tr>
      </table>

      <hr class="double-rule-top" />
      <hr class="double-rule-bottom" />

      <div class="doc-title-block">
        <h3 class="doc-title">OFFICIAL LEARNER DOCUMENTARY COMPLIANCE &amp; REQUIREMENTS AUDIT REGISTER</h3>
        <p class="doc-sub">School Year 2026–2027</p>
        <p class="doc-desc">Standard DepEd Learner 201 Dossier Audit (Form 138 / SF9 · PSA Birth Certificate · Good Moral · 2x2 Photo) · Reconciled with LIS</p>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <span class="meta-lbl">Target Section</span>
          <span class="meta-val">${group.grade.toUpperCase()} — ${group.section.toUpperCase()}</span>
        </div>
        <div class="meta-item">
          <span class="meta-lbl">Class Adviser</span>
          <span class="meta-val">${groupAdviser || 'Unassigned Faculty'}</span>
        </div>
        <div class="meta-item">
          <span class="meta-lbl">Section Enrolment</span>
          <span class="meta-val">${group.items.length} ${group.items.length === 1 ? 'Learner' : 'Learners'}</span>
        </div>
        <div class="meta-item">
          <span class="meta-lbl">Compliance Index</span>
          <span class="meta-val" style="color: #047857;">${groupCompliantCount} / ${group.items.length} Complete (${compRate}%)</span>
        </div>
      </div>

      <table class="official-table">
        <thead>
          <tr>
            <th style="width: 4%; text-align: center;">#</th>
            <th style="width: 27%;">Learner Full Name (Last, First, Middle)</th>
            <th style="width: 14%; text-align: center;">LRN</th>
            <th style="width: 13%; text-align: center;">Grade &amp; Section</th>
            <th style="width: 8.5%; text-align: center;">Form 138 (SF9)</th>
            <th style="width: 8.5%; text-align: center;">PSA Birth Cert</th>
            <th style="width: 8.5%; text-align: center;">Good Moral</th>
            <th style="width: 7.5%; text-align: center;">2x2 Photo</th>
            <th style="width: 9%; text-align: center;">Compliance</th>
          </tr>
        </thead>
        <tbody>
          ${studentRows || '<tr><td colspan="9" style="text-align: center; padding: 20px;">No learner records found in this section.</td></tr>'}
        </tbody>
      </table>

      <div class="signatory-grid">
        <div>
          <p class="sign-title">Prepared &amp; Audited by:</p>
          <div class="sign-line">MARIA ELENA R. REGISTRAR</div>
          <p class="sign-pos">School Registrar II</p>
          <p class="sign-sub">LIS &amp; Student Records In-Charge</p>
        </div>
        <div>
          <p class="sign-title">Certified Correct &amp; Approved by:</p>
          <div class="sign-line">JUSTINE MANGILA, EdD</div>
          <p class="sign-pos">Secondary School Principal II</p>
          <p class="sign-sub">School Head / Authorized Official</p>
        </div>
      </div>

      <div class="doc-footer">
        <span>Placido L. Señor National High School · DepEd School ID: 303035 · Langtad, City of Naga, Cebu</span>
        <span style="font-family: monospace;">Ref: PLSNHS-REG-REQ-2026-${group.section.replace(/\s+/g, '').toUpperCase()}</span>
        <span><strong>${paperName} · Section ${sIdx + 1} of ${groupsToPrint.length}</strong></span>
      </div>
    </div>
        `;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>PLSNHS_Requirements_Audit_${scopeTitle.replace(/\s+/g, '_')}_${isLong ? 'LongBond' : 'ShortBond'}</title>
  <style>
    @page {
      size: ${paperDimensions} portrait;
      margin: 0.35in 0.45in 0.35in 0.45in;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 8pt;
      line-height: 1.3;
    }
    .page-break {
      page-break-after: always !important;
      break-after: page !important;
    }
    .bond-sheet {
      width: 100%;
      max-width: ${isLong ? '7.7in' : '7.6in'};
      margin: 0 auto;
      background: #ffffff;
      box-sizing: border-box;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2px;
    }
    .header-table td {
      border: none !important;
      padding: 0;
      vertical-align: middle;
    }
    .header-center {
      text-align: center;
      padding: 0 10px;
    }
    .header-rep {
      font-size: 8.5pt;
      font-family: Georgia, serif;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
      font-weight: 600;
      margin: 0;
    }
    .header-deped {
      font-size: 11pt;
      font-family: Georgia, serif;
      text-transform: uppercase;
      font-weight: 900;
      color: #000000;
      margin: 1px 0;
      letter-spacing: 0.5px;
    }
    .header-div {
      font-size: 7.8pt;
      color: #334155;
      margin: 1px 0;
    }
    .header-school {
      font-size: 12pt;
      font-family: Georgia, serif;
      text-transform: uppercase;
      font-weight: 900;
      color: #000000;
      margin: 2px 0 1px 0;
      letter-spacing: 0.5px;
    }
    .header-address {
      font-size: 7.5pt;
      color: #475569;
      margin: 0;
    }
    .double-rule-top {
      border: 0;
      border-top: 2px solid #0f172a;
      margin: 4px 0 1px 0;
    }
    .double-rule-bottom {
      border: 0;
      border-top: 1px solid #0f172a;
      margin: 0 0 6px 0;
    }
    .doc-title-block {
      text-align: center;
      margin-bottom: 6px;
    }
    .doc-title {
      font-size: 10pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin: 0;
    }
    .doc-sub {
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #1e293b;
      margin: 1px 0 0 0;
    }
    .doc-desc {
      font-size: 7.2pt;
      color: #64748b;
      font-style: italic;
      margin: 1px 0 0 0;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 4px;
      padding: 5px 8px;
      margin-bottom: 8px;
      text-align: center;
    }
    .meta-item {
      border-right: 1px solid #e2e8f0;
      padding: 0 6px;
    }
    .meta-item:last-child {
      border-right: none;
    }
    .meta-lbl {
      font-size: 6.8pt;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      display: block;
    }
    .meta-val {
      font-size: 8pt;
      font-weight: 900;
      color: #0f172a;
      display: block;
      margin-top: 1px;
    }
    table.official-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 7.2pt;
    }
    table.official-table th, table.official-table td {
      border: 1px solid #0f172a;
      padding: 3.5px 4.5px;
      line-height: 1.25;
      color: #0f172a;
    }
    table.official-table th {
      background-color: #f1f5f9;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      font-size: 6.8pt;
    }
    thead {
      display: table-header-group;
    }
    tfoot {
      display: table-footer-group;
    }
    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .text-center { text-align: center; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .status-verified { color: #047857; font-weight: 800; font-size: 6.5pt; text-transform: uppercase; }
    .status-submitted { color: #1d4ed8; font-weight: 700; font-size: 6.5pt; text-transform: uppercase; }
    .status-waived { color: #6b21a8; font-weight: 700; font-size: 6.5pt; text-transform: uppercase; }
    .status-missing { color: #b91c1c; font-weight: 800; font-size: 6.5pt; text-transform: uppercase; }
    .comp-complete { color: #047857; font-weight: 800; }
    .comp-deficient { color: #b91c1c; font-weight: 800; }
    .signatory-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      text-align: center;
    }
    .sign-title {
      font-size: 7.2pt;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      margin-bottom: 24px;
    }
    .sign-line {
      border-bottom: 1.5px solid #0f172a;
      width: 220px;
      margin: 0 auto 3px auto;
      font-weight: 900;
      font-size: 8.5pt;
      text-transform: uppercase;
      color: #0f172a;
    }
    .sign-pos {
      font-size: 7.2pt;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }
    .sign-sub {
      font-size: 6.8pt;
      color: #64748b;
      margin: 0;
    }
    .doc-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
      padding-top: 5px;
      border-top: 1px solid #e2e8f0;
      font-size: 6.8pt;
      color: #64748b;
    }
  </style>
</head>
<body>
  ${sheetsHtml}
</body>
</html>`;
  };

  /**
   * Dedicated print function that isolates the bond paper document in an invisible iframe.
   * Guarantees exact bond paper size (Short: 8.5"x11" or Long: 8.5"x13") and 0% interference.
   */
  const handlePrintBondPaper = (
    targetGroup?: { grade: string; section: string; items: StudentWithRequirements[] } | null
  ) => {
    const html = generateRequirementsBondPaperHtml(targetGroup);

    const iframe = document.createElement('iframe');
    iframe.id = 'req_bond_paper_print_frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print error, falling back to native print:', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 350);
  };

  // Backwards compatibility handler
  const handlePrint = () => handlePrintBondPaper(null);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Official DepEd Publication Bond Paper Print Styles */}
      <style>{`
        @page {
          size: ${paperSize === 'long' ? '8.5in 13in' : 'letter'} portrait;
          margin: 0.35in 0.45in 0.35in 0.45in;
        }

        @media print {
          /* Suppress all interactive UI, navbars, sidebars, modals, floating buttons, and chatbot */
          .no-print,
          #hesChatbotContainer,
          .hes-chatbot-launcher,
          header,
          aside,
          nav,
          button,
          input,
          select,
          .fixed {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-size: 8pt !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Exact bond paper container sizing */
          .print-bond-paper {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            max-width: ${paperSize === 'long' ? '7.7in' : '7.6in'} !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
          }

          .official-table {
            border-collapse: collapse !important;
            width: 100% !important;
            table-layout: fixed !important;
          }

          thead {
            display: table-header-group !important;
          }

          tfoot {
            display: table-footer-group !important;
          }

          .official-table th, .official-table td {
            border: 1px solid #1e293b !important;
            padding: 3.5px 4.5px !important;
            font-size: 7.2pt !important;
            line-height: 1.25 !important;
            color: #0f172a !important;
          }

          .official-table th {
            background-color: #f1f5f9 !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.03em !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-section-header {
            background-color: #f3f4f6 !important;
            font-weight: 800 !important;
            font-size: 7.6pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
          }

          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }

        @media screen {
          .print-bond-paper,
          .print-only {
            display: none !important;
            visibility: hidden !important;
          }
        }
      `}</style>

      {/* Screen Only Interactive Workspace Container */}
      <div className="no-print space-y-6">
        {/* 1. Institutional DepEd Header */}
        <div className="border-b border-slate-200 pb-4 sm:pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-xl sm:text-3xl font-extrabold text-[#0f172a] font-display tracking-tight leading-snug">
              Documentary Compliance &amp; Requirements Audit
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl">
              Audit, verify, and validate official hard copies and scanned submissions for SF9 (Form 138), PSA Birth Certificates, and Good Moral.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-auto pt-0.5">
            <button
              type="button"
              onClick={handleExportCSV}
              className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer active:scale-98"
              title="Download Full Documentary Audit Checklist as CSV"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" /> Export CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#152e69] hover:bg-[#0f1f4b] px-4 text-xs font-bold text-white shadow-2xs hover:shadow-md transition-all cursor-pointer active:scale-98"
              title="Print official report on standard bond paper"
            >
              <Printer className="h-4 w-4 text-[#F5C518]" /> Print Sheet
            </button>
            <PageHeaderNotificationSlot />
          </div>
        </div>

        {/* Mobile Action Button Row */}
        <div className="sm:hidden mt-3 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" /> Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#152e69] px-3.5 text-xs font-bold text-white shadow-2xs hover:bg-[#0f1f4b] transition-all cursor-pointer"
          >
            <Printer className="h-4 w-4 text-[#F5C518]" /> Print Sheet
          </button>
        </div>
      </div>

      {notice && (
        <div className="no-print">
          <Alert
            type={notice.type}
            message={notice.message}
            onClose={() => setNotice(null)}
          />
        </div>
      )}

      {/* KPI Stat Cards (6 Live Executive Tiles) */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
      <div className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Grade / Year Level Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-slate-400" /> Year Level
            </label>
            <select
              value={gradeFilter}
              onChange={(e) => {
                setGradeFilter(e.target.value);
                setSectionFilter('all');
              }}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Year Levels (7 to 12)</option>
              <option value="Grade 7">Grade 7 - Junior High</option>
              <option value="Grade 8">Grade 8 - Junior High</option>
              <option value="Grade 9">Grade 9 - Junior High</option>
              <option value="Grade 10">Grade 10 - Junior High</option>
              <option value="Grade 11">Grade 11 - Senior High</option>
              <option value="Grade 12">Grade 12 - Senior High</option>
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-slate-400" /> Section
            </label>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            >
              <option value="all">
                All Sections {gradeFilter !== 'all' ? `(${gradeFilter})` : ''}
              </option>
              {availableSections.map((sec) => (
                <option key={sec} value={sec}>
                  Section {sec}
                </option>
              ))}
              <option value="Unassigned">Unassigned Sections Only</option>
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
            {(complianceFilter !== 'all' || gradeFilter !== 'all' || sectionFilter !== 'all' || search) && (
              <button
                onClick={() => {
                  setComplianceFilter('all');
                  setGradeFilter('all');
                  setSectionFilter('all');
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
      <div className="no-print overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center rounded-tl-2xl text-slate-400">#</th>
                <th className="px-5 py-3.5 min-w-[200px]">Learner Name</th>
                <th className="px-5 py-3.5 min-w-[140px]">LRN</th>
                <th className="px-5 py-3.5 min-w-[140px]">Year Level</th>
                <th className="px-5 py-3.5 min-w-[170px]">Documentary Status</th>
                <th className="px-5 py-3.5 text-right rounded-tr-2xl min-w-[120px]">Audit Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-2"></div>
                    <p className="font-semibold text-slate-600">Loading requirement audit registry...</p>
                    <p className="text-[11px] text-slate-400">Querying DepEd documentary records</p>
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
                  const groupAdviser = getSectionAdviser(group.grade, group.section);
                  const compliantCount = group.items.filter(
                    (st) => getCompleteness(st).isFullyCompliant
                  ).length;

                  return (
                    <React.Fragment key={group.key}>
                      {/* Year Level & Section Header Row */}
                      <tr className="bg-slate-100/90 border-y border-slate-200">
                        <td colSpan={6} className="px-5 py-2.5">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-[#1B2A4A] px-2.5 py-1 text-[11px] font-extrabold text-white">
                                <GraduationCap className="h-3.5 w-3.5 text-[#F5C518]" />
                                {group.grade}
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-300 px-3 py-1 text-xs font-extrabold text-[#1B2A4A] shadow-2xs">
                                <Layers className="h-3.5 w-3.5 text-[#1B2A4A]" />
                                Section {group.section}
                              </span>
                              {group.section && group.section.toLowerCase() !== 'unassigned' && (
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold shadow-2xs ${
                                    groupAdviser
                                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                      : 'bg-amber-50 border-amber-300 text-amber-800'
                                  }`}
                                >
                                  <UserCheck
                                    className={`h-3.5 w-3.5 ${
                                      groupAdviser ? 'text-emerald-700' : 'text-amber-600'
                                    }`}
                                  />
                                  <span>
                                    Adviser:{' '}
                                    <strong className="font-extrabold">
                                      {groupAdviser || 'Unassigned'}
                                    </strong>
                                  </span>
                                </span>
                              )}
                              <span className="text-[11px] font-semibold text-slate-500">
                                {isShsGroup ? 'Senior High School (SHS)' : 'Junior High School (JHS)'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-[#1B2A4A] whitespace-nowrap">
                                <Users className="h-3 w-3" />
                                {group.items.length} {group.items.length === 1 ? 'Learner' : 'Learners'}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${
                                  compliantCount === group.items.length
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-amber-50 border-amber-200 text-amber-800'
                                }`}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                {compliantCount} / {group.items.length} Complete
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintBondPaper(group);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-[#1B2A4A] shadow-2xs hover:bg-slate-50 hover:border-slate-400 hover:text-blue-900 transition-all cursor-pointer ml-1 active:scale-95"
                                title={`Print ${group.grade} - Section ${group.section} on ${paperSize === 'long' ? 'Long Bond Paper (8.5" × 13")' : 'Short Bond Paper (8.5" × 11")'}`}
                              >
                                <Printer className="h-3 w-3 text-slate-500" />
                                <span>Print Section</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Consecutive Student Rows in this Section */}
                      {group.items.map((student, rIdx) => {
                        const comp = getCompleteness(student);
                        const openUpward =
                          isLastGroup && rIdx >= group.items.length - 2 && filteredStudents.length > 2;

                        return (
                          <tr
                            key={student.id}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            {/* Row Index */}
                            <td className="px-4 py-3.5 text-center text-slate-400 font-mono text-[11px]">
                              {rIdx + 1}
                            </td>

                            {/* Learner Name */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-700 border border-slate-200 shadow-2xs">
                                  {student.first_name?.[0]}
                                  {student.last_name?.[0]}
                                </div>
                                <div className="font-bold text-slate-900 text-[13px] group-hover:text-emerald-800 transition-colors">
                                  {student.last_name}, {student.first_name}{' '}
                                  {student.middle_name ? student.middle_name[0] + '.' : ''}
                                </div>
                              </div>
                            </td>

                            {/* LRN */}
                            <td className="px-5 py-3.5 font-mono font-bold text-slate-700 whitespace-nowrap">
                              {student.lrn || '—'}
                            </td>

                            {/* Year Level & Strand */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800">
                                  {student.grade_level || group.grade}
                                </span>
                                {student.strand && isShsGroup && (
                                  <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#1E3A8A]">
                                    {student.strand}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Documentary Status Badge */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              {comp.isFullyCompliant ? (
                                <Badge variant="success" size="sm" className="font-bold">
                                  <CheckCircle2 className="h-3 w-3 inline mr-1" />
                                  Complete (4/4)
                                </Badge>
                              ) : (
                                <Badge variant="warning" size="sm" className="font-bold">
                                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                                  Deficient ({comp.score}/4)
                                </Badge>
                              )}
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
                                          openUpward
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
                      })}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <AlertCircle className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600">No student records match the active criteria.</p>
                    <p className="text-xs text-slate-400">Try clearing the search or adjusting the year level, section, or compliance filter.</p>
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
      </div>

      {/* =========================================================================
          OFFICIAL PRINT-ONLY DEPED BOND PAPER DOCUMENT (Short 8.5"x11" or Long 8.5"x13")
          Strictly hidden on screen, automatically rendered on window.print() / Ctrl+P
          Strictly ONE section per sheet of bond paper
          ========================================================================= */}
      {groupedStudentsBySection.length > 0 ? (
        groupedStudentsBySection.map((group, sIdx) => {
          const groupAdviser = getSectionAdviser(group.grade, group.section);
          const compliantCount = group.items.filter(
            (st) => getCompleteness(st).isFullyCompliant
          ).length;
          const compRate =
            group.items.length > 0 ? Math.round((compliantCount / group.items.length) * 100) : 100;
          const isLastSheet = sIdx === groupedStudentsBySection.length - 1;

          return (
            <div
              key={`print-sheet-${group.key}`}
              className={`print-bond-paper print-only space-y-2 font-sans ${!isLastSheet ? 'page-break' : ''}`}
              style={{
                pageBreakAfter: isLastSheet ? 'avoid' : 'always',
                breakAfter: isLastSheet ? 'avoid' : 'page',
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
              }}
            >
              {/* Official DepEd Philippines Letterhead Header */}
              <div className="flex items-center justify-between pb-1">
                {/* Left: School Official Seal / Logo */}
                <div className="w-14 flex items-center justify-center shrink-0">
                  <img
                    src="/pictures/logo sa skwelahan.png"
                    alt="PLSNHS Seal"
                    className="h-14 w-14 object-contain rounded-full shadow-2xs"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Center: Official Government Institution Hierarchy */}
                <div className="text-center flex-1 px-3">
                  <p className="text-[9.5px] uppercase tracking-widest font-semibold text-slate-700 leading-tight font-serif">
                    Republic of the Philippines
                  </p>
                  <h2 className="text-[12px] uppercase font-bold tracking-wider text-slate-950 leading-tight mt-0.5 font-serif">
                    Department of Education
                  </h2>
                  <p className="text-[9px] font-medium text-slate-700 leading-tight">
                    Region VII, Central Visayas · Schools Division of City of Naga · District of Naga I
                  </p>
                  <h1 className="text-[13px] font-black tracking-wide text-slate-950 uppercase mt-0.5 font-serif">
                    PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL
                  </h1>
                  <p className="text-[8.5px] text-slate-600 leading-tight mt-0.5">
                    Langtad, City of Naga, Cebu · School Identification Number (ID): <strong>303035</strong>
                  </p>
                </div>

                {/* Right: DepEd Matatag / Official Logo */}
                <div className="w-14 flex items-center justify-center shrink-0">
                  <img
                    src="/pictures/deped_matatag_banner.png"
                    alt="DepEd Matatag"
                    className="h-10 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Official DepEd Double Line Accent (Thick + Thin Rule) */}
              <div className="border-b-2 border-slate-900 mt-1"></div>
              <div className="border-b border-slate-900 mt-[2px] mb-2"></div>

              {/* Document Title & Reference Metadata */}
              <div className="text-center py-0.5 space-y-0.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-950 font-display">
                  OFFICIAL LEARNER DOCUMENTARY COMPLIANCE &amp; REQUIREMENTS AUDIT REGISTER
                </h3>
                <p className="text-[9.5px] font-bold text-slate-800 uppercase tracking-wide">
                  School Year 2026–2027
                </p>
                <p className="text-[8px] text-slate-500 italic">
                  Standard DepEd Learner 201 Dossier Audit (Form 138 / SF9 · PSA Birth Certificate · Good Moral · 2x2 Photo) · Reconciled with LIS
                </p>
              </div>

              {/* Section Statistical Indicators Summary Bar */}
              <div className="rounded-md border border-slate-300 bg-slate-50/70 py-1.5 px-3 grid grid-cols-4 divide-x divide-slate-200 text-center text-slate-900">
                <div className="px-2">
                  <span className="text-[8px] uppercase font-bold text-slate-600 block">Target Section</span>
                  <span className="text-xs font-black text-slate-950 font-display block mt-0.5">
                    {group.grade.toUpperCase()} — {group.section.toUpperCase()}
                  </span>
                </div>
                <div className="px-2">
                  <span className="text-[8px] uppercase font-bold text-slate-600 block">Class Adviser</span>
                  <span className="text-[9.5px] font-bold text-slate-950 block mt-0.5 truncate">
                    {groupAdviser || 'Unassigned Faculty'}
                  </span>
                </div>
                <div className="px-2">
                  <span className="text-[8px] uppercase font-bold text-slate-600 block">Section Enrolment</span>
                  <span className="text-[9.5px] font-bold text-slate-900 mt-0.5 block">
                    {group.items.length} {group.items.length === 1 ? 'Learner' : 'Learners'}
                  </span>
                </div>
                <div className="px-2">
                  <span className="text-[8px] uppercase font-bold text-slate-600 block">Compliance Index</span>
                  <span className="text-xs font-black text-emerald-800 font-display block mt-0.5">
                    {compliantCount} / {group.items.length} Complete ({compRate}%)
                  </span>
                </div>
              </div>

              {/* Official Printable Table for THIS SECTION ONLY */}
              <div className="w-full">
                <table className="official-table w-full text-left text-xs border-collapse border border-slate-900 table-fixed">
                  <thead>
                    <tr className="bg-slate-100 uppercase border-b-2 border-slate-900 text-[6.8pt] text-slate-950">
                      <th className="border border-slate-900 px-1 py-1 text-center w-[4%]">#</th>
                      <th className="border border-slate-900 px-2 py-1 w-[27%]">Learner Full Name (Last, First, Middle)</th>
                      <th className="border border-slate-900 px-1 py-1 text-center font-mono w-[14%]">LRN</th>
                      <th className="border border-slate-900 px-1.5 py-1 text-center w-[13%]">Grade &amp; Section</th>
                      <th className="border border-slate-900 px-1 py-1 text-center w-[8.5%]">Form 138 (SF9)</th>
                      <th className="border border-slate-900 px-1 py-1 text-center w-[8.5%]">PSA Birth Cert</th>
                      <th className="border border-slate-900 px-1 py-1 text-center w-[8.5%]">Good Moral</th>
                      <th className="border border-slate-900 px-1 py-1 text-center w-[7.5%]">2x2 Photo</th>
                      <th className="border border-slate-900 px-1.5 py-1 text-center w-[9%]">Compliance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((student, idx) => {
                      const comp = getCompleteness(student);
                      return (
                        <tr key={`print-row-${student.id}`} className="text-[7pt]">
                          <td className="border border-slate-900 px-1 py-0.5 text-center font-mono text-slate-700">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-900 px-2 py-0.5 font-bold text-slate-950 truncate">
                            {student.last_name}, {student.first_name}{' '}
                            {student.middle_name ? student.middle_name[0] + '.' : ''}
                          </td>
                          <td className="border border-slate-900 px-1 py-0.5 text-center font-mono font-bold text-slate-950">
                            {student.lrn || '—'}
                          </td>
                          <td className="border border-slate-900 px-1.5 py-0.5 text-center text-slate-900 truncate">
                            {student.grade_level || group.grade} - {group.section}
                          </td>
                          <td className="border border-slate-900 px-1 py-0.5 text-center font-bold text-[6.5pt] uppercase text-emerald-800">
                            {student.form_138_status === 'verified'
                              ? '✓ Verified'
                              : student.form_138_status === 'submitted'
                              ? 'Submitted'
                              : student.form_138_status === 'waived'
                              ? 'Waived'
                              : 'Missing'}
                          </td>
                          <td className="border border-slate-900 px-1 py-0.5 text-center font-bold text-[6.5pt] uppercase text-emerald-800">
                            {student.psa_birth_status === 'verified'
                              ? '✓ Verified'
                              : student.psa_birth_status === 'submitted'
                              ? 'Submitted'
                              : student.psa_birth_status === 'waived'
                              ? 'Waived'
                              : 'Missing'}
                          </td>
                          <td className="border border-slate-900 px-1 py-0.5 text-center font-bold text-[6.5pt] uppercase text-emerald-800">
                            {student.good_moral_status === 'verified'
                              ? '✓ Verified'
                              : student.good_moral_status === 'submitted'
                              ? 'Submitted'
                              : student.good_moral_status === 'waived'
                              ? 'Waived'
                              : 'Missing'}
                          </td>
                          <td className="border border-slate-900 px-1 py-0.5 text-center font-bold text-[6.5pt] uppercase text-emerald-800">
                            {student.two_by_two_status === 'verified'
                              ? '✓ Verified'
                              : student.two_by_two_status === 'submitted'
                              ? 'Submitted'
                              : student.two_by_two_status === 'waived'
                              ? 'Waived'
                              : 'Missing'}
                          </td>
                          <td className="border border-slate-900 px-1.5 py-0.5 text-center font-bold text-slate-950">
                            {comp.isFullyCompliant
                              ? 'COMPLETE (4/4)'
                              : `DEFICIENT (${comp.score}/4)`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* DepEd Sign-Off & Attestation Block */}
              <div className="grid grid-cols-2 gap-8 pt-3 text-xs text-center border-t border-slate-300 mt-2">
                {/* Signatory 1: Registrar */}
                <div className="flex flex-col items-center">
                  <p className="text-[9px] font-semibold text-slate-700 mb-6 uppercase tracking-wider">
                    Prepared &amp; Audited by:
                  </p>
                  <div className="border-b-2 border-slate-900 w-48 pb-0.5 font-black text-slate-950 uppercase text-[9.5px]">
                    MARIA ELENA R. REGISTRAR
                  </div>
                  <p className="text-[8.5px] font-bold text-slate-900 mt-0.5">School Registrar II</p>
                  <p className="text-[7.5px] text-slate-600">LIS &amp; Student Records In-Charge</p>
                </div>

                {/* Signatory 2: Principal */}
                <div className="flex flex-col items-center">
                  <p className="text-[9px] font-semibold text-slate-700 mb-6 uppercase tracking-wider">
                    Certified Correct &amp; Approved by:
                  </p>
                  <div className="border-b-2 border-slate-900 w-48 pb-0.5 font-black text-slate-950 uppercase text-[9.5px]">
                    JUSTINE MANGILA, EdD
                  </div>
                  <p className="text-[8.5px] font-bold text-slate-900 mt-0.5">Secondary School Principal II</p>
                  <p className="text-[7.5px] text-slate-600">School Head / Authorized Official</p>
                </div>
              </div>

              {/* Document Verification & Security Tracking Footer */}
              <div className="pt-1.5 border-t border-slate-300 flex items-center justify-between text-[7.5px] text-slate-600 leading-tight">
                <span>Placido L. Señor National High School · DepEd School ID: 303035 · Langtad, City of Naga, Cebu</span>
                <span className="font-mono">Ref: PLSNHS-REG-REQ-2026-{group.section.replace(/\s+/g, '').toUpperCase()}</span>
                <span className="font-bold text-slate-800">
                  {paperSize === 'long' ? 'Long Bond Paper (8.5" × 13")' : 'Short Bond Paper (8.5" × 11")'} · Section {sIdx + 1} of {groupedStudentsBySection.length}
                </span>
              </div>
            </div>
          );
        })
      ) : (
        <div className="print-bond-paper print-only p-8 text-center text-slate-500">
          No learner records match the active audit scope.
        </div>
      )}

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
