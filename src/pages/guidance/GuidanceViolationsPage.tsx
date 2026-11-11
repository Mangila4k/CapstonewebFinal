import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Filter,
  AlertTriangle,
  FileText,
  Printer,
  Download,
  Eye,
  X,
  User,
  Calendar,
  MapPin,
  Check,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  HelpCircle,
  PhoneCall,
  BookOpen,
  ShieldCheck,
  Scale,
  Award,
  Users,
  Building,
  GraduationCap,
  MessageSquare,
  FileSpreadsheet,
} from 'lucide-react';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { Badge } from '../../components/common/Badge';
import { formatDate } from '../../lib/utils';

export interface EnrichedViolation {
  id: string;
  student_id?: string;
  lrn?: string;
  student_name: string;
  grade_level?: string;
  strand?: string;
  section?: string;
  violation_title: string;
  violation_category: 'Minor' | 'Moderate' | 'Major';
  violation_type: string;
  offense_level: '1st Offense' | '2nd Offense' | '3rd Offense' | 'Habitual' | string;
  incident_date: string;
  incident_time?: string;
  incident_location?: string;
  reported_by?: string;
  reporter_role?: string;
  description: string;
  witnesses?: string;
  action_taken?: string;
  sanction_details?: string;
  status: 'Pending' | 'Under Investigation' | 'Counseling Scheduled' | 'Parent Conference' | 'In Progress' | 'Resolved' | string;
  parent_notified?: boolean;
  parent_notified_date?: string;
  counseling_required?: boolean;
  counselor_notes?: string;
  resolution_date?: string;
  resolution_notes?: string;
  created_at?: string;
}

const FALLBACK_VIOLATIONS: EnrichedViolation[] = [
  {
    id: '596882e2-0832-463b-97eb-ee9523b93163',
    student_id: '4a2e12e1-16a1-454a-815f-5c2309e683ff',
    lrn: '11951680082',
    student_name: 'Jorvin Pengoc',
    grade_level: 'Grade 11',
    strand: 'TVL-ICT',
    section: 'ICT-11A',
    violation_title: 'Unauthorized Absence during 3rd Period (Cutting Classes)',
    violation_category: 'Minor',
    violation_type: 'Cutting Classes',
    offense_level: '2nd Offense',
    incident_date: '2026-10-05',
    incident_time: '01:30 PM',
    incident_location: 'School Canteen Area',
    reported_by: 'Mrs. Sellar',
    reporter_role: 'Teacher',
    description: 'Student left classroom during Computer Programming subject without permission or gate pass and stayed in the school canteen.',
    witnesses: 'Classmates in ICT-11A',
    action_taken: 'Guidance Counseling',
    sanction_details: 'Referred to Guidance Office for counseling session and behavior contract.',
    status: 'Counseling Scheduled',
    parent_notified: true,
    parent_notified_date: '2026-10-05',
    counseling_required: true,
    counselor_notes: 'Scheduled for individual counseling on Friday morning.',
  },
  {
    id: '81079b52-069a-43d4-9aba-e98dc21c6bed',
    student_id: '3bf8e2fb-93df-4e82-a491-9baab8cdea96',
    lrn: '091234567896',
    student_name: 'Mikhail Muralla',
    grade_level: 'Grade 11',
    strand: 'TVL-ICT',
    section: 'ICT-11B',
    violation_title: 'Verbal Altercation and Disrespectful Language in Hallway',
    violation_category: 'Major',
    violation_type: 'Bullying / Harassment',
    offense_level: '1st Offense',
    incident_date: '2026-10-01',
    incident_time: '10:15 AM',
    incident_location: 'Senior High Building 2nd Floor Hallway',
    reported_by: 'Mr. Quiroga',
    reporter_role: 'Teacher',
    description: 'Engaged in heated shouting and threatening remarks toward a fellow classmate following group project disagreement.',
    witnesses: '2 SHS Students',
    action_taken: 'Parent-Teacher Conference',
    sanction_details: 'Parent called for case conference with Guidance Counselor and Section Adviser.',
    status: 'In Progress',
    parent_notified: true,
    parent_notified_date: '2026-10-02',
    counseling_required: true,
    counselor_notes: 'Parents attended conference on Oct 3. Student committed to peer reconciliation.',
  },
];

export const GuidanceViolationsPage: React.FC = () => {
  const { user } = useAuth();
  const [violations, setViolations] = useState<EnrichedViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'All' | 'Minor' | 'Moderate' | 'Major'>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [gradeFilter, setGradeFilter] = useState<string>('All');

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<EnrichedViolation | null>(null);
  const [printCase, setPrintCase] = useState<EnrichedViolation | null>(null);
  const [statusUpdateVal, setStatusUpdateVal] = useState('');
  const [resolutionNotesVal, setResolutionNotesVal] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  // Log Incident Form
  const [form, setForm] = useState({
    studentName: '',
    lrn: '',
    gradeLevel: 'Grade 10',
    strand: 'JHS',
    section: 'Section Rizal',
    violationTitle: 'Unauthorized Absence during Period (Cutting Classes)',
    violationCategory: 'Minor' as 'Minor' | 'Moderate' | 'Major',
    violationType: 'Attendance / Cutting Classes',
    offenseLevel: '1st Offense' as '1st Offense' | '2nd Offense' | '3rd Offense' | 'Habitual',
    incidentDate: new Date().toISOString().split('T')[0],
    incidentTime: '09:30 AM',
    incidentLocation: 'School Grounds / Canteen Area',
    reportedBy: user?.full_name || 'Mrs. Guidance Counselor',
    reporterRole: 'Teacher / Staff',
    description: '',
    witnesses: '',
    actionTaken: 'Verbal Warning & Guidance Counseling Referral',
    parentNotified: false,
    counselingRequired: true,
  });

  // Fetch Violations from Supabase
  const fetchViolations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('student_violations')
        .select('*')
        .order('incident_date', { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: EnrichedViolation[] = data.map((v: any) => ({
          id: String(v.id),
          student_id: v.student_id,
          lrn: v.lrn || '11951800000',
          student_name: v.student_name,
          grade_level: v.grade_level || 'Grade 10',
          strand: v.strand || 'General',
          section: v.section || 'General',
          violation_title: v.violation_title || v.violation_type || 'Unspecified Violation',
          violation_category: (v.violation_category || 'Minor') as 'Minor' | 'Moderate' | 'Major',
          violation_type: v.violation_type || v.violation_title || 'General Conduct',
          offense_level: v.offense_level || '1st Offense',
          incident_date: v.incident_date || (v.created_at ? v.created_at.split('T')[0] : '2026-10-19'),
          incident_time: v.incident_time || '10:00 AM',
          incident_location: v.incident_location || 'Campus Grounds',
          reported_by: v.reported_by || 'Guidance Staff',
          reporter_role: v.reporter_role || 'Staff',
          description: v.description || 'No detailed narrative provided.',
          witnesses: v.witnesses || 'None recorded',
          action_taken: v.action_taken || 'Guidance Counseling',
          sanction_details: v.sanction_details || '',
          status: v.status || 'In Progress',
          parent_notified: Boolean(v.parent_notified),
          parent_notified_date: v.parent_notified_date,
          counseling_required: Boolean(v.counseling_required),
          counselor_notes: v.counselor_notes || '',
          resolution_date: v.resolution_date,
          resolution_notes: v.resolution_notes,
          created_at: v.created_at,
        }));
        setViolations(mapped);
      } else {
        setViolations(FALLBACK_VIOLATIONS);
      }
    } catch (err) {
      console.warn('Violations load error:', err);
      setViolations(FALLBACK_VIOLATIONS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  // Filtered violations
  const filteredViolations = useMemo(() => {
    return violations.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        v.student_name.toLowerCase().includes(q) ||
        (v.lrn && v.lrn.toLowerCase().includes(q)) ||
        v.violation_title.toLowerCase().includes(q) ||
        (v.incident_location && v.incident_location.toLowerCase().includes(q)) ||
        (v.reported_by && v.reported_by.toLowerCase().includes(q));

      const matchSeverity = severityFilter === 'All' || v.violation_category === severityFilter;
      const matchStatus = statusFilter === 'All' || v.status === statusFilter;
      const matchGrade = gradeFilter === 'All' || v.grade_level === gradeFilter;

      return matchQuery && matchSeverity && matchStatus && matchGrade;
    });
  }, [violations, searchQuery, severityFilter, statusFilter, gradeFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = violations.length;
    const minor = violations.filter((v) => v.violation_category === 'Minor').length;
    const moderate = violations.filter((v) => v.violation_category === 'Moderate').length;
    const major = violations.filter((v) => v.violation_category === 'Major').length;
    const active = violations.filter((v) => v.status !== 'Resolved').length;
    const counseling = violations.filter(
      (v) => v.status === 'Counseling Scheduled' || v.counseling_required
    ).length;
    const resolved = violations.filter((v) => v.status === 'Resolved').length;
    const complianceRate = total > 0 ? Math.round(((total - major) / total) * 100) : 100;

    return { total, minor, moderate, major, active, counseling, resolved, complianceRate };
  }, [violations]);

  // Handle logging new incident
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const generatedLrn = form.lrn.trim() || `119518${Math.floor(100000 + Math.random() * 900000)}`;
      const payload = {
        student_name: form.studentName.trim(),
        lrn: generatedLrn,
        grade_level: form.gradeLevel,
        strand: form.strand,
        section: form.section,
        violation_title: form.violationTitle.trim(),
        violation_type: form.violationType,
        violation_category: form.violationCategory,
        offense_level: form.offenseLevel,
        incident_date: form.incidentDate,
        incident_time: form.incidentTime,
        incident_location: form.incidentLocation,
        reported_by: form.reportedBy.trim() || user?.full_name || 'Guidance Counselor',
        reporter_role: form.reporterRole || 'Teacher / Staff',
        description: form.description.trim() || 'No narrative logged.',
        witnesses: form.witnesses.trim() || 'None',
        action_taken: form.actionTaken.trim() || 'Guidance Counseling Referral',
        sanction_details: form.actionTaken.trim()
          ? `Prescribed intervention: ${form.actionTaken.trim()}`
          : 'Prescribed intervention: Guidance Counseling Referral',
        status: form.counselingRequired ? 'Counseling Scheduled' : 'In Progress',
        parent_notified: form.parentNotified,
        parent_notified_date: form.parentNotified ? new Date().toISOString() : null,
        counseling_required: form.counselingRequired,
      };

      const { error } = await supabase.from('student_violations').insert([payload]);
      if (error) throw error;

      // Log to activity_logs
      await supabase.from('activity_logs').insert([
        {
          role: 'guidance',
          action: 'Incident Report Logged',
          details: `Logged ${payload.offense_level} (${payload.violation_title}) for student ${payload.student_name}.`,
          timestamp: new Date().toISOString(),
        },
      ]);

      setNotice({
        type: 'success',
        message: `Disciplinary incident for "${form.studentName}" has been successfully docketed in Supabase.`,
      });
      setIsLogModalOpen(false);
      setForm({
        studentName: '',
        lrn: '',
        gradeLevel: 'Grade 10',
        strand: 'JHS',
        section: 'Section Rizal',
        violationTitle: 'Unauthorized Absence during Period (Cutting Classes)',
        violationCategory: 'Minor',
        violationType: 'Attendance / Cutting Classes',
        offenseLevel: '1st Offense',
        incidentDate: new Date().toISOString().split('T')[0],
        incidentTime: '09:30 AM',
        incidentLocation: 'School Grounds / Canteen Area',
        reportedBy: user?.full_name || 'Mrs. Guidance Counselor',
        reporterRole: 'Teacher / Staff',
        description: '',
        witnesses: '',
        actionTaken: 'Verbal Warning & Guidance Counseling Referral',
        parentNotified: false,
        counselingRequired: true,
      });
      fetchViolations();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to log incident' });
    }
  };

  // Update Case Status & Resolution
  const handleUpdateStatus = async () => {
    if (!selectedCase || !statusUpdateVal) return;
    setIsSubmittingStatus(true);
    try {
      const updateData: any = {
        status: statusUpdateVal,
        updated_at: new Date().toISOString(),
      };
      if (resolutionNotesVal.trim()) {
        updateData.counselor_notes = resolutionNotesVal.trim();
        if (statusUpdateVal === 'Resolved') {
          updateData.resolution_notes = resolutionNotesVal.trim();
          updateData.resolution_date = new Date().toISOString().split('T')[0];
        }
      }

      const { error } = await supabase
        .from('student_violations')
        .update(updateData)
        .eq('id', selectedCase.id);

      if (error) throw error;

      // Activity log
      await supabase.from('activity_logs').insert([
        {
          role: 'guidance',
          action: 'Case Status Updated',
          details: `Updated incident case for ${selectedCase.student_name} to "${statusUpdateVal}".`,
          timestamp: new Date().toISOString(),
        },
      ]);

      setNotice({
        type: 'success',
        message: `Case status for ${selectedCase.student_name} updated to "${statusUpdateVal}".`,
      });
      setSelectedCase(null);
      fetchViolations();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to update case status.' });
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  // Schedule Counseling direct from case
  const handleDirectCounselingReferral = async (violation: EnrichedViolation) => {
    try {
      const payload = {
        student_name: violation.student_name,
        purpose: `Disciplinary Referral: ${violation.violation_title}`,
        session_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        counselor_name: user?.full_name || 'Guidance Counselor',
        status: 'Scheduled',
        notes: `Referred following ${violation.offense_level} (${violation.violation_title}). Reported by ${violation.reported_by || 'Teacher'}.`,
      };

      const { error } = await supabase.from('counseling_sessions').insert([payload]);
      if (error) throw error;

      // Update violation status
      await supabase
        .from('student_violations')
        .update({ status: 'Counseling Scheduled', counseling_required: true })
        .eq('id', violation.id);

      setNotice({
        type: 'success',
        message: `Counseling session successfully scheduled for ${violation.student_name}.`,
      });
      setSelectedCase(null);
      fetchViolations();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to schedule counseling session.' });
    }
  };

  // Export records to CSV
  const exportToCSV = () => {
    const headers = [
      'Case ID',
      'Student Name',
      'LRN',
      'Grade Level',
      'Section',
      'Violation Title',
      'Category',
      'Offense Level',
      'Incident Date',
      'Incident Time',
      'Location',
      'Reported By',
      'Reporter Role',
      'Action Taken',
      'Status',
      'Parent Notified',
      'Counseling Required',
    ];

    const rows = filteredViolations.map((v) => [
      `"${v.id}"`,
      `"${v.student_name}"`,
      `"${v.lrn || ''}"`,
      `"${v.grade_level || ''}"`,
      `"${v.section || ''}"`,
      `"${v.violation_title}"`,
      `"${v.violation_category}"`,
      `"${v.offense_level}"`,
      `"${v.incident_date}"`,
      `"${v.incident_time || ''}"`,
      `"${v.incident_location || ''}"`,
      `"${v.reported_by || ''}"`,
      `"${v.reporter_role || ''}"`,
      `"${v.action_taken || ''}"`,
      `"${v.status}"`,
      `"${v.parent_notified ? 'Yes' : 'No'}"`,
      `"${v.counseling_required ? 'Yes' : 'No'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `PLSNHS_Disciplinary_Log_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Trigger Print Slip
  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* 1. Institutional DepEd Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0f172a] font-display tracking-tight leading-snug">
              Student Incident &amp; Behavioral Violations
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Placido L. Señor NHS Student Welfare, Behavioral Records, and Disciplinary Case Tracking.
            </p>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2.5 shrink-0 ml-auto pt-0.5">
            <button
              type="button"
              onClick={() => setIsLogModalOpen(true)}
              className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer active:scale-98"
            >
              <ShieldAlert className="h-4 w-4" /> Log Incident
            </button>

            <button
              type="button"
              onClick={exportToCSV}
              className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer active:scale-98"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-700" /> Export CSV
            </button>

            <PageHeaderNotificationSlot />
          </div>
        </div>

        {/* Mobile Action Controls */}
        <div className="sm:hidden mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLogModalOpen(true)}
            className="flex-1 min-w-[130px] inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer active:scale-98"
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Log Incident
          </button>

          <button
            type="button"
            onClick={exportToCSV}
            className="flex-1 min-w-[120px] inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer active:scale-98"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" /> Export CSV
          </button>
        </div>
      </div>

      {notice && (
        <Alert
          type={notice.type}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}

      {/* Executive Metric Cards (4 KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Recorded Cases
            </span>
            <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <ShieldAlert className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-display">
              {stats.total}
            </span>
            <span className="text-xs text-slate-500 font-medium">docketed cases</span>
          </div>
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold text-[10px]">
              {stats.minor} Minor
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-semibold text-[10px]">
              {stats.major} Major
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Active / Follow-Up Cases
            </span>
            <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-display">
              {stats.active}
            </span>
            <span className="text-xs text-blue-700 font-medium">under action</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            Requiring guidance counseling or parent dialogue.
          </p>
        </div>

        {/* KPI 3 */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Counseling Referrals
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-display">
              {stats.counseling}
            </span>
            <span className="text-xs text-emerald-700 font-medium">assigned sessions</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            Positive counseling & behavioral contracts issued.
          </p>
        </div>

        {/* KPI 4 */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              DepEd Conduct Index
            </span>
            <div className="h-9 w-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-700 font-display">
              {stats.complianceRate}%
            </span>
            <span className="text-xs text-slate-500 font-medium">non-escalated</span>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            100% compliant with DO 40 Child Protection Policy.
          </p>
        </div>
      </div>

      {/* Search & Comprehensive Filter Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, LRN, offense, location, or reporting teacher..."
              className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Severity Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="All">All Severities</option>
                <option value="Minor">Minor Offense</option>
                <option value="Moderate">Moderate Offense</option>
                <option value="Major">Major Offense</option>
              </select>
            </div>

            {/* Grade Filter */}
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 focus:border-emerald-600 focus:outline-hidden"
            >
              <option value="All">All Grade Levels</option>
              <option value="Grade 7">Grade 7</option>
              <option value="Grade 8">Grade 8</option>
              <option value="Grade 9">Grade 9</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
            </select>

            {(searchQuery || severityFilter !== 'All' || statusFilter !== 'All' || gradeFilter !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSeverityFilter('All');
                  setStatusFilter('All');
                  setGradeFilter('All');
                }}
                className="px-2.5 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors font-semibold"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Status Filter:
          </span>
          {[
            { label: 'All Cases', value: 'All', count: violations.length },
            {
              label: 'Counseling Scheduled',
              value: 'Counseling Scheduled',
              count: violations.filter((v) => v.status === 'Counseling Scheduled').length,
            },
            {
              label: 'In Progress',
              value: 'In Progress',
              count: violations.filter((v) => v.status === 'In Progress').length,
            },
            {
              label: 'Under Investigation',
              value: 'Under Investigation',
              count: violations.filter((v) => v.status === 'Under Investigation').length,
            },
            {
              label: 'Resolved',
              value: 'Resolved',
              count: violations.filter((v) => v.status === 'Resolved').length,
            },
          ].map((pill) => (
            <button
              key={pill.value}
              onClick={() => setStatusFilter(pill.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === pill.value
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{pill.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === pill.value
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {pill.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-Column Responsive Institutional Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Incident Records Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-700" />
                  Official Disciplinary Docket & Behavioral Records
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Showing {filteredViolations.length} of {violations.length} recorded student infraction cases.
                </p>
              </div>

              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-full border border-emerald-200">
                DepEd Form 137 / SF Ready
              </span>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-500 font-medium">Loading disciplinary records from database...</p>
              </div>
            ) : filteredViolations.length === 0 ? (
              <div className="py-16 text-center px-4">
                <ShieldCheck className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">No disciplinary violations found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  No records match your active search or filter criteria. Try resetting filters or log a new incident.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSeverityFilter('All');
                    setStatusFilter('All');
                    setGradeFilter('All');
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3.5">Student Involved</th>
                      <th className="px-4 py-3.5">Violation & Location</th>
                      <th className="px-4 py-3.5">Offense & Severity</th>
                      <th className="px-4 py-3.5">Reporting & Parent</th>
                      <th className="px-4 py-3.5">Action & Date</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredViolations.map((v) => {
                      const initials = v.student_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();

                      return (
                        <tr
                          key={v.id}
                          className="hover:bg-slate-50/90 transition-colors group cursor-default"
                        >
                          {/* Student Involved */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-slate-800 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                                {initials}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors">
                                  {v.student_name}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-slate-600 font-semibold">
                                    LRN: {v.lrn || '11951800000'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {v.grade_level} · {v.section || v.strand}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Violation & Location */}
                          <td className="px-4 py-3.5 max-w-[200px]">
                            <div className="font-semibold text-slate-800 leading-snug line-clamp-2">
                              {v.violation_title}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                <MapPin className="h-2.5 w-2.5 text-slate-400" />
                                {v.incident_location || 'Campus'}
                              </span>
                              {v.incident_time && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                                  <Clock className="h-2.5 w-2.5" />
                                  {v.incident_time}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Offense & Severity */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="space-y-1">
                              <div>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    v.violation_category === 'Major'
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : v.violation_category === 'Moderate'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                  }`}
                                >
                                  {v.violation_category} Severity
                                </span>
                              </div>
                              <div className="text-[10px] font-semibold text-slate-600">
                                {v.offense_level}
                              </div>
                            </div>
                          </td>

                          {/* Reporting & Parent Status */}
                          <td className="px-4 py-3.5">
                            <div className="text-slate-700 font-medium text-[11px]">
                              {v.reported_by || 'Guidance Staff'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {v.reporter_role || 'Teacher'}
                            </div>
                            <div className="mt-1">
                              {v.parent_notified ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  <Check className="h-2.5 w-2.5 text-emerald-600" />
                                  Parent Notified
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  <Clock className="h-2.5 w-2.5 text-amber-600" />
                                  Pending Notice
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Action & Date */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-semibold text-slate-800 text-[11px]">
                              {v.action_taken || 'Counseling'}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <Calendar className="h-2.5 w-2.5" />
                              {formatDate(v.incident_date)}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                v.status === 'Resolved'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : v.status === 'Counseling Scheduled'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : v.status === 'Parent Conference'
                                  ? 'bg-slate-100 text-slate-800 border border-slate-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  v.status === 'Resolved'
                                    ? 'bg-emerald-600'
                                    : v.status === 'Counseling Scheduled'
                                    ? 'bg-blue-600'
                                    : 'bg-amber-600'
                                }`}
                              />
                              {v.status || 'In Progress'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedCase(v);
                                  setStatusUpdateVal(v.status);
                                  setResolutionNotesVal(v.counselor_notes || '');
                                }}
                                className="h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                                title="View full details and update case"
                              >
                                <Eye className="h-3.5 w-3.5 text-slate-600" />
                                <span>Details</span>
                              </button>

                              <button
                                onClick={() => setPrintCase(v)}
                                className="h-8 w-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center transition-colors cursor-pointer"
                                title="Print Official Incident Report Slip"
                              >
                                <Printer className="h-3.5 w-3.5 text-emerald-700" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Table Footer */}
            <div className="p-3.5 bg-slate-50/80 border-t border-slate-200 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                All behavioral and disciplinary logs comply with R.A. 10173 (Data Privacy Act of 2012)
                and DepEd Order No. 40, s. 2012.
              </span>
              <span className="font-semibold text-slate-700">
                Official Case Docket · Langtad, City of Naga
              </span>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Policy Matrix & Quick Tools */}
        <div className="lg:col-span-4 space-y-6">
          {/* DepEd Order No. 40, s. 2012 Positive Discipline Matrix */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 border-b border-slate-100 pb-3">
              <div className="h-8 w-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  DepEd Positive Discipline Protocol
                </h3>
                <p className="text-[11px] text-slate-500">DepEd Order No. 40, series 2012</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Disciplinary procedures must be educational, corrective, non-violent, and reinforce positive
              behavioral modification without corporal punishment or humiliation.
            </p>

            <div className="space-y-2.5">
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span>1st Offense (Minor)</span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-semibold">
                    Gentle Inquiry
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Teacher-student dialogue, verbal counseling, and student behavior reflection agreement.
                </p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                  <span>2nd Offense (Recurrent)</span>
                  <span className="text-[10px] bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded font-semibold">
                    Guidance Referral
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Official referral to Guidance Center, scheduled counseling, and written parent/guardian notice.
                </p>
              </div>

              <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                  <span>3rd / Major Offense</span>
                  <span className="text-[10px] bg-rose-200 text-rose-900 px-1.5 py-0.2 rounded font-semibold">
                    CPC Conference
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Multidisciplinary Child Protection Committee case conference, positive intervention contract,
                  and structured behavioral monitoring.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600 space-y-1.5">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Zero Corporal Punishment Compliance
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Strict prohibition of physical punishment, public scolding, or detention interfering with meals or transport.
              </p>
            </div>
          </div>

          {/* Campus Location Hotspots & Infraction Categories */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-700" />
              Infraction Types & Hotspots
            </h3>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-700 font-medium mb-1">
                  <span>Attendance & Cutting Classes</span>
                  <span className="font-bold text-slate-900">50%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '50%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-700 font-medium mb-1">
                  <span>Hallway & Peer Altercations</span>
                  <span className="font-bold text-slate-900">50%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: '50%' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-700 font-medium mb-1">
                  <span>Uniform & Campus ID Policies</span>
                  <span className="font-bold text-slate-900">0% (Compliant)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '0%' }} />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Primary Spot: Canteen & SHS Hallway</span>
              <span className="text-emerald-700 font-semibold">CCTV Monitored</span>
            </div>
          </div>

          {/* Child Protection Committee (CPC) Emergency Desk */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs uppercase tracking-wider">
              <PhoneCall className="h-4 w-4 text-emerald-700" />
              Child Protection Help Desk
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              If an incident involves bullying, abuse, discrimination, or grave peer conflict, immediately notify
              the School Child Protection Committee.
            </p>
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex items-center justify-between py-1 border-b border-emerald-100/80">
                <span className="text-slate-500">School Head / Chair:</span>
                <span className="font-bold text-slate-900">Dr. Ryan R. Quiroga</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-emerald-100/80">
                <span className="text-slate-500">Guidance Focal:</span>
                <span className="font-bold text-slate-900">Mrs. S. Guidance</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">DepEd LRPO Hotline:</span>
                <span className="font-mono font-bold text-emerald-800">(02) 8632-1372</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Log Disciplinary Incident Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title="Log Disciplinary Incident"
        subtitle="Record behavioral infraction in accordance with DepEd Child Protection Policy"
      >
        <form onSubmit={handleCreate} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* Student Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Student Full Name *
              </label>
              <input
                type="text"
                required
                value={form.studentName}
                onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                placeholder="e.g. Juan Dela Cruz"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Learner Reference Number (LRN)
              </label>
              <input
                type="text"
                maxLength={12}
                value={form.lrn}
                onChange={(e) => setForm({ ...form, lrn: e.target.value.replace(/\D/g, '') })}
                placeholder="12-digit DepEd LRN (e.g. 11951680082)"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-mono focus:bg-white focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Grade, Strand, Section */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Grade Level
              </label>
              <select
                value={form.gradeLevel}
                onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Strand / Track
              </label>
              <input
                type="text"
                value={form.strand}
                onChange={(e) => setForm({ ...form, strand: e.target.value })}
                placeholder="e.g. TVL-ICT or JHS"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Section
              </label>
              <input
                type="text"
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                placeholder="e.g. ICT-11A"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Violation Details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Violation Title / Incident Summary *
            </label>
            <input
              type="text"
              required
              value={form.violationTitle}
              onChange={(e) => setForm({ ...form, violationTitle: e.target.value })}
              placeholder="e.g. Unauthorized Absence during 3rd Period (Cutting Classes)"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          {/* Severity & Offense Level */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Severity Category
              </label>
              <select
                value={form.violationCategory}
                onChange={(e) => setForm({ ...form, violationCategory: e.target.value as any })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="Minor">Minor Offense</option>
                <option value="Moderate">Moderate Offense</option>
                <option value="Major">Major Offense</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Offense Level
              </label>
              <select
                value={form.offenseLevel}
                onChange={(e) => setForm({ ...form, offenseLevel: e.target.value as any })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="1st Offense">1st Offense</option>
                <option value="2nd Offense">2nd Offense</option>
                <option value="3rd Offense">3rd Offense</option>
                <option value="Habitual">Habitual Offense</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Incident Date
              </label>
              <input
                type="date"
                required
                value={form.incidentDate}
                onChange={(e) => setForm({ ...form, incidentDate: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              >
              </input>
            </div>
          </div>

          {/* Location & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Location on Campus
              </label>
              <input
                type="text"
                value={form.incidentLocation}
                onChange={(e) => setForm({ ...form, incidentLocation: e.target.value })}
                placeholder="e.g. School Canteen Area / 2nd Floor Hallway"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Incident Time
              </label>
              <input
                type="text"
                value={form.incidentTime}
                onChange={(e) => setForm({ ...form, incidentTime: e.target.value })}
                placeholder="e.g. 01:30 PM"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Reporting Personnel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Reported By (Teacher / Officer)
              </label>
              <input
                type="text"
                required
                value={form.reportedBy}
                onChange={(e) => setForm({ ...form, reportedBy: e.target.value })}
                placeholder="e.g. Mrs. Sellar"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Reporter Role
              </label>
              <select
                value={form.reporterRole}
                onChange={(e) => setForm({ ...form, reporterRole: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="Subject Teacher">Subject Teacher</option>
                <option value="Class Adviser">Class Adviser</option>
                <option value="Prefect of Discipline">Prefect of Discipline</option>
                <option value="Guidance Counselor">Guidance Counselor</option>
                <option value="Campus Guard / Staff">Campus Guard / Staff</option>
              </select>
            </div>
          </div>

          {/* Narrative */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Factual Incident Narrative / Description *
            </label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="State clear, objective facts regarding what transpired, student actions, and circumstances..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          {/* Action Taken & Interventions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Initial Action Taken / Prescribed Positive Intervention
            </label>
            <input
              type="text"
              required
              value={form.actionTaken}
              onChange={(e) => setForm({ ...form, actionTaken: e.target.value })}
              placeholder="e.g. Referred to Guidance Counselor for counseling session & behavior agreement"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:bg-white focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={form.parentNotified}
                onChange={(e) => setForm({ ...form, parentNotified: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-medium text-slate-700">
                Parent / Guardian notified via SMS / call
              </span>
            </label>

            <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={form.counselingRequired}
                onChange={(e) => setForm({ ...form, counselingRequired: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-medium text-slate-700">
                Requires mandatory Guidance counseling
              </span>
            </label>
          </div>

          {/* Submit buttons */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsLogModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 px-5 py-2 text-xs font-bold text-white shadow-xs transition-all"
            >
              Save Incident Record
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Case Details & Resolution Management Modal */}
      {selectedCase && (
        <Modal
          isOpen={Boolean(selectedCase)}
          onClose={() => setSelectedCase(null)}
          title={`Case File: ${selectedCase.student_name}`}
          subtitle={`Incident Docket #${selectedCase.id.slice(0, 8)} · ${selectedCase.offense_level}`}
        >
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            {/* Student Banner */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="text-sm font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-amber-400" />
                  {selectedCase.student_name}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  LRN: {selectedCase.lrn || '11951800000'} · {selectedCase.grade_level} (
                  {selectedCase.section || selectedCase.strand})
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  selectedCase.violation_category === 'Major'
                    ? 'bg-rose-500 text-white'
                    : 'bg-amber-500 text-slate-950'
                }`}
              >
                {selectedCase.violation_category} Severity
              </span>
            </div>

            {/* Violation Particulars */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Violation Title</span>
                <p className="font-semibold text-slate-800">{selectedCase.violation_title}</p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Date & Location</span>
                <p className="font-semibold text-slate-800">
                  {formatDate(selectedCase.incident_date)} at {selectedCase.incident_location}
                </p>
              </div>
            </div>

            {/* Narrative */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Official Incident Narrative
              </span>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedCase.description}
              </p>
            </div>

            {/* Reporting & Action */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Reported By</span>
                <p className="font-semibold text-slate-800">
                  {selectedCase.reported_by} ({selectedCase.reporter_role || 'Staff'})
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Action Prescribed</span>
                <p className="font-semibold text-slate-800">{selectedCase.action_taken}</p>
              </div>
            </div>

            {/* Case Progression / Status Update */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase">
                  Update Case Status & Intervention
                </span>
                <span className="text-[11px] text-slate-500">Current: {selectedCase.status}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  'Counseling Scheduled',
                  'In Progress',
                  'Parent Conference',
                  'Resolved',
                ].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusUpdateVal(st)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                      statusUpdateVal === st
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Counselor Notes / Resolution Documentation
                </label>
                <textarea
                  rows={2}
                  value={resolutionNotesVal}
                  onChange={(e) => setResolutionNotesVal(e.target.value)}
                  placeholder="Record counseling outcome, parent agreement, or behavioral remediation summary..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => handleDirectCounselingReferral(selectedCase)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Users className="h-3.5 w-3.5" /> Book Counseling Session
                </button>

                <button
                  type="button"
                  disabled={isSubmittingStatus}
                  onClick={handleUpdateStatus}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> Save Status Update
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setPrintCase(selectedCase);
                  setSelectedCase(null);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4 text-slate-600" /> Print Official Case Slip
              </button>

              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Close File
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: Official DepEd Disciplinary Incident Report / Case Slip (Printable) */}
      {printCase && (
        <Modal
          isOpen={Boolean(printCase)}
          onClose={() => setPrintCase(null)}
          title="Official Disciplinary Incident Slip"
          subtitle="DepEd Standard Child Protection & Disciplinary Case Report"
        >
          <div className="space-y-4 max-h-[85vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
              <span className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-emerald-700" />
                Click "Print Official Slip" below to print or save as PDF.
              </span>
              <button
                onClick={triggerPrint}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Print Official Slip
              </button>
            </div>

            {/* Printable Document Sheet */}
            <div
              id="printable-slip"
              className="border-2 border-slate-300 rounded-xl p-6 bg-white space-y-6 text-slate-900 font-serif shadow-xs"
            >
              {/* Official DepEd Header */}
              <div className="text-center space-y-1 border-b-2 border-slate-900 pb-4">
                <div className="text-[11px] font-sans tracking-wider uppercase text-slate-600">
                  Republic of the Philippines
                </div>
                <div className="text-sm font-bold tracking-wide uppercase text-slate-900 font-sans">
                  Department of Education
                </div>
                <div className="text-[11px] text-slate-600 font-sans">
                  Region VII, Central Visayas · Schools Division of City of Naga
                </div>
                <div className="text-base font-extrabold text-slate-900 uppercase font-sans tracking-tight pt-1">
                  Placido L. Señor National High School
                </div>
                <div className="text-[10px] text-slate-500 font-sans">
                  Langtad, City of Naga, Cebu · School ID: 303035 · Email: 303035@deped.gov.ph · FB: Placido L. Senor 303035
                </div>
                <div className="text-xs font-bold tracking-widest uppercase text-emerald-900 pt-2 font-sans">
                  GUIDANCE & COUNSELING CENTER · CHILD PROTECTION COMMITTEE
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center">
                <h3 className="text-base font-extrabold uppercase tracking-wide text-slate-900 font-sans">
                  Official Disciplinary Incident Report & Action Slip
                </h3>
                <p className="text-[11px] text-slate-500 font-sans italic">
                  Pursuant to DepEd Order No. 40, s. 2012 (Child Protection Policy)
                </p>
                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  Docket No: PLSNHS-IR-2026-{printCase.id.slice(0, 8).toUpperCase()}
                </div>
              </div>

              {/* Student Personal Particulars */}
              <div className="border border-slate-300 rounded-lg p-3 text-xs font-sans space-y-2 bg-slate-50/50">
                <div className="font-bold uppercase tracking-wider text-[10px] text-slate-500 border-b border-slate-200 pb-1">
                  I. Student Personal Information
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Learner's Name:</span>{' '}
                    <span className="font-bold text-slate-900">{printCase.student_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">DepEd LRN:</span>{' '}
                    <span className="font-mono font-bold text-slate-900">{printCase.lrn || '11951680082'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Grade Level & Section:</span>{' '}
                    <span className="font-semibold text-slate-900">
                      {printCase.grade_level} — {printCase.section || printCase.strand}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Academic Year:</span>{' '}
                    <span className="font-semibold text-slate-900">2026–2027</span>
                  </div>
                </div>
              </div>

              {/* Incident Details */}
              <div className="border border-slate-300 rounded-lg p-3 text-xs font-sans space-y-2 bg-slate-50/50">
                <div className="font-bold uppercase tracking-wider text-[10px] text-slate-500 border-b border-slate-200 pb-1">
                  II. Particulars of Infraction
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Nature of Infraction:</span>{' '}
                    <span className="font-bold text-slate-900">{printCase.violation_title}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Offense Classification:</span>{' '}
                    <span className="font-bold text-slate-900">
                      {printCase.violation_category} ({printCase.offense_level})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Date & Time of Incident:</span>{' '}
                    <span className="font-semibold text-slate-900">
                      {formatDate(printCase.incident_date)} ({printCase.incident_time || '10:00 AM'})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Campus Location:</span>{' '}
                    <span className="font-semibold text-slate-900">
                      {printCase.incident_location || 'Campus Grounds'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Reporting Officer / Teacher:</span>{' '}
                    <span className="font-semibold text-slate-900">{printCase.reported_by}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Parent Notified:</span>{' '}
                    <span className="font-semibold text-slate-900">
                      {printCase.parent_notified ? 'Yes (Notified)' : 'Pending Dialogue'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Factual Narrative */}
              <div className="border border-slate-300 rounded-lg p-3 text-xs font-sans space-y-1.5">
                <div className="font-bold uppercase tracking-wider text-[10px] text-slate-500 border-b border-slate-200 pb-1">
                  III. Factual Narrative of Incident
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-sans">
                  {printCase.description}
                </p>
              </div>

              {/* Action Taken & Prescribed Positive Intervention */}
              <div className="border border-slate-300 rounded-lg p-3 text-xs font-sans space-y-1.5">
                <div className="font-bold uppercase tracking-wider text-[10px] text-slate-500 border-b border-slate-200 pb-1">
                  IV. Prescribed Guidance Intervention & Resolution
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-sans">
                  {printCase.action_taken || 'Guidance Counseling Session and Parent Dialogue'}
                </p>
                {printCase.counselor_notes && (
                  <p className="text-xs text-slate-600 font-sans italic border-t border-slate-200 pt-1">
                    Counselor Annotation: {printCase.counselor_notes}
                  </p>
                )}
              </div>

              {/* Official Signatures */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-xs font-sans">
                <div className="text-center space-y-1">
                  <div className="border-b border-slate-900 w-3/4 mx-auto pb-6" />
                  <div className="font-bold uppercase text-slate-900">{printCase.student_name}</div>
                  <div className="text-[10px] text-slate-500">Learner's Conforme</div>
                </div>

                <div className="text-center space-y-1">
                  <div className="border-b border-slate-900 w-3/4 mx-auto pb-6" />
                  <div className="font-bold uppercase text-slate-900">Parent / Guardian Signature</div>
                  <div className="text-[10px] text-slate-500">Parent / Legal Guardian</div>
                </div>

                <div className="text-center space-y-1 pt-4">
                  <div className="border-b border-slate-900 w-3/4 mx-auto pb-6" />
                  <div className="font-bold uppercase text-slate-900">
                    {printCase.reported_by || 'Reporting Teacher'}
                  </div>
                  <div className="text-[10px] text-slate-500">Reporting Teacher / Staff</div>
                </div>

                <div className="text-center space-y-1 pt-4">
                  <div className="border-b border-slate-900 w-3/4 mx-auto pb-6" />
                  <div className="font-bold uppercase text-slate-900">Dr. Ryan R. Quiroga</div>
                  <div className="text-[10px] text-slate-500">School Principal / CPC Head</div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPrintCase(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={triggerPrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print Document
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
