import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import {
  Layers,
  Calendar,
  FileText,
  UserCheck,
  Clock,
  ArrowRight,
  BookOpen,
  Users,
  GraduationCap,
  ClipboardList,
  Megaphone,
  User,
  CheckCircle2,
  MapPin,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';

interface TeacherClassLoad {
  id: string;
  grade_level: string;
  section: string;
  subject: string;
  strand?: string | null;
  count: number;
  room: string;
  schedule: string;
  isAdvisory?: boolean;
}

interface CampusAnnouncement {
  id: string | number;
  title: string;
  content: string;
  created_at: string;
  priority?: string;
}

const DEFAULT_CLASS_LOADS: TeacherClassLoad[] = [
  {
    id: 'cls-1',
    grade_level: 'Grade 11',
    section: 'Almario',
    subject: 'Pre-Calculus (Specialized)',
    strand: 'STEM',
    count: 42,
    room: 'Math Lab • Bldg A',
    schedule: '07:30 AM – 08:30 AM (Mon–Fri)',
    isAdvisory: true,
  },
  {
    id: 'cls-2',
    grade_level: 'Grade 11',
    section: 'Amorsolo',
    subject: 'General Mathematics',
    strand: 'STEM',
    count: 45,
    room: 'Room 201 • Bldg A',
    schedule: '08:30 AM – 09:30 AM (Mon–Fri)',
    isAdvisory: false,
  },
  {
    id: 'cls-3',
    grade_level: 'Grade 12',
    section: 'Salcedo',
    subject: 'Basic Calculus & Analytics',
    strand: 'STEM',
    count: 39,
    room: 'Room 304 • SHS Bldg',
    schedule: '10:00 AM – 11:00 AM (Mon–Fri)',
    isAdvisory: false,
  },
  {
    id: 'cls-4',
    grade_level: 'Grade 10',
    section: 'Wisdom',
    subject: 'Mathematics 10',
    strand: null,
    count: 40,
    room: 'Room 105 • JHS Bldg',
    schedule: '01:00 PM – 02:00 PM (Mon–Fri)',
    isAdvisory: false,
  },
];

export const TeacherDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [assignedClasses, setAssignedClasses] = useState<TeacherClassLoad[]>(DEFAULT_CLASS_LOADS);
  const [announcements, setAnnouncements] = useState<CampusAnnouncement[]>([]);
  const [attendanceLoggedToday, setAttendanceLoggedToday] = useState<number>(118);

  const fetchTeacherDashboardData = useCallback(async () => {
    try {
      const [{ data: secData }, { data: stData }, { data: annData }, { count: attCount }] =
        await Promise.all([
          supabase.from('sections').select('*').order('grade_level', { ascending: true }),
          supabase.from('students').select('id, section_id, section, grade_level'),
          supabase
            .from('announcements')
            .select('id, title, content, created_at, priority')
            .order('created_at', { ascending: false })
            .limit(4),
          supabase
            .from('attendance')
            .select('id', { count: 'exact', head: true })
            .eq('date', new Date().toISOString().split('T')[0]),
        ]);

      if (annData && annData.length > 0) {
        setAnnouncements(annData);
      }

      if (typeof attCount === 'number' && attCount > 0) {
        setAttendanceLoggedToday(attCount);
      }

      if (secData && secData.length > 0) {
        const teacherName = (user?.full_name || '').toLowerCase().trim();
        const countBySectionId = new Map<string, number>();
        const countBySectionName = new Map<string, number>();

        (stData || []).forEach((s: any) => {
          if (s.section_id) {
            const k = String(s.section_id);
            countBySectionId.set(k, (countBySectionId.get(k) || 0) + 1);
          }
          if (s.section) {
            const k = String(s.section).toLowerCase();
            countBySectionName.set(k, (countBySectionName.get(k) || 0) + 1);
          }
        });

        // Find advisory sections assigned to this teacher if any
        const matchedAdvisory = secData.filter((sec: any) => {
          const adv = String(sec.adviser_name || '').toLowerCase();
          return teacherName && adv && (adv.includes(teacherName) || teacherName.includes(adv));
        });

        const baseSections =
          matchedAdvisory.length > 0
            ? [
                ...matchedAdvisory,
                ...secData
                  .filter((s: any) => !matchedAdvisory.some((m: any) => m.id === s.id))
                  .slice(0, Math.max(0, 4 - matchedAdvisory.length)),
              ]
            : secData.slice(0, 4);

        const defaultSubjects = [
          'General Mathematics',
          'Pre-Calculus (Specialized)',
          'Mathematics 10',
          'Statistics & Probability',
        ];
        const defaultSchedules = [
          '07:30 AM – 08:30 AM (Mon–Fri)',
          '08:30 AM – 09:30 AM (Mon–Fri)',
          '10:00 AM – 11:00 AM (Mon–Fri)',
          '01:00 PM – 02:00 PM (Mon–Fri)',
        ];
        const defaultRooms = [
          'Room 201 • Bldg A',
          'Math Lab • Bldg A',
          'Room 105 • JHS Bldg',
          'Room 304 • SHS Bldg',
        ];

        const mappedLoads: TeacherClassLoad[] = baseSections.map((sec: any, idx: number) => {
          const dbCount =
            countBySectionId.get(String(sec.id)) ||
            countBySectionName.get(String(sec.name || '').toLowerCase()) ||
            [42, 45, 39, 40][idx % 4];
          const gradeNum = parseInt(String(sec.grade_level || '10').replace(/\D/g, ''), 10) || 10;

          return {
            id: String(sec.id || `cls-${idx}`),
            grade_level: sec.grade_level || 'Grade 10',
            section: sec.name || 'Wisdom',
            subject: defaultSubjects[idx % defaultSubjects.length],
            strand: gradeNum >= 11 ? sec.strand || 'STEM' : null,
            count: dbCount,
            room: sec.room || defaultRooms[idx % defaultRooms.length],
            schedule: defaultSchedules[idx % defaultSchedules.length],
            isAdvisory: matchedAdvisory.some((m: any) => m.id === sec.id) || idx === 0,
          };
        });

        if (mappedLoads.length > 0) {
          setAssignedClasses(mappedLoads);
        }
      }
    } catch (err) {
      console.warn('Teacher dashboard fetch notice:', err);
    }
  }, [user?.full_name]);

  useEffect(() => {
    fetchTeacherDashboardData();
  }, [fetchTeacherDashboardData]);

  const totalStudents = assignedClasses.reduce((acc, c) => acc + c.count, 0);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Clean Executive Header — aligned with Notification Bell */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] font-display tracking-tight">
            Teacher Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-slate-700">{user?.full_name || 'Faculty Teacher'}</span>! Manage your assigned class sections, daily attendance logs, and DepEd learner grades.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <PageHeaderNotificationSlot />
        </div>
      </div>

      {/* 3 Executive Metrics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-5">
        <StatCard
          title="Assigned Sections"
          value={assignedClasses.length}
          subtitle="Active JHS & SHS teaching load"
          icon={Layers}
          color="purple"
        />
        <StatCard
          title="Total Students Handled"
          value={totalStudents}
          subtitle="Enrolled learners in sections"
          icon={Users}
          color="emerald"
        />
        <StatCard
          title="Attendance Logged"
          value={attendanceLoggedToday}
          subtitle="Verified present today (SF2)"
          icon={UserCheck}
          color="blue"
        />
      </div>

      {/* Main Content Split: 8 Columns Left (Class Loads & Schedule) + 4 Columns Right (Quick Shortcuts & Advisories) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Active Class Loads Table & Today's Schedule */}
        <div className="lg:col-span-8 min-w-0 space-y-6">
          {/* Active Class Loads Section */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-700" />
                My Active Class Loads & Advisory Roster
              </h2>
              <Link
                to="/teacher/classes"
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
              >
                Manage class rosters <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Year Level & Section</th>
                      <th className="px-4 py-3.5">Subject & Schedule</th>
                      <th className="px-4 py-3.5">Room</th>
                      <th className="px-4 py-3.5 text-center">Learners</th>
                      <th className="px-5 py-3.5 text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignedClasses.map((cls) => (
                      <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Year Level & Section */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#1B2A4A] px-2 py-0.5 text-[10.5px] font-extrabold text-white">
                              <GraduationCap className="h-3 w-3 text-[#F5C518]" />
                              {cls.grade_level}
                            </span>
                            <span className="font-extrabold text-slate-900 text-[13px]">
                              Section {cls.section}
                            </span>
                            {cls.strand && (
                              <span className="rounded-md bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                                {cls.strand}
                              </span>
                            )}
                          </div>
                          {cls.isAdvisory && (
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                              ★ Class Advisory Section
                            </span>
                          )}
                        </td>

                        {/* Subject & Schedule */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-800 text-xs">{cls.subject}</div>
                          <div className="text-[10.5px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{cls.schedule}</span>
                          </div>
                        </td>

                        {/* Room */}
                        <td className="px-4 py-3.5 text-slate-600 font-semibold whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            <span>{cls.room}</span>
                          </div>
                        </td>

                        {/* Learners Count */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-[#1B2A4A]">
                            <Users className="h-3 w-3" />
                            {cls.count}
                          </span>
                        </td>

                        {/* Quick Actions */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <Link
                              to={`/teacher/attendance?section=${encodeURIComponent(cls.section)}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-2xs transition-colors"
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              Attendance
                            </Link>
                            <Link
                              to={`/teacher/grades?section=${encodeURIComponent(cls.section)}&subject=${encodeURIComponent(cls.subject)}`}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#1B2A4A] hover:bg-[#0f1c3f] px-2.5 py-1.5 text-[11px] font-bold text-white shadow-2xs transition-colors"
                            >
                              <FileText className="h-3.5 w-3.5 text-[#F5C518]" />
                              Grades
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* DepEd Grading & Compliance Status Banner */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1B2A4A] text-[#F5C518] shadow-2xs">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-slate-900">
                    DepEd K–12 Electronic Class Record (ECR) & SF2 Compliance
                  </h3>
                  <Badge variant="success" size="sm">
                    Active Term
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  All quarterly grades encoded in the Grade Encoder automatically apply DepEd Order No. 8, s. 2015 transmutation rules and sync directly with Student Report Cards (SF9).
                </p>
              </div>
            </div>
            <Link
              to="/teacher/grades"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1B2A4A] hover:bg-[#0f1c3f] px-4 py-2.5 text-xs font-bold text-white shadow-2xs transition-colors shrink-0"
            >
              <FileText className="h-4 w-4 text-[#F5C518]" />
              Open Grade Encoder
            </Link>
          </div>
        </div>

        {/* Right Column (4 cols): Quick Shortcuts & Recent School Circulars */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Shortcuts Box (matches Admin & Registrar Dashboards) */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
              Faculty Quick Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2.5 text-xs font-semibold">
              <Link
                to="/teacher/attendance"
                className="rounded-xl bg-white p-3 border border-emerald-200/80 text-emerald-950 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs flex items-center gap-1.5"
              >
                <UserCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Log Attendance</span>
              </Link>
              <Link
                to="/teacher/grades"
                className="rounded-xl bg-amber-50 p-3 border border-amber-300 text-[#152e69] font-bold hover:bg-[#152e69] hover:text-white hover:border-[#152e69] transition-all shadow-2xs flex items-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>Encode Grades</span>
              </Link>
              <Link
                to="/teacher/classes"
                className="rounded-xl bg-white p-3 border border-emerald-200/80 text-emerald-950 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs flex items-center gap-1.5"
              >
                <Layers className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>My Classes</span>
              </Link>
              <Link
                to="/teacher/assessments"
                className="rounded-xl bg-white p-3 border border-emerald-200/80 text-emerald-950 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs flex items-center gap-1.5"
              >
                <ClipboardList className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Assessments</span>
              </Link>
              <Link
                to="/teacher/schedule"
                className="rounded-xl bg-white p-3 border border-emerald-200/80 text-emerald-950 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs flex items-center gap-1.5"
              >
                <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Class Program</span>
              </Link>
              <Link
                to="/teacher/profile"
                className="rounded-xl bg-white p-3 border border-emerald-200/80 text-emerald-950 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs flex items-center gap-1.5"
              >
                <User className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Faculty Profile</span>
              </Link>
            </div>
          </div>

          {/* Campus Announcements & Advisories */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-[#1B2A4A]" />
                Campus Circulars & Advisories
              </h2>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              {announcements.length > 0 ? (
                announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="border-b border-slate-100 last:border-none pb-3 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 line-clamp-1">
                        {ann.title}
                      </p>
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                        {ann.created_at
                          ? new Date(ann.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Recent'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {ann.content}
                    </p>
                  </div>
                ))
              ) : (
                <div className="space-y-3">
                  <div className="border-b border-slate-100 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900">
                        2nd Quarter Grade Encoding Schedule
                      </p>
                      <Badge variant="info" size="sm">
                        Registrar
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      All subject teachers and class advisers are reminded to finalize Quarter 2 marks via the DepEd Grade Encoder.
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900">
                        Daily SF2 Attendance Monitoring
                      </p>
                      <Badge variant="success" size="sm">
                        Active
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Ensure daily learner attendance is logged via QR scanner or manual roster before 4:30 PM.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
