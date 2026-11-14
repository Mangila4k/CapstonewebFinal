import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import {
  Calendar,
  Send,
  Upload,
  FileText,
  CheckCircle2,
  Trash2,
  Download,
  Eye,
  Printer,
  Paperclip,
  ExternalLink,
  GraduationCap,
  Users,
  Check,
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
import {
  loadCachedTeachers,
  type FacultyRecord,
  INITIAL_PLSNHS_SECTIONS,
  SECTIONS_CACHE_KEY,
  type Section,
} from './AdminTeachersPage';
import { uploadAndAttachTeacherSchedule } from '../../lib/teacherScheduleService';

export const AdminCreateSchedulePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedTeacher = searchParams.get('teacher');

  const [isSendFileModalOpen, setIsSendFileModalOpen] = useState(false);
  const [viewingFile, setViewingFile] = useState<AdminSentTeacherScheduleFile | null>(null);
  const [teachersList, setTeachersList] = useState<FacultyRecord[]>(loadCachedTeachers);
  const [sectionsList, setSectionsList] = useState<Section[]>(() => {
    try {
      const raw = localStorage.getItem(SECTIONS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_PLSNHS_SECTIONS;
  });

  const [selectedYearLevelFilter, setSelectedYearLevelFilter] = useState<string>('all');
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
    targetGradeLevel: 'All Year Levels',
    recipientType: 'all' as 'all' | 'selected',
    selectedTeachers: [] as string[],
    notes:
      'Please review, download, or print your official teaching schedule and room assignments for S.Y. 2026–2027.',
    fileName: '',
    fileSize: '',
    fileType: 'PDF',
    fileDataUrl: '',
    rawFile: null as File | null,
  });

  // Handle pre-selected teacher from query param (e.g., from Teachers page "Send Schedule" action)
  useEffect(() => {
    if (preselectedTeacher) {
      setFileForm((prev) => ({
        ...prev,
        recipientType: 'selected',
        selectedTeachers: [preselectedTeacher],
      }));
      setIsSendFileModalOpen(true);
    }
  }, [preselectedTeacher]);

  // Sync teachers and sections dynamically from database
  useEffect(() => {
    supabase
      .from('users')
      .select('*')
      .eq('role', 'teacher')
      .then(({ data }) => {
        if (data && data.length > 0) {
          const mapped: FacultyRecord[] = data.map((u) => ({
            id: u.id,
            user_id: u.id,
            employee_id: u.employee_id || `PLSNHS-TCH-${u.id.slice(0, 6)}`,
            first_name: u.first_name || '',
            last_name: u.last_name || '',
            email: u.email || '',
            specialization: u.specialization || 'General Education',
            status: 'Active',
          }));
          setTeachersList(mapped);
        }
      });

    supabase
      .from('sections')
      .select('*')
      .order('grade_level', { ascending: true })
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSectionsList(data);
        }
      });
  }, []);

  const getTeacherYearLevelInfo = (t: FacultyRecord) => {
    const fullName = `${t.first_name} ${t.last_name}`.trim();
    const lowerName = fullName.toLowerCase();

    // 1. Check sections advisory
    const advSec = sectionsList.find((sec) => {
      if (sec.adviser_id && (sec.adviser_id === t.id || sec.adviser_id === t.user_id)) return true;
      if (sec.adviser_name && lowerName.includes(sec.adviser_name.toLowerCase())) return true;
      if (sec.adviser_name && sec.adviser_name.toLowerCase().includes(lowerName)) return true;
      return false;
    });

    if (advSec) {
      const isSHS = advSec.grade_level === 'Grade 11' || advSec.grade_level === 'Grade 12';
      return {
        yearLevel: advSec.grade_level,
        group: isSHS ? 'Grades 11 & 12 (SHS)' : advSec.grade_level,
        sectionName: advSec.name,
        badgeText: `${advSec.grade_level} • Section ${advSec.name}`,
      };
    }

    // 2. Check specialization
    const spec = (t.specialization || '').toLowerCase();
    if (spec.includes('grade 7')) return { yearLevel: 'Grade 7', group: 'Grade 7', badgeText: 'Grade 7 Faculty' };
    if (spec.includes('grade 8')) return { yearLevel: 'Grade 8', group: 'Grade 8', badgeText: 'Grade 8 Faculty' };
    if (spec.includes('grade 9')) return { yearLevel: 'Grade 9', group: 'Grade 9', badgeText: 'Grade 9 Faculty' };
    if (spec.includes('grade 10')) return { yearLevel: 'Grade 10', group: 'Grade 10', badgeText: 'Grade 10 Faculty' };
    if (spec.includes('grade 11') || spec.includes('grade 12') || spec.includes('senior') || spec.includes('shs')) {
      return { yearLevel: 'Grade 11/12', group: 'Grades 11 & 12 (SHS)', badgeText: 'Senior High School' };
    }

    // 3. Known teachers
    if (lowerName.includes('deguma')) return { yearLevel: 'Grade 8', group: 'Grade 8', badgeText: 'Grade 8 • Section Square' };
    if (lowerName.includes('quiroga') || lowerName.includes('maurin')) return { yearLevel: 'Grade 10', group: 'Grade 10', badgeText: 'Grade 10 Faculty' };
    if (lowerName.includes('santos')) return { yearLevel: 'Senior High', group: 'Grades 11 & 12 (SHS)', badgeText: 'Senior High Faculty' };

    return { yearLevel: 'General Faculty', group: 'General Faculty', badgeText: 'General Education' };
  };

  const teachersByYearLevel = useMemo(() => {
    const groups: Record<string, FacultyRecord[]> = {
      'Grade 7': [],
      'Grade 8': [],
      'Grade 9': [],
      'Grade 10': [],
      'Grades 11 & 12 (SHS)': [],
      'General Faculty': [],
    };

    teachersList.forEach((t) => {
      const info = getTeacherYearLevelInfo(t);
      if (groups[info.group]) {
        groups[info.group].push(t);
      } else {
        groups['General Faculty'].push(t);
      }
    });

    return groups;
  }, [teachersList, sectionsList]);

  const displayedTeachers = useMemo(() => {
    if (fileForm.targetGradeLevel === 'All Year Levels') {
      return teachersList;
    }
    return teachersByYearLevel[fileForm.targetGradeLevel] || teachersList;
  }, [fileForm.targetGradeLevel, teachersList, teachersByYearLevel]);

  const filteredScheduleFiles = useMemo(() => {
    if (selectedYearLevelFilter === 'all') return sentScheduleFiles;
    return sentScheduleFiles.filter((file) => {
      if (file.targetGradeLevel === selectedYearLevelFilter) return true;
      if (file.title.toLowerCase().includes(selectedYearLevelFilter.toLowerCase())) return true;
      if (file.recipientType === 'all') return true;
      return false;
    });
  }, [sentScheduleFiles, selectedYearLevelFilter]);

  const handleGradeLevelChange = (newGrade: string) => {
    let newTitle = fileForm.title;
    if (newGrade === 'All Year Levels') {
      newTitle = 'Official Faculty Teaching Load & Class Program (S.Y. 2026–2027)';
    } else {
      newTitle = `Official ${newGrade} Faculty Teaching Load & Class Program (S.Y. 2026–2027)`;
    }

    const targetTeachers =
      newGrade === 'All Year Levels'
        ? teachersList.map((t) => `${t.first_name} ${t.last_name}`.trim())
        : (teachersByYearLevel[newGrade] || []).map((t) => `${t.first_name} ${t.last_name}`.trim());

    setFileForm((prev) => ({
      ...prev,
      targetGradeLevel: newGrade,
      title: newTitle,
      selectedTeachers: targetTeachers,
      recipientType: newGrade === 'All Year Levels' ? 'all' : 'selected',
    }));
  };

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
        rawFile: file,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSendScheduleFileToTeachers = async (e: React.FormEvent) => {
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
      targetGradeLevel: fileForm.targetGradeLevel,
      recipientType: fileForm.recipientType,
      recipientTeacherNames:
        fileForm.recipientType === 'all'
          ? ['All Faculty Teachers']
          : fileForm.selectedTeachers.length > 0
          ? fileForm.selectedTeachers
          : ['All Faculty Teachers'],
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
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('plsnhs-schedule-files-updated'));
    } catch {
      // ignore
    }

    // If a real file was uploaded, sync to Supabase storage & target teachers
    if (fileForm.rawFile && fileForm.recipientType === 'selected') {
      for (const tName of fileForm.selectedTeachers) {
        const foundTeacher = teachersList.find(
          (t) =>
            `${t.first_name} ${t.last_name}`.toLowerCase().includes(tName.toLowerCase()) ||
            tName.toLowerCase().includes(`${t.first_name} ${t.last_name}`.toLowerCase())
        );
        if (foundTeacher) {
          uploadAndAttachTeacherSchedule({
            teacherId: foundTeacher.user_id || foundTeacher.id,
            teacherName: `${foundTeacher.first_name} ${foundTeacher.last_name}`.trim(),
            teacherTableId: foundTeacher.teacher_table_id,
            file: fileForm.rawFile,
            title: fileForm.title,
            schoolYear: fileForm.schoolYear,
            semester: fileForm.semester,
            notes: fileForm.notes,
            uploadedBy: 'School Administrator • Office of the Principal',
          }).catch((err) => console.warn('Teacher attach schedule error:', err));
        }
      }
    } else {
      // Persist to Supabase teacher_workloads
      try {
        let targetTeacherId: string | null = null;
        if (newEntry.recipientType === 'selected' && fileForm.selectedTeachers.length > 0) {
          const foundTeacher = teachersList.find((t) =>
            fileForm.selectedTeachers.some((name) =>
              `${t.first_name} ${t.last_name}`.toLowerCase().includes(name.toLowerCase())
            )
          );
          if (foundTeacher) targetTeacherId = foundTeacher.user_id || foundTeacher.id;
        }

        supabase
          .from('teacher_workloads')
          .insert([
            {
              teacher_id: targetTeacherId,
              file_name: newEntry.fileName,
              file_url:
                newEntry.fileDataUrl ||
                'https://tuujlqrfyuazvbvoribz.supabase.co/storage/v1/object/public/teacher-schedules/faculty_load.pdf',
              file_type: newEntry.fileType === 'PDF' ? 'application/pdf' : 'image/jpeg',
              uploaded_by: 'Admin',
            },
          ])
          .then(({ error }) => {
            if (error) console.warn('Supabase teacher_workloads insert notice:', error);
          });
      } catch {
        // ignore
      }
    }

    // Log to activity_logs
    try {
      const recipientStr =
        newEntry.recipientType === 'all'
          ? 'All Faculty Teachers'
          : newEntry.recipientTeacherNames.join(', ');
      const logRecord = {
        role: 'admin',
        action: 'Faculty Schedule Sent',
        details: `Attached and sent schedule file "${newEntry.fileName}" (${newEntry.fileType}, ${newEntry.fileSize}) to ${recipientStr}.`,
        timestamp: new Date().toISOString(),
      };
      supabase.from('activity_logs').insert([logRecord]).then(() => {});
      window.dispatchEvent(new CustomEvent('plsnhs-activity-logged', { detail: logRecord }));
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

  const generateScheduleDocHtml = (file: AdminSentTeacherScheduleFile) => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${file.title}</title>
  <style>
    @page { size: 8.5in 11in; margin: 0.4in; }
    * { box-sizing: border-box; }
    body { font-family: Arial, "Helvetica Neue", Helvetica, sans-serif; color: #0f172a; margin: 20px; line-height: 1.4; font-size: 11px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
    .header .rep { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin: 0 0 2px 0; }
    .header .deped { font-size: 9.5px; font-weight: bold; margin: 0 0 2px 0; }
    .header h1 { margin: 3px 0; font-size: 15px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; }
    .header .school-info { font-size: 9px; color: #334155; margin: 2px 0 0 0; }
    .banner { background: #0f172a; color: #ffffff; text-align: center; padding: 5px 8px; font-weight: bold; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; border-radius: 4px; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .meta-table td { padding: 4px 6px; border: 1px solid #cbd5e1; font-size: 10px; }
    .meta-table .label { font-weight: bold; background: #f8fafc; width: 22%; color: #334155; }
    .sched-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    .sched-table th { background: #f1f5f9; border: 1px solid #94a3b8; padding: 5px 4px; font-size: 9.5px; text-align: center; text-transform: uppercase; font-weight: bold; }
    .sched-table td { border: 1px solid #cbd5e1; padding: 4px 6px; font-size: 9.5px; }
    .sched-table td.center { text-align: center; }
    .notes-box { padding: 8px 12px; border: 1px dashed #94a3b8; border-radius: 6px; background: #fafafa; font-size: 10px; margin-bottom: 18px; line-height: 1.45; }
    .signoff { margin-top: 24px; display: flex; justify-content: space-between; font-size: 10px; }
    .sig-line { width: 210px; border-top: 1px solid #000; margin-top: 36px; text-align: center; padding-top: 4px; font-size: 9.5px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <p class="rep">Republic of the Philippines • Department of Education • Region VII, Central Visayas</p>
    <p class="deped">Schools Division of Cebu Province • District of Boljoon</p>
    <h1>PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL</h1>
    <p class="school-info">Langub, Boljoon, Cebu • DepEd School ID: <strong>303035</strong> • S.Y. 2026–2027</p>
  </div>

  <div class="banner">
    ${file.title}
  </div>

  <table class="meta-table">
    <tr>
      <td class="label">Certified Document:</td>
      <td><strong>${file.fileName}</strong> (${file.fileSize})</td>
      <td class="label">School Year & Term:</td>
      <td><strong>${file.schoolYear}</strong> • ${file.semester}</td>
    </tr>
    <tr>
      <td class="label">Target Recipient:</td>
      <td><strong>${file.recipientType === 'all' ? 'All Faculty Teachers (General Distribution)' : file.recipientTeacherNames.join(', ')}</strong></td>
      <td class="label">Distribution Date:</td>
      <td><strong>${file.sentAt}</strong></td>
    </tr>
    <tr>
      <td class="label">Authorized By:</td>
      <td>${file.sentBy}</td>
      <td class="label">Document Status:</td>
      <td><strong style="color: #047857;">Official DepEd Certified Active Load</strong></td>
    </tr>
  </table>

  <table class="sched-table">
    <thead>
      <tr>
        <th style="width: 35px;">No.</th>
        <th style="width: 130px;">Time / Period</th>
        <th style="width: 45px;">Mins</th>
        <th style="width: 50px;">Days</th>
        <th>Learning Area / Designated Subject</th>
        <th style="width: 140px;">Grade & Section</th>
        <th style="width: 110px;">Assigned Room</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="center">1</td>
        <td class="center" style="font-family: monospace; font-weight: bold;">07:30 AM – 08:30 AM</td>
        <td class="center">60</td>
        <td class="center">M–F</td>
        <td><strong>English Communication Arts</strong></td>
        <td><strong>Grade 7 – Rizal</strong></td>
        <td>Room 101 • Bldg A</td>
      </tr>
      <tr>
        <td class="center">2</td>
        <td class="center" style="font-family: monospace; font-weight: bold;">08:30 AM – 09:30 AM</td>
        <td class="center">60</td>
        <td class="center">M–F</td>
        <td><strong>Mathematics & Analytical Thinking</strong></td>
        <td><strong>Grade 8 – Bonifacio</strong></td>
        <td>Room 102 • Bldg A</td>
      </tr>
      <tr style="background: #f8fafc; font-weight: bold;">
        <td class="center">-</td>
        <td class="center" style="font-family: monospace;">09:30 AM – 09:50 AM</td>
        <td class="center">20</td>
        <td class="center">M–F</td>
        <td colspan="3" class="center" style="color: #64748b; font-style: italic;">RECESS & HEALTH BREAK</td>
      </tr>
      <tr>
        <td class="center">3</td>
        <td class="center" style="font-family: monospace; font-weight: bold;">09:50 AM – 10:50 AM</td>
        <td class="center">60</td>
        <td class="center">M–F</td>
        <td><strong>General Integrated Science & Chemistry</strong></td>
        <td><strong>Grade 9 – Mabini</strong></td>
        <td>Science Lab 1</td>
      </tr>
      <tr>
        <td class="center">4</td>
        <td class="center" style="font-family: monospace; font-weight: bold;">10:50 AM – 11:50 AM</td>
        <td class="center">60</td>
        <td class="center">M–F</td>
        <td><strong>Araling Panlipunan (Social Studies)</strong></td>
        <td><strong>Grade 10 – Luna</strong></td>
        <td>Room 201 • Bldg B</td>
      </tr>
      <tr style="background: #f8fafc; font-weight: bold;">
        <td class="center">-</td>
        <td class="center" style="font-family: monospace;">11:50 AM – 01:00 PM</td>
        <td class="center">70</td>
        <td class="center">M–F</td>
        <td colspan="3" class="center" style="color: #64748b; font-style: italic;">NOON LUNCH BREAK & TEACHER PLANNING</td>
      </tr>
      <tr>
        <td class="center">5</td>
        <td class="center" style="font-family: monospace; font-weight: bold;">01:00 PM – 02:00 PM</td>
        <td class="center">60</td>
        <td class="center">M–F</td>
        <td><strong>TLE / Information & Communications Tech</strong></td>
        <td><strong>Grade 10 – Aguinaldo</strong></td>
        <td>Computer Lab 1</td>
      </tr>
      <tr>
        <td class="center">6</td>
        <td class="center" style="font-family: monospace; font-weight: bold;">02:00 PM – 03:00 PM</td>
        <td class="center">60</td>
        <td class="center">M–F</td>
        <td><strong>MAPEH (Music, Arts, PE & Health)</strong></td>
        <td><strong>Grade 7 – Del Pilar</strong></td>
        <td>Gymnasium / Rm 103</td>
      </tr>
      <tr>
        <td class="center">7</td>
        <td class="center" style="font-family: monospace; font-weight: bold;">03:00 PM – 04:00 PM</td>
        <td class="center">60</td>
        <td class="center">M–F</td>
        <td><strong>Homeroom Guidance & Advisory Mentorship</strong></td>
        <td><strong>Official Advisory Class</strong></td>
        <td>Designated Advisory Rm</td>
      </tr>
    </tbody>
  </table>

  <div class="notes-box">
    <strong>Administrative Memo & Directives:</strong><br />
    ${file.notes || 'Official teaching assignments and class schedules are certified and active for School Year 2026–2027 pursuant to DepEd guidelines.'}
  </div>

  <div class="signoff">
    <div>
      <p style="margin: 0; font-size: 9.5px; color: #475569;">Prepared & Certified Correct:</p>
      <div class="sig-line">
        ADMINISTRATIVE OFFICER II / REGISTRAR<br />
        <span style="font-weight: normal; font-size: 8.5px; color: #64748b;">Schedule & Records Committee</span>
      </div>
    </div>
    <div>
      <p style="margin: 0; font-size: 9.5px; color: #475569;">Approved by Authority of the Principal:</p>
      <div class="sig-line">
        OFFICE OF THE PRINCIPAL<br />
        <span style="font-weight: normal; font-size: 8.5px; color: #64748b;">Placido L. Señor National High School</span>
      </div>
    </div>
  </div>
</body>
</html>`;
  };

  const handleDownloadFile = (file: AdminSentTeacherScheduleFile) => {
    if (file.fileDataUrl) {
      const a = document.createElement('a');
      a.href = file.fileDataUrl;
      a.download = file.fileName || 'Official_Teacher_Schedule.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    const docHtml = generateScheduleDocHtml(file);
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

  const handlePrintFile = (file: AdminSentTeacherScheduleFile) => {
    if (file.fileDataUrl && file.fileDataUrl.startsWith('http')) {
      const win = window.open(file.fileDataUrl, '_blank');
      win?.focus();
      return;
    }
    const docHtml = generateScheduleDocHtml(file);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(docHtml);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
        }, 1000);
      }, 400);
    }
  };

  const handleViewFile = (file: AdminSentTeacherScheduleFile) => {
    setViewingFile(file);
  };

  const handleDeleteSentFile = (id: string) => {
    const next = sentScheduleFiles.filter((f) => f.id !== id);
    setSentScheduleFiles(next);
    try {
      localStorage.setItem(ADMIN_TEACHER_SCHEDULE_FILES_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('plsnhs-schedule-files-updated'));
    } catch {
      // ignore
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
    <div className="space-y-6 animate-fade-in w-full pb-10">
      <div className="border-b border-slate-200 pb-4 sm:pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display tracking-tight leading-snug">
              Class Schedule &amp; Faculty Timetable Distribution
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Upload and send official teaching schedule files to faculty teachers and manage class periods by Year Level &amp; Section.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-auto pt-0.5">
            <div className="hidden sm:flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsSendFileModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-xs hover:bg-amber-400 transition-all cursor-pointer whitespace-nowrap"
              >
                <Send className="h-4 w-4" /> Send Schedule File
              </button>
            </div>
            <PageHeaderNotificationSlot />
          </div>
        </div>

        {/* Mobile Action Controls Row */}
        <div className="sm:hidden mt-3 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsSendFileModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2 text-xs font-extrabold text-slate-950 shadow-xs hover:bg-amber-400 transition-all cursor-pointer"
          >
            <Send className="h-4 w-4" /> Send Schedule File
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
            Organized by Year Level &bull; Synced directly to Teacher Portal &rarr; Class Program
          </span>
        </div>

        {/* Year Level Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase shrink-0">Year Level:</span>
          {[
            { id: 'all', label: 'All Year Levels' },
            { id: 'Grade 7', label: 'Grade 7' },
            { id: 'Grade 8', label: 'Grade 8' },
            { id: 'Grade 9', label: 'Grade 9' },
            { id: 'Grade 10', label: 'Grade 10' },
            { id: 'Grades 11 & 12 (SHS)', label: 'Senior High (11–12)' },
          ].map((tab) => {
            const count = tab.id === 'all'
              ? sentScheduleFiles.length
              : sentScheduleFiles.filter((f) => {
                  if (f.targetGradeLevel === tab.id) return true;
                  if (f.title.toLowerCase().includes(tab.id.toLowerCase())) return true;
                  return false;
                }).length;
            const isActive = selectedYearLevelFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedYearLevelFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 font-bold whitespace-nowrap text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredScheduleFiles.map((file) => (
            <div
              key={file.id}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between gap-3 shadow-2xs hover:border-emerald-300 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="emerald" size="sm">
                      {file.fileType} SCHEDULE FILE
                    </Badge>
                    {file.targetGradeLevel && (
                      <span className="inline-flex items-center rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                        {file.targetGradeLevel}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">{file.sentAt}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleViewFile(file)}
                  className="text-left group cursor-pointer w-full"
                  title="Click to view schedule document"
                >
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center justify-between gap-1.5">
                    <span>{file.title}</span>
                    <Eye className="h-3.5 w-3.5 text-emerald-600 shrink-0 opacity-80 group-hover:opacity-100" />
                  </h3>
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => handleViewFile(file)}
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1.5 cursor-pointer text-left"
                    title="Click to preview file"
                  >
                    <FileText className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>{file.fileName} ({file.fileSize})</span>
                  </button>
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <p>
                    <span className="font-bold text-slate-700">Target Year Level:</span>{' '}
                    <span className="font-bold text-emerald-800">
                      {file.targetGradeLevel || 'All Year Levels'}
                    </span>
                  </p>
                  <p className="line-clamp-2">
                    <span className="font-bold text-slate-700">Recipients:</span>{' '}
                    {file.recipientType === 'all'
                      ? 'All Faculty Teachers'
                      : file.recipientTeacherNames.join(', ')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between border-t border-slate-200/70 pt-2.5 text-[11px] gap-2">
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Delivered to Teacher Class Program
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleViewFile(file)}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-emerald-800 font-bold hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
                    title="View & Preview schedule document"
                  >
                    <Eye className="h-3.5 w-3.5 text-emerald-700" />
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(file)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Download schedule file"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-700" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintFile(file)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Print schedule document"
                  >
                    <Printer className="h-3.5 w-3.5 text-slate-600" />
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSentFile(file.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                    title="Remove distributed file"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Send Official Schedule File to Teachers Modal */}
      <Modal
        isOpen={isSendFileModalOpen}
        onClose={() => setIsSendFileModalOpen(false)}
        title="Send Official Schedule File to Teachers"
        subtitle="Upload the official faculty class program file (PDF, Word, Excel, or Image) organized by year level"
        maxWidth="2xl"
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

          {/* Target Year Level / Grade Level */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Target Year Level / Grade Level <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-semibold text-emerald-700">
                Organizes schedule &amp; auto-selects recipient faculty
              </span>
            </div>
            <select
              value={fileForm.targetGradeLevel}
              onChange={(e) => handleGradeLevelChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden cursor-pointer"
            >
              <option value="All Year Levels">All Year Levels (General School-wide Program)</option>
              <option value="Grade 7">Grade 7 Faculty &amp; Advisers</option>
              <option value="Grade 8">Grade 8 Faculty &amp; Advisers</option>
              <option value="Grade 9">Grade 9 Faculty &amp; Advisers</option>
              <option value="Grade 10">Grade 10 Faculty &amp; Advisers</option>
              <option value="Grades 11 & 12 (SHS)">Senior High School (Grades 11 &amp; 12 Faculty)</option>
            </select>
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
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Target Faculty Recipients
              </label>
              <span className="text-[11px] font-bold text-emerald-700">
                {fileForm.recipientType === 'all'
                  ? 'All 30 Faculty Teachers'
                  : `${fileForm.selectedTeachers.length} of ${displayedTeachers.length} Teacher(s) Selected`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFileForm({ ...fileForm, recipientType: 'all', selectedTeachers: [] })}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer text-center ${
                  fileForm.recipientType === 'all'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Faculty Teachers (30)
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetList = displayedTeachers.map((t) => `${t.first_name} ${t.last_name}`.trim());
                  setFileForm({
                    ...fileForm,
                    recipientType: 'selected',
                    selectedTeachers: targetList,
                  });
                }}
                className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer text-center ${
                  fileForm.recipientType === 'selected'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {fileForm.targetGradeLevel !== 'All Year Levels'
                  ? `${fileForm.targetGradeLevel} Teachers (${fileForm.selectedTeachers.length})`
                  : `Selected Teachers (${fileForm.selectedTeachers.length})`}
              </button>
            </div>

            {fileForm.recipientType === 'selected' && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    <span className="text-xs font-black text-slate-900 uppercase">
                      {fileForm.targetGradeLevel !== 'All Year Levels'
                        ? `${fileForm.targetGradeLevel} Teachers (${displayedTeachers.length})`
                        : `Faculty Teachers (${displayedTeachers.length})`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const allNames = displayedTeachers.map((t) => `${t.first_name} ${t.last_name}`.trim());
                      const allSelected = allNames.every((n) => fileForm.selectedTeachers.includes(n));
                      setFileForm((prev) => ({
                        ...prev,
                        selectedTeachers: allSelected
                          ? prev.selectedTeachers.filter((n) => !allNames.includes(n))
                          : Array.from(new Set([...prev.selectedTeachers, ...allNames])),
                      }));
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                  >
                    {displayedTeachers.every((t) =>
                      fileForm.selectedTeachers.includes(`${t.first_name} ${t.last_name}`.trim())
                    )
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
                  {displayedTeachers.map((t) => {
                    const fullName = `${t.first_name} ${t.last_name}`.trim();
                    const isChecked = fileForm.selectedTeachers.includes(fullName);
                    const info = getTeacherYearLevelInfo(t);
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 border text-xs font-medium cursor-pointer transition-colors ${
                          isChecked
                            ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950 font-bold'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTeacherRecipient(fullName)}
                            className="rounded text-emerald-700 shrink-0"
                          />
                          <span className="truncate">{fullName}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-semibold truncate shrink-0 max-w-[130px]">
                          {info.sectionName ? `Section ${info.sectionName}` : info.badgeText}
                        </span>
                      </label>
                    );
                  })}
                </div>
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

      {/* View / Preview Official Schedule File Modal */}
      {viewingFile && (
        <Modal
          isOpen={Boolean(viewingFile)}
          onClose={() => setViewingFile(null)}
          title={viewingFile.title}
          subtitle={`Schedule Document • ${viewingFile.fileName} (${viewingFile.fileSize})`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-900 truncate">
                      {viewingFile.fileName}
                    </span>
                    <Badge variant="emerald" size="sm">
                      {viewingFile.fileType || 'PDF'}
                    </Badge>
                    {viewingFile.targetGradeLevel && (
                      <span className="inline-flex items-center rounded-md bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-extrabold text-amber-900">
                        {viewingFile.targetGradeLevel}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">
                    {viewingFile.schoolYear} • {viewingFile.semester} • Sent to{' '}
                    <span className="font-bold text-slate-800">
                      {viewingFile.recipientType === 'all'
                        ? 'All Faculty Teachers'
                        : viewingFile.recipientTeacherNames.join(', ')}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {viewingFile.fileDataUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const win = window.open(viewingFile.fileDataUrl, '_blank');
                      win?.focus();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                    title="Open in new window / tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-slate-600" />
                    Open in Tab
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handlePrintFile(viewingFile)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                  title="Print schedule document"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-700" />
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadFile(viewingFile)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 cursor-pointer shadow-2xs"
                  title="Download schedule file"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            </div>

            {/* Document Viewer Frame / Container */}
            <div className="rounded-2xl border border-slate-200 bg-slate-100 p-2 sm:p-4 max-h-[70vh] overflow-y-auto">
              {viewingFile.fileDataUrl &&
              (viewingFile.fileDataUrl.startsWith('data:image/') ||
                /\.(png|jpe?g|webp|gif)$/i.test(viewingFile.fileName)) ? (
                <div className="flex justify-center bg-white rounded-xl p-4 shadow-sm">
                  <img
                    src={viewingFile.fileDataUrl}
                    alt={viewingFile.title}
                    className="max-h-[62vh] object-contain rounded-lg"
                  />
                </div>
              ) : viewingFile.fileDataUrl &&
                (viewingFile.fileDataUrl.startsWith('data:application/pdf') ||
                  viewingFile.fileDataUrl.startsWith('http')) ? (
                <iframe
                  src={viewingFile.fileDataUrl}
                  title={viewingFile.title}
                  className="w-full h-[65vh] rounded-xl border border-slate-300 bg-white shadow-xs"
                />
              ) : (
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm ring-1 ring-slate-200">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateScheduleDocHtml(viewingFile),
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
