import React, { useEffect, useState, useMemo } from 'react';
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
  Award,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';

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

export interface TeachingLoadSlot {
  period: string;
  days: string;
  subject: string;
  grade_level: string;
  section: string;
  strand?: string;
  room: string;
  role: 'Advisory & Subject Load' | 'Subject Load';
}

export interface FacultyProfileData {
  employee_id: string;
  specialization: string;
  advisory_grade: string;
  advisory_section: string;
  room: string;
  position: string;
}

export const getTeacherProfileData = (name: string): FacultyProfileData => {
  const clean = (name || '').toLowerCase();
  if (clean.includes('ramas')) {
    return {
      employee_id: 'PLSNHS-TCH-201017',
      specialization: 'Filipino',
      advisory_grade: 'Grade 9',
      advisory_section: 'Negros Occidental',
      room: 'Rm 204 • Bldg B',
      position: 'Secondary School Teacher I',
    };
  }
  if (clean.includes('francisco')) {
    return {
      employee_id: 'PLSNHS-TCH-201013',
      specialization: 'Mathematics',
      advisory_grade: 'Grade 9',
      advisory_section: 'Batangas',
      room: 'Rm 201 • Bldg A',
      position: 'Secondary School Teacher II',
    };
  }
  if (clean.includes('taruc')) {
    return {
      employee_id: 'PLSNHS-TCH-201014',
      specialization: 'Science',
      advisory_grade: 'Grade 9',
      advisory_section: 'Cebu',
      room: 'Sci Lab • JHS Bldg',
      position: 'Secondary School Teacher I',
    };
  }
  if (clean.includes('albores')) {
    return {
      employee_id: 'PLSNHS-TCH-201015',
      specialization: 'MAPEH',
      advisory_grade: 'Grade 9',
      advisory_section: 'Davao',
      room: 'Gym / Rm 103 • JHS Bldg',
      position: 'Secondary School Teacher I',
    };
  }
  if (clean.includes('tapasao')) {
    return {
      employee_id: 'PLSNHS-TCH-200702',
      specialization: 'Science',
      advisory_grade: 'Grade 7',
      advisory_section: 'De Gracia',
      room: 'Rm 102 • Bldg A',
      position: 'Secondary School Teacher I',
    };
  }
  if (clean.includes('generale')) {
    return {
      employee_id: 'PLSNHS-TCH-200701',
      specialization: 'English',
      advisory_grade: 'Grade 7',
      advisory_section: 'Chiong',
      room: 'Rm 101 • Bldg A',
      position: 'Secondary School Teacher I',
    };
  }
  if (clean.includes('deguma')) {
    return {
      employee_id: 'PLSNHS-TCH-701510',
      specialization: 'Science',
      advisory_grade: 'Grade 8',
      advisory_section: 'Square',
      room: 'Sci Lab • JHS Bldg',
      position: 'Secondary School Teacher I',
    };
  }
  if (clean.includes('quiroga')) {
    return {
      employee_id: 'PLSNHS-TCH-976857',
      specialization: 'Mathematics',
      advisory_grade: 'Grade 10',
      advisory_section: 'Perseverance',
      room: 'Math Lab • Bldg A',
      position: 'Secondary School Teacher I',
    };
  }
  if (clean.includes('diaz')) {
    return {
      employee_id: 'PLSNHS-TCH-201024',
      specialization: 'Values Education (EsP)',
      advisory_grade: 'Grade 10',
      advisory_section: 'Wisdom',
      room: 'Rm 305 • Bldg A',
      position: 'Master Teacher I',
    };
  }
  if (clean.includes('paunel')) {
    return {
      employee_id: 'PLSNHS-TCH-201020',
      specialization: 'Science',
      advisory_grade: 'Grade 10',
      advisory_section: 'Generosity',
      room: 'Rm 201 • Bldg A',
      position: 'Secondary School Teacher I',
    };
  }
  if (clean.includes('omambac')) {
    return {
      employee_id: 'PLSNHS-TCH-201007',
      specialization: 'English',
      advisory_grade: 'Grade 8',
      advisory_section: 'Banaba',
      room: 'Rm 104 • JHS Bldg',
      position: 'Secondary School Teacher I',
    };
  }
  // Default fallback
  return {
    employee_id: 'PLSNHS-TCH-201017',
    specialization: 'Filipino',
    advisory_grade: 'Grade 9',
    advisory_section: 'Negros Occidental',
    room: 'Rm 204 • Bldg B',
    position: 'Secondary School Teacher I',
  };
};

export const generateTeachingLoads = (prof: FacultyProfileData): TeachingLoadSlot[] => {
  const spec = prof.specialization.toLowerCase();

  if (spec.includes('filipino')) {
    return [
      {
        period: '07:30 AM – 08:30 AM',
        days: 'Monday – Friday',
        subject: 'Filipino 9 (Panitikang Asyano)',
        grade_level: prof.advisory_grade,
        section: prof.advisory_section,
        room: prof.room,
        role: 'Advisory & Subject Load',
      },
      {
        period: '08:30 AM – 09:30 AM',
        days: 'Monday – Friday',
        subject: 'Filipino 9 (Panitikang Asyano)',
        grade_level: 'Grade 9',
        section: 'Batangas',
        room: 'Rm 201 • Bldg A',
        role: 'Subject Load',
      },
      {
        period: '10:00 AM – 11:00 AM',
        days: 'Monday – Friday',
        subject: 'Filipino 9 (Panitikang Asyano)',
        grade_level: 'Grade 9',
        section: 'Cebu',
        room: 'Rm 202 • JHS Bldg',
        role: 'Subject Load',
      },
      {
        period: '01:00 PM – 02:00 PM',
        days: 'Monday – Friday',
        subject: 'Filipino 10 (Panitikang Pandaigdig)',
        grade_level: 'Grade 10',
        section: 'Generosity',
        room: 'Rm 301 • Bldg A',
        role: 'Subject Load',
      },
      {
        period: '02:00 PM – 03:00 PM',
        days: 'Monday – Friday',
        subject: 'Filipino 10 (Panitikang Pandaigdig)',
        grade_level: 'Grade 10',
        section: 'Wisdom',
        room: 'Rm 305 • Bldg A',
        role: 'Subject Load',
      },
      {
        period: '03:00 PM – 04:00 PM',
        days: 'Monday – Friday',
        subject: 'Komunikasyon at Pananaliksik sa Wika at Kulturang Pilipino',
        grade_level: 'Grade 11',
        section: 'Tolentino',
        strand: 'HUMSS',
        room: 'Rm 108 • SHS Bldg',
        role: 'Subject Load',
      },
    ];
  }

  if (spec.includes('science')) {
    return [
      {
        period: '07:30 AM – 08:30 AM',
        days: 'Monday – Friday',
        subject: `${prof.advisory_grade} Science (Integrated)`,
        grade_level: prof.advisory_grade,
        section: prof.advisory_section,
        room: prof.room,
        role: 'Advisory & Subject Load',
      },
      {
        period: '08:30 AM – 09:30 AM',
        days: 'Monday – Friday',
        subject: 'Science & Technology',
        grade_level: prof.advisory_grade,
        section: prof.advisory_grade === 'Grade 8' ? 'Banaba' : 'De Gracia',
        room: 'Sci Lab • JHS Bldg',
        role: 'Subject Load',
      },
      {
        period: '10:00 AM – 11:00 AM',
        days: 'Monday – Friday',
        subject: 'Science & Chemistry',
        grade_level: prof.advisory_grade,
        section: prof.advisory_grade === 'Grade 8' ? 'Kamagong' : 'Sayson',
        room: 'Sci Lab • JHS Bldg',
        role: 'Subject Load',
      },
      {
        period: '01:00 PM – 02:00 PM',
        days: 'Monday – Friday',
        subject: 'Science 10 (Physics & Biology)',
        grade_level: 'Grade 10',
        section: 'Kindness',
        room: 'Rm 302 • Bldg A',
        role: 'Subject Load',
      },
      {
        period: '02:00 PM – 03:00 PM',
        days: 'Monday – Friday',
        subject: 'Science 10 (Physics & Biology)',
        grade_level: 'Grade 10',
        section: 'Perseverance',
        room: 'Rm 303 • Bldg A',
        role: 'Subject Load',
      },
      {
        period: '03:00 PM – 04:00 PM',
        days: 'Monday – Friday',
        subject: 'Earth and Life Science (Core)',
        grade_level: 'Grade 11',
        section: 'Amorsolo',
        strand: 'STEM',
        room: 'Rm 107 • SHS Bldg',
        role: 'Subject Load',
      },
    ];
  }

  if (spec.includes('english')) {
    return [
      {
        period: '07:30 AM – 08:30 AM',
        days: 'Monday – Friday',
        subject: `${prof.advisory_grade} English (Anglo-American Literature)`,
        grade_level: prof.advisory_grade,
        section: prof.advisory_section,
        room: prof.room,
        role: 'Advisory & Subject Load',
      },
      {
        period: '08:30 AM – 09:30 AM',
        days: 'Monday – Friday',
        subject: 'English Communication Arts',
        grade_level: prof.advisory_grade,
        section: 'Chiong',
        room: 'Rm 101 • Bldg A',
        role: 'Subject Load',
      },
      {
        period: '10:00 AM – 11:00 AM',
        days: 'Monday – Friday',
        subject: 'English Grammar & Composition',
        grade_level: 'Grade 8',
        section: 'Banaba',
        room: 'Rm 104 • JHS Bldg',
        role: 'Subject Load',
      },
      {
        period: '01:00 PM – 02:00 PM',
        days: 'Monday – Friday',
        subject: 'English 10 (World Literature)',
        grade_level: 'Grade 10',
        section: 'Kindness',
        room: 'Rm 301 • Bldg A',
        role: 'Subject Load',
      },
      {
        period: '02:00 PM – 03:00 PM',
        days: 'Monday – Friday',
        subject: 'English 10 (World Literature)',
        grade_level: 'Grade 10',
        section: 'Perseverance',
        room: 'Rm 303 • Bldg A',
        role: 'Subject Load',
      },
      {
        period: '03:00 PM – 04:00 PM',
        days: 'Monday – Friday',
        subject: 'Oral Communication in Context',
        grade_level: 'Grade 11',
        section: 'Tolentino',
        strand: 'HUMSS',
        room: 'Rm 108 • SHS Bldg',
        role: 'Subject Load',
      },
    ];
  }

  // Default Mathematics / General Schedule
  return [
    {
      period: '07:30 AM – 08:30 AM',
      days: 'Monday – Friday',
      subject: 'General Mathematics',
      grade_level: prof.advisory_grade || 'Grade 10',
      section: prof.advisory_section || 'Generosity',
      room: prof.room || 'Rm 201 • Bldg A',
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
};

export const TeacherClassProgramPage: React.FC = () => {
  const { user } = useAuth();

  // Determine current active teacher name from session or fallback to Mrs. Ramas
  const currentUserName = user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  const teacherName = currentUserName || 'Mrs. Ramas';

  const [facultyProfile, setFacultyProfile] = useState<FacultyProfileData>(() =>
    getTeacherProfileData(teacherName)
  );

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
  const [isOfficialDocModalOpen, setIsOfficialDocModalOpen] = useState(false);

  // Sync Supabase faculty profile and section assignments
  useEffect(() => {
    async function loadFacultyProfile() {
      try {
        if (!user?.email && !user?.id) return;

        let teacherRecord: any = null;
        if (user.id) {
          const { data } = await supabase
            .from('teachers')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
          if (data) teacherRecord = data;
        }

        if (!teacherRecord && user.email) {
          const { data: userRow } = await supabase
            .from('users')
            .select('id')
            .eq('email', user.email)
            .maybeSingle();
          if (userRow) {
            const { data } = await supabase
              .from('teachers')
              .select('*')
              .eq('user_id', userRow.id)
              .maybeSingle();
            if (data) teacherRecord = data;
          }
        }

        if (teacherRecord) {
          const { data: sec } = await supabase
            .from('sections')
            .select('*')
            .eq('adviser_id', teacherRecord.id)
            .maybeSingle();

          setFacultyProfile((prev) => ({
            ...prev,
            employee_id: teacherRecord.employee_id || prev.employee_id,
            specialization: teacherRecord.specialization || prev.specialization,
            advisory_grade: sec?.grade_level || prev.advisory_grade,
            advisory_section: sec?.name || prev.advisory_section,
            room: sec?.room || prev.room,
          }));
        }
      } catch (err) {
        console.warn('Faculty profile fetch warning:', err);
      }
    }

    loadFacultyProfile();
  }, [user]);

  // Sync admin schedule uploads
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
    window.addEventListener('plsnhs-schedule-files-updated', handleStorage);

    async function loadSupabaseWorkloads() {
      try {
        const { data } = await supabase
          .from('teacher_workloads')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
          const sbFiles: AdminSentTeacherScheduleFile[] = data.map((tw: any) => ({
            id: tw.id,
            title: 'Official Faculty Teaching Schedule & Load',
            fileName: tw.file_name,
            fileSize: '450 KB',
            fileType: tw.file_type ? tw.file_type.split('/').pop()?.toUpperCase() || 'PDF' : 'PDF',
            fileDataUrl: tw.file_url,
            schoolYear: 'S.Y. 2026–2027',
            semester: 'Full Academic Year',
            recipientType: 'all',
            recipientTeacherNames: ['All Faculty Teachers'],
            sentBy: tw.uploaded_by || 'Admin Office',
            sentAt: new Date(tw.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            notes: 'Official DepEd teaching assignment and class program document.',
          }));

          setAdminFiles((prev) => {
            const existingIds = new Set(prev.map((f) => f.id));
            const newFiles = sbFiles.filter((f) => !existingIds.has(f.id));
            return [...newFiles, ...prev];
          });
        }
      } catch (err) {
        console.warn('Teacher workloads fetch warning:', err);
      }
    }
    loadSupabaseWorkloads();

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('plsnhs-schedule-files-updated', handleStorage);
    };
  }, []);

  // Filter schedule files relevant to this logged-in teacher
  const myReceivedScheduleFiles = useMemo(() => {
    return adminFiles.filter((file) => {
      if (file.recipientType === 'all') return true;
      return file.recipientTeacherNames.some(
        (name) =>
          name.toLowerCase().includes(teacherName.toLowerCase().split(' ')[0]) ||
          teacherName.toLowerCase().includes(name.toLowerCase().split(' ')[0])
      );
    });
  }, [adminFiles, teacherName]);

  // Generate personalized teaching loads
  const teachingLoads = useMemo(() => {
    return generateTeachingLoads(facultyProfile);
  }, [facultyProfile]);

  // Handle professional print
  const handlePrintOfficialProgram = () => {
    window.print();
  };

  // Download official printable HTML/Document
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

    const rowsHtml = teachingLoads
      .map(
        (slot, idx) => `
        <tr>
          <td style="padding:8px;border:1px solid #1e293b;text-align:center;font-weight:bold;">${idx + 1}</td>
          <td style="padding:8px;border:1px solid #1e293b;font-family:monospace;font-weight:bold;">${slot.period}</td>
          <td style="padding:8px;border:1px solid #1e293b;text-align:center;">60</td>
          <td style="padding:8px;border:1px solid #1e293b;text-align:center;">${slot.days}</td>
          <td style="padding:8px;border:1px solid #1e293b;font-weight:bold;">${slot.subject}</td>
          <td style="padding:8px;border:1px solid #1e293b;font-weight:bold;">${slot.grade_level} • Section ${slot.section}${slot.strand ? ` (${slot.strand})` : ''}</td>
          <td style="padding:8px;border:1px solid #1e293b;">${slot.room}</td>
          <td style="padding:8px;border:1px solid #1e293b;text-align:right;font-weight:bold;">300 mins (5h)</td>
        </tr>`
      )
      .join('');

    const docHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>DepEd Teacher Class Program - ${teacherName}</title>
  <style>
    @page { size: letter portrait; margin: 0.4in; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 20px; font-size: 11px; }
    .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
    .header h1 { margin: 2px 0; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; }
    .header p { margin: 1px 0; font-size: 10px; color: #334155; }
    .title-banner { background: #f1f5f9; border: 1px solid #0f172a; padding: 6px; text-align: center; margin-bottom: 10px; }
    .title-banner h2 { margin: 0; font-size: 12px; text-transform: uppercase; font-weight: 800; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #0f172a; padding: 8px; margin-bottom: 10px; font-size: 10.5px; background: #fafafa; }
    .meta-row { margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 8px; }
    th { background: #e2e8f0; color: #0f172a; text-transform: uppercase; font-size: 9.5px; padding: 6px; border: 1px solid #0f172a; text-align: left; }
    .workload-box { margin-top: 10px; border: 1px solid #0f172a; padding: 6px 8px; background: #f8fafc; font-size: 9.5px; }
    .signoff { margin-top: 28px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; font-size: 10px; }
    .signature-line { border-bottom: 1px solid #0f172a; padding-bottom: 2px; font-weight: bold; text-transform: uppercase; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="header">
    <p>Republic of the Philippines • Department of Education</p>
    <p>Region VII, Central Visayas • Schools Division of Cebu Province</p>
    <h1>Placido L. Señor National High School</h1>
    <p>Langub, Boljoon, Cebu • School ID: 303035</p>
  </div>

  <div class="title-banner">
    <h2>Teacher's Individual Class Program &amp; Workload</h2>
    <p style="margin:2px 0;font-size:9.5px;font-weight:bold;">School Year 2026–2027 • First &amp; Second Semesters</p>
    <p style="margin:0;font-size:8.5px;color:#475569;font-style:italic;">In Compliance with DepEd Order No. 31, s. 2012 &amp; Republic Act No. 4670 (Magna Carta for Public School Teachers)</p>
  </div>

  <div class="meta-grid">
    <div>
      <div class="meta-row"><strong>Faculty Teacher:</strong> ${teacherName}</div>
      <div class="meta-row"><strong>Employee ID:</strong> ${facultyProfile.employee_id}</div>
      <div class="meta-row"><strong>Position / Rank:</strong> ${facultyProfile.position}</div>
      <div class="meta-row"><strong>Specialization:</strong> ${facultyProfile.specialization}</div>
    </div>
    <div>
      <div class="meta-row"><strong>Advisory Class:</strong> ${facultyProfile.advisory_grade} – Section ${facultyProfile.advisory_section}</div>
      <div class="meta-row"><strong>Classroom:</strong> ${facultyProfile.room}</div>
      <div class="meta-row"><strong>Employment Status:</strong> Permanent / Regular Full-Time</div>
      <div class="meta-row"><strong>Official Working Hours:</strong> 07:30 AM – 04:30 PM (M–F)</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:24px;text-align:center;">#</th>
        <th style="width:130px;">Time Period</th>
        <th style="width:50px;text-align:center;">Mins/Day</th>
        <th style="width:60px;text-align:center;">Days</th>
        <th>Subject / Learning Area</th>
        <th>Grade &amp; Section</th>
        <th>Room</th>
        <th style="width:90px;text-align:right;">Weekly Load</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="workload-box">
    <strong>SUMMARY OF WORKLOAD (RA 4670 STANDARD COMPLIANCE):</strong>
    <div style="display:flex;justify-content:space-between;margin-top:4px;">
      <span>A. Actual Classroom Teaching Load (Instructional): <strong>24.0 Hours/Week</strong> (4.8 hrs/day)</span>
      <span>B. Homeroom Advisory &amp; Remediation: <strong>6.0 Hours/Week</strong> (1.2 hrs/day)</span>
      <span>C. Lesson Preparation &amp; Assessment: <strong>10.0 Hours/Week</strong> (2.0 hrs/day)</span>
    </div>
    <div style="margin-top:3px;font-weight:bold;color:#0f172a;border-top:1px dashed #cbd5e1;padding-top:2px;">
      TOTAL OFFICIAL WORKING HOURS: 40.0 HOURS PER WEEK (8.0 Hours/Day) • 100% Full-Time DepEd Standard
    </div>
  </div>

  <div class="signoff">
    <div>
      <p style="margin:0;color:#64748b;text-transform:uppercase;font-size:9px;">Conformed &amp; Submitted by:</p>
      <div class="signature-line">${teacherName}</div>
      <p style="margin:2px 0 0 0;font-size:9px;color:#64748b;">Secondary School Teacher / Adviser</p>
    </div>
    <div>
      <p style="margin:0;color:#64748b;text-transform:uppercase;font-size:9px;">Reviewed &amp; Verified by:</p>
      <div class="signature-line">JHERICO MAURIN</div>
      <p style="margin:2px 0 0 0;font-size:9px;color:#64748b;">Master Teacher I / Academics</p>
    </div>
    <div>
      <p style="margin:0;color:#64748b;text-transform:uppercase;font-size:9px;">Approved by:</p>
      <div class="signature-line">JUSTINE MANGILA, EdD</div>
      <p style="margin:2px 0 0 0;font-size:9px;color:#64748b;">Secondary School Principal II</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([docHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `DepEd_Class_Program_${teacherName.replace(/\s+/g, '_')}_SY2026-2027.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* 
        ========================================================================
        OFFICIAL PRINT SHEET STYLES
        Hides all web navigation, cards, banners, and interactive elements.
        Outputs ONLY the high-resolution, perfectly-aligned DepEd Class Program form.
        ========================================================================
      */}
      <style>{`
        @page {
          size: letter portrait;
          margin: 0.35in 0.45in 0.35in 0.45in;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print,
          .print\\:hidden,
          #hesChatbotContainer,
          .hes-chatbot-launcher,
          header,
          aside,
          nav,
          .sidebar,
          div[role="dialog"] {
            display: none !important;
            visibility: hidden !important;
          }
          .official-class-program-print-sheet {
            display: block !important;
            width: 100% !important;
            max-width: 7.6in !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-before: avoid !important;
            break-inside: avoid !important;
          }
          .official-print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }
          .official-print-table th,
          .official-print-table td {
            border: 1px solid #1e293b !important;
            color: #0f172a !important;
            padding: 5px 7px !important;
            font-size: 8.5pt !important;
            line-height: 1.25 !important;
          }
          .official-print-table th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            font-size: 8pt !important;
          }
        }
      `}</style>

      {/* 
        ========================================================================
        WEB VIEW CONTAINER (Automatically hidden upon print)
        ========================================================================
      */}
      <div className="no-print space-y-6 animate-fade-in pb-10">
        {/* Page Header */}
        <div className="border-b border-slate-200 pb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-display tracking-tight leading-snug">
                Faculty Teaching Program &amp; Workload
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                View, print, or download your official teaching schedule files issued by the School Administrator.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 ml-auto pt-0.5">
              <button
                type="button"
                onClick={() => setIsOfficialDocModalOpen(true)}
                className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-900 shadow-2xs hover:bg-emerald-100 transition-all cursor-pointer"
              >
                <Eye className="h-4 w-4 text-emerald-700" />
                Preview Official DepEd Form
              </button>

              <button
                type="button"
                onClick={handlePrintOfficialProgram}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all cursor-pointer shrink-0"
              >
                <Printer className="h-4 w-4 text-emerald-700" />
                Print Class Program
              </button>
              <PageHeaderNotificationSlot />
            </div>
          </div>

          {/* Mobile Action Row */}
          <div className="sm:hidden mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOfficialDocModalOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-900 shadow-2xs hover:bg-emerald-100 transition-all cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5 text-emerald-700" />
              Preview Form
            </button>
            <button
              type="button"
              onClick={handlePrintOfficialProgram}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4 text-emerald-700" />
              Print Program
            </button>
          </div>
        </div>

        {/* Official DepEd Teacher Fast Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0f172a] text-[#F5C518] shadow-xs">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-extrabold text-slate-900">
                    {teacherName}
                  </h2>
                  <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    {facultyProfile.specialization} Faculty
                  </span>
                  <span className="rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-[#1B2A4A]">
                    {facultyProfile.employee_id}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>Advisory Section: <strong>{facultyProfile.advisory_grade} • Section {facultyProfile.advisory_section}</strong></span>
                  <span>•</span>
                  <span>Room: <strong>{facultyProfile.room}</strong></span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrintOfficialProgram}
                className="px-4 py-2 rounded-xl bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
              >
                <Printer className="h-3.5 w-3.5 text-amber-400" />
                Print DepEd Class Program
              </button>
            </div>
          </div>
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
                    onClick={handlePrintOfficialProgram}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                    title="Print Official Class Program Form"
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
              Official Faculty Class Schedule (S.Y. 2026–2027)
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
                {teachingLoads.map((slot, index) => (
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
      </div>

      {/* 
        ========================================================================
        OFFICIAL PRINT DOCUMENT SHEET (Rendered during Print / Window.print)
        ========================================================================
      */}
      <div className="official-class-program-print-sheet hidden print:block text-slate-900 bg-white">
        {/* Official DepEd Header */}
        <div className="text-center pb-2 border-b-2 border-slate-900">
          <div className="flex items-center justify-between">
            {/* Left: Official School Logo */}
            <div className="w-16 h-16 shrink-0 flex items-center justify-center">
              <img
                src="/pictures/logo sa skwelahan.png"
                alt="PLSNHS Logo"
                className="w-14 h-14 object-contain rounded-full"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            {/* Center: Department of Education Titles */}
            <div className="flex-1 px-2 text-center">
              <p className="text-[9.5pt] uppercase tracking-wider font-semibold text-slate-800 leading-tight">
                Republic of the Philippines • Republika ng Pilipinas
              </p>
              <p className="text-[11.5pt] uppercase font-bold text-slate-950 leading-tight mt-0.5">
                Department of Education • Kagawaran ng Edukasyon
              </p>
              <p className="text-[9pt] text-slate-700 leading-tight mt-0.5">
                Region VII, Central Visayas • Schools Division of Cebu Province
              </p>
              <h1 className="text-[13pt] font-black uppercase tracking-wide text-slate-950 mt-1 leading-tight font-serif">
                PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL
              </h1>
              <p className="text-[8.5pt] text-slate-600 leading-tight mt-0.5">
                Langub, Boljoon, Cebu • School Identification Number (ID): <strong>303035</strong>
              </p>
            </div>

            {/* Right: DepEd Seal */}
            <div className="w-16 h-16 shrink-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-2 border-slate-900 flex flex-col items-center justify-center text-center p-1 font-serif">
                <span className="text-[7pt] font-bold uppercase leading-none">DEPED</span>
                <span className="text-[6pt] leading-tight">Region VII</span>
              </div>
            </div>
          </div>
        </div>

        {/* Double Border Rule */}
        <div className="border-b border-slate-900 mt-0.5 mb-2" />

        {/* Form Title Banner */}
        <div className="text-center py-2 bg-slate-100 border border-slate-900 mb-2">
          <h2 className="text-[11pt] font-black uppercase tracking-wider text-slate-950 leading-tight">
            TEACHER'S INDIVIDUAL CLASS PROGRAM &amp; TEACHING LOAD
          </h2>
          <p className="text-[9pt] font-bold text-slate-800 mt-0.5">
            School Year 2026–2027 • First &amp; Second Semesters
          </p>
          <p className="text-[7.5pt] text-slate-600 italic mt-0.5">
            In Strict Compliance with DepEd Order No. 31, s. 2012 &amp; Republic Act No. 4670 (Magna Carta for Public School Teachers)
          </p>
        </div>

        {/* Faculty Profile Matrix Box */}
        <div className="grid grid-cols-2 border border-slate-900 text-[9pt] mb-2 bg-white">
          <div className="p-2 border-r border-slate-900 space-y-1">
            <div className="flex">
              <span className="w-32 font-bold text-slate-700 uppercase">Faculty Name:</span>
              <span className="font-extrabold text-slate-950 uppercase">{teacherName}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700 uppercase">Employee ID:</span>
              <span className="font-mono font-bold text-slate-900">{facultyProfile.employee_id}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700 uppercase">Civil Service Title:</span>
              <span className="font-semibold text-slate-900">{facultyProfile.position}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700 uppercase">Specialization / Major:</span>
              <span className="font-bold text-slate-900">{facultyProfile.specialization}</span>
            </div>
          </div>

          <div className="p-2 space-y-1">
            <div className="flex">
              <span className="w-32 font-bold text-slate-700 uppercase">Advisory Class:</span>
              <span className="font-extrabold text-slate-950">
                {facultyProfile.advisory_grade} – Section {facultyProfile.advisory_section}
              </span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700 uppercase">Designated Room:</span>
              <span className="font-semibold text-slate-900">{facultyProfile.room}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700 uppercase">Employment Status:</span>
              <span className="font-semibold text-slate-900">Permanent / Regular Full-Time</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700 uppercase">Official Work Hours:</span>
              <span className="font-semibold text-slate-900">07:30 AM – 04:30 PM (Monday – Friday)</span>
            </div>
          </div>
        </div>

        {/* Official Class Schedule Timetable */}
        <div className="border border-slate-900 mb-2">
          <table className="official-print-table w-full text-left">
            <thead>
              <tr>
                <th style={{ width: '28px', textAlign: 'center' }}>#</th>
                <th style={{ width: '135px' }}>Time Period</th>
                <th style={{ width: '55px', textAlign: 'center' }}>Mins/Day</th>
                <th style={{ width: '60px', textAlign: 'center' }}>Days</th>
                <th>Subject / Learning Area</th>
                <th>Grade Level &amp; Section</th>
                <th>Room Assignment</th>
                <th style={{ width: '90px', textAlign: 'right' }}>Weekly Load</th>
              </tr>
            </thead>
            <tbody>
              {teachingLoads.map((slot, i) => (
                <tr key={i}>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{i + 1}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{slot.period}</td>
                  <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>60</td>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>M – F</td>
                  <td>
                    <strong>{slot.subject}</strong>
                    {slot.role === 'Advisory & Subject Load' && (
                      <span className="block text-[7.5pt] font-extrabold text-slate-600 uppercase">
                        ★ Designated Advisory Class Subject
                      </span>
                    )}
                  </td>
                  <td>
                    <strong>
                      {slot.grade_level} – {slot.section}
                    </strong>
                    {slot.strand ? ` (${slot.strand})` : ''}
                  </td>
                  <td>{slot.room}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                    300 mins (5h)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Workload Component Allocation Summary Box */}
        <div className="border border-slate-900 p-2 bg-slate-50 mb-2">
          <p className="text-[8.5pt] font-black uppercase tracking-wider text-slate-900 mb-1">
            Summary of Workload Allocation &amp; Time Distribution (RA 4670 Compliance)
          </p>
          <table className="w-full text-left text-[8pt] border border-slate-400 bg-white">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-400">
                <th className="p-1 border-r border-slate-400 font-bold">Workload Component</th>
                <th className="p-1 border-r border-slate-400 text-center font-bold">Daily Equivalent</th>
                <th className="p-1 border-r border-slate-400 text-center font-bold">Weekly Total</th>
                <th className="p-1 font-bold">Statutory &amp; Administrative Basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              <tr>
                <td className="p-1 border-r border-slate-400 font-bold">
                  A. Actual Classroom Teaching Load (Instructional)
                </td>
                <td className="p-1 border-r border-slate-400 text-center font-mono">4.8 Hours / Day</td>
                <td className="p-1 border-r border-slate-400 text-center font-mono font-bold">24.0 Hours / Week</td>
                <td className="p-1 text-slate-600">Compliant with RA 4670 (Max 6.0 hrs/day teaching)</td>
              </tr>
              <tr>
                <td className="p-1 border-r border-slate-400 font-bold">
                  B. Homeroom Advisory, Remediation &amp; Student Guidance
                </td>
                <td className="p-1 border-r border-slate-400 text-center font-mono">1.2 Hours / Day</td>
                <td className="p-1 border-r border-slate-400 text-center font-mono font-bold">6.0 Hours / Week</td>
                <td className="p-1 text-slate-600">DepEd Order No. 31, s. 2012 Guidelines</td>
              </tr>
              <tr>
                <td className="p-1 border-r border-slate-400 font-bold">
                  C. Lesson Preparation, Records Keeping &amp; Student Assessment
                </td>
                <td className="p-1 border-r border-slate-400 text-center font-mono">2.0 Hours / Day</td>
                <td className="p-1 border-r border-slate-400 text-center font-mono font-bold">10.0 Hours / Week</td>
                <td className="p-1 text-slate-600">Civil Service Commission (CSC) Prescribed Working Hours</td>
              </tr>
              <tr className="bg-slate-100 font-black text-slate-950">
                <td className="p-1 border-r border-slate-400 uppercase">
                  Total Official Weekly Working Hours:
                </td>
                <td className="p-1 border-r border-slate-400 text-center font-mono">8.0 Hours / Day</td>
                <td className="p-1 border-r border-slate-400 text-center font-mono">40.0 Hours / Week</td>
                <td className="p-1 text-emerald-900 font-bold">✓ 100% Full-Time DepEd Standard Compliant</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* DepEd Attestation Clause */}
        <div className="border border-slate-900 p-2 text-[8pt] text-justify text-slate-800 leading-tight mb-2 bg-white">
          <p>
            <strong>OFFICIAL ATTESTATION:</strong> I hereby certify that the individual teaching loads, room assignments, advisory designations, and official working hours detailed in this form have been duly assigned to me for School Year 2026–2027. I attest that I shall discharge my duties in accordance with the prescribed Department of Education curriculum and the Code of Ethics for Professional Teachers.
          </p>
        </div>

        {/* Tri-Signatory Sign-Off Block */}
        <div className="border border-slate-900 p-3 mb-2 bg-white">
          <div className="grid grid-cols-3 gap-6 text-center text-[9pt]">
            <div className="flex flex-col items-center">
              <p className="text-[8pt] uppercase font-bold text-slate-600 mb-8">
                Conformed &amp; Submitted by:
              </p>
              <p className="font-extrabold text-slate-950 uppercase border-b-2 border-slate-900 pb-0.5 w-full text-[9.5pt]">
                {teacherName}
              </p>
              <p className="text-[8pt] text-slate-600 mt-1">Secondary School Teacher / Adviser</p>
              <p className="text-[7.5pt] text-slate-500 font-mono">Date: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>

            <div className="flex flex-col items-center">
              <p className="text-[8pt] uppercase font-bold text-slate-600 mb-8">
                Reviewed &amp; Verified by:
              </p>
              <p className="font-extrabold text-slate-950 uppercase border-b-2 border-slate-900 pb-0.5 w-full text-[9.5pt]">
                JHERICO MAURIN
              </p>
              <p className="text-[8pt] text-slate-600 mt-1">Master Teacher I / Curriculum Head</p>
              <p className="text-[7.5pt] text-slate-500 font-mono">Date: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>

            <div className="flex flex-col items-center">
              <p className="text-[8pt] uppercase font-bold text-slate-600 mb-8">
                Approved by:
              </p>
              <p className="font-extrabold text-slate-950 uppercase border-b-2 border-slate-900 pb-0.5 w-full text-[9.5pt]">
                JUSTINE MANGILA, EdD
              </p>
              <p className="text-[8pt] text-slate-600 mt-1">Secondary School Principal II</p>
              <p className="text-[7.5pt] text-slate-500 font-mono">Placido L. Señor National High School</p>
            </div>
          </div>
        </div>

        {/* Security Audit & Verification Bar */}
        <div className="flex items-center justify-between text-[7.5pt] text-slate-600 pt-1 border-t border-slate-300">
          <span>Placido L. Señor National High School • DepEd School ID: 303035</span>
          <span className="font-mono">Doc Ref: PLSNHS-SF7-TCP-2026-08 • System Verified Form</span>
          <span className="font-bold">Page 1 of 1 • Official School Record</span>
        </div>
      </div>

      {/* 
        ========================================================================
        MODAL 1: INTERACTIVE OFFICIAL DOCUMENT PREVIEW (On-Screen Modal)
        ========================================================================
      */}
      {isOfficialDocModalOpen && (
        <Modal
          isOpen={isOfficialDocModalOpen}
          onClose={() => setIsOfficialDocModalOpen(false)}
          title={`Official DepEd Class Program: ${teacherName}`}
          subtitle={`School Year 2026–2027 • ${facultyProfile.advisory_grade} – Section ${facultyProfile.advisory_section}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                <span>
                  Official DepEd Single-Sheet Bond Paper Format (Letter 8.5&quot; × 11&quot;)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintOfficialProgram}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Now
                </button>
                <button
                  type="button"
                  onClick={() => setIsOfficialDocModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Document Preview Box */}
            <div className="rounded-xl border border-slate-300 bg-white p-5 shadow-inner max-h-[70vh] overflow-y-auto text-slate-900 text-xs">
              {/* Header */}
              <div className="text-center pb-2 border-b-2 border-slate-900">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-700 leading-tight">
                  Republic of the Philippines • Department of Education
                </p>
                <p className="text-[12px] uppercase font-bold text-slate-950 leading-tight">
                  Region VII, Central Visayas • Schools Division of Cebu Province
                </p>
                <h3 className="text-base font-black uppercase text-slate-950 mt-1 font-serif">
                  PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL
                </h3>
                <p className="text-[10px] text-slate-600">
                  Langub, Boljoon, Cebu • School ID: <strong>303035</strong>
                </p>
              </div>

              {/* Title */}
              <div className="text-center py-2 bg-slate-100 border-x border-b border-slate-900 my-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-950">
                  TEACHER'S INDIVIDUAL CLASS PROGRAM &amp; TEACHING LOAD
                </h4>
                <p className="text-[10px] font-bold text-slate-800">
                  School Year 2026–2027 • First &amp; Second Semesters
                </p>
                <p className="text-[8px] text-slate-600 italic">
                  Pursuant to DepEd Order No. 31, s. 2012 &amp; RA 4670 Magna Carta
                </p>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 border border-slate-900 text-[10.5px] p-2 bg-slate-50/50 mb-3 gap-2">
                <div>
                  <p><strong>Faculty:</strong> {teacherName}</p>
                  <p><strong>Employee ID:</strong> {facultyProfile.employee_id}</p>
                  <p><strong>Specialization:</strong> {facultyProfile.specialization}</p>
                </div>
                <div>
                  <p><strong>Advisory Class:</strong> {facultyProfile.advisory_grade} – Section {facultyProfile.advisory_section}</p>
                  <p><strong>Room:</strong> {facultyProfile.room}</p>
                  <p><strong>Status:</strong> Permanent Regular Full-Time</p>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-left text-[10px] border border-slate-900 border-collapse mb-3">
                <thead className="bg-slate-100 uppercase text-[9px] font-extrabold border-b border-slate-900">
                  <tr>
                    <th className="p-1.5 border-r border-slate-900 text-center w-8">#</th>
                    <th className="p-1.5 border-r border-slate-900">Time Period</th>
                    <th className="p-1.5 border-r border-slate-900">Subject</th>
                    <th className="p-1.5 border-r border-slate-900">Grade &amp; Section</th>
                    <th className="p-1.5 border-r border-slate-900">Room</th>
                    <th className="p-1.5 text-right">Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {teachingLoads.map((slot, i) => (
                    <tr key={i}>
                      <td className="p-1.5 border-r border-slate-900 text-center font-bold">{i + 1}</td>
                      <td className="p-1.5 border-r border-slate-900 font-mono font-bold whitespace-nowrap">{slot.period}</td>
                      <td className="p-1.5 border-r border-slate-900 font-bold">{slot.subject}</td>
                      <td className="p-1.5 border-r border-slate-900">{slot.grade_level} – {slot.section}</td>
                      <td className="p-1.5 border-r border-slate-900">{slot.room}</td>
                      <td className="p-1.5 text-right font-mono font-bold">5h/wk</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 text-center text-[9.5px] border-t border-slate-300 pt-3">
                <div>
                  <p className="text-slate-500 mb-6">Prepared by:</p>
                  <p className="font-extrabold uppercase underline">{teacherName}</p>
                  <p className="text-[9px] text-slate-500">Teacher / Adviser</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-6">Verified by:</p>
                  <p className="font-extrabold uppercase underline">JHERICO MAURIN</p>
                  <p className="text-[9px] text-slate-500">Academic Coordinator</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-6">Approved by:</p>
                  <p className="font-extrabold uppercase underline">JUSTINE MANGILA, EdD</p>
                  <p className="text-[9px] text-slate-500">School Principal II</p>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 
        ========================================================================
        MODAL 2: PREVIEW OFFICIAL ADMIN SCHEDULE FILE MODAL
        ========================================================================
      */}
      {previewFile && (
        <Modal
          isOpen={Boolean(previewFile)}
          onClose={() => setPreviewFile(null)}
          title={previewFile ? previewFile.title : 'Official Faculty Schedule File'}
          subtitle={previewFile ? `Sent by ${previewFile.sentBy} • ${previewFile.sentAt}` : ''}
          maxWidth="2xl"
        >
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold text-slate-900" title={previewFile.fileName}>
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
                  onClick={handlePrintOfficialProgram}
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
                    {teachingLoads.map((slot, i) => (
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
        </Modal>
      )}
    </>
  );
};
