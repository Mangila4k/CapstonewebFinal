import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import {
  Users,
  Plus,
  Search,
  Mail,
  Trash2,
  Shield,
  Layers,
  UserCheck,
  BookOpen,
  CheckCircle2,
  X,
  Calendar,
  Paperclip,
  Upload,
  FileText,
  Download,
  Eye,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import type { Section } from '../../types';
import {
  uploadAndAttachTeacherSchedule,
  getTeacherAttachedScheduleMap,
  type AttachedScheduleInfo,
} from '../../lib/teacherScheduleService';

export interface FacultyRecord {
  id: string;
  user_id?: string;
  teacher_table_id?: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  specialization: string;
  phone?: string;
  status: 'Active' | 'Inactive';
  teacher_load_url?: string | null;
  teacher_load_name?: string | null;
  teacher_load_file_type?: string | null;
  teacher_load_updated_at?: string | null;
}

export const SECTIONS_CACHE_KEY = 'plsnhs_sections_cache_v3';
export const TEACHERS_CACHE_KEY = 'plsnhs_teachers_cache_v3';

export const INITIAL_PLSNHS_SECTIONS: Section[] = [
  // Grade 7
  { id: 'd7fb18c8-47b3-4125-afd3-e92c8691eac8', name: 'Chiong', grade_level: 'Grade 7', strand: null, adviser_id: null, adviser_name: 'Mrs. Generale', room: 'Bldg A - Rm 101' },
  { id: 'cd81a696-5371-4157-98e0-6ad75a72e81b', name: 'De Gracia', grade_level: 'Grade 7', strand: null, adviser_id: null, adviser_name: 'Mrs. Tapasao', room: 'Bldg A - Rm 102' },
  { id: 'ceb4f234-c17b-40e2-bb90-4b530f2fb7cb', name: 'Mendiola', grade_level: 'Grade 7', strand: null, adviser_id: null, adviser_name: 'Mr. Selim', room: 'Bldg A - Rm 103' },
  { id: '2b8a93ce-5ce4-4d7d-b309-5d0d70bafd4b', name: 'Mendoza', grade_level: 'Grade 7', strand: null, adviser_id: null, adviser_name: 'Mrs. Baclayon', room: 'Bldg A - Rm 104' },
  { id: '24e17a30-66fa-441e-bb9f-303daa570bc1', name: 'Paul Ong', grade_level: 'Grade 7', strand: null, adviser_id: null, adviser_name: 'Mrs. Manabat', room: 'Bldg A - Rm 105' },
  { id: '53eb6a17-39a1-46ee-8cf8-46a449f0259e', name: 'Quirante', grade_level: 'Grade 7', strand: null, adviser_id: null, adviser_name: 'Mrs. Codelan', room: 'Bldg A - Rm 106' },
  { id: 'f46fbd14-2830-4a29-ab0c-789e0fb570e0', name: 'Sayson', grade_level: 'Grade 7', strand: null, adviser_id: null, adviser_name: 'Mrs. Llanda', room: 'Bldg A - Rm 107' },
  // Grade 8
  { id: '2703f6bc-a3a0-42cf-9ef0-5dd3d7ab7955', name: 'Antipolo', grade_level: 'Grade 8', strand: null, adviser_id: null, adviser_name: 'Ms. Alinsonorin', room: 'Bldg B - Rm 201' },
  { id: 'ca06b93d-dbf6-495f-9674-e3847dca925f', name: 'Banaba', grade_level: 'Grade 8', strand: null, adviser_id: null, adviser_name: 'Ms. Omambac', room: 'Bldg B - Rm 202' },
  { id: 'f4d1227e-cd63-4104-8f8e-1b1513b01643', name: 'Kamagong', grade_level: 'Grade 8', strand: null, adviser_id: null, adviser_name: 'Mr. Padillo', room: 'Bldg B - Rm 203' },
  { id: 'a34debd3-7196-4689-91fb-ef5e592e52a8', name: 'Mahogany', grade_level: 'Grade 8', strand: null, adviser_id: null, adviser_name: 'Mr. Gonzaga', room: 'Bldg B - Rm 204' },
  { id: 'ffb76f28-e45d-4d2a-86a2-e158b26b798e', name: 'Molave', grade_level: 'Grade 8', strand: null, adviser_id: null, adviser_name: 'Mrs. Rabanes', room: 'Bldg B - Rm 205' },
  { id: '7aebea84-baca-4211-884c-cde42f68e98f', name: 'Narra', grade_level: 'Grade 8', strand: null, adviser_id: null, adviser_name: 'Mrs. Montoya', room: 'Bldg B - Rm 206' },
  { id: 'eff42461-f66f-405e-9c10-580e39e98527', name: 'Square', grade_level: 'Grade 8', strand: null, adviser_id: '7bebb3fd-151b-412f-981f-7bbf83381fc1', adviser_name: 'Twengcle Deguma', room: 'Bldg B - Rm 207' },
  { id: '0d8cd8cb-1bfb-4a11-839c-f159776e67b4', name: 'Yakal', grade_level: 'Grade 8', strand: null, adviser_id: null, adviser_name: 'Mrs. Balwit', room: 'Bldg B - Rm 208' },
  // Grade 9
  { id: '2327bfb8-7349-4bd1-95c0-c666e7c98296', name: 'Batangas', grade_level: 'Grade 9', strand: null, adviser_id: null, adviser_name: 'Mrs. Francisco', room: 'Bldg C - Rm 101' },
  { id: 'c69d79a7-0ee4-49df-ad9b-855508dacfc5', name: 'Cebu', grade_level: 'Grade 9', strand: null, adviser_id: null, adviser_name: 'Mrs. Taruc', room: 'Bldg C - Rm 102' },
  { id: '90fd4081-d9a3-4f40-9b9f-c1d8b6809e70', name: 'Davao', grade_level: 'Grade 9', strand: null, adviser_id: null, adviser_name: 'Mr. Albores', room: 'Bldg C - Rm 103' },
  { id: 'aee5bfb5-6dc3-49ff-a65e-9df89a93fc98', name: 'Ilo-Ilo', grade_level: 'Grade 9', strand: null, adviser_id: null, adviser_name: 'Mrs. Ogaob', room: 'Bldg C - Rm 104' },
  { id: 'dbe493a8-c606-44bf-b430-826021bcb999', name: 'Negros Occidental', grade_level: 'Grade 9', strand: null, adviser_id: null, adviser_name: 'Mrs. Ramas', room: 'Bldg C - Rm 105' },
  { id: '3ad68b4b-df40-49d6-890b-7de23f0d84a4', name: 'Palawan', grade_level: 'Grade 9', strand: null, adviser_id: null, adviser_name: 'Mrs. Rivera', room: 'Bldg C - Rm 106' },
  { id: 'a26829b3-8fc8-4335-92bd-ce72dbf874ae', name: 'Rizal', grade_level: 'Grade 9', strand: null, adviser_id: null, adviser_name: 'Ms. Bo-ok', room: 'Bldg C - Rm 107' },
  // Grade 10
  { id: 'd400799b-f9c9-4da6-a17a-d11978eda879', name: 'Generosity', grade_level: 'Grade 10', strand: null, adviser_id: null, adviser_name: 'Mrs. Paunel', room: 'Bldg C - Rm 201' },
  { id: '9b8e0428-7967-4c62-85a2-36d5e8d40e4c', name: 'Honesty', grade_level: 'Grade 10', strand: null, adviser_id: null, adviser_name: 'Mrs. Dela Torre', room: 'Bldg C - Rm 202' },
  { id: 'c440608f-9f3c-4ffd-8a1b-2e9efd1d7d68', name: 'Kindness', grade_level: 'Grade 10', strand: null, adviser_id: null, adviser_name: 'Mr. Gentica', room: 'Bldg C - Rm 203' },
  { id: '4315762e-eaba-4916-b2ab-fe29e575f3d7', name: 'Perseverance', grade_level: 'Grade 10', strand: null, adviser_id: null, adviser_name: 'Mrs. Rimas', room: 'Bldg C - Rm 204' },
  { id: '8b1b8219-532e-49dc-ad04-b4de9f270cb7', name: 'Wisdom', grade_level: 'Grade 10', strand: null, adviser_id: null, adviser_name: 'Mrs. Diaz', room: 'Bldg C - Rm 205' },
  // Grade 11
  { id: '7e92ef02-1206-4e82-9d71-31870d1a8a9a', name: 'Almario', grade_level: 'Grade 11', strand: 'GAS', adviser_id: null, adviser_name: 'SHS Faculty', room: 'SHS Bldg - Rm 101' },
  { id: 'd7abfe54-9f10-4e32-97b3-f85ef1f8b98c', name: 'Amorsolo', grade_level: 'Grade 11', strand: 'HUMSS', adviser_id: null, adviser_name: 'SHS Faculty', room: 'SHS Bldg - Rm 102' },
  { id: 'e2a1e808-e436-46cd-8d88-79311a0c50f3', name: 'Baltazar', grade_level: 'Grade 11', strand: 'STEM', adviser_id: null, adviser_name: 'SHS Faculty', room: 'SHS Bldg - Rm 103' },
  { id: '1f2779d0-f90f-4811-ac4b-e8ec3be47a2e', name: 'Tolentino', grade_level: 'Grade 11', strand: 'TVL', adviser_id: null, adviser_name: 'SHS Faculty', room: 'SHS Bldg - Rm 104' },
  // Grade 12
  { id: '844e842b-74fd-4db5-8bcb-9b8e67d921ba', name: 'Salcedo', grade_level: 'Grade 12', strand: 'STEM', adviser_id: null, adviser_name: 'SHS Faculty', room: 'SHS Bldg - Rm 201' },
  { id: 'ca05200c-0468-4d8a-9bcc-f3ad7596d423', name: 'Santos', grade_level: 'Grade 12', strand: 'HUMSS', adviser_id: null, adviser_name: 'SHS Faculty', room: 'SHS Bldg - Rm 202' },
  { id: 'e3ecc01c-a492-4397-b572-e0d2af766617', name: 'Velasco', grade_level: 'Grade 12', strand: 'GAS', adviser_id: null, adviser_name: 'SHS Faculty', room: 'SHS Bldg - Rm 203' },
  { id: '1173a9c9-db87-4ce1-b573-1fcec234dd33', name: 'Velasquez', grade_level: 'Grade 12', strand: 'TVL', adviser_id: null, adviser_name: 'SHS Faculty', room: 'SHS Bldg - Rm 204' },
];

export const INITIAL_PLSNHS_TEACHERS: FacultyRecord[] = [
  {
    id: 'tch-generale',
    employee_id: 'PLSNHS-TCH-200701',
    first_name: 'Mrs.',
    last_name: 'Generale',
    email: 'generale@plsnhs.edu.ph',
    specialization: 'Grade 7 Adviser • English',
    status: 'Active',
  },
  {
    id: 'tch-tapasao',
    employee_id: 'PLSNHS-TCH-200702',
    first_name: 'Mrs.',
    last_name: 'Tapasao',
    email: 'tapasao@plsnhs.edu.ph',
    specialization: 'Grade 7 Adviser • Science',
    status: 'Active',
  },
  {
    id: 'tch-llanda',
    employee_id: 'PLSNHS-TCH-201005',
    first_name: 'Mrs.',
    last_name: 'Llanda',
    email: 'llanda@plsnhs.edu.ph',
    specialization: 'Grade 7 Adviser • MAPEH',
    status: 'Active',
  },
  {
    id: 'tch-selim',
    employee_id: 'PLSNHS-TCH-201001',
    first_name: 'Mr.',
    last_name: 'Selim',
    email: 'selim@plsnhs.edu.ph',
    specialization: 'Grade 7 Adviser • English',
    status: 'Active',
  },
  {
    id: 'tch-baclayon',
    employee_id: 'PLSNHS-TCH-201002',
    first_name: 'Mrs.',
    last_name: 'Baclayon',
    email: 'baclayon@plsnhs.edu.ph',
    specialization: 'Grade 7 Adviser • Filipino',
    status: 'Active',
  },
  {
    id: 'tch-manabat',
    employee_id: 'PLSNHS-TCH-201003',
    first_name: 'Mrs.',
    last_name: 'Manabat',
    email: 'manabat@plsnhs.edu.ph',
    specialization: 'Grade 7 Adviser • Science',
    status: 'Active',
  },
  {
    id: 'tch-codelan',
    employee_id: 'PLSNHS-TCH-201004',
    first_name: 'Mrs.',
    last_name: 'Codelan',
    email: 'codelan@plsnhs.edu.ph',
    specialization: 'Grade 7 Adviser • Araling Panlipunan',
    status: 'Active',
  },
  {
    id: 'e41550ac-ff9e-404f-ab44-da40c85b0885',
    user_id: 'e41550ac-ff9e-404f-ab44-da40c85b0885',
    teacher_table_id: '7bebb3fd-151b-412f-981f-7bbf83381fc1',
    employee_id: 'PLSNHS-TCH-701510',
    first_name: 'Twengcle',
    last_name: 'Deguma',
    email: 'amawko@gmail.com',
    specialization: 'Science',
    phone: '09123456789',
    status: 'Active',
  },
  {
    id: '3e46df70-fe67-41e8-a08a-5cbae9fe575c',
    user_id: '3e46df70-fe67-41e8-a08a-5cbae9fe575c',
    teacher_table_id: '7ee76915-fa3d-43f9-bfb3-7d06a892e79c',
    employee_id: 'PLSNHS-TCH-928650',
    first_name: 'Jherico',
    last_name: 'Maurin',
    email: 'dtwengcle@gmail.com',
    specialization: 'General Education',
    phone: '09171234567',
    status: 'Active',
  },
  {
    id: '2b371fb1-c862-4483-959c-92b4dee7c632',
    user_id: '2b371fb1-c862-4483-959c-92b4dee7c632',
    teacher_table_id: '84ae6d06-bc32-43ac-8031-b88cd62b1821',
    employee_id: 'PLSNHS-TCH-976857',
    first_name: 'Ryan',
    last_name: 'Quiroga',
    email: 'yanyanqu143@gmail.com',
    specialization: 'Mathematics',
    phone: '09123456789',
    status: 'Active',
  },
  {
    id: '0e52e09b-8b81-40de-aa8e-88974348fe33',
    user_id: '0e52e09b-8b81-40de-aa8e-88974348fe33',
    employee_id: 'PLSNHS-TCH-100204',
    first_name: 'Teacher',
    last_name: 'Santos',
    email: 'teacher@hiraya.edu.ph',
    specialization: 'Senior High Core',
    phone: '09182345678',
    status: 'Active',
  },
  {
    id: 'tch-alinsonorin',
    employee_id: 'PLSNHS-TCH-201006',
    first_name: 'Ms.',
    last_name: 'Alinsonorin',
    email: 'alinsonorin@plsnhs.edu.ph',
    specialization: 'Mathematics',
    status: 'Active',
  },
  {
    id: 'tch-omambac',
    employee_id: 'PLSNHS-TCH-201007',
    first_name: 'Ms.',
    last_name: 'Omambac',
    email: 'omambac@plsnhs.edu.ph',
    specialization: 'English',
    status: 'Active',
  },
  {
    id: 'tch-padillo',
    employee_id: 'PLSNHS-TCH-201008',
    first_name: 'Mr.',
    last_name: 'Padillo',
    email: 'padillo@plsnhs.edu.ph',
    specialization: 'TLE',
    status: 'Active',
  },
  {
    id: 'tch-gonzaga',
    employee_id: 'PLSNHS-TCH-201009',
    first_name: 'Mr.',
    last_name: 'Gonzaga',
    email: 'gonzaga@plsnhs.edu.ph',
    specialization: 'Science',
    status: 'Active',
  },
  {
    id: 'tch-rabanes',
    employee_id: 'PLSNHS-TCH-201010',
    first_name: 'Mrs.',
    last_name: 'Rabanes',
    email: 'rabanes@plsnhs.edu.ph',
    specialization: 'Filipino',
    status: 'Active',
  },
  {
    id: 'tch-montoya',
    employee_id: 'PLSNHS-TCH-201011',
    first_name: 'Mrs.',
    last_name: 'Montoya',
    email: 'montoya@plsnhs.edu.ph',
    specialization: 'Values Education',
    status: 'Active',
  },
  {
    id: 'tch-balwit',
    employee_id: 'PLSNHS-TCH-201012',
    first_name: 'Mrs.',
    last_name: 'Balwit',
    email: 'balwit@plsnhs.edu.ph',
    specialization: 'Araling Panlipunan',
    status: 'Active',
  },
  {
    id: 'tch-francisco',
    employee_id: 'PLSNHS-TCH-201013',
    first_name: 'Mrs.',
    last_name: 'Francisco',
    email: 'francisco@plsnhs.edu.ph',
    specialization: 'Mathematics',
    status: 'Active',
  },
  {
    id: 'tch-taruc',
    employee_id: 'PLSNHS-TCH-201014',
    first_name: 'Mrs.',
    last_name: 'Taruc',
    email: 'taruc@plsnhs.edu.ph',
    specialization: 'Science',
    status: 'Active',
  },
  {
    id: 'tch-albores',
    employee_id: 'PLSNHS-TCH-201015',
    first_name: 'Mr.',
    last_name: 'Albores',
    email: 'albores@plsnhs.edu.ph',
    specialization: 'MAPEH',
    status: 'Active',
  },
  {
    id: 'tch-ogaob',
    employee_id: 'PLSNHS-TCH-201016',
    first_name: 'Mrs.',
    last_name: 'Ogaob',
    email: 'ogaob@plsnhs.edu.ph',
    specialization: 'English',
    status: 'Active',
  },
  {
    id: 'tch-ramas',
    employee_id: 'PLSNHS-TCH-201017',
    first_name: 'Mrs.',
    last_name: 'Ramas',
    email: 'ramas@plsnhs.edu.ph',
    specialization: 'Filipino',
    status: 'Active',
  },
  {
    id: 'tch-rivera',
    employee_id: 'PLSNHS-TCH-201018',
    first_name: 'Mrs.',
    last_name: 'Rivera',
    email: 'rivera@plsnhs.edu.ph',
    specialization: 'TLE',
    status: 'Active',
  },
  {
    id: 'tch-book',
    employee_id: 'PLSNHS-TCH-201019',
    first_name: 'Ms.',
    last_name: 'Bo-ok',
    email: 'book@plsnhs.edu.ph',
    specialization: 'Araling Panlipunan',
    status: 'Active',
  },
  {
    id: 'tch-paunel',
    employee_id: 'PLSNHS-TCH-201020',
    first_name: 'Mrs.',
    last_name: 'Paunel',
    email: 'paunel@plsnhs.edu.ph',
    specialization: 'Science',
    status: 'Active',
  },
  {
    id: 'tch-delatorre',
    employee_id: 'PLSNHS-TCH-201021',
    first_name: 'Mrs.',
    last_name: 'Dela Torre',
    email: 'delatorre@plsnhs.edu.ph',
    specialization: 'Mathematics',
    status: 'Active',
  },
  {
    id: 'tch-gentica',
    employee_id: 'PLSNHS-TCH-201022',
    first_name: 'Mr.',
    last_name: 'Gentica',
    email: 'gentica@plsnhs.edu.ph',
    specialization: 'English',
    status: 'Active',
  },
  {
    id: 'tch-rimas',
    employee_id: 'PLSNHS-TCH-201023',
    first_name: 'Mrs.',
    last_name: 'Rimas',
    email: 'rimas@plsnhs.edu.ph',
    specialization: 'Filipino',
    status: 'Active',
  },
  {
    id: 'tch-diaz',
    employee_id: 'PLSNHS-TCH-201024',
    first_name: 'Mrs.',
    last_name: 'Diaz',
    email: 'diaz@plsnhs.edu.ph',
    specialization: 'Values Education',
    status: 'Active',
  },
];

export function loadCachedSections(): Section[] {
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
}

export function loadCachedTeachers(): FacultyRecord[] {
  try {
    const raw = localStorage.getItem(TEACHERS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return INITIAL_PLSNHS_TEACHERS;
}

export const AdminTeachersPage: React.FC = () => {
  const [teachers, setTeachers] = useState<FacultyRecord[]>(loadCachedTeachers);
  const [sections, setSections] = useState<Section[]>(loadCachedSections);
  const [scheduleMap, setScheduleMap] = useState<Map<string, AttachedScheduleInfo>>(new Map());
  const [search, setSearch] = useState('');
  const [advisoryFilter, setAdvisoryFilter] = useState<'All' | 'Assigned' | 'Unassigned'>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [assignModalTeacher, setAssignModalTeacher] = useState<FacultyRecord | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [deletingTeacher, setDeletingTeacher] = useState<FacultyRecord | null>(null);
  const [deleteReasonCategory, setDeleteReasonCategory] = useState('');
  const [deleteReasonNotes, setDeleteReasonNotes] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Attach Schedule Modal State
  const [isAttachScheduleModalOpen, setIsAttachScheduleModalOpen] = useState(false);
  const [selectedTeacherForSchedule, setSelectedTeacherForSchedule] = useState<FacultyRecord | null>(null);
  const [scheduleFileInput, setScheduleFileInput] = useState<File | null>(null);
  const [scheduleTitle, setScheduleTitle] = useState('Official Faculty Teaching Schedule & Class Program (S.Y. 2026–2027)');
  const [scheduleSchoolYear, setScheduleSchoolYear] = useState('S.Y. 2026–2027');
  const [scheduleSemester, setScheduleSemester] = useState('1st & 2nd Semester');
  const [scheduleNotes, setScheduleNotes] = useState('Please review, download, or print your official teaching schedule and room assignments.');
  const [isAttaching, setIsAttaching] = useState(false);
  const scheduleFileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    specialization: 'General Education',
    password: '',
    advisorySectionId: '',
  });

  const loadSchedules = async () => {
    try {
      const map = await getTeacherAttachedScheduleMap();
      setScheduleMap(map);
    } catch (e) {
      console.warn('Error loading teacher schedule map:', e);
    }
  };

  const syncDataFromSupabase = async () => {
    try {
      const [usersRes, teachersTableRes, sectionsRes] = await Promise.all([
        supabase.from('users').select('*').eq('role', 'teacher'),
        supabase.from('teachers').select('*'),
        supabase.from('sections').select('*').order('grade_level', { ascending: true }).order('name', { ascending: true }),
      ]);

      let latestSections = loadCachedSections();
      if (!sectionsRes.error && sectionsRes.data && sectionsRes.data.length > 0) {
        // Ensure Grade 7 Chiong -> Mrs. Generale, De Gracia -> Mrs. Tapasao, Sayson -> Mrs. Llanda
        for (const dbSec of sectionsRes.data) {
          if (dbSec.grade_level === 'Grade 7' && dbSec.name === 'Chiong' && dbSec.adviser_name === 'Jherico maurin') {
            dbSec.adviser_name = 'Mrs. Generale';
            dbSec.adviser_id = null;
            supabase.from('sections').update({ adviser_name: 'Mrs. Generale', adviser_id: null }).eq('id', dbSec.id).then(() => {});
          }
          if (dbSec.grade_level === 'Grade 7' && dbSec.name === 'De Gracia' && dbSec.adviser_name === 'Ryan Quiroga') {
            dbSec.adviser_name = 'Mrs. Tapasao';
            dbSec.adviser_id = null;
            supabase.from('sections').update({ adviser_name: 'Mrs. Tapasao', adviser_id: null }).eq('id', dbSec.id).then(() => {});
          }
          if (dbSec.grade_level === 'Grade 7' && dbSec.name === 'Sayson' && !dbSec.adviser_name) {
            dbSec.adviser_name = 'Mrs. Llanda';
            dbSec.adviser_id = null;
            supabase.from('sections').update({ adviser_name: 'Mrs. Llanda', adviser_id: null }).eq('id', dbSec.id).then(() => {});
          }
        }

        // Merge DB sections while preserving any local room/adviser overrides
        latestSections = sectionsRes.data.map((dbSec: any) => {
          const cached = latestSections.find((c) => String(c.id) === String(dbSec.id));
          return {
            ...dbSec,
            adviser_name: cached?.adviser_name ?? dbSec.adviser_name ?? null,
            adviser_id: cached?.adviser_name ? (cached?.adviser_id ?? null) : (dbSec.adviser_id ?? null),
            room: dbSec.room || cached?.room || 'Main Academic Bldg',
          };
        });
        setSections(latestSections);
        try {
          localStorage.setItem(SECTIONS_CACHE_KEY, JSON.stringify(latestSections));
        } catch {
          // ignore
        }
      }

      if (!usersRes.error && usersRes.data) {
        const dbTeachMap = new Map<string, any>();
        if (!teachersTableRes.error && teachersTableRes.data) {
          teachersTableRes.data.forEach((row: any) => {
            if (row.user_id) dbTeachMap.set(String(row.user_id), row);
          });
        }

        const currentTeachers = loadCachedTeachers();
        const mergedMap = new Map<string, FacultyRecord>();
        currentTeachers.forEach((t) => mergedMap.set(String(t.id), t));

        usersRes.data.forEach((u: any) => {
          const tRow = dbTeachMap.get(String(u.id));
          const existing = mergedMap.get(String(u.id));
          mergedMap.set(String(u.id), {
            id: String(u.id),
            user_id: String(u.id),
            teacher_table_id: tRow?.id ? String(tRow.id) : existing?.teacher_table_id,
            employee_id: tRow?.employee_id || existing?.employee_id || `PLSNHS-TCH-${String(u.id).slice(0, 6).toUpperCase()}`,
            first_name: u.first_name || existing?.first_name || 'Teacher',
            last_name: u.last_name || existing?.last_name || '',
            email: u.email || existing?.email || '',
            specialization: tRow?.specialization || existing?.specialization || 'General Education',
            phone: tRow?.phone || u.contact_number || existing?.phone || '',
            status: 'Active',
            teacher_load_url: tRow?.teacher_load_url || existing?.teacher_load_url || null,
            teacher_load_name: tRow?.teacher_load_name || existing?.teacher_load_name || null,
            teacher_load_file_type: tRow?.teacher_load_file_type || existing?.teacher_load_file_type || null,
            teacher_load_updated_at: tRow?.teacher_load_updated_at || existing?.teacher_load_updated_at || null,
          });
        });

        const mergedList = Array.from(mergedMap.values());
        setTeachers(mergedList);
        try {
          localStorage.setItem(TEACHERS_CACHE_KEY, JSON.stringify(mergedList));
        } catch {
          // ignore
        }
      }

      await loadSchedules();
    } catch (err) {
      console.warn('Background teacher/section sync warning:', err);
    }
  };

  useEffect(() => {
    syncDataFromSupabase();

    const handleScheduleUpdate = () => {
      loadSchedules();
    };
    window.addEventListener('plsnhs-schedule-files-updated', handleScheduleUpdate);
    window.addEventListener('storage', handleScheduleUpdate);

    return () => {
      window.removeEventListener('plsnhs-schedule-files-updated', handleScheduleUpdate);
      window.removeEventListener('storage', handleScheduleUpdate);
    };
  }, []);

  const openAttachScheduleModal = (t: FacultyRecord) => {
    setSelectedTeacherForSchedule(t);
    setScheduleFileInput(null);
    const fullName = `${t.first_name} ${t.last_name}`.trim();
    setScheduleTitle(`Official Faculty Teaching Schedule: ${fullName} (S.Y. 2026–2027)`);
    setScheduleNotes(`Please review your official teaching schedule, section load, and room assignments for S.Y. 2026–2027.`);
    setIsAttachScheduleModalOpen(true);
  };

  const handleAttachScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherForSchedule) {
      setNotice({ type: 'error', message: 'Please select a teacher to attach the schedule file to.' });
      return;
    }
    if (!scheduleFileInput) {
      setNotice({ type: 'error', message: 'Please select a schedule document (PDF, Excel, Word, or Image) to upload.' });
      return;
    }

    setIsAttaching(true);
    try {
      const fullName = `${selectedTeacherForSchedule.first_name} ${selectedTeacherForSchedule.last_name}`.trim();
      const res = await uploadAndAttachTeacherSchedule({
        teacherId: selectedTeacherForSchedule.user_id || selectedTeacherForSchedule.id,
        teacherName: fullName,
        teacherTableId: selectedTeacherForSchedule.teacher_table_id,
        file: scheduleFileInput,
        title: scheduleTitle,
        schoolYear: scheduleSchoolYear,
        semester: scheduleSemester,
        notes: scheduleNotes,
        uploadedBy: 'School Administrator • Office of the Principal',
      });

      if (res.success) {
        setNotice({
          type: 'success',
          message: `Official teaching schedule file "${res.fileName}" successfully attached to ${fullName}! The teacher can now view, print, or download it under their Class Program.`,
        });
        setIsAttachScheduleModalOpen(false);
        setScheduleFileInput(null);
        await syncDataFromSupabase();
      } else {
        setNotice({
          type: 'error',
          message: res.error || 'Failed to attach schedule file.',
        });
      }
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'An unexpected error occurred while attaching schedule file.',
      });
    } finally {
      setIsAttaching(false);
    }
  };

  const handleDownloadAttachedSchedule = (fileUrl: string, fileName: string) => {
    if (!fileUrl) return;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName || 'Official_Teacher_Schedule.pdf';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Helper to find the section(s) a teacher advises
  const getTeacherAdvisorySections = (teacher: FacultyRecord): Section[] => {
    const fullName = `${teacher.first_name} ${teacher.last_name}`.trim().toLowerCase();
    return sections.filter((sec) => {
      if (teacher.teacher_table_id && String(sec.adviser_id) === String(teacher.teacher_table_id)) {
        return true;
      }
      if (String(sec.adviser_id) === String(teacher.id)) {
        return true;
      }
      const secAdviser = (sec.adviser_name || sec.adviser || '').trim().toLowerCase();
      return secAdviser === fullName && fullName.length > 0;
    });
  };

  const openAssignModal = (teacher: FacultyRecord) => {
    const currentAdvisories = getTeacherAdvisorySections(teacher);
    setAssignModalTeacher(teacher);
    setSelectedSectionId(currentAdvisories[0] ? String(currentAdvisories[0].id) : '');
  };

  const handleSaveAdvisoryAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalTeacher) return;
    setSavingAssignment(true);
    setNotice(null);

    const teacherFullName = `${assignModalTeacher.first_name} ${assignModalTeacher.last_name}`.trim();
    const adviserUuid = assignModalTeacher.teacher_table_id || null;

    try {
      // 1. Update local state & cache immediately
      const updatedSections = sections.map((sec) => {
        const isCurrentTeacherAdviser =
          (assignModalTeacher.teacher_table_id && String(sec.adviser_id) === String(assignModalTeacher.teacher_table_id)) ||
          (sec.adviser_name || sec.adviser || '').trim().toLowerCase() === teacherFullName.toLowerCase();

        // If this section is the newly selected one, assign this teacher
        if (String(sec.id) === String(selectedSectionId)) {
          return {
            ...sec,
            adviser_name: teacherFullName,
            adviser: teacherFullName,
            adviser_id: adviserUuid,
          };
        }

        // If the teacher was previously advising another section and switched/unassigned, clear the old one
        if (isCurrentTeacherAdviser && String(sec.id) !== String(selectedSectionId)) {
          return {
            ...sec,
            adviser_name: null,
            adviser: null,
            adviser_id: null,
          };
        }

        return sec;
      });

      setSections(updatedSections);
      localStorage.setItem(SECTIONS_CACHE_KEY, JSON.stringify(updatedSections));

      // 2. Persist to Supabase `sections` table
      // Clear previous sections assigned to this teacher name
      const prevAssigned = sections.filter(
        (s) =>
          String(s.id) !== String(selectedSectionId) &&
          ((assignModalTeacher.teacher_table_id && String(s.adviser_id) === String(assignModalTeacher.teacher_table_id)) ||
            (s.adviser_name || s.adviser || '').trim().toLowerCase() === teacherFullName.toLowerCase())
      );

      for (const oldSec of prevAssigned) {
        await supabase
          .from('sections')
          .update({ adviser_name: null, adviser_id: null })
          .eq('id', oldSec.id);
      }

      if (selectedSectionId) {
        const targetSec = sections.find((s) => String(s.id) === String(selectedSectionId));
        await supabase
          .from('sections')
          .update({
            adviser_name: teacherFullName,
            adviser_id: adviserUuid,
          })
          .eq('id', selectedSectionId);

        setNotice({
          type: 'success',
          message: `${teacherFullName} is now assigned as Class Adviser of ${targetSec?.grade_level} - Section ${targetSec?.name}.`,
        });
      } else {
        setNotice({
          type: 'success',
          message: `Cleared class advisory assignment for ${teacherFullName}.`,
        });
      }

      setAssignModalTeacher(null);
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Failed to update advisory assignment.',
      });
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `tch-${Date.now()}`;
    const empId = `PLSNHS-TCH-${Math.floor(100000 + Math.random() * 900000)}`;

    const newTeacher: FacultyRecord = {
      id: newId,
      user_id: newId,
      employee_id: empId,
      first_name: firstName,
      last_name: lastName,
      email: form.email.trim(),
      specialization: form.specialization,
      status: 'Active',
    };

    try {
      // Save to Supabase users table
      const { data: insertedUser, error: userError } = await supabase
        .from('users')
        .insert([
          {
            first_name: firstName,
            last_name: lastName,
            email: form.email.trim(),
            password: form.password,
            role: 'teacher',
          },
        ])
        .select()
        .single();

      if (userError) throw new Error(userError.message);

      if (insertedUser?.id) {
        newTeacher.id = String(insertedUser.id);
        newTeacher.user_id = String(insertedUser.id);

        // Also save to Supabase teachers table
        const { data: teacherRow } = await supabase
          .from('teachers')
          .insert([
            {
              user_id: insertedUser.id,
              employee_id: empId,
              specialization: form.specialization || 'General Education',
              phone: '09123456789',
              address: 'City of Naga, Cebu',
            },
          ])
          .select()
          .maybeSingle();

        if (teacherRow?.id) {
          newTeacher.teacher_table_id = String(teacherRow.id);
        }
      }

      const updatedTeachers = [newTeacher, ...teachers];
      setTeachers(updatedTeachers);
      localStorage.setItem(TEACHERS_CACHE_KEY, JSON.stringify(updatedTeachers));

      // If an advisory section was chosen during creation, assign it immediately
      if (form.advisorySectionId) {
        const updatedSections = sections.map((sec) =>
          String(sec.id) === String(form.advisorySectionId)
            ? { ...sec, adviser_name: fullName, adviser: fullName }
            : sec
        );
        setSections(updatedSections);
        localStorage.setItem(SECTIONS_CACHE_KEY, JSON.stringify(updatedSections));

        await supabase
          .from('sections')
          .update({ adviser_name: fullName })
          .eq('id', form.advisorySectionId);
      }

      const assignedSec = sections.find((s) => String(s.id) === String(form.advisorySectionId));
      setNotice({
        type: 'success',
        message: assignedSec
          ? `Teacher ${fullName} registered and assigned as Class Adviser for ${assignedSec.grade_level} - ${assignedSec.name}!`
          : `Teacher ${fullName} registered successfully!`,
      });
      setIsAddModalOpen(false);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        specialization: 'General Education',
        password: '',
        advisorySectionId: '',
      });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to add teacher.' });
    }
  };

  const handleDelete = (teacher: FacultyRecord) => {
    setDeletingTeacher(teacher);
    setDeleteReasonCategory('');
    setDeleteReasonNotes('');
  };

  const handleConfirmDeleteTeacher = async () => {
    if (!deletingTeacher) return;
    const finalReason =
      deleteReasonCategory === 'Other (Specify Below)'
        ? deleteReasonNotes.trim()
        : deleteReasonNotes.trim()
        ? `${deleteReasonCategory} — ${deleteReasonNotes.trim()}`
        : deleteReasonCategory.trim();

    if (!finalReason) {
      setNotice({
        type: 'error',
        message: 'Please provide a reason before deleting the teacher record.',
      });
      return;
    }

    setDeleteLoading(true);
    const fullName = `${deletingTeacher.first_name} ${deletingTeacher.last_name}`.trim();

    try {
      // 1. Remove from teachers list & cache
      const nextTeachers = teachers.filter((t) => String(t.id) !== String(deletingTeacher.id));
      setTeachers(nextTeachers);
      localStorage.setItem(TEACHERS_CACHE_KEY, JSON.stringify(nextTeachers));

      // 2. Unassign from any sections they were advising
      const advisories = getTeacherAdvisorySections(deletingTeacher);
      if (advisories.length > 0) {
        const updatedSections = sections.map((sec) =>
          advisories.some((a) => String(a.id) === String(sec.id))
            ? { ...sec, adviser_name: null, adviser: null, adviser_id: null }
            : sec
        );
        setSections(updatedSections);
        localStorage.setItem(SECTIONS_CACHE_KEY, JSON.stringify(updatedSections));

        for (const advSec of advisories) {
          await supabase
            .from('sections')
            .update({ adviser_name: null, adviser_id: null })
            .eq('id', advSec.id);
        }
      }

      // 3. Delete from Supabase teachers & users if applicable
      if (deletingTeacher.user_id) {
        await supabase.from('teachers').delete().eq('user_id', deletingTeacher.user_id);
        await supabase.from('users').delete().eq('id', deletingTeacher.user_id);
      } else if (deletingTeacher.teacher_table_id) {
        await supabase.from('teachers').delete().eq('id', deletingTeacher.teacher_table_id);
      }

      // 4. Record deletion reason in audit log
      try {
        const rawLogs = localStorage.getItem('plsnhs_deletion_audit_logs_v1');
        const logs = rawLogs ? JSON.parse(rawLogs) : [];
        logs.unshift({
          id: `del-tch-${Date.now()}`,
          entity_type: 'Teacher',
          entity_name: fullName,
          identifier: deletingTeacher.employee_id,
          department: deletingTeacher.specialization,
          reason: finalReason,
          deleted_at: new Date().toISOString(),
        });
        localStorage.setItem('plsnhs_deletion_audit_logs_v1', JSON.stringify(logs.slice(0, 200)));
      } catch {
        // ignore
      }

      setNotice({
        type: 'success',
        message: `Teacher ${fullName} removed from faculty records. Reason: ${finalReason}`,
      });
      setDeletingTeacher(null);
      setDeleteReasonCategory('');
      setDeleteReasonNotes('');
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Failed to delete teacher record.',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const advisories = getTeacherAdvisorySections(t);
      if (advisoryFilter === 'Assigned' && advisories.length === 0) return false;
      if (advisoryFilter === 'Unassigned' && advisories.length > 0) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;
      const fullName = `${t.first_name} ${t.last_name}`.toLowerCase();
      const email = (t.email || '').toLowerCase();
      const spec = (t.specialization || '').toLowerCase();
      const empId = (t.employee_id || '').toLowerCase();
      const advText = advisories.map((a) => `${a.grade_level} ${a.name}`).join(' ').toLowerCase();
      return (
        fullName.includes(q) ||
        email.includes(q) ||
        spec.includes(q) ||
        empId.includes(q) ||
        advText.includes(q)
      );
    });
  }, [teachers, sections, search, advisoryFilter]);

  const assignedCount = useMemo(
    () => teachers.filter((t) => getTeacherAdvisorySections(t).length > 0).length,
    [teachers, sections]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 sm:pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display tracking-tight leading-snug">
              Teachers &amp; Class Advisers
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Manage faculty members and assign Class Advisers to Grade 7–12 sections.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-auto pt-0.5">
            <button
              type="button"
              onClick={() => {
                setSelectedTeacherForSchedule(filteredTeachers[0] || null);
                setIsAttachScheduleModalOpen(true);
              }}
              className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 text-xs font-extrabold text-slate-950 shadow-xs hover:bg-amber-400 transition-all cursor-pointer whitespace-nowrap"
            >
              <Paperclip className="h-4 w-4" /> Attach Schedule to Teacher
            </button>
            <button
              onClick={() => {
                setForm({
                  firstName: '',
                  lastName: '',
                  email: '',
                  specialization: 'General Education',
                  password: '',
                  advisorySectionId: '',
                });
                setIsAddModalOpen(true);
              }}
              className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-4 w-4" /> Register Teacher / Adviser
            </button>
            <PageHeaderNotificationSlot />
          </div>
        </div>

        {/* Mobile Action Button Row */}
        <div className="sm:hidden mt-3 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setSelectedTeacherForSchedule(filteredTeachers[0] || null);
              setIsAttachScheduleModalOpen(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-amber-500 px-3 text-xs font-extrabold text-slate-950 shadow-xs hover:bg-amber-400 transition-all cursor-pointer whitespace-nowrap"
          >
            <Paperclip className="h-4 w-4" /> Attach Schedule
          </button>
          <button
            onClick={() => {
              setForm({
                firstName: '',
                lastName: '',
                email: '',
                specialization: 'General Education',
                password: '',
                advisorySectionId: '',
              });
              setIsAddModalOpen(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> Register Teacher / Adviser
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Total Faculty</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{teachers.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Registered teachers & advisers</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Assigned Class Advisers</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{assignedCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Handling Grade 7–12 advisory classes</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase">Active Class Sections</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{sections.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Junior & Senior High School</p>
          </div>
          <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Layers className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by teacher name, advisory section, email..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {(['All', 'Assigned', 'Unassigned'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setAdvisoryFilter(tab)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                advisoryFilter === tab
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab === 'All'
                ? `All (${teachers.length})`
                : tab === 'Assigned'
                ? `With Advisory (${assignedCount})`
                : `Unassigned (${teachers.length - assignedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Faculty & Class Adviser Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Teacher / Faculty Member</th>
                <th className="px-5 py-3.5">Assigned Advisory Section</th>
                <th className="px-5 py-3.5">Teaching Schedule File</th>
                <th className="px-5 py-3.5">Email Address</th>
                <th className="px-5 py-3.5 text-right">Schedule &amp; Advisory Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTeachers.length > 0 ? (
                filteredTeachers.map((t) => {
                  const fullName = `${t.first_name} ${t.last_name}`.trim();
                  const advisories = getTeacherAdvisorySections(t);
                  const attachedSchedule =
                    scheduleMap.get(String(t.user_id || '')) ||
                    scheduleMap.get(String(t.teacher_table_id || '')) ||
                    scheduleMap.get(String(t.id)) ||
                    scheduleMap.get(fullName.toLowerCase()) ||
                    (t.teacher_load_url && t.teacher_load_name
                      ? {
                          id: t.id,
                          fileName: t.teacher_load_name,
                          fileUrl: t.teacher_load_url,
                          fileType: t.teacher_load_file_type || 'PDF',
                          title: 'Official Faculty Teaching Schedule',
                          updatedAt: t.teacher_load_updated_at
                            ? new Date(t.teacher_load_updated_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Active',
                        }
                      : null);

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                            {(t.first_name?.[0] || 'T').toUpperCase()}
                            {(t.last_name?.[0] || '').toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{fullName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {t.employee_id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {advisories.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {advisories.map((sec) => {
                              const isShs =
                                sec.grade_level === 'Grade 11' || sec.grade_level === 'Grade 12';
                              return (
                                <span
                                  key={sec.id}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  {sec.grade_level} • Section {sec.name}
                                  {isShs && sec.strand ? ` (${sec.strand})` : ''}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                            No Advisory Assigned
                          </span>
                        )}
                      </td>

                      {/* Attached Teaching Schedule Column */}
                      <td className="px-5 py-4">
                        {attachedSchedule ? (
                          <div className="flex flex-col gap-1 max-w-xs">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                                <FileText className="h-4 w-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p
                                  className="truncate text-xs font-bold text-slate-900"
                                  title={attachedSchedule.fileName}
                                >
                                  {attachedSchedule.fileName}
                                </p>
                                <p className="text-[10px] text-emerald-700 font-semibold">
                                  {attachedSchedule.fileType || 'PDF'} •{' '}
                                  {attachedSchedule.fileSize || attachedSchedule.updatedAt || 'Active'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadAttachedSchedule(
                                    attachedSchedule.fileUrl,
                                    attachedSchedule.fileName
                                  )
                                }
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                                title="View or download attached schedule file"
                              >
                                <Download className="h-3 w-3" /> View / Download
                              </button>
                              <span className="text-slate-300">•</span>
                              <button
                                type="button"
                                onClick={() => openAttachScheduleModal(t)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                                title="Replace or upload a new schedule file"
                              >
                                Replace
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
                              No Schedule Attached
                            </span>
                            <button
                              type="button"
                              onClick={() => openAttachScheduleModal(t)}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 transition-all cursor-pointer whitespace-nowrap"
                              title={`Attach schedule file to ${fullName}`}
                            >
                              <Paperclip className="h-3 w-3 text-amber-600" />
                              Attach
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{t.email}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openAttachScheduleModal(t)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-all cursor-pointer whitespace-nowrap"
                            title={`Attach schedule file to ${fullName}`}
                          >
                            <Paperclip className="h-3.5 w-3.5 text-amber-600" />
                            {attachedSchedule ? 'Update Schedule' : 'Attach Schedule'}
                          </button>
                          <button
                            type="button"
                            onClick={() => openAssignModal(t)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-700 hover:text-white hover:border-emerald-700 transition-all cursor-pointer whitespace-nowrap"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            {advisories.length > 0 ? 'Change Advisory' : 'Assign Advisory'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(t)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove Teacher"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No teachers found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign / Change Class Advisory Modal */}
      <Modal
        isOpen={Boolean(assignModalTeacher)}
        onClose={() => setAssignModalTeacher(null)}
        title="Assign Class Adviser to Section"
        subtitle={
          assignModalTeacher
            ? `Select the Grade Level & Section to assign to ${assignModalTeacher.first_name} ${assignModalTeacher.last_name}`
            : ''
        }
      >
        {assignModalTeacher && (
          <form onSubmit={handleSaveAdvisoryAssignment} className="space-y-4">
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3.5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white font-bold text-xs">
                {(assignModalTeacher.first_name?.[0] || 'T').toUpperCase()}
                {(assignModalTeacher.last_name?.[0] || '').toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {assignModalTeacher.first_name} {assignModalTeacher.last_name}
                </p>
                <p className="text-xs text-slate-500 font-mono">
                  {assignModalTeacher.employee_id}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Advisory Year Level & Section (Grade 7–12)
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              >
                <option value="">— No Advisory Section (Unassigned) —</option>
                {(['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'] as const).map(
                  (grade) => {
                    const gradeSecs = sections.filter((s) => s.grade_level === grade);
                    if (gradeSecs.length === 0) return null;
                    return (
                      <optgroup key={grade} label={grade}>
                        {gradeSecs.map((sec) => {
                          const currentAdv = sec.adviser_name || sec.adviser;
                          return (
                            <option key={sec.id} value={String(sec.id)}>
                              {sec.grade_level} - Section {sec.name}
                              {currentAdv ? ` (Current Adviser: ${currentAdv})` : ' (Unassigned)'}
                            </option>
                          );
                        })}
                      </optgroup>
                    );
                  }
                )}
              </select>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Assigning this teacher will automatically update the Class Adviser on the selected section.
              </p>
            </div>

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignModalTeacher(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingAssignment}
                className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
              >
                {savingAssignment ? 'Saving...' : 'Save Adviser Assignment'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Register New Teacher Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Teacher / Class Adviser"
        subtitle="Add a faculty member and optionally assign their advisory class section"
      >
        <form onSubmit={handleAddTeacher} autoComplete="off" className="space-y-4">
          {/* Hidden inputs to absorb browser credential autofill */}
          <input type="text" name="fake_username_autofill_trap" autoComplete="username" className="hidden" tabIndex={-1} />
          <input type="password" name="fake_password_autofill_trap" autoComplete="current-password" className="hidden" tabIndex={-1} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                First Name / Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="e.g. Maria or Mrs."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="e.g. Santos"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              name="new_teacher_email_address"
              required
              readOnly
              onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="teacher@plsnhs.edu.ph"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Assign Advisory Section (Optional)
            </label>
            <select
              value={form.advisorySectionId}
              onChange={(e) => setForm({ ...form, advisorySectionId: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:outline-hidden"
            >
              <option value="">— No Advisory Section Yet —</option>
              {(['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'] as const).map(
                (grade) => (
                  <optgroup key={grade} label={grade}>
                    {sections
                      .filter((s) => s.grade_level === grade)
                      .map((sec) => (
                        <option key={sec.id} value={String(sec.id)}>
                          {sec.grade_level} - Section {sec.name} (Current: {sec.adviser_name || sec.adviser || 'Unassigned'})
                        </option>
                      ))}
                  </optgroup>
                )
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Initial Account Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              name="new_teacher_initial_password"
              required
              readOnly
              onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Initial login password"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 cursor-pointer"
            >
              Register Teacher
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Teacher Deletion Modal with Required Reason */}
      {deletingTeacher && (
        <Modal
          isOpen={!!deletingTeacher}
          onClose={() => {
            setDeletingTeacher(null);
            setDeleteReasonCategory('');
            setDeleteReasonNotes('');
          }}
          title="Confirm Teacher / Adviser Deletion"
          subtitle="A valid reason is required to remove a teacher from the faculty directory"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1.5">
              <p className="font-bold text-sm text-rose-900">
                Are you sure you want to delete this teacher record?
              </p>
              <p className="leading-relaxed">
                You are about to remove{' '}
                <strong>
                  {deletingTeacher.first_name} {deletingTeacher.last_name}
                </strong>{' '}
                (<span className="font-mono">{deletingTeacher.employee_id}</span>) from the faculty directory.
                {getTeacherAdvisorySections(deletingTeacher).length > 0 && (
                  <>
                    {' '}
                    This will also unassign them as Class Adviser of{' '}
                    <strong>
                      {getTeacherAdvisorySections(deletingTeacher)
                        .map((s) => `${s.grade_level} - Section ${s.name}`)
                        .join(', ')}
                    </strong>
                    .
                  </>
                )}
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                Reason for Deletion <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={deleteReasonCategory}
                onChange={(e) => setDeleteReasonCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-800 focus:border-rose-600 focus:bg-white focus:outline-hidden"
              >
                <option value="">— Select Reason for Deletion —</option>
                <option value="Transferred to Another DepEd Station / School">
                  Transferred to Another DepEd Station / School
                </option>
                <option value="Resigned / End of Contract">Resigned / End of Contract</option>
                <option value="Retired from Service">Retired from Service</option>
                <option value="Reassigned to Non-Teaching / Administrative Role">
                  Reassigned to Non-Teaching / Administrative Role
                </option>
                <option value="On Extended / Indefinite Leave">
                  On Extended / Indefinite Leave
                </option>
                <option value="Duplicate / Erroneous Faculty Entry">
                  Duplicate / Erroneous Faculty Entry
                </option>
                <option value="Other (Specify Below)">Other (Specify Below)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                Additional Remarks / Explanation{' '}
                {deleteReasonCategory === 'Other (Specify Below)' && (
                  <span className="text-rose-500">*</span>
                )}
              </label>
              <textarea
                rows={3}
                value={deleteReasonNotes}
                onChange={(e) => setDeleteReasonNotes(e.target.value)}
                placeholder="Enter official reason or remarks for audit log..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs font-medium text-slate-800 focus:border-rose-600 focus:bg-white focus:outline-hidden resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeletingTeacher(null);
                  setDeleteReasonCategory('');
                  setDeleteReasonNotes('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  deleteLoading ||
                  !deleteReasonCategory ||
                  (deleteReasonCategory === 'Other (Specify Below)' && !deleteReasonNotes.trim())
                }
                onClick={handleConfirmDeleteTeacher}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deleteLoading ? 'Deleting...' : 'Confirm & Delete Teacher'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* Modal: Attach Schedule File to Teacher */}
      {isAttachScheduleModalOpen && (
        <Modal
          isOpen={isAttachScheduleModalOpen}
          onClose={() => {
            if (!isAttaching) {
              setIsAttachScheduleModalOpen(false);
              setScheduleFileInput(null);
            }
          }}
          title="Attach Official Schedule File to Teacher"
          subtitle="Upload official class timetable & teaching program document (PDF, Excel, Word, or Image)"
          maxWidth="2xl"
        >
          <form onSubmit={handleAttachScheduleSubmit} className="space-y-4 text-xs">
            {/* Target Teacher Selection / Card */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Faculty Teacher Recipient <span className="text-rose-500">*</span>
              </label>
              {selectedTeacherForSchedule ? (
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-bold text-sm">
                      {(selectedTeacherForSchedule.first_name?.[0] || 'T').toUpperCase()}
                      {(selectedTeacherForSchedule.last_name?.[0] || '').toUpperCase()}
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 text-sm">
                        {selectedTeacherForSchedule.first_name} {selectedTeacherForSchedule.last_name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-slate-600">{selectedTeacherForSchedule.employee_id}</span>
                        <span>•</span>
                        <span>{selectedTeacherForSchedule.specialization}</span>
                        <span>•</span>
                        <span>{selectedTeacherForSchedule.email}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTeacherForSchedule(null)}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer"
                  >
                    Change Teacher
                  </button>
                </div>
              ) : (
                <select
                  required
                  value=""
                  onChange={(e) => {
                    const found = teachers.find((t) => t.id === e.target.value);
                    if (found) setSelectedTeacherForSchedule(found);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
                >
                  <option value="">— Select Target Teacher —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} ({t.employee_id}) — {t.specialization}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* File Upload Zone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Schedule Document File <span className="text-rose-500">*</span>
              </label>
              <input
                ref={scheduleFileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setScheduleFileInput(file);
                }}
                className="hidden"
              />
              <div
                onClick={() => scheduleFileInputRef.current?.click()}
                className={`rounded-2xl border-2 border-dashed p-4 text-center transition-all cursor-pointer ${
                  scheduleFileInput
                    ? 'border-emerald-400 bg-emerald-50/60 hover:bg-emerald-50'
                    : 'border-slate-300 bg-slate-50 hover:border-emerald-500 hover:bg-emerald-50/20'
                }`}
              >
                <Upload className="mx-auto h-7 w-7 text-emerald-700 mb-1.5" />
                {scheduleFileInput ? (
                  <div className="space-y-1">
                    <p className="text-sm font-extrabold text-emerald-900">
                      {scheduleFileInput.name}
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      {Math.max(1, Math.round(scheduleFileInput.size / 1024))} KB •{' '}
                      {scheduleFileInput.name.split('.').pop()?.toUpperCase()} Document
                    </p>
                    <p className="text-[11px] font-bold text-slate-500 pt-1">
                      Click to choose a different file
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Click to browse &amp; attach schedule file
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Accepts PDF, Microsoft Word (.docx), Excel (.xlsx), JPG, PNG
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Document Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Schedule Document Title
              </label>
              <input
                type="text"
                value={scheduleTitle}
                onChange={(e) => setScheduleTitle(e.target.value)}
                placeholder="e.g. Official Faculty Teaching Schedule & Class Program"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* School Year & Semester */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  School Year
                </label>
                <input
                  type="text"
                  value={scheduleSchoolYear}
                  onChange={(e) => setScheduleSchoolYear(e.target.value)}
                  placeholder="S.Y. 2026–2027"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium focus:border-emerald-600 focus:bg-white focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Semester / Grading Term
                </label>
                <input
                  type="text"
                  value={scheduleSemester}
                  onChange={(e) => setScheduleSemester(e.target.value)}
                  placeholder="1st & 2nd Semester"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium focus:border-emerald-600 focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            {/* Remarks / Memo */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Admin Memo / Notes for Teacher
              </label>
              <textarea
                rows={2}
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                placeholder="Notes, room assignment remarks, or instructions for the teacher..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-medium focus:border-emerald-600 focus:bg-white focus:outline-hidden resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isAttaching}
                onClick={() => {
                  setIsAttachScheduleModalOpen(false);
                  setScheduleFileInput(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAttaching || !scheduleFileInput || !selectedTeacherForSchedule}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Paperclip className="h-4 w-4" />
                <span>
                  {isAttaching ? 'Uploading & Attaching...' : 'Attach & Send Schedule'}
                </span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
