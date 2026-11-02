import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/common/Badge';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';

interface SubjectGrade {
  code: string;
  title: string;
  category: 'Core' | 'Applied' | 'Specialized';
  units: number;
  q1?: number;
  q2?: number;
  q3?: number;
  q4?: number;
  final: number;
  remarks: 'Passed' | 'Failed';
}

interface CoreValueItem {
  category: string;
  statement: string;
  q1: 'AO' | 'SO' | 'RO' | 'NO';
  q2: 'AO' | 'SO' | 'RO' | 'NO';
  q3: 'AO' | 'SO' | 'RO' | 'NO';
  q4: 'AO' | 'SO' | 'RO' | 'NO';
}

interface AttendanceMonth {
  month: string;
  schoolDays: number;
  daysPresent: number;
  daysAbsent: number;
}

export const StudentGradesPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'official_sheet' | 'sem1' | 'sem2' | 'all_quarters'>('official_sheet');

  // Dynamic student demographic values with institutional fallbacks
  const learnerName = user?.full_name || 'Jorvin Pengoc';
  const learnerLrn = user?.student_lrn || '11951680082';
  const learnerGrade = user?.student_grade || 'Grade 11';
  const learnerStrand = user?.student_strand || 'TVL - ICT';
  const learnerSection = user?.student_section || 'Section Almario';
  const schoolYear = '2026–2027';

  // Semester 1 Subjects (DepEd Senior High School - TVL ICT Track)
  const [sem1Subjects, setSem1Subjects] = useState<SubjectGrade[]>([
    { code: 'CORE-OC11', title: 'Oral Communication in Context', category: 'Core', units: 4.0, q1: 91, q2: 93, final: 92, remarks: 'Passed' },
    { code: 'CORE-FIL11', title: 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino', category: 'Core', units: 4.0, q1: 90, q2: 92, final: 91, remarks: 'Passed' },
    { code: 'CORE-GM11', title: 'General Mathematics', category: 'Core', units: 4.0, q1: 89, q2: 91, final: 90, remarks: 'Passed' },
    { code: 'CORE-ELS11', title: 'Earth and Life Science', category: 'Core', units: 4.0, q1: 92, q2: 94, final: 93, remarks: 'Passed' },
    { code: 'CORE-PHIL11', title: 'Introduction to the Philosophy of the Human Person', category: 'Core', units: 4.0, q1: 91, q2: 93, final: 92, remarks: 'Passed' },
    { code: 'CORE-PE11', title: 'Physical Education and Health 1', category: 'Core', units: 2.0, q1: 95, q2: 97, final: 96, remarks: 'Passed' },
    { code: 'APP-EAPP11', title: 'English for Academic and Professional Purposes', category: 'Applied', units: 4.0, q1: 90, q2: 92, final: 91, remarks: 'Passed' },
    { code: 'APP-EMP11', title: 'Empowerment Technologies: ICT for Professional Tracks', category: 'Applied', units: 4.0, q1: 93, q2: 95, final: 94, remarks: 'Passed' },
    { code: 'SP-CSS11', title: 'Computer Systems Servicing NC II (CSS 1)', category: 'Specialized', units: 4.0, q1: 92, q2: 94, final: 93, remarks: 'Passed' },
  ]);

  // Semester 2 Subjects (DepEd Senior High School - TVL ICT Track)
  const [sem2Subjects, setSem2Subjects] = useState<SubjectGrade[]>([
    { code: 'CORE-RWS11', title: 'Reading and Writing Skills', category: 'Core', units: 4.0, q3: 91, q4: 93, final: 92, remarks: 'Passed' },
    { code: 'CORE-PAG11', title: 'Pagbasa at Pagsusuri ng Iba\'t Ibang Teksto', category: 'Core', units: 4.0, q3: 90, q4: 92, final: 91, remarks: 'Passed' },
    { code: 'CORE-STAT11', title: 'Statistics and Probability', category: 'Core', units: 4.0, q3: 89, q4: 91, final: 90, remarks: 'Passed' },
    { code: 'CORE-PS11', title: 'Physical Science', category: 'Core', units: 4.0, q3: 91, q4: 93, final: 92, remarks: 'Passed' },
    { code: 'CORE-PE12', title: 'Physical Education and Health 2', category: 'Core', units: 2.0, q3: 95, q4: 97, final: 96, remarks: 'Passed' },
    { code: 'APP-RS11', title: 'Practical Research 1 (Qualitative Research)', category: 'Applied', units: 4.0, q3: 92, q4: 94, final: 93, remarks: 'Passed' },
    { code: 'APP-INQ11', title: 'Inquiries, Investigations and Immersion', category: 'Applied', units: 4.0, q3: 91, q4: 93, final: 92, remarks: 'Passed' },
    { code: 'SP-CSS12', title: 'Computer Systems Servicing NC II (CSS 2)', category: 'Specialized', units: 4.0, q3: 93, q4: 95, final: 94, remarks: 'Passed' },
  ]);

  // Load live grades and subjects from Supabase
  useEffect(() => {
    async function loadLiveGrades() {
      try {
        let studentId = user?.student_id || user?.id;
        const cleanEmail = (user?.email || '').trim().toLowerCase();
        const cleanLrn = (user?.student_lrn || '').trim();

        if (cleanEmail || cleanLrn) {
          try {
            const { data: sRows } = await supabase
              .from('students')
              .select('id, grade_level, strand')
              .or(`email.ilike.${cleanEmail},lrn.eq.${cleanLrn}`);
            if (sRows && sRows.length > 0 && sRows[0].id) {
              studentId = sRows[0].id;
            }
          } catch {
            // fallback
          }
        }

        if (!studentId) return;

        // Fetch grades and subjects
        const [gradesRes, subjectsRes] = await Promise.all([
          supabase.from('grades').select('*').eq('student_id', studentId),
          supabase.from('subjects').select('*'),
        ]);

        const dbGrades = gradesRes.data || [];
        const dbSubjects = subjectsRes.data || [];

        if (dbGrades.length > 0) {
          // Map DB grades by subject_id -> quarter -> grade
          const gradesBySubject: Record<string, Record<number, number>> = {};
          dbGrades.forEach((g: any) => {
            if (!gradesBySubject[g.subject_id]) gradesBySubject[g.subject_id] = {};
            if (g.quarter && g.grade !== null && g.grade !== undefined) {
              gradesBySubject[g.subject_id][Number(g.quarter)] = Number(g.grade);
            }
          });

          // Match with subjects
          setSem1Subjects((prev) =>
            prev.map((sub) => {
              // Find matching DB subject
              const matchedDbSub = dbSubjects.find(
                (s: any) =>
                  s.code === sub.code ||
                  s.name.toLowerCase() === sub.title.toLowerCase() ||
                  sub.title.toLowerCase().includes(s.name.toLowerCase())
              );

              if (matchedDbSub && gradesBySubject[matchedDbSub.id]) {
                const subGrades = gradesBySubject[matchedDbSub.id];
                const q1 = subGrades[1] !== undefined ? subGrades[1] : sub.q1;
                const q2 = subGrades[2] !== undefined ? subGrades[2] : sub.q2;
                const validMarks = [q1, q2].filter((v): v is number => v !== undefined);
                const final =
                  validMarks.length > 0
                    ? Math.round(validMarks.reduce((a, b) => a + b, 0) / validMarks.length)
                    : sub.final;
                return {
                  ...sub,
                  q1,
                  q2,
                  final,
                  remarks: final >= 75 ? 'Passed' : 'Failed',
                };
              }
              return sub;
            })
          );

          setSem2Subjects((prev) =>
            prev.map((sub) => {
              const matchedDbSub = dbSubjects.find(
                (s: any) =>
                  s.code === sub.code ||
                  s.name.toLowerCase() === sub.title.toLowerCase() ||
                  sub.title.toLowerCase().includes(s.name.toLowerCase())
              );

              if (matchedDbSub && gradesBySubject[matchedDbSub.id]) {
                const subGrades = gradesBySubject[matchedDbSub.id];
                const q3 = subGrades[3] !== undefined ? subGrades[3] : sub.q3;
                const q4 = subGrades[4] !== undefined ? subGrades[4] : sub.q4;
                const validMarks = [q3, q4].filter((v): v is number => v !== undefined);
                const final =
                  validMarks.length > 0
                    ? Math.round(validMarks.reduce((a, b) => a + b, 0) / validMarks.length)
                    : sub.final;
                return {
                  ...sub,
                  q3,
                  q4,
                  final,
                  remarks: final >= 75 ? 'Passed' : 'Failed',
                };
              }
              return sub;
            })
          );
        }
      } catch (err) {
        console.warn('Live grades query error:', err);
      }
    }

    loadLiveGrades();
  }, [user]);

  // Averages calculations
  const sem1Total = useMemo(() => sem1Subjects.reduce((sum, s) => sum + s.final, 0), [sem1Subjects]);
  const sem1Average = useMemo(
    () => (sem1Subjects.length > 0 ? (sem1Total / sem1Subjects.length).toFixed(2) : '0.00'),
    [sem1Total, sem1Subjects]
  );

  const sem2Total = useMemo(() => sem2Subjects.reduce((sum, s) => sum + s.final, 0), [sem2Subjects]);
  const sem2Average = useMemo(
    () => (sem2Subjects.length > 0 ? (sem2Total / sem2Subjects.length).toFixed(2) : '0.00'),
    [sem2Total, sem2Subjects]
  );

  const allSubjects = useMemo(() => [...sem1Subjects, ...sem2Subjects], [sem1Subjects, sem2Subjects]);
  const grandTotal = useMemo(() => allSubjects.reduce((sum, s) => sum + s.final, 0), [allSubjects]);
  const generalFinalAverage = useMemo(
    () => (allSubjects.length > 0 ? (grandTotal / allSubjects.length).toFixed(2) : '0.00'),
    [grandTotal, allSubjects]
  );
  const totalUnits = useMemo(
    () => allSubjects.reduce((sum, s) => sum + s.units, 0).toFixed(1),
    [allSubjects]
  );

  // DepEd Learner's Observed Values (Character / Core Values)
  const coreValues: CoreValueItem[] = [
    {
      category: '1. Maka-Diyos',
      statement: 'Expresses one\'s spiritual beliefs while respecting the spiritual beliefs of others',
      q1: 'AO',
      q2: 'AO',
      q3: 'AO',
      q4: 'AO',
    },
    {
      category: '1. Maka-Diyos',
      statement: 'Shows adherence to ethical principles by upholding truth and honesty',
      q1: 'AO',
      q2: 'AO',
      q3: 'AO',
      q4: 'AO',
    },
    {
      category: '2. Makatao',
      statement: 'Is sensitive to individual, social, and cultural differences',
      q1: 'AO',
      q2: 'AO',
      q3: 'AO',
      q4: 'AO',
    },
    {
      category: '2. Makatao',
      statement: 'Demonstrates solidarity and teamwork in group and school undertakings',
      q1: 'AO',
      q2: 'AO',
      q3: 'AO',
      q4: 'AO',
    },
    {
      category: '3. Makakalikasan',
      statement: 'Cares for the environment and utilizes resources wisely, judiciously, and economically',
      q1: 'AO',
      q2: 'AO',
      q3: 'AO',
      q4: 'AO',
    },
    {
      category: '4. Makabansa',
      statement: 'Demonstrates pride in being a Filipino; exercises civic rights and responsibilities',
      q1: 'AO',
      q2: 'AO',
      q3: 'AO',
      q4: 'AO',
    },
    {
      category: '4. Makabansa',
      statement: 'Demonstrates appropriate behavior in carrying out activities in school, community, and country',
      q1: 'AO',
      q2: 'AO',
      q3: 'AO',
      q4: 'AO',
    },
  ];

  // DepEd SF2 Monthly Attendance Record
  const attendanceRecord: AttendanceMonth[] = [
    { month: 'Aug', schoolDays: 21, daysPresent: 21, daysAbsent: 0 },
    { month: 'Sep', schoolDays: 21, daysPresent: 21, daysAbsent: 0 },
    { month: 'Oct', schoolDays: 20, daysPresent: 20, daysAbsent: 0 },
    { month: 'Nov', schoolDays: 21, daysPresent: 20, daysAbsent: 1 },
    { month: 'Dec', schoolDays: 16, daysPresent: 16, daysAbsent: 0 },
    { month: 'Jan', schoolDays: 21, daysPresent: 21, daysAbsent: 0 },
    { month: 'Feb', schoolDays: 20, daysPresent: 20, daysAbsent: 0 },
    { month: 'Mar', schoolDays: 22, daysPresent: 21, daysAbsent: 1 },
    { month: 'Apr', schoolDays: 21, daysPresent: 21, daysAbsent: 0 },
    { month: 'May', schoolDays: 21, daysPresent: 20, daysAbsent: 1 },
  ];

  const totalSchoolDays = attendanceRecord.reduce((acc, m) => acc + m.schoolDays, 0);
  const totalDaysPresent = attendanceRecord.reduce((acc, m) => acc + m.daysPresent, 0);
  const totalDaysAbsent = attendanceRecord.reduce((acc, m) => acc + m.daysAbsent, 0);
  const attendanceRate = ((totalDaysPresent / totalSchoolDays) * 100).toFixed(1);

  // Print Handler
  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `PLSNHS_Form138_SF9_${learnerName.replace(/\s+/g, '_')}_SY${schoolYear}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  };

  // Export CSV Handler
  const handleExportCsv = () => {
    const csvLines: string[] = [];

    csvLines.push('"REPUBLIC OF THE PHILIPPINES"');
    csvLines.push('"DEPARTMENT OF EDUCATION"');
    csvLines.push('"REGION VII, CENTRAL VISAYAS · SCHOOLS DIVISION OF CITY OF NAGA · DISTRICT OF NAGA I"');
    csvLines.push('"PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL"');
    csvLines.push('"Langtad, City of Naga, Cebu · School ID: 303035"');
    csvLines.push('""');
    csvLines.push('"DEPED SF9 - SHS (SCHOOL FORM 9): LEARNER PROGRESS REPORT CARD (FORM 138)"');
    csvLines.push(`"Learner Name:","${learnerName}"`);
    csvLines.push(`"Learner Reference Number (LRN):","${learnerLrn}"`);
    csvLines.push(`"Grade Level & Section:","${learnerGrade} - ${learnerSection}"`);
    csvLines.push(`"Track & Strand:","${learnerStrand}"`);
    csvLines.push(`"School Year:","${schoolYear}"`);
    csvLines.push(`"General Final Average:","${generalFinalAverage}"`);
    csvLines.push('"DepEd Academic Descriptor:","Outstanding (With Honors)"');
    csvLines.push('""');

    // First Semester
    csvLines.push('"FIRST SEMESTER ACADEMIC PERFORMANCE"');
    csvLines.push('"Subject Code","Subject Title","Classification","Units","Quarter 1","Quarter 2","Semestral Final","Remarks"');
    sem1Subjects.forEach((s) => {
      csvLines.push([
        `"${s.code}"`,
        `"${s.title}"`,
        `"${s.category}"`,
        String(s.units),
        String(s.q1),
        String(s.q2),
        String(s.final),
        `"${s.remarks}"`,
      ].join(','));
    });
    csvLines.push(`"","First Semester General Average","","","","","${sem1Average}","Passed"`);
    csvLines.push('""');

    // Second Semester
    csvLines.push('"SECOND SEMESTER ACADEMIC PERFORMANCE"');
    csvLines.push('"Subject Code","Subject Title","Classification","Units","Quarter 3","Quarter 4","Semestral Final","Remarks"');
    sem2Subjects.forEach((s) => {
      csvLines.push([
        `"${s.code}"`,
        `"${s.title}"`,
        `"${s.category}"`,
        String(s.units),
        String(s.q3),
        String(s.q4),
        String(s.final),
        `"${s.remarks}"`,
      ].join(','));
    });
    csvLines.push(`"","Second Semester General Average","","","","","${sem2Average}","Passed"`);
    csvLines.push('""');

    // Attendance
    csvLines.push('"REPORT ON ATTENDANCE (DEPED SF2 RECORD)"');
    csvLines.push('"Month","Days of School","Days Present","Days Absent"');
    attendanceRecord.forEach((m) => {
      csvLines.push(`"${m.month}",${m.schoolDays},${m.daysPresent},${m.daysAbsent}`);
    });
    csvLines.push(`"Total",${totalSchoolDays},${totalDaysPresent},${totalDaysAbsent}`);
    csvLines.push(`"Attendance Rate:","${attendanceRate}%"`);

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DepEd_SF9_Form138_${learnerName.replace(/\s+/g, '_')}_SY2026-2027.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-16">
      {/* Print CSS to render short bond paper standard (8.5" x 11") */}
      <style>{`
        @page {
          size: letter portrait;
          margin: 0.35in 0.4in 0.35in 0.4in;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 8.5pt !important;
          }
          .no-print,
          .print\\:hidden,
          #hesChatbotContainer,
          .hes-chatbot-launcher,
          header,
          aside,
          nav {
            display: none !important;
          }
          .bond-paper-document {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block !important;
          }
          .official-grade-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .official-grade-table th,
          .official-grade-table td {
            border: 1px solid #000000 !important;
            color: #000000 !important;
            padding: 4px 6px !important;
            font-size: 8pt !important;
            line-height: 1.25 !important;
          }
          .official-grade-table th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-weight: bold !important;
          }
          .official-double-line {
            border-bottom: 2px solid #000000 !important;
          }
          .official-sign-line {
            border-bottom: 1px solid #000000 !important;
          }
        }
      `}</style>

      {/* Screen Control Header (Aligned with Dashboard & Admin standard) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight whitespace-nowrap">
            Official Report Card (Form 138)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Senior High School Learner Progress &amp; Quarterly Ratings (SF9) · S.Y. {schoolYear}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <PageHeaderNotificationSlot />
        </div>
      </div>

      {/* Interactive View Switcher Tabs (no-print) */}
      <div className="no-print flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl w-fit border border-slate-200/80 overflow-x-auto max-w-full">
        <button
          type="button"
          onClick={() => setActiveTab('official_sheet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'official_sheet'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <FileText className="h-3.5 w-3.5 text-emerald-700" />
          <span>Official Grade Card (SF9 Sheet)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sem1')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'sem1'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Calendar className="h-3.5 w-3.5 text-blue-600" />
          <span>1st Semester</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sem2')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'sem2'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Calendar className="h-3.5 w-3.5 text-indigo-600" />
          <span>2nd Semester</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all_quarters')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'all_quarters'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 text-amber-600" />
          <span>All Quarters Matrix</span>
        </button>
      </div>

      {/* VIEW 1: OFFICIAL GRADE CARD (FORM 138 / SF9 SHEET) */}
      {(activeTab === 'official_sheet' || activeTab === 'all_quarters') && (
        <div className="flex justify-center w-full">
          <div className="bond-paper-document w-full max-w-[8.5in] min-h-[11in] bg-white border border-slate-300 shadow-xl rounded-sm p-6 sm:p-8 text-slate-900 font-sans transition-all flex flex-col justify-between">
            <div className="space-y-4">
              {/* DepEd Letterhead */}
              <div className="flex items-center justify-between pb-1 border-b border-black/20">
                <div className="w-20 flex items-center justify-center shrink-0">
                  <img
                    src="/pictures/logo sa skwelahan.png"
                    alt="PLSNHS Seal"
                    className="h-16 w-16 object-contain rounded-full shadow-2xs"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>

                <div className="text-center flex-1 px-3">
                  <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-800 leading-tight font-serif">
                    Republic of the Philippines
                  </p>
                  <h2 className="text-[12px] uppercase font-bold tracking-wider text-slate-950 leading-tight font-serif">
                    Department of Education
                  </h2>
                  <p className="text-[9.5px] font-medium text-slate-700 leading-tight">
                    Region VII, Central Visayas · Schools Division of City of Naga · District of Naga I
                  </p>
                  <h1 className="text-[13px] sm:text-sm font-black tracking-wide text-black uppercase mt-0.5 font-serif">
                    PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL
                  </h1>
                  <p className="text-[9px] text-slate-600 leading-tight">
                    Langtad, City of Naga, Cebu · School Identification Number (ID): <strong>303035</strong>
                  </p>
                </div>

                <div className="w-20 shrink-0 hidden sm:flex items-center justify-center text-center">
                  <div className="border border-slate-400 rounded-xs p-1 text-[8.5px] leading-tight text-slate-700">
                    <span className="font-bold block">DEPED SF9</span>
                    <span>Form 138-SHS</span>
                  </div>
                </div>
              </div>

              {/* Double Line Divider */}
              <div className="border-b-2 border-black official-double-line"></div>
              <div className="border-b border-black -mt-3 mb-2"></div>

              {/* Title */}
              <div className="text-center space-y-0.5">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-950">
                  LEARNER&apos;S PROGRESS REPORT CARD (SF9 - SHS)
                </h3>
                <p className="text-[10.5px] font-bold text-slate-800 uppercase tracking-wide">
                  School Year {schoolYear} · Senior High School
                </p>
              </div>

              {/* Student Demographic Matrix */}
              <div className="border border-black bg-slate-50/40 p-2.5 rounded-xs text-xs space-y-1.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-600 block">Name of Learner:</span>
                    <span className="font-black text-slate-950 uppercase text-xs">{learnerName}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-600 block">Learner Reference No. (LRN):</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">{learnerLrn}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-600 block">Grade Level &amp; Section:</span>
                    <span className="font-bold text-slate-900 text-xs">{learnerGrade} – {learnerSection}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-200">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-600 block">Track &amp; Strand:</span>
                    <span className="font-bold text-slate-900 text-[11px]">{learnerStrand}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-600 block">Curriculum Program:</span>
                    <span className="text-slate-800 font-medium text-[11px]">K to 12 Senior High Curriculum</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-600 block">Age / Sex:</span>
                    <span className="text-slate-900 font-medium text-[11px]">17 yrs. old · Male</span>
                  </div>
                </div>
              </div>

              {/* FIRST SEMESTER REPORT */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-950">
                    REPORT ON LEARNING PROGRESS AND ACHIEVEMENT: FIRST SEMESTER
                  </h4>
                  <span className="text-[9.5px] font-bold text-slate-700">Semestral Rating</span>
                </div>

                <table className="official-grade-table w-full text-left text-xs border-collapse border border-black table-fixed">
                  <thead>
                    <tr className="bg-slate-100 text-slate-950 font-bold uppercase text-[9px] border-b-2 border-black">
                      <th className="border border-black px-2 py-1.5 w-[50%]">Learning Areas (Subjects)</th>
                      <th className="border border-black px-1.5 py-1.5 w-[12%] text-center">Quarter 1</th>
                      <th className="border border-black px-1.5 py-1.5 w-[12%] text-center">Quarter 2</th>
                      <th className="border border-black px-1.5 py-1.5 w-[14%] text-center bg-slate-200/60">Final Rating</th>
                      <th className="border border-black px-2 py-1.5 w-[12%] text-center">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/30 text-[10px]">
                    {sem1Subjects.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40">
                        <td className="border border-black px-2 py-1 truncate">
                          <span className="font-semibold text-slate-900">{s.title}</span>
                          <span className="ml-1 text-[8px] text-slate-500 font-mono">[{s.category}]</span>
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center font-mono text-slate-900">{s.q1}</td>
                        <td className="border border-black px-1.5 py-1 text-center font-mono text-slate-900">{s.q2}</td>
                        <td className="border border-black px-1.5 py-1 text-center font-mono font-bold text-slate-950 bg-slate-50">{s.final}</td>
                        <td className="border border-black px-2 py-1 text-center font-medium text-emerald-800">{s.remarks}</td>
                      </tr>
                    ))}
                    {/* Sem 1 Average Row */}
                    <tr className="bg-slate-100/90 font-bold border-t-2 border-black text-[10.5px]">
                      <td className="border border-black px-2 py-1.5 uppercase text-slate-950 text-right pr-4" colSpan={3}>
                        General Average for the First Semester:
                      </td>
                      <td className="border border-black px-1.5 py-1.5 text-center font-mono font-black text-slate-950 bg-amber-50/80">
                        {sem1Average}
                      </td>
                      <td className="border border-black px-2 py-1.5 text-center text-emerald-800 font-bold">
                        Passed
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* SECOND SEMESTER REPORT */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-950">
                    REPORT ON LEARNING PROGRESS AND ACHIEVEMENT: SECOND SEMESTER
                  </h4>
                  <span className="text-[9.5px] font-bold text-slate-700">Semestral Rating</span>
                </div>

                <table className="official-grade-table w-full text-left text-xs border-collapse border border-black table-fixed">
                  <thead>
                    <tr className="bg-slate-100 text-slate-950 font-bold uppercase text-[9px] border-b-2 border-black">
                      <th className="border border-black px-2 py-1.5 w-[50%]">Learning Areas (Subjects)</th>
                      <th className="border border-black px-1.5 py-1.5 w-[12%] text-center">Quarter 3</th>
                      <th className="border border-black px-1.5 py-1.5 w-[12%] text-center">Quarter 4</th>
                      <th className="border border-black px-1.5 py-1.5 w-[14%] text-center bg-slate-200/60">Final Rating</th>
                      <th className="border border-black px-2 py-1.5 w-[12%] text-center">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/30 text-[10px]">
                    {sem2Subjects.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40">
                        <td className="border border-black px-2 py-1 truncate">
                          <span className="font-semibold text-slate-900">{s.title}</span>
                          <span className="ml-1 text-[8px] text-slate-500 font-mono">[{s.category}]</span>
                        </td>
                        <td className="border border-black px-1.5 py-1 text-center font-mono text-slate-900">{s.q3}</td>
                        <td className="border border-black px-1.5 py-1 text-center font-mono text-slate-900">{s.q4}</td>
                        <td className="border border-black px-1.5 py-1 text-center font-mono font-bold text-slate-950 bg-slate-50">{s.final}</td>
                        <td className="border border-black px-2 py-1 text-center font-medium text-emerald-800">{s.remarks}</td>
                      </tr>
                    ))}
                    {/* Sem 2 Average Row */}
                    <tr className="bg-slate-100/90 font-bold border-t-2 border-black text-[10.5px]">
                      <td className="border border-black px-2 py-1.5 uppercase text-slate-950 text-right pr-4" colSpan={3}>
                        General Average for the Second Semester:
                      </td>
                      <td className="border border-black px-1.5 py-1.5 text-center font-mono font-black text-slate-950 bg-amber-50/80">
                        {sem2Average}
                      </td>
                      <td className="border border-black px-2 py-1.5 text-center text-emerald-800 font-bold">
                        Passed
                      </td>
                    </tr>
                    {/* Final General Average Row */}
                    <tr className="bg-slate-200 text-slate-950 font-black border-t-2 border-black text-[11px]">
                      <td className="border border-black px-2 py-2 uppercase text-right pr-4 font-serif" colSpan={3}>
                        GENERAL FINAL AVERAGE FOR THE SCHOOL YEAR:
                      </td>
                      <td className="border border-black px-1.5 py-2 text-center font-mono text-base font-black text-slate-950 bg-[#F5C518]/30">
                        {generalFinalAverage}
                      </td>
                      <td className="border border-black px-2 py-2 text-center text-emerald-900 font-black uppercase tracking-wider text-[10px]">
                        Passed
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* REPORT ON LEARNER'S OBSERVED VALUES (DEPED CORE VALUES) */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-950">
                    REPORT ON LEARNER&apos;S OBSERVED VALUES (DEPED CORE VALUES)
                  </h4>
                  <span className="text-[9px] text-slate-600 font-bold">AO: Always · SO: Sometimes · RO: Rarely · NO: Not Observed</span>
                </div>

                <table className="official-grade-table w-full text-left text-xs border-collapse border border-black table-fixed">
                  <thead>
                    <tr className="bg-slate-100 text-slate-950 font-bold uppercase text-[9px] border-b-2 border-black">
                      <th className="border border-black px-2 py-1 w-[22%]">Core Values</th>
                      <th className="border border-black px-2 py-1 w-[54%]">Behavior Statements</th>
                      <th className="border border-black px-1 py-1 w-[6%] text-center">Q1</th>
                      <th className="border border-black px-1 py-1 w-[6%] text-center">Q2</th>
                      <th className="border border-black px-1 py-1 w-[6%] text-center">Q3</th>
                      <th className="border border-black px-1 py-1 w-[6%] text-center">Q4</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/30 text-[9.5px]">
                    {coreValues.map((cv, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40">
                        <td className="border border-black px-2 py-1 font-bold text-slate-950 truncate">{cv.category}</td>
                        <td className="border border-black px-2 py-1 text-slate-800 leading-tight">{cv.statement}</td>
                        <td className="border border-black px-1 py-1 text-center font-mono font-bold text-slate-900">{cv.q1}</td>
                        <td className="border border-black px-1 py-1 text-center font-mono font-bold text-slate-900">{cv.q2}</td>
                        <td className="border border-black px-1 py-1 text-center font-mono font-bold text-slate-900">{cv.q3}</td>
                        <td className="border border-black px-1 py-1 text-center font-mono font-bold text-slate-900">{cv.q4}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* REPORT ON ATTENDANCE (DEPED SF2 RECORD) */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10.5px] font-black uppercase tracking-wider text-slate-950">
                    REPORT ON ATTENDANCE (DEPED SF2 RECORD)
                  </h4>
                  <span className="text-[9px] text-slate-600 font-bold">10 School Calendar Months</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="official-grade-table w-full text-center text-xs border-collapse border border-black table-fixed">
                    <thead>
                      <tr className="bg-slate-100 text-slate-950 font-bold uppercase text-[9px] border-b-2 border-black">
                        <th className="border border-black px-1.5 py-1 w-[16%] text-left">Record</th>
                        {attendanceRecord.map((m) => (
                          <th key={m.month} className="border border-black px-1 py-1 text-[8.5px]">{m.month}</th>
                        ))}
                        <th className="border border-black px-1 py-1 w-[10%] bg-slate-200">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/30 text-[9.5px]">
                      <tr>
                        <td className="border border-black px-1.5 py-1 text-left font-bold text-slate-900">No. of School Days</td>
                        {attendanceRecord.map((m) => (
                          <td key={m.month} className="border border-black px-1 py-1 font-mono">{m.schoolDays}</td>
                        ))}
                        <td className="border border-black px-1 py-1 font-mono font-bold text-slate-950 bg-slate-50">{totalSchoolDays}</td>
                      </tr>
                      <tr>
                        <td className="border border-black px-1.5 py-1 text-left font-bold text-slate-900">No. of Days Present</td>
                        {attendanceRecord.map((m) => (
                          <td key={m.month} className="border border-black px-1 py-1 font-mono">{m.daysPresent}</td>
                        ))}
                        <td className="border border-black px-1 py-1 font-mono font-bold text-slate-950 bg-slate-50">{totalDaysPresent}</td>
                      </tr>
                      <tr>
                        <td className="border border-black px-1.5 py-1 text-left font-bold text-slate-900">No. of Days Absent</td>
                        {attendanceRecord.map((m) => (
                          <td key={m.month} className="border border-black px-1 py-1 font-mono">{m.daysAbsent}</td>
                        ))}
                        <td className="border border-black px-1 py-1 font-mono font-bold text-slate-950 bg-slate-50">{totalDaysAbsent}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* GRADING SCALE & DESCRIPTORS (DepEd Order No. 8, s. 2015) */}
              <div className="border border-slate-900 bg-slate-50/50 p-2 rounded-xs text-[9px] grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-center">
                <div>
                  <span className="font-bold block text-slate-950">90 – 100</span>
                  <span className="text-slate-600">Outstanding (Passed)</span>
                </div>
                <div>
                  <span className="font-bold block text-slate-950">85 – 89</span>
                  <span className="text-slate-600">Very Satisfactory (Passed)</span>
                </div>
                <div>
                  <span className="font-bold block text-slate-950">80 – 84</span>
                  <span className="text-slate-600">Satisfactory (Passed)</span>
                </div>
                <div>
                  <span className="font-bold block text-slate-950">75 – 79</span>
                  <span className="text-slate-600">Fairly Satisfactory (Passed)</span>
                </div>
                <div>
                  <span className="font-bold block text-rose-700">Below 75</span>
                  <span className="text-rose-600">Did Not Meet Expectations</span>
                </div>
              </div>

              {/* CERTIFICATE OF TRANSFER & SIGNATURES BLOCK */}
              <div className="pt-2 border-t-2 border-black space-y-3">
                <div className="text-[10px] text-slate-900 leading-snug">
                  <p>
                    <strong>CERTIFICATE OF TRANSFER &amp; PROMOTION:</strong> This is to certify that <strong>{learnerName.toUpperCase()}</strong> (LRN: {learnerLrn}) of <strong>{learnerGrade} – {learnerSection}</strong> has completed the required academic competencies for School Year <strong>{schoolYear}</strong> and is eligible for admission to <strong>Grade 12</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-2 text-center text-xs">
                  <div>
                    <div className="border-b border-black pb-1 mb-1 font-bold text-slate-950 uppercase text-[11px]">
                      MR. J. ALMARIO
                    </div>
                    <span className="text-[9.5px] uppercase font-bold text-slate-600 block">Class Adviser</span>
                    <span className="text-[8.5px] text-slate-500">Teacher II · Senior High</span>
                  </div>

                  <div>
                    <div className="border-b border-black pb-1 mb-1 font-bold text-slate-950 uppercase text-[11px]">
                      JUSTINE MANGILA, Dev.Ed.D.
                    </div>
                    <span className="text-[9.5px] uppercase font-bold text-slate-600 block">School Principal I</span>
                    <span className="text-[8.5px] text-slate-500">School Head / Authorized Officer</span>
                  </div>

                  <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <div className="border-b border-black pb-1 mb-1 font-mono font-bold text-slate-950 text-[11px]">
                      March 27, 2027
                    </div>
                    <span className="text-[9.5px] uppercase font-bold text-slate-600 block">Date Issued</span>
                    <span className="text-[8.5px] text-slate-500">School ID: 303035</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: SEMESTER 1 CARD VIEW (Interactive) */}
      {activeTab === 'sem1' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-base">First Semester Learning Areas</h3>
              <p className="text-xs text-slate-500">Core, Applied, and Specialized Subjects for 1st & 2nd Quarters</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Semester Average</span>
              <span className="text-xl font-black text-emerald-800 font-mono">{sem1Average}</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Subject Title &amp; Classification</th>
                    <th className="px-5 py-3 text-center">Units</th>
                    <th className="px-5 py-3 text-center">Quarter 1</th>
                    <th className="px-5 py-3 text-center">Quarter 2</th>
                    <th className="px-5 py-3 text-center font-bold text-emerald-800">Final Rating</th>
                    <th className="px-5 py-3 text-right">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sem1Subjects.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">{s.title}</p>
                          <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                            s.category === 'Core'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : s.category === 'Applied'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {s.category}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">{s.code}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-slate-600 font-medium">
                        {s.units.toFixed(1)}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-medium text-slate-700">
                        {s.q1}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-medium text-slate-700">
                        {s.q2}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-extrabold text-emerald-800 text-sm">
                        {s.final}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Badge variant="success" size="sm">
                          {s.remarks}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: SEMESTER 2 CARD VIEW (Interactive) */}
      {activeTab === 'sem2' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Second Semester Learning Areas</h3>
              <p className="text-xs text-slate-500">Core, Applied, and Specialized Subjects for 3rd & 4th Quarters</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Semester Average</span>
              <span className="text-xl font-black text-indigo-800 font-mono">{sem2Average}</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Subject Title &amp; Classification</th>
                    <th className="px-5 py-3 text-center">Units</th>
                    <th className="px-5 py-3 text-center">Quarter 3</th>
                    <th className="px-5 py-3 text-center">Quarter 4</th>
                    <th className="px-5 py-3 text-center font-bold text-indigo-800">Final Rating</th>
                    <th className="px-5 py-3 text-right">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sem2Subjects.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">{s.title}</p>
                          <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                            s.category === 'Core'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : s.category === 'Applied'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {s.category}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">{s.code}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-slate-600 font-medium">
                        {s.units.toFixed(1)}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-medium text-slate-700">
                        {s.q3}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-medium text-slate-700">
                        {s.q4}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono font-extrabold text-indigo-800 text-sm">
                        {s.final}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Badge variant="success" size="sm">
                          {s.remarks}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Official Action Controls (Bottom Aligned) */}
      <div className="no-print flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-200">
        <button
          type="button"
          onClick={handleExportCsv}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all cursor-pointer active:scale-98"
          title="Download official Form 138 dataset as CSV"
        >
          <Download className="h-4 w-4 text-slate-500" />
          <span>Export CSV</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2.5 rounded-xl bg-[#152e69] hover:bg-[#0f1f4b] px-5 text-xs font-bold text-white shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-98"
          title="Print official Form 138 Grade Card on standard short bond paper (8.5&quot; × 11&quot;)"
        >
          <Printer className="h-4 w-4 text-[#F5C518]" />
          <span>Print Report Card</span>
        </button>
      </div>
    </div>
  );
};
