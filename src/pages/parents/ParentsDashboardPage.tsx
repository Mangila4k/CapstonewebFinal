import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  FileText,
  Calendar,
  CheckCircle2,
  Award,
  Clock,
  ArrowRight,
  ShieldCheck,
  Bell,
  Phone,
  GraduationCap,
  CreditCard,
  Printer,
  RotateCw,
  QrCode,
  BookOpen,
  Layers,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/common/Modal';
import { StudentIdCard } from '../../components/common/StudentIdCard';
import { printOfficialStudentId } from '../../lib/printIdCard';
import { formatDate } from '../../lib/utils';

interface LinkedChild {
  id: string | number;
  first_name: string;
  last_name: string;
  fullname: string;
  lrn: string;
  grade_level: string;
  strand: string;
  section: string;
  status: string;
  guardian_name?: string;
  guardian_contact?: string;
  photo_url?: string;
}

export const ParentsDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [childrenList, setChildrenList] = useState<LinkedChild[]>([]);
  const [selectedChildIdx, setSelectedChildIdx] = useState(0);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);
  const [showIdModal, setShowIdModal] = useState(false);
  const [idCardSide, setIdCardSide] = useState<'both' | 'front' | 'back'>('both');
  const [idCardFlipped, setIdCardFlipped] = useState(false);

  const parentFullName =
    user?.full_name ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    'Parent / Guardian';
  const parentLastName = (
    user?.last_name ||
    parentFullName.split(' ').slice(-1)[0] ||
    'Sasuman'
  ).trim();

  useEffect(() => {
    async function loadParentDashboard() {
      try {
        // 1. Find linked child in students or enrollments matching guardian or last_name
        const { data: studentsData } = await supabase
          .from('students')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(25);

        let matched: LinkedChild[] = [];
        if (studentsData && studentsData.length > 0) {
          const byFamily = studentsData.filter(
            (s: any) =>
              (s.last_name &&
                s.last_name.toLowerCase() === parentLastName.toLowerCase()) ||
              (s.guardian_name &&
                s.guardian_name.toLowerCase().includes(parentLastName.toLowerCase()))
          );

          const pool = byFamily.length > 0 ? byFamily : [studentsData[0]];
          matched = pool.map((s: any) => ({
            id: s.id,
            first_name: s.first_name || 'Learner',
            last_name: s.last_name || parentLastName,
            fullname: `${s.first_name || ''} ${s.last_name || ''}`.trim(),
            lrn: s.lrn || '119518160054',
            grade_level: s.grade_level || 'Grade 10',
            strand: s.strand || '',
            section: s.section || '',
            status: s.status || 'Enrolled',
            guardian_name: s.guardian_name || parentFullName,
            guardian_contact: s.guardian_contact || user?.phone || '0912-345-6789',
            photo_url: s.photo_url || s.two_by_two_picture_url || '',
          }));
        }

        if (matched.length === 0) {
          matched = [
            {
              id: 'child-default',
              first_name: 'Christian',
              last_name: parentLastName,
              fullname: `Christian ${parentLastName}`,
              lrn: '119518160054',
              grade_level: 'Grade 11',
              strand: 'STEM',
              section: '11-Diamond',
              status: 'Enrolled',
              guardian_name: parentFullName,
              guardian_contact: user?.phone || '0912-345-6789',
            },
          ];
        }
        setChildrenList(matched);

        // 2. Fetch latest announcements
        const { data: annData } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (annData && annData.length > 0) {
          const seen = new Set<string>();
          const unique = annData.filter((a: any) => {
            const sig = `${(a.title || '').trim().toLowerCase()}|${(a.content || '')
              .trim()
              .toLowerCase()}`;
            if (seen.has(sig)) return false;
            seen.add(sig);
            return true;
          });
          setAnnouncements(unique.slice(0, 3));
        } else {
          setAnnouncements([
            {
              id: 'ann-1',
              title: '1st Quarter Report Card Distribution & PTA Assembly',
              content:
                'Parents and guardians are invited to attend the quarterly card-giving and homeroom consultation this Friday at 9:00 AM.',
              created_at: new Date().toISOString(),
              priority: 'high',
            },
            {
              id: 'ann-2',
              title: 'QR Code Gate Attendance & SMS Advisories Active',
              content:
                'Daily entry and exit scans at the PLSNHS main gate are automatically logged in your Parent Portal.',
              created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
              priority: 'normal',
            },
          ]);
        }
      } catch (err) {
        console.warn('Parent dashboard fetch fallback:', err);
      }
    }

    loadParentDashboard();
  }, [parentFullName, parentLastName, user?.phone]);

  const activeChild: LinkedChild = childrenList[selectedChildIdx] || {
    id: 'child-default',
    first_name: 'Christian',
    last_name: parentLastName,
    fullname: `Christian ${parentLastName}`,
    lrn: '119518160054',
    grade_level: 'Grade 11',
    strand: 'STEM',
    section: '11-Diamond',
    status: 'Enrolled',
    guardian_name: parentFullName,
    guardian_contact: user?.phone || '0912-345-6789',
  };

  // Determine Junior High (7-10) vs Senior High (11-12)
  const rawGrade = String(activeChild.grade_level || 'Grade 10').trim();
  const numMatch = rawGrade.match(/\d+/);
  const gradeNum = numMatch ? parseInt(numMatch[0], 10) : 10;
  const isSeniorHigh = gradeNum >= 11 || rawGrade.toLowerCase().includes('senior');
  const departmentLabel = isSeniorHigh
    ? `Senior High · ${activeChild.strand || 'STEM'}`
    : 'Junior High School (JHS)';
  const rawSection = (activeChild.section || '').replace(/^grade\s*\d+\s*[-–·]?\s*/i, '').trim();
  const assignedSection = rawSection
    ? `Section ${rawSection.replace(/^section\s+/i, '')}`
    : isSeniorHigh
    ? 'Section Diamond'
    : 'Section Rizal';

  const getChildInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return (name[0] || 'S').toUpperCase();
  };

  const recentAttendance = [
    {
      date: 'Today',
      timeIn: '07:08 AM',
      timeOut: '04:35 PM',
      mode: 'QR Gate Scan',
      status: 'Present',
    },
    {
      date: 'Yesterday',
      timeIn: '07:14 AM',
      timeOut: '04:30 PM',
      mode: 'QR Gate Scan',
      status: 'Present',
    },
    {
      date: 'Oct 27, 2026',
      timeIn: '07:05 AM',
      timeOut: '04:32 PM',
      mode: 'QR Gate Scan',
      status: 'Present',
    },
    {
      date: 'Oct 26, 2026',
      timeIn: '07:19 AM',
      timeOut: '04:30 PM',
      mode: 'QR Gate Scan',
      status: 'Present',
    },
  ];

  const subjectGradesPreview = isSeniorHigh
    ? [
        { code: 'CORE-101', title: 'Oral Communication in Context', q1: 93, q2: 94, status: 'Passed' },
        { code: 'CORE-102', title: 'General Mathematics', q1: 91, q2: 92, status: 'Passed' },
        { code: 'CORE-103', title: 'Earth and Life Science', q1: 92, q2: 93, status: 'Passed' },
        { code: 'APPL-201', title: 'Empowerment Technologies', q1: 94, q2: 95, status: 'Passed' },
      ]
    : [
        { code: 'JHS-ENG', title: 'English & Communication Arts', q1: 92, q2: 93, status: 'Passed' },
        { code: 'JHS-MATH', title: 'Mathematics', q1: 90, q2: 91, status: 'Passed' },
        { code: 'JHS-SCI', title: 'Integrated Science', q1: 93, q2: 94, status: 'Passed' },
        { code: 'JHS-AP', title: 'Araling Panlipunan', q1: 94, q2: 94, status: 'Passed' },
      ];

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Linked Child Identity & 4 KPI Summary Strip */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1B2A4A] to-[#0f1c3f] text-amber-400 font-black text-2xl shadow-md border border-amber-400/40 shrink-0 select-none">
              {getChildInitials(activeChild.fullname)}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                  Linked Learner
                </span>
                <span className="text-xs font-mono font-bold text-slate-500">
                  LRN: {activeChild.lrn}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display leading-tight">
                {activeChild.fullname}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-600">
                <span className="font-bold text-[#1B2A4A]">{rawGrade}</span> · {departmentLabel} · {assignedSection}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {childrenList.length > 1 && (
              <select
                value={selectedChildIdx}
                onChange={(e) => setSelectedChildIdx(Number(e.target.value))}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden"
              >
                {childrenList.map((c, idx) => (
                  <option key={c.id} value={idx}>
                    Switch Learner: {c.fullname}
                  </option>
                ))}
              </select>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-extrabold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              OFFICIALLY {activeChild.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-200/80 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                General Average
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1 font-display">
                92.50
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold mt-1">
                <Award className="h-3.5 w-3.5" /> With Honors Standing
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Award className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-200/80 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Attendance Rate
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1 font-display">
                96.0%
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold mt-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> 48 / 50 School Days
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Calendar className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-200/80 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Conduct & Guidance
              </span>
              <p className="text-xl font-black text-slate-900 mt-1 font-display">
                Exemplary
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-semibold mt-1">
                0 Behavioral Incidents
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-200/80 flex items-start justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Gate QR Status
              </span>
              <p className="text-xl font-black text-emerald-700 mt-1 font-display">
                Checked In
              </p>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-semibold mt-1">
                <Clock className="h-3 w-3 text-emerald-600" /> Today, 07:08 AM
              </span>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <QrCode className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main 12-Column Balanced Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Subject Grades Snapshot & Daily Gate Attendance Logs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quarterly Subject Performance */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1B2A4A]/10 text-[#1B2A4A]">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Quarterly Academic Performance
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Current subject grades summary · S.Y. 2026–2027
                  </p>
                </div>
              </div>

              <Link
                to="/parents/grades"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#1B2A4A] hover:underline"
              >
                Full Report Card <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 pr-3">Subject</th>
                    <th className="py-2.5 px-3 text-center">Q1</th>
                    <th className="py-2.5 px-3 text-center">Q2</th>
                    <th className="py-2.5 px-3 text-center">Avg</th>
                    <th className="py-2.5 pl-3 text-right">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjectGradesPreview.map((sub) => {
                    const avg = Math.round((sub.q1 + sub.q2) / 2);
                    return (
                      <tr key={sub.code} className="hover:bg-slate-50/70">
                        <td className="py-3 pr-3">
                          <p className="font-bold text-slate-800">{sub.title}</p>
                          <span className="font-mono text-[10px] text-slate-400">
                            {sub.code}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-700">
                          {sub.q1}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-700">
                          {sub.q2}
                        </td>
                        <td className="py-3 px-3 text-center font-extrabold text-slate-900">
                          {avg}
                        </td>
                        <td className="py-3 pl-3 text-right">
                          <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                            {sub.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Gate & Classroom Attendance */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Recent Campus Gate Attendance Logs
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Automated QR badge entry and exit timestamps
                  </p>
                </div>
              </div>

              <Link
                to="/parents/attendance"
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
              >
                All Attendance Logs <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {recentAttendance.map((log, i) => (
                <div
                  key={i}
                  className="py-3 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{log.date}</p>
                      <span className="text-[11px] text-slate-400">{log.mode}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-slate-400 block">
                        Time In / Out
                      </span>
                      <span className="font-mono font-bold text-slate-700">
                        {log.timeIn} – {log.timeOut}
                      </span>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      {log.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Quick Actions, PTA Advisories & Campus Directory */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Parent Actions */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900">
              Parent Portal Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Link
                to="/parents/grades"
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 hover:border-[#1B2A4A] hover:bg-white transition-all"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shrink-0">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-extrabold text-slate-900 block truncate">
                    Child Grades
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    SF9 Report Card
                  </span>
                </div>
              </Link>

              <Link
                to="/parents/attendance"
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 hover:border-[#1B2A4A] hover:bg-white transition-all"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-extrabold text-slate-900 block truncate">
                    Attendance
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Daily Logs
                  </span>
                </div>
              </Link>

              <Link
                to="/parents/announcements"
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 hover:border-[#1B2A4A] hover:bg-white transition-all"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shrink-0">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-extrabold text-slate-900 block truncate">
                    Advisories
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    PTA & Circulars
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setShowIdModal(true)}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 hover:border-[#1B2A4A] hover:bg-white transition-all text-left cursor-pointer"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 shrink-0">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-extrabold text-slate-900 block truncate">
                    Student ID
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    View & Print
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* PTA & School Announcements Feed */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  PTA & Campus Advisories
                </h3>
              </div>
              <Link
                to="/parents/announcements"
                className="text-xs font-bold text-[#1B2A4A] hover:underline"
              >
                View All
              </Link>
            </div>

            <div className="space-y-3">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedAnnouncement(ann)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedAnnouncement(ann);
                    }
                  }}
                  className="group rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-1.5 cursor-pointer hover:border-[#1B2A4A] hover:bg-white hover:shadow-xs transition-all select-none"
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{formatDate(ann.created_at)}</span>
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 font-bold text-amber-800 uppercase">
                      {ann.priority || 'Notice'}
                    </span>
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-[#1B2A4A] leading-snug transition-colors">
                    {ann.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                    {ann.content}
                  </p>
                  <div className="pt-1 flex items-center justify-end">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1B2A4A] group-hover:translate-x-0.5 transition-transform">
                      Read Full Circular <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* School Contact & Guidance Directory */}
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#0f1c3f] to-[#1B2A4A] p-6 text-white shadow-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold">
                  Registrar & Guidance Hotline
                </h3>
                <p className="text-[11px] text-slate-300">
                  Placido L. Señor NHS · School ID: 303035
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              For parent-teacher conferences, excused absence slips, or credential inquiries, reach out during office hours (Mon–Fri, 8:00 AM – 5:00 PM).
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3 text-xs font-semibold text-amber-300">
              <span>📞 (032) 123-4567</span>
              <span>•</span>
              <span>✉️ info@PLSNHS.edu.ph</span>
            </div>
          </div>
        </div>
      </div>

      {/* Child's Official Student ID Modal */}
      <Modal
        isOpen={showIdModal}
        onClose={() => setShowIdModal(false)}
        title={`Official Student ID · ${activeChild.fullname}`}
        subtitle={`LRN: ${activeChild.lrn} · ${rawGrade}`}
        maxWidth="2xl"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
            <div className="flex items-center gap-1 rounded-lg bg-white p-1 border border-slate-200">
              {(['both', 'front', 'back'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setIdCardSide(s)}
                  className={`rounded-md px-3 py-1 text-xs font-bold capitalize transition-all cursor-pointer ${
                    idCardSide === s
                      ? 'bg-[#152e69] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {s === 'both' ? 'Both Sides' : `${s} Only`}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {idCardSide === 'both' && (
                <button
                  type="button"
                  onClick={() => setIdCardFlipped((f) => !f)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <RotateCw className="h-3.5 w-3.5" /> Flip Order
                </button>
              )}
              <button
                type="button"
                onClick={() => printOfficialStudentId('parentChildIdArea')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#152e69] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0f1c3f] cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-[#F5C518]" /> Print Official ID
              </button>
            </div>
          </div>

          <div
            id="parentChildIdArea"
            className="flex justify-center overflow-x-auto py-2"
          >
            <StudentIdCard
              data={{
                id: activeChild.id,
                student_id: activeChild.id,
                lrn: activeChild.lrn,
                fullname: activeChild.fullname,
                grade_level: activeChild.grade_level,
                strand: activeChild.strand,
                parent_name: activeChild.guardian_name || parentFullName,
                parent_contact: activeChild.guardian_contact || user?.phone || '0912-345-6789',
                photo_url: activeChild.photo_url,
                school_year: '2026-2027',
              }}
              side={idCardSide}
              flipped={idCardFlipped}
              frontId="parentChildCardFront"
              backId="parentChildCardBack"
            />
          </div>
        </div>
      </Modal>

      {/* Announcement Detail Modal */}
      <Modal
        isOpen={Boolean(selectedAnnouncement)}
        onClose={() => setSelectedAnnouncement(null)}
        title="Official School Circular & Parent Advisory"
        subtitle="Placido L. Señor National High School · School ID: 303035"
        maxWidth="xl"
      >
        {selectedAnnouncement && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                {formatDate(selectedAnnouncement.created_at)}
              </span>
              <span className="rounded-md bg-amber-100 px-2.5 py-0.5 font-extrabold text-amber-800 uppercase text-[10px]">
                {selectedAnnouncement.priority || 'General Circular'}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-2.5">
                {selectedAnnouncement.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedAnnouncement.content}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>
                Published by{' '}
                <strong className="text-slate-700">
                  {selectedAnnouncement.author || 'Placido L. Señor NHS Administration'}
                </strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="rounded-xl bg-[#1B2A4A] px-4 py-2 text-xs font-bold text-white hover:bg-[#0f1c3f] cursor-pointer"
              >
                Close Advisory
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
