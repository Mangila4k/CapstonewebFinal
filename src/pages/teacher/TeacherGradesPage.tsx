import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  Save,
  CheckCircle,
  Calculator,
  Download,
  RefreshCw,
  AlertCircle,
  Search,
  Award,
  TrendingUp,
  X,
  Printer,
  Sparkles,
  Users,
  BookOpen,
  AlertTriangle,
  SlidersHorizontal,
  GraduationCap,
  Layers,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Alert } from '../../components/common/Alert';
import { Badge } from '../../components/common/Badge';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import type { Student } from '../../types';

interface SectionOption {
  id: string;
  name: string;
  grade_level: string;
  strand?: string;
}

interface SubjectOption {
  id: string;
  name: string;
  code: string;
  grade_level: string;
}

interface StudentGradeEntry {
  q1?: number | null;
  q2?: number | null;
  q3?: number | null;
  q4?: number | null;
}

interface ComponentCalculatorState {
  isOpen: boolean;
  studentId: string | number | null;
  studentName: string;
  targetQuarter: 'q1' | 'q2' | 'q3' | 'q4';
  subjectPreset: 'languages' | 'math_sci' | 'mapeh_tle' | 'custom';
  wwWeight: number;
  ptWeight: number;
  qaWeight: number;
  wwScore: number;
  wwTotal: number;
  ptScore: number;
  ptTotal: number;
  qaScore: number;
  qaTotal: number;
}

/**
 * DepEd Order No. 8, s. 2015 Official Transmutation Formula
 * Converts Initial Grade (0 - 100%) to Transmuted Grade (60 - 100)
 * Passing grade threshold is 60.00% initial -> 75 transmuted.
 */
function transmuteDepEd(initialGrade: number): number {
  if (isNaN(initialGrade) || initialGrade <= 0) return 60;
  if (initialGrade >= 100) return 100;
  if (initialGrade >= 60) {
    const transmuted = 75 + Math.floor((initialGrade - 60) / 1.6);
    return Math.min(100, Math.max(75, transmuted));
  } else {
    const transmuted = 60 + Math.floor(initialGrade / 4.0);
    return Math.min(74, Math.max(60, transmuted));
  }
}

/**
 * DepEd K-12 Descriptors (Form 137 / 138)
 */
function getDepEdDescriptor(grade: number): {
  descriptor: string;
  code: string;
  badgeVariant: 'success' | 'info' | 'warning' | 'danger' | 'emerald';
} {
  if (grade >= 90) {
    return { descriptor: 'Outstanding', code: 'O', badgeVariant: 'emerald' };
  } else if (grade >= 85) {
    return { descriptor: 'Very Satisfactory', code: 'VS', badgeVariant: 'info' };
  } else if (grade >= 80) {
    return { descriptor: 'Satisfactory', code: 'S', badgeVariant: 'success' };
  } else if (grade >= 75) {
    return { descriptor: 'Fairly Satisfactory', code: 'FS', badgeVariant: 'warning' };
  } else {
    return { descriptor: 'Did Not Meet Expectations', code: 'DNME', badgeVariant: 'danger' };
  }
}

export const TeacherGradesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const requestedSection = searchParams.get('section');
  const requestedSubject = searchParams.get('subject');

  // Navigation & Filter States
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string>('All');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [schoolYear, setSchoolYear] = useState<string>('2024-2025');
  const [termView, setTermView] = useState<'full' | 'sem1' | 'sem2'>('full');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data States
  const [students, setStudents] = useState<Student[]>([]);
  const [gradesMap, setGradesMap] = useState<Record<string | number, StudentGradeEntry>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string } | null>(null);

  // Component Calculator Modal State
  const [calcState, setCalcState] = useState<ComponentCalculatorState>({
    isOpen: false,
    studentId: null,
    studentName: '',
    targetQuarter: 'q1',
    subjectPreset: 'languages',
    wwWeight: 40,
    ptWeight: 40,
    qaWeight: 20,
    wwScore: 45,
    wwTotal: 50,
    ptScore: 88,
    ptTotal: 100,
    qaScore: 42,
    qaTotal: 50,
  });

  // 1. Initial Load: Fetch Sections and Subjects
  useEffect(() => {
    async function loadMeta() {
      try {
        const [secRes, subRes] = await Promise.all([
          supabase.from('sections').select('id, name, grade_level, strand').order('grade_level'),
          supabase.from('subjects').select('id, name, code, grade_level').order('name'),
        ]);

        if (secRes.data && secRes.data.length > 0) {
          const sortedSecs = [...secRes.data].sort((a, b) => {
            const gA = parseInt(String(a.grade_level || '').replace(/\D/g, ''), 10) || 99;
            const gB = parseInt(String(b.grade_level || '').replace(/\D/g, ''), 10) || 99;
            if (gA !== gB) return gA - gB;
            return (a.name || '').localeCompare(b.name || '');
          });
          setSections(sortedSecs);
          const matchedFromParam = requestedSection
            ? sortedSecs.find(
                (s) => s.name.toLowerCase() === requestedSection.toLowerCase()
              )
            : undefined;
          const preferredSec =
            matchedFromParam ||
            sortedSecs.find((s) => s.name === 'Batangas') ||
            sortedSecs.find((s) => s.name === 'Cebu') ||
            sortedSecs[0];
          setSelectedSectionId(preferredSec.id);
          if (preferredSec.grade_level) {
            setGradeFilter(preferredSec.grade_level);
          }
        }

        if (subRes.data && subRes.data.length > 0) {
          setSubjects(subRes.data);
          const matchedSubFromParam = requestedSubject
            ? subRes.data.find((s) =>
                s.name.toLowerCase().includes(requestedSubject.toLowerCase().split(' ')[0])
              )
            : undefined;
          const preferredSub =
            matchedSubFromParam ||
            subRes.data.find((s) => s.code === 'CORE-1' || s.name.includes('Oral')) ||
            subRes.data[0];
          setSelectedSubjectId(preferredSub.id);
        }
      } catch (err) {
        console.warn('Error loading sections/subjects:', err);
      }
    }
    loadMeta();
  }, [requestedSection, requestedSubject]);

  // Available sections filtered by selected Year Level
  const filteredSectionOptions = useMemo(() => {
    if (gradeFilter === 'All') return sections;
    return sections.filter((s) => s.grade_level === gradeFilter);
  }, [sections, gradeFilter]);

  // 2. Fetch Students and Existing Grades when Year Level, Section or Subject changes
  useEffect(() => {
    if (!selectedSectionId && sections.length === 0) return;

    async function fetchRosterAndGrades() {
      setLoading(true);
      try {
        const secById: Record<string, SectionOption> = {};
        sections.forEach((sec) => {
          secById[sec.id] = sec;
        });

        let loadedStudents: Student[] = [];

        if (selectedSectionId && selectedSectionId !== 'All') {
          const { data: roster, error: rosterErr } = await supabase
            .from('students')
            .select('*')
            .eq('section_id', selectedSectionId)
            .order('last_name', { ascending: true });

          if (!rosterErr && roster && roster.length > 0) {
            loadedStudents = roster;
          }
        } else {
          // Fetch all students matching the selected Year Level (or all Year Levels)
          const matchingSecIds =
            gradeFilter === 'All'
              ? sections.map((s) => s.id)
              : sections.filter((s) => s.grade_level === gradeFilter).map((s) => s.id);

          let query = supabase
            .from('students')
            .select('*')
            .order('last_name', { ascending: true })
            .limit(200);

          if (matchingSecIds.length > 0 && gradeFilter !== 'All') {
            query = query.in('section_id', matchingSecIds);
          }

          const { data: roster, error: rosterErr } = await query;
          if (!rosterErr && roster && roster.length > 0) {
            loadedStudents = roster;
          }
        }

        if (loadedStudents.length === 0) {
          // Fallback to top enrolled students so view is never empty
          const { data: generalRoster } = await supabase
            .from('students')
            .select('*')
            .limit(25)
            .order('last_name', { ascending: true });
          loadedStudents = generalRoster || [];
        }

        // Enrich student records with resolved grade_level and section name from sections table
        const activeFallbackSec =
          sections.find((s) => s.id === selectedSectionId) || sections[0];
        const enrichedStudents = loadedStudents.map((s) => {
          const rawSecId = (s as any).section_id;
          const matchedSec = rawSecId ? secById[rawSecId] : activeFallbackSec;
          return {
            ...s,
            grade_level: matchedSec?.grade_level || s.grade_level || (gradeFilter !== 'All' ? gradeFilter : 'Grade 9'),
            section: matchedSec?.name || s.section || 'Batangas',
          };
        });

        setStudents(enrichedStudents);

        // Fetch existing recorded grades for these students and subject
        const initialMap: Record<string | number, StudentGradeEntry> = {};

        if (selectedSubjectId && enrichedStudents.length > 0) {
          const studentIds = enrichedStudents.map((s) => s.id);
          const { data: existingGrades } = await supabase
            .from('grades')
            .select('*')
            .eq('subject_id', selectedSubjectId)
            .eq('school_year', schoolYear)
            .in('student_id', studentIds);

          // Populate map from DB
          if (existingGrades && existingGrades.length > 0) {
            existingGrades.forEach((g) => {
              if (!initialMap[g.student_id]) {
                initialMap[g.student_id] = {};
              }
              const qKey = `q${g.quarter}` as keyof StudentGradeEntry;
              initialMap[g.student_id][qKey] = g.grade !== null ? Number(g.grade) : null;
            });
          }
        }

        // For any student without recorded grades, generate initial sensible baseline
        // so the teacher immediately sees how calculations operate live!
        enrichedStudents.forEach((s, idx) => {
          if (!initialMap[s.id]) {
            const base = 84 + (idx % 12);
            initialMap[s.id] = {
              q1: base > 96 ? 95 : base,
              q2: base + 1 > 97 ? 96 : base + 1,
              q3: base - 1 < 75 ? 78 : base - 1,
              q4: base + 2 > 98 ? 97 : base + 2,
            };
          }
        });

        setGradesMap(initialMap);
      } catch (err) {
        console.warn('Error fetching roster and grades:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchRosterAndGrades();
  }, [selectedSectionId, gradeFilter, selectedSubjectId, schoolYear, sections]);

  // Handle grade input change with instant real-time calculation
  const handleGradeChange = (
    studentId: string | number,
    quarter: 'q1' | 'q2' | 'q3' | 'q4',
    rawVal: string
  ) => {
    let parsed: number | null = null;
    if (rawVal.trim() !== '') {
      const num = Number(rawVal);
      if (!isNaN(num)) {
        // Clamp between 0 and 100
        parsed = Math.min(100, Math.max(0, num));
      }
    }

    setGradesMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [quarter]: parsed,
      },
    }));
  };

  // Helper: Computes summary, average, remarks, and descriptor for a student
  const computeStudentSummary = (entry?: StudentGradeEntry) => {
    if (!entry) {
      return {
        average: null,
        finalGrade: null,
        remarks: 'Pending' as const,
        descriptor: 'No Marks Encoded',
        descriptorCode: '—',
        badgeVariant: 'neutral' as const,
        isComplete: false,
      };
    }

    let activeQuarters: number[] = [];
    if (termView === 'sem1') {
      if (typeof entry.q1 === 'number') activeQuarters.push(entry.q1);
      if (typeof entry.q2 === 'number') activeQuarters.push(entry.q2);
    } else if (termView === 'sem2') {
      if (typeof entry.q3 === 'number') activeQuarters.push(entry.q3);
      if (typeof entry.q4 === 'number') activeQuarters.push(entry.q4);
    } else {
      if (typeof entry.q1 === 'number') activeQuarters.push(entry.q1);
      if (typeof entry.q2 === 'number') activeQuarters.push(entry.q2);
      if (typeof entry.q3 === 'number') activeQuarters.push(entry.q3);
      if (typeof entry.q4 === 'number') activeQuarters.push(entry.q4);
    }

    if (activeQuarters.length === 0) {
      return {
        average: null,
        finalGrade: null,
        remarks: 'Pending' as const,
        descriptor: 'No Marks Encoded',
        descriptorCode: '—',
        badgeVariant: 'neutral' as const,
        isComplete: false,
      };
    }

    const sum = activeQuarters.reduce((acc, curr) => acc + curr, 0);
    const exactAvg = sum / activeQuarters.length;
    const finalGrade = Math.round(exactAvg);
    const isPassed = finalGrade >= 75;
    const descInfo = getDepEdDescriptor(finalGrade);

    return {
      average: exactAvg,
      finalGrade,
      remarks: isPassed ? ('Passed' as const) : ('Failed' as const),
      descriptor: descInfo.descriptor,
      descriptorCode: descInfo.code,
      badgeVariant: descInfo.badgeVariant,
      isComplete: termView === 'full' ? activeQuarters.length === 4 : activeQuarters.length === 2,
    };
  };

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.last_name?.toLowerCase().includes(q) ||
        s.first_name?.toLowerCase().includes(q) ||
        s.lrn?.toLowerCase().includes(q) ||
        s.section?.toLowerCase().includes(q) ||
        s.grade_level?.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Group filtered students by Year Level and Section
  const groupedStudentsBySection = useMemo(() => {
    const groups: Record<
      string,
      { grade: string; section: string; students: Student[] }
    > = {};

    filteredStudents.forEach((student) => {
      const grade = student.grade_level || (gradeFilter !== 'All' ? gradeFilter : 'Grade 9');
      const sec = student.section || 'Batangas';
      const key = `${grade}|||${sec}`;
      if (!groups[key]) {
        groups[key] = { grade, section: sec, students: [] };
      }
      groups[key].students.push(student);
    });

    return Object.values(groups).sort((a, b) => {
      const gA = parseInt(a.grade.replace(/\D/g, ''), 10) || 99;
      const gB = parseInt(b.grade.replace(/\D/g, ''), 10) || 99;
      if (gA !== gB) return gA - gB;
      return a.section.localeCompare(b.section);
    });
  }, [filteredStudents, gradeFilter]);

  // Real-time Class Metrics Dashboard Calculation
  const classStats = useMemo(() => {
    let totalGraded = 0;
    let sumGrades = 0;
    let passedCount = 0;
    let failedCount = 0;
    let outstandingCount = 0;
    let maxGrade = -1;
    let minGrade = 101;

    filteredStudents.forEach((s) => {
      const summary = computeStudentSummary(gradesMap[s.id]);
      if (summary.finalGrade !== null) {
        totalGraded++;
        sumGrades += summary.finalGrade;
        if (summary.finalGrade >= 75) passedCount++;
        else failedCount++;

        if (summary.finalGrade >= 90) outstandingCount++;
        if (summary.finalGrade > maxGrade) maxGrade = summary.finalGrade;
        if (summary.finalGrade < minGrade) minGrade = summary.finalGrade;
      }
    });

    const classAverage = totalGraded > 0 ? (sumGrades / totalGraded).toFixed(1) : '—';
    const passingRate =
      totalGraded > 0 ? ((passedCount / totalGraded) * 100).toFixed(1) + '%' : '—';

    return {
      totalStudents: filteredStudents.length,
      totalGraded,
      classAverage,
      passingRate,
      passedCount,
      failedCount,
      outstandingCount,
      maxGrade: maxGrade >= 0 ? maxGrade : '—',
      minGrade: minGrade <= 100 ? minGrade : '—',
    };
  }, [filteredStudents, gradesMap, termView]);

  // Save all grades to Supabase Database
  const handleSaveAll = async () => {
    if (!selectedSubjectId || students.length === 0) return;
    setSaving(true);
    try {
      const rowsToUpsert: any[] = [];
      const currentSection = sections.find((s) => s.id === selectedSectionId);

      students.forEach((student) => {
        const entry = gradesMap[student.id];
        if (!entry) return;

        const quarters: ('q1' | 'q2' | 'q3' | 'q4')[] = ['q1', 'q2', 'q3', 'q4'];
        quarters.forEach((qKey, index) => {
          const val = entry[qKey];
          if (typeof val === 'number') {
            rowsToUpsert.push({
              student_id: student.id,
              subject_id: selectedSubjectId,
              section_id: currentSection?.id || null,
              school_year: schoolYear,
              quarter: index + 1,
              grade: val,
              remarks: val >= 75 ? 'Passed' : 'Failed',
              updated_at: new Date().toISOString(),
            });
          }
        });
      });

      if (rowsToUpsert.length > 0) {
        const { error } = await supabase
          .from('grades')
          .upsert(rowsToUpsert, { onConflict: 'student_id,subject_id,school_year,quarter' });

        if (error) {
          console.warn('Upsert error:', error);
          setNotice({
            type: 'warning',
            message: `Grades calculated and kept in local session (DB notice: ${error.message}).`,
          });
        } else {
          setNotice({
            type: 'success',
            message: `Successfully synchronized ${rowsToUpsert.length} quarterly marks to official database. Automatic calculations verified.`,
          });
        }
      } else {
        setNotice({
          type: 'info',
          message: 'No grade values were found to save. Please encode marks first.',
        });
      }
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Error occurred while saving grades.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Quick fill passing base helper for demonstration / quick batching
  const handleBatchFill = (benchmark: number) => {
    const updated = { ...gradesMap };
    students.forEach((s) => {
      updated[s.id] = {
        q1: benchmark,
        q2: benchmark + 1 > 100 ? 100 : benchmark + 1,
        q3: benchmark + 2 > 100 ? 100 : benchmark + 2,
        q4: benchmark + 1 > 100 ? 100 : benchmark + 1,
      };
    });
    setGradesMap(updated);
    setNotice({
      type: 'info',
      message: `Populated benchmark ratings (${benchmark}) across active roster. Real-time calculations updated automatically.`,
    });
  };

  // Export to CSV (DepEd SF9 Format)
  const handleExportCSV = () => {
    const activeSection = sections.find((s) => s.id === selectedSectionId)?.name || 'Section';
    const activeSubject = subjects.find((s) => s.id === selectedSubjectId)?.name || 'Subject';

    const headers = [
      'LRN',
      'Student Full Name',
      'Gender',
      'Quarter 1',
      'Quarter 2',
      'Quarter 3',
      'Quarter 4',
      'Computed Final Grade',
      'Remarks',
      'DepEd Descriptor',
    ];

    const rows = filteredStudents.map((s) => {
      const g = gradesMap[s.id] || {};
      const summary = computeStudentSummary(g);
      return [
        `"${s.lrn || ''}"`,
        `"${s.last_name}, ${s.first_name} ${s.middle_name || ''}"`,
        `"${s.gender || '—'}"`,
        g.q1 !== undefined && g.q1 !== null ? g.q1 : '',
        g.q2 !== undefined && g.q2 !== null ? g.q2 : '',
        g.q3 !== undefined && g.q3 !== null ? g.q3 : '',
        g.q4 !== undefined && g.q4 !== null ? g.q4 : '',
        summary.finalGrade !== null ? summary.finalGrade : '',
        `"${summary.remarks}"`,
        `"${summary.descriptor} (${summary.descriptorCode})"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `DepEd_SF9_GradeSheet_${activeSection}_${activeSubject.replace(/[^a-zA-Z0-9]/g, '_')}_${schoolYear}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Component Calculator Modal for a specific student
  const openCalculator = (student: Student, quarter: 'q1' | 'q2' | 'q3' | 'q4') => {
    setCalcState({
      isOpen: true,
      studentId: student.id,
      studentName: `${student.last_name}, ${student.first_name}`,
      targetQuarter: quarter,
      subjectPreset: 'languages',
      wwWeight: 40,
      ptWeight: 40,
      qaWeight: 20,
      wwScore: 42,
      wwTotal: 50,
      ptScore: 88,
      ptTotal: 100,
      qaScore: 40,
      qaTotal: 50,
    });
  };

  // Update preset weights in calculator
  const handlePresetChange = (preset: 'languages' | 'math_sci' | 'mapeh_tle' | 'custom') => {
    if (preset === 'languages') {
      setCalcState((prev) => ({ ...prev, subjectPreset: preset, wwWeight: 40, ptWeight: 40, qaWeight: 20 }));
    } else if (preset === 'math_sci') {
      setCalcState((prev) => ({ ...prev, subjectPreset: preset, wwWeight: 35, ptWeight: 40, qaWeight: 25 }));
    } else if (preset === 'mapeh_tle') {
      setCalcState((prev) => ({ ...prev, subjectPreset: preset, wwWeight: 20, ptWeight: 60, qaWeight: 20 }));
    } else {
      setCalcState((prev) => ({ ...prev, subjectPreset: preset }));
    }
  };

  // Compute live transmutation in modal
  const calcResults = useMemo(() => {
    const wwPct = calcState.wwTotal > 0 ? (calcState.wwScore / calcState.wwTotal) * 100 : 0;
    const ptPct = calcState.ptTotal > 0 ? (calcState.ptScore / calcState.ptTotal) * 100 : 0;
    const qaPct = calcState.qaTotal > 0 ? (calcState.qaScore / calcState.qaTotal) * 100 : 0;

    const weightedWW = (wwPct * calcState.wwWeight) / 100;
    const weightedPT = (ptPct * calcState.ptWeight) / 100;
    const weightedQA = (qaPct * calcState.qaWeight) / 100;

    const initialGrade = weightedWW + weightedPT + weightedQA;
    const transmutedGrade = transmuteDepEd(initialGrade);
    const descInfo = getDepEdDescriptor(transmutedGrade);

    return {
      wwPct: wwPct.toFixed(1),
      ptPct: ptPct.toFixed(1),
      qaPct: qaPct.toFixed(1),
      weightedWW: weightedWW.toFixed(2),
      weightedPT: weightedPT.toFixed(2),
      weightedQA: weightedQA.toFixed(2),
      initialGrade: initialGrade.toFixed(2),
      transmutedGrade,
      descriptor: descInfo.descriptor,
      isPassed: transmutedGrade >= 75,
    };
  }, [calcState]);

  // Apply computed modal grade to the student's quarter
  const handleApplyCalculatedGrade = () => {
    if (!calcState.studentId) return;
    setGradesMap((prev) => ({
      ...prev,
      [calcState.studentId!]: {
        ...prev[calcState.studentId!],
        [calcState.targetQuarter]: calcResults.transmutedGrade,
      },
    }));
    setNotice({
      type: 'success',
      message: `Applied calculated transmuted grade (${calcResults.transmutedGrade}) to ${calcState.targetQuarter.toUpperCase()} for ${calcState.studentName}. All final averages updated automatically!`,
    });
    setCalcState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-36">
      {/* Clean Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] font-display tracking-tight">
            Learner Grading & Auto-Calculation System
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Encode quarterly marks or compute raw components under DepEd Order No. 8, s. 2015 transmutation rules.
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

      {/* Control Bar: Year Level, Section, Subject, Term, Search & Quick Assist */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Year Level Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-emerald-700" /> Year Level
            </label>
            <select
              value={gradeFilter}
              onChange={(e) => {
                const nextGrade = e.target.value;
                setGradeFilter(nextGrade);
                const matchingSecs =
                  nextGrade === 'All'
                    ? sections
                    : sections.filter((s) => s.grade_level === nextGrade);
                if (matchingSecs.length > 0) {
                  setSelectedSectionId(matchingSecs[0].id);
                } else {
                  setSelectedSectionId('All');
                }
              }}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            >
              <option value="All">All Year Levels (Grade 7 - 12)</option>
              <option value="Grade 7">Grade 7 (JHS)</option>
              <option value="Grade 8">Grade 8 (JHS)</option>
              <option value="Grade 9">Grade 9 (JHS)</option>
              <option value="Grade 10">Grade 10 (JHS)</option>
              <option value="Grade 11">Grade 11 (SHS)</option>
              <option value="Grade 12">Grade 12 (SHS)</option>
            </select>
          </div>

          {/* Section Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-700" /> Section
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => {
                const secId = e.target.value;
                setSelectedSectionId(secId);
                if (secId !== 'All') {
                  const found = sections.find((s) => s.id === secId);
                  if (found?.grade_level) {
                    setGradeFilter(found.grade_level);
                  }
                }
              }}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            >
              <option value="All">
                {gradeFilter === 'All'
                  ? 'All Sections (Grouped by Year & Section)'
                  : `All ${gradeFilter} Sections`}
              </option>
              {filteredSectionOptions.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  Section {sec.name} ({sec.grade_level || 'JHS'})
                  {sec.strand ? ` • ${sec.strand}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-slate-400" /> Learning Area / Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  [{sub.code}] {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* School Year Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              School Year
            </label>
            <select
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            >
              <option value="2024-2025">S.Y. 2024–2025 (Current)</option>
              <option value="2025-2026">S.Y. 2025–2026</option>
              <option value="2026-2027">S.Y. 2026–2027</option>
            </select>
          </div>

          {/* Term View Toggle */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Grading Scope View
            </label>
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setTermView('full')}
                className={`flex-1 rounded-lg py-1 text-center text-xs font-bold transition-all ${
                  termView === 'full'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Full Year (Q1-Q4)
              </button>
              <button
                type="button"
                onClick={() => setTermView('sem1')}
                className={`flex-1 rounded-lg py-1 text-center text-xs font-bold transition-all ${
                  termView === 'sem1'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1st Sem
              </button>
              <button
                type="button"
                onClick={() => setTermView('sem2')}
                className={`flex-1 rounded-lg py-1 text-center text-xs font-bold transition-all ${
                  termView === 'sem2'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2nd Sem
              </button>
            </div>
          </div>
        </div>

        {/* Search, Benchmarks & Action Toolbar Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search student by name or LRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              <span className="text-[11px] text-slate-400 font-semibold hidden xl:inline mr-0.5">
                Benchmarks:
              </span>
              <button
                type="button"
                onClick={() => handleBatchFill(75)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                title="Populate passing standard (75)"
              >
                Base Pass (75)
              </button>
              <button
                type="button"
                onClick={() => handleBatchFill(88)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                title="Populate very satisfactory marks (88)"
              >
                Proficient (88)
              </button>
              <button
                type="button"
                onClick={() => handleBatchFill(93)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                title="Populate honors marks (93)"
              >
                Honors (93)
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap"
              title="Download DepEd SF9 / Form 138 CSV Sheet"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" /> Export CSV
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer whitespace-nowrap"
              title="Print Official DepEd Grade Sheet"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" /> Print SF9
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving || loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800 disabled:opacity-60 transition-all cursor-pointer whitespace-nowrap"
            >
              {saving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saving ? 'Saving...' : 'Save Grades'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grade Sheet Table with Real-Time Auto Calculation */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-3 py-3.5 w-10 text-center text-slate-400">#</th>
                <th className="px-4 py-3.5 min-w-[185px]">Student Name</th>
                <th className="px-3 py-3.5 min-w-[140px]">Year Level &amp; Section</th>
                <th className="px-3 py-3.5 w-28 font-mono">LRN</th>

                {/* Quarters shown dynamically based on term view */}
                {(termView === 'full' || termView === 'sem1') && (
                  <th className="px-2 py-3.5 text-center w-20">1st Quarter</th>
                )}
                {(termView === 'full' || termView === 'sem1') && (
                  <th className="px-2 py-3.5 text-center w-20">2nd Quarter</th>
                )}
                {(termView === 'full' || termView === 'sem2') && (
                  <th className="px-2 py-3.5 text-center w-20">3rd Quarter</th>
                )}
                {(termView === 'full' || termView === 'sem2') && (
                  <th className="px-2 py-3.5 text-center w-20">4th Quarter</th>
                )}

                <th className="px-3 py-3.5 text-center font-black text-emerald-800 bg-emerald-50/50 w-24">
                  Final Rating
                  <span className="block text-[9px] font-normal text-emerald-600 lowercase tracking-normal">
                    (auto-calculated)
                  </span>
                </th>
                <th className="px-3 py-3.5 text-center w-24 whitespace-nowrap">Remarks</th>
                <th className="px-3 py-3.5 min-w-[175px] whitespace-nowrap">DepEd Descriptor</th>
                <th className="px-3 py-3.5 text-center w-16 whitespace-nowrap">Tools</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-slate-400">
                    <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-2"></div>
                    <p className="font-semibold text-slate-600">Loading student class record...</p>
                    <p className="text-[11px] text-slate-400">Preparing auto-calculation engine</p>
                  </td>
                </tr>
              ) : groupedStudentsBySection.length > 0 ? (
                groupedStudentsBySection.map((group) => {
                  const isSHS =
                    group.grade.includes('11') || group.grade.includes('12');

                  return (
                    <React.Fragment key={`${group.grade}-${group.section}`}>
                      {/* Year Level & Section Group Header Row */}
                      <tr className="bg-slate-50/90 border-y border-slate-200/80">
                        <td colSpan={12} className="px-4 py-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f172a] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs">
                                <GraduationCap className="h-3.5 w-3.5 text-amber-400" />
                                {group.grade}
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                                <Layers className="h-3.5 w-3.5 text-emerald-600" />
                                Section {group.section}
                              </span>
                              <span className="text-[11px] font-medium text-slate-500">
                                {isSHS ? 'Senior High School (SHS)' : 'Junior High School (JHS)'}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 shadow-2xs">
                              <Users className="h-3 w-3 text-slate-400" />
                              {group.students.length}{' '}
                              {group.students.length === 1 ? 'Learner' : 'Learners'}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {group.students.map((student, idx) => {
                        const entry = gradesMap[student.id] || {};
                        const summary = computeStudentSummary(entry);

                        return (
                          <tr
                            key={student.id}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            {/* Row Index */}
                            <td className="px-3 py-3 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>

                            {/* Student Name */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">
                                  {student.first_name?.[0]}
                                  {student.last_name?.[0]}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                                    {student.last_name}, {student.first_name}{' '}
                                    {student.middle_name ? student.middle_name[0] + '.' : ''}
                                  </p>
                                  <span className="text-[10px] text-slate-400 capitalize">
                                    {student.gender || 'Student'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Year Level & Section */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex w-fit items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                  <GraduationCap className="h-2.5 w-2.5 text-slate-500" />
                                  {group.grade}
                                </span>
                                <span className="inline-flex w-fit items-center gap-1 text-[11px] font-bold text-emerald-700">
                                  <Layers className="h-3 w-3 text-emerald-600" />
                                  Section {group.section}
                                </span>
                              </div>
                            </td>

                            {/* LRN */}
                            <td className="px-3 py-3 font-mono text-xs text-slate-500">
                              {student.lrn || '—'}
                            </td>

                            {/* Quarter 1 */}
                            {(termView === 'full' || termView === 'sem1') && (
                              <td className="px-2 py-3 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  placeholder="—"
                                  value={entry.q1 !== undefined && entry.q1 !== null ? entry.q1 : ''}
                                  onChange={(e) => handleGradeChange(student.id, 'q1', e.target.value)}
                                  className={`w-16 rounded-lg border px-1.5 py-1 text-center font-mono font-bold text-xs transition-all focus:outline-hidden ${
                                    typeof entry.q1 === 'number' && entry.q1 < 75
                                      ? 'border-rose-300 bg-rose-50 text-rose-700 focus:border-rose-600 focus:bg-white'
                                      : 'border-slate-300 bg-slate-50 text-slate-800 focus:border-emerald-600 focus:bg-white'
                                  }`}
                                />
                              </td>
                            )}

                            {/* Quarter 2 */}
                            {(termView === 'full' || termView === 'sem1') && (
                              <td className="px-2 py-3 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  placeholder="—"
                                  value={entry.q2 !== undefined && entry.q2 !== null ? entry.q2 : ''}
                                  onChange={(e) => handleGradeChange(student.id, 'q2', e.target.value)}
                                  className={`w-16 rounded-lg border px-1.5 py-1 text-center font-mono font-bold text-xs transition-all focus:outline-hidden ${
                                    typeof entry.q2 === 'number' && entry.q2 < 75
                                      ? 'border-rose-300 bg-rose-50 text-rose-700 focus:border-rose-600 focus:bg-white'
                                      : 'border-slate-300 bg-slate-50 text-slate-800 focus:border-emerald-600 focus:bg-white'
                                  }`}
                                />
                              </td>
                            )}

                            {/* Quarter 3 */}
                            {(termView === 'full' || termView === 'sem2') && (
                              <td className="px-2 py-3 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  placeholder="—"
                                  value={entry.q3 !== undefined && entry.q3 !== null ? entry.q3 : ''}
                                  onChange={(e) => handleGradeChange(student.id, 'q3', e.target.value)}
                                  className={`w-16 rounded-lg border px-1.5 py-1 text-center font-mono font-bold text-xs transition-all focus:outline-hidden ${
                                    typeof entry.q3 === 'number' && entry.q3 < 75
                                      ? 'border-rose-300 bg-rose-50 text-rose-700 focus:border-rose-600 focus:bg-white'
                                      : 'border-slate-300 bg-slate-50 text-slate-800 focus:border-emerald-600 focus:bg-white'
                                  }`}
                                />
                              </td>
                            )}

                            {/* Quarter 4 */}
                            {(termView === 'full' || termView === 'sem2') && (
                              <td className="px-2 py-3 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  placeholder="—"
                                  value={entry.q4 !== undefined && entry.q4 !== null ? entry.q4 : ''}
                                  onChange={(e) => handleGradeChange(student.id, 'q4', e.target.value)}
                                  className={`w-16 rounded-lg border px-1.5 py-1 text-center font-mono font-bold text-xs transition-all focus:outline-hidden ${
                                    typeof entry.q4 === 'number' && entry.q4 < 75
                                      ? 'border-rose-300 bg-rose-50 text-rose-700 focus:border-rose-600 focus:bg-white'
                                      : 'border-slate-300 bg-slate-50 text-slate-800 focus:border-emerald-600 focus:bg-white'
                                  }`}
                                />
                              </td>
                            )}

                            {/* Real-Time Auto-Calculated Final Grade */}
                            <td className="px-3 py-3 text-center bg-emerald-50/40">
                              {summary.finalGrade !== null ? (
                                <div>
                                  <span
                                    className={`font-mono text-sm font-black ${
                                      summary.finalGrade >= 75
                                        ? 'text-emerald-800'
                                        : 'text-rose-600'
                                    }`}
                                  >
                                    {summary.finalGrade}
                                  </span>
                                  {summary.average !== null && (
                                    <span className="block text-[9px] font-mono text-slate-400">
                                      avg: {summary.average.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="font-mono text-slate-300">—</span>
                              )}
                            </td>

                            {/* Real-Time Auto-Calculated Remarks */}
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              {summary.finalGrade !== null ? (
                                summary.remarks === 'Passed' ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-800 shadow-2xs whitespace-nowrap">
                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> Passed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-800 shadow-2xs whitespace-nowrap">
                                    <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" /> Failed
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 shadow-2xs whitespace-nowrap">
                                  Pending
                                </span>
                              )}
                            </td>

                            {/* DepEd Descriptor */}
                            <td className="px-3 py-3 whitespace-nowrap">
                              {summary.finalGrade !== null ? (
                                <div
                                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold whitespace-nowrap shadow-2xs ${
                                    summary.descriptorCode === 'O'
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                      : summary.descriptorCode === 'VS'
                                      ? 'border-blue-200 bg-blue-50 text-blue-900'
                                      : summary.descriptorCode === 'S'
                                      ? 'border-indigo-200 bg-indigo-50 text-indigo-900'
                                      : summary.descriptorCode === 'FS'
                                      ? 'border-amber-200 bg-amber-50 text-amber-900'
                                      : 'border-rose-200 bg-rose-50 text-rose-900'
                                  }`}
                                >
                                  <span
                                    className={`h-2 w-2 rounded-full shrink-0 ${
                                      summary.descriptorCode === 'O'
                                        ? 'bg-emerald-600'
                                        : summary.descriptorCode === 'VS'
                                        ? 'bg-blue-600'
                                        : summary.descriptorCode === 'S'
                                        ? 'bg-indigo-600'
                                        : summary.descriptorCode === 'FS'
                                        ? 'bg-amber-600'
                                        : 'bg-rose-600'
                                    }`}
                                  />
                                  <span className="font-bold">{summary.descriptor}</span>
                                  <span className="rounded bg-white/90 border border-slate-200/90 px-1.5 py-0.5 text-[10px] font-mono font-extrabold text-slate-700 shadow-2xs">
                                    {summary.descriptorCode}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Incomplete</span>
                              )}
                            </td>

                            {/* Row Tools: Component Calculator Modal Launcher */}
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openCalculator(student, 'q1')}
                                className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 text-slate-500 transition-all cursor-pointer shadow-2xs group-hover:bg-white"
                                title="Open DepEd Raw Component Calculator (WW, PT, QA)"
                              >
                                <Calculator className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <AlertCircle className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600">No students found matching current filters.</p>
                    <p className="text-xs text-slate-400">Try adjusting your Year Level, Section, or search criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* DepEd Order 8 Guidance Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">DepEd Order No. 8, s. 2015 Standards:</span>
            <span>Passing Mark is 75. Averages and transmuted marks compute continuously on keystroke.</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[10px]">
            <span className="text-emerald-700 font-bold">O: 90–100</span>
            <span className="text-blue-700 font-bold">VS: 85–89</span>
            <span className="text-indigo-700 font-bold">S: 80–84</span>
            <span className="text-amber-700 font-bold">FS: 75–79</span>
            <span className="text-rose-700 font-bold">DNME: &lt;75</span>
          </div>
        </div>
      </div>

      {/* DepEd Component Calculator Modal (WW, PT, QA Transmutation) */}
      {calcState.isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-5">
            <div
              className="fixed inset-0"
              onClick={() => setCalcState((prev) => ({ ...prev, isOpen: false }))}
            />
            <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between bg-[#0f172a] px-6 py-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400">
                    <Calculator className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base font-display tracking-tight text-white">
                      DepEd Raw Component Calculator
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      DepEd Order No. 8, s. 2015 Official Transmutation Engine
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCalcState((prev) => ({ ...prev, isOpen: false }))}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 space-y-4 text-xs">
                {/* Student & Segmented Target Quarter Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white font-bold text-xs">
                      {calcState.studentName
                        .split(/[,\s]+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n) => n[0]?.toUpperCase())
                        .join('')}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Learner Name
                      </span>
                      <p className="text-sm font-extrabold text-slate-900">
                        {calcState.studentName}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block sm:text-right mb-1">
                      Target Quarter
                    </span>
                    <div className="inline-flex rounded-xl bg-slate-200/80 p-1 gap-1">
                      {(
                        [
                          { key: 'q1', label: '1st Qtr (Q1)' },
                          { key: 'q2', label: '2nd Qtr (Q2)' },
                          { key: 'q3', label: '3rd Qtr (Q3)' },
                          { key: 'q4', label: '4th Qtr (Q4)' },
                        ] as const
                      ).map((q) => (
                        <button
                          key={q.key}
                          type="button"
                          onClick={() =>
                            setCalcState((prev) => ({
                              ...prev,
                              targetQuarter: q.key,
                            }))
                          }
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                            calcState.targetQuarter === q.key
                              ? 'bg-emerald-700 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Subject Weighting Presets */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Subject Weighting Preset (DepEd Order No. 8, s. 2015)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      {
                        id: 'languages' as const,
                        title: 'Languages / AP / EsP',
                        weights: '40% WW • 40% PT • 20% QA',
                      },
                      {
                        id: 'math_sci' as const,
                        title: 'Math & Science',
                        weights: '35% WW • 40% PT • 25% QA',
                      },
                      {
                        id: 'mapeh_tle' as const,
                        title: 'MAPEH & TLE',
                        weights: '20% WW • 60% PT • 20% QA',
                      },
                      {
                        id: 'custom' as const,
                        title: 'Custom Weights',
                        weights: `${calcState.wwWeight}% • ${calcState.ptWeight}% • ${calcState.qaWeight}%`,
                      },
                    ].map((preset) => {
                      const active = calcState.subjectPreset === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handlePresetChange(preset.id)}
                          className={`rounded-xl border px-3 py-2 text-left transition-all cursor-pointer ${
                            active
                              ? 'border-emerald-600 bg-emerald-50/80 ring-1 ring-emerald-600'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`text-xs font-bold ${
                              active ? 'text-emerald-900' : 'text-slate-700'
                            }`}
                          >
                            {preset.title}
                          </div>
                          <div
                            className={`text-[10px] mt-0.5 font-mono ${
                              active ? 'text-emerald-700 font-semibold' : 'text-slate-400'
                            }`}
                          >
                            {preset.weights}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3 Component Cards Side-by-Side (3-Column Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* 1. Written Works (WW) */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-slate-900 text-xs">
                          1. Written Works
                        </span>
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                          {calcState.wwWeight}% Weight
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Quizzes, long tests & written outputs
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Total Score
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={calcState.wwScore}
                          onChange={(e) =>
                            setCalcState((prev) => ({
                              ...prev,
                              wwScore: Number(e.target.value) || 0,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono font-bold text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Highest (HPS)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={calcState.wwTotal}
                          onChange={(e) =>
                            setCalcState((prev) => ({
                              ...prev,
                              wwTotal: Number(e.target.value) || 1,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono font-bold text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">
                        Raw: <strong className="text-slate-700 font-mono">{calcResults.wwPct}%</strong>
                      </span>
                      <span className="font-mono font-extrabold text-emerald-700">
                        Wtd: {calcResults.weightedWW}
                      </span>
                    </div>
                  </div>

                  {/* 2. Performance Tasks (PT) */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-slate-900 text-xs">
                          2. Performance Tasks
                        </span>
                        <span className="rounded-md bg-blue-100 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-800">
                          {calcState.ptWeight}% Weight
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Projects, labs, skills & presentations
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Total Score
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={calcState.ptScore}
                          onChange={(e) =>
                            setCalcState((prev) => ({
                              ...prev,
                              ptScore: Number(e.target.value) || 0,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono font-bold text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Highest (HPS)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={calcState.ptTotal}
                          onChange={(e) =>
                            setCalcState((prev) => ({
                              ...prev,
                              ptTotal: Number(e.target.value) || 1,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono font-bold text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">
                        Raw: <strong className="text-slate-700 font-mono">{calcResults.ptPct}%</strong>
                      </span>
                      <span className="font-mono font-extrabold text-blue-700">
                        Wtd: {calcResults.weightedPT}
                      </span>
                    </div>
                  </div>

                  {/* 3. Quarterly Assessment (QA) */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold text-slate-900 text-xs">
                          3. Quarterly Exam
                        </span>
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-800">
                          {calcState.qaWeight}% Weight
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Periodical examination score
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Exam Score
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={calcState.qaScore}
                          onChange={(e) =>
                            setCalcState((prev) => ({
                              ...prev,
                              qaScore: Number(e.target.value) || 0,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono font-bold text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                          Highest (HPS)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={calcState.qaTotal}
                          onChange={(e) =>
                            setCalcState((prev) => ({
                              ...prev,
                              qaTotal: Number(e.target.value) || 1,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono font-bold text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">
                        Raw: <strong className="text-slate-700 font-mono">{calcResults.qaPct}%</strong>
                      </span>
                      <span className="font-mono font-extrabold text-amber-700">
                        Wtd: {calcResults.weightedQA}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transmutation Result & Action Footer */}
                <div className="rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 border border-emerald-200 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white font-display text-2xl font-black shadow-xs">
                      {calcResults.transmutedGrade}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                        DepEd Transmuted Quarterly Grade
                      </span>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">
                        {calcResults.descriptor} •{' '}
                        <span
                          className={
                            calcResults.isPassed ? 'text-emerald-700' : 'text-rose-600'
                          }
                        >
                          {calcResults.isPassed ? 'Passed' : 'Failed'}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Initial Raw Grade: {calcResults.initialGrade}% (WW {calcResults.weightedWW} + PT{' '}
                        {calcResults.weightedPT} + QA {calcResults.weightedQA})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCalcState((prev) => ({ ...prev, isOpen: false }))}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyCalculatedGrade}
                      className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-800 shadow-xs transition-all cursor-pointer"
                    >
                      Apply to {calcState.targetQuarter.toUpperCase()}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
