import React, { useEffect, useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Layers,
  GraduationCap,
  FileText,
  Download,
  Printer,
  Eye,
  ShieldCheck,
  CheckCircle2,
  Building2,
  FileCheck,
  Check,
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
  targetGradeLevel?: string;
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
    targetGradeLevel: 'All Year Levels',
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
    targetGradeLevel: 'All Year Levels',
    recipientType: 'all',
    recipientTeacherNames: ['All Faculty Teachers'],
    sentBy: 'School Registrar & Admin Office',
    sentAt: 'Oct 25, 2026 • 02:15 PM',
    notes:
      'Master timetable of Junior High School (Grades 7–10) and Senior High School (Grades 11–12) teaching periods and room allocations.',
  },
  {
    id: 'adm-sched-g7',
    title: 'Grade 7 Faculty Teaching Load & Class Program',
    fileName: 'PLSNHS_Grade7_Faculty_Schedule_Matrix_2026.pdf',
    fileSize: '410 KB',
    fileType: 'PDF',
    schoolYear: 'S.Y. 2026–2027',
    semester: '1st & 2nd Semester',
    targetGradeLevel: 'Grade 7',
    recipientType: 'selected',
    recipientTeacherNames: [
      'Mrs. Generale',
      'Mrs. Tapasao',
      'Mr. Selim',
      'Mrs. Baclayon',
      'Mrs. Manabat',
      'Mrs. Codelan',
      'Mrs. Llanda',
    ],
    sentBy: 'Office of the Principal • JHS Department',
    sentAt: 'Oct 28, 2026 • 09:00 AM',
    notes:
      'Certified Grade 7 teaching assignments, class advisory programs, and academic rooms (Bldg A).',
  },
  {
    id: 'adm-sched-g8',
    title: 'Grade 8 Faculty Teaching Load & Class Program',
    fileName: 'PLSNHS_Grade8_Faculty_Schedule_Matrix_2026.pdf',
    fileSize: '435 KB',
    fileType: 'PDF',
    schoolYear: 'S.Y. 2026–2027',
    semester: '1st & 2nd Semester',
    targetGradeLevel: 'Grade 8',
    recipientType: 'selected',
    recipientTeacherNames: [
      'Twengcle Deguma',
      'Ms. Alinsonorin',
      'Ms. Omambac',
      'Mr. Padillo',
      'Mr. Gonzaga',
      'Mrs. Rabanes',
      'Mrs. Montoya',
      'Mrs. Balwit',
    ],
    sentBy: 'Office of the Principal • JHS Department',
    sentAt: 'Oct 28, 2026 • 09:15 AM',
    notes:
      'Certified Grade 8 teaching programs, Science Lab schedules, and advisory room assignments (Bldg B).',
  },
  {
    id: 'adm-sched-g9',
    title: 'Grade 9 Faculty Teaching Load & Class Program',
    fileName: 'PLSNHS_Grade9_Faculty_Schedule_Matrix_2026.pdf',
    fileSize: '420 KB',
    fileType: 'PDF',
    schoolYear: 'S.Y. 2026–2027',
    semester: '1st & 2nd Semester',
    targetGradeLevel: 'Grade 9',
    recipientType: 'selected',
    recipientTeacherNames: [
      'Mrs. Francisco',
      'Mrs. Taruc',
      'Mr. Albores',
      'Mrs. Ogaob',
      'Mrs. Ramas',
      'Mrs. Rivera',
      'Ms. Bo-ok',
    ],
    sentBy: 'Office of the Principal • JHS Department',
    sentAt: 'Oct 28, 2026 • 09:30 AM',
    notes:
      'Certified Grade 9 teaching load, spiral science allocations, and advisory designations (Bldg C).',
  },
  {
    id: 'adm-sched-g10',
    title: 'Grade 10 Faculty Teaching Load & Class Program',
    fileName: 'PLSNHS_Grade10_Faculty_Schedule_Matrix_2026.pdf',
    fileSize: '450 KB',
    fileType: 'PDF',
    schoolYear: 'S.Y. 2026–2027',
    semester: '1st & 2nd Semester',
    targetGradeLevel: 'Grade 10',
    recipientType: 'selected',
    recipientTeacherNames: [
      'Ryan Quiroga',
      'Jherico Maurin',
      'Mrs. Paunel',
      'Mrs. Dela Torre',
      'Mr. Gentica',
      'Mrs. Rimas',
      'Mrs. Diaz',
    ],
    sentBy: 'Office of the Principal • JHS Department',
    sentAt: 'Oct 28, 2026 • 09:45 AM',
    notes:
      'Certified Grade 10 teaching schedule, Computer Lab hours, and JHS completion year advisory programs.',
  },
  {
    id: 'adm-sched-shs',
    title: 'Senior High School (Grades 11 & 12) Faculty Class Program & Strand Load',
    fileName: 'PLSNHS_SHS_Faculty_Schedule_Matrix_2026.pdf',
    fileSize: '490 KB',
    fileType: 'PDF',
    schoolYear: 'S.Y. 2026–2027',
    semester: '1st & 2nd Semester',
    targetGradeLevel: 'Grades 11 & 12 (SHS)',
    recipientType: 'selected',
    recipientTeacherNames: ['Teacher Santos', 'SHS Faculty'],
    sentBy: 'Office of the Principal • SHS Department',
    sentAt: 'Oct 28, 2026 • 10:00 AM',
    notes:
      'Official Senior High School teaching assignments across Academic (GAS, HUMSS, STEM) and TVL tracks.',
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
        subject: 'Integrated Science',
        grade_level: 'Grade 8',
        section: 'Molave',
        room: 'Rm 105 • JHS Bldg',
        role: 'Subject Load',
      },
      {
        period: '01:00 PM – 02:00 PM',
        days: 'Monday – Friday',
        subject: 'Earth and Life Science',
        grade_level: 'Grade 11',
        section: 'Aquino',
        strand: 'STEM',
        room: 'Sci Lab • SHS Bldg',
        role: 'Subject Load',
      },
      {
        period: '02:00 PM – 03:00 PM',
        days: 'Monday – Friday',
        subject: 'Physical Science',
        grade_level: 'Grade 12',
        section: 'Rizal',
        strand: 'STEM',
        room: 'Sci Lab • SHS Bldg',
        role: 'Subject Load',
      },
      {
        period: '03:00 PM – 04:00 PM',
        days: 'Monday – Friday',
        subject: 'Disaster Readiness & Risk Reduction',
        grade_level: 'Grade 11',
        section: 'Del Pilar',
        strand: 'GAS',
        room: 'Rm 109 • SHS Bldg',
        role: 'Subject Load',
      },
    ];
  }

  // General default program
  return [
    {
      period: '07:30 AM – 08:30 AM',
      days: 'Monday – Friday',
      subject: `${prof.specialization} (${prof.advisory_grade})`,
      grade_level: prof.advisory_grade,
      section: prof.advisory_section,
      room: prof.room,
      role: 'Advisory & Subject Load',
    },
    {
      period: '08:30 AM – 09:30 AM',
      days: 'Monday – Friday',
      subject: `${prof.specialization} (${prof.advisory_grade})`,
      grade_level: prof.advisory_grade,
      section: 'Batangas',
      room: 'Rm 201 • Bldg A',
      role: 'Subject Load',
    },
    {
      period: '10:00 AM – 11:00 AM',
      days: 'Monday – Friday',
      subject: `${prof.specialization} (${prof.advisory_grade})`,
      grade_level: prof.advisory_grade,
      section: 'Cebu',
      room: 'Rm 202 • JHS Bldg',
      role: 'Subject Load',
    },
    {
      period: '01:00 PM – 02:00 PM',
      days: 'Monday – Friday',
      subject: `${prof.specialization} Advanced`,
      grade_level: 'Grade 10',
      section: 'Generosity',
      room: 'Rm 301 • Bldg A',
      role: 'Subject Load',
    },
    {
      period: '02:00 PM – 03:00 PM',
      days: 'Monday – Friday',
      subject: `${prof.specialization} Advanced`,
      grade_level: 'Grade 10',
      section: 'Wisdom',
      room: 'Rm 305 • Bldg A',
      role: 'Subject Load',
    },
    {
      period: '03:00 PM – 04:00 PM',
      days: 'Monday – Friday',
      subject: `Applied ${prof.specialization}`,
      grade_level: 'Grade 11',
      section: 'Tolentino',
      strand: 'Academic',
      room: 'Rm 108 • SHS Bldg',
      role: 'Subject Load',
    },
  ];
};

/**
 * Generates an official, publication-quality DepEd Bond Paper HTML document.
 * Formatted specifically for Short Bond Paper (8.5" x 11") or Long Bond Paper (8.5" x 13").
 */
export const generateBondPaperHtml = (
  prof: FacultyProfileData,
  name: string,
  loads: TeachingLoadSlot[],
  paperSize: 'short' | 'long' = 'short'
): string => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const isLong = paperSize === 'long';
  const pageSizeRule = isLong
    ? '@page { size: 8.5in 13in; margin: 0.4in 0.45in 0.4in 0.45in; }'
    : '@page { size: 8.5in 11in; margin: 0.32in 0.42in 0.32in 0.42in; }';

  const rows = loads
    .map(
      (slot, i) => `
    <tr>
      <td style="text-align:center;font-weight:bold;border:1px solid #000;padding:3px 4px;">${i + 1}</td>
      <td style="font-family:monospace;font-weight:bold;border:1px solid #000;padding:3px 4px;white-space:nowrap;">${slot.period}</td>
      <td style="text-align:center;font-family:monospace;border:1px solid #000;padding:3px 4px;">60</td>
      <td style="text-align:center;font-weight:bold;border:1px solid #000;padding:3px 4px;">M – F</td>
      <td style="border:1px solid #000;padding:3px 4px;">
        <strong>${slot.subject}</strong>
        ${
          slot.role === 'Advisory & Subject Load'
            ? '<span style="display:block;font-size:6.8pt;color:#1e3a8a;font-weight:bold;text-transform:uppercase;">★ Designated Advisory Section Subject</span>'
            : ''
        }
      </td>
      <td style="border:1px solid #000;padding:3px 4px;font-weight:bold;">
        ${slot.grade_level} – ${slot.section}${slot.strand ? ` (${slot.strand})` : ''}
      </td>
      <td style="border:1px solid #000;padding:3px 4px;">${slot.room}</td>
      <td style="text-align:right;font-family:monospace;font-weight:bold;border:1px solid #000;padding:3px 4px;white-space:nowrap;">
        300 mins (5h)
      </td>
    </tr>
  `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>DepEd Class Program - ${name} (${isLong ? 'LONG BOND PAPER' : 'SHORT BOND PAPER'})</title>
  <style>
    ${pageSizeRule}
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      font-size: ${isLong ? '8.8pt' : '8.2pt'};
      line-height: 1.25;
    }
    .bond-sheet {
      width: 100%;
      max-width: ${isLong ? '7.7in' : '7.6in'};
      margin: 0 auto;
      background: #ffffff;
      padding: 0;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 2px;
    }
    .header-table td {
      padding: 0;
      vertical-align: middle;
    }
    .header-center {
      text-align: center;
      padding: 0 8px;
    }
    .header-center .rep {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
      color: #1e293b;
    }
    .header-center .deped {
      font-size: 10pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 1px 0;
      color: #000000;
    }
    .header-center .division {
      font-size: 7.8pt;
      margin: 1px 0;
      color: #334155;
    }
    .header-center .school {
      font-size: 11.5pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 2px 0 1px 0;
      font-family: Georgia, serif;
      color: #000000;
    }
    .header-center .address {
      font-size: 7.2pt;
      margin: 0;
      color: #475569;
    }
    .logo-container {
      width: 64px;
      text-align: center;
    }
    .logo-img {
      width: 58px;
      height: 58px;
      object-fit: contain;
      border-radius: 50%;
    }
    .deped-seal-box {
      width: 58px;
      height: 58px;
      border: 1.5px solid #000000;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      font-family: Georgia, serif;
      margin: 0 auto;
    }
    .deped-seal-title {
      font-size: 7pt;
      font-weight: 900;
      line-height: 1;
    }
    .deped-seal-sub {
      font-size: 5.5pt;
      line-height: 1.1;
      text-transform: uppercase;
    }
    .double-rule-top {
      border: 0;
      border-top: 2px solid #000000;
      margin: 3px 0 1px 0;
    }
    .double-rule-bottom {
      border: 0;
      border-top: 0.75px solid #000000;
      margin: 0 0 4px 0;
    }
    .title-banner {
      background-color: #f1f5f9;
      border: 1px solid #000000;
      padding: 4px 6px;
      text-align: center;
      margin-bottom: 4px;
    }
    .title-banner h2 {
      margin: 0;
      font-size: 9.5pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000000;
    }
    .title-banner .sy {
      margin: 1px 0 0 0;
      font-size: 8pt;
      font-weight: 700;
      color: #0f172a;
    }
    .title-banner .mandate {
      margin: 0;
      font-size: 6.8pt;
      color: #475569;
      font-style: italic;
    }
    .profile-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000000;
      margin-bottom: 4px;
      font-size: 7.8pt;
    }
    .profile-table td {
      border: 1px solid #cbd5e1;
      padding: 2.5px 5px;
      vertical-align: middle;
    }
    .profile-label {
      font-weight: bold;
      color: #334155;
      text-transform: uppercase;
      width: 110px;
    }
    .profile-val {
      font-weight: 800;
      color: #000000;
    }
    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-bottom: 4px;
      font-size: 7.8pt;
    }
    .schedule-table th {
      background-color: #f1f5f9;
      border: 1px solid #000000;
      padding: 3px 4px;
      font-weight: 900;
      text-transform: uppercase;
      font-size: 7.2pt;
      text-align: center;
    }
    .schedule-table td {
      border: 1px solid #000000;
      padding: 2.5px 4px;
      line-height: 1.2;
    }
    .routine-row td {
      background-color: #f8fafc;
      font-style: italic;
      color: #475569;
      font-weight: 600;
      font-size: 7.2pt;
    }
    .workload-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #000000;
      margin-bottom: 4px;
      font-size: 7.2pt;
    }
    .workload-table th {
      background-color: #f1f5f9;
      border: 1px solid #000000;
      padding: 2.5px 5px;
      font-weight: 800;
      text-transform: uppercase;
      text-align: left;
    }
    .workload-table td {
      border: 1px solid #cbd5e1;
      padding: 2px 5px;
    }
    .workload-total td {
      background-color: #f1f5f9;
      font-weight: 900;
      color: #000000;
      border-top: 1px solid #000000;
    }
    .attestation-box {
      border: 1px solid #000000;
      padding: 3.5px 6px;
      font-size: 6.8pt;
      line-height: 1.25;
      text-align: justify;
      background-color: #fafafa;
      margin-bottom: 4px;
      color: #1e293b;
    }
    .signatories-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
      font-size: 7.5pt;
    }
    .signatories-table td {
      width: 25%;
      text-align: center;
      vertical-align: top;
      padding: 0 4px;
    }
    .sign-label {
      font-size: 6.8pt;
      color: #475569;
      text-transform: uppercase;
      font-weight: bold;
      margin-bottom: 24px;
    }
    .sign-name {
      font-weight: 900;
      font-size: 7.5pt;
      text-transform: uppercase;
      border-bottom: 1.5px solid #000000;
      padding-bottom: 1px;
      margin-bottom: 1px;
      color: #000000;
    }
    .sign-title {
      font-size: 6.8pt;
      color: #334155;
      line-height: 1.1;
    }
    .security-bar {
      margin-top: 5px;
      padding-top: 3px;
      border-top: 1px dashed #94a3b8;
      display: flex;
      justify-content: space-between;
      font-size: 6.5pt;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="bond-sheet">
    <!-- DepEd Official Letterhead -->
    <table class="header-table">
      <tr>
        <td class="logo-container">
          <img src="/pictures/logo sa skwelahan.png" alt="PLSNHS Logo" class="logo-img" />
        </td>
        <td class="header-center">
          <p class="rep">Republic of the Philippines • Republika ng Pilipinas</p>
          <p class="deped">Department of Education • Kagawaran ng Edukasyon</p>
          <p class="division">Region VII, Central Visayas • Schools Division of Cebu Province • District of Boljoon</p>
          <h1 class="school">PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL</h1>
          <p class="address">Langub, Boljoon, Cebu • DepEd School ID: <strong>303035</strong></p>
        </td>
        <td class="logo-container">
          <div class="deped-seal-box">
            <span class="deped-seal-title">DEPED</span>
            <span class="deped-seal-sub">Region VII</span>
          </div>
        </td>
      </tr>
    </table>

    <hr class="double-rule-top" />
    <hr class="double-rule-bottom" />

    <!-- Form Title Banner -->
    <div class="title-banner">
      <h2>TEACHER'S INDIVIDUAL CLASS PROGRAM &amp; TEACHING LOAD</h2>
      <p class="sy">School Year 2026–2027 • First &amp; Second Semesters</p>
      <p class="mandate">
        In Compliance with DepEd Order No. 31, s. 2012 &amp; Republic Act No. 4670 (Magna Carta for Public School Teachers)
      </p>
    </div>

    <!-- Teacher Profile Information -->
    <table class="profile-table">
      <tr>
        <td class="profile-label">Faculty Teacher:</td>
        <td class="profile-val" style="text-transform:uppercase;">${name}</td>
        <td class="profile-label">Advisory Section:</td>
        <td class="profile-val">${prof.advisory_grade} – Section ${prof.advisory_section}</td>
      </tr>
      <tr>
        <td class="profile-label">DepEd Employee ID:</td>
        <td class="profile-val" style="font-family:monospace;">${prof.employee_id}</td>
        <td class="profile-label">Designated Room:</td>
        <td class="profile-val">${prof.room}</td>
      </tr>
      <tr>
        <td class="profile-label">Civil Service Rank:</td>
        <td class="profile-val">${prof.position}</td>
        <td class="profile-label">Appointment Status:</td>
        <td class="profile-val">Permanent / Regular Full-Time</td>
      </tr>
      <tr>
        <td class="profile-label">Specialization:</td>
        <td class="profile-val">${prof.specialization}</td>
        <td class="profile-label">Official Work Hours:</td>
        <td class="profile-val">07:30 AM – 04:30 PM (Monday – Friday)</td>
      </tr>
    </table>

    <!-- Weekly Class Program Timetable -->
    <table class="schedule-table">
      <thead>
        <tr>
          <th style="width:26px;">#</th>
          <th style="width:130px;">Time Period</th>
          <th style="width:50px;">Mins/Day</th>
          <th style="width:55px;">Days</th>
          <th>Subject / Learning Area</th>
          <th>Grade Level &amp; Section</th>
          <th style="width:115px;">Room</th>
          <th style="width:85px;text-align:right;">Weekly Load</th>
        </tr>
      </thead>
      <tbody>
        <!-- Flag Ceremony Routine -->
        <tr class="routine-row">
          <td style="text-align:center;">•</td>
          <td style="font-family:monospace;white-space:nowrap;">07:15 AM – 07:30 AM</td>
          <td style="text-align:center;font-family:monospace;">15</td>
          <td style="text-align:center;">M – F</td>
          <td colspan="3">Flag Raising Ceremony &amp; Morning Preliminaries</td>
          <td style="text-align:right;font-family:monospace;">75 mins</td>
        </tr>

        <!-- Instructional Loads -->
        ${rows}

        <!-- Homeroom Advisory Routine -->
        <tr class="routine-row">
          <td style="text-align:center;">•</td>
          <td style="font-family:monospace;white-space:nowrap;">11:00 AM – 12:00 PM</td>
          <td style="text-align:center;font-family:monospace;">60</td>
          <td style="text-align:center;">M – F</td>
          <td><strong>Homeroom Guidance / Remediation / Catch-Up</strong></td>
          <td style="font-weight:bold;">${prof.advisory_grade} – ${prof.advisory_section}</td>
          <td>${prof.room}</td>
          <td style="text-align:right;font-family:monospace;">300 mins</td>
        </tr>

        <!-- Lunch Routine -->
        <tr class="routine-row">
          <td style="text-align:center;">•</td>
          <td style="font-family:monospace;white-space:nowrap;">12:00 PM – 01:00 PM</td>
          <td style="text-align:center;font-family:monospace;">60</td>
          <td style="text-align:center;">M – F</td>
          <td colspan="3">Noon Break / Health &amp; Lunch Intermission</td>
          <td style="text-align:right;font-family:monospace;">—</td>
        </tr>

        <!-- Ancillary Routine -->
        <tr class="routine-row">
          <td style="text-align:center;">•</td>
          <td style="font-family:monospace;white-space:nowrap;">04:00 PM – 04:30 PM</td>
          <td style="text-align:center;font-family:monospace;">30</td>
          <td style="text-align:center;">M – F</td>
          <td colspan="3">Lesson Preparation, Assessment Records &amp; Ancillary Services</td>
          <td style="text-align:right;font-family:monospace;">150 mins</td>
        </tr>
      </tbody>
    </table>

    <!-- Workload Allocation Summary -->
    <table class="workload-table">
      <thead>
        <tr>
          <th>Workload Allocation Component</th>
          <th style="text-align:center;width:110px;">Daily Equivalent</th>
          <th style="text-align:center;width:110px;">Weekly Total</th>
          <th>DepEd Statutory Compliance Basis</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>A. Actual Classroom Instructional Load</strong> (6 Classes)</td>
          <td style="text-align:center;font-family:monospace;">4.8 Hours / Day</td>
          <td style="text-align:center;font-family:monospace;font-weight:bold;">24.0 Hours / Week</td>
          <td>RA 4670 (Max 6.0 hrs/day instructional teaching)</td>
        </tr>
        <tr>
          <td><strong>B. Homeroom Advisory, Guidance &amp; Remediation</strong></td>
          <td style="text-align:center;font-family:monospace;">1.2 Hours / Day</td>
          <td style="text-align:center;font-family:monospace;font-weight:bold;">6.0 Hours / Week</td>
          <td>DepEd Order No. 31, s. 2012 Standard</td>
        </tr>
        <tr>
          <td><strong>C. Lesson Preparation, Records &amp; Ancillary Duties</strong></td>
          <td style="text-align:center;font-family:monospace;">2.0 Hours / Day</td>
          <td style="text-align:center;font-family:monospace;font-weight:bold;">10.0 Hours / Week</td>
          <td>Civil Service Commission (CSC) Working Standards</td>
        </tr>
        <tr class="workload-total">
          <td>TOTAL OFFICIAL WORKING HOURS:</td>
          <td style="text-align:center;font-family:monospace;">8.0 Hours / Day</td>
          <td style="text-align:center;font-family:monospace;">40.0 Hours / Week</td>
          <td style="font-weight:bold;color:#1e3a8a;">✓ 100% DepEd Full-Time Standard Compliant</td>
        </tr>
      </tbody>
    </table>

    <!-- DepEd Attestation Clause -->
    <div class="attestation-box">
      <strong>OFFICIAL ATTESTATION:</strong> I hereby certify that the individual teaching loads, room assignments, advisory designations, and official working hours detailed in this form have been duly assigned to me for School Year 2026–2027. I attest that I shall discharge my duties in accordance with the prescribed Department of Education curriculum and the Code of Ethics for Professional Teachers.
    </div>

    <!-- Official Four-Tier DepEd Signatories Block -->
    <table class="signatories-table">
      <tr>
        <td>
          <div class="sign-label">Conformed &amp; Submitted by:</div>
          <div class="sign-name">${name}</div>
          <div class="sign-title">Teacher / Class Adviser</div>
          <div class="sign-title" style="font-size:6pt;color:#64748b;">Date: ${currentDate}</div>
        </td>
        <td>
          <div class="sign-label">Checked &amp; Verified by:</div>
          <div class="sign-name">JHERICO MAURIN</div>
          <div class="sign-title">Academic Coordinator / MT I</div>
          <div class="sign-title" style="font-size:6pt;color:#64748b;">Date: ${currentDate}</div>
        </td>
        <td>
          <div class="sign-label">Recommending Approval:</div>
          <div class="sign-name">JUSTINE MANGILA, EdD</div>
          <div class="sign-title">Secondary School Principal II</div>
          <div class="sign-title" style="font-size:6pt;color:#64748b;">PLSNHS School Head</div>
        </td>
        <td>
          <div class="sign-label">Approved:</div>
          <div class="sign-name">SENEN PRISCILLO P. PAULIN, CESO V</div>
          <div class="sign-title">Schools Division Superintendent</div>
          <div class="sign-title" style="font-size:6pt;color:#64748b;">DepEd Cebu Province</div>
        </td>
      </tr>
    </table>

    <!-- Security & Reference Footer -->
    <div class="security-bar">
      <span>Placido L. Señor National High School • School ID: 303035</span>
      <span style="font-family:monospace;">Ref: PLSNHS-SF7-TCP-2026-08 • Official DepEd Form</span>
      <span>${isLong ? 'Long Bond Paper (8.5" × 13")' : 'Short Bond Paper (8.5" × 11")'} • Page 1 of 1</span>
    </div>
  </div>
</body>
</html>`;
};

export const TeacherClassProgramPage: React.FC = () => {
  const { user } = useAuth();
  const [adminFiles, setAdminFiles] = useState<AdminSentTeacherScheduleFile[]>([]);
  const [previewFile, setPreviewFile] = useState<AdminSentTeacherScheduleFile | null>(null);
  const [isOfficialDocModalOpen, setIsOfficialDocModalOpen] = useState(false);
  const [paperSize, setPaperSize] = useState<'short' | 'long'>('short');

  // Resolved teacher display name
  const teacherName = useMemo(() => {
    if (user?.first_name || user?.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user?.email ? user.email.split('@')[0] : 'Mrs. Ramas';
  }, [user]);

  // Dynamic faculty profile
  const facultyProfile = useMemo(() => {
    return getTeacherProfileData(teacherName);
  }, [teacherName]);

  // Load admin schedule files
  useEffect(() => {
    const loadFiles = () => {
      try {
        const raw = localStorage.getItem(ADMIN_TEACHER_SCHEDULE_FILES_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAdminFiles(parsed);
            return;
          }
        }
      } catch (e) {
        console.warn('Failed parsing local admin teacher schedule files:', e);
      }
      setAdminFiles(DEFAULT_ADMIN_TEACHER_SCHEDULE_FILES);
    };

    loadFiles();

    const handleStorage = (e: StorageEvent | CustomEvent) => {
      if ('key' in e && e.key && e.key !== ADMIN_TEACHER_SCHEDULE_FILES_KEY) return;
      loadFiles();
    };

    window.addEventListener('storage', handleStorage as EventListener);
    window.addEventListener('plsnhs-schedule-files-updated', handleStorage as EventListener);

    async function loadSupabaseWorkloads() {
      try {
        const { data: workloads, error } = await supabase
          .from('teacher_workloads')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && workloads && workloads.length > 0) {
          const sbFiles: AdminSentTeacherScheduleFile[] = workloads.map((tw: any) => {
            const isPersonal = tw.teacher_id && user?.id && String(tw.teacher_id) === String(user.id);
            return {
              id: `sb-tw-${tw.id}`,
              title: tw.title || 'Official Faculty Class Program & Workload',
              fileName: tw.file_name || 'Faculty_Teaching_Schedule.pdf',
              fileSize: tw.file_size ? `${Math.round(tw.file_size / 1024)} KB` : '480 KB',
              fileType: tw.file_type?.includes('image') ? 'IMAGE' : 'PDF',
              fileDataUrl: tw.file_url,
              schoolYear: 'S.Y. 2026–2027',
              semester: 'Full Academic Year',
              recipientType: tw.teacher_id ? 'selected' : 'all',
              recipientTeacherNames: isPersonal
                ? [teacherName]
                : tw.teacher_name
                ? [tw.teacher_name]
                : ['All Faculty Teachers'],
              sentBy: tw.uploaded_by || 'Admin Office',
              sentAt: new Date(tw.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }),
              notes: 'Official DepEd teaching assignment and class program document.',
            };
          });

          setAdminFiles((prev) => {
            const existingIds = new Set(prev.map((f) => f.id));
            const newFiles = sbFiles.filter((f) => !existingIds.has(f.id));
            return [...newFiles, ...prev];
          });
        }

        // Also query teachers table for direct teacher_load_url
        if (user?.id) {
          const { data: teacherRow } = await supabase
            .from('teachers')
            .select(
              'teacher_load_url, teacher_load_name, teacher_load_file_type, teacher_load_updated_at'
            )
            .eq('user_id', user.id)
            .maybeSingle();

          if (teacherRow?.teacher_load_url && teacherRow?.teacher_load_name) {
            const directFile: AdminSentTeacherScheduleFile = {
              id: `direct-teacher-load-${user.id}`,
              title: 'Official Faculty Teaching Schedule & Class Program',
              fileName: teacherRow.teacher_load_name,
              fileSize: '480 KB',
              fileType: teacherRow.teacher_load_file_type || 'PDF',
              fileDataUrl: teacherRow.teacher_load_url,
              schoolYear: 'S.Y. 2026–2027',
              semester: '1st & 2nd Semester',
              recipientType: 'selected',
              recipientTeacherNames: [teacherName],
              sentBy: 'School Administrator • Office of the Principal',
              sentAt: teacherRow.teacher_load_updated_at
                ? new Date(teacherRow.teacher_load_updated_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recent',
              notes:
                'Official DepEd teaching assignment and schedule file attached by School Administration.',
            };

            setAdminFiles((prev) => [
              directFile,
              ...prev.filter((f) => f.id !== directFile.id),
            ]);
          }
        }
      } catch (err) {
        console.warn('Teacher workloads fetch warning:', err);
      }
    }
    loadSupabaseWorkloads();

    return () => {
      window.removeEventListener('storage', handleStorage as EventListener);
      window.removeEventListener('plsnhs-schedule-files-updated', handleStorage as EventListener);
    };
  }, [user, teacherName]);

  // Filter schedule files relevant to this logged-in teacher
  const myReceivedScheduleFiles = useMemo(() => {
    return adminFiles.filter((file) => {
      if (file.recipientType === 'all') return true;
      if (user?.id && String(file.id).includes(String(user.id))) return true;
      return file.recipientTeacherNames.some(
        (name) =>
          name.toLowerCase().includes(teacherName.toLowerCase().split(' ')[0]) ||
          teacherName.toLowerCase().includes(name.toLowerCase().split(' ')[0])
      );
    });
  }, [adminFiles, teacherName, user]);

  // Generate personalized teaching loads
  const teachingLoads = useMemo(() => {
    return generateTeachingLoads(facultyProfile);
  }, [facultyProfile]);

  /**
   * Dedicated print function that isolates the bond paper document in an invisible iframe.
   * Guarantees 0% interference from web sidebars, web headers, buttons, or scrollbars.
   */
  const handlePrintBondPaper = (selectedSize: 'short' | 'long' = paperSize) => {
    const html = generateBondPaperHtml(facultyProfile, teacherName, teachingLoads, selectedSize);

    const iframe = document.createElement('iframe');
    iframe.id = 'bond_paper_print_frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print error, falling back:', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 400);
  };

  /**
   * Download the official Bond Paper document as standalone HTML
   */
  const handleDownloadBondPaperHtml = (selectedSize: 'short' | 'long' = paperSize) => {
    const html = generateBondPaperHtml(facultyProfile, teacherName, teachingLoads, selectedSize);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PLSNHS_Class_Program_${facultyProfile.employee_id}_${selectedSize.toUpperCase()}_BOND_PAPER.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download schedule file
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
    handleDownloadBondPaperHtml(paperSize);
  };

  return (
    <>
      {/* 
        ========================================================================
        GLOBAL PRINT STYLES FOR NATIVE CTRL+P SHORTCUT
        Hides all web interface elements and exposes strictly the bond paper sheet.
        ========================================================================
      */}
      <style>{`
        @page {
          size: ${paperSize === 'long' ? '8.5in 13in' : '8.5in 11in'};
          margin: 0.35in 0.45in 0.35in 0.45in;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
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
          #bond-paper-print-sheet {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            max-width: ${paperSize === 'long' ? '7.7in' : '7.6in'} !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
        }
      `}</style>

      {/* 
        ========================================================================
        WEB VIEW CONTAINER (Visible on Screen, Hidden during Native Print)
        ========================================================================
      */}
      <div className="no-print space-y-6 animate-fade-in pb-12">
        {/* Page Header */}
        <div className="border-b border-slate-200 pb-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                  <FileCheck className="h-3.5 w-3.5 text-emerald-700" />
                  Official DepEd Document
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  S.Y. 2026–2027 • Placido L. Señor National High School
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-display tracking-tight leading-snug">
                Faculty Teaching Program &amp; Workload
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                Official Department of Education teacher class program formatted for standard bond paper printing.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 pt-0.5 flex-wrap">
              <PageHeaderNotificationSlot />
            </div>
          </div>
        </div>

        {/* 
          ========================================================================
          BOND PAPER ACTION & FORMAT SELECTION BAR
          ========================================================================
        */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Paper Size Selector */}
            <div className="space-y-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                DepEd Bond Paper Size:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPaperSize('short')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    paperSize === 'short'
                      ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-600 ring-offset-1'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Short Bond Paper</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-mono ${
                      paperSize === 'short' ? 'bg-emerald-900 text-emerald-100' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    8.5&quot; × 11&quot;
                  </span>
                  {paperSize === 'short' && <Check className="h-3.5 w-3.5 text-emerald-200 ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setPaperSize('long')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                    paperSize === 'long'
                      ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-600 ring-offset-1'
                      : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Long Bond Paper</span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[10px] font-mono ${
                      paperSize === 'long' ? 'bg-emerald-900 text-emerald-100' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    8.5&quot; × 13&quot;
                  </span>
                  {paperSize === 'long' && <Check className="h-3.5 w-3.5 text-emerald-200 ml-0.5" />}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => setIsOfficialDocModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs"
              >
                <Eye className="h-4 w-4 text-emerald-700" />
                Preview Full Screen
              </button>

              <button
                type="button"
                onClick={() => handleDownloadBondPaperHtml(paperSize)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                title="Download Standalone Printable HTML"
              >
                <Download className="h-4 w-4 text-slate-600" />
                Download Document
              </button>

              <button
                type="button"
                onClick={() => handlePrintBondPaper(paperSize)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 text-xs font-extrabold shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4 text-white" />
                <span>Print on Bond Paper</span>
                <span className="rounded bg-emerald-900/60 px-1.5 py-0.5 text-[10px] uppercase font-mono font-bold tracking-tight">
                  {paperSize === 'short' ? '8.5×11' : '8.5×13'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 
          ========================================================================
          AUTHENTIC DEPED BOND PAPER SHEET SIMULATION (On-Screen Interactive)
          ========================================================================
        */}
        <div className="rounded-3xl border border-slate-300 bg-slate-200/70 p-3 sm:p-6 lg:p-8 shadow-inner flex flex-col items-center">
          <div className="w-full max-w-[820px] mb-3 flex items-center justify-between text-xs text-slate-600 px-1">
            <span className="font-bold flex items-center gap-1.5">
              <FileCheck className="h-4 w-4 text-emerald-700" />
              DepEd Bond Paper Preview ({paperSize === 'short' ? 'Short 8.5" × 11"' : 'Long 8.5" × 13"'})
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              Ready for Print • 100% DepEd RA 4670 Compliant
            </span>
          </div>

          {/* Realistic Bond Paper Sheet */}
          <div className="w-full max-w-[820px] rounded-xs bg-white p-5 sm:p-8 lg:p-10 shadow-2xl ring-1 ring-slate-300 text-slate-900 font-sans transition-all">
            {/* Header */}
            <div className="text-center pb-2 border-b-2 border-slate-900">
              <div className="flex items-center justify-between gap-3">
                {/* School Logo */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
                  <img
                    src="/pictures/logo sa skwelahan.png"
                    alt="PLSNHS Logo"
                    className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded-full shadow-2xs"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Central Letterhead */}
                <div className="flex-1 px-1 sm:px-2 text-center">
                  <p className="text-[8pt] sm:text-[9pt] uppercase tracking-wider font-semibold text-slate-700 leading-tight">
                    Republic of the Philippines • Republika ng Pilipinas
                  </p>
                  <p className="text-[9.5pt] sm:text-[11pt] uppercase font-black text-slate-950 leading-tight mt-0.5">
                    Department of Education • Kagawaran ng Edukasyon
                  </p>
                  <p className="text-[7.5pt] sm:text-[8.5pt] text-slate-700 leading-tight mt-0.5">
                    Region VII, Central Visayas • Schools Division of Cebu Province • District of Boljoon
                  </p>
                  <h2 className="text-[11pt] sm:text-[13pt] font-black uppercase tracking-wide text-slate-950 mt-1 leading-tight font-serif">
                    PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL
                  </h2>
                  <p className="text-[7pt] sm:text-[8pt] text-slate-600 leading-tight mt-0.5">
                    Langub, Boljoon, Cebu • School Identification Number (ID): <strong>303035</strong>
                  </p>
                </div>

                {/* DepEd Seal Box */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-slate-900 flex flex-col items-center justify-center text-center p-1 font-serif">
                    <span className="text-[6.5pt] sm:text-[7.5pt] font-black uppercase leading-none">DEPED</span>
                    <span className="text-[5.5pt] sm:text-[6.5pt] leading-tight">Region VII</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Double Border Rule */}
            <div className="border-b border-slate-900 mt-0.5 mb-2.5" />

            {/* Form Title Banner */}
            <div className="text-center py-2 bg-slate-100 border border-slate-900 mb-2.5">
              <h3 className="text-[9.5pt] sm:text-[11pt] font-black uppercase tracking-wider text-slate-950 leading-tight">
                TEACHER'S INDIVIDUAL CLASS PROGRAM &amp; TEACHING LOAD
              </h3>
              <p className="text-[8pt] sm:text-[9pt] font-bold text-slate-800 mt-0.5">
                School Year 2026–2027 • First &amp; Second Semesters
              </p>
              <p className="text-[6.8pt] sm:text-[7.5pt] text-slate-600 italic mt-0.5">
                In Strict Compliance with DepEd Order No. 31, s. 2012 &amp; Republic Act No. 4670 (Magna Carta for Public School Teachers)
              </p>
            </div>

            {/* Faculty Profile Matrix Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 border border-slate-900 text-[8pt] sm:text-[8.5pt] mb-2.5 bg-white">
              <div className="p-2 sm:p-2.5 border-b sm:border-b-0 sm:border-r border-slate-900 space-y-1">
                <div className="flex">
                  <span className="w-28 sm:w-32 font-bold text-slate-600 uppercase text-[7.5pt]">Faculty Teacher:</span>
                  <span className="font-extrabold text-slate-950 uppercase">{teacherName}</span>
                </div>
                <div className="flex">
                  <span className="w-28 sm:w-32 font-bold text-slate-600 uppercase text-[7.5pt]">Employee ID:</span>
                  <span className="font-mono font-bold text-slate-900">{facultyProfile.employee_id}</span>
                </div>
                <div className="flex">
                  <span className="w-28 sm:w-32 font-bold text-slate-600 uppercase text-[7.5pt]">Civil Service Rank:</span>
                  <span className="font-semibold text-slate-900">{facultyProfile.position}</span>
                </div>
                <div className="flex">
                  <span className="w-28 sm:w-32 font-bold text-slate-600 uppercase text-[7.5pt]">Specialization:</span>
                  <span className="font-bold text-slate-900">{facultyProfile.specialization}</span>
                </div>
              </div>

              <div className="p-2 sm:p-2.5 space-y-1">
                <div className="flex">
                  <span className="w-28 sm:w-32 font-bold text-slate-600 uppercase text-[7.5pt]">Advisory Section:</span>
                  <span className="font-extrabold text-slate-950">
                    {facultyProfile.advisory_grade} – Section {facultyProfile.advisory_section}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-28 sm:w-32 font-bold text-slate-600 uppercase text-[7.5pt]">Designated Room:</span>
                  <span className="font-semibold text-slate-900">{facultyProfile.room}</span>
                </div>
                <div className="flex">
                  <span className="w-28 sm:w-32 font-bold text-slate-600 uppercase text-[7.5pt]">Status:</span>
                  <span className="font-semibold text-slate-900">Permanent Regular Full-Time</span>
                </div>
                <div className="flex">
                  <span className="w-28 sm:w-32 font-bold text-slate-600 uppercase text-[7.5pt]">Official Hours:</span>
                  <span className="font-semibold text-slate-900">07:30 AM – 04:30 PM (M–F)</span>
                </div>
              </div>
            </div>

            {/* Schedule Timetable */}
            <div className="border border-slate-900 mb-2.5 overflow-x-auto">
              <table className="w-full text-left text-[7.8pt] sm:text-[8.2pt] border-collapse">
                <thead className="bg-slate-100 text-slate-950 uppercase font-black text-[7.2pt] sm:text-[7.8pt] border-b border-slate-900">
                  <tr>
                    <th className="p-1.5 border-r border-slate-900 text-center w-7">#</th>
                    <th className="p-1.5 border-r border-slate-900 w-32 whitespace-nowrap">Time Period</th>
                    <th className="p-1.5 border-r border-slate-900 text-center w-14">Mins</th>
                    <th className="p-1.5 border-r border-slate-900 text-center w-14">Days</th>
                    <th className="p-1.5 border-r border-slate-900">Learning Area / Subject</th>
                    <th className="p-1.5 border-r border-slate-900">Grade &amp; Section</th>
                    <th className="p-1.5 border-r border-slate-900">Room</th>
                    <th className="p-1.5 text-right w-24">Weekly Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  <tr className="bg-slate-50 italic text-slate-600 text-[7.5pt]">
                    <td className="p-1.5 border-r border-slate-900 text-center">•</td>
                    <td className="p-1.5 border-r border-slate-900 font-mono whitespace-nowrap">07:15 AM – 07:30 AM</td>
                    <td className="p-1.5 border-r border-slate-900 text-center font-mono">15</td>
                    <td className="p-1.5 border-r border-slate-900 text-center">M – F</td>
                    <td colSpan={3} className="p-1.5 border-r border-slate-900">
                      Flag Raising Ceremony &amp; Morning Rituals
                    </td>
                    <td className="p-1.5 text-right font-mono">75 mins</td>
                  </tr>

                  {teachingLoads.map((slot, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-1.5 border-r border-slate-900 text-center font-bold">{i + 1}</td>
                      <td className="p-1.5 border-r border-slate-900 font-mono font-bold whitespace-nowrap">
                        {slot.period}
                      </td>
                      <td className="p-1.5 border-r border-slate-900 text-center font-mono">60</td>
                      <td className="p-1.5 border-r border-slate-900 text-center font-bold">M – F</td>
                      <td className="p-1.5 border-r border-slate-900 font-bold">
                        {slot.subject}
                        {slot.role === 'Advisory & Subject Load' && (
                          <span className="block text-[7pt] font-extrabold text-blue-800 uppercase">
                            ★ Designated Advisory Subject
                          </span>
                        )}
                      </td>
                      <td className="p-1.5 border-r border-slate-900 font-bold">
                        {slot.grade_level} – {slot.section}
                        {slot.strand ? ` (${slot.strand})` : ''}
                      </td>
                      <td className="p-1.5 border-r border-slate-900 text-slate-700">{slot.room}</td>
                      <td className="p-1.5 text-right font-mono font-bold whitespace-nowrap">300 mins (5h)</td>
                    </tr>
                  ))}

                  <tr className="bg-slate-50 italic text-slate-600 text-[7.5pt]">
                    <td className="p-1.5 border-r border-slate-900 text-center">•</td>
                    <td className="p-1.5 border-r border-slate-900 font-mono whitespace-nowrap">11:00 AM – 12:00 PM</td>
                    <td className="p-1.5 border-r border-slate-900 text-center font-mono">60</td>
                    <td className="p-1.5 border-r border-slate-900 text-center">M – F</td>
                    <td className="p-1.5 border-r border-slate-900 font-bold not-italic text-slate-800">
                      Homeroom Guidance / Remediation / Catch-Up
                    </td>
                    <td className="p-1.5 border-r border-slate-900 font-bold not-italic">
                      {facultyProfile.advisory_grade} – {facultyProfile.advisory_section}
                    </td>
                    <td className="p-1.5 border-r border-slate-900">{facultyProfile.room}</td>
                    <td className="p-1.5 text-right font-mono">300 mins</td>
                  </tr>

                  <tr className="bg-slate-50 italic text-slate-600 text-[7.5pt]">
                    <td className="p-1.5 border-r border-slate-900 text-center">•</td>
                    <td className="p-1.5 border-r border-slate-900 font-mono whitespace-nowrap">12:00 PM – 01:00 PM</td>
                    <td className="p-1.5 border-r border-slate-900 text-center font-mono">60</td>
                    <td className="p-1.5 border-r border-slate-900 text-center">M – F</td>
                    <td colSpan={3} className="p-1.5 border-r border-slate-900">
                      Noon Break / Health &amp; Lunch Intermission
                    </td>
                    <td className="p-1.5 text-right font-mono">—</td>
                  </tr>

                  <tr className="bg-slate-50 italic text-slate-600 text-[7.5pt]">
                    <td className="p-1.5 border-r border-slate-900 text-center">•</td>
                    <td className="p-1.5 border-r border-slate-900 font-mono whitespace-nowrap">04:00 PM – 04:30 PM</td>
                    <td className="p-1.5 border-r border-slate-900 text-center font-mono">30</td>
                    <td className="p-1.5 border-r border-slate-900 text-center">M – F</td>
                    <td colSpan={3} className="p-1.5 border-r border-slate-900">
                      Lesson Preparation, Assessment Records &amp; Ancillary Services
                    </td>
                    <td className="p-1.5 text-right font-mono">150 mins</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Workload Allocation Box */}
            <div className="border border-slate-900 p-2 sm:p-2.5 bg-slate-50 mb-2.5">
              <p className="text-[7.8pt] sm:text-[8.5pt] font-black uppercase tracking-wider text-slate-900 mb-1">
                Summary of Workload Allocation &amp; Time Distribution (RA 4670 Magna Carta Standard)
              </p>
              <table className="w-full text-left text-[7.5pt] sm:text-[8pt] border border-slate-400 bg-white">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-400 font-bold">
                    <th className="p-1 border-r border-slate-400">Workload Allocation Component</th>
                    <th className="p-1 border-r border-slate-400 text-center">Daily Equivalent</th>
                    <th className="p-1 border-r border-slate-400 text-center">Weekly Total</th>
                    <th className="p-1">Statutory Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  <tr>
                    <td className="p-1 border-r border-slate-400 font-bold">
                      A. Actual Classroom Teaching Load (Instructional - 6 Classes)
                    </td>
                    <td className="p-1 border-r border-slate-400 text-center font-mono">4.8 Hours / Day</td>
                    <td className="p-1 border-r border-slate-400 text-center font-mono font-bold">24.0 Hours / Week</td>
                    <td className="p-1 text-slate-600">RA 4670 (Max 6.0 hrs/day teaching)</td>
                  </tr>
                  <tr>
                    <td className="p-1 border-r border-slate-400 font-bold">
                      B. Homeroom Advisory, Remediation &amp; Student Guidance
                    </td>
                    <td className="p-1 border-r border-slate-400 text-center font-mono">1.2 Hours / Day</td>
                    <td className="p-1 border-r border-slate-400 text-center font-mono font-bold">6.0 Hours / Week</td>
                    <td className="p-1 text-slate-600">DepEd Order No. 31, s. 2012</td>
                  </tr>
                  <tr>
                    <td className="p-1 border-r border-slate-400 font-bold">
                      C. Lesson Preparation, Records Keeping &amp; Ancillary Duties
                    </td>
                    <td className="p-1 border-r border-slate-400 text-center font-mono">2.0 Hours / Day</td>
                    <td className="p-1 border-r border-slate-400 text-center font-mono font-bold">10.0 Hours / Week</td>
                    <td className="p-1 text-slate-600">CSC Prescribed Working Hours</td>
                  </tr>
                  <tr className="bg-slate-100 font-black text-slate-950">
                    <td className="p-1 border-r border-slate-400 uppercase">Total Official Weekly Working Hours:</td>
                    <td className="p-1 border-r border-slate-400 text-center font-mono">8.0 Hours / Day</td>
                    <td className="p-1 border-r border-slate-400 text-center font-mono">40.0 Hours / Week</td>
                    <td className="p-1 text-emerald-800 font-bold">✓ 100% DepEd Standard Compliant</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Attestation */}
            <div className="border border-slate-900 p-2 text-[7pt] sm:text-[7.5pt] text-justify text-slate-800 leading-tight mb-2.5 bg-white">
              <p>
                <strong>OFFICIAL ATTESTATION:</strong> I hereby certify that the individual teaching loads, room assignments, advisory designations, and official working hours detailed in this form have been duly assigned to me for School Year 2026–2027. I attest that I shall discharge my duties in accordance with the prescribed Department of Education curriculum and the Code of Ethics for Professional Teachers.
              </p>
            </div>

            {/* Four-Tier Signatories Block */}
            <div className="border border-slate-900 p-2.5 sm:p-3 mb-2 bg-white">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-[7.5pt] sm:text-[8pt]">
                <div className="flex flex-col items-center">
                  <p className="text-[7pt] uppercase font-bold text-slate-500 mb-6">Conformed &amp; Submitted by:</p>
                  <p className="font-extrabold text-slate-950 uppercase border-b-2 border-slate-900 pb-0.5 w-full text-[8pt] sm:text-[8.5pt]">
                    {teacherName}
                  </p>
                  <p className="text-[7pt] text-slate-600 mt-0.5">Teacher / Class Adviser</p>
                  <p className="text-[6.5pt] text-slate-400 font-mono">Date: {new Date().toLocaleDateString()}</p>
                </div>

                <div className="flex flex-col items-center">
                  <p className="text-[7pt] uppercase font-bold text-slate-500 mb-6">Checked &amp; Verified by:</p>
                  <p className="font-extrabold text-slate-950 uppercase border-b-2 border-slate-900 pb-0.5 w-full text-[8pt] sm:text-[8.5pt]">
                    JHERICO MAURIN
                  </p>
                  <p className="text-[7pt] text-slate-600 mt-0.5">Academic Coordinator / MT I</p>
                  <p className="text-[6.5pt] text-slate-400 font-mono">Date: {new Date().toLocaleDateString()}</p>
                </div>

                <div className="flex flex-col items-center">
                  <p className="text-[7pt] uppercase font-bold text-slate-500 mb-6">Recommending Approval:</p>
                  <p className="font-extrabold text-slate-950 uppercase border-b-2 border-slate-900 pb-0.5 w-full text-[8pt] sm:text-[8.5pt]">
                    JUSTINE MANGILA, EdD
                  </p>
                  <p className="text-[7pt] text-slate-600 mt-0.5">Secondary School Principal II</p>
                  <p className="text-[6.5pt] text-slate-400 font-mono">PLSNHS School Head</p>
                </div>

                <div className="flex flex-col items-center">
                  <p className="text-[7pt] uppercase font-bold text-slate-500 mb-6">Approved:</p>
                  <p className="font-extrabold text-slate-950 uppercase border-b-2 border-slate-900 pb-0.5 w-full text-[8pt] sm:text-[8.5pt]">
                    SENEN PRISCILLO P. PAULIN, CESO V
                  </p>
                  <p className="text-[7pt] text-slate-600 mt-0.5">Schools Division Superintendent</p>
                  <p className="text-[6.5pt] text-slate-400 font-mono">DepEd Cebu Province</p>
                </div>
              </div>
            </div>

            {/* Footer Bar */}
            <div className="flex items-center justify-between text-[6.5pt] text-slate-500 pt-1 border-t border-slate-300">
              <span>Placido L. Señor National High School • School ID: 303035</span>
              <span className="font-mono">Ref: PLSNHS-SF7-TCP-2026-08 • System Verified Form</span>
              <span>{paperSize === 'short' ? 'Short Bond Paper (8.5" × 11")' : 'Long Bond Paper (8.5" × 13")'}</span>
            </div>
          </div>
        </div>

        {/* 
          ========================================================================
          SECTION: OFFICIAL ADMIN SCHEDULE ATTACHMENTS (Archives)
          ========================================================================
        */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0f172a] text-[#F5C518] shadow-xs">
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
                  Approved schedule documents and attachments sent to you by the School Administration.
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 w-fit">
              <Building2 className="h-3.5 w-3.5 text-emerald-700" />
              Recipient: {teacherName}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {myReceivedScheduleFiles.map((file) => (
              <div
                key={file.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-2xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-[#0f172a] px-2.5 py-1 text-[10px] font-bold text-white">
                        <Calendar className="h-3 w-3 text-amber-400" />
                        {file.schoolYear} • {file.semester}
                      </span>
                      {file.targetGradeLevel && (
                        <span className="inline-flex items-center rounded-lg bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          {file.targetGradeLevel}
                        </span>
                      )}
                    </div>
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
                  <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2">
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

                <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
                  <button
                    type="button"
                    onClick={() => setPreviewFile(file)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                  >
                    <Eye className="h-3.5 w-3.5 text-emerald-700" />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintBondPaper(paperSize)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
                    title="Print Official Bond Paper Document"
                  >
                    <Printer className="h-3.5 w-3.5 text-emerald-700" />
                    Print on Bond Paper
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadScheduleFile(file)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800 transition-all cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        OFFICIAL PRINT DOCUMENT SHEET (Rendered strictly during native Ctrl+P)
        ========================================================================
      */}
      <div id="bond-paper-print-sheet" className="hidden print:block text-black bg-white">
        <div
          dangerouslySetInnerHTML={{
            __html: generateBondPaperHtml(facultyProfile, teacherName, teachingLoads, paperSize),
          }}
        />
      </div>

      {/* 
        ========================================================================
        MODAL 1: FULL SCREEN BOND PAPER PREVIEW MODAL
        ========================================================================
      */}
      {isOfficialDocModalOpen && (
        <Modal
          isOpen={isOfficialDocModalOpen}
          onClose={() => setIsOfficialDocModalOpen(false)}
          title={`DepEd Individual Class Program: ${teacherName}`}
          subtitle={`Placido L. Señor National High School • S.Y. 2026–2027 • Formatted for Bond Paper`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <FileCheck className="h-4 w-4 text-emerald-600" />
                <span className="font-bold">
                  Document Size: {paperSize === 'short' ? 'Short Bond Paper (8.5" × 11")' : 'Long Bond Paper (8.5" × 13")'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintBondPaper(paperSize)}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print on Bond Paper
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadBondPaperHtml(paperSize)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download HTML
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3 max-h-[70vh] overflow-y-auto">
              <div
                dangerouslySetInnerHTML={{
                  __html: generateBondPaperHtml(facultyProfile, teacherName, teachingLoads, paperSize),
                }}
              />
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
          maxWidth="3xl"
        >
          <div className="space-y-4">
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
                  onClick={() => handlePrintBondPaper(paperSize)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer whitespace-nowrap shadow-2xs"
                >
                  <Printer className="h-3.5 w-3.5 text-emerald-700" />
                  Print on Bond Paper
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadScheduleFile(previewFile)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 cursor-pointer whitespace-nowrap shadow-2xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            </div>

            {/* Document Preview Sheet */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 max-h-[65vh] overflow-y-auto">
              <div
                dangerouslySetInnerHTML={{
                  __html: generateBondPaperHtml(facultyProfile, teacherName, teachingLoads, paperSize),
                }}
              />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default TeacherClassProgramPage;
