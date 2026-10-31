import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  SENT_SCHEDULES_STORAGE_KEY,
  buildSectionScheduleSlots,
  printScheduleSheet,
  downloadScheduleFile,
  type SentScheduleRecord,
} from '../teacher/TeacherClassesPage';
import { Badge } from '../../components/common/Badge';

export const StudentSchedulePage: React.FC = () => {
  const { user } = useAuth();

  const defaultStudentGrade = user?.student_grade || 'Grade 10';
  const defaultStudentSection = user?.student_section || 'Generosity';
  const defaultStudentName = user?.full_name || 'Student Learner';

  const [sentSchedules, setSentSchedules] = useState<SentScheduleRecord[]>(() => {
    try {
      const raw = localStorage.getItem(SENT_SCHEDULES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }

    return [
      {
        id: 'sched-default-student',
        grade_level: defaultStudentGrade,
        section: defaultStudentSection,
        strand: user?.student_strand || null,
        teacher_name: 'Ryan Quiroga',
        title: `Official Class Schedule — ${defaultStudentGrade} Section ${defaultStudentSection} (S.Y. 2026–2027)`,
        note: 'Attached is your official class schedule sent by your Class Adviser / Teacher. You may print it out or download a copy for your reference.',
        file_name: `PLSNHS_${defaultStudentGrade.replace(/\s+/g, '')}_Section_${defaultStudentSection}_Schedule.csv`,
        file_size: '24 KB',
        recipient_mode: 'all',
        recipient_count: 42,
        recipient_names: [defaultStudentName],
        recipient_ids: [],
        sent_at: new Date().toISOString(),
        slots: buildSectionScheduleSlots(
          defaultStudentGrade,
          defaultStudentSection,
          'Bldg A, Rm 201',
          'Ryan Quiroga'
        ),
      },
    ];
  });

  useEffect(() => {
    const syncSchedules = () => {
      try {
        const raw = localStorage.getItem(SENT_SCHEDULES_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSentSchedules(parsed);
          }
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('storage', syncSchedules);
    return () => window.removeEventListener('storage', syncSchedules);
  }, []);

  const activeSchedule = sentSchedules[0];
  const scheduleItems = activeSchedule?.slots || buildSectionScheduleSlots(
    defaultStudentGrade,
    defaultStudentSection,
    'Bldg A, Rm 201',
    'Ryan Quiroga'
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Clean Executive Header */}
      <div className="border-b border-slate-200 pb-4 sm:pr-12">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] font-display tracking-tight">
          Weekly Class Schedule
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          View, print, or download the official class schedule sent by your Class Adviser and Subject Teachers for S.Y. 2026–2027.
        </p>
      </div>

      {/* Teacher-Sent Official Schedule File Card (with Print & Download buttons) */}
      {activeSchedule && (
        <div className="rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1B2A4A] text-[#F5C518] shadow-xs">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="success" size="sm">
                    <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                    Sent by Teacher
                  </Badge>
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#1B2A4A] px-2 py-0.5 text-[10.5px] font-extrabold text-white">
                    <GraduationCap className="h-3 w-3 text-[#F5C518]" />
                    {activeSchedule.grade_level}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10.5px] font-bold text-[#1B2A4A]">
                    <Layers className="h-3 w-3" />
                    Section {activeSchedule.section}
                  </span>
                </div>

                <h2 className="text-base font-extrabold text-slate-900">
                  {activeSchedule.title}
                </h2>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {activeSchedule.note}
                </p>

                <div className="flex items-center gap-3 flex-wrap pt-1 text-[11px] text-slate-500 font-medium">
                  <span>
                    Sent by: <strong className="text-slate-800">{activeSchedule.teacher_name}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    File: <strong className="text-emerald-700">{activeSchedule.file_name}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Date:{' '}
                    {new Date(activeSchedule.sent_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Print & Download Action Buttons for the Student */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => printScheduleSheet(activeSchedule, defaultStudentName)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 shadow-2xs transition-all cursor-pointer whitespace-nowrap"
              >
                <Printer className="h-4 w-4 text-[#1B2A4A]" />
                <span>Print Schedule</span>
              </button>

              <button
                type="button"
                onClick={() => downloadScheduleFile(activeSchedule)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1B2A4A] hover:bg-[#0f1c3f] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
              >
                <Download className="h-4 w-4 text-[#F5C518]" />
                <span>Download Schedule File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Daily Timetable Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#1B2A4A]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Daily Subject Timetable ({activeSchedule?.grade_level || defaultStudentGrade} – Section{' '}
              {activeSchedule?.section || defaultStudentSection})
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            Monday – Friday • S.Y. 2026–2027
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {scheduleItems.map((item, idx) => (
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
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-[#1B2A4A]">
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
                    <div className="flex items-center gap-1.5 font-bold text-[#1B2A4A] bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
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
    </div>
  );
};
