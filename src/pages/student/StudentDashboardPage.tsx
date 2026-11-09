import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import {
  GraduationCap,
  Calendar,
  FileText,
  UserCheck,
  ClipboardList,
  Sparkles,
  BookOpen,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Clock,
  Award,
  Layers,
  ArrowRight,
  Bell,
  QrCode,
  Maximize2,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useEnrollmentStatus } from '../../lib/enrollmentControlStore';
import { fetchGradesForStudent } from '../../lib/gradesStore';
import type { Subject } from '../../types';
import { Modal } from '../../components/common/Modal';
import { saveStudentQrToSupabase } from '../../lib/studentQrService';

const FALLBACK_SUBJECTS: Subject[] = [
  {
    id: 'sub-1',
    code: 'CORE-101',
    title: 'Oral Communication in Context',
    grade_level: 'Grade 11',
    strand: 'ALL',
    semester: '1st Semester',
    units: 3,
  },
  {
    id: 'sub-2',
    code: 'CORE-102',
    title: 'General Mathematics',
    grade_level: 'Grade 11',
    strand: 'ALL',
    semester: '1st Semester',
    units: 3,
  },
  {
    id: 'sub-3',
    code: 'CORE-103',
    title: 'Earth and Life Science',
    grade_level: 'Grade 11',
    strand: 'ALL',
    semester: '1st Semester',
    units: 3,
  },
  {
    id: 'sub-4',
    code: 'CORE-104',
    title: 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
    grade_level: 'Grade 11',
    strand: 'ALL',
    semester: '1st Semester',
    units: 3,
  },
  {
    id: 'sub-5',
    code: 'APPL-201',
    title: 'Empowerment Technologies (E-Tech)',
    grade_level: 'Grade 11',
    strand: 'ALL',
    semester: '1st Semester',
    units: 3,
  },
];

export const StudentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { isOpen: isEnrollmentOpen } = useEnrollmentStatus();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [studentRecord, setStudentRecord] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedLrn, setCopiedLrn] = useState(false);
  const [subjectGradesMap, setSubjectGradesMap] = useState<Record<string, { grade: number; term: string }>>({});

  useEffect(() => {
    async function loadStudentDashboardData() {
      try {
        const strand = user?.student_strand || 'STEM';
        const { data: subData } = await supabase
          .from('subjects')
          .select('*')
          .or(`strand.eq.${strand},strand.eq.ALL`)
          .limit(6);

        if (subData && subData.length > 0) {
          setSubjects(subData);
        } else {
          setSubjects(FALLBACK_SUBJECTS);
        }

        // Also fetch student's full record if available for parent/guardian details on ID
        let resolvedLrn = user?.student_lrn;
        if (user?.student_lrn || user?.email) {
          const { data: stData } = await supabase
            .from('students')
            .select('*')
            .or(
              user?.student_lrn
                ? `lrn.eq.${user.student_lrn}`
                : `email.eq.${user?.email}`
            )
            .maybeSingle();
          if (stData) {
            setStudentRecord(stData);
            if (stData.lrn) resolvedLrn = stData.lrn;
          }
        }

        // Load latest teacher-submitted grades for enrolled subjects
        const studentId = user?.student_id || user?.id;
        if (studentId || resolvedLrn) {
          const grades = await fetchGradesForStudent(
            studentId || '',
            user?.school_year || '2026–2027',
            resolvedLrn
          );
          if (grades && grades.length > 0) {
            const gMap: Record<string, { grade: number; term: string }> = {};
            grades.forEach((g) => {
              const termStr = g.term || `Quarter ${g.quarter}`;
              if (g.subject_id) gMap[g.subject_id] = { grade: g.grade, term: termStr };
              if (g.subject_code) gMap[g.subject_code] = { grade: g.grade, term: termStr };
              if (g.subject_name) gMap[g.subject_name.toLowerCase()] = { grade: g.grade, term: termStr };
            });
            setSubjectGradesMap(gMap);
          }
        }
      } catch (err) {
        console.warn('Student dashboard fetch fallback:', err);
        setSubjects(FALLBACK_SUBJECTS);
      }
    }
    loadStudentDashboardData();
    window.addEventListener('plshs_grades_updated', loadStudentDashboardData);
    return () => {
      window.removeEventListener('plshs_grades_updated', loadStudentDashboardData);
    };
  }, [user]);

  const fullName =
    user?.full_name ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    'PLSNHS Learner';
  const lrn = studentRecord?.lrn || user?.student_lrn || '';
  const gradeLevel = studentRecord?.grade_level || user?.student_grade || 'Grade 7';
  const gradeNumMatch = String(gradeLevel).match(/\d+/);
  const gradeNum = gradeNumMatch ? parseInt(gradeNumMatch[0], 10) : 7;
  const isSeniorHigh = gradeNum >= 11 || String(gradeLevel).toLowerCase().includes('senior');
  const strand = isSeniorHigh
    ? studentRecord?.strand || user?.student_strand || 'STEM'
    : 'Junior High';
  const section =
    studentRecord?.section ||
    user?.student_section ||
    (isSeniorHigh ? `Grade ${gradeNum} - Section A` : `Grade ${gradeNum} - Rizal`);
  const schoolYear = user?.school_year || '2026-2027';
  const enrollmentStatus = (user?.student_status || studentRecord?.status || 'Enrolled').toUpperCase();

  // Generate high-resolution QR pass for gate attendance
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const payload = `${origin}/verify-id?lrn=${encodeURIComponent(lrn)}&name=${encodeURIComponent(fullName)}&grade=${encodeURIComponent(gradeLevel)}`;

    QRCode.toDataURL(payload, {
      width: 320,
      margin: 1,
      color: {
        dark: '#162d6b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setQrDataUrl(url);
        // Persist QR code to Supabase students table
        const targetSid = studentRecord?.id || (user as any)?.student_id || user?.id;
        if (targetSid || (lrn && lrn !== '000000000000')) {
          saveStudentQrToSupabase({ id: targetSid, lrn }, payload).catch(() => {});
        }
      })
      .catch((err) => {
        console.warn('QR code generation error:', err);
        const encoded = encodeURIComponent(payload);
        setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encoded}&color=16-45-107`);
      });
  }, [lrn, fullName, gradeLevel]);

  const handleCopyLrn = () => {
    if (!lrn) return;
    navigator.clipboard.writeText(lrn);
    setCopiedLrn(true);
    setTimeout(() => setCopiedLrn(false), 2000);
  };

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
      {/* Page Header - Clean & Aligned */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-200 pb-4 sm:pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
              Welcome back, {user?.first_name || fullName.split(' ')[0]}!
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[11px] sm:text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500" /> S.Y. {schoolYear}
            </span>
          </div>
          <p className="text-[11px] sm:text-sm text-slate-500 mt-1 max-w-2xl line-clamp-2 sm:line-clamp-none">
            Placido L. Señor National High School · Access your official digital student ID, class schedule, academic grades, and documentary compliance.
          </p>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0">
          <div className="inline-flex h-9 sm:h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 sm:px-3.5 text-xs font-bold text-slate-700 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {enrollmentStatus}
            </span>
          </div>

          <PageHeaderNotificationSlot />
        </div>
      </div>

      {/* 4 Academic KPI Stat Cards (Compact 2x2 grid on mobile, 4 across on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs flex items-center gap-2.5 sm:gap-3.5 hover:border-slate-300 transition-all">
          <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-[#1B2A4A]/10 text-[#1B2A4A] shrink-0">
            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              LRN
            </span>
            <p className="text-xs sm:text-sm font-black font-mono text-slate-900 truncate mt-0.5">
              {lrn}
            </p>
          </div>
        </div>

        <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs flex items-center gap-2.5 sm:gap-3.5 hover:border-slate-300 transition-all">
          <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-amber-50 text-amber-700 shrink-0">
            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Grade & Strand
            </span>
            <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate mt-0.5">
              {gradeLevel} · {strand}
            </p>
          </div>
        </div>

        <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs flex items-center gap-2.5 sm:gap-3.5 hover:border-slate-300 transition-all">
          <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
            <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Section
            </span>
            <p className="text-xs sm:text-sm font-extrabold text-slate-900 truncate mt-0.5">
              {section}
            </p>
          </div>
        </div>

        <div className="rounded-xl sm:rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-xs flex items-center gap-2.5 sm:gap-3.5 hover:border-slate-300 transition-all">
          <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-blue-50 text-blue-700 shrink-0">
            <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              QR Gate Pass
            </span>
            <p className="text-xs sm:text-sm font-extrabold text-emerald-700 truncate mt-0.5">
              Active & Verified
            </p>
          </div>
        </div>
      </div>

      {/* Main 12-Column Balanced Workspace (6 + 6 on lg/xl so both columns sit side-by-side) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Left Column (6 cols): Emergency Attendance QR Gate Pass */}
        <div className="xl:col-span-6 rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3.5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-2 border-b border-slate-100 pb-3 sm:pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#152e69] text-[#F5C518]">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                    Attendance QR Pass (Gate Entry)
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">
                    Emergency scannable pass for campus turnstiles & classrooms
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-all cursor-pointer shrink-0"
              >
                <Maximize2 className="h-3.5 w-3.5 text-[#152e69]" />
                <span>Enlarge Pass</span>
              </button>
            </div>

            {/* Official Pass Card with Navy gradient */}
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c1833] via-[#152e69] to-[#1e3a8a] text-white p-5 sm:p-6 shadow-md border border-slate-700/40">
                {/* Decorative backdrop shapes */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-blue-400/10 blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />

                {/* Header Row inside Pass */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <img
                      src="/plsnhs_logo.png"
                      alt="PLSNHS Logo"
                      className="w-7 h-7 object-contain drop-shadow-sm"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div>
                      <p className="text-[10px] font-black tracking-widest uppercase text-amber-300">
                        Placido L. Señor NHS
                      </p>
                      <p className="text-[9px] text-blue-200 uppercase font-semibold">
                        Digital Attendance Pass
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live Gate Pass
                  </span>
                </div>

                {/* QR Code Presentation Box */}
                <div className="flex flex-col items-center justify-center my-1 text-center">
                  <div className="bg-white p-3 rounded-2xl shadow-lg border-2 border-amber-300/60 inline-flex flex-col items-center">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Student Gate Attendance QR Code"
                        className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                      />
                    ) : (
                      <div className="w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center text-slate-400">
                        <QrCode className="w-12 h-12 animate-pulse text-slate-300" />
                      </div>
                    )}
                    <p className="text-[9px] font-extrabold text-slate-600 uppercase tracking-widest mt-1">
                      Turnstile & Teacher Scanner
                    </p>
                  </div>

                  {/* Quick Enlarge & Copy Actions */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/20 transition-all cursor-pointer backdrop-blur-xs shadow-2xs"
                    >
                      <Maximize2 className="h-3.5 w-3.5 text-amber-300" />
                      <span>Enlarge for Scanner</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyLrn}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 transition-all cursor-pointer"
                      title="Copy LRN to clipboard"
                    >
                      {copiedLrn ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-300" />
                          <span>Copy LRN</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Learner Info Strip */}
                <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <p className="font-extrabold text-white text-sm tracking-tight">
                      {fullName}
                    </p>
                    <p className="text-slate-300 text-[11px] font-mono">
                      LRN: <span className="font-bold text-amber-300">{lrn}</span>
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-bold text-blue-100 text-[11px]">
                      {gradeLevel} · {strand}
                    </p>
                    <p className="text-slate-400 text-[10px]">
                      {section} • S.Y. {schoolYear}
                    </p>
                  </div>
                </div>
              </div>

              {/* Emergency Guidance & Printing Policy Notice */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 sm:p-3.5 text-xs text-amber-950 flex items-start gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div className="space-y-1 min-w-0 flex-1">
                  <p className="font-extrabold text-amber-900 text-xs">
                    Emergency Attendance Pass & ID Policy
                  </p>
                  <p className="text-[11px] text-amber-800/90 leading-relaxed">
                    If you misplaced or forgot your physical ID today, present this digital QR pass directly to the campus gate scanner or your subject teacher to log your attendance.
                  </p>
                  <div className="pt-1.5 mt-1 border-t border-amber-200/80 flex items-center gap-1.5 text-[10px] text-amber-900 font-semibold">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Physical PVC ID cards are printed and issued exclusively by the School Admin & Registrar.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (6 cols): Quick Portal Actions, Enrolled Subjects & Campus Reminders */}
        <div className="xl:col-span-6 space-y-5 sm:space-y-6">
          {/* Quick Academic Modules */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3.5 sm:p-6 shadow-xs space-y-3.5 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Student Portal Shortcuts
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400">
                  Direct access to your academic records and school services
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <Link
                to="/student/schedule"
                className="flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/60 p-2.5 sm:p-3.5 hover:border-[#1B2A4A] hover:bg-white hover:shadow-xs transition-all group"
              >
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-blue-100 text-blue-700 shrink-0 group-hover:scale-105 transition-transform">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-slate-900 block truncate">
                    Schedule
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Class Timetable
                  </span>
                </div>
              </Link>

              <Link
                to="/student/grades"
                className="flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/60 p-2.5 sm:p-3.5 hover:border-[#1B2A4A] hover:bg-white hover:shadow-xs transition-all group"
              >
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-amber-100 text-amber-700 shrink-0 group-hover:scale-105 transition-transform">
                  <Award className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-slate-900 block truncate">
                    Report Card
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Quarterly Grades
                  </span>
                </div>
              </Link>

              <Link
                to="/student/attendance"
                className="flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/60 p-2.5 sm:p-3.5 hover:border-[#1B2A4A] hover:bg-white hover:shadow-xs transition-all group"
              >
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-purple-100 text-purple-700 shrink-0 group-hover:scale-105 transition-transform">
                  <UserCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-slate-900 block truncate">
                    Attendance
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Daily QR Logs
                  </span>
                </div>
              </Link>

              <Link
                to="/student/requirements"
                className="flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/60 p-2.5 sm:p-3.5 hover:border-[#1B2A4A] hover:bg-white hover:shadow-xs transition-all group"
              >
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-700 shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-slate-900 block truncate">
                    Requirements
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    SF9, PSA & Moral
                  </span>
                </div>
              </Link>

              <Link
                to="/student/assessments"
                className="flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/60 p-2.5 sm:p-3.5 hover:border-[#1B2A4A] hover:bg-white hover:shadow-xs transition-all group"
              >
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-sky-100 text-sky-700 shrink-0 group-hover:scale-105 transition-transform">
                  <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-slate-900 block truncate">
                    Assessments
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Exams & Tasks
                  </span>
                </div>
              </Link>

              <Link
                to="/student/enrollment"
                className="flex items-center gap-2.5 sm:gap-3 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/60 p-2.5 sm:p-3.5 hover:border-[#1B2A4A] hover:bg-white hover:shadow-xs transition-all group"
              >
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-rose-100 text-rose-700 shrink-0 group-hover:scale-105 transition-transform">
                  <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-slate-900 block truncate">
                      Enrollment
                    </span>
                    {!isEnrollmentOpen && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-rose-100 text-rose-700 uppercase">
                        Closed
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Registration Info
                  </span>
                </div>
              </Link>
            </div>
          </div>

          {/* Current Enrolled Subjects Card */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3.5 sm:p-6 shadow-xs space-y-3.5 sm:space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 sm:pb-3.5">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 shrink-0">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Enrolled Subjects ({strand})
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">
                    1st Semester · S.Y. {schoolYear}
                  </p>
                </div>
              </div>
              <Link
                to="/student/schedule"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#1B2A4A] hover:underline shrink-0"
              >
                Full Schedule <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {subjects.map((s) => {
                const subTitle = s.title || s.name || 'Subject';
                const gradeInfo =
                  subjectGradesMap[s.id] ||
                  (s.code ? subjectGradesMap[s.code] : undefined) ||
                  subjectGradesMap[subTitle.toLowerCase()];

                return (
                  <div
                    key={s.id}
                    className="py-2.5 sm:py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{subTitle}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-emerald-700 font-bold">
                          {s.code}
                        </span>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {s.semester || '1st Semester'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {gradeInfo ? (
                        <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold text-emerald-800">
                          Grade: {gradeInfo.grade} · {gradeInfo.term}
                        </span>
                      ) : (
                        <span className="rounded-lg bg-slate-100 border border-slate-200/70 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold text-slate-700">
                          {s.units || 3}.0 Units
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Institutional Reminder Card */}
          <div className="rounded-2xl sm:rounded-3xl border border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-orange-50/50 p-3.5 sm:p-5 shadow-xs flex items-start gap-3">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg sm:rounded-xl bg-amber-400/25 text-amber-800 shrink-0 mt-0.5">
              <Bell className="h-4 w-4" />
            </div>
            <div className="space-y-1 text-xs">
              <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                Campus Gate & QR Attendance Reminder
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Always wear your official PLSNHS Student ID within school premises and scan your QR code upon gate entry. Ensure all 4 documentary requirements (SF9, PSA, Good Moral, 2×2 Photo) are verified by the Registrar.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Emergency Attendance QR Pass Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Emergency Gate Attendance Pass"
        subtitle={`${fullName} · LRN: ${lrn}`}
        maxWidth="md"
      >
        <div className="flex flex-col items-center text-center space-y-4 py-2">
          <div className="bg-gradient-to-br from-[#0c1833] via-[#152e69] to-[#1e3a8a] text-white p-5 rounded-3xl w-full flex flex-col items-center shadow-lg border border-slate-700/50">
            <div className="flex items-center gap-2 mb-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                Official Turnstile & Classroom Scanner Pass
              </span>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-xl border-4 border-amber-300">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="Student Attendance Pass QR Code"
                  className="w-64 h-64 sm:w-72 sm:h-72 object-contain"
                />
              )}
            </div>

            <div className="mt-4 space-y-1">
              <h3 className="text-lg font-black text-white">{fullName}</h3>
              <p className="font-mono text-sm font-bold text-amber-300 tracking-wider">
                LRN: {lrn}
              </p>
              <p className="text-xs text-blue-200">
                {gradeLevel} · {strand} ({section})
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-left w-full text-xs space-y-1">
            <p className="font-bold text-slate-800">Scanner Instructions:</p>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Hold your screen 4 to 6 inches away from the campus turnstile barcode scanner or present to your teacher or gate officer to log attendance.
            </p>
          </div>

          <div className="flex items-center justify-end w-full pt-1">
            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Close Pass
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
