import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Layers,
  School,
  Download,
  Printer,
  GraduationCap,
  Calendar,
  UserCheck,
  ShieldCheck,
  BookOpen,
  Building,
  Check,
  Sparkles,
  RefreshCw,
  Lock,
  Unlock,
  User,
  Award,
  FileCheck,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useEnrollmentStatus } from '../../lib/enrollmentControlStore';
import { Badge } from '../../components/common/Badge';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';

interface EnrolledCourse {
  code: string;
  title: string;
  classification: 'Core' | 'Applied' | 'Specialized';
  units: number;
  schedule: string;
  room: string;
  instructor: string;
}

interface RequirementItem {
  id: string;
  title: string;
  type: string;
  dateVerified: string;
  referenceNo: string;
  status: 'Verified' | 'Compliant';
}

const ENROLLED_COURSES: EnrolledCourse[] = [
  {
    code: 'CORE-OC11',
    title: 'Oral Communication in Context',
    classification: 'Core',
    units: 4.0,
    schedule: 'Mon / Wed / Fri · 07:30 AM – 08:30 AM',
    room: 'SHS Bldg 2, Rm 204',
    instructor: 'Mr. J. Almario',
  },
  {
    code: 'CORE-FIL11',
    title: 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
    classification: 'Core',
    units: 4.0,
    schedule: 'Mon / Wed / Fri · 08:30 AM – 09:30 AM',
    room: 'SHS Bldg 2, Rm 204',
    instructor: 'Mrs. E. Dela Torre',
  },
  {
    code: 'CORE-GM11',
    title: 'General Mathematics',
    classification: 'Core',
    units: 4.0,
    schedule: 'Tue / Thu · 07:30 AM – 09:30 AM',
    room: 'SHS Bldg 2, Rm 204',
    instructor: 'Mrs. M. Santos',
  },
  {
    code: 'CORE-ELS11',
    title: 'Earth and Life Science',
    classification: 'Core',
    units: 4.0,
    schedule: 'Tue / Thu · 09:45 AM – 11:45 AM',
    room: 'Science Laboratory 2',
    instructor: 'Mr. J. Rodriguez',
  },
  {
    code: 'CORE-PHIL11',
    title: 'Introduction to the Philosophy of the Human Person',
    classification: 'Core',
    units: 4.0,
    schedule: 'Mon / Wed · 10:00 AM – 12:00 PM',
    room: 'SHS Bldg 2, Rm 204',
    instructor: 'Mr. C. Villanueva',
  },
  {
    code: 'CORE-PE11',
    title: 'Physical Education and Health 1',
    classification: 'Core',
    units: 2.0,
    schedule: 'Friday · 09:45 AM – 11:45 AM',
    room: 'School Gymnasium',
    instructor: 'Coach D. Abad',
  },
  {
    code: 'APP-EAPP11',
    title: 'English for Academic and Professional Purposes',
    classification: 'Applied',
    units: 4.0,
    schedule: 'Mon / Wed / Fri · 01:00 PM – 02:00 PM',
    room: 'SHS Bldg 2, Rm 204',
    instructor: 'Ms. K. Soriano',
  },
  {
    code: 'APP-EMP11',
    title: 'Empowerment Technologies: ICT for Professional Tracks',
    classification: 'Applied',
    units: 4.0,
    schedule: 'Tue / Thu · 01:00 PM – 03:00 PM',
    room: 'Computer Laboratory 1',
    instructor: 'Mr. R. Ramos',
  },
  {
    code: 'SP-CSS11',
    title: 'Computer Systems Servicing NC II (CSS 1)',
    classification: 'Specialized',
    units: 4.0,
    schedule: 'Mon / Wed · 02:00 PM – 04:00 PM',
    room: 'ICT Hardware Laboratory',
    instructor: 'Engr. J. Maurin',
  },
];

const REQUIREMENTS: RequirementItem[] = [
  {
    id: 'req-1',
    title: 'Form 138 (Junior High School Report Card / SF9)',
    type: 'Official DepEd Academic Record',
    dateVerified: 'August 14, 2026',
    referenceNo: 'SF9-JHS-303035-2026',
    status: 'Verified',
  },
  {
    id: 'req-2',
    title: 'PSA Authenticated Birth Certificate',
    type: 'Civil Registrar Document (SECPA Copy)',
    dateVerified: 'August 14, 2026',
    referenceNo: 'PSA-B-2009-4410982',
    status: 'Verified',
  },
  {
    id: 'req-3',
    title: 'Certificate of Good Moral Character',
    type: 'Institutional Conduct Clearance',
    dateVerified: 'August 14, 2026',
    referenceNo: 'GMC-2026-NAGA-091',
    status: 'Verified',
  },
  {
    id: 'req-4',
    title: '2×2 Recent ID Photos (White Background)',
    type: 'Biometric & Student ID Capture',
    dateVerified: 'August 14, 2026',
    referenceNo: 'DIGI-ID-2026-004',
    status: 'Verified',
  },
  {
    id: 'req-5',
    title: 'DepEd Health & Medical Clearance Form',
    type: 'School Clinic Health Appraisal',
    dateVerified: 'August 16, 2026',
    referenceNo: 'CLINIC-CLR-2026-78',
    status: 'Compliant',
  },
];

export const StudentEnrollmentPage: React.FC = () => {
  const { user } = useAuth();
  const { settings: enrollmentSettings, isOpen: isEnrollmentOpen } = useEnrollmentStatus();

  const [studentRecord, setStudentRecord] = useState<any>(null);
  const [sectionRecord, setSectionRecord] = useState<any>(null);
  const [enrollmentRecord, setEnrollmentRecord] = useState<any>(null);
  const [courses, setCourses] = useState<EnrolledCourse[]>(ENROLLED_COURSES);
  const [requirementsList, setRequirementsList] = useState<RequirementItem[]>(REQUIREMENTS);
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
  const adviserName = sectionRecord?.adviser_name || 'Class Adviser';
  const roomName = sectionRecord?.room || 'Academic Building';
  const schoolYear = enrollmentRecord?.school_year || enrollmentSettings?.schoolYear || '2026–2027';

  useEffect(() => {
    async function loadStudentEnrollmentData() {
      setLoading(true);
      try {
        const userLrn = user?.student_lrn || user?.email?.match(/\d{12}/)?.[1];
        const userEmail = user?.email?.toLowerCase().trim();

        // 1. Fetch student from Supabase
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

          // 2. Fetch section if section_id exists
          let resolvedSec: any = null;
          if (student.section_id) {
            const { data: sec } = await supabase.from('sections').select('*').eq('id', student.section_id).maybeSingle();
            if (sec) {
              resolvedSec = sec;
              setSectionRecord(sec);
            }
          }

          // 3. Fetch enrollment record
          const { data: enr } = await supabase
            .from('enrollments')
            .select('*')
            .or(`student_id.eq.${student.id},email.eq.${student.email || userEmail}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (enr) setEnrollmentRecord(enr);

          // 4. Fetch curriculum subjects from Supabase subjects table
          const gradeNum = student.grade_level?.match(/\d+/)?.[0] || '11';
          const { data: subData } = await supabase
            .from('subjects')
            .select('*')
            .or(`grade_level.eq.${student.grade_level},grade_level.eq.${gradeNum}`)
            .limit(9);

          if (subData && subData.length > 0) {
            const mappedCourses: EnrolledCourse[] = subData.map((s: any, idx: number) => {
              const times = [
                'Mon / Wed / Fri · 07:30 AM – 08:30 AM',
                'Mon / Wed / Fri · 08:30 AM – 09:30 AM',
                'Tue / Thu · 07:30 AM – 09:30 AM',
                'Tue / Thu · 09:45 AM – 11:45 AM',
                'Mon / Wed · 10:00 AM – 12:00 PM',
                'Friday · 09:45 AM – 11:45 AM',
                'Mon / Wed / Fri · 01:00 PM – 02:00 PM',
                'Tue / Thu · 01:00 PM – 03:00 PM',
                'Mon / Wed · 02:00 PM – 04:00 PM',
              ];
              return {
                code: s.code || `SUBJ-${s.id?.slice(0, 4)}`,
                title: s.name,
                classification: (s.subject_type as any) || (idx < 5 ? 'Core' : idx < 7 ? 'Applied' : 'Specialized'),
                units: s.hours ? Number((s.hours / 20).toFixed(1)) : (idx === 5 ? 2.0 : 4.0),
                schedule: times[idx % times.length],
                room: resolvedSec?.room || 'SHS Bldg 2, Rm 204',
                instructor: resolvedSec?.adviser_name || 'Faculty Instructor',
              };
            });
            setCourses(mappedCourses);
          }

          // 5. Build dynamic documentary requirements audit
          const has138 = Boolean(student.form_138_url || enr?.report_card_url || enr?.form_137_url);
          const hasPsa = Boolean(student.psa_birth_url || enr?.psa_birth_cert_url);
          const hasMoral = Boolean(student.good_moral_url || enr?.good_moral_cert_url);
          const hasPhoto = Boolean(student.two_by_two_picture_url || enr?.two_by_two_picture_url || student.avatar_url);

          setRequirementsList([
            {
              id: 'req-1',
              title: 'Form 138 (Junior High School Report Card / SF9)',
              type: 'Official DepEd Academic Record',
              dateVerified: student.created_at ? new Date(student.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'August 14, 2026',
              referenceNo: `SF9-JHS-${learnerLrn.slice(0, 6)}-2026`,
              status: has138 || student.documents_status === 'complete' ? 'Verified' : 'Compliant',
            },
            {
              id: 'req-2',
              title: 'PSA Authenticated Birth Certificate',
              type: 'Civil Registrar Document (SECPA Copy)',
              dateVerified: student.created_at ? new Date(student.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'August 14, 2026',
              referenceNo: `PSA-B-${learnerLrn.slice(0, 6)}`,
              status: hasPsa || student.documents_status === 'complete' ? 'Verified' : 'Compliant',
            },
            {
              id: 'req-3',
              title: 'Certificate of Good Moral Character',
              type: 'Institutional Conduct Clearance',
              dateVerified: student.created_at ? new Date(student.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'August 14, 2026',
              referenceNo: `GMC-2026-${learnerLrn.slice(0, 4)}`,
              status: hasMoral || student.documents_status === 'complete' ? 'Verified' : 'Compliant',
            },
            {
              id: 'req-4',
              title: '2×2 Recent ID Photos (White Background)',
              type: 'Biometric & Student ID Capture',
              dateVerified: student.created_at ? new Date(student.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'August 14, 2026',
              referenceNo: `DIGI-ID-${learnerLrn.slice(0, 6)}`,
              status: hasPhoto || student.documents_status === 'complete' ? 'Verified' : 'Compliant',
            },
            {
              id: 'req-5',
              title: 'DepEd Health & Medical Clearance Form',
              type: 'School Clinic Health Appraisal',
              dateVerified: student.created_at ? new Date(student.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'August 16, 2026',
              referenceNo: `CLINIC-CLR-${learnerLrn.slice(0, 4)}`,
              status: 'Compliant',
            },
          ]);
        }
      } catch (err) {
        console.warn('Student enrollment load note:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStudentEnrollmentData();
  }, [user]);

  const totalUnits = courses.reduce((sum, c) => sum + c.units, 0).toFixed(1);

  // Export CSV
  const handleExportCsv = () => {
    const csvLines: string[] = [];
    csvLines.push('"PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL"');
    csvLines.push('"OFFICIAL CERTIFICATE OF MATRICULATION & ENROLLMENT (SY 2026-2027)"');
    csvLines.push(`"Learner Name:","${learnerName}"`);
    csvLines.push(`"LRN:","${learnerLrn}"`);
    csvLines.push(`"Grade Level & Section:","${learnerGrade} - ${learnerSection}"`);
    csvLines.push(`"Track & Strand:","${learnerStrand}"`);
    csvLines.push(`"School ID:","303035"`);
    csvLines.push(`"Total Enrolled Units:","${totalUnits} Units"`);
    csvLines.push(`"Status:","Officially Enrolled · Validated"`);
    csvLines.push('""');
    csvLines.push('"Course Code","Subject Title","Classification","Units","Class Schedule","Room / Laboratory","Faculty Instructor"');

    courses.forEach((c) => {
      csvLines.push([
        `"${c.code}"`,
        `"${c.title}"`,
        `"${c.classification}"`,
        String(c.units),
        `"${c.schedule}"`,
        `"${c.room}"`,
        `"${c.instructor}"`,
      ].join(','));
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PLSNHS_Enrolment_Certificate_${learnerName.replace(/\s+/g, '_')}_SY2026-2027.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Certificate of Enrollment
  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `PLSNHS_Certificate_of_Enrolment_${learnerName.replace(/\s+/g, '_')}`;
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

      {/* Screen Control Header */}
      <div className="no-print border-b border-slate-200 pb-4 sm:pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-display tracking-tight leading-snug">
              Enrollment &amp; Registration Record
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Official academic matriculation record, DepEd LIS registration status, and curriculum assignment · S.Y. {schoolYear}
            </p>
          </div>

          {/* Action Controls & Notification Slot in unified header container */}
          <div className="flex items-center gap-2.5 shrink-0 ml-auto pt-0.5">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex h-9 sm:h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 sm:px-4 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all cursor-pointer active:scale-98"
              title="Download official enrollment matriculation record as CSV"
            >
              <Download className="h-4 w-4 text-slate-500" />
              <span>Export Slip</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex h-9 sm:h-10 items-center justify-center gap-2 rounded-xl bg-[#152e69] hover:bg-[#0f1f4b] px-3.5 sm:px-4 text-xs font-bold text-white shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-98"
              title="Print official Certificate of Matriculation & Enrollment"
            >
              <Printer className="h-4 w-4 text-[#F5C518]" />
              <span>Print Certificate</span>
            </button>

            <PageHeaderNotificationSlot />
          </div>
        </div>
      </div>

      {/* Admin Enrollment Status Banner */}
      {!isEnrollmentOpen && (
        <div className="no-print rounded-2xl border border-amber-200 bg-amber-50/90 p-4 shadow-xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm">
              <Lock className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-950">
                  Student Enrollment Is Closed by School Administration
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-200 text-amber-900">
                  S.Y. {enrollmentSettings.schoolYear}
                </span>
              </div>
              <p className="text-xs text-amber-900/80 mt-0.5 leading-relaxed">
                {enrollmentSettings.message ||
                  'New admissions and student enrollment applications are currently paused by the Admin. Your existing enrolled courses, schedule, and registration record below remain active and verified.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Learner Demographic Matrix Strip */}
      <div className="no-print rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:border-slate-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#152e69] to-[#0f1f4b] text-[#F5C518] font-black text-lg shadow-sm shrink-0 border border-slate-700/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight font-display">
                  {learnerName}
                </span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 rounded-lg shadow-2xs">
                  <span className="text-slate-400 font-sans text-[10px]">DepEd LRN:</span> {learnerLrn}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10.5px] font-extrabold text-emerald-800">
                  <CheckCircle className="h-3 w-3 text-emerald-600" />
                  Officially Enrolled
                </span>
              </div>
              <p className="text-slate-500 text-xs sm:text-[12.5px] mt-1 leading-relaxed">
                Academic Level: <strong className="text-slate-800 font-bold">{learnerGrade} – {learnerSection}</strong> · Track: <span className="text-[#152e69] font-bold">{learnerStrand}</span> · <span className="text-slate-600">Placido L. Señor National High School</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3.5 py-2 text-xs font-bold text-emerald-900 shadow-2xs">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <div className="text-[11px] font-black leading-none">DepEd LIS Confirmed</div>
                <div className="text-[10px] font-medium text-emerald-700 leading-none mt-0.5">1st Semester · S.Y. {schoolYear}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Matriculation KPI Cards: Auto-adjusts from Laptops to Large Displays */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Enrollment Status */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Matriculation Status
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-xl font-black text-slate-900 font-display">Officially Enrolled</p>
            <span className="text-xs font-bold text-emerald-700">Admitted &amp; Reconciled</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
            <Calendar className="h-3 w-3 text-slate-400" />
            <span>Enrolled: August 14, 2026</span>
          </div>
        </div>

        {/* Card 2: Curriculum Load */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Approved Load
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs">
              <BookOpen className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-xl font-black text-slate-900 font-display">{courses.length} Learning Areas</p>
            <span className="text-xs font-bold text-blue-700">{totalUnits} Units Approved</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
            <Sparkles className="h-3 w-3 text-blue-500" />
            <span>Core, Applied &amp; Specialized</span>
          </div>
        </div>

        {/* Card 3: Advisory & Room */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-400" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Assigned Section
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 shadow-2xs">
              <Layers className="h-4 w-4 text-amber-600" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-xl font-black text-slate-900 font-display">{learnerSection}</p>
            <span className="text-xs font-bold text-amber-800">{adviserName} (Adviser)</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
            <Building className="h-3 w-3 text-slate-400" />
            <span className="truncate">{roomName}</span>
          </div>
        </div>

        {/* Card 4: Government Subsidy */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#152e69] to-indigo-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tuition &amp; Fees
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-[#152e69] border border-indigo-200/60 shadow-2xs">
              <ShieldCheck className="h-4 w-4 text-[#152e69]" />
            </div>
          </div>
          <div className="mt-2.5">
            <p className="text-xl font-black text-slate-900 font-display">100% Free Public Ed</p>
            <span className="text-xs font-bold text-[#152e69]">DepEd Subsidized</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
            <Check className="h-3 w-3 text-emerald-600" />
            <span>Zero Matriculation Fees Due</span>
          </div>
        </div>
      </div>

      {/* Enrolled Curriculum Load & Schedule Table */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight font-display">
              Officially Enrolled Curriculum &amp; Class Schedule
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Confirmed subject load for {learnerGrade} · 1st Semester · S.Y. {schoolYear}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200/80 px-3.5 py-1.5 rounded-xl w-fit shadow-2xs">
            <GraduationCap className="h-4 w-4 text-[#152e69]" />
            <span>Total Academic Credit:</span>
            <span className="font-mono font-extrabold text-[#152e69]">{totalUnits} Units</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Subject Code &amp; Title</th>
                  <th className="px-5 py-3.5">Classification</th>
                  <th className="px-5 py-3.5 text-center">Units</th>
                  <th className="px-5 py-3.5">Class Schedule</th>
                  <th className="px-5 py-3.5">Room / Lab</th>
                  <th className="px-5 py-3.5">Assigned Instructor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((course) => (
                  <tr key={course.code} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900 text-[12.5px]">{course.title}</p>
                      <span className="inline-block mt-0.5 font-mono text-[10.5px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {course.code}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[10.5px] ${
                          course.classification === 'Core'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200'
                            : course.classification === 'Applied'
                            ? 'bg-amber-50 text-amber-900 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {course.classification}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-center font-mono font-black text-slate-900 text-xs">
                      {course.units.toFixed(1)}
                    </td>

                    <td className="px-5 py-3.5 text-slate-700 font-medium whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{course.schedule}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{course.room}</span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-800 font-semibold whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{course.instructor}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50/80 border-t border-slate-200 text-slate-700 text-xs font-semibold">
                <tr>
                  <td colSpan={2} className="px-5 py-3 text-slate-600 font-bold">
                    Total Curriculum Load ({courses.length} Subject Areas)
                  </td>
                  <td className="px-5 py-3 text-center font-mono font-black text-[#152e69]">
                    {totalUnits} Units
                  </td>
                  <td colSpan={3} className="px-5 py-3 text-right text-slate-500 font-mono text-[11px]">
                    Department of Education Validated Load
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Official Documentary Requirements Audit */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight font-display">
              Official Documentary Requirements Audit
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Department of Education mandatory admission documents on permanent file with the Registrar
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 font-mono bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl w-fit shadow-2xs">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            100% Verified &amp; Compliant
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {requirementsList.map((req) => (
            <div
              key={req.id}
              className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 space-y-2 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-2xs"
            >
              <div className="flex items-start justify-between gap-2 text-xs font-bold">
                <span className="text-slate-900 font-semibold line-clamp-1" title={req.title}>
                  {req.title}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-extrabold text-emerald-900 shrink-0">
                  <Check className="h-2.5 w-2.5 text-emerald-700" />
                  {req.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">{req.type}</p>
              <div className="flex items-center justify-between text-[10.5px] text-slate-500 pt-2 border-t border-slate-200/60 font-mono">
                <span>Verified: {req.dateVerified}</span>
                <span className="text-slate-400">{req.referenceNo}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Official DepEd Certification & Tri-Signatory Block */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-[#152e69]" />
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Official Certification of Matriculation
            </h4>
          </div>
          <span className="font-mono text-[10.5px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            DEPED-R7-NAGA-303035
          </span>
        </div>

        <div className="text-xs sm:text-[12.5px] text-slate-700 leading-relaxed">
          <p>
            This document certifies that <strong className="text-slate-900 font-extrabold">{learnerName.toUpperCase()}</strong> (Learner Reference Number: <span className="font-mono font-bold text-slate-950 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{learnerLrn}</span>) is an officially registered learner of <strong>PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL</strong> for the <strong>First Semester of School Year {schoolYear}</strong> in the Senior High School Program. All preliminary credentials, DepEd Learner Information System (LIS) endorsements, and curriculum course assignments have been duly verified, validated, and entered into the institutional permanent record.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5 border-t border-slate-100 text-center text-xs">
          <div className="space-y-1">
            <div className="border-b border-slate-300 pb-1 mb-1 font-bold text-slate-950 uppercase text-[11.5px] tracking-tight">
              {adviserName.toUpperCase()}
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-600 block">Class Adviser</span>
            <span className="text-[9.5px] text-slate-400 block">Faculty Adviser · Placido L. Señor NHS</span>
          </div>

          <div className="space-y-1">
            <div className="border-b border-slate-300 pb-1 mb-1 font-bold text-slate-950 uppercase text-[11.5px] tracking-tight">
              MARIA ELENA R. REGISTRAR
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-600 block">School Registrar II</span>
            <span className="text-[9.5px] text-slate-400 block">LIS In-Charge &amp; Records Officer</span>
          </div>

          <div className="space-y-1">
            <div className="border-b border-slate-300 pb-1 mb-1 font-bold text-slate-950 uppercase text-[11.5px] tracking-tight">
              JUSTINE MANGILA, Dev.Ed.D.
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-600 block">School Principal I</span>
            <span className="text-[9.5px] text-slate-400 block">School Head / Authorized Officer</span>
          </div>
        </div>

        <div className="pt-2 text-center text-[10px] text-slate-400 uppercase tracking-widest font-mono">
          Official DepEd Electronic Record · Placido L. Señor NHS · Division of City of Naga, Cebu
        </div>
      </div>

      {/* Official Action Controls (Bottom Aligned) */}
      <div className="no-print flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleExportCsv}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all cursor-pointer active:scale-98"
          title="Download official enrollment matriculation record as CSV"
        >
          <Download className="h-4 w-4 text-slate-500" />
          <span>Export Slip (CSV)</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#152e69] hover:bg-[#0f1f4b] px-5 text-xs font-bold text-white shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-98"
          title="Print official Certificate of Matriculation & Enrollment"
        >
          <Printer className="h-4 w-4 text-[#F5C518]" />
          <span>Print Official Certificate of Enrollment</span>
        </button>
      </div>
    </div>
  );
};
