import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Layers,
  GraduationCap,
  FileText,
  Download,
  Printer,
  Eye,
  ShieldCheck,
  BookOpen,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

export interface AdminSentTeacherScheduleFile {
  id: string;
  title: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  fileDataUrl?: string;
  schoolYear: string;
  semester: string;
  recipientType: 'all' | 'selected';
  recipientTeacherNames: string[];
  sentBy: string;
  sentAt: string;
  notes?: string;
}

export const ADMIN_TEACHER_SCHEDULE_FILES_KEY = 'plshs_admin_teacher_schedule_files_v1';

export const DEFAULT_ADMIN_TEACHER_SCHEDULE_FILES: AdminSentTeacherScheduleFile[] = [
  {
    id: 'adm-sched-101',
    title: 'Official Faculty Teaching Load & Class Program (S.Y. 2026–2027)',
    fileName: 'PLSNHS_Official_Faculty_Class_Program_SY2026-2027.pdf',
    fileSize: '465 KB',
    fileType: 'PDF',
    schoolYear: 'S.Y. 2026–2027',
    semester: '1st & 2nd Semester',
    recipientType: 'all',
    recipientTeacherNames: ['All Faculty Teachers'],
    sentBy: 'School Administrator • Office of the Principal',
    sentAt: 'Oct 28, 2026 • 08:30 AM',
    notes:
      'Approved individual teaching loads, room assignments, and advisory class designations pursuant to DepEd Order No. 31, s. 2012 and Civil Service Magna Carta for Public School Teachers.',
  },
  {
    id: 'adm-sched-102',
    title: 'DepEd School Form 7 (SF7) — School Personnel Assignment List & Basic Profile',
    fileName: 'DepEd_SF7_Faculty_Schedule_Matrix_2026.pdf',
    fileSize: '612 KB',
    fileType: 'PDF',
    schoolYear: 'S.Y. 2026–2027',
    semester: 'Full Academic Year',
    recipientType: 'all',
    recipientTeacherNames: ['All Faculty Teachers'],
    sentBy: 'School Registrar & Admin Office',
    sentAt: 'Oct 25, 2026 • 02:15 PM',
    notes:
      'Master timetable of Junior High School (Grades 7–10) and Senior High School (Grades 11–12) teaching periods and room allocations.',
  },
];

interface TeachingLoadSlot {
  period: string;
  days: string;
  subject: string;
  grade_level: string;
  section: string;
  strand?: string;
  room: string;
  role: 'Advisory & Subject Load' | 'Subject Load';
}

const OFFICIAL_TEACHING_LOADS: TeachingLoadSlot[] = [
  {
    period: '07:30 AM – 08:30 AM',
    days: 'Monday – Friday',
    subject: 'General Mathematics',
    grade_level: 'Grade 10',
    section: 'Generosity',
    room: 'Rm 201 • Bldg A',
    role: 'Advisory & Subject Load',
  },
  {
    period: '08:30 AM – 09:30 AM',
    days: 'Monday – Friday',
    subject: 'Pre-Calculus (Specialized)',
    grade_level: 'Grade 10',
    section: 'Wisdom',
    room: 'Math Lab • Bldg A',
    role: 'Subject Load',
  },
  {
    period: '10:00 AM – 11:00 AM',
    days: 'Monday – Friday',
    subject: 'Mathematics 10',
    grade_level: 'Grade 10',
    section: 'Perseverance',
    room: 'Rm 105 • JHS Bldg',
    role: 'Subject Load',
  },
  {
    period: '01:00 PM – 02:00 PM',
    days: 'Monday – Friday',
    subject: 'Statistics & Probability',
    grade_level: 'Grade 10',
    section: 'Kindness',
    room: 'Rm 304 • SHS Bldg',
    role: 'Subject Load',
  },
  {
    period: '02:00 PM – 03:00 PM',
    days: 'Monday – Friday',
    subject: 'Practical Research 1',
    grade_level: 'Grade 10',
    section: 'Honesty',
    room: 'Rm 204 • Bldg B',
    role: 'Subject Load',
  },
  {
    period: '03:00 PM – 04:00 PM',
    days: 'Monday – Friday',
    subject: 'Calculus & Analytics',
    grade_level: 'Grade 11',
    section: 'Baltazar',
    strand: 'STEM',
    room: 'Rm 108 • SHS Bldg',
    role: 'Subject Load',
  },
];

export const TeacherClassProgramPage: React.FC = () => {
  const { user } = useAuth();
  const teacherName = user?.full_name || 'Ryan Quiroga';

  const [adminFiles, setAdminFiles] = useState<AdminSentTeacherScheduleFile[]>(() => {
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

  const [previewFile, setPreviewFile] = useState<AdminSentTeacherScheduleFile | null>(null);

  useEffect(() => {
    const handleStorage = () => {
      try {
        const saved = localStorage.getItem(ADMIN_TEACHER_SCHEDULE_FILES_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAdminFiles(parsed);
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Filter schedule files sent to all teachers or specifically to this logged-in teacher
  const myReceivedScheduleFiles = adminFiles.filter((file) => {
    if (file.recipientType === 'all') return true;
    return file.recipientTeacherNames.some(
      (name) =>
        name.toLowerCase().includes(teacherName.toLowerCase().split(' ')[0]) ||
        teacherName.toLowerCase().includes(name.toLowerCase().split(' ')[0])
    );
  });

  // Download either the uploaded dataURL from Admin or generate an official printable HTML/Document download
  const handleDownloadScheduleFile = (file: AdminSentTeacherScheduleFile) => {
    if (file.fileDataUrl) {
      const a = document.createElement('a');
      a.href = file.fileDataUrl;
      a.download = file.fileName || 'Official_Teacher_Schedule.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const rowsHtml = OFFICIAL_TEACHING_LOADS.map(
      (slot, idx) => `
        <tr>
          <td style="padding:10px;border:1px solid #cbd5e1;text-align:center;">${idx + 1}</td>
          <td style="padding:10px;border:1px solid #cbd5e1;font-weight:bold;">${slot.period}</td>
          <td style="padding:10px;border:1px solid #cbd5e1;">${slot.days}</td>
          <td style="padding:10px;border:1px solid #cbd5e1;font-weight:bold;color:#065f46;">${slot.subject}</td>
          <td style="padding:10px;border:1px solid #cbd5e1;font-weight:bold;">${slot.grade_level} • Section ${slot.section}${slot.strand ? ` (${slot.strand})` : ''}</td>
          <td style="padding:10px;border:1px solid #cbd5e1;">${slot.room}</td>
          <td style="padding:10px;border:1px solid #cbd5e1;">${slot.role}</td>
        </tr>`
    ).join('');

    const docHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${file.title} - ${teacherName}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 36px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; }
    .header h1 { margin: 4px 0; font-size: 18px; text-transform: uppercase; }
    .header p { margin: 2px 0; font-size: 12px; color: #475569; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 18px; font-size: 13px; background: #f8fafc; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
    th { background: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 11px; padding: 10px; border: 1px solid #0f172a; text-align: left; }
    .signoff { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <p>Republic of the Philippines • Department of Education</p>
    <h1>Placido L. Señor National High School</h1>
    <p><strong>${file.title}</strong> (${file.schoolYear} • ${file.semester})</p>
  </div>
  <div class="meta">
    <div>
      <p><strong>Faculty Name:</strong> ${teacherName}</p>
      <p><strong>Issued By:</strong> ${file.sentBy}</p>
    </div>
    <div>
      <p><strong>Date Issued:</strong> ${file.sentAt}</p>
      <p><strong>Total Teaching Load:</strong> 24 Instructional Hours / Week (Full-Time Regular)</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Time Period</th>
        <th>Days</th>
        <th>Subject / Learning Area</th>
        <th>Year Level & Section</th>
        <th>Room Assignment</th>
        <th>Designation</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <div class="signoff">
    <div>
      <p><strong>Conformed by Faculty:</strong></p>
      <br />
      <p><u><strong>${teacherName.toUpperCase()}</strong></u><br />Faculty Teacher</p>
    </div>
    <div>
      <p><strong>Approved & Issued by Administration:</strong></p>
      <br />
      <p><u><strong>OFFICE OF THE SCHOOL PRINCIPAL</strong></u><br />Placido L. Señor National High School</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([docHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.fileName.replace(/\.pdf$/i, '') + '.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 sm:pr-12">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            Faculty Teaching Program &amp; Workload
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            View, print, or download your official teaching schedule files issued by the School Administrator.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all cursor-pointer shrink-0"
        >
          <Printer className="h-4 w-4 text-slate-500" />
          Print Class Program
        </button>
      </div>

      {/* Official Schedule Files Received from School Admin */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-slate-50 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/70 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 font-display">
                  Official Teaching Schedule Files from Admin
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                  <ShieldCheck className="h-3 w-3 text-emerald-700" />
                  Admin Verified
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Official class program documents sent to you by the School Administration / Office of the Principal.
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs w-fit">
            <Building2 className="h-3.5 w-3.5 text-emerald-700" />
            Recipient: {teacherName}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {myReceivedScheduleFiles.map((file) => (
            <div
              key={file.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[#0f172a] px-2.5 py-1 text-[10px] font-bold text-white">
                    <Calendar className="h-3 w-3 text-amber-400" />
                    {file.schoolYear} • {file.semester}
                  </span>
                  <Badge variant="emerald" size="sm">
                    {file.fileType || 'PDF'} FILE
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 font-display">
                    {file.title}
                  </h3>
                  <p className="text-[11px] font-medium text-emerald-800 mt-0.5">
                    Issued by: {file.sentBy} • {file.sentAt}
                  </p>
                </div>

                {/* Attached File Pill */}
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800" title={file.fileName}>
                      {file.fileName}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {file.fileSize} • Official Admin Schedule Attachment
                    </p>
                  </div>
                </div>

                {file.notes && (
                  <p className="text-xs text-slate-600 leading-relaxed">{file.notes}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setPreviewFile(file)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 text-emerald-700" />
                  Preview File
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadScheduleFile(file)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800 transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download File
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DepEd Instructional Workload Compliance Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Total Instructional Load: 24 Teaching Hours / Week (6 Assigned Sections)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified by School Administration • Compliant with DepEd Civil Service Magna Carta for Public School Teachers (RA 4670).
            </p>
          </div>
        </div>
        <span className="rounded-xl bg-[#0f172a] px-3.5 py-1.5 text-xs font-bold text-white w-fit shrink-0">
          Full-Time Regular Faculty
        </span>
      </div>

      {/* Structured Timetable Matrix Organized by Year Level & Section */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-700" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Assigned Teaching Timetable (By Year Level &amp; Section)
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            Synced from Admin Schedule File ({myReceivedScheduleFiles[0]?.fileName})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5 w-12 text-center text-slate-400">#</th>
                <th className="px-4 py-3.5">Time Period &amp; Days</th>
                <th className="px-4 py-3.5">Subject / Learning Area</th>
                <th className="px-4 py-3.5">Year Level &amp; Section</th>
                <th className="px-4 py-3.5">Room Assignment</th>
                <th className="px-4 py-3.5 text-right">Faculty Designation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {OFFICIAL_TEACHING_LOADS.map((slot, index) => (
                <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 text-center font-mono text-[11px] text-slate-400">
                    {index + 1}
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-mono font-bold text-slate-900">{slot.period}</p>
                        <p className="text-[11px] text-slate-500">{slot.days}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-900 text-sm">{slot.subject}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#0f172a] px-2.5 py-1 text-[11px] font-bold text-white">
                        <GraduationCap className="h-3 w-3 text-amber-400" />
                        {slot.grade_level}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                        <Layers className="h-3 w-3 text-emerald-600" />
                        Section {slot.section}
                      </span>
                      {slot.strand && (
                        <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                          {slot.strand}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                      <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                      {slot.room}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    {slot.role === 'Advisory & Subject Load' ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-800">
                        Advisory &amp; Subject Teacher
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                        Subject Teacher
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Official Admin Schedule File Modal */}
      <Modal
        isOpen={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        title={previewFile ? previewFile.title : 'Official Faculty Schedule File'}
        subtitle={
          previewFile ? `Sent by ${previewFile.sentBy} • ${previewFile.sentAt}` : ''
        }
        maxWidth="2xl"
      >
        {previewFile && (
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-xs font-extrabold text-slate-900"
                    title={previewFile.fileName}
                  >
                    {previewFile.fileName}
                  </p>
                  <p className="truncate text-[11px] text-slate-600">
                    {previewFile.fileSize} • {previewFile.schoolYear} ({previewFile.semester})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadScheduleFile(previewFile)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 cursor-pointer whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            </div>

            {/* Document Preview Sheet */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 text-xs">
              <div className="text-center border-b border-slate-200 pb-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Republic of the Philippines • Department of Education
                </p>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase mt-0.5">
                  Placido L. Señor National High School
                </h4>
                <p className="text-[11px] font-bold text-emerald-800 mt-0.5">
                  OFFICIAL FACULTY CLASS PROGRAM — {teacherName.toUpperCase()}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-2.5 border border-slate-200 whitespace-nowrap">Time Period</th>
                      <th className="py-2 px-2.5 border border-slate-200">Subject</th>
                      <th className="py-2 px-2.5 border border-slate-200 whitespace-nowrap">Year Level &amp; Section</th>
                      <th className="py-2 px-2.5 border border-slate-200 whitespace-nowrap">Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {OFFICIAL_TEACHING_LOADS.map((slot, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2.5 border border-slate-200 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {slot.period}
                        </td>
                        <td className="py-1.5 px-2.5 border border-slate-200 font-bold text-slate-900">
                          {slot.subject}
                        </td>
                        <td className="py-1.5 px-2.5 border border-slate-200 font-bold text-emerald-800 whitespace-nowrap">
                          {slot.grade_level} • Section {slot.section}
                          {slot.strand ? ` (${slot.strand})` : ''}
                        </td>
                        <td className="py-1.5 px-2.5 border border-slate-200 text-slate-600 whitespace-nowrap">
                          {slot.room}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewFile.notes && (
                <p className="text-[11px] text-slate-500 italic border-t border-slate-100 pt-2 leading-snug">
                  Admin Memo: {previewFile.notes}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
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
