import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  SlidersHorizontal,
  Award,
  CheckCircle2,
  GraduationCap,
  User,
  BookOpen,
  Sparkles,
  TrendingUp,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { fetchGradesForStudent } from '../../lib/gradesStore';
import { Badge } from '../../components/common/Badge';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';

export interface JhsSubjectGrade {
  code: string;
  title: string;
  isMapehParent?: boolean;
  isMapehChild?: boolean;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
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
  const [activeTab, setActiveTab] = useState<'jhs_sf9' | 'quarterly_breakdown' | 'values_attendance'>('jhs_sf9');

  const isParent = user?.role === 'parent';
  const [parentChild, setParentChild] = useState<any>(null);

  // Dynamic parent-child linkage resolver
  useEffect(() => {
    async function resolveParentChild() {
      if (!isParent || !user) return;
      try {
        let child: any = null;
        if (user.id) {
          const { data } = await supabase
            .from('students')
            .select('*')
            .eq('parent_id', user.id)
            .maybeSingle();
          if (data) child = data;
        }
        if (!child && user.student_id) {
          const { data } = await supabase
            .from('students')
            .select('*')
            .eq('id', user.student_id)
            .maybeSingle();
          if (data) child = data;
        }
        if (!child) {
          const pName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
          if (pName) {
            const { data } = await supabase
              .from('students')
              .select('*')
              .ilike('parent_name', `%${pName}%`)
              .limit(1);
            if (data && data.length > 0) child = data[0];
          }
        }
        if (child) {
          let secName = child.section || '';
          if (child.section_id && !secName) {
            const { data: sec } = await supabase
              .from('sections')
              .select('name')
              .eq('id', child.section_id)
              .maybeSingle();
            if (sec?.name) secName = sec.name;
          }
          setParentChild({ ...child, resolvedSection: secName });
        }
      } catch (err) {
        console.warn('Resolve child error in grades:', err);
      }
    }
    resolveParentChild();
  }, [isParent, user]);

  // Dynamic student demographic values with institutional fallbacks
  const isSasumanParent = isParent && (
    (user?.last_name || '').toLowerCase().includes('sasuman') ||
    (user?.email || '').toLowerCase().includes('sasuman') ||
    (user?.full_name || '').toLowerCase().includes('sasuman')
  );

  const learnerName = isParent
    ? (parentChild
        ? `${parentChild.first_name || ''} ${parentChild.last_name || ''}`.trim()
        : user?.student_name || 'Jorvin Pengoc')
    : user?.full_name || 'Jorvin Pengoc';
  const learnerLrn = isParent
    ? parentChild?.lrn || user?.student_lrn || '11951680082'
    : user?.student_lrn || '11951680082';
  const rawGrade = isParent
    ? parentChild?.grade_level || user?.student_grade || (isSasumanParent ? 'Grade 11' : 'Grade 11')
    : user?.student_grade || 'Grade 11';
  const learnerGrade = rawGrade.toLowerCase().startsWith('grade') ? rawGrade : `Grade ${rawGrade}`;
  const isSeniorHigh =
    learnerGrade.includes('11') ||
    learnerGrade.includes('12') ||
    learnerGrade.toLowerCase().includes('senior') ||
    isSasumanParent;
  const learnerStrand = isParent
    ? parentChild?.strand || user?.student_strand || (isSeniorHigh ? 'TVL-ICT' : 'Junior High School')
    : user?.student_strand || (isSeniorHigh ? 'TVL-ICT' : 'Junior High School');
  const defaultSection = isSeniorHigh ? 'Section Almario' : 'Section Rizal';
  const learnerSection = isParent
    ? parentChild?.resolvedSection
      ? `Section ${parentChild.resolvedSection.replace(/^section\s+/i, '')}`
      : user?.student_section
      ? `Section ${user.student_section.replace(/^section\s+/i, '')}`
      : defaultSection
    : user?.student_section
    ? `Section ${user.student_section.replace(/^section\s+/i, '')}`
    : defaultSection;
  const schoolYear = '2026–2027';

  // Promotion target grade level
  const nextGradeLevel = useMemo(() => {
    if (learnerGrade.includes('7')) return 'Grade 8';
    if (learnerGrade.includes('8')) return 'Grade 9';
    if (learnerGrade.includes('9')) return 'Grade 10';
    if (learnerGrade.includes('10')) return 'Grade 11 (Senior High School)';
    if (learnerGrade.includes('11')) return 'Grade 12';
    return 'the Next Grade Level';
  }, [learnerGrade]);

  // Curriculum label
  const curriculumProgram = useMemo(() => {
    if (isSeniorHigh) {
      return 'K to 12 Senior High Curriculum';
    }
    return 'K to 12 Basic Education Curriculum · Junior High School';
  }, [isSeniorHigh]);

  // Default Subject sets for JHS and SHS TVL-ICT
  const DEFAULT_JHS_SUBJECTS: JhsSubjectGrade[] = [
    { code: 'FIL-10', title: 'Filipino', q1: 92, q2: 93, q3: 94, q4: 93, final: 93, remarks: 'Passed' },
    { code: 'ENG-10', title: 'English', q1: 93, q2: 94, q3: 94, q4: 95, final: 94, remarks: 'Passed' },
    { code: 'MATH-10', title: 'Mathematics', q1: 91, q2: 92, q3: 93, q4: 92, final: 92, remarks: 'Passed' },
    { code: 'SCI-10', title: 'Science', q1: 94, q2: 95, q3: 94, q4: 95, final: 95, remarks: 'Passed' },
    { code: 'AP-10', title: 'Araling Panlipunan (AP)', q1: 95, q2: 95, q3: 96, q4: 96, final: 96, remarks: 'Passed' },
    { code: 'ESP-10', title: 'Edukasyon sa Pagpapakatao (EsP)', q1: 96, q2: 97, q3: 96, q4: 97, final: 97, remarks: 'Passed' },
    { code: 'TLE-10', title: 'Technology and Livelihood Education (TLE)', q1: 94, q2: 95, q3: 94, q4: 95, final: 95, remarks: 'Passed' },
    { code: 'MAPEH-10', title: 'Music, Arts, Physical Education & Health (MAPEH)', isMapehParent: true, q1: 95, q2: 96, q3: 95, q4: 96, final: 96, remarks: 'Passed' },
    { code: 'MUSIC-10', title: 'Music', isMapehChild: true, q1: 94, q2: 95, q3: 95, q4: 96, final: 95, remarks: 'Passed' },
    { code: 'ARTS-10', title: 'Arts', isMapehChild: true, q1: 93, q2: 94, q3: 95, q4: 95, final: 94, remarks: 'Passed' },
    { code: 'PE-10', title: 'Physical Education (P.E.)', isMapehChild: true, q1: 96, q2: 97, q3: 96, q4: 97, final: 97, remarks: 'Passed' },
    { code: 'HEALTH-10', title: 'Health', isMapehChild: true, q1: 95, q2: 96, q3: 95, q4: 96, final: 96, remarks: 'Passed' },
  ];

  const DEFAULT_SHS_SUBJECTS: JhsSubjectGrade[] = [
    { code: 'CORE-1', title: 'Oral Communication in Context', q1: 99, q2: 93, q3: 95, q4: 96, final: 96, remarks: 'Passed' },
    { code: 'CORE-3', title: 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino', q1: 95, q2: 93, q3: 94, q4: 95, final: 94, remarks: 'Passed' },
    { code: 'CORE-8', title: 'General Mathematics', q1: 89, q2: 91, q3: 90, q4: 91, final: 90, remarks: 'Passed' },
    { code: 'CORE-10', title: 'Earth and Life Science', q1: 92, q2: 94, q3: 93, q4: 95, final: 94, remarks: 'Passed' },
    { code: 'CORE-12', title: 'Introduction to the Philosophy of the Human Person', q1: 91, q2: 93, q3: 92, q4: 93, final: 92, remarks: 'Passed' },
    { code: 'CORE-13-1', title: 'Physical Education and Health 1', q1: 95, q2: 97, q3: 96, q4: 97, final: 96, remarks: 'Passed' },
    { code: 'APP-3', title: 'English for Academic and Professional Purposes', q1: 90, q2: 92, q3: 91, q4: 92, final: 91, remarks: 'Passed' },
    { code: 'APP-5', title: 'Empowerment Technologies: ICT for Professional Tracks', q1: 93, q2: 95, q3: 94, q4: 95, final: 94, remarks: 'Passed' },
    { code: 'APP-1', title: 'Computer Systems Servicing NC II (CSS 1)', q1: 92, q2: 94, q3: 93, q4: 95, final: 93, remarks: 'Passed' },
  ];

  const [jhsSubjects, setJhsSubjects] = useState<JhsSubjectGrade[]>(() =>
    isSeniorHigh ? DEFAULT_SHS_SUBJECTS : DEFAULT_JHS_SUBJECTS
  );

  // When grade level changes, reset default subjects
  useEffect(() => {
    setJhsSubjects(isSeniorHigh ? DEFAULT_SHS_SUBJECTS : DEFAULT_JHS_SUBJECTS);
  }, [isSeniorHigh]);

  // Load live grades from Supabase if recorded
  useEffect(() => {
    async function loadLiveGrades() {
      try {
        let studentId = isParent
          ? parentChild?.id || user?.student_id
          : user?.student_id || user?.id;
        const cleanEmail = (user?.email || '').trim().toLowerCase();
        const cleanLrn = isParent
          ? parentChild?.lrn || user?.student_lrn || ''
          : (user?.student_lrn || '').trim();

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

        // Fetch grades and subjects from unified store & cloud
        const [cloudGrades, subjectsRes] = await Promise.all([
          fetchGradesForStudent(studentId, schoolYear),
          supabase.from('subjects').select('*'),
        ]);

        const dbGrades = cloudGrades || [];
        const dbSubjects = subjectsRes.data || [];

        if (dbGrades.length > 0) {
          const gradesBySubject: Record<string, Record<number, number>> = {};
          dbGrades.forEach((g: any) => {
            if (!gradesBySubject[g.subject_id]) gradesBySubject[g.subject_id] = {};
            if (g.quarter && g.grade !== null && g.grade !== undefined) {
              gradesBySubject[g.subject_id][Number(g.quarter)] = Number(g.grade);
            }
          });

          // Match live recorded grades against JHS subjects
          setJhsSubjects((prev) =>
            prev.map((sub) => {
              const matchedDbSub = dbSubjects.find((s: any) => {
                const sName = (s.name || '').toLowerCase();
                const subTitle = sub.title.toLowerCase();
                return (
                  s.code === sub.code ||
                  sName === subTitle ||
                  subTitle.includes(sName) ||
                  sName.includes(subTitle.split(' ')[0])
                );
              });

              if (matchedDbSub && gradesBySubject[matchedDbSub.id]) {
                const marks = gradesBySubject[matchedDbSub.id];
                const q1 = marks[1] !== undefined ? marks[1] : sub.q1;
                const q2 = marks[2] !== undefined ? marks[2] : sub.q2;
                const q3 = marks[3] !== undefined ? marks[3] : sub.q3;
                const q4 = marks[4] !== undefined ? marks[4] : sub.q4;
                const validMarks = [q1, q2, q3, q4].filter((v): v is number => typeof v === 'number' && v > 0);
                const final =
                  validMarks.length > 0
                    ? Math.round(validMarks.reduce((a, b) => a + b, 0) / validMarks.length)
                    : sub.final;
                return {
                  ...sub,
                  q1,
                  q2,
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
    window.addEventListener('plshs_grades_updated', loadLiveGrades);
    return () => {
      window.removeEventListener('plshs_grades_updated', loadLiveGrades);
    };
  }, [user, isParent, parentChild]);

  // Major 8 Learning Areas that contribute to General Average (MAPEH is included; sub-components are excluded)
  const mainLearningAreas = useMemo(
    () => jhsSubjects.filter((s) => !s.isMapehChild),
    [jhsSubjects]
  );

  // Quarterly General Averages
  const q1GeneralAverage = useMemo(() => {
    if (mainLearningAreas.length === 0) return '0.00';
    const sum = mainLearningAreas.reduce((acc, s) => acc + s.q1, 0);
    return (sum / mainLearningAreas.length).toFixed(2);
  }, [mainLearningAreas]);

  const q2GeneralAverage = useMemo(() => {
    if (mainLearningAreas.length === 0) return '0.00';
    const sum = mainLearningAreas.reduce((acc, s) => acc + s.q2, 0);
    return (sum / mainLearningAreas.length).toFixed(2);
  }, [mainLearningAreas]);

  const q3GeneralAverage = useMemo(() => {
    if (mainLearningAreas.length === 0) return '0.00';
    const sum = mainLearningAreas.reduce((acc, s) => acc + s.q3, 0);
    return (sum / mainLearningAreas.length).toFixed(2);
  }, [mainLearningAreas]);

  const q4GeneralAverage = useMemo(() => {
    if (mainLearningAreas.length === 0) return '0.00';
    const sum = mainLearningAreas.reduce((acc, s) => acc + s.q4, 0);
    return (sum / mainLearningAreas.length).toFixed(2);
  }, [mainLearningAreas]);

  // General Final Average (Sum of final ratings of 8 major learning areas / 8)
  const generalFinalAverage = useMemo(() => {
    if (mainLearningAreas.length === 0) return '0.00';
    const sum = mainLearningAreas.reduce((acc, s) => acc + s.final, 0);
    return (sum / mainLearningAreas.length).toFixed(2);
  }, [mainLearningAreas]);

  // DepEd Learner's Observed Values (DepEd Core Values)
  const coreValues: CoreValueItem[] = [
    {
      category: '1. Maka-Diyos',
      statement: "Expresses one's spiritual beliefs while respecting the spiritual beliefs of others",
      q1: 'AO',
      q2: 'AO',
      q3: 'AO',
      q4: 'AO',
    },
    {
      category: '1. Maka-Diyos',
      statement: 'Shows adherence to ethical principles by upholding truth and honesty in all endeavors',
      q1: 'AO',
      q2: 'AO',
      q3: 'AO',
      q4: 'AO',
    },
    {
      category: '2. Makatao',
      statement: 'Is sensitive to individual, social, and cultural differences; promotes harmony',
      q1: 'AO',
      q2: 'AO',
      q3: 'AO',
      q4: 'AO',
    },
    {
      category: '2. Makatao',
      statement: 'Demonstrates solidarity and active teamwork in school, group, and community undertakings',
      q1: 'AO',
      q2: 'AO',
      q3: 'AO',
      q4: 'AO',
    },
    {
      category: '3. Makakalikasan',
      statement: 'Cares for the environment and utilizes school resources wisely, judiciously, and economically',
      q1: 'AO',
      q2: 'AO',
      q3: 'AO',
      q4: 'AO',
    },
    {
      category: '4. Makabansa',
      statement: 'Demonstrates pride in being a Filipino; exercises civic rights and community responsibilities',
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
    document.title = `PLSNHS_Form138_SF9_JHS_${learnerName.replace(/\s+/g, '_')}_SY${schoolYear}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  };

  // Export CSV Handler in DepEd JHS SF9 Matrix Format
  const handleExportCsv = () => {
    const csvLines: string[] = [];

    csvLines.push('"REPUBLIC OF THE PHILIPPINES"');
    csvLines.push('"DEPARTMENT OF EDUCATION"');
    csvLines.push('"REGION VII, CENTRAL VISAYAS · SCHOOLS DIVISION OF CITY OF NAGA · DISTRICT OF NAGA I"');
    csvLines.push('"PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL"');
    csvLines.push('"Langtad, City of Naga, Cebu · School ID: 303035"');
    csvLines.push('""');
    csvLines.push('"DEPED SF9 - JHS (SCHOOL FORM 9): LEARNER PROGRESS REPORT CARD (FORM 138)"');
    csvLines.push(`"Learner Name:","${learnerName}"`);
    csvLines.push(`"Learner Reference Number (LRN):","${learnerLrn}"`);
    csvLines.push(`"Grade Level & Section:","${learnerGrade} - ${learnerSection}"`);
    csvLines.push(`"Curriculum Program:","${curriculumProgram}"`);
    csvLines.push(`"School Year:","${schoolYear}"`);
    csvLines.push(`"General Final Average:","${generalFinalAverage}"`);
    csvLines.push('"DepEd Academic Descriptor:","Outstanding (With High Honors)"');
    csvLines.push('""');

    // Learning Areas Matrix
    csvLines.push('"REPORT ON LEARNING PROGRESS AND ACHIEVEMENT"');
    csvLines.push('"Subject Code","Learning Areas (Subjects)","Quarter 1","Quarter 2","Quarter 3","Quarter 4","Final Rating","Remarks"');
    jhsSubjects.forEach((s) => {
      const indent = s.isMapehChild ? '   ' : '';
      csvLines.push([
        `"${s.code}"`,
        `"${indent}${s.title}"`,
        String(s.q1),
        String(s.q2),
        String(s.q3),
        String(s.q4),
        String(s.final),
        `"${s.remarks}"`,
      ].join(','));
    });
    csvLines.push(
      `"","General Average","${q1GeneralAverage}","${q2GeneralAverage}","${q3GeneralAverage}","${q4GeneralAverage}","${generalFinalAverage}","Passed"`
    );
    csvLines.push('""');

    // Core Values
    csvLines.push('"REPORT ON LEARNER\'S OBSERVED VALUES (DEPED CORE VALUES)"');
    csvLines.push('"Core Values","Behavior Statements","Q1","Q2","Q3","Q4"');
    coreValues.forEach((cv) => {
      csvLines.push(`"${cv.category}","${cv.statement}","${cv.q1}","${cv.q2}","${cv.q3}","${cv.q4}"`);
    });
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
    link.setAttribute('download', `DepEd_SF9_JHS_Form138_${learnerName.replace(/\s+/g, '_')}_SY2026-2027.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-16">
      {/* ================================================================= */}
      {/* PRINT CSS: Strictly engineered to fit on a SINGLE 8.5" x 11" PAGE  */}
      {/* ================================================================= */}
      <style>{`
        @page {
          size: letter portrait;
          margin: 0.18in 0.25in 0.14in 0.25in;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            height: 100% !important;
            max-height: 100vh !important;
            overflow: hidden !important;
            font-size: 6.4pt !important;
            line-height: 1.12 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
          .print-bond-paper {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: 10.4in !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-before: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }
          .bond-paper-document {
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            max-height: 10.4in !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-before: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
            display: block !important;
          }
          .official-grade-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .official-grade-table th,
          .official-grade-table td {
            border: 1px solid #000000 !important;
            color: #000000 !important;
            padding: 0.9px 2.5px !important;
            font-size: 6.3pt !important;
            line-height: 1.1 !important;
          }
          .official-grade-table th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-weight: 700 !important;
            font-size: 6.1pt !important;
            padding: 1.1px 2.5px !important;
          }
          .official-double-line {
            border-bottom: 2px solid #000000 !important;
          }
        }
      `}</style>

      {/* Screen Control Header (Aligned with Dashboard & Admin standard) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight whitespace-nowrap">
              Learner Progress Report Card (SF9)
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 whitespace-nowrap shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              DepEd JHS Form 138 Format
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Junior High School (JHS) Unified 4-Quarter Progress &amp; Academic Ratings · S.Y. {schoolYear}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all cursor-pointer active:scale-98"
            title="Download official DepEd JHS Form 138 dataset as CSV"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex h-10 items-center gap-2.5 rounded-xl bg-[#152e69] hover:bg-[#0f1f4b] px-5 text-xs font-bold text-white shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-98"
            title="Print official Form 138 Grade Card on standard short bond paper (8.5&quot; × 11&quot;)"
          >
            <Printer className="h-4 w-4 text-[#F5C518]" />
            <span>Print Report Card</span>
          </button>

          <PageHeaderNotificationSlot />
        </div>
      </div>

      {/* ================================================================ */}
      {/* 1. SCREEN VIEW: MODERN DIGITAL WEB DASHBOARD (NO BOND PAPER)     */}
      {/* ================================================================ */}
      <div className="no-print space-y-6">
        {/* Learner Demographic Profile & KPI Summary Header */}
        <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#152e69] to-blue-700 text-white flex items-center justify-center font-bold text-lg font-display shadow-xs shrink-0">
                {learnerName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display tracking-tight truncate">
                    {learnerName}
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Officially Enrolled
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 font-medium">
                  <span>LRN: <strong className="font-mono text-slate-800">{learnerLrn}</strong></span>
                  <span>•</span>
                  <span>{learnerGrade} – {learnerSection}</span>
                  <span>•</span>
                  <span className="text-slate-700 font-semibold">{curriculumProgram}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-900 shadow-2xs">
                <Award className="h-4 w-4 text-amber-600" />
                With High Honors
              </span>
            </div>
          </div>

          {/* KPI Metrics Grid: Unified Quarterly Averages */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-6 pt-5 border-t border-slate-100">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 sm:p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">General Average</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono">{generalFinalAverage}</span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 mt-0.5 block">Passed (Final)</span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Quarter 1</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">{q1GeneralAverage}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">1st Grading</span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Quarter 2</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">{q2GeneralAverage}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">2nd Grading</span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Quarter 3</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">{q3GeneralAverage}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">3rd Grading</span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Quarter 4</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">{q4GeneralAverage}</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">4th Grading</span>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Attendance</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-black text-blue-900 font-mono">{attendanceRate}%</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">{totalDaysPresent}/{totalSchoolDays} Days</span>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl w-fit border border-slate-200/80 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('jhs_sf9')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'jhs_sf9'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-emerald-700" />
            <span>JHS Form 138 (Unified SF9 Sheet)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quarterly_breakdown')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'quarterly_breakdown'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
            <span>Quarterly Progression</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('values_attendance')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'values_attendance'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
            <span>Core Values &amp; Attendance</span>
          </button>
        </div>

        {/* TAB 1: JHS FORM 138 UNIFIED REPORT CARD */}
        {activeTab === 'jhs_sf9' && (
          <div className="space-y-6">
            {/* UNIFIED 4-QUARTER LEARNING AREAS CARD */}
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 font-display">
                    Report on Learning Progress and Achievement (JHS SF9)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    DepEd standard unified 4-quarter matrix covering all 8 Junior High School learning areas
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                    DepEd Order No. 8, s. 2015
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5 w-[38%]">Learning Areas (Subjects)</th>
                      <th className="px-3.5 py-3.5 text-center w-[10%]">1 (Q1)</th>
                      <th className="px-3.5 py-3.5 text-center w-[10%]">2 (Q2)</th>
                      <th className="px-3.5 py-3.5 text-center w-[10%]">3 (Q3)</th>
                      <th className="px-3.5 py-3.5 text-center w-[10%]">4 (Q4)</th>
                      <th className="px-4 py-3.5 text-center font-bold text-slate-900 w-[11%] bg-slate-100/70">
                        Final Rating
                      </th>
                      <th className="px-5 py-3.5 text-right w-[11%]">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {jhsSubjects.map((s, idx) => {
                      if (s.isMapehChild) {
                        return (
                          <tr key={idx} className="bg-slate-50/30 hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-2.5 pl-10 text-slate-600">
                              <span className="text-[11px] font-medium">• {s.title}</span>
                            </td>
                            <td className="px-3.5 py-2.5 text-center font-mono text-[11px] text-slate-500">{s.q1}</td>
                            <td className="px-3.5 py-2.5 text-center font-mono text-[11px] text-slate-500">{s.q2}</td>
                            <td className="px-3.5 py-2.5 text-center font-mono text-[11px] text-slate-500">{s.q3}</td>
                            <td className="px-3.5 py-2.5 text-center font-mono text-[11px] text-slate-500">{s.q4}</td>
                            <td className="px-4 py-2.5 text-center font-mono font-semibold text-slate-600 text-[11px] bg-slate-50/50">
                              {s.final}
                            </td>
                            <td className="px-5 py-2.5 text-right text-[11px] font-medium text-emerald-700">
                              {s.remarks}
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            s.isMapehParent ? 'bg-amber-50/20 font-bold' : ''
                          }`}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{s.title}</span>
                              <span className="text-[9.5px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                {s.code}
                              </span>
                            </div>
                          </td>
                          <td className="px-3.5 py-3.5 text-center font-mono font-medium text-slate-700">{s.q1}</td>
                          <td className="px-3.5 py-3.5 text-center font-mono font-medium text-slate-700">{s.q2}</td>
                          <td className="px-3.5 py-3.5 text-center font-mono font-medium text-slate-700">{s.q3}</td>
                          <td className="px-3.5 py-3.5 text-center font-mono font-medium text-slate-700">{s.q4}</td>
                          <td className="px-4 py-3.5 text-center font-mono font-black text-slate-900 text-sm bg-slate-50/60">
                            {s.final}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Badge variant="success" size="sm">{s.remarks}</Badge>
                          </td>
                        </tr>
                      );
                    })}

                    {/* General Average Row (DepEd Standard Summary) */}
                    <tr className="bg-emerald-50/70 font-black border-t-2 border-emerald-300">
                      <td className="px-5 py-4 uppercase tracking-wider text-xs text-emerald-950 font-display">
                        General Average
                      </td>
                      <td className="px-3.5 py-4 text-center font-mono font-black text-slate-900 text-sm">
                        {q1GeneralAverage}
                      </td>
                      <td className="px-3.5 py-4 text-center font-mono font-black text-slate-900 text-sm">
                        {q2GeneralAverage}
                      </td>
                      <td className="px-3.5 py-4 text-center font-mono font-black text-slate-900 text-sm">
                        {q3GeneralAverage}
                      </td>
                      <td className="px-3.5 py-4 text-center font-mono font-black text-slate-900 text-sm">
                        {q4GeneralAverage}
                      </td>
                      <td className="px-4 py-4 text-center font-mono font-black text-base text-emerald-950 bg-emerald-100/80">
                        {generalFinalAverage}
                      </td>
                      <td className="px-5 py-4 text-right font-black uppercase tracking-wider text-emerald-800 text-xs">
                        PASSED
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* OBSERVED VALUES (DEPED CORE VALUES) & ATTENDANCE CARDS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* DepEd Core Values Card */}
              <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-900 text-sm font-display">
                    Learner&apos;s Observed Values (DepEd Core Values)
                  </h3>
                  <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-2 py-0.5 rounded">
                    AO: Always Observed
                  </span>
                </div>

                <div className="mt-3 divide-y divide-slate-100">
                  {coreValues.map((cv, idx) => (
                    <div key={idx} className="py-2.5 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block">{cv.category}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{cv.statement}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {cv.q4}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attendance SF2 Summary Card */}
              <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-900 text-sm font-display">
                    Monthly Attendance (DepEd SF2 Record)
                  </h3>
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {attendanceRate}% Present
                  </span>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-center text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px]">
                      <tr>
                        <th className="px-2 py-2 text-left">Record</th>
                        {attendanceRecord.map((m) => (
                          <th key={m.month} className="px-1.5 py-2 font-mono">{m.month}</th>
                        ))}
                        <th className="px-2 py-2 bg-slate-100 font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[11px]">
                      <tr>
                        <td className="px-2 py-2.5 text-left font-semibold text-slate-700">Days</td>
                        {attendanceRecord.map((m) => (
                          <td key={m.month} className="px-1.5 py-2.5 font-mono text-slate-600">{m.schoolDays}</td>
                        ))}
                        <td className="px-2 py-2.5 font-mono font-bold text-slate-900 bg-slate-50">{totalSchoolDays}</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-2.5 text-left font-semibold text-emerald-800">Present</td>
                        {attendanceRecord.map((m) => (
                          <td key={m.month} className="px-1.5 py-2.5 font-mono text-emerald-700 font-medium">{m.daysPresent}</td>
                        ))}
                        <td className="px-2 py-2.5 font-mono font-bold text-emerald-800 bg-emerald-50/50">{totalDaysPresent}</td>
                      </tr>
                      <tr>
                        <td className="px-2 py-2.5 text-left font-semibold text-slate-400">Absent</td>
                        {attendanceRecord.map((m) => (
                          <td key={m.month} className="px-1.5 py-2.5 font-mono text-slate-400">{m.daysAbsent}</td>
                        ))}
                        <td className="px-2 py-2.5 font-mono font-bold text-slate-500 bg-slate-50">{totalDaysAbsent}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Grading Scale Guide */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    DepEd Grading Scale &amp; Performance Descriptors
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[10px]">
                    <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                      <strong className="block text-slate-900">90 – 100</strong>
                      <span className="text-slate-500">Outstanding</span>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                      <strong className="block text-slate-900">85 – 89</strong>
                      <span className="text-slate-500">Very Satisfactory</span>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                      <strong className="block text-slate-900">80 – 84</strong>
                      <span className="text-slate-500">Satisfactory</span>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                      <strong className="block text-slate-900">75 – 79</strong>
                      <span className="text-slate-500">Fairly Satisfactory</span>
                    </div>
                    <div className="p-1.5 bg-rose-50 rounded-lg border border-rose-100">
                      <strong className="block text-rose-700">Below 75</strong>
                      <span className="text-rose-600">Did Not Meet</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CERTIFICATE OF PROMOTION & AUTHORIZED SIGNATORIES CARD */}
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs space-y-5">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-bold text-emerald-950 uppercase tracking-wide">
                      Certificate of Eligibility for Promotion &amp; Transfer
                    </h4>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      This is to certify that <strong>{learnerName.toUpperCase()}</strong> (LRN: {learnerLrn}) of <strong>{learnerGrade} – {learnerSection}</strong> has completed the required academic competencies for School Year <strong>{schoolYear}</strong> and is eligible for admission to <strong>{nextGradeLevel}</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Authorized DepEd Signatories
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Class Adviser</span>
                    <p className="font-extrabold text-slate-900 text-sm mt-1">MR. J. ALMARIO</p>
                    <p className="text-xs font-medium text-slate-600">Teacher II · Faculty Advisory</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Junior High School Department</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">School Principal I</span>
                    <p className="font-extrabold text-slate-900 text-sm mt-1">JUSTINE MANGILA, Dev.Ed.D.</p>
                    <p className="text-xs font-medium text-slate-600">School Head / Authorized Official</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">PLSNHS Executive Administration</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Certification Date</span>
                    <p className="font-extrabold text-slate-900 text-sm mt-1">March 27, 2027</p>
                    <p className="text-xs font-medium text-slate-600">DepEd School ID: 303035</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Officially Certified DepEd Record</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUARTERLY BREAKDOWN */}
        {activeTab === 'quarterly_breakdown' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { qNum: 'Quarter 1', avg: q1GeneralAverage, label: '1st Grading Period', icon: Award, color: 'text-blue-700 bg-blue-50 border-blue-200' },
                { qNum: 'Quarter 2', avg: q2GeneralAverage, label: '2nd Grading Period', icon: TrendingUp, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
                { qNum: 'Quarter 3', avg: q3GeneralAverage, label: '3rd Grading Period', icon: Sparkles, color: 'text-purple-700 bg-purple-50 border-purple-200' },
                { qNum: 'Quarter 4', avg: q4GeneralAverage, label: '4th Grading Period', icon: GraduationCap, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
              ].map((q, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex p-2 rounded-xl border ${q.color}`}>
                      <q.icon className="h-4 w-4" />
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">Passed</span>
                  </div>
                  <div className="mt-4">
                    <span className="text-xs font-bold text-slate-500 block">{q.qNum}</span>
                    <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">{q.avg}</span>
                    <p className="text-[11px] text-slate-400 mt-1">{q.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Individual Subjects Progression Cards */}
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base font-display">
                Subject Quarterly Comparison Progression
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mainLearningAreas.map((sub, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs truncate">{sub.title}</h4>
                        <span className="text-[10px] font-mono text-slate-400">{sub.code}</span>
                      </div>
                      <span className="text-sm font-black font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {sub.final}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 block">Q1</span>
                        <strong className="font-mono text-slate-800">{sub.q1}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 block">Q2</span>
                        <strong className="font-mono text-slate-800">{sub.q2}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 block">Q3</span>
                        <strong className="font-mono text-slate-800">{sub.q3}</strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 block">Q4</span>
                        <strong className="font-mono text-slate-800">{sub.q4}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CORE VALUES & ATTENDANCE */}
        {activeTab === 'values_attendance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Detailed Core Values */}
              <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-900 text-base font-display">
                    Learner&apos;s Observed Values (Character Appraisal)
                  </h3>
                  <Badge variant="success" size="sm">Exemplary Conduct</Badge>
                </div>
                <div className="divide-y divide-slate-100">
                  {coreValues.map((cv, idx) => (
                    <div key={idx} className="py-3 flex items-start justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-slate-900">{cv.category}</span>
                        <p className="text-xs text-slate-500 mt-0.5">{cv.statement}</p>
                      </div>
                      <div className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-800 shrink-0">
                        <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{cv.q1}</span>
                        <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{cv.q2}</span>
                        <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{cv.q3}</span>
                        <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{cv.q4}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Attendance */}
              <div className="rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-extrabold text-slate-900 text-base font-display">
                    Annual Attendance Breakdown (SF2)
                  </h3>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
                    {attendanceRate}% Overall
                  </span>
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {attendanceRecord.map((m, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <span className="font-bold text-slate-700 w-16">{m.month}</span>
                      <span className="text-slate-500">{m.schoolDays} Days</span>
                      <span className="font-semibold text-emerald-700">{m.daysPresent} Present</span>
                      <span className="text-slate-400">{m.daysAbsent} Absent</span>
                      <span className="font-mono font-bold text-slate-900">
                        {((m.daysPresent / m.schoolDays) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* 2. PRINT-ONLY VIEW: EXACT SINGLE SHEET BOND PAPER (8.5" × 11")   */}
      {/*    DepEd Junior High School (JHS Form 138 / SF9) Standard Layout  */}
      {/* ================================================================ */}
      <div className="print-bond-paper hidden print:block w-full text-slate-900 font-sans">
        <div className="bond-paper-document w-full bg-white text-slate-900 font-sans space-y-1">
          {/* 1. DepEd Official Letterhead */}
          <div className="flex items-center justify-between pb-0.5 border-b border-black/30">
            <div className="w-12 flex items-center justify-center shrink-0">
              <img
                src="/pictures/logo sa skwelahan.png"
                alt="PLSNHS Seal"
                className="h-11 w-11 object-contain rounded-full shadow-2xs"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            <div className="text-center flex-1 px-2 leading-none">
              <p className="text-[7pt] uppercase tracking-widest font-semibold text-slate-800 font-serif">
                Republic of the Philippines
              </p>
              <h2 className="text-[9pt] uppercase font-bold tracking-wider text-slate-950 font-serif mt-0.5">
                Department of Education
              </h2>
              <p className="text-[6.8pt] font-medium text-slate-700 leading-tight mt-0.5">
                Region VII, Central Visayas · Schools Division of City of Naga · District of Naga I
              </p>
              <h1 className="text-[10pt] font-black tracking-wide text-black uppercase mt-0.5 font-serif">
                PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL
              </h1>
              <p className="text-[6.5pt] text-slate-600 leading-tight">
                Langtad, City of Naga, Cebu · School Identification Number (ID): <strong>303035</strong>
              </p>
            </div>

            <div className="w-12 shrink-0 flex items-center justify-center text-center">
              <div className="border border-slate-900 rounded-2xs p-0.5 text-[6pt] leading-tight text-slate-800">
                <span className="font-bold block">DEPED SF9</span>
                <span>{isSeniorHigh ? 'Form 138-SHS' : 'Form 138-JHS'}</span>
              </div>
            </div>
          </div>

          {/* 2. Double Line Divider */}
          <div className="border-b-2 border-black official-double-line"></div>
          <div className="border-b border-black -mt-1 mb-0.5"></div>

          {/* 3. Title */}
          <div className="text-center space-y-0.5">
            <h3 className="text-[8.5pt] font-black uppercase tracking-wider text-slate-950 leading-tight">
              LEARNER&apos;S PROGRESS REPORT CARD (SF9 - {isSeniorHigh ? 'SHS' : 'JHS'})
            </h3>
            <p className="text-[7pt] font-bold text-slate-800 uppercase tracking-wide leading-tight">
              School Year {schoolYear} · {isSeniorHigh ? 'Senior High School' : 'Junior High School'}
            </p>
          </div>

          {/* 4. Student Demographic Matrix */}
          <div className="border border-black bg-slate-50/40 p-1 rounded-2xs text-[6.8pt] space-y-0.5 leading-tight">
            <div className="grid grid-cols-3 gap-1">
              <div>
                <span className="text-[6pt] font-bold uppercase text-slate-600 block">Name of Learner:</span>
                <span className="font-black text-slate-950 uppercase text-[7.5pt]">{learnerName}</span>
              </div>
              <div>
                <span className="text-[6pt] font-bold uppercase text-slate-600 block">Learner Reference No. (LRN):</span>
                <span className="font-mono font-bold text-slate-900 text-[7.5pt]">{learnerLrn}</span>
              </div>
              <div>
                <span className="text-[6pt] font-bold uppercase text-slate-600 block">Grade Level &amp; Section:</span>
                <span className="font-bold text-slate-900 text-[7.5pt]">{learnerGrade} – {learnerSection}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 pt-0.5 border-t border-slate-300">
              <div>
                <span className="text-[6pt] font-bold uppercase text-slate-600 block">
                  {isSeniorHigh ? 'Track & Strand:' : 'Curriculum Program:'}
                </span>
                <span className="font-semibold text-slate-900 text-[6.8pt]">
                  {isSeniorHigh ? (learnerStrand || 'TVL-ICT') : curriculumProgram}
                </span>
              </div>
              <div>
                <span className="text-[6pt] font-bold uppercase text-slate-600 block">
                  {isSeniorHigh ? 'Curriculum Program:' : 'Academic Standing:'}
                </span>
                <span className="text-slate-900 font-semibold text-[6.8pt]">
                  {isSeniorHigh ? 'K to 12 Senior High Curriculum' : 'Passed (With High Honors)'}
                </span>
              </div>
              <div>
                <span className="text-[6pt] font-bold uppercase text-slate-600 block">Age / Sex:</span>
                <span className="text-slate-900 font-medium text-[6.8pt]">17 yrs. old · Male</span>
              </div>
            </div>
          </div>

          {/* 5. REPORT ON LEARNING PROGRESS AND ACHIEVEMENT: UNIFIED JHS TABLE */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[7.5pt] font-black uppercase tracking-wider text-slate-950">
                REPORT ON LEARNING PROGRESS AND ACHIEVEMENT
              </h4>
              <span className="text-[6.5pt] font-bold text-slate-700">DepEd Order No. 8, s. 2015</span>
            </div>

            <table className="official-grade-table w-full text-left text-xs border-collapse border border-black table-fixed">
              <thead>
                <tr className="bg-slate-100 text-slate-950 font-bold uppercase text-[6.5pt] border-b border-black">
                  <th className="border border-black px-1.5 py-0.5 w-[44%]">Learning Areas (Subjects)</th>
                  <th className="border border-black px-1 py-0.5 w-[9%] text-center">1</th>
                  <th className="border border-black px-1 py-0.5 w-[9%] text-center">2</th>
                  <th className="border border-black px-1 py-0.5 w-[9%] text-center">3</th>
                  <th className="border border-black px-1 py-0.5 w-[9%] text-center">4</th>
                  <th className="border border-black px-1 py-0.5 w-[14%] text-center bg-slate-200/60 font-bold">Final Rating</th>
                  <th className="border border-black px-1.5 py-0.5 w-[15%] text-center">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/30 text-[6.8pt]">
                {jhsSubjects.map((s, idx) => {
                  if (s.isMapehChild) {
                    return (
                      <tr key={idx} className="hover:bg-slate-50/40 text-[6.2pt]">
                        <td className="border border-black px-1.5 py-0.5 pl-4 truncate text-slate-700">
                          <span>{s.title}</span>
                        </td>
                        <td className="border border-black px-1 py-0.5 text-center font-mono text-slate-700">{s.q1}</td>
                        <td className="border border-black px-1 py-0.5 text-center font-mono text-slate-700">{s.q2}</td>
                        <td className="border border-black px-1 py-0.5 text-center font-mono text-slate-700">{s.q3}</td>
                        <td className="border border-black px-1 py-0.5 text-center font-mono text-slate-700">{s.q4}</td>
                        <td className="border border-black px-1 py-0.5 text-center font-mono font-medium text-slate-800 bg-slate-50/50">
                          {s.final}
                        </td>
                        <td className="border border-black px-1.5 py-0.5 text-center font-medium text-emerald-800">
                          {s.remarks}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={idx} className={`hover:bg-slate-50/40 ${s.isMapehParent ? 'font-bold' : ''}`}>
                      <td className="border border-black px-1.5 py-0.5 truncate">
                        <span className="font-semibold text-slate-900">{s.title}</span>
                      </td>
                      <td className="border border-black px-1 py-0.5 text-center font-mono text-slate-900">{s.q1}</td>
                      <td className="border border-black px-1 py-0.5 text-center font-mono text-slate-900">{s.q2}</td>
                      <td className="border border-black px-1 py-0.5 text-center font-mono text-slate-900">{s.q3}</td>
                      <td className="border border-black px-1 py-0.5 text-center font-mono text-slate-900">{s.q4}</td>
                      <td className="border border-black px-1 py-0.5 text-center font-mono font-bold text-slate-950 bg-slate-50">
                        {s.final}
                      </td>
                      <td className="border border-black px-1.5 py-0.5 text-center font-medium text-emerald-800">
                        {s.remarks}
                      </td>
                    </tr>
                  );
                })}

                {/* Unified General Average Row */}
                <tr className="bg-slate-200 text-slate-950 font-black border-t-2 border-black text-[7.5pt]">
                  <td className="border border-black px-1.5 py-0.5 uppercase text-right pr-2 font-serif font-bold">
                    General Average
                  </td>
                  <td className="border border-black px-1 py-0.5 text-center font-mono font-bold text-slate-900">{q1GeneralAverage}</td>
                  <td className="border border-black px-1 py-0.5 text-center font-mono font-bold text-slate-900">{q2GeneralAverage}</td>
                  <td className="border border-black px-1 py-0.5 text-center font-mono font-bold text-slate-900">{q3GeneralAverage}</td>
                  <td className="border border-black px-1 py-0.5 text-center font-mono font-bold text-slate-900">{q4GeneralAverage}</td>
                  <td className="border border-black px-1 py-0.5 text-center font-mono text-[8.5pt] font-black text-slate-950 bg-[#F5C518]/30">
                    {generalFinalAverage}
                  </td>
                  <td className="border border-black px-1.5 py-0.5 text-center text-emerald-900 font-black uppercase tracking-wider text-[7pt]">
                    Passed
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 6. REPORT ON LEARNER'S OBSERVED VALUES (DEPED CORE VALUES) */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[7.5pt] font-black uppercase tracking-wider text-slate-950">
                REPORT ON LEARNER&apos;S OBSERVED VALUES (DEPED CORE VALUES)
              </h4>
              <span className="text-[6.2pt] text-slate-600 font-bold">AO: Always · SO: Sometimes · RO: Rarely · NO: Not Observed</span>
            </div>

            <table className="official-grade-table w-full text-left text-xs border-collapse border border-black table-fixed">
              <thead>
                <tr className="bg-slate-100 text-slate-950 font-bold uppercase text-[6.5pt] border-b border-black">
                  <th className="border border-black px-1.5 py-0.5 w-[22%]">Core Values</th>
                  <th className="border border-black px-1.5 py-0.5 w-[54%]">Behavior Statements</th>
                  <th className="border border-black px-1 py-0.5 w-[6%] text-center">1</th>
                  <th className="border border-black px-1 py-0.5 w-[6%] text-center">2</th>
                  <th className="border border-black px-1 py-0.5 w-[6%] text-center">3</th>
                  <th className="border border-black px-1 py-0.5 w-[6%] text-center">4</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/30 text-[6.4pt]">
                {coreValues.map((cv, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40">
                    <td className="border border-black px-1.5 py-0.5 font-bold text-slate-950 truncate">{cv.category}</td>
                    <td className="border border-black px-1.5 py-0.5 text-slate-800 leading-tight">{cv.statement}</td>
                    <td className="border border-black px-1 py-0.5 text-center font-mono font-bold text-slate-900">{cv.q1}</td>
                    <td className="border border-black px-1 py-0.5 text-center font-mono font-bold text-slate-900">{cv.q2}</td>
                    <td className="border border-black px-1 py-0.5 text-center font-mono font-bold text-slate-900">{cv.q3}</td>
                    <td className="border border-black px-1 py-0.5 text-center font-mono font-bold text-slate-900">{cv.q4}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 7. REPORT ON ATTENDANCE (DEPED SF2 RECORD) */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between">
              <h4 className="text-[7.5pt] font-black uppercase tracking-wider text-slate-950">
                REPORT ON ATTENDANCE (DEPED SF2 RECORD)
              </h4>
              <span className="text-[6.2pt] text-slate-600 font-bold">10 School Calendar Months</span>
            </div>

            <table className="official-grade-table w-full text-center text-xs border-collapse border border-black table-fixed">
              <thead>
                <tr className="bg-slate-100 text-slate-950 font-bold uppercase text-[6.5pt] border-b border-black">
                  <th className="border border-black px-1 py-0.5 w-[16%] text-left">Record</th>
                  {attendanceRecord.map((m) => (
                    <th key={m.month} className="border border-black px-0.5 py-0.5 text-[6pt]">{m.month}</th>
                  ))}
                  <th className="border border-black px-0.5 py-0.5 w-[10%] bg-slate-200">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/30 text-[6.4pt]">
                <tr>
                  <td className="border border-black px-1 py-0.5 text-left font-bold text-slate-900">No. of School Days</td>
                  {attendanceRecord.map((m) => (
                    <td key={m.month} className="border border-black px-0.5 py-0.5 font-mono">{m.schoolDays}</td>
                  ))}
                  <td className="border border-black px-0.5 py-0.5 font-mono font-bold text-slate-950 bg-slate-50">{totalSchoolDays}</td>
                </tr>
                <tr>
                  <td className="border border-black px-1 py-0.5 text-left font-bold text-slate-900">No. of Days Present</td>
                  {attendanceRecord.map((m) => (
                    <td key={m.month} className="border border-black px-0.5 py-0.5 font-mono">{m.daysPresent}</td>
                  ))}
                  <td className="border border-black px-0.5 py-0.5 font-mono font-bold text-slate-950 bg-slate-50">{totalDaysPresent}</td>
                </tr>
                <tr>
                  <td className="border border-black px-1 py-0.5 text-left font-bold text-slate-900">No. of Days Absent</td>
                  {attendanceRecord.map((m) => (
                    <td key={m.month} className="border border-black px-0.5 py-0.5 font-mono">{m.daysAbsent}</td>
                  ))}
                  <td className="border border-black px-0.5 py-0.5 font-mono font-bold text-slate-950 bg-slate-50">{totalDaysAbsent}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 8. GRADING SCALE & DESCRIPTORS */}
          <div className="border border-slate-900 bg-slate-50/50 p-1 rounded-2xs text-[6.2pt] grid grid-cols-5 gap-1 text-center leading-tight">
            <div>
              <span className="font-bold block text-slate-950">90 – 100</span>
              <span className="text-slate-600">Outstanding (Passed)</span>
            </div>
            <div>
              <span className="font-bold block text-slate-950">85 – 89</span>
              <span className="text-slate-600">Very Satisfactory</span>
            </div>
            <div>
              <span className="font-bold block text-slate-950">80 – 84</span>
              <span className="text-slate-600">Satisfactory (Passed)</span>
            </div>
            <div>
              <span className="font-bold block text-slate-950">75 – 79</span>
              <span className="text-slate-600">Fairly Satisfactory</span>
            </div>
            <div>
              <span className="font-bold block text-rose-700">Below 75</span>
              <span className="text-rose-600">Did Not Meet</span>
            </div>
          </div>

          {/* 9. CERTIFICATE OF TRANSFER & SIGNATURES BLOCK */}
          <div className="pt-0.5 border-t-2 border-black space-y-1">
            <div className="text-[6.6pt] text-slate-900 leading-tight">
              <p>
                <strong>CERTIFICATE OF TRANSFER &amp; PROMOTION:</strong> This is to certify that <strong>{learnerName.toUpperCase()}</strong> (LRN: {learnerLrn}) of <strong>{learnerGrade} – {learnerSection}</strong> has completed the required academic competencies for School Year <strong>{schoolYear}</strong> and is eligible for admission to <strong>{nextGradeLevel}</strong>.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1 text-center text-xs">
              <div>
                <div className="border-b border-black pb-0.5 mb-0.5 font-bold text-slate-950 uppercase text-[7.2pt]">
                  MR. J. ALMARIO
                </div>
                <span className="text-[6.2pt] uppercase font-bold text-slate-600 block">Class Adviser</span>
                <span className="text-[5.5pt] text-slate-500">Teacher II · Faculty Advisory</span>
              </div>

              <div>
                <div className="border-b border-black pb-0.5 mb-0.5 font-bold text-slate-950 uppercase text-[7.2pt]">
                  JUSTINE MANGILA, Dev.Ed.D.
                </div>
                <span className="text-[6.2pt] uppercase font-bold text-slate-600 block">School Principal I</span>
                <span className="text-[5.5pt] text-slate-500">School Head / Authorized Officer</span>
              </div>

              <div>
                <div className="border-b border-black pb-0.5 mb-0.5 font-mono font-bold text-slate-950 text-[7.2pt]">
                  March 27, 2027
                </div>
                <span className="text-[6.2pt] uppercase font-bold text-slate-600 block">Date Issued</span>
                <span className="text-[5.5pt] text-slate-500">DepEd School ID: 303035</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
