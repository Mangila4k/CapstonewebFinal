import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Eye,
  Check,
  X,
  FileText,
  CreditCard,
  Printer,
  Download,
  RotateCw,
  ExternalLink,
  Layers,
  GraduationCap,
  Users,
  ChevronDown,
  School,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { StudentIdCard } from '../../components/common/StudentIdCard';
import { printOfficialStudentId } from '../../lib/printIdCard';
import { formatDate } from '../../lib/utils';
import type { Enrollment, Section } from '../../types';

const ALL_GRADES = [
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
];

// Official PLSNHS Sections by Grade Level (matching Supabase sections table)
const DEFAULT_SECTIONS_BY_GRADE: Record<string, string[]> = {
  'Grade 7': ['Chiong', 'De Gracia', 'Mendiola', 'Mendoza', 'Paul Ong', 'Quirante', 'Sayson'],
  'Grade 8': ['Antipolo', 'Banaba', 'Kamagong', 'Mahogany', 'Molave', 'Narra', 'Square', 'Yakal'],
  'Grade 9': ['Batangas', 'Cebu', 'Davao', 'Ilo-Ilo', 'Negros Occidental', 'Palawan', 'Rizal'],
  'Grade 10': ['Generosity', 'Honesty', 'Kindness', 'Perseverance', 'Wisdom'],
  'Grade 11': ['Almario', 'Amorsolo', 'Baltazar', 'Tolentino'],
  'Grade 12': ['Salcedo', 'Santos', 'Velasco', 'Velasquez'],
};

interface EnrichedEnrollment extends Enrollment {
  section?: string;
  section_id?: string | number | null;
}

function extractLrnFromRecord(enr: any): string {
  if (enr.lrn && String(enr.lrn).trim() && String(enr.lrn).toLowerCase() !== 'n/a') {
    return String(enr.lrn).trim();
  }
  const emailStr = String(enr.email || '');
  const match12 = emailStr.match(/\b(\d{12})\b/);
  if (match12) return match12[1];
  return 'N/A';
}

function normalizeGradeLevel(raw?: string): string {
  if (!raw) return 'Grade 10';
  const m = String(raw).match(/\d+/);
  if (m) {
    const num = parseInt(m[0], 10);
    if (num >= 7 && num <= 12) return `Grade ${num}`;
  }
  return String(raw).trim();
}

function getGradeSortOrder(grade?: string): number {
  const m = String(grade || '').match(/\d+/);
  return m ? parseInt(m[0], 10) : 99;
}

const ENROLLMENTS_CACHE_KEY = 'plsnhs_enrollments_cache_v2';
const SECTIONS_CACHE_KEY = 'plsnhs_sections_cache_v1';

const FALLBACK_INITIAL_ENROLLMENTS: EnrichedEnrollment[] = [
  {
    id: '7eb9f35e-2054-4ffb-a778-5acda1097f14',
    first_name: 'April',
    last_name: 'Sellar',
    lrn: '119518160091',
    email: 'mylene@yahoo.com',
    grade_level: 'Grade 12',
    section: 'Lapu-Lapu',
    strand: 'STEM',
    status: 'Pending',
    student_type: 'transferee',
    guardian_name: 'Catalina Sellar',
    guardian_contact: '09984087040',
    created_at: '2026-10-24T22:48:35.097Z',
  },
  {
    id: '3fa73777-fda3-4991-88f4-2a0462615e6f',
    first_name: 'Vilma',
    last_name: 'Canque',
    lrn: '119518160092',
    email: 'vilmagmail@gmail.com',
    grade_level: 'Grade 10',
    section: 'Communicator',
    strand: '',
    status: 'Pending',
    student_type: 'continuing',
    guardian_name: 'elesio',
    guardian_contact: '09945385409',
    created_at: '2026-10-19T08:53:13.795Z',
  },
  {
    id: '8805a7b5-211d-4da1-b831-c8fc2e3119f3',
    first_name: 'Micoli',
    last_name: 'Mangila',
    lrn: '119518160093',
    email: 'realshady531@gmail.com',
    grade_level: 'Grade 10',
    section: 'Communicator',
    strand: '',
    status: 'Pending',
    student_type: 'continuing',
    guardian_name: 'Jorvini',
    guardian_contact: '09515840751',
    created_at: '2026-10-19T08:52:49.964Z',
  },
  {
    id: '42c27f9a-fc1c-4440-a11f-05e07b991430',
    first_name: 'Lucas Erawan',
    last_name: 'Chappell',
    lrn: '119518160094',
    email: 'lucaschappell@gmail.com',
    grade_level: 'Grade 10',
    section: 'Communicator',
    strand: '',
    status: 'Pending',
    student_type: 'continuing',
    guardian_name: 'Lee edward',
    guardian_contact: '09485001358',
    created_at: '2026-10-19T08:49:36.145Z',
  },
  {
    id: 'd7b81081-a9cd-4e13-b7f3-bd1b7f90b93b',
    first_name: 'Jesriel',
    last_name: 'Getuaban',
    lrn: '119518160095',
    email: 'getuaban@gmail.com',
    grade_level: 'Grade 7',
    section: 'Chiong',
    strand: '',
    status: 'Pending',
    student_type: 'new',
    guardian_name: 'micole',
    guardian_contact: '09123456789',
    created_at: '2026-10-17T21:05:47.269Z',
  },
  {
    id: '099e0a69-bf44-4003-808b-26f7de18c0d4',
    first_name: 'John Micole',
    last_name: 'Mangila',
    lrn: '119518160096',
    email: 'micoli@gmail.com',
    grade_level: 'Grade 7',
    section: 'Chiong',
    strand: '',
    status: 'Pending',
    student_type: 'new',
    guardian_name: 'jiggy aligado',
    guardian_contact: '09123456789',
    created_at: '2026-10-17T20:10:12.272Z',
  },
  {
    id: '8b1908a5-a969-4c18-8967-5b3c686c81a4',
    student_id: 'a5501da6-29b8-41ab-b76c-010baa1b32c0',
    first_name: 'Shel Mae',
    last_name: 'Mandanat',
    lrn: '119518160016',
    email: 'shelmae.mandanat.119518160016@gmail.com',
    grade_level: 'Grade 10',
    section: 'Wisdom',
    strand: '',
    status: 'Enrolled',
    created_at: '2026-10-25T08:00:00Z',
  },
  {
    id: '3b428744-6210-43ab-a733-884bcad60da4',
    student_id: '1d5b281e-75c4-498d-a87c-2c6c8479ab13',
    first_name: 'Kim Agustine',
    last_name: 'Zamoro',
    lrn: '119518160103',
    email: 'kimagustine.zamoro.119518160103@gmail.com',
    grade_level: 'Grade 10',
    section: 'Wisdom',
    strand: '',
    status: 'Enrolled',
    created_at: '2026-10-25T08:00:00Z',
  },
  {
    id: '05fb473e-efe6-4401-badd-91b84914df23',
    student_id: '55198291-2d8d-44ae-adbe-79cd27886a4c',
    first_name: 'Ceaska Antonette',
    last_name: 'Torion',
    lrn: '500312160031',
    email: 'ceaskaantonette.torion.500312160031@gmail.com',
    grade_level: 'Grade 10',
    section: 'Wisdom',
    strand: '',
    status: 'Enrolled',
    created_at: '2026-10-25T08:00:00Z',
  },
  {
    id: '23ce1b07-ba21-41f0-a988-f7a3c5e46e9b',
    student_id: 'fe030d14-113f-40d7-94ba-58b7cff61d20',
    first_name: 'Angel Mae',
    last_name: 'Tampus',
    lrn: '119236160064',
    email: 'angelmae.tampus.119236160064@gmail.com',
    grade_level: 'Grade 10',
    section: 'Wisdom',
    strand: '',
    status: 'Enrolled',
    created_at: '2026-10-25T08:00:00Z',
  },
  {
    id: '009c2d6c-f51d-4708-a81d-85e9a61f3eaf',
    student_id: 'e915ce00-afed-4253-877a-1966179a15ea',
    first_name: 'Dian Faith',
    last_name: 'Selim',
    lrn: '119518160086',
    email: 'dianfaith.selim.119518160086@gmail.com',
    grade_level: 'Grade 10',
    section: 'Wisdom',
    strand: '',
    status: 'Enrolled',
    created_at: '2026-10-25T08:00:00Z',
  },
  {
    id: '6f794098-ae70-4910-90a3-b017aa3e39a0',
    student_id: '052b6d97-ae36-4571-ac27-3d140265f424',
    first_name: 'Kathryn Mae',
    last_name: 'Salem',
    lrn: '102934160015',
    email: 'kathrynmae.salem.102934160015@gmail.com',
    grade_level: 'Grade 10',
    section: 'Wisdom',
    strand: '',
    status: 'Enrolled',
    created_at: '2026-10-25T08:00:00Z',
  },
  {
    id: 'c0df99c0-ddf0-494e-979a-a362dba8ca05',
    student_id: '55a42bd0-d16c-4b26-b8bc-8dc954764b31',
    first_name: 'Rexxy Genn',
    last_name: 'Sabayton',
    lrn: '119518160061',
    email: 'rexxygenn.sabayton.119518160061@gmail.com',
    grade_level: 'Grade 10',
    section: 'Wisdom',
    strand: '',
    status: 'Enrolled',
    created_at: '2026-10-25T08:00:00Z',
  },
  {
    id: '775ad46b-8d1f-4b58-8e11-13221984774e',
    student_id: '3d36068e-c6de-4250-86c7-a507748ffa0a',
    first_name: 'Angel',
    last_name: 'Rosello',
    lrn: '119265160035',
    email: 'angel.rosello.119265160035@gmail.com',
    grade_level: 'Grade 10',
    section: 'Wisdom',
    strand: '',
    status: 'Enrolled',
    created_at: '2026-10-25T08:00:00Z',
  },
];

function loadCachedEnrollments(): EnrichedEnrollment[] {
  try {
    const raw = localStorage.getItem(ENROLLMENTS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => {
          const gNum = parseInt(String(item.grade_level || '').replace(/\D/g, '') || '10', 10);
          return gNum < 11 ? { ...item, strand: '' } : item;
        });
      }
    }
  } catch {
    // ignore storage errors
  }
  return FALLBACK_INITIAL_ENROLLMENTS;
}

function loadCachedSections(): Section[] {
  try {
    const raw = localStorage.getItem(SECTIONS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

export const AdminEnrollmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<EnrichedEnrollment[]>(loadCachedEnrollments);
  const [sections, setSections] = useState<Section[]>(loadCachedSections);
  const [viewMode, setViewMode] = useState<'list' | 'grade' | 'section'>('list');

  // Filters
  const [statusFilter, setStatusFilter] = useState<
    'All' | 'Pending' | 'Approved' | 'Enrolled' | 'Rejected'
  >('All');
  const [gradeFilter, setGradeFilter] = useState<string>('All');
  const [sectionFilter, setSectionFilter] = useState<string>('All');
  const [strandFilter, setStrandFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  const [selectedEnr, setSelectedEnr] = useState<EnrichedEnrollment | null>(null);
  const [activeManageId, setActiveManageId] = useState<string | number | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Quick Generate ID Modal State
  const [generatingIdEnr, setGeneratingIdEnr] = useState<EnrichedEnrollment | null>(null);
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
      printOfficialStudentId('enrQuickCardStage');
    } finally {
      setIdDownloading(false);
    }
  };

  const fetchAllData = async () => {
    try {
      const ENROLLMENT_LIST_COLS =
        'id, student_id, first_name, last_name, middle_name, email, grade_level, strand, status, student_type, guardian_name, guardian_contact, guardian_email, guardian_address, mother_name, father_name, dob, date_of_birth, gender, address, contact_number, school_year, last_school_year, enrolled_date, form_137_url, report_card_url, certificate_of_completion_url, psa_birth_cert_url, good_moral_cert_url, created_at';
      const STUDENT_LIST_COLS =
        'id, lrn, first_name, last_name, email, grade_level, strand, section_id, enrollment_id, student_type, academic_status';

      const [{ data: enrData }, { data: stData }, { data: secData }] = await Promise.all([
        supabase
          .from('enrollments')
          .select(ENROLLMENT_LIST_COLS)
          .order('created_at', { ascending: false }),
        supabase.from('students').select(STUDENT_LIST_COLS),
        supabase.from('sections').select('*').order('name', { ascending: true }),
      ]);

      const dbSections: Section[] = secData || [];
      if (dbSections.length > 0) {
        setSections(dbSections);
        try {
          localStorage.setItem(SECTIONS_CACHE_KEY, JSON.stringify(dbSections));
        } catch {
          // ignore storage errors
        }
      }

      const sectionById = new Map<string, Section>();
      dbSections.forEach((s: any) => {
        if (s.id) sectionById.set(String(s.id), s);
      });

      const studentById = new Map<string, any>();
      const studentByEmail = new Map<string, any>();
      const studentByName = new Map<string, any>();
      if (Array.isArray(stData)) {
        stData.forEach((st: any) => {
          if (st.id) studentById.set(String(st.id), st);
          if (st.email) studentByEmail.set(String(st.email).toLowerCase().trim(), st);
          const fullNameKey = `${st.first_name || ''} ${st.last_name || ''}`
            .toLowerCase()
            .trim();
          if (fullNameKey) studentByName.set(fullNameKey, st);
        });
      }

      if (Array.isArray(enrData) && enrData.length > 0) {
        const enriched: EnrichedEnrollment[] = enrData.map((e: any) => {
          const idKey = e.student_id ? String(e.student_id) : '';
          const emailKey = String(e.email || '').toLowerCase().trim();
          const nameKey = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase().trim();

          const matchedStudent =
            (idKey && studentById.get(idKey)) ||
            (emailKey && studentByEmail.get(emailKey)) ||
            (nameKey && studentByName.get(nameKey));

          const secRecord = matchedStudent?.section_id
            ? sectionById.get(String(matchedStudent.section_id))
            : undefined;

          const normalizedGrade = normalizeGradeLevel(
            secRecord?.grade_level || e.grade_level || matchedStudent?.grade_level || 'Grade 10'
          );

          const resolvedLrn =
            e.lrn && String(e.lrn).trim() && String(e.lrn).toLowerCase() !== 'n/a'
              ? String(e.lrn).trim()
              : matchedStudent?.lrn || extractLrnFromRecord(e);

          // Resolve actual section from database section_id or fallback to first section of that grade
          let resolvedSection =
            secRecord?.name ||
            e.section ||
            matchedStudent?.section ||
            '';

          if (!resolvedSection || resolvedSection.toLowerCase() === 'unassigned') {
            const gradeSecs = DEFAULT_SECTIONS_BY_GRADE[normalizedGrade] || ['Wisdom'];
            resolvedSection = gradeSecs[0];
          }

          const gradeNumber = parseInt(normalizedGrade.replace(/\D/g, '') || '10', 10);
          const isShsGrade = gradeNumber >= 11;

          // If a Junior High School student (Grades 7–10) accidentally has a strand in DB, clear it
          if (!isShsGrade && matchedStudent?.id && matchedStudent?.strand) {
            supabase
              .from('students')
              .update({ strand: null })
              .eq('id', matchedStudent.id)
              .then(() => {});
          }

          return {
            ...e,
            lrn: resolvedLrn,
            grade_level: normalizedGrade,
            strand: isShsGrade
              ? e.strand || matchedStudent?.strand || secRecord?.strand || ''
              : '',
            section: resolvedSection,
            section_id: matchedStudent?.section_id || null,
          };
        });

        setEnrollments(enriched);
        try {
          localStorage.setItem(ENROLLMENTS_CACHE_KEY, JSON.stringify(enriched));
        } catch {
          // ignore storage errors
        }
      }
    } catch (err) {
      console.warn('Error fetching enrollments:', err);
    }
  };

  useEffect(() => {
    fetchAllData();

    const channel = supabase
      .channel('realtime-enrollments-admin-registrar')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'enrollments' },
        () => {
          fetchAllData();
        }
      )
      .subscribe();

    const handleLocalUpdate = () => fetchAllData();
    window.addEventListener('plsnhs-enrollment-updated', handleLocalUpdate);
    window.addEventListener('storage', handleLocalUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('plsnhs-enrollment-updated', handleLocalUpdate);
      window.removeEventListener('storage', handleLocalUpdate);
    };
  }, []);

  // Lazily load 2x2 photo URL only when Review Modal or ID Modal is opened for a specific student
  useEffect(() => {
    const active = selectedEnr || generatingIdEnr;
    if (!active || active.two_by_two_picture_url !== undefined) return;
    let cancelled = false;
    supabase
      .from('enrollments')
      .select('two_by_two_picture_url')
      .eq('id', active.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const url = data.two_by_two_picture_url || '';
        if (selectedEnr && selectedEnr.id === active.id) {
          setSelectedEnr((prev) => (prev ? { ...prev, two_by_two_picture_url: url } : null));
        }
        if (generatingIdEnr && generatingIdEnr.id === active.id) {
          setGeneratingIdEnr((prev) =>
            prev ? { ...prev, two_by_two_picture_url: url } : null
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedEnr?.id, generatingIdEnr?.id]);

  const handleUpdateStatus = async (
    id: string | number,
    newStatus: 'Approved' | 'Rejected'
  ) => {
    try {
      const targetEnr = enrollments.find((item) => String(item.id) === String(id));
      const { error } = await supabase
        .from('enrollments')
        .update({
          status: newStatus,
          ...(newStatus === 'Approved'
            ? { enrolled_date: new Date().toISOString().split('T')[0] }
            : {}),
        })
        .eq('id', id);

      if (error) throw new Error(error.message);

      let resolvedStudentId = targetEnr?.student_id || undefined;

      // When Approved by Admin or Registrar, automatically enroll the student into the official `students` masterlist
      if (newStatus === 'Approved' && targetEnr) {
        try {
          const normalizedGrade = normalizeGradeLevel(targetEnr.grade_level || 'Grade 10');
          const chosenSectionName =
            targetEnr.section && targetEnr.section !== 'Unassigned'
              ? targetEnr.section
              : (DEFAULT_SECTIONS_BY_GRADE[normalizedGrade] || ['Wisdom'])[0];

          const matchedSec =
            sections.find(
              (s) =>
                s.name === chosenSectionName &&
                normalizeGradeLevel(s.grade_level) === normalizedGrade
            ) || sections.find((s) => s.name === chosenSectionName);

          const resolvedLrn =
            targetEnr.lrn && /^\d{12}$/.test(String(targetEnr.lrn).trim())
              ? String(targetEnr.lrn).trim()
              : extractLrnFromRecord(targetEnr);

          const safeFirstName = (targetEnr.first_name || 'Student').trim();
          const safeLastName = (targetEnr.last_name || 'Learner').trim();
          const safeEmail =
            (targetEnr.email || '').trim().toLowerCase() ||
            `${safeFirstName.toLowerCase().replace(/\s+/g, '')}.${safeLastName
              .toLowerCase()
              .replace(/\s+/g, '')}.${resolvedLrn}@gmail.com`;

          const studentPayload: Record<string, any> = {
            lrn: resolvedLrn,
            first_name: safeFirstName,
            last_name: safeLastName,
            middle_name: (targetEnr as any).middle_name || null,
            date_of_birth:
              (targetEnr as any).date_of_birth ||
              (targetEnr as any).dob ||
              '2009-01-01',
            gender: (targetEnr as any).gender || 'Male',
            address:
              (targetEnr as any).address ||
              (targetEnr as any).guardian_address ||
              'City of Naga, Cebu',
            contact_number:
              (targetEnr as any).contact_number ||
              targetEnr.guardian_contact ||
              '09123456789',
            email: safeEmail,
            parent_name:
              targetEnr.guardian_name ||
              (targetEnr as any).mother_name ||
              (targetEnr as any).father_name ||
              'Parent / Guardian',
            parent_contact:
              targetEnr.guardian_contact ||
              (targetEnr as any).contact_number ||
              '09123456789',
            parent_email: (targetEnr as any).guardian_email || null,
            grade_level: normalizedGrade,
            strand: targetEnr.strand || null,
            section_id: matchedSec?.id || targetEnr.section_id || null,
            enrollment_id: targetEnr.id,
            student_type: targetEnr.student_type || 'New Student',
            academic_status: 'Enrolled',
            documents_status: 'Verified',
            two_by_two_picture_url: targetEnr.two_by_two_picture_url || null,
            form_138_url:
              targetEnr.report_card_url || targetEnr.form_137_url || null,
            psa_birth_url: targetEnr.psa_birth_cert_url || null,
            good_moral_url: targetEnr.good_moral_cert_url || null,
          };

          if (targetEnr.student_id) {
            const { data: updatedSt } = await supabase
              .from('students')
              .update(studentPayload)
              .eq('id', targetEnr.student_id)
              .select('id')
              .single();
            if (updatedSt?.id) resolvedStudentId = updatedSt.id;
          } else {
            // Check if a student with this email or enrollment_id already exists
            const { data: existingSt } = await supabase
              .from('students')
              .select('id')
              .or(`enrollment_id.eq.${targetEnr.id},email.eq.${safeEmail}`)
              .maybeSingle();

            if (existingSt?.id) {
              const { data: updatedSt } = await supabase
                .from('students')
                .update(studentPayload)
                .eq('id', existingSt.id)
                .select('id')
                .single();
              resolvedStudentId = updatedSt?.id || existingSt.id;
            } else {
              const { data: insertedSt } = await supabase
                .from('students')
                .insert(studentPayload)
                .select('id')
                .single();
              if (insertedSt?.id) resolvedStudentId = insertedSt.id;
            }
          }

          if (resolvedStudentId) {
            await supabase
              .from('enrollments')
              .update({ student_id: resolvedStudentId, status: 'Approved' })
              .eq('id', targetEnr.id);
          }

          // Clear student masterlist cache so the newly approved student appears immediately in Masterlist, Requirements, & ID Studio
          try {
            localStorage.removeItem('plsnhs_students_cache_v2');
            localStorage.removeItem('plsnhs_registrar_reqs_cache_v2');
          } catch {
            // ignore storage errors
          }

          // Broadcast official approval notification
          await supabase.from('notifications').insert({
            title: 'Student Enrollment Approved',
            message: `${safeFirstName} ${safeLastName} (${normalizedGrade} · Section ${chosenSectionName}) has been officially approved and added to the Student Masterlist.`,
            type: 'enrollment',
            role: 'registrar',
            enrollment_id: targetEnr.id,
          });
        } catch (syncErr) {
          console.warn('Student masterlist sync note:', syncErr);
        }
      }

      setNotice({
        type: 'success',
        message:
          newStatus === 'Approved' && targetEnr
            ? `${targetEnr.first_name} ${targetEnr.last_name} has been officially approved and enrolled into ${targetEnr.grade_level} - Section ${targetEnr.section || 'Wisdom'}!`
            : `Enrollment application marked as ${newStatus}.`,
      });

      setEnrollments((prev) => {
        const updated = prev.map((item) =>
          String(item.id) === String(id)
            ? {
                ...item,
                status: newStatus,
                student_id: resolvedStudentId || item.student_id,
              }
            : item
        );
        try {
          localStorage.setItem(ENROLLMENTS_CACHE_KEY, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });

      if (selectedEnr && String(selectedEnr.id) === String(id)) {
        setSelectedEnr({
          ...selectedEnr,
          status: newStatus,
          student_id: resolvedStudentId || selectedEnr.student_id,
        });
      }

      window.dispatchEvent(new Event('plsnhs-enrollment-updated'));
      window.dispatchEvent(new Event('plsnhs-broadcast-updated'));
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to update status' });
    }
  };

  const handleAssignSection = async (enr: EnrichedEnrollment, newSectionName: string) => {
    const matchedSec = sections.find(
      (s) =>
        s.name === newSectionName &&
        normalizeGradeLevel(s.grade_level) === normalizeGradeLevel(enr.grade_level)
    ) || sections.find((s) => s.name === newSectionName);

    if (enr.student_id && matchedSec?.id) {
      try {
        await supabase
          .from('students')
          .update({ section_id: matchedSec.id })
          .eq('id', enr.student_id);
      } catch (e) {
        console.warn('Could not persist section_id to student:', e);
      }
    }

    setEnrollments((prev) =>
      prev.map((item) =>
        item.id === enr.id
          ? { ...item, section: newSectionName, section_id: matchedSec?.id || item.section_id }
          : item
      )
    );
    if (selectedEnr && selectedEnr.id === enr.id) {
      setSelectedEnr({
        ...selectedEnr,
        section: newSectionName,
        section_id: matchedSec?.id || selectedEnr.section_id,
      });
    }
    setNotice({
      type: 'success',
      message: `${enr.first_name} ${enr.last_name} assigned to ${enr.grade_level} - Section ${newSectionName}.`,
    });
  };

  // Sections for a given grade level
  const getSectionsForGrade = (grade: string): string[] => {
    const set = new Set<string>();
    sections
      .filter((s) => normalizeGradeLevel(s.grade_level) === grade && s.name)
      .forEach((s) => set.add(s.name));
    enrollments
      .filter((e) => e.grade_level === grade && e.section && e.section !== 'Unassigned')
      .forEach((e) => set.add(e.section as string));
    if (DEFAULT_SECTIONS_BY_GRADE[grade]) {
      DEFAULT_SECTIONS_BY_GRADE[grade].forEach((sec) => set.add(sec));
    }
    return Array.from(set).sort();
  };

  const availableSections = useMemo(() => {
    if (gradeFilter !== 'All') {
      return getSectionsForGrade(gradeFilter);
    }
    const set = new Set<string>();
    ALL_GRADES.forEach((g) => {
      getSectionsForGrade(g).forEach((sec) => set.add(sec));
    });
    return Array.from(set).sort();
  }, [sections, enrollments, gradeFilter]);

  // Stats by Grade Level & Status
  const stats = useMemo(() => {
    const byGrade: Record<string, number> = {};
    ALL_GRADES.forEach((g) => (byGrade[g] = 0));

    let pendingCount = 0;
    let enrolledCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;

    enrollments.forEach((e) => {
      const g = normalizeGradeLevel(e.grade_level);
      if (byGrade[g] !== undefined) byGrade[g]++;
      else byGrade[g] = 1;

      const st = (e.status || '').toLowerCase();
      if (st === 'pending') pendingCount++;
      else if (st === 'enrolled') enrolledCount++;
      else if (st === 'approved') approvedCount++;
      else if (st === 'rejected') rejectedCount++;
    });

    return {
      total: enrollments.length,
      byGrade,
      statusCounts: {
        All: enrollments.length,
        Pending: pendingCount,
        Enrolled: enrolledCount,
        Approved: approvedCount,
        Rejected: rejectedCount,
      },
    };
  }, [enrollments]);

  // Incoming Pending Applications Queue (always sorted newest first so Admin & Registrar see newly enrolled students right at the top)
  const pendingApplications = useMemo(() => {
    return enrollments
      .filter((e) => {
        if ((e.status || '').toLowerCase() !== 'pending') return false;
        const q = search.toLowerCase().trim();
        const name = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase();
        const email = (e.email || '').toLowerCase();
        const lrn = (e.lrn || '').toLowerCase();
        const sec = (e.section || '').toLowerCase();
        const matchesSearch =
          !q || name.includes(q) || email.includes(q) || lrn.includes(q) || sec.includes(q);
        const matchesGrade = gradeFilter === 'All' || e.grade_level === gradeFilter;
        const matchesSection = sectionFilter === 'All' || e.section === sectionFilter;
        const matchesStrand =
          strandFilter === 'All' ||
          (e.strand || '').toUpperCase().includes(strandFilter.toUpperCase());
        return matchesSearch && matchesGrade && matchesSection && matchesStrand;
      })
      .sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      );
  }, [enrollments, search, gradeFilter, sectionFilter, strandFilter]);

  // Filtered AND Sorted enrollments so students in the same Year Level & Section are all in consecutive rows
  const filtered = useMemo(() => {
    const list = enrollments.filter((e) => {
      const q = search.toLowerCase().trim();
      const name = `${e.first_name || ''} ${e.last_name || ''}`.toLowerCase();
      const email = (e.email || '').toLowerCase();
      const lrn = (e.lrn || '').toLowerCase();
      const sec = (e.section || '').toLowerCase();

      const matchesSearch =
        !q || name.includes(q) || email.includes(q) || lrn.includes(q) || sec.includes(q);

      const matchesStatus =
        statusFilter === 'All' ||
        (e.status || '').toLowerCase() === statusFilter.toLowerCase();

      const matchesGrade = gradeFilter === 'All' || e.grade_level === gradeFilter;

      const matchesSection = sectionFilter === 'All' || e.section === sectionFilter;

      const matchesStrand =
        strandFilter === 'All' ||
        (e.strand || '').toUpperCase().includes(strandFilter.toUpperCase());

      return (
        matchesSearch &&
        matchesStatus &&
        matchesGrade &&
        matchesSection &&
        matchesStrand
      );
    });

    // Sort by Year Level -> Section -> Pending first -> Last Name so students in the same section are always grouped together in a row
    return list.sort((a, b) => {
      const gDiff = getGradeSortOrder(a.grade_level) - getGradeSortOrder(b.grade_level);
      if (gDiff !== 0) return gDiff;

      const secA = (a.section || 'ZZZ').toLowerCase();
      const secB = (b.section || 'ZZZ').toLowerCase();
      if (secA !== secB) return secA.localeCompare(secB);

      const isPendA = (a.status || '').toLowerCase() === 'pending' ? 0 : 1;
      const isPendB = (b.status || '').toLowerCase() === 'pending' ? 0 : 1;
      if (isPendA !== isPendB) return isPendA - isPendB;

      const lastA = (a.last_name || '').toLowerCase();
      const lastB = (b.last_name || '').toLowerCase();
      return lastA.localeCompare(lastB);
    });
  }, [enrollments, search, statusFilter, gradeFilter, sectionFilter, strandFilter]);

  // Group filtered applications by "Grade Level - Section" so all students of a section appear together in a clean block
  const groupedBySection = useMemo(() => {
    const groups: {
      key: string;
      grade: string;
      section: string;
      items: EnrichedEnrollment[];
    }[] = [];
    const map = new Map<string, EnrichedEnrollment[]>();

    filtered.forEach((enr) => {
      const g = enr.grade_level || 'Grade 10';
      const s = enr.section || 'Unassigned';
      const key = `${g}__${s}`;
      if (!map.has(key)) {
        map.set(key, []);
        groups.push({ key, grade: g, section: s, items: map.get(key)! });
      }
      map.get(key)!.push(enr);
    });

    return groups;
  }, [filtered]);

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-4 sm:pr-12">
        <h1 className="text-2xl font-extrabold text-slate-900 font-display tracking-tight">
          Enrollment Applications
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review, verify, and manage student admissions organized by Year Level (Grade 7–12) and Section.
        </p>
      </div>

      {notice && (
        <Alert
          type={notice.type}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}

      {/* Year Level Row (Grade 7 to Grade 12) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <button
          type="button"
          onClick={() => {
            setGradeFilter('All');
            setSectionFilter('All');
          }}
          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
            gradeFilter === 'All' && sectionFilter === 'All'
              ? 'bg-[#1B2A4A] text-white border-[#1B2A4A] shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
            All Levels
          </div>
          <div className="text-xl font-black mt-0.5">{stats.total}</div>
        </button>

        {ALL_GRADES.map((g) => {
          const count = stats.byGrade[g] || 0;
          const isActive = gradeFilter === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => {
                setGradeFilter(isActive ? 'All' : g);
                setSectionFilter('All');
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#1B2A4A] text-white border-[#1B2A4A] shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                {g}
              </div>
              <div className="text-xl font-black mt-0.5">{count}</div>
            </button>
          );
        })}
      </div>

      {/* View Mode & Search Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* View Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80 self-start">
            <button
              type="button"
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
              type="button"
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
              type="button"
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

          {/* Status Tabs with Live Counts */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 overflow-x-auto">
            {(['All', 'Pending', 'Enrolled', 'Approved', 'Rejected'] as const).map((tab) => {
              const count = stats.statusCounts[tab] || 0;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                      statusFilter === tab
                        ? 'bg-white/20 text-white'
                        : tab === 'Pending' && count > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search + Dropdowns */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by applicant name, LRN, email, or section..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
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

            <select
              value={strandFilter}
              onChange={(e) => setStrandFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-[#1B2A4A] focus:outline-hidden"
            >
              <option value="All">All Strands</option>
              <option value="STEM">STEM</option>
              <option value="HUMSS">HUMSS</option>
              <option value="GAS">GAS</option>
              <option value="TVL">TVL</option>
            </select>

            {(search ||
              gradeFilter !== 'All' ||
              sectionFilter !== 'All' ||
              strandFilter !== 'All' ||
              statusFilter !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setGradeFilter('All');
                  setSectionFilter('All');
                  setStrandFilter('All');
                  setStatusFilter('All');
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* INCOMING PENDING APPLICATIONS QUEUE — Always visible at the top for Admin & Registrar to receive & approve students who have enrolled */}
      {pendingApplications.length > 0 &&
        (statusFilter === 'All' || statusFilter === 'Pending') && (
          <div className="rounded-2xl border-2 border-amber-300/80 bg-amber-50/40 shadow-sm overflow-visible">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#1B2A4A] to-[#0f1c3f] px-5 py-3.5 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow-xs">
                  {pendingApplications.length}
                </span>
                <div>
                  <h2 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2">
                    Incoming Student Enrollment Applications (Awaiting Approval)
                  </h2>
                  <p className="text-[11px] text-slate-300">
                    Students who recently submitted an online enrollment form — click Manage to review, approve, or reject.
                  </p>
                </div>
              </div>
              {statusFilter !== 'Pending' && (
                <button
                  type="button"
                  onClick={() => setStatusFilter('Pending')}
                  className="rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 text-[11px] font-bold text-amber-300 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  Filter Pending Only ({pendingApplications.length})
                </button>
              )}
            </div>

            <div className="overflow-visible bg-white rounded-b-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-amber-50/70 border-b border-amber-200/70 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3 whitespace-nowrap">Applicant Name & Type</th>
                    <th className="px-5 py-3 whitespace-nowrap">Year Level & Assign Section</th>
                    <th className="px-5 py-3 whitespace-nowrap">Status</th>
                    <th className="px-5 py-3 whitespace-nowrap">Submitted</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">Quick Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingApplications.map((enr, idx) => {
                    const gradeSecs = getSectionsForGrade(
                      normalizeGradeLevel(enr.grade_level)
                    );
                    const topManageKey = `pending-${enr.id}`;
                    const isTopManageOpen = activeManageId === topManageKey;
                    const openUpward =
                      pendingApplications.length > 2 &&
                      idx >= pendingApplications.length - 2;

                    return (
                      <tr
                        key={`pending-top-${enr.id}`}
                        className="hover:bg-amber-50/30 transition-colors"
                      >
                        <td className="px-5 py-3.5 align-middle">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 text-[13px]">
                              {enr.first_name} {enr.last_name}
                            </span>
                            <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-[#1B2A4A] capitalize">
                              {enr.student_type || 'New Student'}
                            </span>
                          </div>
                          <div className="text-[10.5px] text-slate-400 font-mono truncate max-w-xs sm:max-w-md mt-0.5">
                            LRN: {enr.lrn || 'N/A'} · {enr.email}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-xs">
                              {enr.grade_level}
                            </span>
                            {enr.strand &&
                              parseInt(String(enr.grade_level).replace(/\D/g, '') || '10', 10) >=
                                11 && (
                                <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-bold text-emerald-800 text-[10.5px]">
                                  {enr.strand}
                                </span>
                              )}
                            <select
                              value={enr.section || gradeSecs[0] || 'Wisdom'}
                              onChange={(e) => handleAssignSection(enr, e.target.value)}
                              className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-[#1B2A4A] focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden cursor-pointer"
                              title="Assign Section before or after approving"
                            >
                              {gradeSecs.map((sec) => (
                                <option key={sec} value={sec}>
                                  Section {sec}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                          <Badge variant="warning" size="sm">
                            Pending Approval
                          </Badge>
                        </td>

                        <td className="px-5 py-3.5 align-middle text-slate-500 whitespace-nowrap">
                          {formatDate(enr.created_at)}
                        </td>

                        <td className="px-5 py-3.5 align-middle text-right whitespace-nowrap">
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveManageId(isTopManageOpen ? null : topManageKey);
                              }}
                              className={`inline-flex items-center justify-center gap-1.5 h-8 rounded-lg border px-3.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                                isTopManageOpen
                                  ? 'border-[#1B2A4A] bg-[#1B2A4A] text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>Manage</span>
                              <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform ${
                                  isTopManageOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </button>

                            {isTopManageOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setActiveManageId(null)}
                                />
                                <div
                                  className={`absolute right-0 z-50 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl ring-1 ring-black/5 divide-y divide-slate-100 text-left ${
                                    openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                  }`}
                                >
                                  <div className="py-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveManageId(null);
                                        setSelectedEnr(enr);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                    >
                                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                                      <span>Review Application</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveManageId(null);
                                        setIdCardSide('both');
                                        setIdCardFlipped(false);
                                        setGeneratingIdEnr(enr);
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-50/70 cursor-pointer"
                                    >
                                      <CreditCard className="h-3.5 w-3.5 text-amber-600" />
                                      <span>Generate ID</span>
                                    </button>
                                  </div>
                                  <div className="py-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveManageId(null);
                                        handleUpdateStatus(enr.id, 'Approved');
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                    >
                                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                                      <span>Approve Application</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveManageId(null);
                                        handleUpdateStatus(enr.id, 'Rejected');
                                      }}
                                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                                    >
                                      <X className="h-3.5 w-3.5 text-rose-500" />
                                      <span>Reject Application</span>
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
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* VIEW MODE 1: TABLE GROUPED BY SECTION ROWS */}
      {viewMode === 'list' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-visible">
          <div className="overflow-visible rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5 whitespace-nowrap rounded-tl-2xl">Applicant Name</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Year Level</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Submission Date</th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap rounded-tr-2xl">Quick Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedBySection.length > 0 ? (
                  groupedBySection.map((group, gIdx) => {
                    const gradeNum = parseInt(
                      String(group.grade).replace(/\D/g, '') || '10',
                      10
                    );
                    const isShsGroup = gradeNum >= 11;
                    const isLastGroup = gIdx === groupedBySection.length - 1;

                    return (
                      <React.Fragment key={group.key}>
                        {/* Section Banner Row — keeps all students of the same section together in consecutive rows */}
                        <tr className="bg-slate-100/90 border-y border-slate-200">
                          <td colSpan={5} className="px-5 py-2.5">
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
                        {group.items.map((enr, rIdx) => {
                          const isManageOpen = activeManageId === enr.id;
                          const openMainUpward =
                            isLastGroup && rIdx >= group.items.length - 2;
                          return (
                            <tr
                              key={enr.id}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              {/* Applicant Name */}
                              <td className="px-5 py-3.5 align-middle">
                                <div className="font-bold text-slate-900 text-[13px]">
                                  {enr.first_name} {enr.last_name}
                                </div>
                                <div className="text-[10.5px] text-slate-400 font-mono truncate max-w-xs sm:max-w-md">
                                  LRN: {enr.lrn || 'N/A'} · {enr.email}
                                </div>
                              </td>

                              {/* Year Level */}
                              <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                                <div className="inline-flex items-center gap-2">
                                  <span className="font-extrabold text-slate-900 text-xs">
                                    {enr.grade_level}
                                  </span>
                                  {enr.strand &&
                                    isShsGroup && (
                                      <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-bold text-emerald-800 text-[10.5px]">
                                        {enr.strand}
                                      </span>
                                    )}
                                </div>
                              </td>

                              {/* Status */}
                              <td className="px-5 py-3.5 align-middle whitespace-nowrap">
                                <Badge
                                  variant={
                                    enr.status?.toLowerCase() === 'approved' ||
                                    enr.status?.toLowerCase() === 'enrolled'
                                      ? 'success'
                                      : enr.status?.toLowerCase() === 'rejected'
                                      ? 'danger'
                                      : 'warning'
                                  }
                                  size="sm"
                                >
                                  {enr.status}
                                </Badge>
                              </td>

                              {/* Submission Date */}
                              <td className="px-5 py-3.5 align-middle text-slate-500 whitespace-nowrap">
                                {formatDate(enr.created_at)}
                              </td>

                              {/* Quick Decision — Single Manage Dropdown containing Review, Generate ID, Approve, and Reject */}
                              <td className="px-5 py-3.5 align-middle text-right whitespace-nowrap">
                                <div className="relative inline-block text-left">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveManageId(isManageOpen ? null : enr.id);
                                    }}
                                    className={`inline-flex items-center justify-center gap-1.5 h-8 rounded-lg border px-3.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                                      isManageOpen
                                        ? 'border-[#1B2A4A] bg-[#1B2A4A] text-white'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span>Manage</span>
                                    <ChevronDown
                                      className={`h-3.5 w-3.5 transition-transform ${
                                        isManageOpen ? 'rotate-180' : ''
                                      }`}
                                    />
                                  </button>

                                  {isManageOpen && (
                                    <>
                                      <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setActiveManageId(null)}
                                      />
                                      <div
                                        className={`absolute right-0 z-50 w-52 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl ring-1 ring-black/5 divide-y divide-slate-100 text-left ${
                                          openMainUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                        }`}
                                      >
                                        <div className="py-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveManageId(null);
                                              setSelectedEnr(enr);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                                          >
                                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                                            <span>Review Application</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveManageId(null);
                                              setIdCardSide('both');
                                              setIdCardFlipped(false);
                                              setGeneratingIdEnr(enr);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-50/70 cursor-pointer"
                                          >
                                            <CreditCard className="h-3.5 w-3.5 text-amber-600" />
                                            <span>Generate ID</span>
                                          </button>
                                        </div>
                                        <div className="py-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveManageId(null);
                                              handleUpdateStatus(enr.id, 'Approved');
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                                          >
                                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                                            <span>Approve Application</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveManageId(null);
                                              handleUpdateStatus(enr.id, 'Rejected');
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                                          >
                                            <X className="h-3.5 w-3.5 text-rose-500" />
                                            <span>Reject Application</span>
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
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No enrollment applications found for current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: BY YEAR LEVEL (GRADE 7 TO GRADE 12 & EVERY SECTION) */}
      {viewMode === 'grade' && (
        <div className="space-y-6">
          {ALL_GRADES.map((grade) => {
            const gradeApps = enrollments.filter((e) => e.grade_level === grade);
            const gradeSections = getSectionsForGrade(grade);
            const isShs = parseInt(grade.replace(/\D/g, ''), 10) >= 11;

            return (
              <div
                key={grade}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
              >
                {/* Year Level Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1B2A4A] text-white font-extrabold text-sm">
                      {grade.replace('Grade ', 'G')}
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                        {grade}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {isShs ? 'Senior High School (SHS)' : 'Junior High School (JHS)'} ·{' '}
                        {gradeApps.length} Enrollment Applications
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-slate-100 text-xs font-semibold text-slate-700">
                      {gradeSections.length} Sections Available
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setGradeFilter(grade);
                        setSectionFilter('All');
                        setViewMode('list');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#1B2A4A] text-white text-xs font-bold hover:bg-[#0f1c3f] cursor-pointer"
                    >
                      View All {grade} Rows
                    </button>
                  </div>
                </div>

                {/* Every Section Pill in a single horizontal row */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Sections in {grade} (Click any section to view students in a row):
                  </span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {gradeSections.map((secName) => {
                      const count = gradeApps.filter((e) => e.section === secName).length;
                      return (
                        <button
                          key={secName}
                          type="button"
                          onClick={() => {
                            setGradeFilter(grade);
                            setSectionFilter(secName);
                            setViewMode('list');
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-[#1B2A4A] text-xs font-medium text-slate-700 transition-colors inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer"
                        >
                          <Layers className="h-3.5 w-3.5 text-[#1B2A4A]" />
                          <span className="font-bold">Section {secName}</span>
                          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-200 text-[10px] font-bold text-slate-800">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODE 3: SECTION CARDS */}
      {viewMode === 'section' && (
        <div className="space-y-6">
          {/* Quick Year Level Selector for Sections */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setGradeFilter('All')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                gradeFilter === 'All'
                  ? 'bg-[#1B2A4A] text-white shadow-xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All Year Levels (7–12)
            </button>
            {ALL_GRADES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGradeFilter(g)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  gradeFilter === g
                    ? 'bg-[#1B2A4A] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          {/* Sections Grouped by Year Level */}
          {(gradeFilter === 'All' ? ALL_GRADES : [gradeFilter]).map((grade) => {
            const gradeSecs = getSectionsForGrade(grade);
            const isShs = parseInt(grade.replace(/\D/g, ''), 10) >= 11;

            return (
              <div key={grade} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-[#1B2A4A] px-2.5 py-1 text-xs font-extrabold text-white">
                      {grade}
                    </span>
                    <span className="text-xs font-bold text-slate-600">
                      {isShs ? 'Senior High School' : 'Junior High School'} Sections
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {gradeSecs.length} Sections
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gradeSecs.map((secName) => {
                    const secApps = enrollments.filter(
                      (e) => e.grade_level === grade && e.section === secName
                    );
                    const matchedDbSec = sections.find(
                      (s) => s.name === secName && normalizeGradeLevel(s.grade_level) === grade
                    );
                    const capacity = matchedDbSec?.capacity || 45;
                    const fillPercent = Math.min(
                      100,
                      Math.round((secApps.length / capacity) * 100)
                    );

                    return (
                      <div
                        key={`${grade}-${secName}`}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#1B2A4A] transition-all flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                {grade} · {isShs ? 'Senior High' : 'Junior High'}
                              </span>
                              <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                                Section {secName}
                              </h4>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-extrabold text-[#1B2A4A]">
                              <Users className="h-3 w-3" /> {secApps.length} / {capacity}
                            </span>
                          </div>

                          {/* Capacity Bar */}
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full bg-[#1B2A4A] rounded-full transition-all"
                              style={{ width: `${fillPercent}%` }}
                            />
                          </div>

                          {/* Preview of Applicants in this Section */}
                          {secApps.length > 0 ? (
                            <div className="space-y-1.5 pt-1">
                              {secApps.slice(0, 3).map((app) => (
                                <div
                                  key={app.id}
                                  className="flex items-center justify-between text-xs rounded-lg bg-slate-50 px-2.5 py-1.5"
                                >
                                  <span className="font-semibold text-slate-800 truncate">
                                    {app.first_name} {app.last_name}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {app.lrn}
                                  </span>
                                </div>
                              ))}
                              {secApps.length > 3 && (
                                <p className="text-[11px] text-slate-400 font-medium pl-1">
                                  +{secApps.length - 3} more learners in Section {secName}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400 italic py-2">
                              No applicants assigned to Section {secName} yet.
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setGradeFilter(grade);
                            setSectionFilter(secName);
                            setViewMode('list');
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 hover:bg-[#1B2A4A] hover:text-white hover:border-[#1B2A4A] py-2 px-3 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                        >
                          Open Section {secName} Roster ({secApps.length}) →
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {selectedEnr && (
        <Modal
          isOpen={!!selectedEnr}
          onClose={() => setSelectedEnr(null)}
          title={`Enrollment Review: ${selectedEnr.first_name} ${selectedEnr.last_name}`}
          subtitle={`Application ID #${selectedEnr.id} · Submitted ${formatDate(selectedEnr.created_at)}`}
        >
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-100">
              <div>
                <span className="font-semibold text-slate-400">Learner Reference Number</span>
                <p className="font-bold text-slate-900 font-mono text-sm mt-0.5">
                  {selectedEnr.lrn || 'N/A'}
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Status</span>
                <div className="mt-1">
                  <Badge
                    variant={
                      selectedEnr.status?.toLowerCase() === 'approved' ||
                      selectedEnr.status?.toLowerCase() === 'enrolled'
                        ? 'success'
                        : selectedEnr.status?.toLowerCase() === 'rejected'
                        ? 'danger'
                        : 'warning'
                    }
                  >
                    {selectedEnr.status}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Year Level & Strand</span>
                <p className="font-bold text-slate-800 mt-0.5">
                  {selectedEnr.grade_level}
                  {selectedEnr.strand ? ` · ${selectedEnr.strand}` : ' · Junior High (JHS)'}
                </p>
              </div>
              <div>
                <span className="font-semibold text-slate-400 flex items-center gap-1">
                  <School className="h-3 w-3 text-[#1B2A4A]" /> Assigned Section
                </span>
                <select
                  value={selectedEnr.section || ''}
                  onChange={(e) => handleAssignSection(selectedEnr, e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-[#1B2A4A] focus:outline-hidden"
                >
                  {getSectionsForGrade(
                    normalizeGradeLevel(selectedEnr.grade_level)
                  ).map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <span className="font-semibold text-slate-400">Email</span>
                <p className="font-bold text-slate-800 mt-0.5">{selectedEnr.email}</p>
              </div>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Parent / Guardian Contact
              </h4>
              <p className="text-slate-600">
                Guardian:{' '}
                <span className="font-semibold text-slate-800">
                  {selectedEnr.guardian_name || 'Not provided'}
                </span>
              </p>
              <p className="text-slate-600">
                Contact:{' '}
                <span className="font-semibold text-slate-800">
                  {selectedEnr.guardian_contact || 'Not provided'}
                </span>
              </p>
            </div>

            {/* Applicant Type & Submitted Documents */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-[#1a225a]" />
                  Submitted Documents
                </h4>
                <span className="text-[11px] font-bold text-[#1a225a] px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200">
                  {selectedEnr.student_type || 'New Student'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { label: '2x2 ID Photo', url: selectedEnr.two_by_two_picture_url },
                  { label: 'Form 137', url: selectedEnr.form_137_url },
                  { label: 'Report Card', url: selectedEnr.report_card_url },
                  { label: 'Cert of Completion', url: selectedEnr.certificate_of_completion_url },
                  { label: 'PSA Birth Cert', url: selectedEnr.psa_birth_cert_url },
                  { label: 'Good Moral', url: selectedEnr.good_moral_cert_url },
                ].map((doc) => (
                  <div
                    key={doc.label}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                  >
                    <span className="font-medium text-slate-700 truncate pr-1">{doc.label}</span>
                    {doc.url ? (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#1a225a] font-bold hover:underline inline-flex items-center gap-1 shrink-0"
                      >
                        View <Eye className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400 italic text-[10.5px] shrink-0">None</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => {
                  const enr = selectedEnr;
                  setSelectedEnr(null);
                  setIdCardSide('both');
                  setIdCardFlipped(false);
                  setGeneratingIdEnr(enr);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <CreditCard className="h-3.5 w-3.5 text-amber-600" />
                <span>Generate Official ID</span>
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => handleUpdateStatus(selectedEnr.id, 'Rejected')}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                >
                  Reject Application
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedEnr.id, 'Approved')}
                  className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 cursor-pointer"
                >
                  Approve & Enroll Student
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* QUICK GENERATE ID MODAL */}
      {generatingIdEnr && (
        <Modal
          isOpen={!!generatingIdEnr}
          onClose={() => setGeneratingIdEnr(null)}
          title={`Official Student ID: ${generatingIdEnr.first_name} ${generatingIdEnr.last_name}`}
          subtitle={`LRN: ${generatingIdEnr.lrn || '—'} · ${generatingIdEnr.grade_level || 'Grade 10'} · Section ${generatingIdEnr.section || 'Wisdom'}`}
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
                      'enrQuickCardFront',
                      `${generatingIdEnr.last_name}_${generatingIdEnr.first_name}_Front.png`
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
                      'enrQuickCardBack',
                      `${generatingIdEnr.last_name}_${generatingIdEnr.first_name}_Back.png`
                    )
                  }
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>PNG Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => printOfficialStudentId('enrQuickCardStage')}
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
              id="enrQuickCardStage"
            >
              <StudentIdCard
                data={{
                  id: generatingIdEnr.student_id || generatingIdEnr.id,
                  student_id: generatingIdEnr.student_id || generatingIdEnr.id,
                  fullname: `${generatingIdEnr.first_name} ${generatingIdEnr.last_name}`.trim(),
                  first_name: generatingIdEnr.first_name,
                  last_name: generatingIdEnr.last_name,
                  lrn: generatingIdEnr.lrn || '',
                  grade_level: generatingIdEnr.grade_level || 'Grade 10',
                  level_category:
                    parseInt(
                      String(generatingIdEnr.grade_level).replace(/\D/g, '') || '10',
                      10
                    ) >= 11
                      ? 'Senior High'
                      : 'Junior High',
                  strand: generatingIdEnr.strand || '',
                  parent_name: generatingIdEnr.guardian_name || '',
                  parent_contact: generatingIdEnr.guardian_contact || '',
                  school_year: generatingIdEnr.school_year || '2026-2027',
                  principal_name: 'Dr. Ryan R. Quiroga',
                  photo_url: generatingIdEnr.two_by_two_picture_url || '',
                }}
                side={idCardSide}
                flipped={idCardFlipped}
                layout={idCardSide === 'both' ? 'row' : 'column'}
                scale={idCardSide === 'both' ? 0.82 : 0.95}
                className="transparent-stage"
                frontId="enrQuickCardFront"
                backId="enrQuickCardBack"
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
                    const enr = generatingIdEnr;
                    setGeneratingIdEnr(null);
                    const params = new URLSearchParams({
                      id: String(enr.student_id || enr.id || ''),
                      lrn: enr.lrn || '',
                      name: `${enr.first_name} ${enr.last_name}`.trim(),
                      grade: enr.grade_level || 'Grade 10',
                      strand: enr.strand || '',
                      guardian: enr.guardian_name || '',
                      contact: enr.guardian_contact || '',
                      photo: enr.two_by_two_picture_url || '',
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
                  onClick={() => setGeneratingIdEnr(null)}
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
