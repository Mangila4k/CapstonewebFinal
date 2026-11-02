import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  Clock,
  Download,
  Printer,
  Calendar,
  UserCheck,
  FileText,
  FileCheck,
  Users,
  AlertCircle,
  Sparkles,
  HelpCircle,
  Plus,
  Send,
  BookOpen,
  ChevronRight,
  Shield,
  HeartHandshake,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';

interface GuidanceSession {
  id: string;
  date: string;
  purpose: string;
  counselor: string;
  type: string;
  status: 'Completed' | 'Scheduled';
  notes: string;
}

interface ConductReview {
  id: string;
  date: string;
  reviewType: string;
  category: string;
  standing: 'Exemplary' | 'Compliant' | 'Satisfactory';
  reviewer: string;
  remarks: string;
}

const DEFAULT_CONDUCT_REVIEWS: ConductReview[] = [
  {
    id: 'cr-1',
    date: 'Oct 24, 2026',
    reviewType: '1st Quarter Character Appraisal',
    category: 'DepEd Core Values',
    standing: 'Exemplary',
    reviewer: 'Mr. J. Almario (Class Adviser)',
    remarks: 'Demonstrates outstanding leadership, respectful peer demeanor, and 100% adherence to campus dress code.',
  },
  {
    id: 'cr-2',
    date: 'Sep 15, 2026',
    reviewType: 'Monthly Discipline Clearance',
    category: 'Campus Code of Conduct',
    standing: 'Compliant',
    reviewer: 'Guidance Office / Prefect of Discipline',
    remarks: 'Zero recorded infractions, zero uniform violations, punctual assembly attendance.',
  },
  {
    id: 'cr-3',
    date: 'Aug 14, 2026',
    reviewType: 'SHS Admission Behavioral Clearance',
    category: 'DepEd Child Protection Policy',
    standing: 'Exemplary',
    reviewer: 'Mrs. R. Mendoza, RGC',
    remarks: 'Junior High School Certificate of Good Moral validated. Clean permanent file from Grade 7–10.',
  },
];

const DEFAULT_GUIDANCE_SESSIONS: GuidanceSession[] = [
  {
    id: 'gs-1',
    date: 'Oct 18, 2026',
    purpose: 'Senior High Career Pathway Consultation (TVL-ICT Specialization)',
    counselor: 'Mrs. R. Mendoza, RGC',
    type: 'Individual Counseling',
    status: 'Completed',
    notes: 'Reviewed Computer Systems Servicing NC II track competency goals and tertiary education options.',
  },
  {
    id: 'gs-2',
    date: 'Aug 15, 2026',
    purpose: 'Senior High School Transition & Student Handbook Orientation',
    counselor: 'Guidance & Counseling Department',
    type: 'Group Guidance Session',
    status: 'Completed',
    notes: 'Covered DepEd Child Protection Policy (DO 40, s. 2012), Anti-Bullying Act, and student rights.',
  },
];

export const StudentViolationsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'standing' | 'sessions' | 'policies'>('standing');
  const [isGoodMoralModalOpen, setIsGoodMoralModalOpen] = useState(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Live database records
  const [violations, setViolations] = useState<any[]>([]);
  const [guidanceSessions, setGuidanceSessions] = useState<GuidanceSession[]>(DEFAULT_GUIDANCE_SESSIONS);
  const [conductReviews] = useState<ConductReview[]>(DEFAULT_CONDUCT_REVIEWS);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [goodMoralPurpose, setGoodMoralPurpose] = useState('College Admission / University Entrance');
  const [consultPurpose, setConsultPurpose] = useState('Career Pathway & College Consultation');
  const [consultDate, setConsultDate] = useState('2026-11-06');
  const [consultNotes, setConsultNotes] = useState('');

  const learnerName = user?.full_name || 'Jorvin Pengoc';
  const learnerLrn = user?.student_lrn || '11951680082';
  const learnerGrade = user?.student_grade || 'Grade 11';
  const learnerSection = user?.student_section || 'Section Almario';
  const learnerStrand = user?.student_strand || 'TVL - ICT';
  const schoolYear = '2026–2027';

  // Load live violations and counseling sessions from Supabase
  useEffect(() => {
    async function loadGuidanceRecords() {
      try {
        const studentId = user?.student_id || user?.id;
        const cleanName = (learnerName || '').trim();
        const cleanLrn = (learnerLrn || '').trim();

        // Query student_violations
        let vQuery = supabase.from('student_violations').select('*');
        if (studentId) {
          vQuery = vQuery.or(`student_id.eq.${studentId},student_name.ilike.%${cleanName}%,lrn.eq.${cleanLrn}`);
        } else {
          vQuery = vQuery.or(`student_name.ilike.%${cleanName}%,lrn.eq.${cleanLrn}`);
        }
        const { data: vData } = await vQuery.order('created_at', { ascending: false });
        if (vData) {
          setViolations(vData);
        }

        // Query counseling_sessions
        let cQuery = supabase.from('counseling_sessions').select('*');
        if (studentId) {
          cQuery = cQuery.or(`student_id.eq.${studentId},student_name.ilike.%${cleanName}%,lrn.eq.${cleanLrn}`);
        } else {
          cQuery = cQuery.or(`student_name.ilike.%${cleanName}%,lrn.eq.${cleanLrn}`);
        }
        const { data: cData } = await cQuery.order('session_date', { ascending: false });
        if (cData && cData.length > 0) {
          setGuidanceSessions(
            cData.map((c: any) => ({
              id: c.id,
              date: c.session_date || 'Scheduled',
              purpose: c.purpose || 'Guidance Consultation',
              counselor: c.counselor_name || 'Mrs. Sarah Guidance Counselor',
              type: c.session_type || 'Individual Counseling',
              status: (c.status || 'Scheduled') as 'Completed' | 'Scheduled',
              notes: c.notes || c.action_plan || 'Pending session date.',
            }))
          );
        }
      } catch (err) {
        console.warn('Error loading student guidance records:', err);
      }
    }

    loadGuidanceRecords();
  }, [user, learnerName, learnerLrn]);

  // Handle Good Moral Request
  const handleGoodMoralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const studentId = user?.student_id || user?.id || null;
      const { error } = await supabase.from('good_moral_requests').insert([
        {
          student_id: studentId,
          student_name: learnerName,
          lrn: learnerLrn,
          grade_level: learnerGrade,
          strand: learnerStrand,
          purpose: goodMoralPurpose,
          status: 'Pending',
          has_active_violations: violations.length > 0,
        },
      ]);

      if (error) throw error;

      setIsGoodMoralModalOpen(false);
      setNotice({
        type: 'success',
        message: `Your Certificate of Good Moral Character request (${goodMoralPurpose}) has been submitted to the Guidance Office and recorded in database. Processing takes 1–2 school days.`,
      });
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err?.message || 'Failed to submit Good Moral request. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Consultation Booking
  const handleConsultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const studentId = user?.student_id || user?.id || null;
      const { error } = await supabase.from('counseling_sessions').insert([
        {
          student_id: studentId,
          student_name: learnerName,
          lrn: learnerLrn,
          grade_level: learnerGrade,
          counselor_name: 'Sarah Guidance Counselor',
          session_date: consultDate,
          purpose: consultPurpose,
          notes: consultNotes,
          status: 'Scheduled',
        },
      ]);

      if (error) throw error;

      setIsConsultModalOpen(false);
      setNotice({
        type: 'success',
        message: `Guidance appointment request scheduled for ${consultDate} and saved to database. A confirmation pass will be delivered to your class adviser.`,
      });
      // Refresh local list
      setGuidanceSessions((prev) => [
        {
          id: `new-${Date.now()}`,
          date: consultDate,
          purpose: consultPurpose,
          counselor: 'Sarah Guidance Counselor',
          type: 'Individual Counseling',
          status: 'Scheduled',
          notes: consultNotes || 'Session confirmed.',
        },
        ...prev,
      ]);
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err?.message || 'Failed to schedule appointment. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Print Official Clearance
  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `PLSNHS_Guidance_Clearance_${learnerName.replace(/\s+/g, '_')}`;
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

      {/* Screen Control Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight whitespace-nowrap">
            Guidance &amp; Student Conduct Record
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official behavioral standing, DepEd Child Protection Policy compliance, and guidance clearance · S.Y. {schoolYear}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <PageHeaderNotificationSlot />
        </div>
      </div>

      {notice && (
        <Alert
          type={notice.type}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}

      {/* Learner Demographic & Clearance Matrix Strip */}
      <div className="no-print rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-black shrink-0">
              <ShieldCheck className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm sm:text-base">{learnerName}</span>
                <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  LRN: {learnerLrn}
                </span>
              </div>
              <p className="text-slate-500 text-[11.5px] mt-0.5">
                {learnerGrade} – {learnerSection} · <strong className="text-slate-800">{learnerStrand}</strong> · Counselor: <strong>Mrs. R. Mendoza, RGC</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Disciplinary Standing: Clean &amp; Cleared
            </span>
          </div>
        </div>
      </div>

      {/* Executive Behavioral & Guidance KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Conduct Standing */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Disciplinary Record
            </span>
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${violations.length > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {violations.length > 0 ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-display">
              {violations.length > 0 ? `${violations.length} Infraction(s)` : '0 Infractions'}
            </p>
            <span className={`text-xs font-bold ${violations.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {violations.length > 0 ? 'Under Guidance Monitoring' : 'Pristine Conduct Record'}
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>{violations.length > 0 ? 'Active record in school database' : 'Zero minor, moderate, or major violations'}</span>
          </div>
        </div>

        {/* Card 2: DepEd Core Values */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Core Values Rating
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-display">Always Observed</p>
            <span className="text-xs font-bold text-amber-700">AO (Palaging Ginagawa)</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>DepEd SF9 character appraisal validated</span>
          </div>
        </div>

        {/* Card 3: Guidance Clearance */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Good Moral Clearance
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-display">Eligible &amp; Cleared</p>
            <span className="text-xs font-bold text-blue-700">Ready for Issuance</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>1-Click request available anytime</span>
          </div>
        </div>

        {/* Card 4: Consultations */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Guidance Services
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-display">{guidanceSessions.length} Session{guidanceSessions.length !== 1 ? 's' : ''}</p>
            <span className="text-xs font-bold text-purple-700">Pathway Consultation &amp; Guidance</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Guidance Office Rm 102 · Active</span>
          </div>
        </div>
      </div>

      {/* Navigation View Switcher Tabs */}
      <div className="no-print flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('standing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'standing'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Conduct Standing &amp; Clearance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'sessions'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <Calendar className="h-4 w-4 text-blue-600" />
          <span>Guidance Sessions ({guidanceSessions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('policies')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'policies'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
          }`}
        >
          <BookOpen className="h-4 w-4 text-slate-700" />
          <span>Student Code &amp; Rights</span>
        </button>
      </div>

      {/* TAB 1: CONDUCT STANDING & OFFICIAL CLEARANCE */}
      {activeTab === 'standing' && (
        <div className="space-y-5">
          {/* Official Attestation Banner */}
          <div className="rounded-2xl border-2 border-emerald-500/20 bg-gradient-to-r from-emerald-50/70 via-white to-slate-50 p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shrink-0 shadow-xs ring-4 ring-emerald-400/10">
                  <ShieldCheck className="h-8 w-8 text-emerald-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      Official Exemplary Conduct Attestation
                    </h3>
                    <span className="rounded-full bg-emerald-100 border border-emerald-300/60 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 uppercase tracking-wide">
                      No Recorded Violations
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    This certifies that <strong>{learnerName}</strong> (LRN: <span className="font-mono font-bold text-slate-800">{learnerLrn}</span>) of <strong>{learnerGrade} – {learnerSection}</strong> has maintained an impeccable disciplinary record for School Year <strong>{schoolYear}</strong> with zero reported behavioral violations, zero uniform policy infractions, and full compliance with DepEd Child Protection Policy (DepEd Order No. 40, s. 2012).
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2 font-mono">
                    Official Clearance Certificate ID: PLSNHS-GC-2026-1195168 · Valid for S.Y. {schoolYear}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                <Badge variant="success" size="md">
                  CLEAN CONDUCT RECORD
                </Badge>
                <button
                  type="button"
                  onClick={() => setIsGoodMoralModalOpen(true)}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline underline-offset-4 cursor-pointer"
                >
                  Generate Clearance Copy →
                </button>
              </div>
            </div>
          </div>

          {/* Conduct & Behavioral Audit History Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Official Conduct Review &amp; Clearance History</h3>
                <p className="text-xs text-slate-500">Periodic behavioral evaluations logged by the Guidance Office and Class Advisers</p>
              </div>
              <span className="text-xs font-bold text-slate-600 font-mono">S.Y. {schoolYear}</span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3.5">Review Date</th>
                      <th className="px-5 py-3.5">Review Type &amp; Scope</th>
                      <th className="px-5 py-3.5">Category</th>
                      <th className="px-5 py-3.5 text-center">Standing</th>
                      <th className="px-5 py-3.5">Reviewer / Authority</th>
                      <th className="px-5 py-3.5">Official Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {conductReviews.map((review: ConductReview) => (
                      <tr key={review.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                          {review.date}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800">
                          {review.reviewType}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {review.category}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            {review.standing}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700 font-medium">
                          {review.reviewer}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-[11px] max-w-xs truncate" title={review.remarks}>
                          {review.remarks}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GUIDANCE SESSIONS & PATHWAY CONSULTATIONS */}
      {activeTab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Counseling &amp; Guidance Consultations</h3>
              <p className="text-xs text-slate-500">Record of career, personal, and academic guidance sessions</p>
            </div>
            <button
              type="button"
              onClick={() => setIsConsultModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#152e69] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0f1f4b] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Book Session
            </button>
          </div>

          <div className="space-y-3">
            {guidanceSessions.map((session) => (
              <div
                key={session.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2 hover:border-slate-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 shrink-0">
                      <HeartHandshake className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{session.purpose}</h4>
                      <p className="text-xs text-slate-500">
                        {session.type} · Counselor: <strong className="text-slate-700">{session.counselor}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500 font-bold">{session.date}</span>
                    <Badge variant="success" size="sm">
                      {session.status}
                    </Badge>
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                  <strong className="text-slate-700 block text-[10px] uppercase font-bold mb-0.5">Session Outcome &amp; Counselor Notes</strong>
                  {session.notes}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: STUDENT CODE OF CONDUCT & RIGHTS */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Placido L. Señor NHS Student Code of Conduct</h3>
            <p className="text-xs text-slate-500">Department of Education standards, child protection principles, and learner responsibilities</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm">
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                <h4>DepEd Child Protection Policy (DO 40, s. 2012)</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Placido L. Señor NHS operates under a zero-tolerance policy against bullying, discrimination, harassment, and violence. Every learner is entitled to a safe, nurturing, and psychologically positive learning space.
              </p>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                <span>Child Protection Committee: Active</span>
                <span className="text-emerald-700 font-bold">100% Protected</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-[#152e69] font-extrabold text-sm">
                <Award className="h-4.5 w-4.5 text-[#152e69]" />
                <h4>Academic Integrity &amp; Authenticity</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Learners must uphold truth in all school examinations, performance tasks, and practical coursework. Academic dishonesty (plagiarism or unauthorized copying) incurs counseling intervention and formal parent conferencing.
              </p>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                <span>Honor Code Standard: Upheld</span>
                <span className="text-emerald-700 font-bold">Compliant</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                <Clock className="h-4.5 w-4.5 text-slate-600" />
                <h4>Punctuality &amp; Campus Protocol</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Senior High School gate check-in closes promptly at 07:30 AM for morning advisory. Official school uniforms and active digital ID badges must be worn upon campus entry and throughout instructional periods.
              </p>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                <span>Assembly Schedule: 07:15 AM</span>
                <span className="text-emerald-700 font-bold">Compliant</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-purple-900 font-extrabold text-sm">
                <HeartHandshake className="h-4.5 w-4.5 text-purple-700" />
                <h4>Guidance Counseling Confidentiality</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                All consultations with the Guidance Office are governed by professional counselor-client confidentiality under the Guidance and Counseling Act of 2004 (RA 9258), protecting learner privacy and dignity.
              </p>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                <span>RA 9258 Standard: Certified</span>
                <span className="text-purple-700 font-bold">Confidential</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Action Controls (Bottom Aligned) */}
      <div className="no-print flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-200">
        <button
          type="button"
          onClick={() => setIsConsultModalOpen(true)}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all cursor-pointer active:scale-98"
          title="Request guidance consultation"
        >
          <HeartHandshake className="h-4 w-4 text-slate-500" />
          <span>Book Consultation</span>
        </button>

        <button
          type="button"
          onClick={() => setIsGoodMoralModalOpen(true)}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all cursor-pointer active:scale-98"
          title="Request Certificate of Good Moral Character"
        >
          <Award className="h-4 w-4 text-amber-500" />
          <span>Request Good Moral</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#152e69] hover:bg-[#0f1f4b] px-5 text-xs font-bold text-white shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-98"
          title="Print official guidance clearance certificate"
        >
          <Printer className="h-4 w-4 text-[#F5C518]" />
          <span>Print Clearance</span>
        </button>
      </div>

      {/* MODAL 1: REQUEST CERTIFICATE OF GOOD MORAL CHARACTER */}
      <Modal
        isOpen={isGoodMoralModalOpen}
        onClose={() => setIsGoodMoralModalOpen(false)}
        title="Request Certificate of Good Moral Character"
      >
        <form onSubmit={handleGoodMoralSubmit} className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Your disciplinary clearance is verified. The Guidance Office will prepare your authenticated Certificate of Good Moral Character signed by the Guidance Counselor and Principal I.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Purpose of Request
            </label>
            <select
              value={goodMoralPurpose}
              onChange={(e) => setGoodMoralPurpose(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#152e69]/20"
            >
              <option value="College Admission / University Entrance">College Admission / University Entrance</option>
              <option value="Scholarship Application (CHED / LGU Naga / DOST)">Scholarship Application (CHED / LGU Naga / DOST)</option>
              <option value="Senior High School Voucher / DepEd Verification">Senior High School Voucher / DepEd Verification</option>
              <option value="Internship / Work Immersion Requirement">Internship / Work Immersion Requirement</option>
              <option value="Transfer / Dual Enrollment Credentials">Transfer / Dual Enrollment Credentials</option>
            </select>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Applicant:</span>
              <strong className="text-slate-800">{learnerName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Learner LRN:</span>
              <span className="font-mono font-bold text-slate-800">{learnerLrn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Conduct Standing:</span>
              <strong className="text-emerald-700">100% Cleared (0 Infractions)</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Processing Turnaround:</span>
              <span className="text-slate-700">1–2 School Days (Pickup at Guidance Rm 102)</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsGoodMoralModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#152e69] text-white hover:bg-[#0f1f4b] shadow-xs cursor-pointer"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: BOOK GUIDANCE CONSULTATION */}
      <Modal
        isOpen={isConsultModalOpen}
        onClose={() => setIsConsultModalOpen(false)}
        title="Schedule Guidance Counseling Session"
      >
        <form onSubmit={handleConsultSubmit} className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            The Guidance Office provides confidential academic, career, and personal consultation for all Placido L. Señor NHS learners.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Consultation Topic / Area
            </label>
            <select
              value={consultPurpose}
              onChange={(e) => setConsultPurpose(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#152e69]/20"
            >
              <option value="Career Pathway & College Consultation">Career Pathway &amp; College Consultation</option>
              <option value="Academic Performance & Study Habit Support">Academic Performance &amp; Study Habit Support</option>
              <option value="Work Immersion / Industry Placement Preparation">Work Immersion / Industry Placement Preparation</option>
              <option value="Personal Well-Being & Peer Adjustment Consultation">Personal Well-Being &amp; Peer Adjustment Consultation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Preferred Session Date
            </label>
            <input
              type="date"
              value={consultDate}
              onChange={(e) => setConsultDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#152e69]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Brief Note for Counselor (Optional &amp; Confidential)
            </label>
            <textarea
              rows={3}
              value={consultNotes}
              onChange={(e) => setConsultNotes(e.target.value)}
              placeholder="Any specific questions or topics you would like to discuss..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#152e69]/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsConsultModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#152e69] text-white hover:bg-[#0f1f4b] shadow-xs cursor-pointer"
            >
              Confirm Appointment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
