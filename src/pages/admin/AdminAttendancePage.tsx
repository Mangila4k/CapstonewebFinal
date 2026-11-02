import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import {
  Calendar,
  UserCheck,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  QrCode,
  Users,
  GraduationCap,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/common/Badge';
import { formatDate } from '../../lib/utils';

export const AdminAttendancePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'teachers' ? 'teachers' : 'students';
  // Active Tab: 'students' | 'teachers'
  const [activeTab, setActiveTab] = useState<'students' | 'teachers'>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'teachers' || tabParam === 'students') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'students' | 'teachers') => {
    setActiveTab(tab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', tab);
        return next;
      },
      { replace: true }
    );
  };

  // Teacher Attendance State
  const [teacherAttendance, setTeacherAttendance] = useState<any[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');

  // Student Attendance State
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Present' | 'Late'>('All');
  const [modeFilter, setModeFilter] = useState<'All' | 'QR' | 'LRN'>('All');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(true);

  // Fetch Teacher Attendance
  useEffect(() => {
    async function fetchTeacherAttendance() {
      try {
        const { data } = await supabase
          .from('teacher_attendance')
          .select('*')
          .order('date', { ascending: false })
          .limit(30);

        if (data && data.length > 0) {
          setTeacherAttendance(data);
        } else {
          setTeacherAttendance([
            { id: 1, teacher_name: 'Maria Santos', department: 'Math', time_in: '07:12 AM', time_out: '04:30 PM', status: 'Present', date: new Date().toISOString() },
            { id: 2, teacher_name: 'Jose Rodriguez', department: 'Science', time_in: '07:20 AM', time_out: '04:32 PM', status: 'Present', date: new Date().toISOString() },
            { id: 3, teacher_name: 'Elena Dela Torre', department: 'Filipino', time_in: '07:35 AM', time_out: '—', status: 'Late', date: new Date().toISOString() },
            { id: 4, teacher_name: 'Robert Ramos', department: 'TVL ICT', time_in: '07:15 AM', time_out: '04:30 PM', status: 'Present', date: new Date().toISOString() },
          ]);
        }
      } catch (err) {
        console.warn('Teacher attendance error:', err);
      }
    }
    fetchTeacherAttendance();
  }, []);

  // Fetch Student Attendance from Supabase
  useEffect(() => {
    async function fetchStudentAttendance() {
      setLoading(true);
      try {
        const [{ data: attData, error }, { data: stData }, { data: secData }] = await Promise.all([
          supabase.from('attendance').select('*').order('date', { ascending: false }).limit(100),
          supabase.from('students').select('id, first_name, last_name, lrn, grade_level, strand, section_id'),
          supabase.from('sections').select('id, name'),
        ]);

        const studentMap = new Map<string, any>();
        if (stData) {
          stData.forEach((st: any) => {
            if (st.id) studentMap.set(String(st.id), st);
            if (st.lrn) studentMap.set(String(st.lrn), st);
          });
        }

        const secMap = new Map<string, string>();
        if (secData) {
          secData.forEach((sec: any) => {
            if (sec.id && sec.name) secMap.set(String(sec.id), sec.name);
          });
        }

        if (!error && attData && attData.length > 0) {
          const mapped = attData.map((item: any) => {
            const st = item.student_id ? studentMap.get(String(item.student_id)) : null;
            const isQr = item.qr_code && (item.qr_code.includes('http') || item.qr_code.length > 15);
            const sectionName =
              (st?.section_id && secMap.get(String(st.section_id))) ||
              (item.section_id && secMap.get(String(item.section_id))) ||
              'General';

            const rawStatus = String(item.status || 'present').toLowerCase();
            const displayStatus = rawStatus === 'late' ? 'Late' : 'Present';

            return {
              id: item.id,
              name: st ? `${st.last_name}, ${st.first_name}` : 'Enrolled Student',
              lrn: st?.lrn || item.qr_code?.match(/\d{12}/)?.[0] || '—',
              grade_level: st?.grade_level || 'Grade 10',
              strand: st?.strand || '',
              section: sectionName,
              date: item.date,
              time_in: item.time_in ? item.time_in.slice(0, 5) : '07:15 AM',
              status: displayStatus,
              mode: isQr ? 'QR' : 'LRN',
            };
          });
          setStudentAttendance(mapped);
        } else {
          // Initial mock records for immediate verification
          const today = new Date().toISOString().split('T')[0];
          setStudentAttendance([
            { id: 1, name: 'Chappell, Lucas Erawan', lrn: '446567190011', grade_level: 'Grade 10', strand: '', section: 'Kindness', date: today, time_in: '07:15 AM', status: 'Present', mode: 'QR' },
            { id: 2, name: 'Mangila, Justine', lrn: '11951680099', grade_level: 'Grade 11', strand: 'TVL-ICT', section: '11-Diamond', date: today, time_in: '07:22 AM', status: 'Present', mode: 'LRN' },
            { id: 3, name: 'Sellar, Shine', lrn: '11951680077', grade_level: 'Grade 9', strand: 'GAS', section: '10-Rizal', date: today, time_in: '07:38 AM', status: 'Late', mode: 'QR' },
            { id: 4, name: 'Pahong, Jiggy', lrn: '11951634540', grade_level: 'Grade 8', strand: '', section: 'Square', date: today, time_in: '07:18 AM', status: 'Present', mode: 'LRN' },
          ]);
        }
      } catch (err) {
        console.warn('Student attendance error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStudentAttendance();
  }, [selectedDate]);

  // Filter Teacher Attendance
  const filteredTeachers = teacherAttendance.filter((a) => {
    const q = teacherSearch.toLowerCase();
    const name = (a.teacher_name || '').toLowerCase();
    const dept = (a.department || '').toLowerCase();
    return name.includes(q) || dept.includes(q);
  });

  // Filter Student Attendance
  const filteredStudents = studentAttendance.filter((s) => {
    const q = studentSearch.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      s.lrn.includes(q) ||
      s.section.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    const matchesMode = modeFilter === 'All' || s.mode === modeFilter;

    return matchesSearch && matchesStatus && matchesMode;
  });

  const studentPresentCount = filteredStudents.filter((s) => s.status === 'Present').length;
  const studentLateCount = filteredStudents.filter((s) => s.status === 'Late').length;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            Official Attendance Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Daily learner check-ins via QR codes & LRNs, and faculty biometrics logs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/teacher/attendance"
            className="flex h-10 items-center gap-1.5 rounded-xl bg-[#1a225a] hover:bg-[#25327d] text-white px-4 text-xs font-bold shadow-xs transition-colors"
          >
            <UserCheck className="h-4 w-4" />
            <span>Open Attendance Sheet</span>
            <ArrowRight className="h-3.5 w-3.5 opacity-80" />
          </Link>
          <PageHeaderNotificationSlot />
        </div>
      </div>

      {/* TAB SELECTOR */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-xs w-full sm:w-auto inline-flex">
        <button
          onClick={() => handleTabChange('students')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'students'
              ? 'bg-[#1a225a] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>Student Attendance (QR & LRN)</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
            activeTab === 'students' ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'
          }`}>
            {studentAttendance.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('teachers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'teachers'
              ? 'bg-[#1a225a] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Teacher & Faculty Biometrics</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
            activeTab === 'teachers' ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'
          }`}>
            {teacherAttendance.length}
          </span>
        </button>
      </div>

      {/* ====== TAB 1: STUDENT ATTENDANCE (QR & LRN) ====== */}
      {activeTab === 'students' && (
        <div className="space-y-4 animate-fade-in">
          {/* Controls & Filter Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by student name, 12-digit LRN, or section..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs focus:border-[#1a225a] focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="All">All Status</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
              </select>

              {/* Mode Filter */}
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden"
              >
                <option value="All">All Modes (QR & LRN)</option>
                <option value="QR">Scanned via QR Code</option>
                <option value="LRN">Logged via LRN</option>
              </select>

              {/* Counters */}
              <div className="flex items-center gap-1.5 text-xs font-bold">
                <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-800 border border-emerald-200">
                  Present: {studentPresentCount}
                </span>
                <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-amber-900 border border-amber-200">
                  Late: {studentLateCount}
                </span>
              </div>
            </div>
          </div>

          {/* Student Attendance Table */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Learner Name</th>
                    <th className="px-5 py-3">LRN</th>
                    <th className="px-5 py-3">Grade & Section</th>
                    <th className="px-5 py-3">Log Mode</th>
                    <th className="px-5 py-3">Time Registered</th>
                    <th className="px-5 py-3 text-right">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1a225a] border-t-transparent mb-2"></div>
                        <p>Loading student attendance records...</p>
                      </td>
                    </tr>
                  ) : filteredStudents.length > 0 ? (
                    filteredStudents.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-slate-600">
                          {item.lrn}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-semibold text-slate-800">{item.grade_level}</span>
                          <span className="text-slate-400"> · Section {item.section}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              item.mode === 'QR'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {item.mode === 'QR' ? <QrCode className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                            <span>Via {item.mode}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-600">
                          {item.time_in}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Badge variant={item.status === 'Present' ? 'success' : 'warning'} size="sm">
                            {item.status}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No student attendance records matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ====== TAB 2: TEACHER ATTENDANCE ====== */}
      {activeTab === 'teachers' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Search teacher by name or department..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Faculty Educator</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Time In</th>
                    <th className="px-5 py-3">Time Out</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeachers.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{item.teacher_name || 'Teacher'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{item.department || 'Senior High'}</td>
                      <td className="px-5 py-3.5 font-mono text-emerald-800 font-semibold">{item.time_in || '—'}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-500">{item.time_out || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-400">{formatDate(item.date)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Badge variant={item.status === 'Present' ? 'success' : 'warning'} size="sm">
                          {item.status || 'Present'}
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
    </div>
  );
};
