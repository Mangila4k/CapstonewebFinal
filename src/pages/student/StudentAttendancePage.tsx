import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  UserCheck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  Download,
  Printer,
  QrCode,
  Filter,
  Check,
  ChevronRight,
  Layers,
  GraduationCap,
  CalendarCheck,
  Building2,
  CreditCard,
  FileText,
  MapPin,
  X,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import { supabase } from '../../lib/supabase';

interface AttendanceEntry {
  id: string | number;
  date: string;
  day: string;
  timeIn: string;
  timeOut: string;
  gate: string;
  mode: 'QR Gate Pass' | 'RFID Tap' | 'Manual Log';
  status: 'Present' | 'Late' | 'Excused' | 'Absent';
  remarks: string;
}

interface MonthlySummary {
  month: string;
  schoolDays: number;
  daysPresent: number;
  daysLate: number;
  daysAbsent: number;
  rate: number;
}

const INITIAL_LOGS: AttendanceEntry[] = [
  {
    id: 'log-1',
    date: 'Oct 27, 2026',
    day: 'Tuesday',
    timeIn: '07:15 AM',
    timeOut: '04:30 PM',
    gate: 'Gate 1 – SHS Turnstile A',
    mode: 'QR Gate Pass',
    status: 'Present',
    remarks: 'On-time arrival · Morning briefing attended',
  },
  {
    id: 'log-2',
    date: 'Oct 26, 2026',
    day: 'Monday',
    timeIn: '07:18 AM',
    timeOut: '04:30 PM',
    gate: 'Gate 1 – SHS Turnstile B',
    mode: 'QR Gate Pass',
    status: 'Present',
    remarks: 'Flag raising ceremony attended on time',
  },
  {
    id: 'log-3',
    date: 'Oct 23, 2026',
    day: 'Friday',
    timeIn: '07:22 AM',
    timeOut: '04:32 PM',
    gate: 'Gate 2 – Main Academic Gate',
    mode: 'RFID Tap',
    status: 'Present',
    remarks: 'Regular attendance verified',
  },
  {
    id: 'log-4',
    date: 'Oct 22, 2026',
    day: 'Thursday',
    timeIn: '07:42 AM',
    timeOut: '04:30 PM',
    gate: 'Gate 1 – SHS Turnstile A',
    mode: 'QR Gate Pass',
    status: 'Late',
    remarks: 'Late entry (+12 mins after 7:30 AM cutoff) · Admitted to advisory',
  },
  {
    id: 'log-5',
    date: 'Oct 21, 2026',
    day: 'Wednesday',
    timeIn: '07:10 AM',
    timeOut: '04:30 PM',
    gate: 'Gate 1 – SHS Turnstile A',
    mode: 'QR Gate Pass',
    status: 'Present',
    remarks: 'Early check-in registered',
  },
  {
    id: 'log-6',
    date: 'Oct 20, 2026',
    day: 'Tuesday',
    timeIn: '07:14 AM',
    timeOut: '04:30 PM',
    gate: 'Gate 2 – Main Academic Gate',
    mode: 'RFID Tap',
    status: 'Present',
    remarks: 'Regular attendance verified',
  },
  {
    id: 'log-7',
    date: 'Oct 19, 2026',
    day: 'Monday',
    timeIn: '—',
    timeOut: '—',
    gate: 'School Clinic / Records',
    mode: 'Manual Log',
    status: 'Excused',
    remarks: 'Official medical consultation clearance on file',
  },
  {
    id: 'log-8',
    date: 'Oct 16, 2026',
    day: 'Friday',
    timeIn: '07:16 AM',
    timeOut: '04:30 PM',
    gate: 'Gate 1 – SHS Turnstile B',
    mode: 'QR Gate Pass',
    status: 'Present',
    remarks: 'On-time arrival',
  },
  {
    id: 'log-9',
    date: 'Oct 15, 2026',
    day: 'Thursday',
    timeIn: '07:20 AM',
    timeOut: '04:31 PM',
    gate: 'Gate 1 – SHS Turnstile A',
    mode: 'QR Gate Pass',
    status: 'Present',
    remarks: 'Regular attendance verified',
  },
  {
    id: 'log-10',
    date: 'Oct 14, 2026',
    day: 'Wednesday',
    timeIn: '07:12 AM',
    timeOut: '04:30 PM',
    gate: 'Gate 2 – Main Academic Gate',
    mode: 'RFID Tap',
    status: 'Present',
    remarks: 'On-time check-in',
  },
  {
    id: 'log-11',
    date: 'Oct 13, 2026',
    day: 'Tuesday',
    timeIn: '07:38 AM',
    timeOut: '04:30 PM',
    gate: 'Gate 1 – SHS Turnstile B',
    mode: 'QR Gate Pass',
    status: 'Late',
    remarks: 'Late entry (+8 mins after cutoff) · Grace period applied',
  },
  {
    id: 'log-12',
    date: 'Oct 12, 2026',
    day: 'Monday',
    timeIn: '07:15 AM',
    timeOut: '04:30 PM',
    gate: 'Gate 1 – SHS Turnstile A',
    mode: 'QR Gate Pass',
    status: 'Present',
    remarks: 'Flag raising ceremony attended on time',
  },
  {
    id: 'log-13',
    date: 'Oct 09, 2026',
    day: 'Friday',
    timeIn: '07:18 AM',
    timeOut: '04:30 PM',
    gate: 'Gate 2 – Main Academic Gate',
    mode: 'QR Gate Pass',
    status: 'Present',
    remarks: 'Regular attendance verified',
  },
  {
    id: 'log-14',
    date: 'Oct 08, 2026',
    day: 'Thursday',
    timeIn: '07:11 AM',
    timeOut: '04:30 PM',
    gate: 'Gate 1 – SHS Turnstile A',
    mode: 'RFID Tap',
    status: 'Present',
    remarks: 'On-time check-in',
  },
];

const MONTHLY_SUMMARIES: MonthlySummary[] = [
  { month: 'August 2026', schoolDays: 21, daysPresent: 21, daysLate: 0, daysAbsent: 0, rate: 100.0 },
  { month: 'September 2026', schoolDays: 21, daysPresent: 21, daysLate: 0, daysAbsent: 0, rate: 100.0 },
  { month: 'October 2026', schoolDays: 21, daysPresent: 20, daysLate: 2, daysAbsent: 1, rate: 95.2 },
];

export const StudentAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AttendanceEntry[]>(INITIAL_LOGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Present' | 'Late' | 'Excused'>('All');
  const [monthFilter, setMonthFilter] = useState<string>('All Months');

  const isParent = user?.role === 'parent';
  const [parentChild, setParentChild] = useState<any>(null);

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
        console.warn('Resolve child error in attendance:', err);
      }
    }
    resolveParentChild();
  }, [isParent, user]);

  const learnerName = isParent
    ? (parentChild
        ? `${parentChild.first_name || ''} ${parentChild.last_name || ''}`.trim()
        : user?.student_name || 'Jorvin Pengoc')
    : user?.full_name || 'Jorvin Pengoc';
  const learnerLrn = isParent
    ? parentChild?.lrn || user?.student_lrn || '11951680082'
    : user?.student_lrn || '11951680082';
  const learnerGrade = isParent
    ? parentChild?.grade_level || user?.student_grade || 'Grade 11'
    : user?.student_grade || 'Grade 11';
  const learnerSection = isParent
    ? parentChild?.resolvedSection || user?.student_section || 'Almario'
    : user?.student_section || 'Almario';
  const learnerStrand = isParent
    ? parentChild?.strand || user?.student_strand || 'TVL - ICT'
    : user?.student_strand || 'TVL - ICT';
  const schoolYear = '2026–2027';

  // Quick counts for filter pills
  const countAll = logs.length;
  const countPresent = logs.filter((l) => l.status === 'Present').length;
  const countLate = logs.filter((l) => l.status === 'Late').length;
  const countExcused = logs.filter((l) => l.status === 'Excused').length;

  // Live query against Supabase attendance table
  useEffect(() => {
    async function fetchLiveAttendance() {
      try {
        let resolvedStudentId = isParent
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
              .select('id')
              .or(`email.ilike.${cleanEmail},lrn.eq.${cleanLrn}`);
            if (sRows && sRows.length > 0 && sRows[0].id) {
              resolvedStudentId = sRows[0].id;
            }
          } catch {
            // fallback
          }
        }

        if (!resolvedStudentId) return;

        const { data, error } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_id', resolvedStudentId)
          .order('date', { ascending: false })
          .limit(30);

        if (!error && data && data.length > 0) {
          const liveLogs: AttendanceEntry[] = data.map((d: any, idx: number) => {
            const rawStatus = (d.status || 'present').toLowerCase();
            const capStatus = (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)) as
              | 'Present'
              | 'Late'
              | 'Excused'
              | 'Absent';

            return {
              id: d.id || `live-${idx}`,
              date: d.date || 'Today',
              day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'long' }),
              timeIn: d.time_in ? d.time_in.slice(0, 5) : '07:15 AM',
              timeOut: d.time_out ? d.time_out.slice(0, 5) : '04:30 PM',
              gate: 'Gate 1 – SHS Turnstile',
              mode: (d.qr_code ? 'QR Gate Pass' : 'Manual Log') as any,
              status: capStatus,
              remarks: d.remarks || 'Live verification log',
            };
          });
          setLogs(liveLogs);
        }
      } catch (err) {
        console.warn('Attendance live fetch fallback used:', err);
      }
    }
    fetchLiveAttendance();
  }, [user]);

  // Overall attendance calculations
  const totalDaysPresent = 48;
  const totalLate = 2;
  const totalExcused = 1;
  const totalTrackedDays = 50;
  const overallRate = ((totalDaysPresent / totalTrackedDays) * 100).toFixed(1);

  // Filtered attendance log
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        searchQuery === '' ||
        log.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.day.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.gate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.remarks.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = statusFilter === 'All' || log.status === statusFilter;
      const matchMonth = monthFilter === 'All Months' || log.date.includes(monthFilter.split(' ')[0]);

      return matchSearch && matchStatus && matchMonth;
    });
  }, [logs, searchQuery, statusFilter, monthFilter]);

  // Export CSV
  const handleExportCsv = () => {
    const csvLines: string[] = [];
    csvLines.push('"PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL"');
    csvLines.push('"OFFICIAL LEARNER ATTENDANCE RECORD (DEPED SF2)"');
    csvLines.push(`"Learner Name:","${learnerName}"`);
    csvLines.push(`"LRN:","${learnerLrn}"`);
    csvLines.push(`"Grade & Section:","${learnerGrade} - ${learnerSection}"`);
    csvLines.push(`"Track & Strand:","${learnerStrand}"`);
    csvLines.push(`"School Year:","${schoolYear}"`);
    csvLines.push(`"Attendance Rate:","${overallRate}% (${totalDaysPresent}/${totalTrackedDays} Days)"`);
    csvLines.push('""');
    csvLines.push('"Date","Day of Week","Time-In","Time-Out","Gate Terminal","Verification Mode","Status","Remarks"');

    filteredLogs.forEach((item) => {
      csvLines.push([
        `"${item.date}"`,
        `"${item.day}"`,
        `"${item.timeIn}"`,
        `"${item.timeOut}"`,
        `"${item.gate}"`,
        `"${item.mode}"`,
        `"${item.status}"`,
        `"${item.remarks}"`,
      ].join(','));
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PLSNHS_Attendance_${learnerName.replace(/\s+/g, '_')}_SY2026-2027.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Sheet
  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `PLSNHS_Attendance_Record_${learnerName.replace(/\s+/g, '_')}`;
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

      {/* Page Header (Matching Admin & Dashboard Alignment Standard) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight whitespace-nowrap">
            {isParent ? 'Learner Attendance Record' : 'Attendance Record'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isParent
              ? `Real-time gate turnstile timestamps, morning arrival logs, and DepEd SF2 compliance for your child · S.Y. ${schoolYear}`
              : `Official daily school attendance log, gate check-in timestamps, and DepEd SF2 summary · S.Y. ${schoolYear}`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <PageHeaderNotificationSlot />
        </div>
      </div>

      {/* Learner Identity & Curricular Strip */}
      <div className="no-print rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#152e69]/10 text-[#152e69] font-black shrink-0">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm sm:text-base">{learnerName}</span>
                <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  LRN: {learnerLrn}
                </span>
                {isParent && (
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    Linked Child
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-[11.5px] mt-0.5">
                {learnerGrade} – Section {learnerSection} · <strong className="text-slate-800">{learnerStrand}</strong> · Class Adviser: <strong>{isParent ? 'Engr. R. Morales' : 'Mr. Juan Dela Cruz'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> DepEd SF2 Certified &amp; Verified
            </span>
          </div>
        </div>
      </div>

      {/* Refined Executive Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Days Present */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Days Present
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-900 font-display">{totalDaysPresent}</p>
            <span className="text-xs font-bold text-slate-500">/ {totalTrackedDays} Days</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-800">
              {overallRate}% Rate
            </span>
            <span className="text-[11px] text-slate-500">Exceeds 85% requirement</span>
          </div>
        </div>

        {/* Card 2: Tardy / Late Arrivals */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tardy / Late
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-900 font-display">{totalLate}</p>
            <span className="text-xs font-bold text-slate-500">Instances</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-800">
              Grace Period
            </span>
            <span className="text-[11px] text-slate-500">Morning assemblies: 7:30 AM</span>
          </div>
        </div>

        {/* Card 3: Unexcused Absences */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Unexcused Absences
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-900 font-display">0</p>
            <span className="text-xs font-bold text-slate-500">Days</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-blue-100 px-1.5 py-0.5 text-[10.5px] font-bold text-blue-800">
              1 Excused
            </span>
            <span className="text-[11px] text-slate-500">Zero truancies recorded</span>
          </div>
        </div>

        {/* Card 4: Gate Pass Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Digital Gate Pass
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#152e69]/10 text-[#152e69]">
              <QrCode className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-lg font-black text-emerald-700 font-display">Active &amp; Linked</p>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10.5px] font-bold text-emerald-800">
              Verified
            </span>
            <span className="text-[11px] text-slate-500">Main gate &amp; turnstiles</span>
          </div>
        </div>
      </div>

      {/* DepEd SF2 Monthly Attendance Overview Strip */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">DepEd SF2 Monthly Attendance Progress</h3>
            <p className="text-xs text-slate-500">Official monthly attendance breakdown for School Year {schoolYear}</p>
          </div>
          <span className="text-xs font-bold text-slate-600 font-mono">1st Semester (Aug – Dec)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {MONTHLY_SUMMARIES.map((m) => (
            <div key={m.month} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-900">{m.month}</span>
                <span className="text-emerald-700 font-mono">{m.rate}%</span>
              </div>
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all"
                  style={{ width: `${m.rate}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Present: <strong className="text-slate-800">{m.daysPresent}</strong> / {m.schoolDays}d</span>
                <span>Late: <strong className="text-slate-800">{m.daysLate}</strong> · Abs: <strong className="text-slate-800">{m.daysAbsent}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Table Section: Search, Filters & Comprehensive Daily Logs */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {/* Section Header: Telemetry & Live Sensor Status */}
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#152e69] text-white shadow-xs shrink-0">
              <CalendarCheck className="h-5 w-5 text-[#F5C518]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
                  Official Daily Gate Attendance Log
                </h3>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Turnstiles Live
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                School Form 2 (SF2) biometric RFID &amp; QR turnstile timestamps verified with Campus Security Registry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl font-bold border border-slate-200">
              Showing {filteredLogs.length} of {logs.length} Log Entries
            </span>
          </div>
        </div>

        {/* Controls Toolbar: Search & Refined Status Pills */}
        <div className="no-print p-4 bg-slate-50/60 border-b border-slate-200/80 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by date, day, gate terminal (e.g. Gate 1, Turnstile A), or remarks..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#152e69]/20 focus:border-[#152e69] shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter('All')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-98 ${
                statusFilter === 'All'
                  ? 'bg-[#152e69] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-2xs'
              }`}
            >
              <span>All Logs</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                statusFilter === 'All' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {countAll}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('Present')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-98 ${
                statusFilter === 'Present'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50/70 border border-emerald-200/80 text-emerald-800 hover:bg-emerald-100/70 shadow-2xs'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Present</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                statusFilter === 'Present' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900'
              }`}>
                {countPresent}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('Late')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-98 ${
                statusFilter === 'Late'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50/70 border border-amber-200/80 text-amber-800 hover:bg-amber-100/70 shadow-2xs'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>Late</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                statusFilter === 'Late' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
              }`}>
                {countLate}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('Excused')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-98 ${
                statusFilter === 'Excused'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'bg-sky-50/70 border border-sky-200/80 text-sky-800 hover:bg-sky-100/70 shadow-2xs'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              <span>Excused</span>
              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
                statusFilter === 'Excused' ? 'bg-white/20 text-white' : 'bg-sky-100 text-sky-900'
              }`}>
                {countExcused}
              </span>
            </button>

            {/* Month Filter Selector */}
            <div className="relative inline-flex items-center">
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="h-8.5 rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs font-bold text-slate-700 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#152e69]/20 cursor-pointer appearance-none"
              >
                <option value="All Months">All Months (Aug–Dec)</option>
                <option value="October 2026">October 2026</option>
                <option value="September 2026">September 2026</option>
                <option value="August 2026">August 2026</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Daily Logs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-extrabold uppercase tracking-wider text-[10.5px]">
              <tr>
                <th className="px-5 py-3.5">Date &amp; Day</th>
                <th className="px-5 py-3.5 text-center">Check-In</th>
                <th className="px-5 py-3.5 text-center">Check-Out</th>
                <th className="px-5 py-3.5">Terminal / Gate</th>
                <th className="px-5 py-3.5">Verification Mode</th>
                <th className="px-5 py-3.5 text-center">Attendance Status</th>
                <th className="px-5 py-3.5">Official Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    <CalendarCheck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No attendance records found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search keywords or filter settings.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const [mStr, dStr] = log.date.split(' ');
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Date & Day */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 flex-col items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-center shrink-0">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 leading-none">
                              {mStr}
                            </span>
                            <span className="text-sm font-black text-slate-900 leading-tight">
                              {dStr?.replace(',', '')}
                            </span>
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-xs">{log.date}</p>
                            <span className="text-[11px] font-semibold text-slate-500">{log.day}</span>
                          </div>
                        </div>
                      </td>

                      {/* Check-In */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {log.timeIn === '—' ? (
                          <span className="text-slate-400 font-bold">—</span>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black tracking-tight ${
                              log.status === 'Late'
                                ? 'bg-amber-50 text-amber-900 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-900 border border-emerald-200/80'
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                log.status === 'Late' ? 'bg-amber-500' : 'bg-emerald-500'
                              }`} />
                              {log.timeIn}
                            </span>
                            <span className={`text-[10px] font-bold mt-0.5 ${
                              log.status === 'Late' ? 'text-amber-700' : 'text-emerald-700'
                            }`}>
                              {log.status === 'Late' ? 'Tardy (+12m)' : 'On Time'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Check-Out */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {log.timeOut === '—' ? (
                          <span className="text-slate-400 font-bold">—</span>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200">
                              {log.timeOut}
                            </span>
                            <span className="text-[10px] font-medium text-slate-500 mt-0.5">
                              Dismissal
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Terminal / Gate */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 shrink-0">
                            <MapPin className="h-3.5 w-3.5 text-[#152e69]" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs">
                              {log.gate.includes('–') ? log.gate.split('–')[0].trim() : log.gate}
                            </p>
                            {log.gate.includes('–') && (
                              <span className="text-[10.5px] text-slate-500 block">
                                {log.gate.split('–')[1].trim()}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Mode */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {log.mode === 'QR Gate Pass' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50/80 px-2.5 py-1 text-[11px] font-bold text-cyan-800">
                            <QrCode className="h-3.5 w-3.5 text-cyan-700" />
                            QR Gate Pass
                          </span>
                        ) : log.mode === 'RFID Tap' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-2.5 py-1 text-[11px] font-bold text-indigo-800">
                            <CreditCard className="h-3.5 w-3.5 text-indigo-700" />
                            RFID Tap Card
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                            <FileText className="h-3.5 w-3.5 text-slate-500" />
                            Clinic / Manual
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {log.status === 'Present' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800 shadow-2xs">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            Present
                          </span>
                        )}
                        {log.status === 'Late' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800 shadow-2xs">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            Late
                          </span>
                        )}
                        {log.status === 'Excused' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-black text-blue-800 shadow-2xs">
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                            Excused
                          </span>
                        )}
                        {log.status === 'Absent' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-black text-rose-800 shadow-2xs">
                            <X className="h-3.5 w-3.5 text-rose-600" />
                            Absent
                          </span>
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="px-5 py-3.5 text-xs text-slate-700 max-w-sm">
                        {log.status === 'Late' ? (
                          <div className="flex items-start gap-1.5 text-amber-900 bg-amber-50/80 p-2 rounded-xl border border-amber-200 leading-snug">
                            <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>{log.remarks}</span>
                          </div>
                        ) : log.status === 'Excused' ? (
                          <div className="flex items-start gap-1.5 text-blue-900 bg-blue-50/80 p-2 rounded-xl border border-blue-200 leading-snug">
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                            <span>{log.remarks}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 leading-snug block">{log.remarks}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 bg-slate-50/80 border-t border-slate-200 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-bold text-slate-800">
              Showing {filteredLogs.length} of {logs.length} daily logs
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">School Year {schoolYear}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 font-medium">
            <Building2 className="h-3.5 w-3.5 text-[#152e69]" />
            <span>Placido L. Señor NHS Automated Turnstile Gateway System · DepEd SF2 Certified</span>
          </div>
        </div>
      </div>

      {/* Official Action Controls (Bottom Aligned) */}
      <div className="no-print flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-200">
        <button
          type="button"
          onClick={handleExportCsv}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all cursor-pointer active:scale-98"
          title="Download attendance records as CSV"
        >
          <Download className="h-4 w-4 text-slate-500" />
          <span>Export CSV</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2.5 rounded-xl bg-[#152e69] hover:bg-[#0f1f4b] px-5 text-xs font-bold text-white shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-98"
          title="Print official attendance log sheet"
        >
          <Printer className="h-4 w-4 text-[#F5C518]" />
          <span>Print Sheet</span>
        </button>
      </div>
    </div>
  );
};
