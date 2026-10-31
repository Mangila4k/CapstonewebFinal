import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  GraduationCap,
  Layers,
  Users,
  Save,
  Eye,
  BookOpen,
  Upload,
  FileText,
  Download,
  Paperclip,
  ExternalLink,
  Check,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { Badge } from '../../components/common/Badge';
import type { Student } from '../../types';

export interface ClassroomAssessmentItem {
  id: number;
  title: string;
  instructions?: string;
  subject: string;
  grade_level: string;
  section: string;
  section_id?: string;
  type: 'Quiz' | 'Exam' | 'Performance Task' | 'Written Work';
  totalScore: number;
  passingScore: number;
  date: string;
  attachmentName?: string;
  attachmentSize?: string;
  attachmentDataUrl?: string;
}

export interface StudentSubmissionRecord {
  score: number | null;
  submitted: boolean;
  submittedAt?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  fileDataUrl?: string;
  returned?: boolean;
}

export const CLASSROOM_ASSESSMENTS_STORAGE_KEY = 'plshs_classroom_assessments_v1';
export const CLASSROOM_SUBMISSIONS_STORAGE_KEY = 'plshs_classroom_submissions_v1';

export const DEFAULT_CLASSROOM_ASSESSMENTS: ClassroomAssessmentItem[] = [
  {
    id: 101,
    title: '2nd Quarter Periodical Examination',
    instructions:
      'Download the attached examination questionnaire, solve all items showing complete solutions, and upload your scanned answer sheet (PDF or Image) before the due date.',
    subject: 'General Mathematics',
    grade_level: 'Grade 10',
    section: 'Generosity',
    type: 'Exam',
    totalScore: 100,
    passingScore: 75,
    date: '2026-10-30',
    attachmentName: 'GenMath_Q2_Periodical_Exam_Questionnaire.pdf',
    attachmentSize: '412 KB',
  },
  {
    id: 102,
    title: 'Problem Set #4: Polynomial & Rational Functions',
    instructions:
      'Complete Problem Set #4 (Items 1–15) and turn in your work via file upload (PDF, DOCX, or clear photo of your solution).',
    subject: 'Pre-Calculus (Specialized)',
    grade_level: 'Grade 10',
    section: 'Wisdom',
    type: 'Written Work',
    totalScore: 50,
    passingScore: 38,
    date: '2026-10-28',
    attachmentName: 'PreCalculus_ProblemSet4_Worksheet.pdf',
    attachmentSize: '285 KB',
  },
  {
    id: 103,
    title: 'Performance Task #2: Real-Life Mathematical Modeling',
    instructions:
      'Submit your group/individual mathematical modeling report in PDF or Word format through the file upload box.',
    subject: 'Mathematics 10',
    grade_level: 'Grade 10',
    section: 'Perseverance',
    type: 'Performance Task',
    totalScore: 50,
    passingScore: 38,
    date: '2026-10-25',
    attachmentName: 'Math10_PerformanceTask2_Rubric.pdf',
    attachmentSize: '198 KB',
  },
  {
    id: 104,
    title: 'Chapter 3 Quiz: Probability Distributions',
    instructions:
      'Answer the worksheet and upload your completed solution file here for grading.',
    subject: 'Statistics & Probability',
    grade_level: 'Grade 9',
    section: 'Batangas',
    type: 'Quiz',
    totalScore: 30,
    passingScore: 23,
    date: '2026-10-22',
    attachmentName: 'Stats_Chapter3_Quiz_Sheet.pdf',
    attachmentSize: '220 KB',
  },
];

export const TeacherAssessmentsPage: React.FC = () => {
  const [assessments, setAssessments] = useState<ClassroomAssessmentItem[]>(() => {
    try {
      const saved = localStorage.getItem(CLASSROOM_ASSESSMENTS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_CLASSROOM_ASSESSMENTS;
  });

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number>(
    () => assessments[0]?.id || DEFAULT_CLASSROOM_ASSESSMENTS[0].id
  );

  // Sections & Students from DB
  const [sections, setSections] = useState<{ id: string; name: string; grade_level: string }[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Map of assessmentId -> studentId -> StudentSubmissionRecord
  const [submissionsByAssessment, setSubmissionsByAssessment] = useState<
    Record<number, Record<string | number, StudentSubmissionRecord>>
  >({});

  // Filters for student submission & passing tracker
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'submitted' | 'not_submitted' | 'passed_score' | 'failed_score'
  >('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('All');
  const [sectionFilter, setSectionFilter] = useState<string>('All');

  // Create Assessment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingScores, setSavingScores] = useState(false);
  const [notice, setNotice] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // File Preview Modal for viewing a student's uploaded submission
  const [previewSubmission, setPreviewSubmission] = useState<{
    studentName: string;
    lrn: string;
    gradeSection: string;
    assessmentTitle: string;
    record: StudentSubmissionRecord;
  } | null>(null);

  // Teacher attachment upload inside Create Modal
  const teacherFileInputRef = useRef<HTMLInputElement | null>(null);
  // Upload on behalf of a student input ref
  const studentUploadInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingForStudentId, setUploadingForStudentId] = useState<string | number | null>(null);

  const [form, setForm] = useState({
    title: '',
    instructions: '',
    subject: 'General Mathematics',
    grade_level: 'Grade 10',
    section: 'Generosity',
    type: 'Quiz' as ClassroomAssessmentItem['type'],
    totalScore: 50,
    passingScore: 38,
    date: new Date().toISOString().split('T')[0],
    attachmentName: '',
    attachmentSize: '',
    attachmentDataUrl: '',
  });

  // Persist assessments list to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CLASSROOM_ASSESSMENTS_STORAGE_KEY, JSON.stringify(assessments));
    } catch {
      // ignore storage quota errors
    }
  }, [assessments]);

  // Load real sections and students from Supabase
  useEffect(() => {
    async function fetchSectionsAndStudents() {
      setLoadingStudents(true);
      try {
        const [secRes, stuRes] = await Promise.all([
          supabase.from('sections').select('id, name, grade_level').order('grade_level'),
          supabase.from('students').select('*').order('last_name', { ascending: true }).limit(500),
        ]);

        const secList = (secRes.data || []).sort((a, b) => {
          const gA = parseInt(String(a.grade_level || '').replace(/\D/g, ''), 10) || 99;
          const gB = parseInt(String(b.grade_level || '').replace(/\D/g, ''), 10) || 99;
          if (gA !== gB) return gA - gB;
          return (a.name || '').localeCompare(b.name || '');
        });
        setSections(secList);

        const secById: Record<string, { name: string; grade_level: string }> = {};
        secList.forEach((s) => {
          secById[s.id] = { name: s.name, grade_level: s.grade_level };
        });

        const rawStudents: Student[] = stuRes.data || [];
        const enriched = rawStudents.map((stu) => {
          const secId = (stu as any).section_id;
          const matched = secId ? secById[secId] : undefined;
          return {
            ...stu,
            grade_level: matched?.grade_level || stu.grade_level || 'Grade 10',
            section: matched?.name || stu.section || 'Generosity',
          };
        });

        setAllStudents(enriched);

        // Load saved student submissions or generate realistic Google Classroom file submissions
        let savedSubmissions: Record<number, Record<string | number, StudentSubmissionRecord>> = {};
        try {
          const rawSaved = localStorage.getItem(CLASSROOM_SUBMISSIONS_STORAGE_KEY);
          if (rawSaved) {
            savedSubmissions = JSON.parse(rawSaved);
          }
        } catch {
          // ignore
        }

        const initialMap: Record<number, Record<string | number, StudentSubmissionRecord>> = {
          ...savedSubmissions,
        };

        const currentAssessments =
          assessments.length > 0 ? assessments : DEFAULT_CLASSROOM_ASSESSMENTS;

        currentAssessments.forEach((ass, aIdx) => {
          if (!initialMap[ass.id]) {
            initialMap[ass.id] = {};
          }
          const sectionStudents = enriched.filter(
            (s) => s.section?.toLowerCase() === ass.section.toLowerCase()
          );
          const targetRoster = sectionStudents.length > 0 ? sectionStudents : enriched.slice(0, 30);

          targetRoster.forEach((stu, sIdx) => {
            if (initialMap[ass.id][stu.id]) return;

            const cleanLast = (stu.last_name || 'Student').replace(/\s+/g, '');
            const cleanFirst = (stu.first_name || 'Learner').split(' ')[0].replace(/\s+/g, '');
            const ext = sIdx % 3 === 0 ? 'pdf' : sIdx % 3 === 1 ? 'docx' : 'pdf';
            const sizeKb = 180 + ((sIdx * 37) % 450);

            const mod = (sIdx + aIdx * 3) % 10;
            if (mod === 8 || mod === 9) {
              // Has NOT submitted / turned in file yet
              initialMap[ass.id][stu.id] = {
                score: null,
                submitted: false,
              };
            } else if (mod === 4) {
              // Turned in file, scored below passing
              const failedScore = Math.max(
                Math.round(ass.passingScore * 0.65),
                ass.passingScore - 4
              );
              initialMap[ass.id][stu.id] = {
                score: Math.max(0, failedScore),
                submitted: true,
                submittedAt: `Oct ${20 + (sIdx % 8)}, 2026 • 0${8 + (sIdx % 2)}:${15 + (sIdx % 40)} AM`,
                fileName: `${cleanLast}_${cleanFirst}_${ass.type.replace(/\s+/g, '')}.${ext}`,
                fileSize: `${sizeKb} KB`,
                fileType: ext.toUpperCase(),
                returned: true,
              };
            } else {
              // Turned in file and passed
              const bonus =
                (sIdx * 3 + aIdx * 2) % Math.max(1, ass.totalScore - ass.passingScore + 1);
              const passedScore = Math.min(ass.totalScore, ass.passingScore + bonus);
              initialMap[ass.id][stu.id] = {
                score: passedScore,
                submitted: true,
                submittedAt: `Oct ${19 + (sIdx % 8)}, 2026 • 0${7 + (sIdx % 3)}:${10 + (sIdx % 45)} PM`,
                fileName: `${cleanLast}_${cleanFirst}_${ass.type.replace(/\s+/g, '')}.${ext}`,
                fileSize: `${sizeKb} KB`,
                fileType: ext.toUpperCase(),
                returned: true,
              };
            }
          });
        });

        setSubmissionsByAssessment(initialMap);
        try {
          localStorage.setItem(CLASSROOM_SUBMISSIONS_STORAGE_KEY, JSON.stringify(initialMap));
        } catch {
          // ignore
        }
      } catch (err) {
        console.warn('Error loading assessment rosters:', err);
      } finally {
        setLoadingStudents(false);
      }
    }

    fetchSectionsAndStudents();
  }, []);

  const persistSubmissions = (
    next: Record<number, Record<string | number, StudentSubmissionRecord>>
  ) => {
    setSubmissionsByAssessment(next);
    try {
      localStorage.setItem(CLASSROOM_SUBMISSIONS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Available sections filtered by Year Level
  const availableSections = useMemo(() => {
    if (gradeFilter === 'All') return sections;
    return sections.filter((s) => s.grade_level === gradeFilter);
  }, [sections, gradeFilter]);

  // Filter assessments by Year Level and Section
  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      if (gradeFilter !== 'All' && a.grade_level !== gradeFilter) return false;
      if (
        sectionFilter !== 'All' &&
        a.section.toLowerCase() !== sectionFilter.toLowerCase()
      )
        return false;
      return true;
    });
  }, [assessments, gradeFilter, sectionFilter]);

  const selectedAssessment = useMemo(
    () =>
      filteredAssessments.find((a) => a.id === selectedAssessmentId) ||
      filteredAssessments[0] ||
      assessments[0],
    [filteredAssessments, assessments, selectedAssessmentId]
  );

  // Get students belonging to the selected assessment's exact section
  const activeSectionStudents = useMemo(() => {
    if (!selectedAssessment) return [];
    const matched = allStudents.filter(
      (s) => s.section?.toLowerCase() === selectedAssessment.section.toLowerCase()
    );
    return matched.length > 0 ? matched : allStudents.slice(0, 30);
  }, [allStudents, selectedAssessment]);

  // Helper to evaluate a student's submission & passing outcome for an assessment
  const getStudentOutcome = (
    assessment: ClassroomAssessmentItem,
    studentId: string | number
  ): {
    record: StudentSubmissionRecord;
    percentage: number | null;
    submitted: boolean;
    scoreStatus: 'Passed' | 'Failed' | 'Ungraded';
  } => {
    const rec = submissionsByAssessment[assessment.id]?.[studentId] || {
      score: null,
      submitted: false,
    };

    if (!rec.submitted) {
      return {
        record: rec,
        percentage: null,
        submitted: false,
        scoreStatus: 'Ungraded',
      };
    }

    if (rec.score === null || rec.score === undefined) {
      return {
        record: rec,
        percentage: null,
        submitted: true,
        scoreStatus: 'Ungraded',
      };
    }

    const pct =
      assessment.totalScore > 0 ? Math.round((rec.score / assessment.totalScore) * 100) : 0;
    const isPassed = rec.score >= assessment.passingScore;
    return {
      record: rec,
      percentage: pct,
      submitted: true,
      scoreStatus: isPassed ? 'Passed' : 'Failed',
    };
  };

  // Summary counts for any assessment row
  const getAssessmentSummaryCounts = (assessment: ClassroomAssessmentItem) => {
    const secStudents = allStudents.filter(
      (s) => s.section?.toLowerCase() === assessment.section.toLowerCase()
    );
    const roster = secStudents.length > 0 ? secStudents : allStudents.slice(0, 30);
    let submittedCount = 0;
    let notSubmittedCount = 0;
    let passedScoreCount = 0;
    let failedScoreCount = 0;

    roster.forEach((stu) => {
      const outcome = getStudentOutcome(assessment, stu.id);
      if (outcome.submitted) {
        submittedCount++;
        if (outcome.scoreStatus === 'Passed') passedScoreCount++;
        else if (outcome.scoreStatus === 'Failed') failedScoreCount++;
      } else {
        notSubmittedCount++;
      }
    });

    return {
      total: roster.length,
      submittedCount,
      notSubmittedCount,
      passedScoreCount,
      failedScoreCount,
    };
  };

  const activeSummary = useMemo(
    () =>
      selectedAssessment
        ? getAssessmentSummaryCounts(selectedAssessment)
        : {
            total: 0,
            submittedCount: 0,
            notSubmittedCount: 0,
            passedScoreCount: 0,
            failedScoreCount: 0,
          },
    [selectedAssessment, allStudents, submissionsByAssessment]
  );

  // Filter students in the active section roster
  const filteredRoster = useMemo(() => {
    if (!selectedAssessment) return [];
    return activeSectionStudents.filter((stu) => {
      const outcome = getStudentOutcome(selectedAssessment, stu.id);
      if (statusFilter === 'submitted' && !outcome.submitted) return false;
      if (statusFilter === 'not_submitted' && outcome.submitted) return false;
      if (statusFilter === 'passed_score' && outcome.scoreStatus !== 'Passed') return false;
      if (
        statusFilter === 'failed_score' &&
        (outcome.scoreStatus === 'Passed' && outcome.submitted)
      )
        return false;

      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const fullName = `${stu.last_name} ${stu.first_name} ${stu.middle_name || ''}`.toLowerCase();
        if (!fullName.includes(q) && !stu.lrn?.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [
    activeSectionStudents,
    selectedAssessment,
    statusFilter,
    studentSearch,
    submissionsByAssessment,
  ]);

  // Handle score edits for a student
  const handleScoreChange = (studentId: string | number, rawVal: string, student: Student) => {
    if (!selectedAssessment) return;
    const prevRec = submissionsByAssessment[selectedAssessment.id]?.[studentId];

    if (rawVal.trim() === '') {
      const next = {
        ...submissionsByAssessment,
        [selectedAssessment.id]: {
          ...(submissionsByAssessment[selectedAssessment.id] || {}),
          [studentId]: {
            ...(prevRec || { submitted: false }),
            score: null,
          },
        },
      };
      persistSubmissions(next);
      return;
    }

    const num = Number(rawVal);
    if (isNaN(num)) return;
    const clamped = Math.max(0, Math.min(selectedAssessment.totalScore, num));
    const cleanLast = (student.last_name || 'Student').replace(/\s+/g, '');
    const cleanFirst = (student.first_name || 'Learner').split(' ')[0].replace(/\s+/g, '');

    const next = {
      ...submissionsByAssessment,
      [selectedAssessment.id]: {
        ...(submissionsByAssessment[selectedAssessment.id] || {}),
        [studentId]: {
          submitted: true,
          submittedAt: prevRec?.submittedAt || 'Turned in • Verified by Teacher',
          fileName:
            prevRec?.fileName ||
            `${cleanLast}_${cleanFirst}_${selectedAssessment.type.replace(/\s+/g, '')}.pdf`,
          fileSize: prevRec?.fileSize || '245 KB',
          fileType: prevRec?.fileType || 'PDF',
          fileDataUrl: prevRec?.fileDataUrl,
          score: clamped,
          returned: true,
        },
      },
    };
    persistSubmissions(next);
  };

  // Toggle whether a student has turned in / passed the assessment file
  const handleToggleSubmissionStatus = (
    student: Student,
    target: 'TurnedIn' | 'Missing'
  ) => {
    if (!selectedAssessment) return;
    const prevRec = submissionsByAssessment[selectedAssessment.id]?.[student.id];
    const cleanLast = (student.last_name || 'Student').replace(/\s+/g, '');
    const cleanFirst = (student.first_name || 'Learner').split(' ')[0].replace(/\s+/g, '');

    if (target === 'Missing') {
      const next = {
        ...submissionsByAssessment,
        [selectedAssessment.id]: {
          ...(submissionsByAssessment[selectedAssessment.id] || {}),
          [student.id]: {
            score: null,
            submitted: false,
          },
        },
      };
      persistSubmissions(next);
    } else {
      const defaultScore =
        prevRec?.score !== null && prevRec?.score !== undefined
          ? prevRec.score
          : Math.min(
              selectedAssessment.totalScore,
              Math.round(selectedAssessment.totalScore * 0.86)
            );
      const next = {
        ...submissionsByAssessment,
        [selectedAssessment.id]: {
          ...(submissionsByAssessment[selectedAssessment.id] || {}),
          [student.id]: {
            score: defaultScore,
            submitted: true,
            submittedAt:
              prevRec?.submittedAt ||
              new Date().toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
            fileName:
              prevRec?.fileName ||
              `${cleanLast}_${cleanFirst}_${selectedAssessment.type.replace(/\s+/g, '')}.pdf`,
            fileSize: prevRec?.fileSize || '310 KB',
            fileType: prevRec?.fileType || 'PDF',
            returned: true,
          },
        },
      };
      persistSubmissions(next);
    }
  };

  // Upload a submission file for a specific student
  const handleStudentFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAssessment || uploadingForStudentId === null) return;

    const reader = new FileReader();
    reader.onload = () => {
      const sizeKb = Math.max(1, Math.round(file.size / 1024));
      const prevRec = submissionsByAssessment[selectedAssessment.id]?.[uploadingForStudentId];
      const next = {
        ...submissionsByAssessment,
        [selectedAssessment.id]: {
          ...(submissionsByAssessment[selectedAssessment.id] || {}),
          [uploadingForStudentId]: {
            score:
              prevRec?.score !== null && prevRec?.score !== undefined
                ? prevRec.score
                : Math.min(
                    selectedAssessment.totalScore,
                    Math.round(selectedAssessment.totalScore * 0.88)
                  ),
            submitted: true,
            submittedAt: new Date().toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            fileName: file.name,
            fileSize: `${sizeKb} KB`,
            fileType: file.name.split('.').pop()?.toUpperCase() || 'FILE',
            fileDataUrl: typeof reader.result === 'string' ? reader.result : undefined,
            returned: true,
          },
        },
      };
      persistSubmissions(next);
      setUploadingForStudentId(null);
      setNotice({
        type: 'success',
        message: `Uploaded submission file "${file.name}" and marked learner as Turned In.`,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Teacher worksheet attachment inside Create Modal
  const handleTeacherAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        attachmentName: file.name,
        attachmentSize: `${sizeKb} KB`,
        attachmentDataUrl: typeof reader.result === 'string' ? reader.result : '',
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveScores = () => {
    if (!selectedAssessment) return;
    setSavingScores(true);
    setTimeout(() => {
      setSavingScores(false);
      setNotice({
        type: 'success',
        message: `Saved classwork submissions & grades for "${selectedAssessment.title}" (${selectedAssessment.grade_level} • Section ${selectedAssessment.section}).`,
      });
    }, 300);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const total = Math.max(1, Number(form.totalScore));
    const passing = Math.max(
      1,
      Math.min(total, Number(form.passingScore) || Math.round(total * 0.75))
    );
    const newId = Date.now();
    const newAss: ClassroomAssessmentItem = {
      id: newId,
      title: form.title,
      instructions:
        form.instructions.trim() ||
        'Complete the assessment and turn in your work via file upload (PDF, DOCX, or Image) before the due date.',
      subject: form.subject,
      grade_level: form.grade_level,
      section: form.section,
      type: form.type,
      totalScore: total,
      passingScore: passing,
      date: form.date,
      attachmentName: form.attachmentName || undefined,
      attachmentSize: form.attachmentSize || undefined,
      attachmentDataUrl: form.attachmentDataUrl || undefined,
    };

    // Initialize section roster submissions for the new assessment
    const secStudents = allStudents.filter(
      (s) => s.section?.toLowerCase() === form.section.toLowerCase()
    );
    const targetRoster = secStudents.length > 0 ? secStudents : allStudents.slice(0, 30);
    const newMap: Record<string | number, StudentSubmissionRecord> = {};
    targetRoster.forEach((stu) => {
      newMap[stu.id] = { score: null, submitted: false };
    });

    const nextSubmissions = { ...submissionsByAssessment, [newId]: newMap };
    persistSubmissions(nextSubmissions);

    const nextAssessments = [newAss, ...assessments];
    setAssessments(nextAssessments);
    setSelectedAssessmentId(newId);
    setGradeFilter(form.grade_level);
    setSectionFilter(form.section);

    setNotice({
      type: 'success',
      message: `Assessment "${form.title}" published to ${form.grade_level} • Section ${form.section}. Students in Section ${form.section} can now upload their files!`,
    });
    setIsModalOpen(false);
    setForm({
      title: '',
      instructions: '',
      subject: 'General Mathematics',
      grade_level: form.grade_level,
      section: form.section,
      type: 'Quiz',
      totalScore: 50,
      passingScore: 38,
      date: new Date().toISOString().split('T')[0],
      attachmentName: '',
      attachmentSize: '',
      attachmentDataUrl: '',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Hidden file input for uploading on behalf of a student */}
      <input
        ref={studentUploadInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
        onChange={handleStudentFileSelected}
        className="hidden"
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 sm:pr-12">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            Assessments &amp; Classwork Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Post assessments by Year Level &amp; Section and review student file uploads, turn-in status, and passing scores like Google Classroom.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" /> Create Assessment
        </button>
      </div>

      {notice && (
        <Alert
          type={notice.type}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}

      {/* Year Level & Section Filter Bar + Published Assessments Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-emerald-700" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Classwork by Year Level &amp; Section
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-emerald-700" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Year Level:
              </span>
              <select
                value={gradeFilter}
                onChange={(e) => {
                  setGradeFilter(e.target.value);
                  setSectionFilter('All');
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-emerald-600 focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Year Levels</option>
                <option value="Grade 7">Grade 7 (JHS)</option>
                <option value="Grade 8">Grade 8 (JHS)</option>
                <option value="Grade 9">Grade 9 (JHS)</option>
                <option value="Grade 10">Grade 10 (JHS)</option>
                <option value="Grade 11">Grade 11 (SHS)</option>
                <option value="Grade 12">Grade 12 (SHS)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-700" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Section:
              </span>
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-emerald-600 focus:outline-hidden cursor-pointer"
              >
                <option value="All">All Sections</option>
                {availableSections.map((sec) => (
                  <option key={sec.id} value={sec.name}>
                    Section {sec.name} ({sec.grade_level})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Assessment Title &amp; Material</th>
                <th className="px-4 py-3.5">Year Level &amp; Section</th>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5 text-center">Max / Passing</th>
                <th className="px-4 py-3.5">Turned In (Submitted) vs. Missing</th>
                <th className="px-4 py-3.5">Due Date</th>
                <th className="px-4 py-3.5 text-right">Classwork Submissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssessments.map((a) => {
                const counts = getAssessmentSummaryCounts(a);
                const isSelected = a.id === selectedAssessment?.id;

                return (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedAssessmentId(a.id)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/70 hover:bg-emerald-50'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                            isSelected ? 'bg-emerald-600' : 'bg-slate-300'
                          }`}
                        />
                        <div>
                          <p className="font-bold text-slate-900">{a.title}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-500 font-medium">
                              {a.subject}
                            </span>
                            {a.attachmentName && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                <Paperclip className="h-2.5 w-2.5 text-emerald-700" />
                                {a.attachmentName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#0f172a] px-2 py-0.5 text-[10px] font-bold text-white">
                          <GraduationCap className="h-3 w-3 text-amber-400" />
                          {a.grade_level}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                          <Layers className="h-3 w-3 text-emerald-600" />
                          Section {a.section}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Badge
                        variant={
                          a.type === 'Exam'
                            ? 'danger'
                            : a.type === 'Performance Task'
                            ? 'emerald'
                            : 'info'
                        }
                        size="sm"
                      >
                        {a.type}
                      </Badge>
                    </td>

                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-900">{a.totalScore} pts</span>
                      <span className="block text-[10px] font-semibold text-emerald-700">
                        Pass: ≥{a.passingScore} pts
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          {counts.submittedCount} Turned In
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-800">
                          <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          {counts.notSubmittedCount} Not Submitted
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-slate-500 font-medium whitespace-nowrap">
                      {a.date}
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAssessmentId(a.id);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0f172a] text-white shadow-2xs'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {isSelected ? 'Viewing Section Work' : 'Open Submissions'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Section Assessment — Google Classroom Style Student Submissions & Passing Tracker */}
      {selectedAssessment && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {/* Active Assessment Classroom Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-lg bg-[#0f172a] px-2.5 py-1 text-[11px] font-bold text-white">
                  <GraduationCap className="h-3.5 w-3.5 text-amber-400" />
                  {selectedAssessment.grade_level}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                  <Layers className="h-3.5 w-3.5 text-emerald-600" />
                  Section {selectedAssessment.section}
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700">
                  <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                  {selectedAssessment.subject}
                </span>
                <span className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                  Passing Score: {selectedAssessment.passingScore} / {selectedAssessment.totalScore} pts
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 font-display">
                {selectedAssessment.title} — Section {selectedAssessment.section} Student Work &amp; File Submissions
              </h3>
              {selectedAssessment.instructions && (
                <p className="text-xs text-slate-600 max-w-3xl">
                  <span className="font-bold text-slate-700">Instructions:</span>{' '}
                  {selectedAssessment.instructions}
                </p>
              )}
            </div>

            {/* Google Classroom Style Turned-In / Assigned Counters */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-2xs">
                <div className="text-center pr-3 border-r border-slate-200">
                  <p className="text-lg font-black font-display text-emerald-700 leading-none">
                    {activeSummary.submittedCount}
                  </p>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Turned In
                  </span>
                </div>
                <div className="text-center pr-3 border-r border-slate-200">
                  <p className="text-lg font-black font-display text-rose-600 leading-none">
                    {activeSummary.notSubmittedCount}
                  </p>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Not Submitted
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black font-display text-blue-700 leading-none">
                    {activeSummary.passedScoreCount}
                  </p>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Passed Score
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveScores}
                disabled={savingScores}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800 disabled:opacity-60 transition-all cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                {savingScores ? 'Saving...' : 'Save & Return Grades'}
              </button>
            </div>
          </div>

          {/* Filter Tabs & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-[#0f172a] text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                All in Section {selectedAssessment.section} ({activeSummary.total})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('submitted')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'submitted'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Submitted / Turned In ({activeSummary.submittedCount})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('not_submitted')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'not_submitted'
                    ? 'bg-rose-700 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                <XCircle className="h-3.5 w-3.5" />
                Not Yet Submitted / Missing ({activeSummary.notSubmittedCount})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('passed_score')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'passed_score'
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                Passed Score ({activeSummary.passedScoreCount})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search student or LRN..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* Student File Submissions & Passing Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-3.5 w-10 text-center text-slate-400">#</th>
                  <th className="px-4 py-3.5 min-w-[185px]">Learner Name</th>
                  <th className="px-3 py-3.5">Year Level &amp; Section</th>
                  <th className="px-3 py-3.5 min-w-[230px]">
                    Submitted File (Google Classroom Upload)
                  </th>
                  <th className="px-3 py-3.5 text-center">Submission Status</th>
                  <th className="px-3 py-3.5 text-center">
                    Score ({selectedAssessment.totalScore} pts)
                  </th>
                  <th className="px-3 py-3.5 text-center">Passing Result</th>
                  <th className="px-3 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Year Level & Section Group Banner Row */}
                <tr className="bg-slate-50/90 border-b border-slate-200/80">
                  <td colSpan={8} className="px-4 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f172a] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs">
                          <GraduationCap className="h-3.5 w-3.5 text-amber-400" />
                          {selectedAssessment.grade_level}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                          <Layers className="h-3.5 w-3.5 text-emerald-600" />
                          Section {selectedAssessment.section}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500">
                          File Upload Submissions • {filteredRoster.length} Learners Shown
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-bold">
                        <span className="text-emerald-700">
                          ✓ {activeSummary.submittedCount} Submitted File
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-rose-600">
                          ✕ {activeSummary.notSubmittedCount} Not Submitted
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>

                {loadingStudents ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Loading section student submissions...
                    </td>
                  </tr>
                ) : filteredRoster.length > 0 ? (
                  filteredRoster.map((student, idx) => {
                    const outcome = getStudentOutcome(selectedAssessment, student.id);
                    const rec = outcome.record;

                    return (
                      <tr
                        key={student.id}
                        className={`transition-colors ${
                          !outcome.submitted
                            ? 'bg-rose-50/20 hover:bg-rose-50/40'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="px-3 py-3 text-center font-mono text-[11px] text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Learner Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                                outcome.submitted
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {student.first_name?.[0]}
                              {student.last_name?.[0]}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">
                                {student.last_name}, {student.first_name}{' '}
                                {student.middle_name ? `${student.middle_name[0]}.` : ''}
                              </p>
                              <span className="text-[10px] text-slate-400 font-mono">
                                LRN: {student.lrn || '—'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Year Level & Section */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex w-fit items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              <GraduationCap className="h-2.5 w-2.5 text-slate-500" />
                              {selectedAssessment.grade_level}
                            </span>
                            <span className="inline-flex w-fit items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <Layers className="h-3 w-3 text-emerald-600" />
                              Section {selectedAssessment.section}
                            </span>
                          </div>
                        </td>

                        {/* Submitted File Attachment (Google Classroom Style) */}
                        <td className="px-3 py-3">
                          {outcome.submitted && rec.fileName ? (
                            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p
                                    className="truncate text-xs font-bold text-slate-800 max-w-[170px]"
                                    title={rec.fileName}
                                  >
                                    {rec.fileName}
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    {rec.fileSize || '240 KB'} • {rec.submittedAt || 'Turned in'}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewSubmission({
                                    studentName: `${student.last_name}, ${student.first_name}`,
                                    lrn: student.lrn || '—',
                                    gradeSection: `${selectedAssessment.grade_level} • Section ${selectedAssessment.section}`,
                                    assessmentTitle: selectedAssessment.title,
                                    record: rec,
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 shrink-0 cursor-pointer"
                                title="View Student Uploaded Work"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View File
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-rose-200 bg-rose-50/40 px-3 py-2">
                              <span className="text-[11px] font-semibold text-rose-700">
                                No file uploaded yet
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadingForStudentId(student.id);
                                  studentUploadInputRef.current?.click();
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
                              >
                                <Upload className="h-3 w-3 text-emerald-700" />
                                Attach File
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Submission Status (Submitted / Not Submitted) */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {outcome.submitted ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-800 shadow-2xs">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Turned In
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-extrabold text-rose-800 shadow-2xs">
                              <XCircle className="h-3.5 w-3.5 text-rose-600" />
                              Not Submitted
                            </span>
                          )}
                        </td>

                        {/* Score Input */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              max={selectedAssessment.totalScore}
                              placeholder="—"
                              value={rec.score !== null && rec.score !== undefined ? rec.score : ''}
                              onChange={(e) =>
                                handleScoreChange(student.id, e.target.value, student)
                              }
                              className={`w-15 rounded-lg border px-1.5 py-1 text-center font-mono text-xs font-bold focus:outline-hidden ${
                                outcome.scoreStatus === 'Passed'
                                  ? 'border-emerald-300 bg-emerald-50/50 text-emerald-900 focus:border-emerald-600 focus:bg-white'
                                  : outcome.scoreStatus === 'Failed'
                                  ? 'border-rose-300 bg-rose-50 text-rose-800 focus:border-rose-600 focus:bg-white'
                                  : 'border-slate-300 bg-slate-50 text-slate-600 focus:border-emerald-600 focus:bg-white'
                              }`}
                            />
                            <span className="font-mono text-[11px] text-slate-400">
                              / {selectedAssessment.totalScore}
                            </span>
                          </div>
                        </td>

                        {/* Passing Result */}
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          {!outcome.submitted ? (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700">
                              <Clock className="h-3 w-3" /> Did Not Pass (Missing)
                            </span>
                          ) : outcome.scoreStatus === 'Passed' ? (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Passed (
                              {outcome.percentage}%)
                            </span>
                          ) : outcome.scoreStatus === 'Failed' ? (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-800">
                              <XCircle className="h-3.5 w-3.5 text-rose-600" /> Failed (
                              {outcome.percentage}%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                              Needs Grading
                            </span>
                          )}
                        </td>

                        {/* Quick Actions */}
                        <td className="px-3 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleSubmissionStatus(student, 'TurnedIn')}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                                outcome.submitted
                                  ? 'bg-emerald-700 text-white shadow-2xs'
                                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                              }`}
                            >
                              Submitted
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleSubmissionStatus(student, 'Missing')}
                              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                                !outcome.submitted
                                  ? 'bg-rose-600 text-white shadow-2xs'
                                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                              }`}
                            >
                              Not Submitted
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No learners in Section {selectedAssessment.section} match the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create New Assessment Modal (Google Classroom Style with Section Targeting & File Attachment) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Assessment"
        subtitle="Publish a quiz, exam, or performance task by Year Level and Section (Google Classroom file submission enabled)"
        maxWidth="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Assessment Title
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Chapter 3 Quiz: Conic Sections"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Year Level
              </label>
              <select
                value={form.grade_level}
                onChange={(e) => {
                  const nextGrade = e.target.value;
                  const matchingSec = sections.find((s) => s.grade_level === nextGrade);
                  setForm({
                    ...form,
                    grade_level: nextGrade,
                    section: matchingSec ? matchingSec.name : form.section,
                  });
                }}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              >
                <option value="Grade 7">Grade 7 (JHS)</option>
                <option value="Grade 8">Grade 8 (JHS)</option>
                <option value="Grade 9">Grade 9 (JHS)</option>
                <option value="Grade 10">Grade 10 (JHS)</option>
                <option value="Grade 11">Grade 11 (SHS)</option>
                <option value="Grade 12">Grade 12 (SHS)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Section (Students in this section will submit files)
              </label>
              <select
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              >
                {sections
                  .filter((s) => !form.grade_level || s.grade_level === form.grade_level)
                  .map((s) => (
                    <option key={s.id} value={s.name}>
                      Section {s.name} ({s.grade_level})
                    </option>
                  ))}
                {sections.filter((s) => s.grade_level === form.grade_level).length === 0 && (
                  <>
                    <option value="Generosity">Section Generosity ({form.grade_level})</option>
                    <option value="Wisdom">Section Wisdom ({form.grade_level})</option>
                    <option value="Perseverance">Section Perseverance ({form.grade_level})</option>
                    <option value="Batangas">Section Batangas ({form.grade_level})</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Subject
              </label>
              <input
                type="text"
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. General Mathematics"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Assessment Type
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({
                    ...form,
                    type: e.target.value as ClassroomAssessmentItem['type'],
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              >
                <option value="Quiz">Quiz</option>
                <option value="Exam">Exam</option>
                <option value="Performance Task">Performance Task</option>
                <option value="Written Work">Written Work</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Instructions for Section {form.section} Learners
            </label>
            <textarea
              rows={2}
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="Write instructions for your students (e.g., Download the worksheet and upload your completed answer file in PDF, Word, or Image format)..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Google Classroom Style Attachment & Student File Upload Configuration */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5 text-emerald-700" />
                  Attach Assessment Material &amp; Enable Student File Turn-In
                </p>
                <p className="text-[11px] text-slate-500">
                  Students in <span className="font-bold text-slate-700">{form.grade_level} • Section {form.section}</span> will be able to download this file and submit their work via file upload.
                </p>
              </div>
              <input
                ref={teacherFileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                onChange={handleTeacherAttachmentChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => teacherFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-50 cursor-pointer shrink-0"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {form.attachmentName ? 'Change File' : 'Attach File'}
              </button>
            </div>

            {form.attachmentName && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-700" />
                  <span className="font-bold text-slate-800">{form.attachmentName}</span>
                  <span className="text-[10px] text-slate-400">({form.attachmentSize})</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      attachmentName: '',
                      attachmentSize: '',
                      attachmentDataUrl: '',
                    }))
                  }
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Max Score
              </label>
              <input
                type="number"
                required
                min={1}
                value={form.totalScore}
                onChange={(e) => {
                  const total = Number(e.target.value);
                  setForm({
                    ...form,
                    totalScore: total,
                    passingScore: Math.round(total * 0.75),
                  });
                }}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Passing Score
              </label>
              <input
                type="number"
                required
                min={1}
                max={form.totalScore}
                value={form.passingScore}
                onChange={(e) =>
                  setForm({ ...form, passingScore: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Due Date
              </label>
              <input
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 cursor-pointer"
            >
              Publish Assessment to Section {form.section}
            </button>
          </div>
        </form>
      </Modal>

      {/* Student Uploaded File Preview Modal */}
      <Modal
        isOpen={Boolean(previewSubmission)}
        onClose={() => setPreviewSubmission(null)}
        title={
          previewSubmission
            ? `Student Submission: ${previewSubmission.studentName}`
            : 'Student Submission'
        }
        subtitle={
          previewSubmission
            ? `${previewSubmission.gradeSection} • ${previewSubmission.assessmentTitle}`
            : ''
        }
      >
        {previewSubmission && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-900">
                    {previewSubmission.record.fileName || 'Submitted_Work.pdf'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {previewSubmission.record.fileSize || '250 KB'} • Turned in:{' '}
                    {previewSubmission.record.submittedAt || 'Verified'}
                  </p>
                </div>
              </div>

              {previewSubmission.record.fileDataUrl && (
                <a
                  href={previewSubmission.record.fileDataUrl}
                  download={previewSubmission.record.fileName || 'Student_Submission'}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 space-y-2">
              <p className="font-bold text-slate-800">
                Google Classroom Turn-In Verification
              </p>
              <p>
                Learner <span className="font-bold text-slate-900">{previewSubmission.studentName}</span> (LRN:{' '}
                <span className="font-mono">{previewSubmission.lrn}</span>) from{' '}
                <span className="font-bold text-emerald-800">{previewSubmission.gradeSection}</span> has uploaded and turned in this file for{' '}
                <span className="font-bold text-slate-900">{previewSubmission.assessmentTitle}</span>.
              </p>
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <span className="font-bold text-slate-700">Recorded Score:</span>
                <span className="font-mono text-sm font-black text-emerald-700">
                  {previewSubmission.record.score !== null &&
                  previewSubmission.record.score !== undefined
                    ? `${previewSubmission.record.score} / ${selectedAssessment?.totalScore} pts`
                    : 'Not Yet Graded'}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewSubmission(null)}
                className="rounded-xl bg-[#0f172a] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
