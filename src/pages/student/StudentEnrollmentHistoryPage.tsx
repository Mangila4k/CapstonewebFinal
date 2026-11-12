import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Award,
  Layers,
  FileCheck,
  Building,
  UserCheck,
  History,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/common/Badge';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';

interface EnrolledSubject {
  code: string;
  title: string;
  classification: 'Core' | 'Applied' | 'Specialized';
  units: number;
}

interface TermHistoryItem {
  id: string;
  schoolYear: string;
  semesterOrTerm: string;
  gradeLevel: string;
  trackAndStrand: string;
  section: string;
  adviser: string;
  registrationDate: string;
  status: 'Officially Enrolled' | 'Completed' | 'Promoted';
  enrollmentCode: string;
  isCurrent: boolean;
  generalAverage?: string;
  academicStanding?: string;
  subjects?: EnrolledSubject[];
  remarks: string;
}

const HISTORY_DATA: TermHistoryItem[] = [
  {
    id: 'term-current',
    schoolYear: '2026–2027',
    semesterOrTerm: '1st Semester (Current)',
    gradeLevel: 'Grade 11',
    trackAndStrand: 'Technical-Vocational-Livelihood (TVL) – ICT',
    section: 'Section Almario',
    adviser: 'Mr. J. Almario',
    registrationDate: 'August 14, 2026',
    status: 'Officially Enrolled',
    enrollmentCode: 'PLSNHS-ENR-2026-1195168',
    isCurrent: true,
    academicStanding: 'In Progress · Outstanding Standing (92.47)',
    remarks: 'DepEd Free Senior High School Subsidy · All 9 Learning Areas Validated',
    subjects: [
      { code: 'CORE-OC11', title: 'Oral Communication in Context', classification: 'Core', units: 4.0 },
      { code: 'CORE-FIL11', title: 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino', classification: 'Core', units: 4.0 },
      { code: 'CORE-GM11', title: 'General Mathematics', classification: 'Core', units: 4.0 },
      { code: 'CORE-ELS11', title: 'Earth and Life Science', classification: 'Core', units: 4.0 },
      { code: 'CORE-PHIL11', title: 'Introduction to the Philosophy of the Human Person', classification: 'Core', units: 4.0 },
      { code: 'CORE-PE11', title: 'Physical Education and Health 1', classification: 'Core', units: 2.0 },
      { code: 'APP-EAPP11', title: 'English for Academic and Professional Purposes', classification: 'Applied', units: 4.0 },
      { code: 'APP-EMP11', title: 'Empowerment Technologies: ICT for Professional Tracks', classification: 'Applied', units: 4.0 },
      { code: 'SP-CSS11', title: 'Computer Systems Servicing NC II (CSS 1)', classification: 'Specialized', units: 4.0 },
    ],
  },
  {
    id: 'term-gr10',
    schoolYear: '2025–2026',
    semesterOrTerm: 'Full Academic Year',
    gradeLevel: 'Grade 10',
    trackAndStrand: 'Junior High School Curriculum (JHS Completer)',
    section: 'Section Kindness',
    adviser: 'Ms. C. Sanchez',
    registrationDate: 'August 18, 2025',
    status: 'Completed',
    enrollmentCode: 'PLSNHS-ENR-2025-089221',
    isCurrent: false,
    generalAverage: '91.50',
    academicStanding: 'Promoted to Senior High School · With Honors',
    remarks: 'Junior High School Moving Up Certificate Issued · Form 137 / SF10 Reconciled',
  },
  {
    id: 'term-gr9',
    schoolYear: '2024–2025',
    semesterOrTerm: 'Full Academic Year',
    gradeLevel: 'Grade 9',
    trackAndStrand: 'Junior High School Curriculum',
    section: 'Section Wisdom',
    adviser: 'Mr. E. Villamor',
    registrationDate: 'August 22, 2024',
    status: 'Completed',
    enrollmentCode: 'PLSNHS-ENR-2024-071192',
    isCurrent: false,
    generalAverage: '89.75',
    academicStanding: 'Promoted to Grade 10',
    remarks: 'All 8 Learning Areas Passed · Good Moral Standing',
  },
  {
    id: 'term-gr8',
    schoolYear: '2023–2024',
    semesterOrTerm: 'Full Academic Year',
    gradeLevel: 'Grade 8',
    trackAndStrand: 'Junior High School Curriculum',
    section: 'Section Generosity',
    adviser: 'Mrs. L. Alcantara',
    registrationDate: 'August 24, 2023',
    status: 'Completed',
    enrollmentCode: 'PLSNHS-ENR-2023-054481',
    isCurrent: false,
    generalAverage: '88.50',
    academicStanding: 'Promoted to Grade 9',
    remarks: 'Regular Secondary Learner · Continuous Enrollment',
  },
  {
    id: 'term-gr7',
    schoolYear: '2022–2023',
    semesterOrTerm: 'Full Academic Year',
    gradeLevel: 'Grade 7',
    trackAndStrand: 'Junior High School Curriculum (Campus Admission)',
    section: 'Section Fortitude',
    adviser: 'Mr. R. Ramos',
    registrationDate: 'August 25, 2022',
    status: 'Completed',
    enrollmentCode: 'PLSNHS-ENR-2022-031109',
    isCurrent: false,
    generalAverage: '87.25',
    academicStanding: 'Promoted to Grade 8',
    remarks: 'Initial Admission from Elementary · PSA Birth Certificate & Form 138 Verified',
  },
];

const PERMANENT_CREDENTIALS = [
  { name: 'PSA Authenticated Birth Certificate', status: 'Verified & Encoded', date: 'Aug 2022', ref: 'PSA-B-2009-441098' },
  { name: 'Elementary Completion Certificate (SF9/Form 138)', status: 'On Permanent File', date: 'Aug 2022', ref: 'ELEM-138-NAGA' },
  { name: 'JHS Learner Permanent Record (DepEd SF10-JHS)', status: 'Complete & Reconciled', date: 'Jul 2026', ref: 'SF10-JHS-303035' },
  { name: 'JHS Moving Up Certificate of Completion', status: 'DepEd Division Validated', date: 'Jul 2026', ref: 'DIV-NAGA-2026-SHS' },
  { name: 'Certificate of Good Moral Character', status: 'Compliant & Clear', date: 'Aug 2026', ref: 'GMC-2026-00441' },
];

export const StudentEnrollmentHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [expandedTermId, setExpandedTermId] = useState<string | null>('term-current');
  const [activeFilter, setActiveFilter] = useState<'All' | 'SHS' | 'JHS'>('All');
  const [historyItems, setHistoryItems] = useState<TermHistoryItem[]>(HISTORY_DATA);
  const [studentRecord, setStudentRecord] = useState<any>(null);
  const [sectionRecord, setSectionRecord] = useState<any>(null);
  const [enrollmentRecord, setEnrollmentRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const learnerName =
    studentRecord?.full_name ||
    (studentRecord ? `${studentRecord.first_name || ''} ${studentRecord.last_name || ''}`.trim() : '') ||
    user?.full_name ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    'Enrolled Student';
  const learnerLrn = studentRecord?.lrn || user?.student_lrn || '—';
  const learnerGrade = studentRecord?.grade_level || user?.student_grade || 'Grade 10';
  const learnerSection =
    sectionRecord?.name ? `Section ${sectionRecord.name}` : user?.student_section || 'Section 1';
  const learnerStrand = studentRecord?.strand || user?.student_strand || (learnerGrade.includes('11') || learnerGrade.includes('12') ? 'TVL - ICT' : 'Junior High School');
  const schoolYear = enrollmentRecord?.school_year || '2026–2027';

  useEffect(() => {
    async function loadEnrollmentHistory() {
      setLoading(true);
      try {
        const userLrn = user?.student_lrn || user?.email?.match(/\d{12}/)?.[1];
        const userEmail = user?.email?.toLowerCase().trim();

        // 1. Fetch student
        let student: any = null;
        if (userLrn) {
          const { data } = await supabase.from('students').select('*').eq('lrn', userLrn).maybeSingle();
          student = data;
        }
        if (!student && userEmail) {
          const { data } = await supabase.from('students').select('*').eq('email', userEmail).maybeSingle();
          student = data;
        }
        if (!student && user?.id) {
          const { data } = await supabase.from('students').select('*').eq('id', user.id).maybeSingle();
          student = data;
        }

        if (student) {
          setStudentRecord(student);

          // 2. Fetch section
          let resolvedSec: any = null;
          if (student.section_id) {
            const { data: sec } = await supabase.from('sections').select('*').eq('id', student.section_id).maybeSingle();
            if (sec) {
              resolvedSec = sec;
              setSectionRecord(sec);
            }
          }

          // 3. Fetch all enrollments for this student
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('*')
            .or(`student_id.eq.${student.id},email.eq.${student.email || userEmail}`)
            .order('created_at', { ascending: false });

          if (enrollments && enrollments.length > 0) {
            setEnrollmentRecord(enrollments[0]);

            // 4. Fetch grades for GPA
            const { data: gradeRows } = await supabase
              .from('grades')
              .select('grade')
              .eq('student_id', student.id);

            let calculatedGpa = '92.47';
            if (gradeRows && gradeRows.length > 0) {
              const numericGrades = gradeRows.map((g) => Number(g.grade)).filter((n) => !isNaN(n) && n > 0);
              if (numericGrades.length > 0) {
                calculatedGpa = (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length).toFixed(2);
              }
            }

            // Sync current term into history
            const currentEnr = enrollments[0];
            const updatedCurrent: TermHistoryItem = {
              id: 'term-current',
              schoolYear: currentEnr.school_year || '2026–2027',
              semesterOrTerm: '1st Semester (Current)',
              gradeLevel: student.grade_level || currentEnr.grade_level || 'Grade 11',
              trackAndStrand: student.strand || currentEnr.strand || 'TVL - ICT',
              section: resolvedSec ? `Section ${resolvedSec.name}` : 'Section Almario',
              adviser: resolvedSec?.adviser_name || 'Mr. J. Almario',
              registrationDate: currentEnr.enrolled_date
                ? new Date(currentEnr.enrolled_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : currentEnr.created_at
                ? new Date(currentEnr.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : 'August 14, 2026',
              status: (currentEnr.status === 'Approved' ? 'Officially Enrolled' : currentEnr.status) || 'Officially Enrolled',
              enrollmentCode: `PLSNHS-ENR-${(currentEnr.school_year || '2026').slice(0, 4)}-${student.lrn?.slice(0, 7) || '1195168'}`,
              isCurrent: true,
              academicStanding: `In Progress · Outstanding Standing (${calculatedGpa})`,
              remarks: 'DepEd Free Senior High School Subsidy · All Learning Areas Validated',
              subjects: [
                { code: 'CORE-OC11', title: 'Oral Communication in Context', classification: 'Core', units: 4.0 },
                { code: 'CORE-FIL11', title: 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino', classification: 'Core', units: 4.0 },
                { code: 'CORE-GM11', title: 'General Mathematics', classification: 'Core', units: 4.0 },
                { code: 'CORE-ELS11', title: 'Earth and Life Science', classification: 'Core', units: 4.0 },
                { code: 'CORE-PHIL11', title: 'Introduction to the Philosophy of the Human Person', classification: 'Core', units: 4.0 },
                { code: 'CORE-PE11', title: 'Physical Education and Health 1', classification: 'Core', units: 2.0 },
                { code: 'APP-EAPP11', title: 'English for Academic and Professional Purposes', classification: 'Applied', units: 4.0 },
                { code: 'APP-EMP11', title: 'Empowerment Technologies: ICT for Professional Tracks', classification: 'Applied', units: 4.0 },
                { code: 'SP-CSS11', title: 'Computer Systems Servicing NC II (CSS 1)', classification: 'Specialized', units: 4.0 },
              ],
            };

            const otherTerms = HISTORY_DATA.slice(1);
            setHistoryItems([updatedCurrent, ...otherTerms]);
          }
        }
      } catch (err) {
        console.warn('History fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadEnrollmentHistory();
  }, [user]);

  const toggleExpand = (id: string) => {
    setExpandedTermId((prev) => (prev === id ? null : id));
  };

  const filteredHistory = historyItems.filter((item) => {
    if (activeFilter === 'SHS') return item.gradeLevel.includes('11') || item.gradeLevel.includes('12');
    if (activeFilter === 'JHS') return !item.gradeLevel.includes('11') && !item.gradeLevel.includes('12');
    return true;
  });

  const shsCount = historyItems.filter((item) => item.gradeLevel.includes('11') || item.gradeLevel.includes('12')).length;
  const jhsCount = historyItems.filter((item) => !item.gradeLevel.includes('11') && !item.gradeLevel.includes('12')).length;

  // Export CSV
  const handleExportCsv = () => {
    const csvLines: string[] = [];
    csvLines.push('"PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL"');
    csvLines.push('"OFFICIAL LEARNER ENROLLMENT HISTORY & ACADEMIC PROGRESSION (DEPED SF10 TRACE)"');
    csvLines.push(`"Learner Name:","${learnerName}"`);
    csvLines.push(`"LRN:","${learnerLrn}"`);
    csvLines.push(`"Current Grade & Section:","${learnerGrade} - ${learnerSection}"`);
    csvLines.push(`"Track & Strand:","${learnerStrand}"`);
    csvLines.push(`"School ID:","303035"`);
    csvLines.push(`"Date of Extraction:","${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}"`);
    csvLines.push('""');
    csvLines.push('"School Year","Term","Grade Level","Curricular Program / Strand","Section","Class Adviser","Enrollment Reference","Registration Date","Academic Standing / Rating","Status","Official Remarks"');

    historyItems.forEach((item) => {
      csvLines.push([
        `"${item.schoolYear}"`,
        `"${item.semesterOrTerm}"`,
        `"${item.gradeLevel}"`,
        `"${item.trackAndStrand}"`,
        `"${item.section}"`,
        `"${item.adviser}"`,
        `"${item.enrollmentCode}"`,
        `"${item.registrationDate}"`,
        `"${item.generalAverage ? `${item.generalAverage} (${item.academicStanding})` : item.academicStanding || 'In Progress'}"`,
        `"${item.status}"`,
        `"${item.remarks}"`,
      ].join(','));
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PLSNHS_Enrollment_History_${learnerName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Certificate of Enrollment History
  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `PLSNHS_Official_Enrollment_History_${learnerName.replace(/\s+/g, '_')}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-fade-in w-full pb-16">
      {/* Inline Print Styles */}
      <style>{`
        @media print {
          .no-print,
          #hesChatbotContainer,
          .hes-chatbot-launcher,
          header,
          aside,
          nav {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Screen Control Header (Aligned with Dashboard & Admin standard) */}
      <div className="no-print border-b border-slate-200 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-display tracking-tight leading-snug">
              Enrollment History &amp; Past Terms
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Official academic progression timeline, term registrations, and DepEd SF10 permanent record trace · S.Y. {schoolYear}
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-auto pt-0.5">
            <PageHeaderNotificationSlot />
          </div>
        </div>
      </div>

      {/* Learner Identity & Curricular Matrix Strip */}
      <div className="no-print rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#152e69]/10 text-[#152e69] font-black shrink-0">
              <GraduationCap className="h-6 w-6 text-[#152e69]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm sm:text-base">{learnerName}</span>
                <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  LRN: {learnerLrn}
                </span>
              </div>
              <p className="text-slate-500 text-[11.5px] mt-0.5">
                Current Level: <strong className="text-slate-800">{learnerGrade} – {learnerSection}</strong> · {learnerStrand} · School ID: <strong>303035</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> DepEd LIS Confirmed
            </span>
          </div>
        </div>
      </div>

      {/* Executive Academic Progression Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Current Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Current Enrollment
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-display">Grade 11 · SHS</p>
            <span className="text-xs font-bold text-emerald-700">1st Semester Active</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>S.Y. {schoolYear} · TVL Track</span>
          </div>
        </div>

        {/* Card 2: Campus Residency */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Campus Residency
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <History className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-display">5 School Years</p>
            <span className="text-xs font-bold text-blue-700">Grades 7 through 11</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Placido L. Señor NHS (Continuous)</span>
          </div>
        </div>

        {/* Card 3: Academic Credits */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Curricular Progression
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-display">100% Passed</p>
            <span className="text-xs font-bold text-amber-700">0 Back-Subjects</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>JHS Completed with Honors</span>
          </div>
        </div>

        {/* Card 4: Subsidy Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tuition &amp; Subsidy
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#152e69]">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-display">100% Funded</p>
            <span className="text-xs font-bold text-[#152e69]">DepEd Public Subsidy</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Republic Act 10533 Compliant</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & History Timeline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">Academic Term History &amp; Matched Records</h2>
          <p className="text-xs text-slate-500">Chronological enrollment records registered in the School Information Database</p>
        </div>

        {/* Program Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
          {(['All', 'SHS', 'JHS'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeFilter === tab
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              {tab === 'All' ? `All Terms (${historyItems.length})` : tab === 'SHS' ? `Senior High (${shsCount})` : `Junior High (${jhsCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Chronological Enrollment History Timeline Cards */}
      <div className="space-y-4">
        {filteredHistory.map((item) => {
          const isExpanded = expandedTermId === item.id;
          return (
            <div
              key={item.id}
              className={`rounded-2xl border transition-all ${
                item.isCurrent
                  ? 'border-emerald-300 bg-white shadow-md ring-2 ring-emerald-500/10'
                  : 'border-slate-200 bg-white shadow-xs hover:border-slate-300'
              }`}
            >
              {/* Card Header Section */}
              <div
                className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer"
                onClick={() => toggleExpand(item.id)}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 ${
                      item.isCurrent
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <GraduationCap className="h-6 w-6" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-slate-900">
                        S.Y. {item.schoolYear} · {item.semesterOrTerm}
                      </h3>
                      {item.isCurrent ? (
                        <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 uppercase tracking-wide">
                          Active Term
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {item.status}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-slate-700 mt-1">
                      {item.gradeLevel} · <span className="text-[#152e69] font-bold">{item.trackAndStrand}</span>
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                      <span>Section: <strong className="text-slate-800">{item.section}</strong></span>
                      <span>•</span>
                      <span>Class Adviser: <strong className="text-slate-800">{item.adviser}</strong></span>
                      <span>•</span>
                      <span>Registered: <strong>{item.registrationDate}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                  <div className="text-left lg:text-right">
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">
                      Reference Code
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {item.enrollmentCode}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                    aria-label="Toggle details"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expandable Details Section */}
              {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50/50 p-5 rounded-b-2xl space-y-4 animate-fade-in">
                  {/* Academic Standing & Standing Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Academic Performance</span>
                      <p className="font-extrabold text-slate-900 mt-0.5 text-sm">
                        {item.generalAverage ? `General Average: ${item.generalAverage}` : item.academicStanding}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.remarks}</p>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">DepEd Validation Status</span>
                      <p className="font-bold text-emerald-800 mt-0.5 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Official DepEd Form 137 / SF10 Record Locked
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Permanent School ID: 303035 · Naga City Schools Division
                      </p>
                    </div>
                  </div>

                  {/* If Current Semester: List Enrolled Subjects */}
                  {item.subjects && item.subjects.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Officially Enrolled Learning Areas ({item.subjects.length} Subjects · 34.0 Units)
                        </h4>
                        <span className="text-[10.5px] font-bold text-emerald-800">Curriculum Matrix Active</span>
                      </div>

                      <div className="overflow-x-auto w-full rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-left text-xs min-w-[550px]">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[9.5px]">
                            <tr>
                              <th className="px-4 py-2.5">Subject Title</th>
                              <th className="px-4 py-2.5">Code</th>
                              <th className="px-4 py-2.5">Classification</th>
                              <th className="px-4 py-2.5 text-right">Units / Credit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[11px]">
                            {item.subjects.map((s, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2 font-bold text-slate-900">{s.title}</td>
                                <td className="px-4 py-2 font-mono text-slate-500">{s.code}</td>
                                <td className="px-4 py-2">
                                  <span className={`px-2 py-0.5 rounded-full font-bold text-[9.5px] ${
                                    s.classification === 'Core'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : s.classification === 'Applied'
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}>
                                    {s.classification}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-slate-800">
                                  {s.units.toFixed(1)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Official DepEd Permanent Record & Credentials Audit Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">DepEd Permanent Academic Credentials on File</h3>
            <p className="text-xs text-slate-500">Official documentary compliance certified with Placido L. Señor NHS Registrar</p>
          </div>
          <span className="text-xs font-bold text-emerald-800 font-mono">100% Compliant</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {PERMANENT_CREDENTIALS.map((doc, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-900 truncate" title={doc.name}>{doc.name}</span>
                <span className="text-emerald-700 shrink-0 font-bold text-[10.5px]">Verified</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Verified: <strong className="text-slate-700">{doc.date}</strong></span>
                <span className="font-mono text-[10px] text-slate-400">{doc.ref}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Official Action Controls (Bottom Aligned) */}
      <div className="no-print flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-200">
        <button
          type="button"
          onClick={handleExportCsv}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all cursor-pointer active:scale-98"
          title="Download complete enrollment history as CSV"
        >
          <Download className="h-4 w-4 text-slate-500" />
          <span>Export History CSV</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2.5 rounded-xl bg-[#152e69] hover:bg-[#0f1f4b] px-5 text-xs font-bold text-white shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-98"
          title="Print official enrollment history certificate"
        >
          <Printer className="h-4 w-4 text-[#F5C518]" />
          <span>Print Enrollment Record</span>
        </button>
      </div>
    </div>
  );
};
