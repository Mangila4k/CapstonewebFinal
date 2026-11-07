import { supabase } from './supabase';

export interface UnifiedAttendanceRecord {
  id: string | number;
  student_id: string;
  student_name?: string;
  lrn?: string;
  section_id?: string | null;
  section_name?: string;
  grade_level?: string;
  strand?: string;
  teacher_id?: string | null;
  date: string;
  mode: string;
  status: 'present' | 'late' | 'absent' | 'excused' | string;
  time_in?: string | null;
  time_out?: string | null;
  remarks?: string | null;
  qr_code?: string | null;
  raw_payload?: string | null;
  scanned_at?: string;
  created_at?: string;
  avatar_url?: string | null;
}

/**
 * Record student attendance directly into the Supabase attendance_records table
 * (with automatic dual-write to attendance table for backwards compatibility).
 */
export async function logAttendanceRecord(payload: {
  student_id: string;
  section_id?: string | null;
  teacher_id?: string | null;
  subject_id?: string | null;
  date?: string;
  mode?: string;
  status?: string;
  time_in?: string | null;
  time_out?: string | null;
  remarks?: string | null;
  qr_code?: string | null;
  raw_payload?: string | null;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const todayStr = payload.date || new Date().toISOString().split('T')[0];
  const currentTime =
    payload.time_in ||
    new Date().toLocaleTimeString('en-GB', { hour12: false }); // "HH:MM:SS"
  const cleanStatus = (payload.status || 'present').toLowerCase();
  const cleanMode = (payload.mode || 'qr').toLowerCase();

  const recordPayload = {
    student_id: payload.student_id,
    section_id: payload.section_id || null,
    teacher_id: payload.teacher_id || null,
    subject_id: payload.subject_id || null,
    date: todayStr,
    mode: cleanMode,
    status: cleanStatus,
    time_in: currentTime,
    time_out: payload.time_out || null,
    remarks: payload.remarks || null,
    qr_code: payload.qr_code || null,
    raw_payload: payload.raw_payload || null,
    scanned_at: new Date().toISOString(),
  };

  let recordSaved = false;

  // 1. Primary write to attendance_records
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .insert(recordPayload)
      .select()
      .maybeSingle();

    if (!error && data) {
      recordSaved = true;
    } else if (error) {
      console.warn('Notice inserting to attendance_records:', error.message);
    }
  } catch (err) {
    console.warn('Exception writing to attendance_records:', err);
  }

  // 2. Dual-write backup to attendance table
  try {
    const legacyPayload = {
      student_id: payload.student_id,
      section_id: payload.section_id || null,
      date: todayStr,
      time_in: currentTime,
      time_out: payload.time_out || null,
      status: cleanStatus,
      qr_code: payload.qr_code || payload.raw_payload || null,
      remarks: payload.remarks || null,
    };

    await supabase.from('attendance').upsert(legacyPayload, {
      onConflict: 'student_id,date',
    });
  } catch (err) {
    // ignore legacy trigger warning
  }

  // 3. Dispatch client-side real-time event for zero-latency screen updates
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('plsnhs_attendance_updated', {
        detail: recordPayload,
      })
    );
  }

  return { success: true, data: recordPayload };
}

/**
 * Fetch attendance logs from Supabase attendance_records table
 * Merges with legacy attendance table so no historical logs are missed.
 */
export async function fetchAttendanceRecords(filter?: {
  student_id?: string;
  lrn?: string;
  date?: string;
  section_id?: string;
  limit?: number;
}): Promise<UnifiedAttendanceRecord[]> {
  const maxLimit = filter?.limit || 200;

  try {
    // 1. Query attendance_records
    let q = supabase
      .from('attendance_records')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(maxLimit);

    if (filter?.date) q = q.eq('date', filter.date);
    if (filter?.section_id) q = q.eq('section_id', filter.section_id);
    if (filter?.student_id) {
      if (filter.lrn) {
        q = q.or(`student_id.eq.${filter.student_id},qr_code.ilike.%${filter.lrn}%`);
      } else {
        q = q.eq('student_id', filter.student_id);
      }
    } else if (filter?.lrn) {
      q = q.ilike('qr_code', `%${filter.lrn}%`);
    }

    const { data: recordsData, error: recordsErr } = await q;

    // 2. Query legacy attendance as fallback or union
    let lq = supabase
      .from('attendance')
      .select('*')
      .order('date', { ascending: false })
      .limit(maxLimit);

    if (filter?.date) lq = lq.eq('date', filter.date);
    if (filter?.section_id) lq = lq.eq('section_id', filter.section_id);
    if (filter?.student_id) {
      if (filter.lrn) {
        lq = lq.or(`student_id.eq.${filter.student_id},qr_code.ilike.%${filter.lrn}%`);
      } else {
        lq = lq.eq('student_id', filter.student_id);
      }
    } else if (filter?.lrn) {
      lq = lq.ilike('qr_code', `%${filter.lrn}%`);
    }

    const { data: legacyData } = await lq;

    // Combine and deduplicate
    const map = new Map<string, UnifiedAttendanceRecord>();

    if (recordsData && recordsData.length > 0) {
      recordsData.forEach((r: any) => {
        const key = `${r.student_id}_${r.date}_${r.mode || 'log'}`;
        map.set(key, {
          id: r.id,
          student_id: r.student_id,
          section_id: r.section_id,
          teacher_id: r.teacher_id,
          date: r.date,
          mode: r.mode || 'qr',
          status: (r.status || 'present').toLowerCase(),
          time_in: r.time_in,
          time_out: r.time_out,
          remarks: r.remarks,
          qr_code: r.qr_code,
          raw_payload: r.raw_payload,
          scanned_at: r.scanned_at || r.created_at,
          created_at: r.created_at,
        });
      });
    }

    if (legacyData && legacyData.length > 0) {
      legacyData.forEach((l: any) => {
        const key = `${l.student_id}_${l.date}_qr`;
        if (!map.has(key)) {
          map.set(key, {
            id: l.id,
            student_id: l.student_id,
            section_id: l.section_id,
            date: l.date,
            mode: 'qr',
            status: (l.status || 'present').toLowerCase(),
            time_in: l.time_in,
            time_out: l.time_out,
            remarks: l.remarks,
            qr_code: l.qr_code,
            created_at: l.created_at,
          });
        }
      });
    }

    return Array.from(map.values());
  } catch (err) {
    console.warn('Error reading attendance records:', err);
    return [];
  }
}
