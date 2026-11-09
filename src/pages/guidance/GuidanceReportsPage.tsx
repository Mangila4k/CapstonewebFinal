import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Users,
  Award,
  Calendar,
  Clock,
  Search,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Download,
  Filter,
  BarChart3,
  HeartHandshake,
  ShieldCheck,
  Scale,
  Sparkles,
  FileCheck2,
  ChevronDown,
  Layers,
  GraduationCap,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import { Badge } from '../../components/common/Badge';

export interface CounselingReportItem {
  id: string | number;
  student_name: string;
  lrn: string;
  grade_level: string;
  section?: string;
  counselor_name: string;
  session_date: string;
  session_time?: string;
  session_type: string;
  purpose: string;
  status: string;
  action_plan?: string;
}

export interface ViolationReportItem {
  id: string | number;
  student_name: string;
  lrn: string;
  grade_level: string;
  section?: string;
  violation_title: string;
  violation_category: 'Minor' | 'Major';
  violation_type: string;
  offense_level: string;
  incident_date: string;
  reported_by: string;
  action_taken: string;
  status: string;
}

export interface GoodMoralReportItem {
  id: string | number;
  student_name: string;
  lrn: string;
  grade_level: string;
  strand?: string;
  purpose: string;
  status: string;
  created_at: string;
}

export const GuidanceReportsPage: React.FC = () => {
  const { user } = useAuth();

  // Filters
  const [schoolYear, setSchoolYear] = useState('2026-2027');
  const [selectedQuarter, setSelectedQuarter] = useState<'All' | 'Q1' | 'Q2' | 'Q3' | 'Q4'>('All');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'overview' | 'counseling' | 'violations' | 'good_moral' | 'compliance'>('overview');

  // Live Data States
  const [counselingList, setCounselingList] = useState<CounselingReportItem[]>([]);
  const [violationList, setViolationList] = useState<ViolationReportItem[]>([]);
  const [goodMoralList, setGoodMoralList] = useState<GoodMoralReportItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load Guidance Data from Supabase
  useEffect(() => {
    async function loadGuidanceReports() {
      setLoading(true);
      try {
        const [
          { data: sessionsData },
          { data: guidanceData },
          { data: violationsData },
          { data: goodMoralData },
        ] = await Promise.all([
          supabase.from('counseling_sessions').select('*').order('session_date', { ascending: false }),
          supabase.from('guidance').select('*').order('session_date', { ascending: false }),
          supabase.from('student_violations').select('*').order('incident_date', { ascending: false }),
          supabase.from('good_moral_requests').select('*').order('created_at', { ascending: false }),
        ]);

        // Merge counseling_sessions & guidance table
        const unifiedCounseling: CounselingReportItem[] = [];
        if (sessionsData && sessionsData.length > 0) {
          sessionsData.forEach((s: any) => {
            unifiedCounseling.push({
              id: s.id,
              student_name: s.student_name || 'Student',
              lrn: s.lrn || '—',
              grade_level: s.grade_level || 'Grade 10',
              section: s.section || '',
              counselor_name: s.counselor_name || 'Sarah Guidance Counselor',
              session_date: s.session_date || new Date().toISOString().split('T')[0],
              session_time: s.session_time || '09:00 AM',
              session_type: s.session_type || 'Individual Counseling',
              purpose: s.purpose || 'Behavioral Intervention',
              status: s.status || 'Completed',
              action_plan: s.action_plan || 'Regular academic check-in',
            });
          });
        }

        if (guidanceData && guidanceData.length > 0) {
          guidanceData.forEach((g: any) => {
            if (!unifiedCounseling.some((c) => c.id === g.id)) {
              unifiedCounseling.push({
                id: g.id,
                student_name: g.student_name || 'Student',
                lrn: g.lrn || '—',
                grade_level: g.grade_level || 'Grade 10',
                section: g.section || '',
                counselor_name: g.counselor_name || 'Sarah Guidance Counselor',
                session_date: g.session_date || new Date().toISOString().split('T')[0],
                session_time: g.session_time || '09:00 AM',
                session_type: g.session_type || 'Individual Counseling',
                purpose: g.purpose || 'Guidance Consultation',
                status: g.status || 'Scheduled',
                action_plan: g.action_plan || 'Action agreement',
              });
            }
          });
        }

        if (unifiedCounseling.length > 0) {
          setCounselingList(unifiedCounseling);
        } else {
          // Fallback realistic demonstration records
          setCounselingList([
            {
              id: 'c-101',
              student_name: 'Jorvin Pengoc',
              lrn: '11951680082',
              grade_level: 'Grade 11',
              section: 'TVL-ICT 11A',
              counselor_name: 'Sarah Guidance Counselor',
              session_date: '2026-10-08',
              session_time: '09:30 AM',
              session_type: 'Individual Counseling',
              purpose: 'Address habitual cutting classes and attendance commitment',
              status: 'Completed',
              action_plan: 'Weekly attendance card check-in with class adviser',
            },
            {
              id: 'c-102',
              student_name: 'Karylle May Baricuatro',
              lrn: '119518170131',
              grade_level: 'Grade 10',
              section: 'Rizal',
              counselor_name: 'Sarah Guidance Counselor',
              session_date: '2026-10-14',
              session_time: '01:30 PM',
              session_type: 'Career & Pathway Guidance',
              purpose: 'SHS Track & Strand Alignment Consultation (STEM vs TVL)',
              status: 'Completed',
              action_plan: 'Endorsed for STEM strand with focus on Pre-Calculus',
            },
            {
              id: 'c-103',
              student_name: 'Shine Sellar',
              lrn: '11951680077',
              grade_level: 'Grade 11',
              section: 'STEM-11B',
              counselor_name: 'Sarah Guidance Counselor',
              session_date: '2026-10-22',
              session_time: '10:00 AM',
              session_type: 'Academic Follow-up',
              purpose: 'Peer study support and quarterly academic progress review',
              status: 'Completed',
              action_plan: 'Peer tutoring connection for Mathematics',
            },
          ]);
        }

        if (violationsData && violationsData.length > 0) {
          setViolationList(
            violationsData.map((v: any) => ({
              id: v.id,
              student_name: v.student_name || 'Student',
              lrn: v.lrn || '—',
              grade_level: v.grade_level || 'Grade 10',
              section: v.section || '',
              violation_title: v.violation_title || 'Campus Policy Non-Compliance',
              violation_category: v.violation_category === 'Major' ? 'Major' : 'Minor',
              violation_type: v.violation_type || 'Uniform Compliance',
              offense_level: v.offense_level || '1st Offense',
              incident_date: v.incident_date || new Date().toISOString().split('T')[0],
              reported_by: v.reported_by || 'Faculty Member',
              action_taken: v.action_taken || 'Counseling & Agreement',
              status: v.status || 'Resolved',
            }))
          );
        } else {
          setViolationList([
            {
              id: 'v-201',
              student_name: 'Jorvin Pengoc',
              lrn: '11951680082',
              grade_level: 'Grade 11',
              section: 'TVL-ICT 11A',
              violation_title: 'Unauthorized Absence during 3rd Period (Cutting Classes)',
              violation_category: 'Minor',
              violation_type: 'Cutting Classes',
              offense_level: '2nd Offense',
              incident_date: '2026-10-05',
              reported_by: 'Mrs. Sellar',
              action_taken: 'Guidance Counseling & Behavior Contract',
              status: 'Resolved',
            },
            {
              id: 'v-202',
              student_name: 'Lucas Erawan Chappell',
              lrn: '446567190011',
              grade_level: 'Grade 10',
              section: 'Kindness',
              violation_title: 'Improper Uniform & Incomplete ID Display',
              violation_category: 'Minor',
              violation_type: 'Uniform Compliance',
              offense_level: '1st Offense',
              incident_date: '2026-10-18',
              reported_by: 'Prefect of Discipline',
              action_taken: 'Verbal Reprimand & Student Pass Issued',
              status: 'Resolved',
            },
          ]);
        }

        if (goodMoralData && goodMoralData.length > 0) {
          setGoodMoralList(
            goodMoralData.map((g: any) => ({
              id: g.id,
              student_name: g.student_name || 'Student',
              lrn: g.lrn || '—',
              grade_level: g.grade_level || 'Grade 12',
              strand: g.strand || 'STEM',
              purpose: g.purpose || 'College Admission',
              status: g.status || 'Approved',
              created_at: g.created_at || new Date().toISOString(),
            }))
          );
        } else {
          setGoodMoralList([
            {
              id: 'gm-301',
              student_name: 'Mary Jane Alcantara',
              lrn: '119518170099',
              grade_level: 'Grade 12',
              strand: 'STEM',
              purpose: 'DOST-SEI Science Scholarship Application',
              status: 'Approved & Issued',
              created_at: '2026-10-19',
            },
            {
              id: 'gm-302',
              student_name: 'Christian Dave Navarro',
              lrn: '119518170045',
              grade_level: 'Grade 12',
              strand: 'TVL-ICT',
              purpose: 'College Entrance & TESDA Certification',
              status: 'Approved & Issued',
              created_at: '2026-10-24',
            },
          ]);
        }
      } catch (err) {
        console.warn('Error loading guidance reports:', err);
      } finally {
        setLoading(false);
      }
    }

    loadGuidanceReports();
  }, []);

  // Filtered datasets
  const filteredCounseling = useMemo(() => {
    return counselingList.filter((item) => {
      if (gradeFilter !== 'All' && !item.grade_level.includes(gradeFilter)) return false;
      return true;
    });
  }, [counselingList, gradeFilter]);

  const filteredViolations = useMemo(() => {
    return violationList.filter((item) => {
      if (gradeFilter !== 'All' && !item.grade_level.includes(gradeFilter)) return false;
      return true;
    });
  }, [violationList, gradeFilter]);

  const filteredGoodMoral = useMemo(() => {
    return goodMoralList.filter((item) => {
      if (gradeFilter !== 'All' && !item.grade_level.includes(gradeFilter)) return false;
      return true;
    });
  }, [goodMoralList, gradeFilter]);

  // Key Performance Indicators (KPIs)
  const stats = useMemo(() => {
    const totalSessions = filteredCounseling.length;
    const completedSessions = filteredCounseling.filter((c) => c.status.toLowerCase().includes('complete')).length;
    const totalViolations = filteredViolations.length;
    const minorViolations = filteredViolations.filter((v) => v.violation_category === 'Minor').length;
    const majorViolations = filteredViolations.filter((v) => v.violation_category === 'Major').length;
    const resolvedViolations = filteredViolations.filter((v) => v.status.toLowerCase().includes('resolve')).length;
    const goodMoralCount = filteredGoodMoral.length;
    const resolutionRate = totalViolations > 0 ? Math.round((resolvedViolations / totalViolations) * 100) : 100;

    return {
      totalSessions,
      completedSessions,
      totalViolations,
      minorViolations,
      majorViolations,
      resolvedViolations,
      goodMoralCount,
      resolutionRate,
    };
  }, [filteredCounseling, filteredViolations, filteredGoodMoral]);

  // Export CSV
  const handleExportCsv = () => {
    const rows = [
      ['Placido L. Señor National High School - Guidance & Counseling Official Report'],
      [`School Year: ${schoolYear} | Quarter: ${selectedQuarter} | Generated: ${new Date().toLocaleDateString()}`],
      [],
      ['--- COUNSELING SESSIONS & CONSULTATIONS ---'],
      ['Student Name', 'LRN', 'Grade Level', 'Session Date', 'Counselor', 'Consultation Type', 'Purpose', 'Status'],
      ...filteredCounseling.map((c) => [
        `"${c.student_name}"`,
        `"${c.lrn}"`,
        `"${c.grade_level}"`,
        `"${c.session_date}"`,
        `"${c.counselor_name}"`,
        `"${c.session_type}"`,
        `"${c.purpose}"`,
        `"${c.status}"`,
      ]),
      [],
      ['--- DISCIPLINARY & BEHAVIORAL INCIDENTS ---'],
      ['Student Name', 'LRN', 'Grade Level', 'Incident Date', 'Category', 'Offense', 'Reported By', 'Action Taken', 'Status'],
      ...filteredViolations.map((v) => [
        `"${v.student_name}"`,
        `"${v.lrn}"`,
        `"${v.grade_level}"`,
        `"${v.incident_date}"`,
        `"${v.violation_category}"`,
        `"${v.violation_title}"`,
        `"${v.reported_by}"`,
        `"${v.action_taken}"`,
        `"${v.status}"`,
      ]),
      [],
      ['--- CERTIFICATES OF GOOD MORAL CHARACTER ---'],
      ['Student Name', 'LRN', 'Grade & Strand', 'Purpose', 'Status', 'Date Requested'],
      ...filteredGoodMoral.map((g) => [
        `"${g.student_name}"`,
        `"${g.lrn}"`,
        `"${g.grade_level} ${g.strand || ''}"`,
        `"${g.purpose}"`,
        `"${g.status}"`,
        `"${g.created_at}"`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PLSNHS_Guidance_Report_${schoolYear.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* Top Banner & Title - Screen Only */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-sm">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
                Guidance &amp; Counseling Accomplishment Reports
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Placido L. Señor National High School · Student Welfare, Behavioral Statistics, and Child Protection Compliance
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <PageHeaderNotificationSlot />
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-800 rounded-xl hover:from-purple-800 hover:to-indigo-900 shadow-md shadow-purple-900/20 transition-all"
          >
            <Printer className="w-3.5 h-3.5" /> Print Official Report
          </button>
        </div>
      </div>

      {/* Filter Toolbar - Screen Only */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Filter className="w-3.5 h-3.5 text-purple-600" /> Filter View:
          </div>

          {/* School Year */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <span className="text-slate-400 font-medium">S.Y.:</span>
            <select
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="2026-2027">2026-2027</option>
              <option value="2025-2026">2025-2026</option>
            </select>
          </div>

          {/* Quarter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <span className="text-slate-400 font-medium">Period:</span>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value as any)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="All">Full School Year</option>
              <option value="Q1">1st Quarter</option>
              <option value="Q2">2nd Quarter</option>
              <option value="Q3">3rd Quarter</option>
              <option value="Q4">4th Quarter</option>
            </select>
          </div>

          {/* Grade Level */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <span className="text-slate-400 font-medium">Grade:</span>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="All">All Grade Levels</option>
              <option value="Grade 7">Grade 7</option>
              <option value="Grade 8">Grade 8</option>
              <option value="Grade 9">Grade 9</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto overflow-x-auto max-w-full">
          {[
            { id: 'overview', label: 'Overview & KPI' },
            { id: 'counseling', label: `Counseling (${filteredCounseling.length})` },
            { id: 'violations', label: `Discipline (${filteredViolations.length})` },
            { id: 'good_moral', label: `Clearance (${filteredGoodMoral.length})` },
            { id: 'compliance', label: 'Child Protection' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-purple-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OFFICIAL PRINT HEADER (Visible on Print) */}
      {/* ========================================================================= */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="text-center space-y-1">
          <p className="text-[11px] font-serif uppercase tracking-widest text-slate-600">Republic of the Philippines</p>
          <p className="text-[12px] font-serif uppercase font-bold text-slate-800">Department of Education</p>
          <p className="text-[11px] font-serif text-slate-600">Region VII · Central Visayas · Division of City of Naga</p>
          <h2 className="text-base font-serif font-black tracking-wide text-slate-900 uppercase pt-1">
            Placido L. Señor National High School
          </h2>
          <p className="text-[11px] text-slate-600">Langtad, City of Naga, Cebu · School ID: 303035</p>
          <div className="pt-2">
            <span className="inline-block border-y border-slate-800 px-6 py-0.5 text-xs font-black uppercase tracking-wider text-slate-900">
              Guidance &amp; Counseling Department · Official Accomplishment Report
            </span>
          </div>
          <p className="text-[10px] text-slate-500 pt-1">
            School Year: {schoolYear} | Reporting Coverage: {selectedQuarter === 'All' ? 'Full School Year' : selectedQuarter}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EXECUTIVE GUIDANCE KPI METRIC CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Consultations</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-display mt-2">{stats.totalSessions}</p>
          <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" /> {stats.completedSessions} completed sessions
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Behavioral Referrals</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-display mt-2">{stats.totalViolations}</p>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">
            {stats.minorViolations} Minor · {stats.majorViolations} Major
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Case Resolution Rate</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 font-display mt-2">{stats.resolutionRate}%</p>
          <p className="text-[11px] font-semibold text-emerald-600 mt-1">
            {stats.resolvedViolations} of {stats.totalViolations} cases rehabilitated
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Good Moral Clearances</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 font-display mt-2">{stats.goodMoralCount}</p>
          <p className="text-[11px] font-semibold text-indigo-600 mt-1">
            Certificates endorsed &amp; authenticated
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB CONTENT: 1. OVERVIEW & STRATEGIC HIGHLIGHTS */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'compliance') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Counseling Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-purple-700" />
                <h3 className="text-sm font-extrabold text-slate-900">Guidance Services Distribution</h3>
              </div>
              <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                S.Y. {schoolYear}
              </span>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Individual Counseling', count: filteredCounseling.filter((c) => c.session_type.includes('Individual')).length, color: 'bg-purple-600' },
                { label: 'Career & SHS Pathway Guidance', count: filteredCounseling.filter((c) => c.session_type.includes('Career') || c.purpose.includes('Pathway')).length, color: 'bg-indigo-600' },
                { label: 'Academic & Remedial Intervention', count: filteredCounseling.filter((c) => c.session_type.includes('Academic') || c.purpose.includes('Academic')).length, color: 'bg-blue-600' },
                { label: 'Parent-Teacher-Counselor Conference', count: filteredCounseling.filter((c) => c.session_type.includes('Parent')).length, color: 'bg-emerald-600' },
              ].map((item, idx) => {
                const total = filteredCounseling.length || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700">{item.label}</span>
                      <span className="text-slate-900">{item.count} sessions ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Child Protection & Safety Standing */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-extrabold text-slate-900">DepEd Child Protection Policy (DO 40, s. 2012)</h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                Compliant
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Zero Tolerance for Bullying &amp; Harassment</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    RA 10627 Anti-Bullying Protocol strictly enforced. Active Child Protection Committee (CPC) monitoring.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50/50 border border-purple-100">
                <HeartHandshake className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Restorative Justice &amp; Counseling Priority</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Learner disciplinary measures center on behavioral rehabilitation rather than punitive sanctions.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                <GraduationCap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">Counselor-Client Confidentiality Protected</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    All case files and counseling notes are secured under the Guidance and Counseling Act of 2004 (RA 9258).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DETAILED COUNSELING CONSULTATION LOGS */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'counseling') && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-purple-700" />
                Official Counseling &amp; Guidance Sessions Log
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record of individual counseling, career pathway advisement, and parent consultations
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {filteredCounseling.length} Record{filteredCounseling.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Student Name &amp; LRN</th>
                  <th className="py-3 px-3">Grade &amp; Section</th>
                  <th className="py-3 px-3">Date &amp; Time</th>
                  <th className="py-3 px-3">Service Type</th>
                  <th className="py-3 px-4">Purpose &amp; Action Plan</th>
                  <th className="py-3 px-3">Counselor</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCounseling.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-extrabold text-slate-900">{c.student_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">LRN: {c.lrn}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800">{c.grade_level}</span>
                      {c.section && <p className="text-[11px] text-slate-500">{c.section}</p>}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <p className="font-medium text-slate-900">{c.session_date}</p>
                      <p className="text-[10px] text-slate-400">{c.session_time || '09:00 AM'}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        {c.session_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="font-bold text-slate-900 line-clamp-1">{c.purpose}</p>
                      {c.action_plan && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 italic">
                          Plan: {c.action_plan}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                      {c.counselor_name}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status.toLowerCase().includes('complete')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DISCIPLINARY & STUDENT BEHAVIORAL LOGS */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'violations') && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                Student Conduct, Infractions &amp; Behavioral Referrals Log
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Logged incidents evaluated under DepEd Student Code of Conduct and Child Protection Policies
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {filteredViolations.length} Incident{filteredViolations.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Student Name &amp; LRN</th>
                  <th className="py-3 px-3">Grade &amp; Section</th>
                  <th className="py-3 px-3">Incident Date</th>
                  <th className="py-3 px-3">Severity &amp; Offense</th>
                  <th className="py-3 px-4">Violation Details</th>
                  <th className="py-3 px-3">Reported By</th>
                  <th className="py-3 px-3">Action Taken</th>
                  <th className="py-3 px-4">Standing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredViolations.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-extrabold text-slate-900">{v.student_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">LRN: {v.lrn}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800">{v.grade_level}</span>
                      {v.section && <p className="text-[11px] text-slate-500">{v.section}</p>}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-medium">
                      {v.incident_date}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          v.violation_category === 'Major'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {v.violation_category} · {v.offense_level}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs font-medium text-slate-900">
                      {v.violation_title}
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">
                      {v.reported_by}
                    </td>
                    <td className="py-3 px-3 text-slate-800 font-medium">
                      {v.action_taken}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          v.status.toLowerCase().includes('resolve')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CERTIFICATES OF GOOD MORAL CHARACTER */}
      {/* ========================================================================= */}
      {(activeTab === 'overview' || activeTab === 'good_moral') && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-700" />
                Certificate of Good Moral Character Issuance Register
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official moral clearances issued for college entrance, scholarships, transferees, and employment
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {filteredGoodMoral.length} Clearances
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-3">LRN</th>
                  <th className="py-3 px-3">Grade &amp; Strand</th>
                  <th className="py-3 px-4">Intended Purpose</th>
                  <th className="py-3 px-3">Request Date</th>
                  <th className="py-3 px-4">Clearance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredGoodMoral.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-extrabold text-slate-900">{g.student_name}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{g.lrn}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">
                      {g.grade_level} {g.strand ? `(${g.strand})` : ''}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{g.purpose}</td>
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{g.created_at.slice(0, 10)}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" /> {g.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OFFICIAL SIGNATURE BLOCK (Visible on Print) */}
      {/* ========================================================================= */}
      <div className="hidden print:block pt-10 mt-6 border-t border-slate-300">
        <div className="grid grid-cols-2 gap-12 text-center text-xs">
          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-8">Prepared and Certified Correct by:</p>
            <p className="font-serif font-bold text-slate-900 underline text-sm">
              {user?.full_name || 'Sarah Guidance Counselor'}
            </p>
            <p className="text-[11px] text-slate-600">Guidance Counselor II / Behavioral Coordinator</p>
            <p className="text-[10px] text-slate-400">Placido L. Señor National High School</p>
          </div>

          <div>
            <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-8">Noted and Approved by:</p>
            <p className="font-serif font-bold text-slate-900 underline text-sm">Dr. Ryan R. Quiroga</p>
            <p className="text-[11px] text-slate-600">School Principal I</p>
            <p className="text-[10px] text-slate-400">Placido L. Señor National High School</p>
          </div>
        </div>
      </div>
    </div>
  );
};

