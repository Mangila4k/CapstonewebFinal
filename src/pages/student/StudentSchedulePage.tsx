import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  Printer,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  GraduationCap,
  Layers,
  AlertCircle,
  FileText,
  ExternalLink,
  RefreshCw,
  Eye,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  SENT_SCHEDULES_STORAGE_KEY,
  printScheduleSheet,
  downloadScheduleFile,
  type SentScheduleRecord,
} from '../teacher/TeacherClassesPage';
import { Badge } from '../../components/common/Badge';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';

interface AttachedScheduleInfo {
  id: string;
  grade_level: string;
  section: string;
  strand?: string | null;
  room?: string | null;
  teacher_name: string;
  title: string;
  note?: string;
  file_name: string;
  file_url?: string | null;
  file_type?: string | null;
  file_size?: string;
  sent_at: string;
  slots?: Array<{
    time: string;
    day: string;
    subject: string;
    code: string;
    room: string;
    teacher: string;
    isBreak?: boolean;
  }>;
}

export const StudentSchedulePage: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attachedSchedule, setAttachedSchedule] = useState<AttachedScheduleInfo | null>(null);
  const [previewMode, setPreviewMode] = useState<'preview' | 'table'>('preview');

  // Resolved student metadata
  const [resolvedStudent, setResolvedStudent] = useState({
    name: user?.full_name || 'Student Learner',
    lrn: user?.student_lrn || '',
    grade: user?.student_grade || '',
    section: user?.student_section || '',
    strand: user?.student_strand || '',
    adviser: 'Class Adviser',
    room: 'Bldg A, Rm 201',
  });

  const loadStudentSchedule = useCallback(async () => {
    try {
      // 1. Identify learner profile from Supabase students / enrollments
      let studentData: any = null;
      const cleanEmail = (user?.email || '').trim().toLowerCase();
      const orFilters: string[] = [];
      if (user?.student_id) orFilters.push(`id.eq.${user.student_id}`);
      if (cleanEmail) orFilters.push(`email.ilike.${cleanEmail}`);
      if (user?.student_lrn) orFilters.push(`lrn.eq.${user.student_lrn}`);

      if (orFilters.length > 0) {
        const { data: sRows } = await supabase
          .from('students')
          .select('*')
          .or(orFilters.join(','))
          .limit(1);
        if (sRows && sRows.length > 0) {
          studentData = sRows[0];
        }
      }

      const activeGrade = studentData?.grade_level || user?.student_grade || '';
      const activeStrand = studentData?.strand ?? user?.student_strand ?? '';
      const activeLrn = studentData?.lrn || user?.student_lrn || '';
      const activeName =
        (studentData?.first_name && studentData?.last_name
          ? `${studentData.first_name} ${studentData.last_name}`
          : user?.full_name) || 'Student Learner';

      // 2. Resolve section record
      let matchedSec: any = null;
      if (studentData?.section_id || user?.section_id) {
        const secId = studentData?.section_id || user?.section_id;
        const { data: secRow } = await supabase
          .from('sections')
          .select('*')
          .eq('id', secId)
          .maybeSingle();
        if (secRow) matchedSec = secRow;
      }

      if (!matchedSec && (studentData?.section || user?.student_section)) {
        const secName = (studentData?.section || user?.student_section || '')
          .replace(/^section\s+/i, '')
          .trim();
        const { data: secRows } = await supabase
          .from('sections')
          .select('*')
          .ilike('name', `%${secName}%`);
        if (secRows && secRows.length > 0) {
          matchedSec =
            secRows.find(
              (s) =>
                s.name.toLowerCase() === secName.toLowerCase() &&
                (!activeGrade || s.grade_level === activeGrade)
            ) || secRows[0];
        }
      }

      const finalSectionName = matchedSec?.name || user?.student_section || '';
      const adviserName =
        matchedSec?.adviser_name ||
        matchedSec?.schedule_doc_uploaded_by ||
        'Assigned Class Adviser';

      setResolvedStudent({
        name: activeName,
        lrn: activeLrn,
        grade: activeGrade || matchedSec?.grade_level || 'High School',
        section: finalSectionName,
        strand: activeStrand || matchedSec?.strand || '',
        adviser: adviserName,
        room: matchedSec?.room || 'Bldg A, Rm 201',
      });

      // 3. Strict Check: Has the teacher / section adviser attached a schedule?
      // Source A: Supabase sections table schedule_doc_url
      let foundSchedule: AttachedScheduleInfo | null = null;

      if (matchedSec && matchedSec.schedule_doc_url) {
        // Fetch row-level schedule slots if any
        const [schedRes, subRes] = await Promise.all([
          supabase.from('schedules').select('*').eq('section_id', matchedSec.id),
          supabase.from('subjects').select('*'),
        ]);

        const dbSlots = (schedRes.data || []).map((sch: any) => {
          const matchedSub = (subRes.data || []).find((sub: any) => sub.id === sch.subject_id);
          return {
            time: `${sch.start_time || '07:30 AM'} – ${sch.end_time || '08:30 AM'}`,
            day: sch.day || 'Monday – Friday',
            subject: matchedSub?.name || 'Academic Learning Area',
            code: matchedSub?.code || 'CORE',
            room: sch.room || matchedSec.room || 'Bldg A, Rm 201',
            teacher: adviserName,
          };
        });

        // Determine file type
        let docType = matchedSec.schedule_doc_type || '';
        const docUrl = matchedSec.schedule_doc_url;
        const docName = matchedSec.schedule_doc_name || `PLSNHS_Section_${matchedSec.name}_Schedule.pdf`;

        if (!docType) {
          if (docName.toLowerCase().endsWith('.pdf') || docUrl.startsWith('data:application/pdf')) {
            docType = 'application/pdf';
          } else if (docName.toLowerCase().match(/\.(jpe?g|png|webp|gif)$/) || docUrl.startsWith('data:image/')) {
            docType = 'image';
          } else {
            docType = 'csv';
          }
        }

        foundSchedule = {
          id: `sb-sec-${matchedSec.id}`,
          grade_level: matchedSec.grade_level || activeGrade,
          section: matchedSec.name,
          strand: matchedSec.strand || activeStrand || null,
          room: matchedSec.room || 'Bldg A, Rm 201',
          teacher_name: matchedSec.schedule_doc_uploaded_by || adviserName,
          title: `Official Class Schedule — ${matchedSec.grade_level || activeGrade} Section ${matchedSec.name}`,
          note: `Official class schedule attached and verified by ${matchedSec.schedule_doc_uploaded_by || adviserName} for S.Y. 2026–2027.`,
          file_name: docName,
          file_url: docUrl,
          file_type: docType,
          file_size: 'Official Attachment',
          sent_at: matchedSec.schedule_doc_updated_at || matchedSec.shared_at || new Date().toISOString(),
          slots: dbSlots.length > 0 ? dbSlots : undefined,
        };
      }

      // Source B: Teacher-sent schedule broadcast records in localStorage
      if (!foundSchedule && finalSectionName) {
        try {
          const rawSent = localStorage.getItem(SENT_SCHEDULES_STORAGE_KEY);
          if (rawSent) {
            const parsedList: SentScheduleRecord[] = JSON.parse(rawSent);
            if (Array.isArray(parsedList)) {
              const matchedRecord = parsedList.find((rec) => {
                const secMatch =
                  (rec.section || '').toLowerCase().trim() === finalSectionName.toLowerCase().trim();
                const gradeMatch = !activeGrade || rec.grade_level === activeGrade;
                const isExplicitRecipient =
                  rec.recipient_mode === 'all' ||
                  (studentData?.id && rec.recipient_ids?.includes(studentData.id)) ||
                  rec.recipient_names?.some((rn) =>
                    rn.toLowerCase().includes(activeName.toLowerCase())
                  );
                return secMatch && gradeMatch && isExplicitRecipient;
              });

              if (matchedRecord && matchedRecord.id !== 'sched-default-student') {
                let recType = 'csv';
                const rFileName = (matchedRecord.file_name || '').toLowerCase();
                if (rFileName.endsWith('.pdf') || (matchedRecord.file_data_url && matchedRecord.file_data_url.startsWith('data:application/pdf'))) {
                  recType = 'application/pdf';
                } else if (rFileName.match(/\.(jpe?g|png|webp|gif)$/) || (matchedRecord.file_data_url && matchedRecord.file_data_url.startsWith('data:image/'))) {
                  recType = 'image';
                }

                foundSchedule = {
                  id: matchedRecord.id,
                  grade_level: matchedRecord.grade_level,
                  section: matchedRecord.section,
                  strand: matchedRecord.strand,
                  teacher_name: matchedRecord.teacher_name,
                  title: matchedRecord.title,
                  note: matchedRecord.note,
                  file_name: matchedRecord.file_name,
                  file_url: matchedRecord.file_data_url || null,
                  file_type: recType,
                  file_size: matchedRecord.file_size,
                  sent_at: matchedRecord.sent_at,
                  slots: matchedRecord.slots,
                };
              }
            }
          }
        } catch {
          // ignore
        }
      }

      setAttachedSchedule(foundSchedule);
    } catch (err) {
      console.warn('Error verifying student attached schedule:', err);
      setAttachedSchedule(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadStudentSchedule();

    const handleStorageChange = () => {
      loadStudentSchedule();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadStudentSchedule]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadStudentSchedule();
  };

  const handleDownload = () => {
    if (!attachedSchedule) return;

    if (attachedSchedule.file_url) {
      const a = document.createElement('a');
      a.href = attachedSchedule.file_url;
      a.download = attachedSchedule.file_name || `PLSNHS_Schedule_${attachedSchedule.section}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    if (attachedSchedule.slots && attachedSchedule.slots.length > 0) {
      downloadScheduleFile({
        id: attachedSchedule.id,
        grade_level: attachedSchedule.grade_level,
        section: attachedSchedule.section,
        strand: attachedSchedule.strand || null,
        teacher_name: attachedSchedule.teacher_name,
        title: attachedSchedule.title,
        note: attachedSchedule.note || '',
        file_name: attachedSchedule.file_name,
        file_data_url: attachedSchedule.file_url || null,
        file_size: attachedSchedule.file_size || '24 KB',
        recipient_mode: 'all',
        recipient_count: 1,
        recipient_names: [resolvedStudent.name],
        recipient_ids: [],
        sent_at: attachedSchedule.sent_at,
        slots: attachedSchedule.slots,
      });
    }
  };

  const handlePrint = () => {
    if (!attachedSchedule) return;

    if (attachedSchedule.slots && attachedSchedule.slots.length > 0) {
      printScheduleSheet(
        {
          id: attachedSchedule.id,
          grade_level: attachedSchedule.grade_level,
          section: attachedSchedule.section,
          strand: attachedSchedule.strand || null,
          teacher_name: attachedSchedule.teacher_name,
          title: attachedSchedule.title,
          note: attachedSchedule.note || '',
          file_name: attachedSchedule.file_name,
          file_data_url: attachedSchedule.file_url || null,
          file_size: attachedSchedule.file_size || '24 KB',
          recipient_mode: 'all',
          recipient_count: 1,
          recipient_names: [resolvedStudent.name],
          recipient_ids: [],
          sent_at: attachedSchedule.sent_at,
          slots: attachedSchedule.slots,
        },
        resolvedStudent.name
      );
      return;
    }

    if (attachedSchedule.file_url) {
      const printWin = window.open(attachedSchedule.file_url, '_blank');
      if (printWin) {
        printWin.focus();
        printWin.print();
      } else {
        window.print();
      }
    }
  };

  const isPdf =
    attachedSchedule?.file_type?.includes('pdf') ||
    attachedSchedule?.file_name?.toLowerCase().endsWith('.pdf') ||
    (attachedSchedule?.file_url && attachedSchedule.file_url.startsWith('data:application/pdf'));

  const isImage =
    attachedSchedule?.file_type?.includes('image') ||
    attachedSchedule?.file_name?.toLowerCase().match(/\.(jpe?g|png|webp|gif)$/) ||
    (attachedSchedule?.file_url && attachedSchedule.file_url.startsWith('data:image/'));

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Clean Executive DepEd PLSNHS Header */}
      <div className="border-b border-slate-200 pb-4 sm:pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-3xl font-extrabold text-[#0f172a] font-display tracking-tight leading-snug">
              Official Class Schedule
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Placido L. Señor National High School · Access the official class schedule file attached and published by your Class Adviser and Subject Teachers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-auto pt-0.5">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Refresh attached schedule status"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#152e69] ${refreshing ? 'animate-spin' : ''}`} />
              <span>Check for Updates</span>
            </button>
            <PageHeaderNotificationSlot />
          </div>
        </div>

        {/* Mobile Action Controls Row */}
        <div className="sm:hidden mt-3 flex items-center">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#152e69] ${refreshing ? 'animate-spin' : ''}`} />
            <span>Check Updates</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 animate-spin text-[#152e69]">
            <RefreshCw className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-slate-600">
            Checking teacher schedule attachments from school database...
          </p>
        </div>
      ) : !attachedSchedule ? (
        /* Empty State: ONLY display schedule when teacher has attached one */
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-8 sm:p-12 text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shadow-xs">
            <Calendar className="h-8 w-8" />
          </div>

          <div className="max-w-lg mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-900">
              <Clock className="h-3.5 w-3.5" />
              <span>Awaiting Adviser Attachment</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0f172a] pt-1">
              No Schedule Attached Yet
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Your Class Adviser or Subject Teacher has not yet attached or distributed the official class schedule for{' '}
              <strong className="text-slate-900">
                {resolvedStudent.grade ? `${resolvedStudent.grade} – ` : ''}Section {resolvedStudent.section || 'Unassigned'}
              </strong>
              . Under school policy, learners may only view the official schedule file after it has been verified and released by their assigned teacher.
            </p>
          </div>

          {/* Section & Adviser Information Panel */}
          <div className="max-w-md mx-auto rounded-xl border border-slate-200 bg-white p-4 text-left shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Assigned Section:</span>
              <span className="font-bold text-[#152e69]">
                {resolvedStudent.grade} Section {resolvedStudent.section || 'Pending'}
                {resolvedStudent.strand ? ` (${resolvedStudent.strand})` : ''}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Class Adviser:</span>
              <span className="font-bold text-slate-800">{resolvedStudent.adviser}</span>
            </div>
            <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Designated Room:</span>
              <span className="font-semibold text-slate-700">{resolvedStudent.room}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">School Year:</span>
              <span className="font-semibold text-slate-700">S.Y. 2026–2027 • Regular Class</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 rounded-xl bg-[#152e69] hover:bg-[#0f1c3f] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className="h-4 w-4 text-[#F5C518]" />
              <span>Check for Updates</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400 max-w-md mx-auto pt-1">
            <Info className="h-3.5 w-3.5 inline mr-1 text-slate-400" />
            Please coordinate directly with your Class Adviser if you need an immediate physical copy of your class timetable.
          </p>
        </div>
      ) : (
        /* Teacher Attached Schedule Present: Render File Card & Document Preview */
        <div className="space-y-6">
          {/* Official Attached Schedule Verification Card */}
          <div className="rounded-2xl border-2 border-emerald-300 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#152e69] text-[#F5C518] shadow-xs">
                  {isPdf ? (
                    <FileText className="h-7 w-7" />
                  ) : isImage ? (
                    <Eye className="h-7 w-7" />
                  ) : (
                    <FileSpreadsheet className="h-7 w-7" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="success" size="sm">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1 inline" />
                      Attached by Teacher
                    </Badge>
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#152e69] px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                      <GraduationCap className="h-3.5 w-3.5 text-[#F5C518]" />
                      {attachedSchedule.grade_level}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-[#152e69]">
                      <Layers className="h-3.5 w-3.5" />
                      Section {attachedSchedule.section}
                    </span>
                    {attachedSchedule.strand && (
                      <span className="inline-flex items-center rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10.5px] font-semibold text-blue-800">
                        {attachedSchedule.strand}
                      </span>
                    )}
                  </div>

                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                    {attachedSchedule.title}
                  </h2>

                  {attachedSchedule.note && (
                    <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                      <strong className="text-slate-800">Note from Adviser: </strong>
                      {attachedSchedule.note}
                    </p>
                  )}

                  <div className="flex items-center gap-3 flex-wrap pt-1 text-xs text-slate-500 font-medium">
                    <span>
                      Attached by: <strong className="text-slate-900">{attachedSchedule.teacher_name}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      File: <strong className="text-emerald-700">{attachedSchedule.file_name}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Released:{' '}
                      {new Date(attachedSchedule.sent_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Print, Download, Open */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
                {attachedSchedule.file_url && (
                  <a
                    href={attachedSchedule.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    <ExternalLink className="h-4 w-4 text-[#152e69]" />
                    <span>Open in New Tab</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                >
                  <Printer className="h-4 w-4 text-[#152e69]" />
                  <span>Print Schedule</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#152e69] hover:bg-[#0f1c3f] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  <Download className="h-4 w-4 text-[#F5C518]" />
                  <span>Download Schedule</span>
                </button>
              </div>
            </div>

            {/* View Mode Switcher if both document and slots exist */}
            {attachedSchedule.slots && attachedSchedule.slots.length > 0 && attachedSchedule.file_url && (
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <span className="text-xs font-semibold text-slate-500 mr-1">Display View:</span>
                <button
                  type="button"
                  onClick={() => setPreviewMode('preview')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    previewMode === 'preview'
                      ? 'bg-[#152e69] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Document Attachment
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('table')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    previewMode === 'table'
                      ? 'bg-[#152e69] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Timetable Grid
                </button>
              </div>
            )}
          </div>

          {/* Document Preview Card (For PDF or Images) */}
          {(previewMode === 'preview' || !attachedSchedule.slots || attachedSchedule.slots.length === 0) &&
            attachedSchedule.file_url && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-[#152e69]" />
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Attached Document Preview ({attachedSchedule.file_name})
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                    Verified Teacher Attachment
                  </span>
                </div>

                <div className="p-4 sm:p-6 bg-slate-100/50 flex flex-col items-center justify-center min-h-[400px]">
                  {isPdf ? (
                    <div className="w-full space-y-3">
                      <iframe
                        src={`${attachedSchedule.file_url}#toolbar=1&navpanes=0`}
                        title={attachedSchedule.file_name}
                        className="w-full h-[650px] rounded-xl border border-slate-300 shadow-inner bg-white"
                      />
                      <p className="text-center text-xs text-slate-500">
                        Viewing official PDF schedule. If preview is not supported by your browser,{' '}
                        <a
                          href={attachedSchedule.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-[#152e69] underline"
                        >
                          click here to open document directly
                        </a>
                        .
                      </p>
                    </div>
                  ) : isImage ? (
                    <div className="max-w-4xl w-full flex flex-col items-center space-y-3">
                      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm max-h-[750px] w-full flex justify-center p-2">
                        <img
                          src={attachedSchedule.file_url}
                          alt={attachedSchedule.file_name}
                          className="max-h-[720px] object-contain rounded-lg"
                        />
                      </div>
                      <p className="text-xs text-slate-500">
                        Official schedule image attached by {attachedSchedule.teacher_name}. Click{' '}
                        <button
                          type="button"
                          onClick={handleDownload}
                          className="font-bold text-[#152e69] underline cursor-pointer"
                        >
                          download
                        </button>{' '}
                        for high-resolution copy.
                      </p>
                    </div>
                  ) : (
                    /* Fallback for CSV or other formats */
                    <div className="text-center py-10 space-y-3">
                      <FileSpreadsheet className="h-12 w-12 text-[#152e69] mx-auto" />
                      <h4 className="text-sm font-bold text-slate-800">
                        {attachedSchedule.file_name}
                      </h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Official tabular schedule document attached by your teacher. You can download or print it below.
                      </p>
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#152e69] hover:bg-[#0f1c3f] px-4 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
                      >
                        <Download className="h-4 w-4 text-[#F5C518]" />
                        <span>Download Schedule File</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Structured Subject Timetable (If table mode or if slots available) */}
          {(previewMode === 'table' || !attachedSchedule.file_url) &&
            attachedSchedule.slots &&
            attachedSchedule.slots.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#152e69]" />
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Daily Subject Timetable ({attachedSchedule.grade_level} – Section {attachedSchedule.section})
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Monday – Friday • S.Y. 2026–2027
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {attachedSchedule.slots.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-4 transition-colors ${
                        item.isBreak
                          ? 'bg-amber-50/50 text-amber-900'
                          : 'bg-white hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                              item.isBreak
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            <Clock className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-bold text-slate-900">{item.subject}</h4>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-[#152e69]">
                                {item.code}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                              <span className="font-semibold text-emerald-700">{item.time}</span>
                              <span>•</span>
                              <span>{item.day}</span>
                            </div>
                          </div>
                        </div>

                        {!item.isBreak && (
                          <div className="flex items-center gap-3 text-xs text-slate-600 sm:text-right">
                            <div className="flex items-center gap-1.5 font-medium">
                              <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                              <span>{item.teacher}</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-bold text-[#152e69] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{item.room}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};
