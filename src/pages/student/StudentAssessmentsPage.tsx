import React, { useEffect, useMemo, useRef, useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
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
    Record<number, Record<string | number, StudentSubmissionRecord>>
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
      number,
      { fileName: string; fileSize: string; fileType: string; fileDataUrl?: string }
    >
  >({});

  const [activeUploadAssessmentId, setActiveUploadAssessmentId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(
    null
  );

  // Resolve logged-in student's section & ID from Supabase so their Turn-In syncs directly with Teacher's section roster
  useEffect(() => {
    async function loadStudentSection() {
      try {
        const [secRes, stuRes] = await Promise.all([
          supabase.from('sections').select('id, name, grade_level'),
          supabase.from('students').select('*').order('last_name', { ascending: true }).limit(50),
        ]);

        const secs = secRes.data || [];
        const secById: Record<string, { name: string; grade_level: string }> = {};
        secs.forEach((s) => {
          secById[s.id] = { name: s.name, grade_level: s.grade_level };
        });

        const students = stuRes.data || [];
        const matched =
          students.find(
            (s) =>
              user?.full_name &&
              `${s.first_name} ${s.last_name}`
                .toLowerCase()
                .includes(user.full_name.toLowerCase().split(' ')[0])
          ) || students[0];

        if (matched) {
          const secInfo = (matched as any).section_id
            ? secById[(matched as any).section_id]
            : undefined;
          setStudentMeta({
            id: matched.id,
            fullName: `${matched.last_name}, ${matched.first_name}`,
            grade_level: secInfo?.grade_level || matched.grade_level || 'Grade 10',
            section: secInfo?.name || matched.section || 'Generosity',
          });
        }
      } catch {
        // fallback to default
      }
    }
    loadStudentSection();
  }, [user]);

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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-5 sm:pr-14">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            My Assessments &amp; Classwork
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            View classwork assigned to your Year Level &amp; Section, download teacher materials, and turn in your work via file upload like Google Classroom.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#0f172a] px-3 py-1.5 text-xs font-bold text-white">
            <GraduationCap className="h-3.5 w-3.5 text-amber-400" />
            {studentMeta.grade_level}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            <Layers className="h-3.5 w-3.5 text-emerald-600" />
            Section {studentMeta.section}
          </span>
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
                      <div className="inline-flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs">
                        <Paperclip className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-800">{item.attachmentName}</p>
                          <p className="text-[10px] text-slate-400">
                            Teacher Reference Material • {item.attachmentSize || '250 KB'}
                          </p>
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
    </div>
  );
};
