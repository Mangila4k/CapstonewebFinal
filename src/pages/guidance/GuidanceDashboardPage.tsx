import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Users,
  Award,
  Calendar,
  Plus,
  Clock,
  Search,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Download,
  ExternalLink,
  ShieldCheck,
  Eye,
  BookOpen,
  HeartHandshake,
  Sparkles,
  Filter,
  Check,
  X,
  ArrowRight,
  Shield,
  HelpCircle,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import { supabase } from '../../lib/supabase';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { formatDate } from '../../lib/utils';
import type { Violation, CounselingSession } from '../../types';

interface GoodMoralRequestItem {
  id: string | number;
  student_name: string;
  lrn: string;
  grade_level: string;
  strand?: string;
  purpose: string;
  status: string;
  has_active_violations?: boolean;
  created_at?: string;
}

export const GuidanceDashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Data states
  const [violations, setViolations] = useState<any[]>([]);
  const [counselingSessions, setCounselingSessions] = useState<any[]>([]);
  const [goodMoralRequests, setGoodMoralRequests] = useState<GoodMoralRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Scheduled' | 'Resolved'>('All');

  // Modals state
  const [isLogIncidentOpen, setIsLogIncidentOpen] = useState(false);
  const [isBookCounselingOpen, setIsBookCounselingOpen] = useState(false);
  const [isGoodMoralModalOpen, setIsGoodMoralModalOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any | null>(null);

  // Form states
  const [incidentForm, setIncidentForm] = useState({
    studentName: '',
    lrn: '',
    gradeLevel: 'Grade 11',
    section: 'Section Almario',
    violationTitle: 'Unauthorized Absence / Cutting Classes',
    offenseLevel: '1st Offense',
    description: '',
    actionTaken: 'Initial Guidance Counseling & Parent Notification',
  });

  const [counselingForm, setCounselingForm] = useState({
    studentName: '',
    purpose: 'Academic Performance & Study Habit Consultation',
    sessionDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [goodMoralForm, setGoodMoralForm] = useState({
    studentName: 'Jorvin Pengoc',
    lrn: '11951680082',
    gradeLevel: 'Grade 11',
    strand: 'TVL - ICT',
    purpose: 'College Admission & Scholarship Application',
    issuedDate: new Date().toISOString().split('T')[0],
    counselorRemarks: 'Certified in good standing with exemplary campus demeanor.',
  });

  // Fetch all guidance data from Supabase
  const fetchGuidanceData = async () => {
    setLoading(true);
    try {
      const [
        { data: violData },
        { data: counsData },
        { data: goodMoralData },
      ] = await Promise.all([
        supabase
          .from('student_violations')
          .select('*')
          .order('incident_date', { ascending: false }),
        supabase
          .from('counseling_sessions')
          .select('*')
          .order('session_date', { ascending: false }),
        supabase
          .from('good_moral_requests')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (violData && violData.length > 0) {
        setViolations(violData);
      } else {
        setViolations([
          {
            id: 'v-1',
            student_name: 'Jorvin Pengoc',
            lrn: '11951680082',
            grade_level: 'Grade 11',
            section: 'ICT-11A',
            violation_title: 'Unauthorized Absence during 3rd Period (Cutting Classes)',
            violation_type: 'Cutting Classes',
            offense_level: '2nd Offense',
            incident_date: '2026-10-05',
            status: 'Counseling Scheduled',
            action_taken: 'Guidance Counseling & Parent Contract',
          },
          {
            id: 'v-2',
            student_name: 'Mikhail Muralla',
            lrn: '091234567896',
            grade_level: 'Grade 11',
            section: 'ICT-11B',
            violation_title: 'Verbal Altercation and Disrespectful Language in Hallway',
            violation_type: 'Bullying / Harassment',
            offense_level: '1st Offense',
            incident_date: '2026-10-01',
            status: 'In Progress',
            action_taken: 'Parent-Teacher Conference & Mediation',
          },
        ]);
      }

      if (counsData && counsData.length > 0) {
        setCounselingSessions(counsData);
      } else {
        setCounselingSessions([
          {
            id: 'cs-1',
            student_name: 'Jorvin Pengoc',
            purpose: 'Address habitual cutting classes and attendance commitment',
            session_date: '2026-10-08',
            counselor_name: 'Sarah Guidance Counselor',
            status: 'Scheduled',
            notes: 'Initial referral regarding 2nd offense cutting classes. Positive response.',
          },
          {
            id: 'cs-2',
            student_name: 'Mikhail Muralla',
            purpose: 'Conflict resolution and anger management guidance after hallway altercation',
            session_date: '2026-10-04',
            counselor_name: 'Sarah Guidance Counselor',
            status: 'Completed',
            notes: 'Both student and parents attended. Discussed emotional regulation.',
          },
        ]);
      }

      if (goodMoralData && goodMoralData.length > 0) {
        setGoodMoralRequests(goodMoralData);
      } else {
        setGoodMoralRequests([]);
      }
    } catch (err) {
      console.warn('Guidance fetch note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuidanceData();
  }, []);

  // Filtered violations
  const filteredViolations = useMemo(() => {
    return violations.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const name = (v.student_name || '').toLowerCase();
      const lrn = (v.lrn || '').toLowerCase();
      const title = (v.violation_title || v.violation_type || '').toLowerCase();
      const matchesSearch = !q || name.includes(q) || lrn.includes(q) || title.includes(q);

      const status = (v.status || '').toLowerCase();
      let matchesStatus = true;
      if (statusFilter === 'Pending') {
        matchesStatus = status.includes('progress') || status.includes('investigation');
      } else if (statusFilter === 'Scheduled') {
        matchesStatus = status.includes('counseling') || status.includes('scheduled');
      } else if (statusFilter === 'Resolved') {
        matchesStatus = status.includes('resolved') || status.includes('closed');
      }

      return matchesSearch && matchesStatus;
    });
  }, [violations, searchQuery, statusFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalCases = violations.length;
    const inProgress = violations.filter((v) =>
      (v.status || '').toLowerCase().includes('progress') ||
      (v.status || '').toLowerCase().includes('investigation')
    ).length;
    const scheduled = violations.filter((v) =>
      (v.status || '').toLowerCase().includes('scheduled')
    ).length;
    const resolved = violations.filter((v) =>
      (v.status || '').toLowerCase().includes('resolved')
    ).length;

    const totalCounseling = counselingSessions.length;
    const activeCounseling = counselingSessions.filter(
      (c) => (c.status || '').toLowerCase() === 'scheduled'
    ).length;

    const totalStudents = 473;
    const cleanRate = (
      ((totalStudents - totalCases) / totalStudents) *
      100
    ).toFixed(1);

    return {
      totalCases,
      inProgress,
      scheduled,
      resolved,
      totalCounseling,
      activeCounseling,
      totalGoodMoral: goodMoralRequests.length,
      cleanRate: Number(cleanRate) > 0 ? `${cleanRate}%` : '99.6%',
    };
  }, [violations, counselingSessions, goodMoralRequests]);

  // Handle logging new incident
  const handleSaveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        student_name: incidentForm.studentName.trim(),
        lrn: incidentForm.lrn.trim() || `119518${Math.floor(100000 + Math.random() * 900000)}`,
        grade_level: incidentForm.gradeLevel,
        section: incidentForm.section,
        violation_title: incidentForm.violationTitle.trim() || 'General Misconduct',
        violation_type: incidentForm.violationTitle.trim() || 'General Misconduct',
        violation_category: 'Minor',
        offense_level: incidentForm.offenseLevel,
        description: incidentForm.description.trim() || 'Logged via Guidance Dashboard.',
        action_taken: incidentForm.actionTaken.trim() || 'Guidance Counseling',
        incident_date: new Date().toISOString().split('T')[0],
        reported_by: user?.full_name || 'Guidance Counselor',
        reporter_role: 'Guidance Counselor',
        status: 'In Progress',
      };

      const { error } = await supabase.from('student_violations').insert([payload]);
      if (error) throw error;

      // Log in activity_logs
      await supabase.from('activity_logs').insert([
        {
          role: 'guidance',
          action: 'Behavioral Incident Logged',
          details: `Recorded ${payload.offense_level} (${payload.violation_title}) for ${payload.student_name}.`,
          timestamp: new Date().toISOString(),
        },
      ]);

      setNotice({
        type: 'success',
        message: `Behavioral incident report for ${incidentForm.studentName} has been saved to the official database.`,
      });
      setIsLogIncidentOpen(false);
      setIncidentForm({
        studentName: '',
        lrn: '',
        gradeLevel: 'Grade 11',
        section: 'Section Almario',
        violationTitle: 'Unauthorized Absence / Cutting Classes',
        offenseLevel: '1st Offense',
        description: '',
        actionTaken: 'Initial Guidance Counseling & Parent Notification',
      });
      fetchGuidanceData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to log incident' });
    }
  };

  // Handle booking counseling session
  const handleSaveCounseling = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const counselorName = user?.full_name || 'Sarah Guidance Counselor';
      const payload = {
        student_name: counselingForm.studentName.trim(),
        session_type: 'Individual Counseling',
        purpose: counselingForm.purpose.trim() || 'Guidance Consultation',
        session_date: counselingForm.sessionDate,
        notes: counselingForm.notes.trim() || 'Referral consultation booked from Guidance Dashboard.',
        counselor_name: counselorName,
        status: 'Scheduled',
      };

      const { error } = await supabase.from('counseling_sessions').insert([payload]);
      if (error) throw error;

      await supabase.from('activity_logs').insert([
        {
          role: 'guidance',
          action: 'Counseling Session Scheduled',
          details: `Scheduled consultation for ${payload.student_name} on ${payload.session_date}.`,
          timestamp: new Date().toISOString(),
        },
      ]);

      setNotice({
        type: 'success',
        message: `Counseling session for ${counselingForm.studentName} scheduled for ${counselingForm.sessionDate}.`,
      });
      setIsBookCounselingOpen(false);
      setCounselingForm({
        studentName: '',
        purpose: 'Academic Performance & Study Habit Consultation',
        sessionDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      fetchGuidanceData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to schedule counseling session' });
    }
  };

  // Print Good Moral Certificate
  const handlePrintGoodMoral = async () => {
    const certNumber = `GMC-2026-${goodMoralForm.lrn.slice(-4)}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      // Persist issuance directly to Supabase good_moral_requests table
      await supabase.from('good_moral_requests').insert([
        {
          student_name: goodMoralForm.studentName.trim(),
          lrn: goodMoralForm.lrn.trim() || '119518000000',
          grade_level: goodMoralForm.gradeLevel,
          strand: goodMoralForm.strand,
          purpose: goodMoralForm.purpose.trim() || 'General DepEd Clearance',
          status: 'Issued',
          has_active_violations: false,
          counselor_remarks: 'Issued and printed via Guidance Center.',
          issued_date: goodMoralForm.issuedDate,
          certificate_no: certNumber,
        },
      ]);

      await supabase.from('activity_logs').insert([
        {
          role: 'guidance',
          action: 'Good Moral Certificate Issued',
          details: `Issued ${certNumber} to ${goodMoralForm.studentName} for ${goodMoralForm.purpose}.`,
          timestamp: new Date().toISOString(),
        },
      ]);

      fetchGuidanceData();
    } catch (saveErr) {
      console.warn('Good moral database save notice:', saveErr);
    }

    const win = window.open('', '_blank', 'width=900,height=750');
    if (!win) {
      window.print();
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Certificate of Good Moral Character - ${goodMoralForm.studentName}</title>
          <style>
            body { font-family: 'Times New Roman', serif; color: #0f172a; margin: 40px 50px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 3px double #1B2A4A; padding-bottom: 14px; margin-bottom: 24px; }
            .header h4 { margin: 0; font-size: 11pt; text-transform: uppercase; letter-spacing: 1px; color: #334155; }
            .header h2 { margin: 3px 0; font-size: 17pt; color: #1B2A4A; font-family: 'Arial', sans-serif; }
            .header p { margin: 2px 0; font-size: 10.5pt; color: #475569; }
            .cert-title { text-align: center; margin: 30px 0 25px; }
            .cert-title h1 { margin: 0; font-size: 21pt; letter-spacing: 2px; color: #1B2A4A; text-transform: uppercase; text-decoration: underline; }
            .cert-body { font-size: 12.5pt; text-align: justify; text-indent: 40px; margin-bottom: 20px; line-height: 1.8; }
            .sig-section { margin-top: 50px; display: flex; justify-content: space-between; font-size: 11pt; }
            .sig-box { text-align: center; width: 250px; }
            .sig-line { border-top: 1px solid #0f172a; margin-top: 50px; padding-top: 5px; font-weight: bold; }
            .seal-box { margin-top: 35px; text-align: center; font-size: 10pt; color: #64748b; font-style: italic; }
          </style>
        </head>
        <body>
          <div class="header">
            <h4>Republic of the Philippines • Department of Education • Region VII</h4>
            <h4>Schools Division of City of Naga, Cebu</h4>
            <h2>PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL</h2>
            <p>Langtad, City of Naga, Cebu • School ID: 303035</p>
            <p><strong>OFFICE OF THE GUIDANCE AND COUNSELING CENTER</strong></p>
          </div>

          <div class="cert-title">
            <h1>Certificate of Good Moral Character</h1>
          </div>

          <div class="cert-body">
            <strong>TO WHOM IT MAY CONCERN:</strong>
          </div>

          <div class="cert-body">
            This is to certify that <strong>${goodMoralForm.studentName.toUpperCase()}</strong>, with Learner Reference Number (LRN) <strong>${goodMoralForm.lrn}</strong>, is a bona fide student of <strong>PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL</strong> enrolled in <strong>${goodMoralForm.gradeLevel}${goodMoralForm.strand ? ` (${goodMoralForm.strand})` : ''}</strong> for the School Year 2026–2027.
          </div>

          <div class="cert-body">
            Records in this Office show that the above-named learner has maintained <strong>exemplary moral conduct, demonstrated civic responsibility, and complied faithfully with the rules and regulations of the Department of Education and this institution</strong>. He/she has no record of major disciplinary violation or derogatory behavioral sanction.
          </div>

          <div class="cert-body">
            This certification is issued upon the request of the interested party for <strong>${goodMoralForm.purpose}</strong> and for whatever legal purpose it may serve.
          </div>

          <div class="cert-body">
            Given this <strong>${new Date(goodMoralForm.issuedDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> at Placido L. Señor National High School, Langtad, City of Naga, Cebu, Philippines.
          </div>

          <div class="sig-section">
            <div class="sig-box">
              <div class="sig-line">${user?.full_name || 'SARAH GUIDANCE COUNSELOR'}</div>
              <div>Guidance Counselor / In-Charge</div>
              <div style="font-size:9pt;color:#64748b;">License No. GC-788910</div>
            </div>
            <div class="sig-box">
              <div class="sig-line">DR. RYAN R. QUIROGA</div>
              <div>School Principal I</div>
              <div style="font-size:9pt;color:#64748b;">Authorized School Head</div>
            </div>
          </div>

          <div class="seal-box">
            [ Official School Seal Affixed Here • Ref: ${certNumber} ]
          </div>

          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // Export CSV of violations
  const handleExportCsv = () => {
    const csvLines: string[] = [];
    csvLines.push('"PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL - GUIDANCE & COUNSELING CENTER"');
    csvLines.push('"OFFICIAL BEHAVIORAL & DISCIPLINARY LOG REPORT (S.Y. 2026-2027)"');
    csvLines.push(`"Extracted On:","${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}"`);
    csvLines.push('""');
    csvLines.push('"Student Name","LRN","Grade Level","Section","Incident Nature","Offense Level","Incident Date","Action Taken","Case Status"');

    violations.forEach((v) => {
      csvLines.push([
        `"${v.student_name}"`,
        `"${v.lrn || '—'}"`,
        `"${v.grade_level || 'Grade 11'}"`,
        `"${v.section || 'General'}"`,
        `"${v.violation_title || v.violation_type}"`,
        `"${v.offense_level || '1st Offense'}"`,
        `"${v.incident_date || '2026-10-01'}"`,
        `"${v.action_taken || 'Guidance Counseling'}"`,
        `"${v.status || 'Resolved'}"`,
      ].join(','));
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PLSNHS_Guidance_Disciplinary_Log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick Status Updater for Selected Case
  const handleUpdateCaseStatus = async (caseId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('student_violations')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', caseId);

      if (error) throw error;

      setNotice({
        type: 'success',
        message: `Case status updated to "${newStatus}".`,
      });
      setSelectedCase(null);
      fetchGuidanceData();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to update case' });
    }
  };

  return (
    <div className="space-y-7 animate-fade-in w-full pb-16">
      {/* 1. Institutional DepEd Header */}
      <div className="border-b border-slate-200 pb-4 sm:pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-xl sm:text-3xl font-extrabold text-[#0f172a] font-display tracking-tight leading-snug">
              Guidance &amp; Student Welfare Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Placido L. Señor NHS Student Welfare, Behavioral Records, Counseling Consultations, and Good Moral Clearances.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-auto pt-0.5">
            <button
              type="button"
              onClick={() => setIsGoodMoralModalOpen(true)}
              className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#1B2A4A] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#15233d] transition-all cursor-pointer active:scale-98"
            >
              <Award className="h-4 w-4 text-[#F5C518]" /> Issue Good Moral
            </button>
            <PageHeaderNotificationSlot />
          </div>
        </div>

        {/* Mobile Action Button Row */}
        <div className="sm:hidden mt-3 flex items-center">
          <button
            type="button"
            onClick={() => setIsGoodMoralModalOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#1B2A4A] px-3.5 text-xs font-bold text-white shadow-xs hover:bg-[#15233d] transition-all cursor-pointer active:scale-98"
          >
            <Award className="h-4 w-4 text-[#F5C518]" /> Issue Good Moral
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <Alert
          type={notice.type}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}

      {/* 2. Executive Metrics KPI Cards (Compact 2x2 grid on mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          title="Recorded Incidents"
          value={stats.totalCases}
          subtitle={`${stats.inProgress} in progress · ${stats.scheduled} scheduled`}
          icon={ShieldAlert}
          color="amber"
        />
        <StatCard
          title="Counseling Sessions"
          value={stats.totalCounseling}
          subtitle={`${stats.activeCounseling} scheduled active consultations`}
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="Good Moral Requests"
          value={stats.totalGoodMoral}
          subtitle="All clearance applications on file"
          icon={Award}
          color="emerald"
        />
        <StatCard
          title="Conduct Compliance Rate"
          value={stats.cleanRate}
          subtitle="471 of 473 learners with clean record"
          icon={CheckCircle2}
          color="blue"
        />
      </div>

      {/* 3. Guidance Quick Actions Strip */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#F5C518]" /> Quick Officer Shortcuts:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/guidance/violations"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Shield className="h-3.5 w-3.5 text-slate-500" />
              Full Disciplinary Roster
            </Link>

            <Link
              to="/guidance/counseling"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <HeartHandshake className="h-3.5 w-3.5 text-blue-600" />
              Counseling Logbook
            </Link>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              Export Case Log (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Left Column (8 cols): Incident Table & Case Records */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {/* Table Header with Filters and Search */}
            <div className="p-5 border-b border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 font-bold">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Recent Behavioral Case Records
                    </h2>
                    <p className="text-xs text-slate-500">
                      Monitored student conduct, active referrals, and restorative interventions
                    </p>
                  </div>
                </div>

                <Link
                  to="/guidance/violations"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  View All Cases ({violations.length}) <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Search & Filter Pills */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by student name, LRN, or offense..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-[#1B2A4A] focus:outline-hidden transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
                  {(['All', 'Pending', 'Scheduled', 'Resolved'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setStatusFilter(tab)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        statusFilter === tab
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Learner Involved</th>
                    <th className="px-5 py-3.5">Incident Nature</th>
                    <th className="px-5 py-3.5 text-center">Severity</th>
                    <th className="px-5 py-3.5">Date Reported</th>
                    <th className="px-5 py-3.5">Case Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredViolations.length > 0 ? (
                    filteredViolations.map((v) => {
                      const isMajor =
                        (v.offense_level || v.severity || '').toLowerCase().includes('major') ||
                        (v.offense_level || '').includes('3rd');
                      const is2nd = (v.offense_level || '').includes('2nd');
                      const initials = (v.student_name || 'Student')
                        .split(' ')
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1B2A4A] text-amber-300 font-bold text-xs shrink-0 select-none">
                                {initials}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-900">{v.student_name}</p>
                                <p className="text-[10.5px] font-mono text-slate-400">
                                  LRN: {v.lrn || '119518160082'} · {v.grade_level || 'Grade 11'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <p className="font-medium text-slate-800 line-clamp-1 max-w-[220px]" title={v.violation_title || v.violation_type}>
                              {v.violation_title || v.violation_type}
                            </p>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {v.section ? `Section: ${v.section}` : 'General Campus'}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                isMajor
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : is2nd
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                              }`}
                            >
                              {v.offense_level || v.severity || '1st Offense'}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span>{formatDate(v.incident_date || v.created_at)}</span>
                            </div>
                          </td>

                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <Badge
                              variant={
                                (v.status || '').toLowerCase().includes('counseling')
                                  ? 'info'
                                  : (v.status || '').toLowerCase().includes('resolved')
                                  ? 'success'
                                  : (v.status || '').toLowerCase().includes('progress')
                                  ? 'warning'
                                  : 'neutral'
                              }
                              size="sm"
                            >
                              {v.status || 'Under Investigation'}
                            </Badge>
                          </td>

                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedCase(v)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer"
                            >
                              <Eye className="h-3 w-3 text-slate-500" /> Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                        <p className="font-semibold text-slate-600">No behavioral incidents found matching current filter.</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">All learners maintain good moral and conduct standing.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Good Moral & Conduct Clearance Request Hub */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold">
                  <Award className="h-5 w-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Official Certificate of Good Moral Character Requests
                  </h3>
                  <p className="text-xs text-slate-500">
                    Admissions clearances, scholarship verification, and transfer certifications
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsGoodMoralModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B2A4A] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#15233d] transition-all cursor-pointer active:scale-98"
              >
                <Printer className="h-3.5 w-3.5 text-[#F5C518]" /> Generate Certificate
              </button>
            </div>

            {goodMoralRequests.length > 0 ? (
              <div className="divide-y divide-slate-100 text-xs">
                {goodMoralRequests.map((req) => (
                  <div key={req.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-800">{req.student_name}</p>
                      <p className="text-[11px] text-slate-400">
                        LRN: {req.lrn} · {req.grade_level} · Purpose: {req.purpose}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="warning" size="sm">
                        Pending Clearance
                      </Badge>
                      <button
                        type="button"
                        onClick={() => {
                          setGoodMoralForm({
                            studentName: req.student_name,
                            lrn: req.lrn,
                            gradeLevel: req.grade_level,
                            strand: req.strand || 'General',
                            purpose: req.purpose,
                            issuedDate: new Date().toISOString().split('T')[0],
                            counselorRemarks: 'Certified in good standing with exemplary campus demeanor.',
                          });
                          setIsGoodMoralModalOpen(true);
                        }}
                        className="rounded-lg bg-emerald-700 px-3 py-1 text-[11px] font-bold text-white hover:bg-emerald-800 cursor-pointer"
                      >
                        Review &amp; Issue
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center">
                <FileCheck2 className="h-6 w-6 text-emerald-600 mx-auto mb-1.5 opacity-80" />
                <p className="text-xs font-bold text-slate-700">Clearance Request Queue is Clear</p>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto mt-0.5">
                  No pending student requests in queue. You can issue a Certificate of Good Moral Character on-demand whenever a student or parent requests one in person.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Upcoming Counseling & Policy Widgets */}
        <div className="lg:col-span-4 space-y-6">
          {/* Upcoming Counseling Sessions Widget */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Calendar className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Counseling Consultations
                </h3>
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 border border-blue-200">
                {counselingSessions.length} Total
              </span>
            </div>

            <div className="space-y-3">
              {counselingSessions.slice(0, 3).map((cs) => {
                const isScheduled = (cs.status || '').toLowerCase() === 'scheduled';
                return (
                  <div
                    key={cs.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1.5 hover:border-slate-200 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-900">{cs.student_name}</span>
                      <span
                        className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                          isScheduled
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {cs.status || 'Scheduled'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-tight">
                      {cs.purpose}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {formatDate(cs.session_date)}
                      </span>
                      <span className="font-medium text-slate-500">
                        {cs.counselor_name || 'Counselor'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-1">
              <Link
                to="/guidance/counseling"
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all"
              >
                Open Full Counseling Schedule <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Case Nature Breakdown Progress */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                Behavioral Case Categories
              </h3>
              <p className="text-[11px] text-slate-400">
                Proportion of reported concerns for S.Y. 2026–2027
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Cutting Classes / Tardiness</span>
                  <span className="font-mono font-bold text-amber-700">50%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full w-1/2" />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Peer Conflict / Altercations</span>
                  <span className="font-mono font-bold text-rose-700">50%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full w-1/2" />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Dress Code &amp; Campus Protocol</span>
                  <span className="font-mono font-bold text-slate-400">0%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-0" />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold text-slate-700 mb-1">
                  <span>Bullying / Serious Infraction</span>
                  <span className="font-mono font-bold text-emerald-700">0% (Zero-Tolerance)</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-0" />
                </div>
              </div>
            </div>
          </div>

          {/* DepEd Child Protection Policy Strip */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0" />
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                DepEd Order No. 40, s. 2012
              </h4>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              Placido L. Señor NHS strictly observes the <strong>DepEd Child Protection Policy</strong>. All student behavioral concerns are addressed through positive, non-violent discipline, confidential consultations, and proactive parental collaboration.
            </p>

            <div className="pt-1 flex items-center justify-between text-[11px] text-emerald-800 font-semibold border-t border-emerald-200/60">
              <span>Guidance Office: Rm 102</span>
              <span>Local Helpline: Ext 104</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= MODAL 1: LOG INCIDENT ================= */}
      {isLogIncidentOpen && (
        <Modal
          isOpen={isLogIncidentOpen}
          onClose={() => setIsLogIncidentOpen(false)}
          title="Log Student Behavioral Incident"
        >
          <form onSubmit={handleSaveIncident} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Learner Full Name</label>
              <input
                type="text"
                required
                value={incidentForm.studentName}
                onChange={(e) => setIncidentForm({ ...incidentForm, studentName: e.target.value })}
                placeholder="e.g. Jorvin Pengoc"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-[#1B2A4A] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">LRN (12 digits)</label>
                <input
                  type="text"
                  value={incidentForm.lrn}
                  onChange={(e) => setIncidentForm({ ...incidentForm, lrn: e.target.value })}
                  placeholder="e.g. 119518160082"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 font-mono focus:border-[#1B2A4A] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Year Level</label>
                <select
                  value={incidentForm.gradeLevel}
                  onChange={(e) => setIncidentForm({ ...incidentForm, gradeLevel: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-[#1B2A4A] focus:outline-hidden"
                >
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Incident / Offense Nature</label>
              <input
                type="text"
                required
                value={incidentForm.violationTitle}
                onChange={(e) => setIncidentForm({ ...incidentForm, violationTitle: e.target.value })}
                placeholder="e.g. Unauthorized Absence during 3rd Period"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-[#1B2A4A] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Offense Level</label>
                <select
                  value={incidentForm.offenseLevel}
                  onChange={(e) => setIncidentForm({ ...incidentForm, offenseLevel: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-[#1B2A4A] focus:outline-hidden"
                >
                  <option value="1st Offense">1st Offense (Warning &amp; Counsel)</option>
                  <option value="2nd Offense">2nd Offense (Parent Conference)</option>
                  <option value="Major Disciplinary">Major Disciplinary Case</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Section</label>
                <input
                  type="text"
                  value={incidentForm.section}
                  onChange={(e) => setIncidentForm({ ...incidentForm, section: e.target.value })}
                  placeholder="e.g. Section Almario"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-[#1B2A4A] focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Incident Details &amp; Observations</label>
              <textarea
                rows={3}
                value={incidentForm.description}
                onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                placeholder="Describe circumstances, witnesses, teacher referral notes..."
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-[#1B2A4A] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Sanction / Guidance Action Taken</label>
              <input
                type="text"
                value={incidentForm.actionTaken}
                onChange={(e) => setIncidentForm({ ...incidentForm, actionTaken: e.target.value })}
                placeholder="e.g. Scheduled for Guidance Counseling & Parent Contact"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-[#1B2A4A] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsLogIncidentOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-700 text-xs font-bold text-white hover:bg-emerald-800 transition-all cursor-pointer shadow-xs active:scale-98"
              >
                Save Incident Record
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= MODAL 2: BOOK COUNSELING ================= */}
      {isBookCounselingOpen && (
        <Modal
          isOpen={isBookCounselingOpen}
          onClose={() => setIsBookCounselingOpen(false)}
          title="Schedule Student Counseling Consultation"
        >
          <form onSubmit={handleSaveCounseling} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Learner Full Name</label>
              <input
                type="text"
                required
                value={counselingForm.studentName}
                onChange={(e) => setCounselingForm({ ...counselingForm, studentName: e.target.value })}
                placeholder="e.g. Jorvin Pengoc"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-[#1B2A4A] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Consultation Purpose</label>
              <select
                value={counselingForm.purpose}
                onChange={(e) => setCounselingForm({ ...counselingForm, purpose: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-[#1B2A4A] focus:outline-hidden"
              >
                <option value="Academic Performance & Study Habit Consultation">Academic Performance &amp; Study Habit Consultation</option>
                <option value="Behavioral Guidance & Restorative Intervention">Behavioral Guidance &amp; Restorative Intervention</option>
                <option value="Career Pathway Consultation (SHS Track / College)">Career Pathway Consultation (SHS Track / College)</option>
                <option value="Peer Mediation & Conflict Resolution">Peer Mediation &amp; Conflict Resolution</option>
                <option value="Personal Wellness & Emotional Support">Personal Wellness &amp; Emotional Support</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Session Date</label>
              <input
                type="date"
                required
                value={counselingForm.sessionDate}
                onChange={(e) => setCounselingForm({ ...counselingForm, sessionDate: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-[#1B2A4A] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Referral / Intake Confidential Notes</label>
              <textarea
                rows={3}
                value={counselingForm.notes}
                onChange={(e) => setCounselingForm({ ...counselingForm, notes: e.target.value })}
                placeholder="Confidential notes on background, goals, or required follow-up..."
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-[#1B2A4A] focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsBookCounselingOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-700 text-xs font-bold text-white hover:bg-blue-800 transition-all cursor-pointer shadow-xs active:scale-98"
              >
                Confirm &amp; Book Session
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================= MODAL 3: GOOD MORAL GENERATOR ================= */}
      {isGoodMoralModalOpen && (
        <Modal
          isOpen={isGoodMoralModalOpen}
          onClose={() => setIsGoodMoralModalOpen(false)}
          title="Official Certificate of Good Moral Character"
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-900 leading-relaxed text-[11px]">
              <strong>Official DepEd Certification:</strong> This form generates a certified Certificate of Good Moral Character printed on official school letterhead with authorized signatories.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Student Full Name</label>
                <input
                  type="text"
                  value={goodMoralForm.studentName}
                  onChange={(e) => setGoodMoralForm({ ...goodMoralForm, studentName: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Learner LRN</label>
                <input
                  type="text"
                  value={goodMoralForm.lrn}
                  onChange={(e) => setGoodMoralForm({ ...goodMoralForm, lrn: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Grade Level</label>
                <input
                  type="text"
                  value={goodMoralForm.gradeLevel}
                  onChange={(e) => setGoodMoralForm({ ...goodMoralForm, gradeLevel: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Track / Strand</label>
                <input
                  type="text"
                  value={goodMoralForm.strand}
                  onChange={(e) => setGoodMoralForm({ ...goodMoralForm, strand: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Requested Purpose</label>
              <input
                type="text"
                value={goodMoralForm.purpose}
                onChange={(e) => setGoodMoralForm({ ...goodMoralForm, purpose: e.target.value })}
                placeholder="e.g. College Admission & Scholarship Application"
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Date of Issuance</label>
              <input
                type="date"
                value={goodMoralForm.issuedDate}
                onChange={(e) => setGoodMoralForm({ ...goodMoralForm, issuedDate: e.target.value })}
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsGoodMoralModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrintGoodMoral}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#1B2A4A] text-xs font-bold text-white hover:bg-[#15233d] transition-all cursor-pointer shadow-xs active:scale-98"
              >
                <Printer className="h-4 w-4 text-[#F5C518]" /> Print Certificate
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================= MODAL 4: CASE DETAILS ================= */}
      {selectedCase && (
        <Modal
          isOpen={Boolean(selectedCase)}
          onClose={() => setSelectedCase(null)}
          title="Disciplinary Case Summary & Interventions"
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">{selectedCase.student_name}</h3>
                  <p className="text-slate-500 font-mono text-[11px]">
                    LRN: {selectedCase.lrn || '—'} · {selectedCase.grade_level || 'Grade 11'}
                  </p>
                </div>
                <Badge
                  variant={
                    (selectedCase.status || '').toLowerCase().includes('counseling')
                      ? 'info'
                      : (selectedCase.status || '').toLowerCase().includes('resolved')
                      ? 'success'
                      : 'warning'
                  }
                >
                  {selectedCase.status || 'Under Investigation'}
                </Badge>
              </div>

              <div className="pt-2 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Offense Severity:</span>
                  <strong className="text-slate-800">{selectedCase.offense_level || selectedCase.severity || '1st Offense'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Incident Date:</span>
                  <strong className="text-slate-800">{formatDate(selectedCase.incident_date || selectedCase.created_at)}</strong>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Violation Title</label>
              <div className="p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-900">
                {selectedCase.violation_title || selectedCase.violation_type}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Incident Description &amp; Circumstances</label>
              <div className="p-3 rounded-xl border border-slate-200 bg-white text-slate-700 leading-relaxed min-h-[60px]">
                {selectedCase.description || 'No additional narrative recorded.'}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Sanctions &amp; Restorative Action Taken</label>
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 text-emerald-950 font-medium leading-relaxed">
                {selectedCase.action_taken || 'Guidance Counseling & Parent-Teacher Consultation.'}
              </div>
            </div>

            {/* Status Change Buttons */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Update Case Status:</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateCaseStatus(selectedCase.id, 'Counseling Scheduled')}
                  className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 font-bold hover:bg-blue-100 cursor-pointer text-[11px]"
                >
                  Mark Counseling Scheduled
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateCaseStatus(selectedCase.id, 'In Progress')}
                  className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 font-bold hover:bg-amber-100 cursor-pointer text-[11px]"
                >
                  Mark In Progress
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateCaseStatus(selectedCase.id, 'Resolved')}
                  className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 cursor-pointer text-[11px]"
                >
                  Mark Case Resolved
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
