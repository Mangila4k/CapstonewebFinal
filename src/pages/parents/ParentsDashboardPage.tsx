import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
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
  Plus,
  RefreshCw,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { fetchGradesForStudent } from '../../lib/gradesStore';
import { Modal } from '../../components/common/Modal';
import { StudentIdCard } from '../../components/common/StudentIdCard';
import { printOfficialStudentId } from '../../lib/printIdCard';
import { formatDate } from '../../lib/utils';
import { Alert } from '../../components/common/Alert';
import { Badge } from '../../components/common/Badge';

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
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);
  const [showIdModal, setShowIdModal] = useState(false);
  const [idCardSide, setIdCardSide] = useState<'both' | 'front' | 'back'>('both');
  const [idCardFlipped, setIdCardFlipped] = useState(false);

  // Link child by LRN modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkLrnInput, setLinkLrnInput] = useState('');
  const [linkingLrn, setLinkingLrn] = useState(false);
  const [linkNotice, setLinkNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const parentFullName =
    user?.full_name ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    'Parent / Guardian';
  const parentLastName = (
    user?.last_name ||
    parentFullName.split(' ').slice(-1)[0] ||
    ''
  ).trim();

  // 1. Load Parent's Linked Children & Announcements directly from Supabase
  const loadParentDashboard = async () => {
    try {
      setLoading(true);
      let matched: any[] = [];

      // A. Fetch sections lookup map to convert section_id to actual section name
      const { data: sectionsData } = await supabase.from('sections').select('id, name');
      const sectionMap = new Map<string, string>();
      if (sectionsData) {
        sectionsData.forEach((s: any) => sectionMap.set(String(s.id), s.name));
      }

      // B. Query students in Supabase linked to this parent:
      // Priority 1: students where parent_id = user.id
      if (user?.id) {
        const { data: byParentId } = await supabase
          .from('students')
          .select('*')
          .eq('parent_id', user.id);
        if (byParentId && byParentId.length > 0) {
          matched.push(...byParentId);
        }
      }

      // Priority 2: students where id = user.student_id
      if (user?.student_id && !matched.some((s) => String(s.id) === String(user.student_id))) {
        const { data: byStudentId } = await supabase
          .from('students')
          .select('*')
          .eq('id', user.student_id);
        if (byStudentId && byStudentId.length > 0) {
          matched.push(...byStudentId);
        }
      }

      // Priority 3: students matching parent_email or parent_name
      if (matched.length === 0) {
        if (user?.email && user.email.trim().length >= 4) {
          const { data: byEmail } = await supabase
            .from('students')
            .select('*')
            .ilike('parent_email', `%${user.email.trim()}%`);
          if (byEmail && byEmail.length > 0) {
            matched.push(...byEmail);
          }
        }

        const searchTerms = [parentFullName, user?.last_name, user?.first_name].filter(
          (t): t is string => Boolean(t && t.length >= 3)
        );
        for (const term of searchTerms) {
          if (matched.length > 0) break;
          const { data: byName } = await supabase
            .from('students')
            .select('*')
            .ilike('parent_name', `%${term}%`);
          if (byName && byName.length > 0) {
            matched.push(...byName);
          }
        }
      }

      // Priority 4: check enrollments table safely
      if (matched.length === 0) {
        const orEnrFilters: string[] = [];
        if (user?.email && user.email.trim().length >= 4) {
          orEnrFilters.push(`guardian_email.ilike.%${user.email.trim()}%`);
        }
        if (parentLastName && parentLastName.length >= 3) {
          orEnrFilters.push(`guardian_name.ilike.%${parentLastName}%`);
        }

        if (orEnrFilters.length > 0) {
          const { data: enrRows } = await supabase
            .from('enrollments')
            .select('*')
            .or(orEnrFilters.join(','));
          if (enrRows && enrRows.length > 0) {
            for (const enr of enrRows) {
              if (enr.student_id) {
                const { data: stRow } = await supabase
                  .from('students')
                  .select('*')
                  .eq('id', enr.student_id)
                  .maybeSingle();
                if (stRow && !matched.some((m) => m.id === stRow.id)) {
                  matched.push(stRow);
                }
              }
            }
          }
        }
      }

      // Priority 5: User LRN
      if (matched.length === 0 && user?.student_lrn) {
        const { data: byLrn } = await supabase
          .from('students')
          .select('*')
          .eq('lrn', user.student_lrn);
        if (byLrn && byLrn.length > 0) {
          matched.push(...byLrn);
        }
      }

      // Deduplicate matched students
      const uniqueMap = new Map<string, any>();
      matched.forEach((s) => {
        if (s?.id && !uniqueMap.has(String(s.id))) {
          uniqueMap.set(String(s.id), s);
        }
      });
      const uniqueStudents = Array.from(uniqueMap.values());

      // Format into LinkedChild objects
      const formattedList: LinkedChild[] = uniqueStudents.map((s: any) => {
        const resolvedSection =
          s.section || (s.section_id ? sectionMap.get(String(s.section_id)) : '') || '';
        return {
          id: s.id,
          first_name: s.first_name || '',
          last_name: s.last_name || '',
          fullname: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Student',
          lrn: s.lrn || '',
          grade_level: s.grade_level || 'Grade 10',
          strand: s.strand || '',
          section: resolvedSection,
          status: s.status || s.academic_status || 'Enrolled',
          guardian_name: s.parent_name || parentFullName,
          guardian_contact: s.parent_contact || user?.phone || '',
          photo_url: s.two_by_two_picture_url || s.avatar_url || '',
        };
      });

      setChildrenList(formattedList);

      // Check if previously selected child is remembered
      const savedChildId = localStorage.getItem('plsnhs_parent_selected_child_id');
      if (savedChildId && formattedList.length > 0) {
        const foundIdx = formattedList.findIndex((c) => String(c.id) === String(savedChildId));
        if (foundIdx >= 0) setSelectedChildIdx(foundIdx);
      }

      // C. Fetch latest announcements from Supabase
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
      }
    } catch (err) {
      console.warn('Parent dashboard Supabase load note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParentDashboard();

    // Supabase Realtime Subscription for Live Announcements
    const annChannel = supabase
      .channel('parent-announcements-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          loadParentDashboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(annChannel);
    };
  }, [user?.id, user?.student_id, user?.email, parentFullName, parentLastName]);

  // Active child resolution
  const activeChild: LinkedChild = childrenList[selectedChildIdx] || {
    id: user?.student_id || '',
    first_name: user?.student_name?.split(' ')[0] || user?.first_name || '',
    last_name: user?.student_name?.split(' ').slice(1).join(' ') || user?.last_name || '',
    fullname: user?.student_name || (loading ? 'Loading Learner...' : 'No Linked Child'),
    lrn: user?.student_lrn || '',
    grade_level: user?.student_grade || '',
    strand: user?.student_strand || '',
    section: user?.student_section || '',
    status: user?.student_status || 'Enrolled',
    guardian_name: parentFullName,
    guardian_contact: user?.phone || '',
  };

  // Sync selected child to localStorage for Child Grades & Attendance tabs
  const handleChildSelect = (idx: number) => {
    setSelectedChildIdx(idx);
    const selected = childrenList[idx];
    if (selected?.id) {
      localStorage.setItem('plsnhs_parent_selected_child_id', String(selected.id));
    }
  };

  // 2. Live Child Attendance, Grades & Violations directly from Supabase
  const [liveAttendance, setLiveAttendance] = useState<any[]>([]);
  const [liveGrades, setLiveGrades] = useState<any[]>([]);
  const [liveGpa, setLiveGpa] = useState<string>('—');
  const [liveAttendanceRate, setLiveAttendanceRate] = useState<string>('—');
  const [violationsCount, setViolationsCount] = useState<number>(0);
  const [conductStatus, setConductStatus] = useState<string>('Exemplary');
  const [latestGateStatus, setLatestGateStatus] = useState<string>('Pending Gate Scan');
  const [latestGateTime, setLatestGateTime] = useState<string>('No gate records today');

  const loadChildProgress = async () => {
    if (!activeChild.id) return;

    try {
      const [{ data: attData }, grData, { data: subData }, { data: violData }] = await Promise.all([
        supabase
          .from('attendance')
          .select('*')
          .or(`student_id.eq.${activeChild.id},qr_code.ilike.%${activeChild.lrn}%`)
          .order('date', { ascending: false })
          .limit(10),
        fetchGradesForStudent(activeChild.id, undefined, activeChild.lrn),
        supabase.from('subjects').select('id, code, name, grade_level, strand, semester'),
        supabase
          .from('student_violations')
          .select('*')
          .or(`student_id.eq.${activeChild.id},lrn.eq.${activeChild.lrn}`)
          .order('created_at', { ascending: false }),
      ]);

      // A. Conduct & Violations
      if (violData && violData.length > 0) {
        setViolationsCount(violData.length);
        setConductStatus(violData[0].status || 'Guidance Case');
      } else {
        setViolationsCount(0);
        setConductStatus('Exemplary');
      }

      // B. Gate Attendance Logs & Rate
      if (attData && attData.length > 0) {
        const mappedAtt = attData.map((a: any) => ({
          date: a.date
            ? new Date(a.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Today',
          timeIn: a.time_in ? a.time_in.slice(0, 5) : '—',
          timeOut: a.time_out ? a.time_out.slice(0, 5) : '—',
          mode: a.qr_code ? 'QR Gate Scan' : 'Class Attendance',
          status: String(a.status || 'present').toLowerCase() === 'late' ? 'Late' : 'Present',
        }));
        setLiveAttendance(mappedAtt);

        // Calculate real percentage from attendance rows
        const presentCount = attData.filter((a: any) => String(a.status || '').toLowerCase() !== 'absent').length;
        setLiveAttendanceRate(`${Math.round((presentCount / attData.length) * 100)}%`);

        const latest = attData[0];
        const todayStr = new Date().toISOString().split('T')[0];
        const isToday = latest.date === todayStr;

        if (isToday && latest.time_in) {
          setLatestGateTime(`Today, ${latest.time_in.slice(0, 5)} AM`);
          setLatestGateStatus(
            String(latest.status || 'present').toLowerCase() === 'late'
              ? 'Late Entry'
              : 'Checked In'
          );
        } else {
          setLatestGateTime(latest.date ? `Last: ${latest.date}` : 'Not Scanned Today');
          setLatestGateStatus(latest.status ? `Logged (${latest.status})` : 'Pending Gate Scan');
        }
      } else {
        setLiveAttendance([]);
        setLiveAttendanceRate('—');
        setLatestGateTime('No gate records');
        setLatestGateStatus('Pending Gate Scan');
      }

      // C. Academic Grades
      const subMap = new Map<string, { code: string; name: string }>();
      if (subData) {
        subData.forEach((s: any) =>
          subMap.set(String(s.id), { code: s.code || 'SUBJ', name: s.name })
        );
      }

      const bySubject: Record<string, { code: string; title: string; q1: number | null; q2: number | null }> = {};
      const allNumericGrades: number[] = [];

      if (grData && grData.length > 0) {
        grData.forEach((g: any) => {
          const sid = String(g.subject_id);
          const subMeta = subMap.get(sid) || { code: g.subject_code || 'SUBJ', name: g.subject_name || 'Curriculum Subject' };
          if (!bySubject[sid]) {
            bySubject[sid] = { code: subMeta.code, title: subMeta.name, q1: null, q2: null };
          }
          const qNum = Number(g.quarter);
          const val = Number(g.grade);
          if (!isNaN(val) && val > 0) {
            allNumericGrades.push(val);
            if (qNum === 1) bySubject[sid].q1 = val;
            if (qNum === 2) bySubject[sid].q2 = val;
          }
        });
      }

      const gradesList = Object.values(bySubject).map((item) => {
        // Average can only be computed if all required grading terms (both Q1 and Q2) are entered
        const avg = item.q1 !== null && item.q2 !== null ? Math.round((item.q1 + item.q2) / 2) : null;
        return {
          code: item.code,
          title: item.title,
          q1: item.q1,
          q2: item.q2,
          status: avg !== null ? (avg >= 75 ? 'Passed' : 'Failed') : 'In Progress',
        };
      });

      setLiveGrades(gradesList);

      // Total average only exists if all grades across subjects are entered
      const isComplete = gradesList.length > 0 && gradesList.every((g) => g.q1 !== null && g.q2 !== null);
      if (isComplete && allNumericGrades.length > 0) {
        const sum = allNumericGrades.reduce((a, b) => a + b, 0);
        setLiveGpa((sum / allNumericGrades.length).toFixed(2));
      } else {
        setLiveGpa('—');
      }
    } catch (err) {
      console.warn('Child progress Supabase load note:', err);
    }
  };

  useEffect(() => {
    loadChildProgress();

    // Supabase Realtime Subscriptions for live attendance & grades
    const progressChannel = supabase
      .channel(`parent-child-progress-${activeChild.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance', filter: `student_id=eq.${activeChild.id}` },
        () => {
          loadChildProgress();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grades', filter: `student_id=eq.${activeChild.id}` },
        () => {
          loadChildProgress();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_violations', filter: `student_id=eq.${activeChild.id}` },
        () => {
          loadChildProgress();
        }
      )
      .subscribe();

    window.addEventListener('plshs_grades_updated', loadChildProgress);
    return () => {
      supabase.removeChannel(progressChannel);
      window.removeEventListener('plshs_grades_updated', loadChildProgress);
    };
  }, [activeChild.id, activeChild.lrn, activeChild.grade_level, activeChild.strand]);

  // Handle direct linking of child by 12-digit LRN to Supabase
  const handleLinkChildByLrn = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanLrn = linkLrnInput.trim();
    if (!cleanLrn || cleanLrn.length < 10) {
      setLinkNotice({ type: 'error', message: 'Please enter a valid 12-digit Learner Reference Number (LRN).' });
      return;
    }

    setLinkingLrn(true);
    setLinkNotice(null);

    try {
      // Find student in Supabase
      const { data: foundStudents, error: findErr } = await supabase
        .from('students')
        .select('*')
        .eq('lrn', cleanLrn)
        .limit(1);

      if (findErr || !foundStudents || foundStudents.length === 0) {
        setLinkNotice({
          type: 'error',
          message: `No student record found with LRN ${cleanLrn}. Please verify the number from your child's Form 138 / SF9 report card.`,
        });
        setLinkingLrn(false);
        return;
      }

      const targetStudent = foundStudents[0];

      // Update student record in Supabase to link parent
      if (user?.id) {
        await supabase
          .from('students')
          .update({
            parent_id: user.id,
            parent_name: parentFullName,
            parent_email: user.email || null,
            parent_contact: user.phone || null,
          })
          .eq('id', targetStudent.id);
      }

      setLinkNotice({
        type: 'success',
        message: `Successfully linked ${targetStudent.first_name} ${targetStudent.last_name} (${targetStudent.grade_level || 'Learner'}) to your parent portal!`,
      });

      // Reload parent dashboard
      await loadParentDashboard();

      setTimeout(() => {
        setShowLinkModal(false);
        setLinkLrnInput('');
        setLinkNotice(null);
      }, 1500);
    } catch (err: any) {
      setLinkNotice({ type: 'error', message: err.message || 'Failed to link child. Please try again.' });
    } finally {
      setLinkingLrn(false);
    }
  };

  // Determine Junior High (7-10) vs Senior High (11-12)
  const rawGrade = String(activeChild.grade_level || 'Grade 10').trim();
  const numMatch = rawGrade.match(/\d+/);
  const gradeNum = numMatch ? parseInt(numMatch[0], 10) : 10;
  const isSeniorHigh = gradeNum >= 11 || rawGrade.toLowerCase().includes('senior');
  const departmentLabel = isSeniorHigh
    ? `Senior High · ${activeChild.strand || 'TVL-ICT'}`
    : 'Junior High School (JHS)';
  const rawSection = (activeChild.section || '').replace(/^grade\s*\d+\s*[-–·]?\s*/i, '').trim();
  const assignedSection = rawSection
    ? `Section ${rawSection.replace(/^section\s+/i, '')}`
    : 'Assigned Section';

  const gpaNum = liveGpa !== '—' ? parseFloat(liveGpa) : null;
  const honorsStanding =
    gpaNum !== null
      ? gpaNum >= 98
        ? 'With Highest Honors'
        : gpaNum >= 95
        ? 'With High Honors'
        : gpaNum >= 90
        ? 'With Honors'
        : 'Good Standing'
      : 'In Progress';

  const getChildInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return (name[0] || 'S').toUpperCase();
  };

  return (
    <div className="space-y-6 animate-fade-in w-full pb-12">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-display tracking-tight leading-snug">
              Parent &amp; Guardian Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Real-time synchronization with Placido L. Señor National High School cloud database for attendance, report cards, and official advisories.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 ml-auto pt-0.5">
            <button
              type="button"
              onClick={() => setShowLinkModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer transition-all"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-600" />
              <span>Link Child by LRN</span>
            </button>
            <PageHeaderNotificationSlot />
          </div>
        </div>
      </div>

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
                  Connected to Supabase Cloud
                </span>
                {activeChild.lrn && (
                  <span className="text-xs font-mono font-bold text-slate-500">
                    LRN: {activeChild.lrn}
                  </span>
                )}
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
                onChange={(e) => handleChildSelect(Number(e.target.value))}
                className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden cursor-pointer"
              >
                {childrenList.map((c, idx) => (
                  <option key={c.id} value={idx}>
                    Switch: {c.fullname} ({c.grade_level})
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="rounded-xl sm:rounded-2xl bg-slate-50/80 p-3 sm:p-4 border border-slate-200/80 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                General Average
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-display truncate">
                {liveGpa}
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-700 font-bold mt-1 truncate">
                <Award className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" /> {honorsStanding}
              </span>
            </div>
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <Award className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-slate-50/80 p-3 sm:p-4 border border-slate-200/80 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Attendance Rate
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-display truncate">
                {liveAttendanceRate}
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-emerald-700 font-bold mt-1 truncate">
                <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" /> Live Scans
              </span>
            </div>
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-slate-50/80 p-3 sm:p-4 border border-slate-200/80 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Conduct
              </span>
              <p className="text-base sm:text-xl font-black text-slate-900 mt-1 font-display truncate">
                {violationsCount > 0 ? conductStatus : 'Exemplary'}
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-1 truncate">
                {violationsCount} Incident{violationsCount === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-blue-100 text-blue-700 shrink-0">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-slate-50/80 p-3 sm:p-4 border border-slate-200/80 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                Gate QR Status
              </span>
              <p className="text-base sm:text-xl font-black text-emerald-700 mt-1 font-display truncate">
                {latestGateStatus}
              </p>
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-1 truncate">
                <Clock className="h-3 w-3 text-emerald-600 shrink-0" /> {latestGateTime}
              </span>
            </div>
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-purple-100 text-purple-700 shrink-0">
              <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
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
                    Cloud verified ratings directly from teacher grade sheets · S.Y. 2026–2027
                  </p>
                </div>
              </div>

              <Link
                to="/parents/grades"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#1B2A4A] hover:underline"
              >
                Full SF9 Report Card <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {liveGrades.length === 0 ? (
              <div className="py-10 text-center text-slate-500 space-y-2">
                <BookOpen className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-800">No grades posted yet in Supabase</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Subject teachers are currently encoding quarterly ratings. Once submitted, official grades will appear here automatically.
                </p>
              </div>
            ) : (
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
                    {liveGrades.map((sub) => {
                      const avg = sub.q1 !== null && sub.q2 !== null ? Math.round((sub.q1 + sub.q2) / 2) : null;
                      return (
                        <tr key={sub.code} className="hover:bg-slate-50/70">
                          <td className="py-3 pr-3">
                            <p className="font-bold text-slate-800">{sub.title}</p>
                            <span className="font-mono text-[10px] text-slate-400">
                              {sub.code}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-slate-700">
                            {sub.q1 !== null ? sub.q1 : '—'}
                          </td>
                          <td className="py-3 px-3 text-center font-semibold text-slate-700">
                            {sub.q2 !== null ? sub.q2 : '—'}
                          </td>
                          <td className="py-3 px-3 text-center font-bold font-mono text-slate-900 bg-slate-50/60">
                            {avg !== null ? avg : '—'}
                          </td>
                          <td className="py-3 pl-3 text-right">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                                sub.status === 'Passed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : sub.status === 'Failed'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {sub.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Daily Gate Attendance Logs */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Live Campus Attendance Scans
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Real-time QR barcode scanner logs from PLSNHS campus gate
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

            {liveAttendance.length === 0 ? (
              <div className="py-8 text-center text-slate-500 space-y-2">
                <Calendar className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-800">No attendance records in Supabase yet</p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  When your child scans their official QR ID at the entrance gates, timestamps will immediately appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {liveAttendance.map((log, i) => (
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
                        <span className="font-mono text-slate-700 block">
                          In: {log.timeIn}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Out: {log.timeOut}
                        </span>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                    PTA &amp; Circulars
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
                    View &amp; Print
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* PTA & School Announcements Feed from Supabase */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  PTA &amp; Campus Advisories
                </h3>
              </div>
              <Link
                to="/parents/announcements"
                className="text-xs font-bold text-[#1B2A4A] hover:underline"
              >
                View All
              </Link>
            </div>

            {announcements.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No active announcements in Supabase.
              </p>
            ) : (
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
            )}
          </div>

          {/* School Contact & Guidance Directory */}
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-[#0f1c3f] to-[#1B2A4A] p-6 text-white shadow-xs space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold">
                  Registrar &amp; Guidance Hotline
                </h3>
                <p className="text-[11px] text-slate-300">
                  Placido L. Señor NHS · School ID: 303035
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              For parent-teacher consultations, grade consultations, or attendance inquiries, contact the office during school hours (Mon–Fri, 8:00 AM – 5:00 PM).
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-3 text-xs font-semibold text-amber-300">
              <span>📍 Langtad, City of Naga, Cebu</span>
              <span>•</span>
              <a href="mailto:303035@deped.gov.ph" className="hover:underline">✉️ 303035@deped.gov.ph</a>
            </div>
          </div>
        </div>
      </div>

      {/* Link Child by LRN Modal */}
      <Modal
        isOpen={showLinkModal}
        onClose={() => {
          setShowLinkModal(false);
          setLinkNotice(null);
        }}
        title="Link Learner to Parent Portal"
        subtitle="Connect your child using their official 12-digit DepEd Learner Reference Number (LRN)"
        maxWidth="md"
      >
        <form onSubmit={handleLinkChildByLrn} className="space-y-4">
          {linkNotice && (
            <Alert
              type={linkNotice.type}
              message={linkNotice.message}
              onClose={() => setLinkNotice(null)}
            />
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              12-Digit Learner Reference Number (LRN)
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={12}
                placeholder="e.g. 11951680082"
                value={linkLrnInput}
                onChange={(e) => setLinkLrnInput(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-mono font-bold text-slate-800 placeholder:text-slate-400 focus:border-[#1B2A4A] focus:outline-hidden"
                required
              />
              <Search className="h-4 w-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-500">
              You can find your child's 12-digit LRN on their DepEd Form 138 (SF9 report card) or school ID badge.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowLinkModal(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={linkingLrn || linkLrnInput.length < 10}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B2A4A] hover:bg-[#0f1c3f] px-5 py-2 text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
            >
              {linkingLrn ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              <span>{linkingLrn ? 'Verifying with Supabase...' : 'Link Child to Account'}</span>
            </button>
          </div>
        </form>
      </Modal>

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
                parent_contact: activeChild.guardian_contact || user?.phone || '',
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

              {/* Meeting Details if applicable */}
              {(selectedAnnouncement.meeting_date || selectedAnnouncement.venue || selectedAnnouncement.meeting_time) && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs space-y-1.5">
                  {selectedAnnouncement.meeting_date && (
                    <p className="text-slate-700">
                      <strong>Date &amp; Time:</strong> {selectedAnnouncement.meeting_date} {selectedAnnouncement.meeting_time ? `· ${selectedAnnouncement.meeting_time}` : ''}
                    </p>
                  )}
                  {selectedAnnouncement.venue && (
                    <p className="text-slate-700">
                      <strong>Venue:</strong> {selectedAnnouncement.venue}
                    </p>
                  )}
                </div>
              )}

              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedAnnouncement.content}
              </p>

              {/* Agenda items if present in Supabase */}
              {Array.isArray(selectedAnnouncement.agenda) && selectedAnnouncement.agenda.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <h5 className="text-xs font-bold text-slate-900 mb-1.5">Meeting Agenda:</h5>
                  <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
                    {selectedAnnouncement.agenda.map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>
                Published by{' '}
                <strong className="text-slate-700">
                  {selectedAnnouncement.author_name || selectedAnnouncement.author || 'Placido L. Señor NHS Administration'}
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
