import React, { useEffect, useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  BookOpen,
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import { fetchSavedScheduleFilesFromDatabase } from '../../lib/teacherScheduleService';

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
export type BondPaperSize = 'short' | 'long' | 'a4';

export const generateBondPaperHtml = (
  prof: FacultyProfileData,
  name: string,
  loads: TeachingLoadSlot[],
  paperSize: BondPaperSize = 'short'
): string => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const isLong = paperSize === 'long';
  const isA4 = paperSize === 'a4';

  const pageSizeRule = isLong
    ? '@page { size: 8.5in 13in; margin: 0.28in 0.38in 0.28in 0.38in; }'
    : isA4
    ? '@page { size: 210mm 297mm; margin: 0.24in 0.34in 0.24in 0.34in; }'
    : '@page { size: 8.5in 11in; margin: 0.2in 0.32in 0.2in 0.32in; }';

  const rows = loads
    .map(
      (slot, i) => `
    <tr>
      <td style="text-align:center;font-weight:bold;border:1px solid #000;padding:${isLong ? '3px 4px' : '2.5px 3.5px'};">${i + 1}</td>
      <td style="font-family:monospace;font-weight:bold;border:1px solid #000;padding:${isLong ? '3px 4px' : '2.5px 3.5px'};white-space:nowrap;">${slot.period}</td>
      <td style="text-align:center;font-family:monospace;border:1px solid #000;padding:${isLong ? '3px 4px' : '2.5px 3.5px'};">60</td>
      <td style="text-align:center;font-weight:bold;border:1px solid #000;padding:${isLong ? '3px 4px' : '2.5px 3.5px'};">M – F</td>
      <td style="border:1px solid #000;padding:${isLong ? '3px 4px' : '2.5px 3.5px'};">
        <strong style="font-size:${isLong ? '9.4pt' : '8.8pt'};">${slot.subject}</strong>
        ${
          slot.role === 'Advisory & Subject Load'
            ? `<span style="display:block;font-size:${isLong ? '7.2pt' : '6.6pt'};color:#1e3a8a;font-weight:bold;text-transform:uppercase;">★ Designated Advisory Section Subject</span>`
            : ''
        }
      </td>
      <td style="border:1px solid #000;padding:${isLong ? '3px 4px' : '2.5px 3.5px'};font-weight:bold;">
        ${slot.grade_level} – ${slot.section}${slot.strand ? ` (${slot.strand})` : ''}
      </td>
      <td style="border:1px solid #000;padding:${isLong ? '3px 4px' : '2.5px 3.5px'};">${slot.room}</td>
      <td style="text-align:right;font-family:monospace;font-weight:bold;border:1px solid #000;padding:${isLong ? '3px 4px' : '2.5px 3.5px'};white-space:nowrap;">
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
  <title>DepEd Class Program - ${name} (${isLong ? 'LONG BOND PAPER' : isA4 ? 'A4 PAPER' : 'SHORT BOND PAPER'})</title>
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
      font-size: ${isLong ? '9.2pt' : isA4 ? '8.8pt' : '8.6pt'};
      line-height: 1.2;
      height: 100%;
    }
    .bond-sheet {
      width: 100%;
      max-width: ${isLong ? '7.7in' : isA4 ? '7.45in' : '7.6in'};
      margin: 0 auto;
      background: #ffffff;
      padding: 0;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
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
      font-size: ${isLong ? '7.8pt' : '7.4pt'};
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin: 0;
      color: #1e293b;
    }
    .header-center .deped {
      font-size: ${isLong ? '11pt' : '10.2pt'};
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      margin: 0;
      color: #000000;
    }
    .header-center .division {
      font-size: ${isLong ? '8pt' : '7.5pt'};
      margin: 1px 0;
      color: #334155;
    }
    .header-center .school {
      font-size: ${isLong ? '13.5pt' : '12.5pt'};
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 2px 0 1px 0;
      font-family: Georgia, serif;
      color: #000000;
    }
    .header-center .address {
      font-size: ${isLong ? '7.5pt' : '7pt'};
      margin: 0;
      color: #475569;
    }
    .logo-container {
      width: ${isLong ? '62px' : '54px'};
      text-align: center;
    }
    .logo-img {
      width: ${isLong ? '56px' : '48px'};
      height: ${isLong ? '56px' : '48px'};
      object-fit: contain;
      border-radius: 50%;
    }
    .deped-seal-box {
      width: ${isLong ? '56px' : '48px'};
      height: ${isLong ? '56px' : '48px'};
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
      font-size: ${isLong ? '7.5pt' : '6.8pt'};
      font-weight: 900;
      line-height: 1;
    }
    .deped-seal-sub {
      font-size: ${isLong ? '6pt' : '5.2pt'};
      line-height: 1.1;
      text-transform: uppercase;
    }
    .double-rule-top {
      border: 0;
      border-top: 1.8px solid #000000;
      margin: 2px 0 1px 0;
    }
    .double-rule-bottom {
      border: 0;
      border-top: 0.8px solid #000000;
      margin: 0 0 3px 0;
    }
    .title-banner {
      background-color: #f1f5f9;
      border: 1.5px solid #000000;
      padding: ${isLong ? '3.5px 6px' : '3px 5px'};
      text-align: center;
      margin-bottom: 3px;
    }
    .title-banner h2 {
      margin: 0;
      font-size: ${isLong ? '11pt' : '10pt'};
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #000000;
    }
    .title-banner .sy {
      margin: 1px 0 0 0;
      font-size: ${isLong ? '8.8pt' : '8.2pt'};
      font-weight: 700;
      color: #0f172a;
    }
    .title-banner .mandate {
      margin: 0;
      font-size: ${isLong ? '7.2pt' : '6.8pt'};
      color: #475569;
      font-style: italic;
    }
    .profile-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000000;
      margin-bottom: 3px;
      font-size: ${isLong ? '8.5pt' : '8pt'};
    }
    .profile-table td {
      border: 1px solid #cbd5e1;
      padding: ${isLong ? '2.5px 5px' : '2px 4px'};
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
      margin-bottom: 3px;
      font-size: ${isLong ? '8.2pt' : '7.8pt'};
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .schedule-table th {
      background-color: #f1f5f9;
      border: 1px solid #000000;
      padding: ${isLong ? '3px 4px' : '2.5px 3.5px'};
      font-weight: 900;
      text-transform: uppercase;
      font-size: ${isLong ? '7.8pt' : '7.2pt'};
      text-align: center;
    }
    .schedule-table td {
      border: 1px solid #000000;
      padding: ${isLong ? '2.5px 4px' : '2px 3.5px'};
      line-height: 1.18;
    }
    .routine-row td {
      background-color: #f8fafc;
      font-style: italic;
      color: #475569;
      font-weight: 600;
      font-size: ${isLong ? '7.8pt' : '7.2pt'};
    }
    .workload-table {
      width: 100%;
      border-collapse: collapse;
      border: 1.5px solid #000000;
      margin-bottom: 3px;
      font-size: ${isLong ? '7.8pt' : '7.4pt'};
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .workload-table th {
      background-color: #f1f5f9;
      border: 1px solid #000000;
      padding: ${isLong ? '2.5px 5px' : '2px 4px'};
      font-weight: 800;
      text-transform: uppercase;
      text-align: left;
    }
    .workload-table td {
      border: 1px solid #cbd5e1;
      padding: ${isLong ? '2px 5px' : '1.5px 4px'};
    }
    .workload-total td {
      background-color: #f1f5f9;
      font-weight: 900;
      color: #000000;
      border-top: 1.5px solid #000000;
    }
    .attestation-box {
      border: 1px solid #000000;
      padding: ${isLong ? '3.5px 6px' : '3px 5px'};
      font-size: ${isLong ? '7pt' : '6.5pt'};
      line-height: 1.2;
      text-align: justify;
      background-color: #fafafa;
      margin-bottom: 3px;
      color: #1e293b;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .signatories-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 3px;
      font-size: ${isLong ? '8.2pt' : '7.6pt'};
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .signatories-table td {
      width: 25%;
      text-align: center;
      vertical-align: top;
      padding: 0 4px;
    }
    .sign-label {
      font-size: ${isLong ? '7.2pt' : '6.6pt'};
      color: #475569;
      text-transform: uppercase;
      font-weight: bold;
      margin-bottom: ${isLong ? '12px' : '8px'};
    }
    .sign-name {
      font-weight: 900;
      font-size: ${isLong ? '8.8pt' : '8.2pt'};
      text-transform: uppercase;
      border-bottom: 1.8px solid #000000;
      padding-bottom: 1.5px;
      margin-bottom: 1.5px;
      color: #000000;
    }
    .sign-title {
      font-size: ${isLong ? '7.2pt' : '6.6pt'};
      color: #334155;
      line-height: 1.1;
    }
    .security-bar {
      margin-top: 3px;
      padding-top: 2px;
      border-top: 1px dashed #94a3b8;
      display: flex;
      justify-content: space-between;
      font-size: 6.8pt;
      color: #64748b;
    }
    @media print {
      html, body {
        height: 100% !important;
        overflow: hidden !important;
      }
      .bond-sheet {
        page-break-after: avoid !important;
        page-break-before: avoid !important;
        page-break-inside: avoid !important;
        break-after: avoid !important;
        break-before: avoid !important;
        break-inside: avoid !important;
      }
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
          <th style="width:24px;">#</th>
          <th style="width:125px;">Time Period</th>
          <th style="width:48px;">Mins/Day</th>
          <th style="width:50px;">Days</th>
          <th>Subject / Learning Area</th>
          <th>Grade Level &amp; Section</th>
          <th style="width:110px;">Room</th>
          <th style="width:80px;text-align:right;">Weekly Load</th>
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
          <th style="text-align:center;width:105px;">Daily Equivalent</th>
          <th style="text-align:center;width:105px;">Weekly Total</th>
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
          <div class="sign-title" style="font-size:5.6pt;color:#64748b;">Date: ${currentDate}</div>
        </td>
        <td>
          <div class="sign-label">Checked &amp; Verified by:</div>
          <div class="sign-name">JHERICO MAURIN</div>
          <div class="sign-title">Academic Coordinator / MT I</div>
          <div class="sign-title" style="font-size:5.6pt;color:#64748b;">Date: ${currentDate}</div>
        </td>
        <td>
          <div class="sign-label">Recommending Approval:</div>
          <div class="sign-name">JUSTINE MANGILA, EdD</div>
          <div class="sign-title">Secondary School Principal II</div>
          <div class="sign-title" style="font-size:5.6pt;color:#64748b;">PLSNHS School Head</div>
        </td>
        <td>
          <div class="sign-label">Approved:</div>
          <div class="sign-name">SENEN PRISCILLO P. PAULIN, CESO V</div>
          <div class="sign-title">Schools Division Superintendent</div>
          <div class="sign-title" style="font-size:5.6pt;color:#64748b;">DepEd Cebu Province</div>
        </td>
      </tr>
    </table>

    <!-- Security & Reference Footer -->
    <div class="security-bar">
      <span>Placido L. Señor National High School • School ID: 303035</span>
      <span style="font-family:monospace;">Ref: PLSNHS-SF7-TCP-2026-08 • Official DepEd Form</span>
      <span>${isLong ? 'Long Bond Paper (8.5" × 13")' : isA4 ? 'A4 Paper (8.27" × 11.69")' : 'Short Bond Paper (8.5" × 11")'} • Page 1 of 1</span>
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
  const [paperSize, setPaperSize] = useState<BondPaperSize>('short');

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
    const syncScheduleFiles = async () => {
      try {
        const merged = await fetchSavedScheduleFilesFromDatabase(
          DEFAULT_ADMIN_TEACHER_SCHEDULE_FILES
        );

        // Also query teachers table for direct teacher_load_url if attached specifically to this teacher
        if (user?.id) {
          const { data: teacherRow } = await supabase
            .from('teachers')
            .select(
              'teacher_load_url, teacher_load_name, teacher_load_file_type, teacher_load_updated_at'
            )
            .or(`user_id.eq.${user.id},id.eq.${user.id}`)
            .maybeSingle();

          if (teacherRow?.teacher_load_url && teacherRow?.teacher_load_name) {
            const alreadyInList = merged.some(
              (f) =>
                f.fileName === teacherRow.teacher_load_name &&
                f.fileDataUrl === teacherRow.teacher_load_url
            );
            if (!alreadyInList) {
              const directFile: AdminSentTeacherScheduleFile = {
                id: `direct-teacher-load-${user.id}`,
                title: `Official Faculty Teaching Schedule — ${teacherName}`,
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
              setAdminFiles([directFile, ...merged]);
              return;
            }
          }
        }

        setAdminFiles(merged);
      } catch (err) {
        console.warn('Teacher workloads fetch warning:', err);
      }
    };

    syncScheduleFiles();

    const handleStorage = (e: StorageEvent | CustomEvent) => {
      if ('key' in e && e.key && e.key !== ADMIN_TEACHER_SCHEDULE_FILES_KEY) return;
      syncScheduleFiles();
    };

    window.addEventListener('storage', handleStorage as EventListener);
    window.addEventListener('plsnhs-schedule-files-updated', handleStorage as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage as EventListener);
      window.removeEventListener('plsnhs-schedule-files-updated', handleStorage as EventListener);
    };
  }, [user, teacherName]);

  // Filter schedule files relevant to this logged-in teacher (strip honorifics like Mrs./Mr./Ms. before matching)
  const myReceivedScheduleFiles = useMemo(() => {
    const stripHonorific = (str: string) =>
      str
        .toLowerCase()
        .replace(/\b(mrs?\.?|ms\.?|dr\.?|prof\.?|teacher|sir|ma'am)\b/gi, '')
        .trim();

    const cleanTeacher = stripHonorific(teacherName);
    const teacherTokens = cleanTeacher.split(/\s+/).filter((t) => t.length >= 3);

    const matched = adminFiles.filter((file) => {
      if (user?.id && String(file.id).includes(String(user.id))) return true;
      if (file.recipientType === 'all') return true;

      return file.recipientTeacherNames.some((recName) => {
        const cleanRec = stripHonorific(recName);
        if (!cleanRec) return false;
        if (cleanRec.includes(cleanTeacher) || cleanTeacher.includes(cleanRec)) return true;
        return teacherTokens.some((tok) => cleanRec.includes(tok));
      });
    });

    // Prioritize personal / year-level specific files and keep the top 2 most relevant files so the grid stays compact (1 row of 2 cards)
    const sorted = [...matched].sort((a, b) => {
      const aSpecific = a.recipientType === 'selected' ? 0 : 1;
      const bSpecific = b.recipientType === 'selected' ? 0 : 1;
      return aSpecific - bSpecific;
    });

    return sorted.slice(0, 2);
  }, [adminFiles, teacherName, user]);

  // Generate personalized teaching loads
  const teachingLoads = useMemo(() => {
    return generateTeachingLoads(facultyProfile);
  }, [facultyProfile]);

  /**
   * Dedicated print function that isolates the bond paper document in an invisible iframe.
   * Guarantees 0% interference from web sidebars, web headers, buttons, or scrollbars.
   */
  const handlePrintBondPaper = (selectedSize: BondPaperSize = paperSize) => {
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
  const handleDownloadBondPaperHtml = (selectedSize: BondPaperSize = paperSize) => {
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
        Strictly fits on 1 Single Page without overflowing.
        ========================================================================
      */}
      <style>{`
        @page {
          size: ${paperSize === 'long' ? '8.5in 13in' : paperSize === 'a4' ? 'A4 portrait' : '8.5in 11in'};
          margin: ${paperSize === 'long' ? '0.28in 0.38in' : paperSize === 'a4' ? '0.24in 0.34in' : '0.2in 0.32in'};
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            height: 100% !important;
            overflow: hidden !important;
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
            max-width: ${paperSize === 'long' ? '7.7in' : paperSize === 'a4' ? '7.45in' : '7.6in'} !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid !important;
            break-before: avoid !important;
            break-inside: avoid !important;
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
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight leading-snug">
                Faculty Teaching Program &amp; Workload
              </h1>
              <p className="text-sm sm:text-base text-slate-500 mt-1 leading-relaxed">
                View, print, or download your official teaching schedule and class program issued by the School Administrator.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 ml-auto pt-0.5">
              <button
                type="button"
                onClick={() => handleDownloadBondPaperHtml(paperSize)}
                className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all cursor-pointer shrink-0"
              >
                <Download className="h-4 w-4 text-slate-600" />
                Download Program
              </button>
              <button
                type="button"
                onClick={() => handlePrintBondPaper(paperSize)}
                className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-all cursor-pointer shrink-0"
              >
                <Printer className="h-4 w-4 text-white" />
                Print Class Program
              </button>
              <PageHeaderNotificationSlot />
            </div>
          </div>

          {/* Mobile Action Row */}
          <div className="sm:hidden mt-3 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleDownloadBondPaperHtml(paperSize)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4 text-slate-600" />
              Download
            </button>
            <button
              type="button"
              onClick={() => handlePrintBondPaper(paperSize)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white shadow-xs transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4 text-white" />
              Print Class Program
            </button>
          </div>
        </div>

        {/* Official Schedule Files Received from School Admin */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-slate-50 p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-200/70 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 font-display">
                    Official Teaching Schedule Files from Admin
                  </h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-3 py-0.5 text-xs font-extrabold text-emerald-800">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                    Admin Verified
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Official class program documents sent to you by the School Administration / Office of the Principal.
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-700 shadow-2xs w-fit">
              <Building2 className="h-4 w-4 text-emerald-700" />
              Recipient: {teacherName}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {myReceivedScheduleFiles.map((file) => (
              <div
                key={file.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f172a] px-3 py-1 text-xs font-bold text-white">
                        <Calendar className="h-3.5 w-3.5 text-amber-400" />
                        {file.schoolYear} • {file.semester}
                      </span>
                      {file.targetGradeLevel && (
                        <span className="inline-flex items-center rounded-lg bg-emerald-100 border border-emerald-300 px-2.5 py-1 text-xs font-extrabold text-emerald-800">
                          {file.targetGradeLevel}
                        </span>
                      )}
                    </div>
                    <Badge variant="emerald" size="md">
                      {file.fileType || 'PDF'} FILE
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 font-display leading-snug">
                      {file.title}
                    </h3>
                    <p className="text-xs sm:text-sm font-semibold text-emerald-800 mt-1">
                      Issued by: {file.sentBy} • {file.sentAt}
                    </p>
                  </div>

                  {/* Attached File Pill */}
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800" title={file.fileName}>
                        {file.fileName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {file.fileSize} • Official Admin Schedule Attachment
                      </p>
                    </div>
                  </div>

                  {file.notes && (
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{file.notes}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-3.5">
                  <button
                    type="button"
                    onClick={() => setPreviewFile(file)}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <Eye className="h-4 w-4 text-emerald-700" />
                    Preview File
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintBondPaper(paperSize)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    <Printer className="h-4 w-4 text-slate-500" />
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadScheduleFile(file)}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-2xs hover:bg-emerald-800 transition-all cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    Download File
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DepEd Instructional Workload Compliance Banner */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Total Instructional Load: {teachingLoads.length * 4} Teaching Hours / Week ({teachingLoads.length} Assigned Sections)
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Advisory Section: <span className="font-bold text-slate-800">{facultyProfile.advisory_grade} – Section {facultyProfile.advisory_section}</span> • Specialization: <span className="font-bold text-slate-800">{facultyProfile.specialization}</span> ({facultyProfile.room})
              </p>
            </div>
          </div>
          <span className="rounded-xl bg-[#0f172a] px-4 py-2 text-xs sm:text-sm font-bold text-white w-fit shrink-0">
            Full-Time Regular Faculty
          </span>
        </div>

        {/* Structured Timetable Matrix Organized by Year Level & Section */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/70 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <Clock className="h-5 w-5 text-emerald-700" />
              <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-800">
                Assigned Teaching Timetable (By Year Level &amp; Section)
              </h2>
            </div>
            <span className="text-xs sm:text-sm font-semibold text-slate-500">
              Synced from Admin Schedule File ({myReceivedScheduleFiles[0]?.fileName})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-5 py-4 w-14 text-center text-slate-400">#</th>
                  <th className="px-5 py-4">Time Period &amp; Days</th>
                  <th className="px-5 py-4">Subject / Learning Area</th>
                  <th className="px-5 py-4">Year Level &amp; Section</th>
                  <th className="px-5 py-4">Room Assignment</th>
                  <th className="px-5 py-4 text-right">Faculty Designation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachingLoads.map((slot, index) => (
                  <tr key={index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 text-center font-mono text-sm font-bold text-slate-400">
                      {index + 1}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-mono text-sm font-bold text-slate-900">{slot.period}</p>
                          <p className="text-xs text-slate-500">{slot.days}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-900 text-sm sm:text-base">{slot.subject}</span>
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f172a] px-3 py-1.5 text-xs font-bold text-white">
                          <GraduationCap className="h-3.5 w-3.5 text-amber-400" />
                          {slot.grade_level}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
                          <Layers className="h-3.5 w-3.5 text-emerald-600" />
                          Section {slot.section}
                        </span>
                        {slot.strand && (
                          <span className="rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-bold text-blue-800">
                            {slot.strand}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                        <MapPin className="h-4 w-4 text-emerald-700" />
                        {slot.room}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      {slot.role === 'Advisory & Subject Load' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-800">
                          Advisory &amp; Subject Teacher
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
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
                  Document Size: {paperSize === 'short' ? 'Short Bond Paper (8.5" × 11")' : paperSize === 'a4' ? 'A4 Paper (8.27" × 11.69")' : 'Long Bond Paper (8.5" × 13")'} • 1-Page Fit
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

            {/* Document Preview Sheet — renders the actual Admin-attached file if present */}
            <div className="rounded-xl border border-slate-200 bg-slate-100 p-3 max-h-[68vh] overflow-y-auto">
              {previewFile.fileDataUrl &&
              (previewFile.fileDataUrl.startsWith('data:image/') ||
                /\.(png|jpe?g|webp|gif)$/i.test(previewFile.fileName)) ? (
                <div className="flex justify-center bg-white rounded-xl p-4 shadow-xs">
                  <img
                    src={previewFile.fileDataUrl}
                    alt={previewFile.title}
                    className="max-h-[60vh] object-contain rounded-lg"
                  />
                </div>
              ) : previewFile.fileDataUrl &&
                (previewFile.fileDataUrl.startsWith('data:application/pdf') ||
                  previewFile.fileDataUrl.startsWith('http')) ? (
                <iframe
                  src={previewFile.fileDataUrl}
                  title={previewFile.title}
                  className="w-full h-[62vh] rounded-xl border border-slate-300 bg-white shadow-xs"
                />
              ) : (
                <div className="bg-white rounded-xl p-3">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: generateBondPaperHtml(
                        facultyProfile,
                        teacherName,
                        teachingLoads,
                        paperSize
                      ),
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default TeacherClassProgramPage;
