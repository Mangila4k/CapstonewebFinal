import React, { useState, useEffect, useMemo } from 'react';
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
  Download,
  RotateCw,
  Hash,
  X,
  FileSpreadsheet,
  Building2,
  Camera,
  Plus,
  ShieldCheck,
  Check,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatCard } from '../../components/common/StatCard';
import { Modal } from '../../components/common/Modal';
import { formatDate } from '../../lib/utils';
import {
  fetchAllTeacherAttendance,
  recordTeacherAttendance,
  TeacherAttendanceRecord,
} from '../../lib/teacherAttendanceStore';

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
  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendanceRecord[]>([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherDeptFilter, setTeacherDeptFilter] = useState('All');
  const [teacherStatusFilter, setTeacherStatusFilter] = useState<'All' | 'Present' | 'Late'>('All');

  // Admin Modal: Record Face Attendance State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [modalFacultyName, setModalFacultyName] = useState('Maria Santos');
  const [modalCustomName, setModalCustomName] = useState('');
  const [modalDepartment, setModalDepartment] = useState('Mathematics');
  const [modalDate, setModalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [modalTimeIn, setModalTimeIn] = useState('07:15 AM');
  const [modalTimeOut, setModalTimeOut] = useState('');
  const [modalStatus, setModalStatus] = useState<'Present' | 'Late'>('Present');
  const [modalMode, setModalMode] = useState<'Face Biometrics (AI Camera)' | 'Facial Recognition Kiosk' | 'Manual Override'>('Face Biometrics (AI Camera)');
  const [isSubmittingRecord, setIsSubmittingRecord] = useState(false);
  const [recordSuccessToast, setRecordSuccessToast] = useState<string | null>(null);

  // Student Attendance State
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Present' | 'Late'>('All');
  const [modeFilter, setModeFilter] = useState<'All' | 'QR' | 'LRN'>('All');
  const [gradeFilter, setGradeFilter] = useState<string>('All');
  const [dateFilter, setDateFilter] = useState<string>('All');

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch Teacher Attendance
  const fetchTeacherAttendance = async () => {
    try {
      const records = await fetchAllTeacherAttendance();
      setTeacherAttendance(records);
    } catch (err) {
      console.warn('Teacher attendance error:', err);
    }
  };

  // Fetch Student Attendance from Supabase
  const fetchStudentAttendance = async () => {
    setLoading(true);
    try {
      const [{ data: attData, error }, { data: stData }, { data: secData }] = await Promise.all([
        supabase.from('attendance').select('*').order('date', { ascending: false }).limit(200),
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
            'Almario';

          const rawStatus = String(item.status || 'present').toLowerCase();
          const displayStatus = rawStatus === 'late' ? 'Late' : 'Present';

          return {
            id: item.id,
            name: st ? `${st.last_name}, ${st.first_name}` : 'Enrolled Student',
            lrn: st?.lrn || item.qr_code?.match(/\d{11,12}/)?.[0] || '11951680082',
            grade_level: st?.grade_level || 'Grade 11',
            strand: st?.strand || '',
            section: sectionName,
            date: item.date,
            time_in: item.time_in ? item.time_in.slice(0, 5) : '07:15',
            status: displayStatus,
            mode: isQr ? 'QR' : 'LRN',
          };
        });
        setStudentAttendance(mapped);
      } else {
        // Mock fallback records
        const today = new Date().toISOString().split('T')[0];
        setStudentAttendance([
          { id: 1, name: 'Pengoc, Jorvin', lrn: '11951680082', grade_level: 'Grade 11', strand: '', section: 'Almario', date: today, time_in: '07:42', status: 'Present', mode: 'QR' },
          { id: 2, name: 'Pengoc, Jorvin', lrn: '11951680082', grade_level: 'Grade 11', strand: '', section: 'Almario', date: today, time_in: '07:35', status: 'Present', mode: 'QR' },
          { id: 3, name: 'Chappell, Lucas Erawan', lrn: '446567190011', grade_level: 'Grade 10', strand: '', section: 'Kindness', date: today, time_in: '07:15', status: 'Present', mode: 'QR' },
          { id: 4, name: 'Mangila, Justine', lrn: '11951680099', grade_level: 'Grade 11', strand: 'TVL-ICT', section: 'Diamond', date: today, time_in: '07:22', status: 'Present', mode: 'LRN' },
          { id: 5, name: 'Sellar, Shine', lrn: '11951680077', grade_level: 'Grade 9', strand: 'GAS', section: 'Rizal', date: today, time_in: '07:38', status: 'Late', mode: 'QR' },
        ]);
      }
    } catch (err) {
      console.warn('Student attendance error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherAttendance();
    fetchStudentAttendance();

    const handleSync = () => {
      fetchTeacherAttendance();
    };
    window.addEventListener('plsnhs_teacher_attendance_updated', handleSync);
    return () => {
      window.removeEventListener('plsnhs_teacher_attendance_updated', handleSync);
    };
  }, []);

  const openRecordModal = () => {
    const now = new Date();
    const hours = now.getHours();
    const mins = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    const formattedTime = `${String(hour12).padStart(2, '0')}:${mins} ${ampm}`;
    const isLate = hours > 7 || (hours === 7 && now.getMinutes() > 30);

    setModalFacultyName('Maria Santos');
    setModalCustomName('');
    setModalDepartment('Mathematics');
    setModalDate(new Date().toISOString().split('T')[0]);
    setModalTimeIn(formattedTime);
    setModalTimeOut('');
    setModalStatus(isLate ? 'Late' : 'Present');
    setModalMode('Face Biometrics (AI Camera)');
    setIsRecordModalOpen(true);
  };

  const handleFacultySelectionChange = (name: string) => {
    setModalFacultyName(name);
    if (name === 'Maria Santos') setModalDepartment('Mathematics');
    else if (name === 'Jose Rodriguez') setModalDepartment('Science');
    else if (name === 'Elena Dela Torre') setModalDepartment('Filipino');
    else if (name === 'Robert Ramos') setModalDepartment('TVL ICT');
    else if (name === 'Mr. J. Almario') setModalDepartment('Junior High School');
    else if (name === 'Justine Mangila') setModalDepartment('Office of the School Administration & ICT');
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetName = modalFacultyName === 'Other' ? modalCustomName.trim() : modalFacultyName;
    if (!targetName) return;

    setIsSubmittingRecord(true);
    try {
      await recordTeacherAttendance({
        teacher_name: targetName,
        department: modalDepartment.trim() || 'Senior High School',
        time_in: modalTimeIn.trim(),
        time_out: modalTimeOut.trim() || '—',
        date: modalDate,
        status: modalStatus,
        mode: modalMode,
        confidence_score: 99.4,
      });

      await fetchTeacherAttendance();
      setIsRecordModalOpen(false);
      setRecordSuccessToast(`Biometrics recorded for ${targetName}!`);
      setTimeout(() => setRecordSuccessToast(null), 3500);
    } catch (err) {
      console.warn('Failed to record teacher attendance:', err);
    } finally {
      setIsSubmittingRecord(false);
    }
  };

  const handleQuickTimeOut = async (record: TeacherAttendanceRecord) => {
    const now = new Date();
    const hours = now.getHours();
    const mins = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    const formattedTime = `${String(hour12).padStart(2, '0')}:${mins} ${ampm}`;

    await recordTeacherAttendance({
      teacher_name: record.teacher_name,
      department: record.department,
      time_in: record.time_in,
      time_out: formattedTime,
      date: record.date,
      status: record.status,
      mode: record.mode,
      confidence_score: record.confidence_score,
    });
    await fetchTeacherAttendance();
    setRecordSuccessToast(`Time Out recorded for ${record.teacher_name} at ${formattedTime}`);
    setTimeout(() => setRecordSuccessToast(null), 3500);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (activeTab === 'students') {
      await fetchStudentAttendance();
    } else {
      await fetchTeacherAttendance();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Helper for initials
  const getInitials = (fullName: string) => {
    if (!fullName) return 'ST';
    const clean = fullName.replace(/,/g, '').trim().split(/\s+/);
    if (clean.length >= 2) {
      return `${clean[0][0]}${clean[1][0]}`.toUpperCase();
    }
    return clean[0].slice(0, 2).toUpperCase();
  };

  // Unique Dates in records
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    studentAttendance.forEach((s) => {
      if (s.date) dates.add(s.date);
    });
    return Array.from(dates).sort().reverse();
  }, [studentAttendance]);

  // Unique Departments in teacher records
  const availableDepts = useMemo(() => {
    const depts = new Set<string>();
    teacherAttendance.forEach((t) => {
      if (t.department) depts.add(t.department);
    });
    return Array.from(depts).sort();
  }, [teacherAttendance]);

  // Filter Teacher Attendance
  const filteredTeachers = useMemo(() => {
    return teacherAttendance.filter((a) => {
      const q = teacherSearch.toLowerCase();
      const name = (a.teacher_name || '').toLowerCase();
      const dept = (a.department || '').toLowerCase();
      const matchesSearch = name.includes(q) || dept.includes(q);
      const matchesDept = teacherDeptFilter === 'All' || a.department === teacherDeptFilter;
      const matchesStatus = teacherStatusFilter === 'All' || a.status === teacherStatusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [teacherAttendance, teacherSearch, teacherDeptFilter, teacherStatusFilter]);

  // Filter Student Attendance
  const filteredStudents = useMemo(() => {
    return studentAttendance.filter((s) => {
      const q = studentSearch.toLowerCase();
      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        s.lrn.includes(q) ||
        s.section.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
      const matchesMode = modeFilter === 'All' || s.mode === modeFilter;
      const matchesGrade = gradeFilter === 'All' || s.grade_level === gradeFilter;
      const matchesDate = dateFilter === 'All' || s.date === dateFilter;

      return matchesSearch && matchesStatus && matchesMode && matchesGrade && matchesDate;
    });
  }, [studentAttendance, studentSearch, statusFilter, modeFilter, gradeFilter, dateFilter]);

  // Student metrics
  const studentTotalCount = studentAttendance.length;
  const studentPresentCount = studentAttendance.filter((s) => s.status === 'Present').length;
  const studentLateCount = studentAttendance.filter((s) => s.status === 'Late').length;
  const studentQrCount = studentAttendance.filter((s) => s.mode === 'QR').length;
  const presentRate = studentTotalCount > 0 ? Math.round((studentPresentCount / studentTotalCount) * 100) : 0;
  const qrRate = studentTotalCount > 0 ? Math.round((studentQrCount / studentTotalCount) * 100) : 0;

  // Teacher metrics
  const teacherTotalCount = teacherAttendance.length;
  const teacherPresentCount = teacherAttendance.filter((t) => t.status === 'Present').length;
  const teacherLateCount = teacherAttendance.filter((t) => t.status === 'Late').length;

  const hasStudentFilterActive =
    studentSearch !== '' ||
    statusFilter !== 'All' ||
    modeFilter !== 'All' ||
    gradeFilter !== 'All' ||
    dateFilter !== 'All';

  const resetStudentFilters = () => {
    setStudentSearch('');
    setStatusFilter('All');
    setModeFilter('All');
    setGradeFilter('All');
    setDateFilter('All');
  };

  const hasTeacherFilterActive =
    teacherSearch !== '' ||
    teacherDeptFilter !== 'All' ||
    teacherStatusFilter !== 'All';

  const resetTeacherFilters = () => {
    setTeacherSearch('');
    setTeacherDeptFilter('All');
    setTeacherStatusFilter('All');
  };

  // CSV Export
  const handleExportCSV = () => {
    if (activeTab === 'students') {
      if (filteredStudents.length === 0) return;
      const headers = ['Learner Name', 'LRN', 'Grade Level', 'Section', 'Date', 'Time In', 'Log Mode', 'Status'];
      const rows = filteredStudents.map((s) => [
        `"${s.name}"`,
        `"${s.lrn}"`,
        `"${s.grade_level}"`,
        `"${s.section}"`,
        `"${s.date || ''}"`,
        `"${s.time_in || ''}"`,
        `"${s.mode}"`,
        `"${s.status}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PLSNHS_Student_Attendance_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      if (filteredTeachers.length === 0) return;
      const headers = ['Faculty Name', 'Department', 'Date', 'Time In', 'Time Out', 'Status'];
      const rows = filteredTeachers.map((t) => [
        `"${t.teacher_name || ''}"`,
        `"${t.department || ''}"`,
        `"${t.date || ''}"`,
        `"${t.time_in || ''}"`,
        `"${t.time_out || ''}"`,
        `"${t.status || ''}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PLSNHS_Faculty_Attendance_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* 1. Header with DepEd Branding & Action Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            Official Attendance Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Institutional check-in tracking via QR scanner &amp; LRNs, and faculty biometrics logs.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer active:scale-98"
            title="Export filtered records as CSV"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh attendance records"
          >
            <RotateCw className={`h-3.5 w-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            to="/teacher/attendance"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98"
          >
            <UserCheck className="h-4 w-4" />
            <span>Open Attendance Sheet</span>
            <ArrowRight className="h-3.5 w-3.5 opacity-80" />
          </Link>
          <PageHeaderNotificationSlot />
        </div>
      </div>

      {/* 2. Metrics Stat Cards Grid */}
      {activeTab === 'students' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Registered"
            value={studentTotalCount}
            subtitle="Verified attendance logs"
            icon={UserCheck}
            color="emerald"
          />
          <StatCard
            title="Present On-Time"
            value={studentPresentCount}
            subtitle={`${presentRate}% on-time check-in rate`}
            icon={CheckCircle2}
            color="blue"
          />
          <StatCard
            title="Late Check-ins"
            value={studentLateCount}
            subtitle="Recorded tardy arrivals"
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="QR Code Scans"
            value={studentQrCount}
            subtitle={`${qrRate}% automated verification`}
            icon={QrCode}
            color="purple"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Faculty Logged"
            value={teacherTotalCount}
            subtitle="Teaching personnel on duty"
            icon={Users}
            color="emerald"
          />
          <StatCard
            title="On-Time Faculty"
            value={teacherPresentCount}
            subtitle="Punctual biometric logs"
            icon={CheckCircle2}
            color="blue"
          />
          <StatCard
            title="Late Arrivals"
            value={teacherLateCount}
            subtitle="Recorded tardy logs"
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Academic Departments"
            value={availableDepts.length || 4}
            subtitle="Active faculty units"
            icon={Building2}
            color="purple"
          />
        </div>
      )}

      {/* 3. Professional Segmented Tab Switcher */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/80 w-full sm:w-auto inline-flex">
        <button
          onClick={() => handleTabChange('students')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'students'
              ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <GraduationCap className={`h-4 w-4 ${activeTab === 'students' ? 'text-emerald-700' : 'text-slate-400'}`} />
          <span>Student Attendance (QR &amp; LRN)</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'students'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {studentAttendance.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('teachers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'teachers'
              ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Users className={`h-4 w-4 ${activeTab === 'teachers' ? 'text-emerald-700' : 'text-slate-400'}`} />
          <span>Teacher &amp; Faculty Biometrics</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'teachers'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {teacherAttendance.length}
          </span>
        </button>
      </div>

      {/* ====== TAB 1: STUDENT ATTENDANCE ====== */}
      {activeTab === 'students' && (
        <div className="space-y-4 animate-fade-in">
          {/* Controls & Filter Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search by learner name, 12-digit LRN, or section..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
                />
                {studentSearch && (
                  <button
                    type="button"
                    onClick={() => setStudentSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status & Counter Chips */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Present: {filteredStudents.filter((s) => s.status === 'Present').length}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>Late: {filteredStudents.filter((s) => s.status === 'Late').length}</span>
                </div>
              </div>
            </div>

            {/* Sub-Filters: Date, Grade Level, Status, Mode */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filters:
              </span>

              {/* Date Filter */}
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 focus:border-emerald-600 focus:bg-white focus:outline-hidden cursor-pointer"
                >
                  <option value="All">All Dates</option>
                  {availableDates.map((d) => (
                    <option key={d} value={d}>
                      {formatDate(d)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grade Level Filter */}
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 focus:border-emerald-600 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Grade Levels</option>
                {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 focus:border-emerald-600 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Present">Present (On-Time)</option>
                <option value="Late">Late (Tardy)</option>
              </select>

              {/* Mode Filter */}
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 focus:border-emerald-600 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Log Modes</option>
                <option value="QR">Scanned via QR Code</option>
                <option value="LRN">Logged via LRN</option>
              </select>

              {hasStudentFilterActive && (
                <button
                  type="button"
                  onClick={resetStudentFilters}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition-colors ml-auto cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Student Attendance Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Learner Name</th>
                    <th className="px-5 py-3.5">LRN</th>
                    <th className="px-5 py-3.5">Grade &amp; Section</th>
                    <th className="px-5 py-3.5">Log Mode</th>
                    <th className="px-5 py-3.5">Time Registered</th>
                    <th className="px-5 py-3.5 text-right">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400">
                        <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent mb-2.5" />
                        <p className="text-xs font-semibold text-slate-600">Loading student attendance records...</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Querying verified check-ins from database</p>
                      </td>
                    </tr>
                  ) : filteredStudents.length > 0 ? (
                    filteredStudents.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Learner Name with Avatar */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-extrabold text-emerald-800">
                              {getInitials(item.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{item.name}</p>
                              <p className="text-[11px] text-slate-400 truncate">
                                {item.strand ? `${item.strand} Learner` : 'Junior High Learner'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Monospaced LRN Badge */}
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                            <Hash className="h-3 w-3 text-slate-400" />
                            {item.lrn}
                          </span>
                        </td>

                        {/* Grade & Section */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-800 border border-blue-200">
                              {item.grade_level}
                            </span>
                            <span className="text-slate-600 font-medium">
                              Section {item.section}
                            </span>
                          </div>
                        </td>

                        {/* Log Mode Badge */}
                        <td className="px-5 py-3.5">
                          {item.mode === 'QR' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                              <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Via QR Code</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-800">
                              <Hash className="h-3.5 w-3.5 text-purple-600" />
                              <span>Via LRN</span>
                            </span>
                          )}
                        </td>

                        {/* Time & Date */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-700">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span>{item.time_in}</span>
                          </div>
                          {item.date && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {formatDate(item.date)}
                            </p>
                          )}
                        </td>

                        {/* Attendance Status */}
                        <td className="px-5 py-3.5 text-right">
                          {item.status === 'Present' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              Present
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                              <span className="h-2 w-2 rounded-full bg-amber-500" />
                              Late
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200">
                            <UserCheck className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-bold text-slate-700">No attendance records found</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm">
                            {hasStudentFilterActive
                              ? 'No logs match the current search keywords or filters. Try adjusting your query or resetting filters.'
                              : 'No student check-in entries recorded in the database yet.'}
                          </p>
                          {hasStudentFilterActive && (
                            <button
                              type="button"
                              onClick={resetStudentFilters}
                              className="mt-3.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              Clear All Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Summary Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">
                  Showing {filteredStudents.length} of {studentAttendance.length} records
                </span>
                {hasStudentFilterActive && (
                  <span className="text-emerald-700 font-semibold">(Filtered)</span>
                )}
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Official Institutional Attendance System · School ID: 303035
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ====== TAB 2: TEACHER ATTENDANCE ====== */}
      {activeTab === 'teachers' && (
        <div className="space-y-4 animate-fade-in">
          {/* Controls & Filter Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  placeholder="Search faculty by name or department..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-9 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
                />
                {teacherSearch && (
                  <button
                    type="button"
                    onClick={() => setTeacherSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status Chips & Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Present: {filteredTeachers.filter((t) => t.status === 'Present').length}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>Late: {filteredTeachers.filter((t) => t.status === 'Late').length}</span>
                </div>

                <button
                  type="button"
                  onClick={openRecordModal}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3.5 py-1.5 text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-98"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Record Face Attendance</span>
                </button>

                <Link
                  to="/teacher/face-attendance"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 px-3 py-1.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                  title="Open live teacher face attendance kiosk camera"
                >
                  <Camera className="h-3.5 w-3.5 text-purple-700" />
                  <span>Live Face Kiosk</span>
                </Link>
              </div>
            </div>

            {/* Sub-Filters */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filters:
              </span>

              {/* Department Filter */}
              <select
                value={teacherDeptFilter}
                onChange={(e) => setTeacherDeptFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 focus:border-emerald-600 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Departments</option>
                {availableDepts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={teacherStatusFilter}
                onChange={(e) => setTeacherStatusFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-700 focus:border-emerald-600 focus:bg-white focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Status</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
              </select>

              {hasTeacherFilterActive && (
                <button
                  type="button"
                  onClick={resetTeacherFilters}
                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition-colors ml-auto cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  <span>Reset Filters</span>
                </button>
              )}
            </div>
          </div>

          {/* Success Toast */}
          {recordSuccessToast && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 animate-fade-in shadow-xs">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{recordSuccessToast}</span>
            </div>
          )}

          {/* Teacher Attendance Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Faculty Educator</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5">Time In</th>
                    <th className="px-4 py-3.5">Time Out</th>
                    <th className="px-4 py-3.5">Date</th>
                    <th className="px-4 py-3.5">Biometric Mode</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeachers.length > 0 ? (
                    filteredTeachers.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Faculty Name with Avatar */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-purple-200 bg-purple-50 text-xs font-extrabold text-purple-800">
                              {getInitials(item.teacher_name || 'Faculty')}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{item.teacher_name || 'Teacher'}</p>
                              <p className="text-[11px] text-slate-400">Faculty Member</p>
                            </div>
                          </div>
                        </td>

                        {/* Department Badge */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center rounded-md bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-800 border border-purple-200">
                            {item.department || 'Senior High'}
                          </span>
                        </td>

                        {/* Time In */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-800">
                            <Clock className="h-3.5 w-3.5 text-emerald-600" />
                            <span>{item.time_in || '—'}</span>
                          </div>
                        </td>

                        {/* Time Out */}
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-600">
                          {item.time_out && item.time_out !== '—' ? (
                            <span className="font-semibold text-slate-700">{item.time_out}</span>
                          ) : (
                            <span className="text-slate-400 italic">On Duty</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 text-slate-500 font-medium">
                          {formatDate(item.date)}
                        </td>

                        {/* Biometric Mode */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/80 px-2.5 py-1 text-[11px] font-bold text-purple-800">
                            <Camera className="h-3 w-3 text-purple-600 shrink-0" />
                            <span>{item.mode || 'Face Biometrics (AI Camera)'}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          {item.status === 'Present' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              Present
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                              <span className="h-2 w-2 rounded-full bg-amber-500" />
                              Late
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-5 py-3.5 text-right">
                          {!item.time_out || item.time_out === '—' ? (
                            <button
                              type="button"
                              onClick={() => handleQuickTimeOut(item)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:border-emerald-600 hover:text-emerald-700 transition-colors shadow-2xs cursor-pointer active:scale-95"
                              title="Record current time as faculty time-out"
                            >
                              <Clock className="h-3 w-3 text-slate-500" />
                              <span>Time Out</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Completed</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 border border-slate-200">
                            <Users className="h-6 w-6" />
                          </div>
                          <p className="text-sm font-bold text-slate-700">No faculty records found</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm">
                            {hasTeacherFilterActive
                              ? 'No faculty logs match your current search keywords or filters.'
                              : 'No faculty biometric check-in entries recorded.'}
                          </p>
                          {hasTeacherFilterActive && (
                            <button
                              type="button"
                              onClick={resetTeacherFilters}
                              className="mt-3.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              Clear All Filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Summary Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                Showing {filteredTeachers.length} of {teacherAttendance.length} faculty biometric entries
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Official Biometrics System · School ID: 303035
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Record Teacher Face Attendance Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Faculty Face Attendance"
        subtitle="Manually verify and log facial biometrics for faculty & teaching personnel"
        maxWidth="lg"
      >
        <form onSubmit={handleRecordSubmit} className="space-y-4 pt-1">
          {/* Header Banner */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-950">Facial Recognition Attendance Registry</p>
              <p className="text-[11px] text-emerald-800">
                Entries are logged to the official DepEd PLSNHS faculty biometric attendance ledger.
              </p>
            </div>
          </div>

          {/* Faculty Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Faculty Educator <span className="text-rose-500">*</span>
            </label>
            <select
              value={modalFacultyName}
              onChange={(e) => handleFacultySelectionChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              required
            >
              <option value="Maria Santos">Maria Santos (Mathematics)</option>
              <option value="Jose Rodriguez">Jose Rodriguez (Science)</option>
              <option value="Elena Dela Torre">Elena Dela Torre (Filipino)</option>
              <option value="Robert Ramos">Robert Ramos (TVL ICT)</option>
              <option value="Mr. J. Almario">Mr. J. Almario (Junior High School)</option>
              <option value="Justine Mangila">Justine Mangila (System Administrator / ICT)</option>
              <option value="Other">Other Faculty Member...</option>
            </select>
          </div>

          {/* Custom Name if 'Other' */}
          {modalFacultyName === 'Other' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Enter Educator Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={modalCustomName}
                onChange={(e) => setModalCustomName(e.target.value)}
                placeholder="e.g. Juanita Dela Cruz"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:outline-hidden"
                required
              />
            </div>
          )}

          {/* Department */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Academic Department / Unit <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={modalDepartment}
              onChange={(e) => setModalDepartment(e.target.value)}
              placeholder="e.g. Mathematics, Science, TVL ICT"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:outline-hidden"
              required
            />
          </div>

          {/* Date & Time In Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Attendance Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={modalDate}
                onChange={(e) => setModalDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Time In <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={modalTimeIn}
                onChange={(e) => setModalTimeIn(e.target.value)}
                placeholder="07:15 AM"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono text-slate-800 focus:border-emerald-600 focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Time Out & Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Time Out (Optional)
              </label>
              <input
                type="text"
                value={modalTimeOut}
                onChange={(e) => setModalTimeOut(e.target.value)}
                placeholder="e.g. 04:30 PM (leave blank if on duty)"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono text-slate-800 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Attendance Status
              </label>
              <select
                value={modalStatus}
                onChange={(e) => setModalStatus(e.target.value as any)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="Present">Present (Punctual)</option>
                <option value="Late">Late (Tardy Arrival)</option>
              </select>
            </div>
          </div>

          {/* Biometric Verification Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Biometric Verification Mode
            </label>
            <select
              value={modalMode}
              onChange={(e) => setModalMode(e.target.value as any)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:outline-hidden"
            >
              <option value="Face Biometrics (AI Camera)">Face Biometrics (AI Camera - 99.4% Match)</option>
              <option value="Facial Recognition Kiosk">Facial Recognition Kiosk (Terminal 1)</option>
              <option value="Manual Override">Manual Override (Admin Verified)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsRecordModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingRecord}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmittingRecord ? (
                <>
                  <RotateCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Save Biometric Entry</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

