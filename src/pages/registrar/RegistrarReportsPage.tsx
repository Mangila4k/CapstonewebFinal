import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Users,
  Search,
  Filter,
  Printer,
  Download,
  GraduationCap,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Building2,
  FileCheck2,
  Sparkles,
  RefreshCw,
  FolderCheck,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import { Badge } from '../../components/common/Badge';

export interface StudentRegisterRecord {
  id: string;
  lrn: string;
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  suffix?: string | null;
  gender: string;
  date_of_birth?: string | null;
  age?: number | null;
  grade_level: string;
  strand?: string | null;
  section?: string | null;
  section_id?: string | null;
  contact_number?: string | null;
  email?: string | null;
  address?: string | null;
  parent_name?: string | null;
  parent_contact?: string | null;
  documents_status?: string | null;
  academic_status?: string | null;
  student_type?: string | null;
  psa_birth_url?: string | null;
  form_138_url?: string | null;
  good_moral_url?: string | null;
  two_by_two_picture_url?: string | null;
}

export const RegistrarReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentRegisterRecord[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View state
  const [activeTab, setActiveTab] = useState<'sf1_register' | 'enrollment_matrix' | 'documents_compliance' | 'sf1_printable'>('sf1_register');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedStrand, setSelectedStrand] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [selectedDocStatus, setSelectedDocStatus] = useState('all');

  // Fetch real database records
  const loadRegistrarData = async () => {
    setLoading(true);
    try {
      const [studentsRes, sectionsRes] = await Promise.all([
        supabase.from('students').select('*').order('last_name', { ascending: true }),
        supabase.from('sections').select('*').order('grade_level', { ascending: true }),
      ]);

      const secList = sectionsRes.data || [];
      setSections(secList);

      const secMap = new Map<string, string>();
      secList.forEach((s) => {
        if (s.id && s.name) secMap.set(s.id, s.name);
      });

      if (studentsRes.data) {
        const mappedStudents: StudentRegisterRecord[] = studentsRes.data.map((st) => ({
          ...st,
          section: st.section || (st.section_id ? secMap.get(st.section_id) || 'Unassigned' : 'Unassigned'),
        }));
        setStudents(mappedStudents);
      }
    } catch (err) {
      console.warn('Error loading registrar data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRegistrarData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRegistrarData();
  };

  // KPI Calculations
  const totalStudentsCount = students.length;
  const jhsCount = useMemo(() => {
    return students.filter((s) => {
      const g = (s.grade_level || '').toLowerCase();
      return g.includes('7') || g.includes('8') || g.includes('9') || g.includes('10');
    }).length;
  }, [students]);

  const shsCount = useMemo(() => {
    return students.filter((s) => {
      const g = (s.grade_level || '').toLowerCase();
      return g.includes('11') || g.includes('12') || g.includes('senior');
    }).length;
  }, [students]);

  const maleCount = useMemo(() => {
    return students.filter((s) => (s.gender || '').toLowerCase().startsWith('m')).length;
  }, [students]);

  const femaleCount = useMemo(() => {
    return students.filter((s) => (s.gender || '').toLowerCase().startsWith('f')).length;
  }, [students]);

  const completeDocsCount = useMemo(() => {
    return students.filter((s) => (s.documents_status || '').toLowerCase() === 'complete').length;
  }, [students]);

  const docsComplianceRate = totalStudentsCount > 0 ? Math.round((completeDocsCount / totalStudentsCount) * 100) : 0;

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${s.first_name || ''} ${s.middle_name || ''} ${s.last_name || ''}`.toLowerCase();
        const lrn = s.lrn || '';
        const email = (s.email || '').toLowerCase();
        if (!fullName.includes(q) && !lrn.includes(q) && !email.includes(q)) return false;
      }

      if (selectedGrade !== 'all') {
        const gradeStr = (s.grade_level || '').toLowerCase();
        if (!gradeStr.includes(selectedGrade.toLowerCase())) return false;
      }

      if (selectedSection !== 'all') {
        if ((s.section || '').toLowerCase() !== selectedSection.toLowerCase()) return false;
      }

      if (selectedStrand !== 'all') {
        if ((s.strand || '').toLowerCase() !== selectedStrand.toLowerCase()) return false;
      }

      if (selectedGender !== 'all') {
        const g = (s.gender || '').toLowerCase();
        if (!g.startsWith(selectedGender.toLowerCase())) return false;
      }

      if (selectedDocStatus !== 'all') {
        const status = (s.documents_status || 'incomplete').toLowerCase();
        if (selectedDocStatus === 'complete' && status !== 'complete') return false;
        if (selectedDocStatus === 'incomplete' && status === 'complete') return false;
      }

      return true;
    });
  }, [students, searchQuery, selectedGrade, selectedSection, selectedStrand, selectedGender, selectedDocStatus]);

  // Grade level breakdown matrix
  const gradeDistribution = useMemo(() => {
    const grades = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    return grades.map((gr) => {
      const inGrade = students.filter((s) => (s.grade_level || '').toLowerCase().includes(gr.toLowerCase().replace('grade ', '')));
      const male = inGrade.filter((s) => (s.gender || '').toLowerCase().startsWith('m')).length;
      const female = inGrade.filter((s) => (s.gender || '').toLowerCase().startsWith('f')).length;
      return {
        grade: gr,
        male,
        female,
        total: inGrade.length,
        percentage: totalStudentsCount > 0 ? ((inGrade.length / totalStudentsCount) * 100).toFixed(1) + '%' : '0.0%',
      };
    });
  }, [students, totalStudentsCount]);

  // Export to CSV
  const handleExportCsv = () => {
    const csvLines: string[] = [];
    csvLines.push('"REPUBLIC OF THE PHILIPPINES"');
    csvLines.push('"DEPARTMENT OF EDUCATION"');
    csvLines.push('"REGION VII, CENTRAL VISAYAS · DIVISION OF CITY OF NAGA"');
    csvLines.push('"PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL"');
    csvLines.push('"SCHOOL FORM 1 (SF1) - SCHOOL REGISTER"');
    csvLines.push('"School ID: 303035 · School Year 2026-2027"');
    csvLines.push('""');
    csvLines.push('"LRN","Last Name","First Name","Middle Name","Sex","Birth Date","Age","Grade Level","Strand","Section","Parent / Guardian","Contact Number","Documents Status","Academic Status"');

    filteredStudents.forEach((st) => {
      csvLines.push([
        `"${st.lrn || ''}"`,
        `"${st.last_name || ''}"`,
        `"${st.first_name || ''}"`,
        `"${st.middle_name || ''}"`,
        `"${st.gender || ''}"`,
        `"${st.date_of_birth || ''}"`,
        `"${st.age || ''}"`,
        `"${st.grade_level || ''}"`,
        `"${st.strand || ''}"`,
        `"${st.section || ''}"`,
        `"${st.parent_name || ''}"`,
        `"${st.parent_contact || st.contact_number || ''}"`,
        `"${st.documents_status || 'Incomplete'}"`,
        `"${st.academic_status || 'Enrolled'}"`,
      ].join(','));
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PLSNHS_SF1_School_Register_SY2026-2027_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print SF1
  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `PLSNHS_Official_DepEd_SF1_School_Register_SY2026-2027`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Print Styles */}
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
            font-size: 7.5pt !important;
          }
          .print-full {
            display: block !important;
            width: 100% !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #000000 !important;
            padding: 3px 5px !important;
            font-size: 7pt !important;
          }
          th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
              Registrar Official Reports &amp; School Register
            </h1>
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
              Office of the School Registrar
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            DepEd School Form 1 (SF1), official enrolment rosters, learner 201 file compliance, and certified school registers · S.Y. 2026–2027
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export SF1 (CSV)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#152e69] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0f1f4b] transition-all cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print DepEd SF1</span>
          </button>

          <PageHeaderNotificationSlot />
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Officially Enrolled
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
              {totalStudentsCount}
            </p>
            <span className="text-xs font-semibold text-slate-500">Learners</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-500">
            <span>{maleCount} Male</span>
            <span>•</span>
            <span>{femaleCount} Female</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Junior High School (JHS)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
              {jhsCount}
            </p>
            <span className="text-xs font-bold text-emerald-700">
              {totalStudentsCount > 0 ? Math.round((jhsCount / totalStudentsCount) * 100) : 0}% of Total
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Grades 7, 8, 9, and 10 Regular Enrollees</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Senior High School (SHS)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
              {shsCount}
            </p>
            <span className="text-xs font-bold text-slate-700">
              {totalStudentsCount > 0 ? Math.round((shsCount / totalStudentsCount) * 100) : 0}% of Total
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>TVL-ICT &amp; Academic Track Enrollees</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Document Compliance
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <FolderCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
              {docsComplianceRate}%
            </p>
            <span className="text-xs font-bold text-amber-700">Verified 201 Files</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>{completeDocsCount} complete · {totalStudentsCount - completeDocsCount} pending</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="no-print flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit border border-slate-200 overflow-x-auto max-w-full">
        <button
          type="button"
          onClick={() => setActiveTab('sf1_register')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'sf1_register'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <FileText className="h-3.5 w-3.5 text-blue-700" />
          <span>DepEd SF1 School Register</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('enrollment_matrix')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'enrollment_matrix'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Layers className="h-3.5 w-3.5 text-slate-700" />
          <span>Enrolment Demographics Matrix</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('documents_compliance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'documents_compliance'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <FolderCheck className="h-3.5 w-3.5 text-amber-700" />
          <span>201 File Compliance Audit</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sf1_printable')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'sf1_printable'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Printer className="h-3.5 w-3.5 text-slate-700" />
          <span>Printable DepEd Register Sheet</span>
        </button>
      </div>

      {/* TAB 1: SF1 SCHOOL REGISTER */}
      {activeTab === 'sf1_register' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="lg:col-span-2 relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student name, LRN, email..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#152e69] focus:outline-hidden"
                />
              </div>

              <div>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden"
                >
                  <option value="all">All Grade Levels</option>
                  <option value="7">Grade 7</option>
                  <option value="8">Grade 8</option>
                  <option value="9">Grade 9</option>
                  <option value="10">Grade 10</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>
              </div>

              <div>
                <select
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden"
                >
                  <option value="all">All Sexes</option>
                  <option value="m">Male</option>
                  <option value="f">Female</option>
                </select>
              </div>

              <div>
                <select
                  value={selectedDocStatus}
                  onChange={(e) => setSelectedDocStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:outline-hidden"
                >
                  <option value="all">All Document Statuses</option>
                  <option value="complete">Complete (Verified)</option>
                  <option value="incomplete">Incomplete (Pending)</option>
                </select>
              </div>

              <div className="flex items-center justify-end">
                <span className="text-xs font-bold text-slate-500">
                  Showing <strong className="text-slate-900">{filteredStudents.length}</strong> of {totalStudentsCount}
                </span>
              </div>
            </div>
          </div>

          {/* Master Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3.5">LRN</th>
                    <th className="px-4 py-3.5">Learner Name (DepEd Order)</th>
                    <th className="px-3 py-3.5 text-center">Sex</th>
                    <th className="px-3 py-3.5 text-center">Birth Date &amp; Age</th>
                    <th className="px-4 py-3.5">Grade &amp; Section</th>
                    <th className="px-4 py-3.5">Parent / Guardian</th>
                    <th className="px-4 py-3.5">Contact Number</th>
                    <th className="px-4 py-3.5 text-center">201 Compliance</th>
                    <th className="px-4 py-3.5 text-right">Academic Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-slate-400 mb-2" />
                        Loading school register records from Supabase...
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500">
                        <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                        No learner records matched your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {st.lrn || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">
                            {st.last_name}, {st.first_name} {st.middle_name ? `${st.middle_name.charAt(0)}.` : ''} {st.suffix || ''}
                          </div>
                          {st.email && <span className="text-[10px] text-slate-400 block">{st.email}</span>}
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10.5px] ${
                            (st.gender || '').toLowerCase().startsWith('m')
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {(st.gender || 'M').toUpperCase().charAt(0)}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap font-mono text-[11px] text-slate-600">
                          {st.date_of_birth || '—'} {st.age ? `(${st.age}y)` : ''}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-800 block">{st.grade_level || 'Grade 10'}</span>
                          <span className="text-[10.5px] text-slate-500">{st.section || 'Unassigned'} {st.strand ? `· ${st.strand}` : ''}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {st.parent_name || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                          {st.parent_contact || st.contact_number || '—'}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            (st.documents_status || '').toLowerCase() === 'complete'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              (st.documents_status || '').toLowerCase() === 'complete' ? 'bg-emerald-600' : 'bg-amber-600'
                            }`} />
                            {(st.documents_status || 'Incomplete').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Badge variant="neutral" size="sm">
                            {st.academic_status || 'Enrolled'}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ENROLMENT DEMOGRAPHICS MATRIX */}
      {activeTab === 'enrollment_matrix' && (
        <div className="space-y-6">
          {/* Grade Distribution Matrix */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 font-display">
                  Official Grade Level Enrolment Summary
                </h3>
                <p className="text-xs text-slate-500">
                  DepEd enrolment breakdown by level and gender parity index · School Year 2026–2027
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                Total Enrolled: {totalStudentsCount}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Grade Level</th>
                    <th className="px-5 py-3 text-center">Male Enrollees</th>
                    <th className="px-5 py-3 text-center">Female Enrollees</th>
                    <th className="px-5 py-3 text-center">Total Enrollees</th>
                    <th className="px-5 py-3 text-right">Percentage Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradeDistribution.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{row.grade}</td>
                      <td className="px-5 py-3.5 text-center font-mono text-slate-700">{row.male}</td>
                      <td className="px-5 py-3.5 text-center font-mono text-slate-700">{row.female}</td>
                      <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-900">{row.total}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-semibold text-blue-700">{row.percentage}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-black border-t-2 border-slate-300">
                    <td className="px-5 py-3.5 text-slate-900 uppercase">Total Learners</td>
                    <td className="px-5 py-3.5 text-center font-mono text-slate-900">{maleCount}</td>
                    <td className="px-5 py-3.5 text-center font-mono text-slate-900">{femaleCount}</td>
                    <td className="px-5 py-3.5 text-center font-mono text-slate-900">{totalStudentsCount}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-900">100.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 201 FILE COMPLIANCE AUDIT */}
      {activeTab === 'documents_compliance' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 font-display">
                  Learner 201 File &amp; Credentials Compliance Audit
                </h3>
                <p className="text-xs text-slate-500">
                  Verification status of mandatory DepEd enrollment documents (PSA, SF9/Form 138, Good Moral, 2x2 Photo)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                  {completeDocsCount} Verified ({docsComplianceRate}%)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Learner Name</th>
                    <th className="px-4 py-3">LRN</th>
                    <th className="px-4 py-3">Grade &amp; Section</th>
                    <th className="px-4 py-3 text-center">PSA Birth Cert</th>
                    <th className="px-4 py-3 text-center">SF9 / Form 138</th>
                    <th className="px-4 py-3 text-center">Good Moral Cert</th>
                    <th className="px-4 py-3 text-center">2x2 Photo</th>
                    <th className="px-5 py-3 text-right">Overall Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.slice(0, 50).map((st) => {
                    const isComplete = (st.documents_status || '').toLowerCase() === 'complete';
                    return (
                      <tr key={st.id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3 font-bold text-slate-900">
                          {st.last_name}, {st.first_name}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">{st.lrn || '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{st.grade_level} – {st.section}</td>
                        <td className="px-4 py-3 text-center">
                          {st.psa_birth_url || isComplete ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {st.form_138_url || isComplete ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {st.good_moral_url || isComplete ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {st.two_by_two_picture_url || isComplete ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold">Pending</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isComplete ? 'COMPLIANT' : 'PENDING DOCS'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRINTABLE DEPED SF1 SHEET VIEW */}
      {activeTab === 'sf1_printable' && (
        <div className="space-y-4">
          <div className="no-print flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-2xl">
            <div className="flex items-center gap-3">
              <Printer className="h-5 w-5 text-blue-700" />
              <div>
                <p className="text-xs font-bold text-blue-900">Official DepEd School Form 1 (SF1) Print View</p>
                <p className="text-[11px] text-blue-700">Rendered in standard DepEd portrait layout ready for printing or PDF archiving.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#152e69] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0f1f4b] cursor-pointer"
            >
              <Printer className="h-4 w-4" /> Print Document
            </button>
          </div>

          {/* Actual Printable Document Container */}
          <div className="bg-white border border-slate-300 p-6 sm:p-8 rounded-2xl shadow-xs print-full space-y-4 font-serif">
            {/* DepEd Header */}
            <div className="text-center space-y-0.5 border-b border-black pb-3">
              <p className="text-[9pt] uppercase tracking-wider font-bold">Republic of the Philippines</p>
              <p className="text-[10pt] uppercase tracking-wider font-extrabold font-serif">Department of Education</p>
              <p className="text-[8.5pt]">Region VII, Central Visayas · Schools Division of City of Naga · District of Naga I</p>
              <h2 className="text-[12pt] font-black uppercase tracking-tight text-slate-950 pt-1">
                PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL
              </h2>
              <p className="text-[8pt] text-slate-600">Langtad, City of Naga, Cebu · School ID: 303035</p>
              <h3 className="text-[11pt] font-extrabold uppercase pt-2 tracking-wide font-sans">
                SCHOOL FORM 1 (SF1) · SCHOOL REGISTER
              </h3>
              <p className="text-[8pt] text-slate-600 font-sans">
                Master List of Enrolled Learners · School Year 2026–2027
              </p>
            </div>

            {/* School Form Details Grid */}
            <div className="grid grid-cols-4 gap-2 text-[8pt] font-sans border-b border-black pb-2">
              <div>
                <strong className="block text-slate-600">School Name:</strong>
                <span>Placido L. Señor NHS</span>
              </div>
              <div>
                <strong className="block text-slate-600">School ID:</strong>
                <span>303035</span>
              </div>
              <div>
                <strong className="block text-slate-600">District / Division:</strong>
                <span>Naga I / City of Naga</span>
              </div>
              <div>
                <strong className="block text-slate-600">Total Enrolment:</strong>
                <span>{filteredStudents.length} Students</span>
              </div>
            </div>

            {/* Print Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[7pt] border-collapse border border-black font-sans">
                <thead>
                  <tr className="bg-slate-100 uppercase border-b border-black text-[7pt]">
                    <th className="border border-black px-1.5 py-1 text-center w-8">#</th>
                    <th className="border border-black px-2 py-1">LRN</th>
                    <th className="border border-black px-2 py-1">Learner&apos;s Full Name (Last, First, Middle)</th>
                    <th className="border border-black px-1 py-1 text-center w-10">Sex</th>
                    <th className="border border-black px-2 py-1 text-center">Birth Date</th>
                    <th className="border border-black px-1 py-1 text-center w-8">Age</th>
                    <th className="border border-black px-2 py-1">Grade &amp; Section</th>
                    <th className="border border-black px-2 py-1">Parent / Guardian</th>
                    <th className="border border-black px-2 py-1">Contact Number</th>
                    <th className="border border-black px-2 py-1 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/30">
                  {filteredStudents.map((st, idx) => (
                    <tr key={st.id} className="text-[7pt]">
                      <td className="border border-black px-1.5 py-1 text-center font-mono">{idx + 1}</td>
                      <td className="border border-black px-2 py-1 font-mono font-bold">{st.lrn || '—'}</td>
                      <td className="border border-black px-2 py-1 font-bold">
                        {st.last_name}, {st.first_name} {st.middle_name || ''} {st.suffix || ''}
                      </td>
                      <td className="border border-black px-1 py-1 text-center font-bold">
                        {(st.gender || 'M').charAt(0).toUpperCase()}
                      </td>
                      <td className="border border-black px-2 py-1 text-center font-mono">{st.date_of_birth || '—'}</td>
                      <td className="border border-black px-1 py-1 text-center font-mono">{st.age || '—'}</td>
                      <td className="border border-black px-2 py-1">{st.grade_level} – {st.section}</td>
                      <td className="border border-black px-2 py-1 truncate max-w-[120px]">{st.parent_name || '—'}</td>
                      <td className="border border-black px-2 py-1 font-mono">{st.parent_contact || st.contact_number || '—'}</td>
                      <td className="border border-black px-2 py-1 text-center">{st.academic_status || 'Enrolled'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Official Certification Footer */}
            <div className="grid grid-cols-2 gap-8 pt-8 text-[8pt] font-sans border-t border-black">
              <div className="text-center space-y-8">
                <p className="text-left text-slate-600">Prepared and Audited by:</p>
                <div className="border-t border-black w-48 mx-auto pt-1 font-bold uppercase">
                  SCHOOL REGISTRAR
                  <span className="block text-[7pt] font-normal text-slate-500">Office of the School Registrar</span>
                </div>
              </div>

              <div className="text-center space-y-8">
                <p className="text-left text-slate-600">Certified Correct and Approved by:</p>
                <div className="border-t border-black w-48 mx-auto pt-1 font-bold uppercase">
                  SCHOOL PRINCIPAL
                  <span className="block text-[7pt] font-normal text-slate-500">Secondary School Principal I / IV</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

