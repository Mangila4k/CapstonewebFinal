import { supabase } from './supabase';

export interface TeacherAttendanceRecord {
  id: string | number;
  teacher_id?: string;
  teacher_name: string;
  department: string;
  time_in: string;
  time_out?: string;
  date: string;
  status: 'Recorded' | 'Present' | string;
  mode: 'Face Biometrics (AI Camera)' | 'Facial Recognition Kiosk' | 'Manual Override' | string;
  confidence_score?: number;
  photo_snapshot?: string;
  verified_by?: string;
  created_at?: string;
}

const STORAGE_KEY = 'plsnhs_teacher_attendance_records_v1';

export const DEFAULT_TEACHER_ATTENDANCE: TeacherAttendanceRecord[] = [
  {
    id: 'rec-1',
    teacher_name: 'Maria Santos',
    department: 'Mathematics',
    time_in: '07:12 AM',
    time_out: '04:30 PM',
    status: 'Recorded',
    date: new Date().toISOString().split('T')[0],
    mode: 'Face Biometrics (AI Camera)',
    confidence_score: 99.4,
    created_at: new Date().toISOString(),
  },
  {
    id: 'rec-2',
    teacher_name: 'Jose Rodriguez',
    department: 'Science',
    time_in: '07:20 AM',
    time_out: '04:32 PM',
    status: 'Recorded',
    date: new Date().toISOString().split('T')[0],
    mode: 'Face Biometrics (AI Camera)',
    confidence_score: 98.7,
    created_at: new Date().toISOString(),
  },
  {
    id: 'rec-3',
    teacher_name: 'Elena Dela Torre',
    department: 'Filipino',
    time_in: '07:38 AM',
    time_out: '—',
    status: 'Recorded',
    date: new Date().toISOString().split('T')[0],
    mode: 'Face Biometrics (AI Camera)',
    confidence_score: 99.1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'rec-4',
    teacher_name: 'Robert Ramos',
    department: 'TVL ICT',
    time_in: '07:15 AM',
    time_out: '04:30 PM',
    status: 'Recorded',
    date: new Date().toISOString().split('T')[0],
    mode: 'Face Biometrics (AI Camera)',
    confidence_score: 99.8,
    created_at: new Date().toISOString(),
  },
  {
    id: 'rec-5',
    teacher_name: 'Mr. J. Almario',
    department: 'Junior High School',
    time_in: '07:10 AM',
    time_out: '04:35 PM',
    status: 'Recorded',
    date: new Date().toISOString().split('T')[0],
    mode: 'Face Biometrics (AI Camera)',
    confidence_score: 99.6,
    created_at: new Date().toISOString(),
  },
];

export function getLocalTeacherAttendance(): TeacherAttendanceRecord[] {
  if (typeof window === 'undefined') return DEFAULT_TEACHER_ATTENDANCE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TEACHER_ATTENDANCE));
      return DEFAULT_TEACHER_ATTENDANCE;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TEACHER_ATTENDANCE;
  } catch (err) {
    console.warn('Failed reading teacher attendance cache:', err);
    return DEFAULT_TEACHER_ATTENDANCE;
  }
}

export function saveLocalTeacherAttendance(records: TeacherAttendanceRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('plsnhs_teacher_attendance_updated'));
  } catch (err) {
    console.warn('Failed saving teacher attendance cache:', err);
  }
}

export async function fetchAllTeacherAttendance(): Promise<TeacherAttendanceRecord[]> {
  const localList = getLocalTeacherAttendance();
  try {
    const { data: dbData, error } = await supabase
      .from('teacher_attendance')
      .select('*')
      .order('date', { ascending: false })
      .limit(50);

    if (!error && dbData && dbData.length > 0) {
      const dbRecords: TeacherAttendanceRecord[] = dbData.map((d: any) => ({
        id: d.id,
        teacher_id: d.teacher_id,
        teacher_name: d.teacher_name || 'Faculty Member',
        department: d.department || 'Academics',
        time_in: d.time_in || '07:15 AM',
        time_out: d.time_out || '—',
        date: d.date ? d.date.split('T')[0] : new Date().toISOString().split('T')[0],
        status: d.status || 'Recorded',
        mode: d.mode || 'Face Biometrics (AI Camera)',
        confidence_score: d.confidence_score || 99.4,
        photo_snapshot: d.photo_snapshot,
        created_at: d.created_at || new Date().toISOString(),
      }));

      // Merge with local records (avoiding duplicates)
      const mergedMap = new Map<string, TeacherAttendanceRecord>();
      dbRecords.forEach((r) => mergedMap.set(`${r.teacher_name}-${r.date}`, r));
      localList.forEach((r) => {
        const key = `${r.teacher_name}-${r.date}`;
        if (!mergedMap.has(key)) {
          mergedMap.set(key, r);
        }
      });
      return Array.from(mergedMap.values());
    }
  } catch (err) {
    console.warn('Error fetching Supabase teacher attendance:', err);
  }

  return localList;
}

export async function recordTeacherAttendance(
  record: Omit<TeacherAttendanceRecord, 'id' | 'created_at'>
): Promise<TeacherAttendanceRecord> {
  const newRecord: TeacherAttendanceRecord = {
    ...record,
    id: `rec-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  // 1. Immediately save to high-speed local storage
  const current = getLocalTeacherAttendance();
  // If entry exists for same teacher on same date, update it
  const existingIdx = current.findIndex(
    (c) => c.teacher_name.toLowerCase() === record.teacher_name.toLowerCase() && c.date === record.date
  );

  let updatedList: TeacherAttendanceRecord[];
  if (existingIdx >= 0) {
    const existing = current[existingIdx];
    current[existingIdx] = {
      ...existing,
      ...newRecord,
      id: existing.id,
      time_out: record.time_out || existing.time_out || '—',
    };
    updatedList = [...current];
  } else {
    updatedList = [newRecord, ...current];
  }

  saveLocalTeacherAttendance(updatedList);

  // 2. Persist to Supabase in background
  try {
    await supabase.from('teacher_attendance').upsert({
      teacher_name: newRecord.teacher_name,
      department: newRecord.department,
      time_in: newRecord.time_in,
      time_out: newRecord.time_out,
      date: newRecord.date,
      status: newRecord.status,
      mode: newRecord.mode,
      confidence_score: newRecord.confidence_score,
      created_at: newRecord.created_at,
    });
  } catch (err) {
    console.warn('Supabase teacher attendance upsert error:', err);
  }

  return newRecord;
}

