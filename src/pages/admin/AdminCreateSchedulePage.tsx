import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  UserCheck,
  BookOpen,
  Layers,
  GraduationCap,
  Send,
  Upload,
  FileText,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Alert } from '../../components/common/Alert';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import {
  ADMIN_TEACHER_SCHEDULE_FILES_KEY,
  DEFAULT_ADMIN_TEACHER_SCHEDULE_FILES,
  type AdminSentTeacherScheduleFile,
} from '../teacher/TeacherClassProgramPage';
import { INITIAL_PLSNHS_TEACHERS } from './AdminTeachersPage';

export const AdminCreateSchedulePage: React.FC = () => {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSendFileModalOpen, setIsSendFileModalOpen] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const [sentScheduleFiles, setSentScheduleFiles] = useState<AdminSentTeacherScheduleFile[]>(() => {
    try {
      const saved = localStorage.getItem(ADMIN_TEACHER_SCHEDULE_FILES_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_ADMIN_TEACHER_SCHEDULE_FILES;
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileForm, setFileForm] = useState({
    title: 'Official Faculty Teaching Load & Class Program (S.Y. 2026–2027)',
    schoolYear: 'S.Y. 2026–2027',
    semester: '1st & 2nd Semester',
    recipientType: 'all' as 'all' | 'selected',
    selectedTeachers: ['Ryan Quiroga'] as string[],
    notes:
      'Please review, download, or print your official teaching schedule and room assignments for S.Y. 2026–2027.',
    fileName: '',
    fileSize: '',
    fileType: 'PDF',
    fileDataUrl: '',
  });

  const [form, setForm] = useState({
    subject: 'General Mathematics',
    grade_level: 'Grade 10',
    section: 'Generosity',
    teacher: 'Ryan Quiroga',
    room: 'Rm 201 • Bldg A',
    day: 'Monday - Friday',
    timeStart: '07:30 AM',
    timeEnd: '08:30 AM',
  });

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('schedules').select('*');
      if (data && data.length > 0) {
        setSchedules(data);
      } else {
        setSchedules([
          {
            id: 1,
            subject: 'General Mathematics',
            grade_level: 'Grade 10',
            section: 'Generosity',
            teacher: 'Ryan Quiroga',
            room: 'Rm 201 • Bldg A',
            day: 'Monday - Friday',
            time: '07:30 AM - 08:30 AM',
          },
          {
            id: 2,
            subject: 'Pre-Calculus (Specialized)',
            grade_level: 'Grade 10',
            section: 'Wisdom',
            teacher: 'Ryan Quiroga',
            room: 'Math Lab • Bldg A',
            day: 'Monday - Friday',
            time: '08:30 AM - 09:30 AM',
          },
          {
            id: 3,
            subject: 'Mathematics 10',
            grade_level: 'Grade 10',
            section: 'Perseverance',
            teacher: 'Ryan Quiroga',
            room: 'Rm 105 • JHS Bldg',
            day: 'Monday - Friday',
            time: '10:00 AM - 11:00 AM',
          },
          {
            id: 4,
            subject: 'Science & Technology 8',
            grade_level: 'Grade 8',
            section: 'Square',
            teacher: 'Twengcle Deguma',
            room: 'Bldg B - Rm 207',
            day: 'Monday - Friday',
            time: '01:00 PM - 02:00 PM',
          },
        ]);
      }
    } catch (err) {
      console.warn('Schedules error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
    const reader = new FileReader();
    reader.onload = () => {
      setFileForm((prev) => ({
        ...prev,
        fileName: file.name,
        fileSize: `${sizeKb} KB`,
        fileType: ext,
        fileDataUrl: typeof reader.result === 'string' ? reader.result : '',
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSendScheduleFileToTeachers = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: AdminSentTeacherScheduleFile = {
      id: `adm-sched-${Date.now()}`,
      title: fileForm.title.trim() || 'Official Faculty Class Program',
      fileName:
        fileForm.fileName ||
        'PLSNHS_Official_Faculty_Teaching_Schedule_SY2026-2027.pdf',
      fileSize: fileForm.fileSize || '440 KB',
      fileType: fileForm.fileType || 'PDF',
      fileDataUrl: fileForm.fileDataUrl || undefined,
      schoolYear: fileForm.schoolYear,
      semester: fileForm.semester,
      recipientType: fileForm.recipientType,
      recipientTeacherNames:
        fileForm.recipientType === 'all'
          ? ['All Faculty Teachers']
          : fileForm.selectedTeachers,
      sentBy: 'School Administrator • Office of the Principal',
      sentAt: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      notes: fileForm.notes,
    };

    const next = [newEntry, ...sentScheduleFiles];
    setSentScheduleFiles(next);
    try {
      localStorage.setItem(ADMIN_TEACHER_SCHEDULE_FILES_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }

    setNotice({
      type: 'success',
      message: `Schedule file "${newEntry.fileName}" sent to ${
        newEntry.recipientType === 'all'
          ? 'All Faculty Teachers'
          : newEntry.recipientTeacherNames.join(', ')
      }. Teachers can now view, print, or download it under their Class Program!`,
    });
    setIsSendFileModalOpen(false);
  };

  const handleDeleteSentFile = (id: string) => {
    const next = sentScheduleFiles.filter((f) => f.id !== id);
    setSentScheduleFiles(next);
    try {
      localStorage.setItem(ADMIN_TEACHER_SCHEDULE_FILES_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        subject: form.subject,
        grade_level: form.grade_level,
        section: form.section,
        teacher: form.teacher,
        room: form.room,
        day: form.day,
        time: `${form.timeStart} - ${form.timeEnd}`,
      };

      await supabase.from('schedules').insert([payload]);
      setSchedules((prev) => [{ id: Date.now(), ...payload }, ...prev]);

      setNotice({ type: 'success', message: 'Class schedule timetable slot added.' });
      setIsModalOpen(false);
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to save schedule.' });
    }
  };

  const toggleTeacherRecipient = (teacherName: string) => {
    setFileForm((prev) => {
      const exists = prev.selectedTeachers.includes(teacherName);
      return {
        ...prev,
        selectedTeachers: exists
          ? prev.selectedTeachers.filter((t) => t !== teacherName)
          : [...prev.selectedTeachers, teacherName],
      };
    });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 sm:pr-12">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            Class Schedule &amp; Faculty Timetable Distribution
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Upload and send official teaching schedule files to faculty teachers and manage class periods by Year Level &amp; Section.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsSendFileModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-xs hover:bg-amber-400 transition-all cursor-pointer"
          >
            <Send className="h-4 w-4" /> Send Schedule File to Teachers
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Schedule Slot
          </button>
        </div>
      </div>

      {notice && (
        <Alert
          type={notice.type}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}

      {/* Schedule Files Sent by Admin to Teachers */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-700" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Official Schedule Files Distributed to Faculty Teachers
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            Synced directly to Teacher Portal &rarr; Class Program
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sentScheduleFiles.map((file) => (
            <div
              key={file.id}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between gap-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="emerald" size="sm">
                    {file.fileType} SCHEDULE FILE
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-medium">{file.sentAt}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{file.title}</h3>
                <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {file.fileName} ({file.fileSize})
                </p>
                <p className="text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700">Sent to:</span>{' '}
                  {file.recipientType === 'all'
                    ? 'All Faculty Teachers'
                    : file.recipientTeacherNames.join(', ')}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200/70 pt-2.5 text-[11px]">
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Delivered to Teacher Class Program
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteSentFile(file.id)}
                  className="text-slate-400 hover:text-rose-600 cursor-pointer"
                  title="Remove distributed file"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timetable Slots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schedules.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-[#0f172a] px-2.5 py-0.5 text-[11px] font-bold text-white">
                  <GraduationCap className="h-3 w-3 text-amber-400" />
                  {item.grade_level || 'Grade 10'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                  <Layers className="h-3 w-3 text-emerald-600" />
                  Section {item.section}
                </span>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-500">
                {item.time}
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">{item.subject}</h3>
              <p className="text-xs text-slate-500">{item.day || 'Monday - Friday'}</p>
            </div>

            <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <UserCheck className="h-3.5 w-3.5 text-emerald-700" />
                <span>{item.teacher}</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-emerald-800">
                <MapPin className="h-3.5 w-3.5" />
                <span>{item.room}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Send Official Schedule File to Teachers Modal */}
      <Modal
        isOpen={isSendFileModalOpen}
        onClose={() => setIsSendFileModalOpen(false)}
        title="Send Official Schedule File to Teachers"
        subtitle="Upload the official faculty class program file (PDF, Word, Excel, or Image) so teachers can view, print, or download it"
        maxWidth="lg"
      >
        <form onSubmit={handleSendScheduleFileToTeachers} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Schedule Document Title
            </label>
            <input
              type="text"
              required
              value={fileForm.title}
              onChange={(e) => setFileForm({ ...fileForm, title: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                School Year
              </label>
              <input
                type="text"
                required
                value={fileForm.schoolYear}
                onChange={(e) => setFileForm({ ...fileForm, schoolYear: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Semester / Term
              </label>
              <input
                type="text"
                required
                value={fileForm.semester}
                onChange={(e) => setFileForm({ ...fileForm, semester: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {/* File Upload Zone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Attach Official Schedule File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 p-4 text-center hover:bg-emerald-50 transition-all cursor-pointer"
            >
              <Upload className="mx-auto h-6 w-6 text-emerald-700 mb-1" />
              {fileForm.fileName ? (
                <div>
                  <p className="text-xs font-extrabold text-emerald-900">
                    {fileForm.fileName} ({fileForm.fileSize})
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Click to replace schedule file
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Click to select Faculty Schedule File (PDF, DOCX, XLSX, PNG)
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Or send the generated Official Faculty Class Program PDF
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recipient Faculty Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Target Faculty Recipients
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFileForm({ ...fileForm, recipientType: 'all' })}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                  fileForm.recipientType === 'all'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Faculty Teachers
              </button>
              <button
                type="button"
                onClick={() => setFileForm({ ...fileForm, recipientType: 'selected' })}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                  fileForm.recipientType === 'selected'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Specific Teacher(s) ({fileForm.selectedTeachers.length})
              </button>
            </div>

            {fileForm.recipientType === 'selected' && (
              <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2.5 grid grid-cols-2 gap-1.5">
                {INITIAL_PLSNHS_TEACHERS.map((t) => {
                  const fullName = `${t.first_name} ${t.last_name}`;
                  const checked = fileForm.selectedTeachers.includes(fullName);
                  return (
                    <label
                      key={t.id}
                      className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTeacherRecipient(fullName)}
                        className="rounded text-emerald-700"
                      />
                      <span className="truncate">{fullName}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Admin Memo / Instructions
            </label>
            <textarea
              rows={2}
              value={fileForm.notes}
              onChange={(e) => setFileForm({ ...fileForm, notes: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsSendFileModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              Send Schedule File to Teacher(s)
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Timetable Slot Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Class Schedule Slot"
        subtitle="Assign subject, Year Level, Section, room, and teacher"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subject</label>
            <input
              type="text"
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Year Level
              </label>
              <select
                value={form.grade_level}
                onChange={(e) => setForm({ ...form, grade_level: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Section</label>
              <input
                type="text"
                required
                value={form.section}
                onChange={(e) => setForm({ ...form, section: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Teacher</label>
              <input
                type="text"
                required
                value={form.teacher}
                onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Room</label>
              <input
                type="text"
                required
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
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
              Save Schedule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
