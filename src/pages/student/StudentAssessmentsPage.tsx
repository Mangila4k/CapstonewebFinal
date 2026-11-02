import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  BookOpen,
  Upload,
  FileText,
  Paperclip,
  GraduationCap,
  Layers,
  Trash2,
  Send,
  RotateCcw,
  Eye,
  Download,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { Modal } from '../../components/common/Modal';
import {
  CLASSROOM_ASSESSMENTS_STORAGE_KEY,
  CLASSROOM_SUBMISSIONS_STORAGE_KEY,
  DEFAULT_CLASSROOM_ASSESSMENTS,
  type ClassroomAssessmentItem,
  type StudentSubmissionRecord,
} from '../teacher/TeacherAssessmentsPage';

export const StudentAssessmentsPage: React.FC = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'All' | 'Quiz' | 'Exam' | 'Performance Task' | 'Written Work'>('All');
  const [studentMeta, setStudentMeta] = useState<{
    id: string | number;
    fullName: string;
    grade_level: string;
    section: string;
  }>({
    id: 'student-default',
    fullName: user?.full_name || 'Student Learner',
    grade_level: 'Grade 10',
    section: 'Generosity',
  });

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

  const [submissionsMap, setSubmissionsMap] = useState<
    Record<number | string, Record<string | number, StudentSubmissionRecord>>
  >(() => {
    try {
      const saved = localStorage.getItem(CLASSROOM_SUBMISSIONS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  // Pending file staged before clicking "Turn In"
  const [stagedFiles, setStagedFiles] = useState<
    Record<
      number | string,
      { fileName: string; fileSize: string; fileType: string; fileDataUrl?: string }
    >
  >({});

  const [activeUploadAssessmentId, setActiveUploadAssessmentId] = useState<number | string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(
    null
  );

  // Teacher file preview modal state
  const [previewFile, setPreviewFile] = useState<{
    assessment: ClassroomAssessmentItem;
    fileName: string;
    fileSize?: string;
    dataUrl?: string;
    isTeacherFile: boolean;
  } | null>(null);

  // Real-time synchronization when Teacher updates or uploads new assessments
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem(CLASSROOM_ASSESSMENTS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAssessments(parsed);
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('plsnhs-assessments-updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('plsnhs-assessments-updated', handleStorageChange);
    };
  }, []);

  // Resolve logged-in student's section & ID from Supabase so their Turn-In syncs directly with Teacher's section roster
  useEffect(() => {
    async function loadStudentSection() {
      try {
        const secRes = await supabase.from('sections').select('id, name, grade_level');
        const secs = secRes.data || [];
        const secById: Record<string, { name: string; grade_level: string }> = {};
        secs.forEach((s) => {
          secById[s.id] = { name: s.name, grade_level: s.grade_level };
        });

        const userGrade = user?.student_grade || (user as any)?.grade_level;
        const userSection = user?.student_section || (user as any)?.section;
        const userLrn = user?.student_lrn || (user as any)?.lrn;

        let matched: any = null;
        if (user?.email || userLrn) {
          const conditions: string[] = [];
          if (user?.email) conditions.push(`email.ilike.${user.email.trim().toLowerCase()}`);
          if (userLrn) conditions.push(`lrn.eq.${userLrn}`);
          if (conditions.length > 0) {
            const { data } = await supabase.from('students').select('*').or(conditions.join(',')).limit(1);
            if (data && data.length > 0) {
              matched = data[0];
            }
          }
        }

        if (matched) {
          const secInfo = matched.section_id ? secById[matched.section_id] : undefined;
          setStudentMeta({
            id: matched.id,
            fullName: `${matched.last_name}, ${matched.first_name}`,
            grade_level: userGrade || secInfo?.grade_level || matched.grade_level || 'Grade 10',
            section: userSection || secInfo?.name || matched.section || 'Generosity',
          });
        } else if (userGrade || userSection) {
          setStudentMeta({
            id: user?.student_id || user?.id || 'student-current',
            fullName: user?.full_name || 'Student Learner',
            grade_level: userGrade || 'Grade 10',
            section: userSection || 'Generosity',
          });
        }

        // Load live assessments from Supabase
        const { data: dbAss } = await supabase
          .from('assessments')
          .select('*')
          .order('created_at', { ascending: false });

        if (dbAss && dbAss.length > 0) {
          const mappedAss: ClassroomAssessmentItem[] = dbAss.map((a: any) => ({
            id: a.id,
            title: a.title,
            instructions: a.description || 'Complete the assessment and turn in your work.',
            subject: a.subject_name || 'General Mathematics',
            grade_level: a.section_name?.includes('Grade') ? a.section_name.split(' - ')[0] : 'Grade 10',
            section: a.section_name?.includes(' - ') ? a.section_name.split(' - ')[1] : a.section_name || 'Generosity',
            type: (a.type || 'Quiz') as any,
            totalScore: a.total_points || 50,
            passingScore: Math.round((a.total_points || 50) * 0.75),
            date: a.due_date ? a.due_date.split('T')[0] : a.created_at.split('T')[0],
            attachmentName: a.attachment_name || undefined,
            attachmentDataUrl: a.attachment_url || undefined,
          }));

          setAssessments((prev) => {
            const map = new Map<number | string, ClassroomAssessmentItem>();
            mappedAss.forEach((a) => map.set(a.id, a));
            prev.forEach((a) => {
              if (!map.has(a.id)) map.set(a.id, a);
            });
            return Array.from(map.values());
          });
        }
      } catch {
        // fallback to default
      }
    }
    loadStudentSection();
  }, [user]);

  const handleDownloadAttachment = (item: ClassroomAssessmentItem) => {
    const fileName = item.attachmentName || `${item.title.replace(/[^a-zA-Z0-9]/g, '_')}_Material.pdf`;

    if (item.attachmentDataUrl) {
      const a = document.createElement('a');
      a.href = item.attachmentDataUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // Generate official DepEd questionnaire document blob if not a raw base64 dataUrl
    const docContent = `PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL
Department of Education • Region VII, Central Visayas
School ID: 303035

OFFICIAL CLASSROOM ASSESSMENT QUESTIONNAIRE & REFERENCE MATERIAL
========================================================================
Subject: ${item.subject}
Title: ${item.title}
Year Level & Section: ${item.grade_level} • Section ${item.section}
Assessment Category: ${item.type}
Total Points: ${item.totalScore} pts (Passing Score: ${item.passingScore} pts)
Due Date: ${item.date}
Document Reference: ${fileName}
========================================================================

TEACHER'S OFFICIAL INSTRUCTIONS:
${item.instructions || 'Read all items carefully. Show complete and legible solutions for full credit. Turn in your completed output before the specified deadline.'}

------------------------------------------------------------------------
PART I. GENERAL DIRECTIONS & ASSESSMENT GUIDELINES
1. Write your full name (Last Name, First Name, M.I.), LRN, and Section on your answer sheet.
2. Ensure all final answers are clearly boxed or highlighted.
3. For performance tasks and written problem sets, attach supporting computations or rubrics.
4. Upload your completed PDF, Word, or scanned photo via the PLSNHS Learner Portal "Turn In" box.

PART II. ASSESSMENT TASKS / ITEMS:
Item 1: Comprehensive Conceptual Review & Problem Analysis
   - Analyze the given problem scenarios and apply standard competencies.
Item 2: Computational / Practical Application
   - Formulate mathematical/applied models and solve showing step-by-step procedure.
Item 3: Critical Analysis & Synthesis
   - Summarize observations, conclusions, and real-life significance.

------------------------------------------------------------------------
Certified Official School Material • Placido L. Señor National High School
DepEd K-12 Curriculum Standard • S.Y. 2025-2026
`;

    const blob = new Blob([docContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.pdf') ? fileName.replace('.pdf', '_Questionnaire.txt') : fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(
    () => assessments.filter((a) => filter === 'All' || a.type === filter),
    [assessments, filter]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || activeUploadAssessmentId === null) return;

    const targetAssId = activeUploadAssessmentId;
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    const reader = new FileReader();
    reader.onload = () => {
      setStagedFiles((prev) => ({
        ...prev,
        [targetAssId]: {
          fileName: file.name,
          fileSize: `${sizeKb} KB`,
          fileType: file.name.split('.').pop()?.toUpperCase() || 'FILE',
          fileDataUrl: typeof reader.result === 'string' ? reader.result : undefined,
        },
      }));
      setActiveUploadAssessmentId(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleTurnIn = (assessment: ClassroomAssessmentItem) => {
    const staged = stagedFiles[assessment.id];
    const existing = submissionsMap[assessment.id]?.[studentMeta.id];
    const fileToSubmit = staged || {
      fileName: existing?.fileName || `${studentMeta.fullName.replace(/[^a-zA-Z0-9]/g, '_')}_${assessment.type}.pdf`,
      fileSize: existing?.fileSize || '280 KB',
      fileType: existing?.fileType || 'PDF',
      fileDataUrl: existing?.fileDataUrl,
    };

    const nextSubmissions: Record<number, Record<string | number, StudentSubmissionRecord>> = {
      ...submissionsMap,
      [assessment.id]: {
        ...(submissionsMap[assessment.id] || {}),
        [studentMeta.id]: {
          score: existing?.score ?? null,
          submitted: true,
          submittedAt: new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          fileName: fileToSubmit.fileName,
          fileSize: fileToSubmit.fileSize,
          fileType: fileToSubmit.fileType,
          fileDataUrl: fileToSubmit.fileDataUrl,
        },
      },
    };

    setSubmissionsMap(nextSubmissions);
    try {
      localStorage.setItem(CLASSROOM_SUBMISSIONS_STORAGE_KEY, JSON.stringify(nextSubmissions));
    } catch {
      // ignore
    }

    // Persist to Supabase assessment_submissions if assessment ID is a UUID
    try {
      if (typeof assessment.id === 'string' && assessment.id.includes('-')) {
        supabase
          .from('assessment_submissions')
          .upsert(
            [
              {
                assessment_id: assessment.id,
                student_id:
                  typeof studentMeta.id === 'string' && studentMeta.id.includes('-')
                    ? studentMeta.id
                    : null,
                student_name: studentMeta.fullName,
                student_lrn: user?.student_lrn || null,
                student_email: user?.email || null,
                file_name: fileToSubmit.fileName,
                file_url: fileToSubmit.fileDataUrl || null,
                status: 'submitted',
                submitted_at: new Date().toISOString(),
              },
            ],
            { onConflict: 'assessment_id,student_id' }
          )
          .then(({ error }) => {
            if (error) console.warn('Supabase submission upsert notice:', error);
          });
      }
    } catch {
      // ignore
    }

    setNotice({
      type: 'success',
      message: `Turned in "${fileToSubmit.fileName}" for "${assessment.title}" (${assessment.grade_level} • Section ${assessment.section}). Your teacher can now view and grade your file!`,
    });
  };

  const handleUnsubmit = (assessment: ClassroomAssessmentItem) => {
    const existing = submissionsMap[assessment.id]?.[studentMeta.id];
    if (existing?.fileName) {
      setStagedFiles((prev) => ({
        ...prev,
        [assessment.id]: {
          fileName: existing.fileName!,
          fileSize: existing.fileSize || '240 KB',
          fileType: existing.fileType || 'PDF',
          fileDataUrl: existing.fileDataUrl,
        },
      }));
    }

    const nextSubmissions: Record<number, Record<string | number, StudentSubmissionRecord>> = {
      ...submissionsMap,
      [assessment.id]: {
        ...(submissionsMap[assessment.id] || {}),
        [studentMeta.id]: {
          score: existing?.score ?? null,
          submitted: false,
        },
      },
    };

    setSubmissionsMap(nextSubmissions);
    try {
      localStorage.setItem(CLASSROOM_SUBMISSIONS_STORAGE_KEY, JSON.stringify(nextSubmissions));
    } catch {
      // ignore
    }

    setNotice({
      type: 'info',
      message: `Unsubmitted your work for "${assessment.title}". You can attach a new file and turn it in again.`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-10">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            My Assessments &amp; Classwork
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            View classwork assigned to your Year Level &amp; Section, download teacher materials, and turn in your work via file upload like Google Classroom.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f172a] px-3 py-1.5 text-xs font-bold text-white">
            <GraduationCap className="h-3.5 w-3.5 text-amber-400" />
            {studentMeta.grade_level}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            <Layers className="h-3.5 w-3.5 text-emerald-600" />
            Section {studentMeta.section}
          </span>
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs w-full sm:w-fit overflow-x-auto">
        {(['All', 'Quiz', 'Exam', 'Performance Task', 'Written Work'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-xl px-4 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === tab
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Google Classroom Style Assessment Cards */}
      <div className="space-y-4">
        {filtered.map((item) => {
          const submission = submissionsMap[item.id]?.[studentMeta.id];
          const staged = stagedFiles[item.id];
          const isTurnedIn = Boolean(submission?.submitted);
          const hasScore =
            submission?.score !== null && submission?.score !== undefined;
          const isPassed = hasScore && submission!.score! >= item.passingScore;

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-emerald-300 transition-all"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left Column: Assessment Details & Teacher Attachment */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#0f172a] px-2 py-0.5 text-[10px] font-bold text-white">
                          <GraduationCap className="h-3 w-3 text-amber-400" />
                          {item.grade_level}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <Layers className="h-3 w-3 text-emerald-600" />
                          Section {item.section}
                        </span>
                        <Badge
                          variant={
                            item.type === 'Exam'
                              ? 'danger'
                              : item.type === 'Performance Task'
                              ? 'emerald'
                              : 'info'
                          }
                          size="sm"
                        >
                          {item.type}
                        </Badge>
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 font-display">
                        {item.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="font-bold text-slate-700">{item.subject}</span>
                        <span>•</span>
                        <span>Due: {item.date}</span>
                        <span>•</span>
                        <span className="font-mono font-bold text-slate-700">
                          {item.totalScore} pts (Pass: {item.passingScore} pts)
                        </span>
                      </div>
                    </div>
                  </div>

                  {item.instructions && (
                    <p className="text-xs text-slate-600 leading-relaxed pl-13">
                      {item.instructions}
                    </p>
                  )}

                  {item.attachmentName && (
                    <div className="pl-13">
                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 rounded-2xl border border-emerald-200/90 bg-emerald-50/50 p-3 shadow-2xs hover:border-emerald-400 hover:bg-emerald-50 transition-all">
                        <div
                          onClick={() => {
                            setPreviewFile({
                              assessment: item,
                              fileName: item.attachmentName!,
                              fileSize: item.attachmentSize,
                              dataUrl: item.attachmentDataUrl,
                              isTeacherFile: true,
                            });
                          }}
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-2xs group-hover:scale-105 transition-transform">
                            <FileText className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-xs text-slate-900 group-hover:text-emerald-800 transition-colors truncate max-w-xs sm:max-w-md">
                              {item.attachmentName}
                            </p>
                            <p className="text-[10px] font-medium text-emerald-700/80">
                              Teacher Reference Material • {item.attachmentSize || '412 KB'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewFile({
                                assessment: item,
                                fileName: item.attachmentName!,
                                fileSize: item.attachmentSize,
                                dataUrl: item.attachmentDataUrl,
                                isTeacherFile: true,
                              });
                            }}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-2.5 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100/60 transition-all cursor-pointer"
                            title="View / Read Teacher Uploaded File"
                          >
                            <Eye className="h-3.5 w-3.5 text-emerald-700" />
                            <span>View File</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(item)}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-2.5 text-xs font-bold text-white shadow-2xs transition-all cursor-pointer"
                            title="Download Teacher File"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Google Classroom "Your Work" File Upload & Turn-In Box */}
                <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Your Work
                    </span>

                    {isTurnedIn ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Turned In
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        Assigned
                      </span>
                    )}
                  </div>

                  {/* Attached / Uploaded Student File Box */}
                  {isTurnedIn && submission?.fileName ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-800">
                            {submission.fileName}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {submission.fileSize || '240 KB'} • {submission.submittedAt || 'Submitted'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPreviewFile({
                            assessment: item,
                            fileName: submission.fileName!,
                            fileSize: submission.fileSize,
                            dataUrl: submission.fileDataUrl,
                            isTeacherFile: false,
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 hover:text-emerald-700 cursor-pointer shrink-0 transition-colors"
                        title="View Submitted Work"
                      >
                        <Eye className="h-3.5 w-3.5 text-emerald-700" />
                        View
                      </button>
                    </div>
                  ) : staged ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-800">
                            {staged.fileName}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {staged.fileSize} • Ready to turn in
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setStagedFiles((prev) => {
                            const copy = { ...prev };
                            delete copy[item.id];
                            return copy;
                          })
                        }
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-3 text-center">
                      <p className="text-[11px] font-medium text-slate-500">
                        No file attached yet. Upload your completed PDF, Word, or image file.
                      </p>
                    </div>
                  )}

                  {/* Score & Passing Status if Graded */}
                  {hasScore && (
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
                      <span className="font-bold text-slate-600">Teacher Grade:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-slate-900">
                          {submission!.score} / {item.totalScore} pts
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                            isPassed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isPassed ? 'PASSED' : 'DID NOT PASS'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons (Add File / Turn In / Unsubmit) */}
                  <div className="flex items-center gap-2">
                    {!isTurnedIn ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveUploadAssessmentId(item.id);
                            fileInputRef.current?.click();
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5 text-emerald-700" />
                          {staged ? 'Replace File' : 'Upload File'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTurnIn(item)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800 transition-all cursor-pointer"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Turn In
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUnsubmit(item)}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Unsubmit / Replace File
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Teacher Reference Material & Questionnaire Preview Modal */}
      <Modal
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        title={previewFile?.isTeacherFile ? "Teacher's Uploaded Reference Material" : "Your Submitted Work"}
        subtitle={
          previewFile
            ? `${previewFile.assessment.subject} • ${previewFile.assessment.grade_level} Section ${previewFile.assessment.section}`
            : ''
        }
        maxWidth="3xl"
      >
        {previewFile && (
          <div className="space-y-4">
            {/* File Info Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-2xs shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-md">
                      {previewFile.isTeacherFile ? 'Teacher Uploaded' : 'Learner Uploaded'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {previewFile.fileSize || 'Standard DepEd Doc'}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 mt-0.5 truncate max-w-md">
                    {previewFile.fileName}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadAttachment(previewFile.assessment)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Download File</span>
                </button>
              </div>
            </div>

            {/* Document / File Preview Display Box */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-6 min-h-[380px] max-h-[580px] overflow-y-auto">
              {previewFile.dataUrl?.startsWith('data:image/') ? (
                <div className="flex flex-col items-center justify-center">
                  <img
                    src={previewFile.dataUrl}
                    alt={previewFile.fileName}
                    className="max-h-[500px] w-auto rounded-xl object-contain shadow-md border border-slate-200"
                  />
                </div>
              ) : previewFile.dataUrl?.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewFile.dataUrl}
                  title={previewFile.fileName}
                  className="w-full h-[500px] rounded-xl border border-slate-200 bg-white shadow-xs"
                />
              ) : (
                /* DepEd Official Formatted Questionnaire Document View */
                <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-xs text-slate-900 font-sans space-y-6">
                  {/* Official DepEd Header */}
                  <div className="text-center border-b border-slate-200 pb-4 space-y-1">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Republic of the Philippines · Department of Education
                    </p>
                    <p className="text-xs font-bold text-slate-700">
                      Region VII, Central Visayas · Division of Cebu Province
                    </p>
                    <h3 className="text-base sm:text-lg font-black text-[#1a225a] font-display uppercase tracking-tight">
                      Placido L. Señor National High School
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500">
                      School ID: 303035 · Official Classroom Assessment Questionnaire
                    </p>
                  </div>

                  {/* Assessment Metadata Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Subject</span>
                      <span className="font-extrabold text-slate-900">{previewFile.assessment.subject}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Type</span>
                      <span className="font-extrabold text-emerald-800">{previewFile.assessment.type}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Grade &amp; Section</span>
                      <span className="font-extrabold text-slate-900">{previewFile.assessment.grade_level} - {previewFile.assessment.section}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total / Passing</span>
                      <span className="font-mono font-extrabold text-slate-900">{previewFile.assessment.totalScore} pts (Pass: {previewFile.assessment.passingScore})</span>
                    </div>
                  </div>

                  {/* Teacher's Official Instructions */}
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-xs uppercase tracking-wide">
                      <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                      Teacher's Directions:
                    </div>
                    <p className="text-slate-800 leading-relaxed font-medium">
                      {previewFile.assessment.instructions}
                    </p>
                  </div>

                  {/* Assessment Items Content */}
                  <div className="space-y-4 text-xs text-slate-800">
                    <h5 className="font-extrabold text-sm text-[#1a225a] border-b border-slate-200 pb-1.5 uppercase tracking-wide">
                      Part I: Examination Questions &amp; Problem Solving
                    </h5>

                    <div className="space-y-3.5 pl-2">
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900">
                          1. Concept Mastery &amp; Application (15 points)
                        </p>
                        <p className="text-slate-600 pl-3">
                          Define and thoroughly illustrate the fundamental principles governing {previewFile.assessment.subject}. Present step-by-step derivation or proof as outlined in your DepEd learning module.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="font-bold text-slate-900">
                          2. Practical Modeling &amp; Problem Solving (20 points)
                        </p>
                        <p className="text-slate-600 pl-3">
                          Solve the scenario-based problem set presented in this assessment. Clearly state all given values, formulas utilized, solution steps, and box your final answer.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="font-bold text-slate-900">
                          3. Synthesis &amp; Critical Reflection (15 points)
                        </p>
                        <p className="text-slate-600 pl-3">
                          Discuss how the theoretical frameworks in {previewFile.assessment.subject} relate to authentic daily community and institutional scenarios.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Instructions on Turning In */}
                  <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <p>
                      💡 When done, upload your scanned paper or document in the <strong className="text-slate-800">"Your Work"</strong> box on the right and click <strong className="text-emerald-700">"Turn In"</strong>.
                    </p>
                    <span className="font-mono text-[10px] text-slate-400">Due: {previewFile.assessment.date}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
