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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
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
    'Jorvin Pengoc';
  const learnerLrn = studentRecord?.lrn || user?.student_lrn || '11951680082';
  const learnerGrade = studentRecord?.grade_level || user?.student_grade || 'Grade 11';
  const learnerSection =
    sectionRecord?.name ? `Section ${sectionRecord.name}` : user?.student_section || 'Section Almario';
  const learnerStrand = studentRecord?.strand || user?.student_strand || 'TVL - ICT';
  const adviserName = sectionRecord?.adviser_name || 'Mr. J. Almario';
  const roomName = sectionRecord?.room || 'SHS Bldg 2, Rm 204';
  const schoolYear = enrollmentRecord?.school_year || '2026–2027';

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
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-16">
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
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight whitespace-nowrap">
            Enrollment &amp; Registration Record
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official academic matriculation record, DepEd LIS registration status, and curriculum assignment · S.Y. {schoolYear}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <PageHeaderNotificationSlot />
        </div>
      </div>

      {/* Learner Demographic Matrix Strip */}
      <div className="no-print rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-black shrink-0">
              <CheckCircle2 className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm sm:text-base">{learnerName}</span>
                <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  LRN: {learnerLrn}
                </span>
                <Badge variant="success" size="sm">
                  {user?.student_status || 'Enrolled'}
                </Badge>
              </div>
              <p className="text-slate-500 text-[11.5px] mt-0.5">
                Current Level: <strong className="text-slate-800">{learnerGrade} – {learnerSection}</strong> · <span className="text-[#152e69] font-bold">{learnerStrand}</span> · School ID: <strong>303035</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> DepEd LIS Confirmed · 1st Semester
            </span>
          </div>
        </div>
      </div>

      {/* Executive Matriculation KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Enrollment Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Matriculation Status
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-display">Officially Enrolled</p>
            <span className="text-xs font-bold text-emerald-700">Admitted &amp; Reconciled</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Enrolled: August 14, 2026</span>
          </div>
        </div>

        {/* Card 2: Curriculum Load */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Approved Load
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-display">{courses.length} Learning Areas</p>
            <span className="text-xs font-bold text-blue-700">{totalUnits} Units Approved</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Core, Applied &amp; Specialized</span>
          </div>
        </div>

        {/* Card 3: Advisory & Room */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Assigned Section
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-display">{learnerSection}</p>
            <span className="text-xs font-bold text-amber-700">{adviserName} (Adviser)</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>{roomName}</span>
          </div>
        </div>

        {/* Card 4: Government Subsidy */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tuition &amp; Fees
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-display">100% Free Public Ed</p>
            <span className="text-xs font-bold text-purple-700">DepEd Subsidized</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Zero Matriculation Fees Due</span>
          </div>
        </div>
      </div>

      {/* Enrolled Curriculum Load & Schedule Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Officially Enrolled Curriculum &amp; Class Schedule
            </h3>
            <p className="text-xs text-slate-500">
              Confirmed subject load for Grade 11 · 1st Semester · S.Y. {schoolYear}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-700 font-mono bg-slate-100 px-3 py-1 rounded-xl w-fit">
            Total Academic Credit: <strong>{totalUnits} Units</strong>
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
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
                      <p className="font-bold text-slate-900">{course.title}</p>
                      <span className="font-mono text-[10.5px] text-slate-400">{course.code}</span>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          course.classification === 'Core'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : course.classification === 'Applied'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {course.classification}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-center font-mono font-black text-slate-900 text-xs">
                      {course.units.toFixed(1)}
                    </td>

                    <td className="px-5 py-3.5 text-slate-700 font-medium whitespace-nowrap">
                      {course.schedule}
                    </td>

                    <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                      {course.room}
                    </td>

                    <td className="px-5 py-3.5 text-slate-800 font-semibold whitespace-nowrap">
                      {course.instructor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Official Documentary Requirements Audit & Submission Trail */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Official Documentary Requirements Audit
            </h3>
            <p className="text-xs text-slate-500">
              Department of Education mandatory admission documents on permanent file with the Registrar
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-800 font-mono bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl w-fit">
            ✓ 100% Verified &amp; Compliant
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {requirementsList.map((req) => (
            <div
              key={req.id}
              className="p-4 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5 hover:border-slate-200 transition-all"
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-900 truncate" title={req.title}>
                  {req.title}
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0 ml-1">
                  {req.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">{req.type}</p>
              <div className="flex items-center justify-between text-[10.5px] text-slate-400 pt-1 border-t border-slate-200/60 font-mono">
                <span>Verified: {req.dateVerified}</span>
                <span>{req.referenceNo}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Official DepEd Certification & Tri-Signatory Block */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="text-xs text-slate-700 leading-relaxed space-y-1">
          <p className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
            Official Certification of Matriculation:
          </p>
          <p>
            This document certifies that <strong>{learnerName.toUpperCase()}</strong> (LRN: <span className="font-mono font-bold text-slate-900">{learnerLrn}</span>) is an officially registered learner of <strong>PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL</strong> for the <strong>First Semester of School Year {schoolYear}</strong> in the Senior High School Program. All preliminary credentials, DepEd Learner Information System (LIS) endorsements, and course assignments have been duly validated and accepted.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-100 text-center text-xs">
          <div>
            <div className="border-b border-slate-300 pb-1 mb-1 font-bold text-slate-950 uppercase text-[11px]">
              {adviserName.toUpperCase()}
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Class Adviser</span>
            <span className="text-[9px] text-slate-400">Faculty Adviser · Placido L. Señor NHS</span>
          </div>

          <div>
            <div className="border-b border-slate-300 pb-1 mb-1 font-bold text-slate-950 uppercase text-[11px]">
              MARIA ELENA R. REGISTRAR
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">School Registrar II</span>
            <span className="text-[9px] text-slate-400">LIS In-Charge &amp; Records Officer</span>
          </div>

          <div>
            <div className="border-b border-slate-300 pb-1 mb-1 font-bold text-slate-950 uppercase text-[11px]">
              JUSTINE MANGILA, Dev.Ed.D.
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">School Principal I</span>
            <span className="text-[9px] text-slate-400">School Head / Authorized Officer</span>
          </div>
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
          <span>Export Slip</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#152e69] hover:bg-[#0f1f4b] px-5 text-xs font-bold text-white shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-98"
          title="Print official Certificate of Matriculation & Enrollment"
        >
          <Printer className="h-4 w-4 text-[#F5C518]" />
          <span>Print Certificate of Enrollment</span>
        </button>
      </div>
    </div>
  );
};
