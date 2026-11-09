import React, { useState, useEffect } from 'react';
import {
  Layers,
  Users,
  BookOpen,
  MapPin,
  GraduationCap,
  UserCheck,
  FileText,
  Send,
  Upload,
  Printer,
  Download,
  CheckSquare,
  Square,
  CheckCircle2,
  FileSpreadsheet,
  Calendar,
  Clock,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { Badge } from '../../components/common/Badge';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import type { Student } from '../../types';

export interface SentScheduleSlot {
  time: string;
  subject: string;
  code: string;
  room: string;
  teacher: string;
  day: string;
  isBreak?: boolean;
}

export interface SentScheduleRecord {
  id: string;
  grade_level: string;
  section: string;
  strand?: string | null;
  teacher_name: string;
  title: string;
  note: string;
  file_name: string;
  file_data_url?: string | null;
  file_size?: string;
  recipient_mode: 'all' | 'selected';
  recipient_count: number;
  recipient_names: string[];
  recipient_ids: (string | number)[];
  sent_at: string;
  slots: SentScheduleSlot[];
}

export const SENT_SCHEDULES_STORAGE_KEY = 'plsnhs_sent_schedules_v1';
const LOCAL_BROADCAST_KEY = 'plsnhs_broadcast_notifications_v1';

interface TeachingClassItem {
  id: string;
  grade_level: string;
  name: string;
  subject: string;
  strand?: string | null;
  count: number;
  room: string;
  time: string;
  isAdvisory?: boolean;
}

const DEFAULT_CLASSES: TeachingClassItem[] = [
  {
    id: 'sec-1',
    grade_level: 'Grade 10',
    name: 'Generosity',
    subject: 'General Mathematics',
    strand: null,
    count: 42,
    room: 'Rm 201 • Bldg A',
    time: '07:30 AM – 08:30 AM',
    isAdvisory: true,
  },
  {
    id: 'sec-2',
    grade_level: 'Grade 10',
    name: 'Wisdom',
    subject: 'Pre-Calculus (Specialized)',
    strand: null,
    count: 45,
    room: 'Math Lab • Bldg A',
    time: '08:30 AM – 09:30 AM',
  },
  {
    id: 'sec-3',
    grade_level: 'Grade 10',
    name: 'Perseverance',
    subject: 'Mathematics 10',
    strand: null,
    count: 39,
    room: 'Rm 105 • JHS Bldg',
    time: '10:00 AM – 11:00 AM',
  },
  {
    id: 'sec-4',
    grade_level: 'Grade 10',
    name: 'Kindness',
    subject: 'Statistics & Probability',
    strand: null,
    count: 40,
    room: 'Rm 304 • SHS Bldg',
    time: '01:00 PM – 02:00 PM',
  },
  {
    id: 'sec-5',
    grade_level: 'Grade 10',
    name: 'Honesty',
    subject: 'Practical Research 1',
    strand: null,
    count: 38,
    room: 'Rm 204 • Bldg B',
    time: '02:00 PM – 03:00 PM',
  },
  {
    id: 'sec-6',
    grade_level: 'Grade 11',
    name: 'Baltazar',
    subject: 'General Mathematics',
    strand: 'STEM',
    count: 41,
    room: 'Rm 108 • JHS Bldg',
    time: '03:00 PM – 04:00 PM',
  },
];

export function buildSectionScheduleSlots(
  gradeLevel: string,
  sectionName: string,
  roomName: string,
  teacherName: string
): SentScheduleSlot[] {
  return [
    {
      time: '07:30 AM – 08:30 AM',
      subject: 'General Mathematics / Mathematics',
      code: 'MATH-101',
      room: roomName || 'Bldg A, Rm 201',
      teacher: teacherName || 'Ryan Quiroga',
      day: 'Monday – Friday',
    },
    {
      time: '08:30 AM – 09:30 AM',
      subject: 'English for Academic Purposes / English',
      code: 'ENG-102',
      room: roomName || 'Bldg A, Rm 201',
      teacher: 'Mrs. Generale',
      day: 'Monday – Friday',
    },
    {
      time: '09:30 AM – 10:00 AM',
      subject: 'Morning Recess & Health Break',
      code: 'RECESS',
      room: 'Campus Canteen',
      teacher: '—',
      day: 'Monday – Friday',
      isBreak: true,
    },
    {
      time: '10:00 AM – 11:00 AM',
      subject: 'Earth & Life Science / Integrated Science',
      code: 'SCI-103',
      room: 'Science Lab 1',
      teacher: 'Mrs. Tapasao',
      day: 'Monday – Friday',
    },
    {
      time: '11:00 AM – 12:00 PM',
      subject: 'Filipino / Komunikasyon at Pananaliksik',
      code: 'FIL-104',
      room: roomName || 'Bldg A, Rm 201',
      teacher: 'Mrs. Llanda',
      day: 'Monday – Friday',
    },
    {
      time: '12:00 PM – 01:00 PM',
      subject: 'Noon Lunch Break',
      code: 'LUNCH',
      room: '—',
      teacher: '—',
      day: 'Monday – Friday',
      isBreak: true,
    },
    {
      time: '01:00 PM – 02:00 PM',
      subject: 'Araling Panlipunan / Understanding Culture & Society',
      code: 'AP-105',
      room: roomName || 'Bldg A, Rm 201',
      teacher: 'Mr. Rodriguez',
      day: 'Monday – Friday',
    },
    {
      time: '02:00 PM – 03:00 PM',
      subject: `${gradeLevel} Homeroom & TLE / Specialization (${sectionName})`,
      code: 'SPEC-106',
      room: roomName || 'Bldg A, Rm 201',
      teacher: teacherName || 'Ryan Quiroga',
      day: 'Monday – Friday',
    },
  ];
}

export function printScheduleSheet(record: SentScheduleRecord, studentLabel?: string) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    window.print();
    return;
  }

  const rowsHtml = record.slots
    .map(
      (s) => `
      <tr style="${s.isBreak ? 'background:#fffbeb;color:#92400e;' : ''}">
        <td style="padding:10px 12px;border:1px solid #cbd5e1;font-weight:700;white-space:nowrap;">${s.time}</td>
        <td style="padding:10px 12px;border:1px solid #cbd5e1;font-family:monospace;font-weight:700;color:#1e3a8a;">${s.code}</td>
        <td style="padding:10px 12px;border:1px solid #cbd5e1;font-weight:700;">${s.subject}</td>
        <td style="padding:10px 12px;border:1px solid #cbd5e1;">${s.day}</td>
        <td style="padding:10px 12px;border:1px solid #cbd5e1;">${s.room}</td>
        <td style="padding:10px 12px;border:1px solid #cbd5e1;font-weight:600;">${s.teacher}</td>
      </tr>`
    )
    .join('');

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${record.title}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 32px; }
          .header { text-align: center; border-bottom: 3px double #1B2A4A; padding-bottom: 14px; margin-bottom: 20px; }
          .header h4 { margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #475569; }
          .header h1 { margin: 4px 0; font-size: 20px; color: #1B2A4A; }
          .header p { margin: 2px 0; font-size: 12px; color: #334155; font-weight: 600; }
          .meta { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 18px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #1B2A4A; color: #ffffff; text-transform: uppercase; font-size: 10.5px; letter-spacing: 0.5px; padding: 10px 12px; border: 1px solid #1B2A4A; text-align: left; }
          .footer { margin-top: 36px; display: flex; justify-content: space-between; font-size: 12px; }
          .sig { text-align: center; width: 220px; }
          .sig-line { border-top: 1px solid #0f172a; margin-top: 36px; padding-top: 4px; font-weight: 700; }
        </style>
      </head>
      <body>
        <div class="header">
          <h4>Republic of the Philippines • Department of Education • Region VII</h4>
          <h1>PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL</h1>
          <p>Langtad, City of Naga, Cebu • Official Student Class Schedule (S.Y. 2026–2027)</p>
        </div>
        <div class="meta">
          <div>
            <div><strong>Year Level & Section:</strong> ${record.grade_level} – Section ${record.section}${record.strand ? ` (${record.strand})` : ''}</div>
            <div style="margin-top:4px;"><strong>Learner / Recipient:</strong> ${studentLabel || (record.recipient_mode === 'all' ? `All Enrolled Learners (${record.recipient_count})` : record.recipient_names.join(', '))}</div>
          </div>
          <div style="text-align:right;">
            <div><strong>Issued By:</strong> ${record.teacher_name}</div>
            <div style="margin-top:4px;"><strong>Date Issued:</strong> ${new Date(record.sent_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
          </div>
        </div>
        ${record.note ? `<div style="margin-bottom:14px;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;font-size:12px;"><strong>Adviser / Teacher Note:</strong> ${record.note}</div>` : ''}
        <table>
          <thead>
            <tr>
              <th>Time Period</th>
              <th>Code</th>
              <th>Learning Area / Subject</th>
              <th>Days</th>
              <th>Room</th>
              <th>Subject Teacher</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="footer">
          <div class="sig">
            <div class="sig-line">${record.teacher_name}</div>
            <div style="color:#64748b;font-size:11px;">Class Adviser / Subject Teacher</div>
          </div>
          <div class="sig">
            <div class="sig-line">School Registrar</div>
            <div style="color:#64748b;font-size:11px;">Placido L. Señor NHS</div>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `);
  win.document.close();
}

export function downloadScheduleFile(record: SentScheduleRecord) {
  if (record.file_data_url) {
    const a = document.createElement('a');
    a.href = record.file_data_url;
    a.download = record.file_name || `PLSNHS_Schedule_${record.section}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // Generate downloadable official HTML/Doc printable schedule file
  const rowsCsv = [
    ['Time Period', 'Subject Code', 'Learning Area / Subject', 'Schedule Days', 'Room Assignment', 'Subject Teacher'],
    ...record.slots.map((s) => [s.time, s.code, s.subject, s.day, s.room, s.teacher]),
  ]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([rowsCsv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download =
    record.file_name && record.file_name.endsWith('.csv')
      ? record.file_name
      : `PLSNHS_${record.grade_level.replace(/\s+/g, '')}_Section_${record.section}_Schedule.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const TeacherClassesPage: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<TeachingClassItem[]>(DEFAULT_CLASSES);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sent schedules history
  const [sentSchedules, setSentSchedules] = useState<SentScheduleRecord[]>(() => {
    try {
      const saved = localStorage.getItem(SENT_SCHEDULES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'sched-default-1',
        grade_level: 'Grade 10',
        section: 'Generosity',
        strand: null,
        teacher_name: 'Ryan Quiroga',
        title: 'Official Class Schedule — Grade 10 Section Generosity (S.Y. 2026–2027)',
        note: 'Please print or download a copy of your official class timetable for S.Y. 2026–2027.',
        file_name: 'PLSNHS_Grade10_Generosity_Class_Schedule.csv',
        file_size: '24 KB',
        recipient_mode: 'all',
        recipient_count: 42,
        recipient_names: ['All Grade 10 - Generosity Students'],
        recipient_ids: [],
        sent_at: new Date().toISOString(),
        slots: buildSectionScheduleSlots('Grade 10', 'Generosity', 'Rm 201 • Bldg A', 'Ryan Quiroga'),
      },
    ];
  });

  // Send Schedule Modal State
  const [activeClassForSchedule, setActiveClassForSchedule] = useState<TeachingClassItem | null>(null);
  const [recipientMode, setRecipientMode] = useState<'all' | 'selected'>('all');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string | number>>(new Set());
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleNote, setScheduleNote] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState('');
  const [uploadedFileDataUrl, setUploadedFileDataUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function loadTeacherSections() {
      try {
        const [{ data: secData }, { data: stData }] = await Promise.all([
          supabase.from('sections').select('*').order('grade_level', { ascending: true }),
          supabase.from('students').select('*').order('last_name', { ascending: true }),
        ]);

        if (stData && stData.length > 0) {
          setAllStudents(stData);
        }

        if (secData && secData.length > 0) {
          const teacherName = (user?.full_name || '').toLowerCase().trim();
          const countBySectionId = new Map<string, number>();
          const countBySectionName = new Map<string, number>();

          (stData || []).forEach((s: any) => {
            if (s.section_id) {
              const k = String(s.section_id);
              countBySectionId.set(k, (countBySectionId.get(k) || 0) + 1);
            }
            if (s.section) {
              const k = String(s.section).toLowerCase();
              countBySectionName.set(k, (countBySectionName.get(k) || 0) + 1);
            }
          });

          const matchedAdvisory = secData.filter((sec: any) => {
            const adv = String(sec.adviser_name || '').toLowerCase();
            return teacherName && adv && (adv.includes(teacherName) || teacherName.includes(adv));
          });

          const baseSections =
            matchedAdvisory.length > 0
              ? [
                  ...matchedAdvisory,
                  ...secData
                    .filter((s: any) => !matchedAdvisory.some((m: any) => m.id === s.id))
                    .slice(0, Math.max(0, 6 - matchedAdvisory.length)),
                ]
              : secData.slice(0, 6);

          const subjects = [
            'General Mathematics',
            'Pre-Calculus (Specialized)',
            'Mathematics 10',
            'Statistics & Probability',
            'Practical Research 1',
            'Mathematics 9',
          ];
          const times = [
            '07:30 AM – 08:30 AM',
            '08:30 AM – 09:30 AM',
            '10:00 AM – 11:00 AM',
            '01:00 PM – 02:00 PM',
            '02:00 PM – 03:00 PM',
            '03:00 PM – 04:00 PM',
          ];
          const rooms = [
            'Rm 201 • Bldg A',
            'Math Lab • Bldg A',
            'Rm 105 • JHS Bldg',
            'Rm 304 • SHS Bldg',
            'Rm 204 • Bldg B',
            'Rm 108 • JHS Bldg',
          ];

          setClasses(
            baseSections.map((sec: any, idx: number) => {
              const gradeNum =
                parseInt(String(sec.grade_level || '10').replace(/\D/g, ''), 10) || 10;
              const count =
                countBySectionId.get(String(sec.id)) ||
                countBySectionName.get(String(sec.name || '').toLowerCase()) ||
                [42, 45, 39, 40, 38, 41][idx % 6];

              return {
                id: String(sec.id || `sec-${idx}`),
                grade_level: sec.grade_level || 'Grade 10',
                name: sec.name || 'Wisdom',
                subject: subjects[idx % subjects.length],
                strand: gradeNum >= 11 ? sec.strand || 'STEM' : null,
                count,
                room: sec.room || rooms[idx % rooms.length],
                time: times[idx % times.length],
                isAdvisory: matchedAdvisory.some((m: any) => m.id === sec.id) || idx === 0,
              };
            })
          );
        }
      } catch (err) {
        console.warn('Error loading teacher classes:', err);
      }
    }

    loadTeacherSections();
  }, [user?.full_name]);

  // Students belonging to the currently selected section modal
  const sectionStudents = React.useMemo(() => {
    if (!activeClassForSchedule) return [];
    const matched = allStudents.filter(
      (s) =>
        String((s as any).section_id) === String(activeClassForSchedule.id) ||
        String(s.section || '').toLowerCase() === activeClassForSchedule.name.toLowerCase()
    );
    if (matched.length > 0) return matched;
    return allStudents.slice(0, 12);
  }, [activeClassForSchedule, allStudents]);

  const handleOpenSendSchedule = (cls: TeachingClassItem) => {
    setActiveClassForSchedule(cls);
    setRecipientMode('all');
    setSelectedStudentIds(new Set());
    setScheduleTitle(
      `Official Class Schedule — ${cls.grade_level} Section ${cls.name} (S.Y. 2026–2027)`
    );
    setScheduleNote(
      `Attached is your official class schedule for ${cls.grade_level} - Section ${cls.name}. You may print it out or download a copy for your reference.`
    );
    setUploadedFileName(
      `PLSNHS_${cls.grade_level.replace(/\s+/g, '')}_Section_${cls.name}_Schedule.csv`
    );
    setUploadedFileSize('24 KB (Official Timetable)');
    setUploadedFileDataUrl(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setUploadedFileSize(`${Math.max(1, Math.round(file.size / 1024))} KB`);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadedFileDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleSelectStudent = (id: string | number) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSendScheduleToStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClassForSchedule) return;

    if (recipientMode === 'selected' && selectedStudentIds.size === 0) {
      setNotice({
        type: 'error',
        message: 'Please select at least one student to receive the schedule file.',
      });
      return;
    }

    setSending(true);
    try {
      const teacherName = user?.full_name || 'Ryan Quiroga';
      const chosenStudents =
        recipientMode === 'all'
          ? sectionStudents
          : sectionStudents.filter((s) => selectedStudentIds.has(s.id));

      const recipientNames =
        recipientMode === 'all'
          ? [`All ${activeClassForSchedule.grade_level} - Section ${activeClassForSchedule.name} Students`]
          : chosenStudents.map((s) => `${s.last_name}, ${s.first_name}`);

      const slots = buildSectionScheduleSlots(
        activeClassForSchedule.grade_level,
        activeClassForSchedule.name,
        activeClassForSchedule.room,
        teacherName
      );

      let resolvedDocUrl = uploadedFileDataUrl;
      const targetFileName =
        uploadedFileName ||
        `PLSNHS_${activeClassForSchedule.grade_level.replace(/\s+/g, '')}_Section_${activeClassForSchedule.name}_Schedule.csv`;
      const fileNameLower = targetFileName.toLowerCase();

      let resolvedDocType = 'csv';
      if (fileNameLower.endsWith('.pdf') || (resolvedDocUrl && resolvedDocUrl.startsWith('data:application/pdf'))) {
        resolvedDocType = 'application/pdf';
      } else if (fileNameLower.match(/\.(jpe?g|png|webp|gif)$/) || (resolvedDocUrl && resolvedDocUrl.startsWith('data:image/'))) {
        resolvedDocType = 'image';
      } else {
        resolvedDocType = 'csv';
      }

      if (!resolvedDocUrl) {
        // Build downloadable CSV data url as default document attachment
        const rowsCsv = [
          ['Time Period', 'Subject Code', 'Learning Area / Subject', 'Schedule Days', 'Room Assignment', 'Subject Teacher'],
          ...slots.map((s) => [s.time, s.code, s.subject, s.day, s.room, s.teacher]),
        ]
          .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
          .join('\n');
        resolvedDocUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(rowsCsv)}`;
      }

      const newRecord: SentScheduleRecord = {
        id: `sched-${Date.now()}`,
        grade_level: activeClassForSchedule.grade_level,
        section: activeClassForSchedule.name,
        strand: activeClassForSchedule.strand,
        teacher_name: teacherName,
        title:
          scheduleTitle.trim() ||
          `Official Class Schedule — ${activeClassForSchedule.grade_level} Section ${activeClassForSchedule.name}`,
        note: scheduleNote.trim(),
        file_name: targetFileName,
        file_data_url: resolvedDocUrl,
        file_size: uploadedFileSize || '24 KB',
        recipient_mode: recipientMode,
        recipient_count:
          recipientMode === 'all' ? activeClassForSchedule.count : selectedStudentIds.size,
        recipient_names: recipientNames,
        recipient_ids: Array.from(selectedStudentIds),
        sent_at: new Date().toISOString(),
        slots,
      };

      const updatedList = [newRecord, ...sentSchedules];
      setSentSchedules(updatedList);
      try {
        localStorage.setItem(SENT_SCHEDULES_STORAGE_KEY, JSON.stringify(updatedList));
      } catch {
        // ignore quota errors
      }

      // Broadcast notification to students so they can click straight to /student/schedule to print or download
      try {
        const rawBroadcast = localStorage.getItem(LOCAL_BROADCAST_KEY);
        const existingBroadcast = rawBroadcast ? JSON.parse(rawBroadcast) : [];
        const notifEntry = {
          id: `sched_notif_${Date.now()}`,
          title: `📅 Class Schedule Sent: ${activeClassForSchedule.grade_level} – Section ${activeClassForSchedule.name}`,
          content: `${teacherName} sent your official class schedule file (${newRecord.file_name}). Open your Schedule page to print or download it.`,
          author: teacherName,
          priority: 'high',
          target_audience: 'students',
          created_at: new Date().toISOString(),
          action_url: '/student/schedule',
          action_label: 'Print / Download Schedule',
        };
        localStorage.setItem(
          LOCAL_BROADCAST_KEY,
          JSON.stringify([notifEntry, ...(Array.isArray(existingBroadcast) ? existingBroadcast : [])])
        );
        window.dispatchEvent(new Event('storage'));
      } catch {
        // ignore
      }

      // Best-effort update to Supabase sections table so students instantly see the official schedule
      try {
        if (activeClassForSchedule.id) {
          await supabase.from('sections').update({
            schedule_doc_url: resolvedDocUrl,
            schedule_doc_name: newRecord.file_name,
            schedule_doc_type: resolvedDocType,
            schedule_doc_uploaded_by: teacherName,
            schedule_doc_updated_at: new Date().toISOString(),
            shared_at: new Date().toISOString(),
            shared_by: teacherName,
          }).eq('id', activeClassForSchedule.id);
        }
      } catch (secErr) {
        console.warn('Section schedule update note:', secErr);
      }

      // Best-effort insert to Supabase notifications
      try {
        await supabase.from('notifications').insert([
          {
            title: `📅 Class Schedule File Sent (${activeClassForSchedule.grade_level} - ${activeClassForSchedule.name})`,
            message: `${teacherName} sent the class schedule file "${newRecord.file_name}". You can now print or download it from your Schedule page.`,
            role: 'student',
            type: 'schedule',
            link: '/student/schedule',
          },
        ]);
      } catch {
        // ignore
      }

      // Record in activity_logs
      try {
        await supabase.from('activity_logs').insert([
          {
            role: 'teacher',
            action: 'Schedule Broadcasted',
            details: `${teacherName} distributed class schedule file "${newRecord.file_name}" to ${activeClassForSchedule.grade_level} - Section ${activeClassForSchedule.name}.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } catch {
        // ignore
      }

      setNotice({
        type: 'success',
        message: `Class schedule file "${newRecord.file_name}" sent to ${
          recipientMode === 'all'
            ? `all ${activeClassForSchedule.count} students in ${activeClassForSchedule.grade_level} - Section ${activeClassForSchedule.name}`
            : `${selectedStudentIds.size} selected student(s) in Section ${activeClassForSchedule.name}`
        }! Students can now print or download it from their Schedule page.`,
      });
      setActiveClassForSchedule(null);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] font-display tracking-tight">
            My Teaching Sections
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Enrolled learner rosters, subject schedules, and class schedule distribution for students to print or download.
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

      {/* Teaching Section Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {classes.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-md bg-[#1B2A4A] px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                    <GraduationCap className="h-3 w-3 text-[#F5C518]" />
                    {c.grade_level}
                  </span>
                  {c.strand && (
                    <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                      {c.strand}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {c.room}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900 font-display flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-[#1B2A4A]" />
                    Section {c.name}
                  </h3>
                  {c.isAdvisory && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                      Advisory
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-semibold mt-0.5">{c.subject}</p>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-700">{c.count} Enrolled Learners</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                  <span>{c.time} (Mon–Fri)</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              {/* Send Class Schedule File Button */}
              <button
                type="button"
                onClick={() => handleOpenSendSchedule(c)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 py-2.5 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send Schedule File to Students</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sent Class Schedule Files Log (Teacher can also Print or Download here) */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#1B2A4A]" />
            <h2 className="text-sm font-extrabold text-slate-900">
              Class Schedule Files Sent to Students
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            Students can print or download these schedules directly from their Student Portal
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Schedule Title & File</th>
                <th className="px-4 py-3">Year Level & Section</th>
                <th className="px-4 py-3">Recipients</th>
                <th className="px-4 py-3">Date Sent</th>
                <th className="px-5 py-3 text-right">Print / Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sentSchedules.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-slate-900">{item.title}</div>
                    <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5 mt-0.5">
                      <FileSpreadsheet className="h-3.5 w-3.5" />
                      <span>{item.file_name}</span>
                      {item.file_size && (
                        <span className="text-slate-400">({item.file_size})</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#1B2A4A] px-2 py-0.5 text-[10.5px] font-extrabold text-white mr-1.5">
                      {item.grade_level}
                    </span>
                    <span className="font-bold text-slate-800">Section {item.section}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant="success" size="sm">
                      {item.recipient_mode === 'all'
                        ? `All Section Learners (${item.recipient_count})`
                        : `${item.recipient_count} Selected Student(s)`}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                    {new Date(item.sent_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => printScheduleSheet(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
                      >
                        <Printer className="h-3.5 w-3.5 text-slate-500" />
                        Print
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadScheduleFile(item)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#1B2A4A] hover:bg-[#0f1c3f] px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 text-[#F5C518]" />
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Send Class Schedule File to Students */}
      <Modal
        isOpen={Boolean(activeClassForSchedule)}
        onClose={() => setActiveClassForSchedule(null)}
        title={
          activeClassForSchedule
            ? `Send Class Schedule — ${activeClassForSchedule.grade_level} Section ${activeClassForSchedule.name}`
            : 'Send Class Schedule'
        }
        subtitle="Upload or send the official class schedule file to your students so they can print or download it"
        maxWidth="lg"
      >
        {activeClassForSchedule && (
          <form onSubmit={handleSendScheduleToStudents} className="space-y-4">
            {/* Schedule Title */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Schedule Document Title *
              </label>
              <input
                type="text"
                required
                value={scheduleTitle}
                onChange={(e) => setScheduleTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Attach Schedule File (PDF, Image, Excel, CSV, Word) */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Attach Schedule File (PDF, Image, Excel, Word, or use Official Generated Timetable)
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1B2A4A] text-[#F5C518]">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {uploadedFileName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {uploadedFileSize} • Ready for students to print or download
                    </p>
                  </div>
                </div>

                <label className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 cursor-pointer shrink-0 shadow-2xs">
                  <Upload className="h-3.5 w-3.5 text-[#1B2A4A]" />
                  <span>Choose Schedule File</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Choose Recipients: All Students in Section OR Specific Students */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                Select Student Recipients
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setRecipientMode('all')}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs font-bold transition-all cursor-pointer ${
                    recipientMode === 'all'
                      ? 'border-[#1B2A4A] bg-[#1B2A4A] text-white shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>All Students in Section {activeClassForSchedule.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      recipientMode === 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {activeClassForSchedule.count} Learners
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientMode('selected')}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs font-bold transition-all cursor-pointer ${
                    recipientMode === 'selected'
                      ? 'border-[#1B2A4A] bg-[#1B2A4A] text-white shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>Select Specific Students</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                      recipientMode === 'selected'
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {selectedStudentIds.size} Selected
                  </span>
                </button>
              </div>

              {recipientMode === 'selected' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 max-h-44 overflow-y-auto space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pb-1 border-b border-slate-200">
                    <span>Click students to receive the schedule file:</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedStudentIds.size === sectionStudents.length) {
                          setSelectedStudentIds(new Set());
                        } else {
                          setSelectedStudentIds(new Set(sectionStudents.map((s) => s.id)));
                        }
                      }}
                      className="text-[#1B2A4A] hover:underline cursor-pointer"
                    >
                      {selectedStudentIds.size === sectionStudents.length
                        ? 'Clear All'
                        : 'Select All'}
                    </button>
                  </div>
                  {sectionStudents.map((st) => {
                    const isChecked = selectedStudentIds.has(st.id);
                    return (
                      <div
                        key={st.id}
                        onClick={() => toggleSelectStudent(st.id)}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50 text-[#1B2A4A] font-bold'
                            : 'hover:bg-white text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-[#1B2A4A]" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-400" />
                          )}
                          <span>
                            {st.last_name}, {st.first_name}
                          </span>
                        </div>
                        <span className="font-mono text-[10.5px] text-slate-400">
                          LRN: {st.lrn || '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Teacher Note / Instructions */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Instructions / Note to Students
              </label>
              <textarea
                rows={2}
                value={scheduleNote}
                onChange={(e) => setScheduleNote(e.target.value)}
                placeholder="e.g., Please print or download your class schedule for S.Y. 2026–2027..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  const previewRecord: SentScheduleRecord = {
                    id: 'preview',
                    grade_level: activeClassForSchedule.grade_level,
                    section: activeClassForSchedule.name,
                    strand: activeClassForSchedule.strand,
                    teacher_name: user?.full_name || 'Ryan Quiroga',
                    title: scheduleTitle,
                    note: scheduleNote,
                    file_name: uploadedFileName,
                    file_data_url: uploadedFileDataUrl,
                    recipient_mode: recipientMode,
                    recipient_count: activeClassForSchedule.count,
                    recipient_names: [],
                    recipient_ids: [],
                    sent_at: new Date().toISOString(),
                    slots: buildSectionScheduleSlots(
                      activeClassForSchedule.grade_level,
                      activeClassForSchedule.name,
                      activeClassForSchedule.room,
                      user?.full_name || 'Ryan Quiroga'
                    ),
                  };
                  printScheduleSheet(previewRecord);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-slate-500" />
                <span>Preview / Print</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveClassForSchedule(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{sending ? 'Sending...' : 'Send Schedule to Students'}</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
