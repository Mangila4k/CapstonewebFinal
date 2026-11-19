import { supabase } from './supabase';
import { ensureAuthenticatedSession } from './studentDocumentsService';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL_CACHE_KEY = 'plsnhs_unified_attendance_cache_v1';

export function isUuid(val?: any): boolean {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

/**
 * Returns YYYY-MM-DD in the user's local timezone (avoids UTC date-shift before 8:00 AM PH time).
 */
export function getLocalTodayStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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

const teacherIdCache = new Map<string, string | null>();

export interface TeacherRegistrationCheckResult {
  isRegistered: boolean;
  teacherId?: string | null;
  employeeId?: string | null;
  specialization?: string | null;
  message?: string;
}

/**
 * Validates whether a faculty teacher is officially registered by the School Administrator.
 * A teacher who has not been registered in public.teachers cannot take, edit, or submit attendance.
 */
export async function checkTeacherRegistration(
  user?: { id?: string | number; email?: string; role?: string; full_name?: string } | null
): Promise<TeacherRegistrationCheckResult> {
  if (!user) {
    return {
      isRegistered: false,
      message: 'No active session found. Please sign in as a registered teacher.',
    };
  }

  // Administrators and registrars have supervisory access
  if (user.role === 'admin' || user.role === 'registrar') {
    return { isRegistered: true, teacherId: null };
  }

  const userId = user.id ? String(user.id).trim() : '';

  // 1. Direct Supabase query to public.teachers
  try {
    if (isUuid(userId)) {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, user_id, employee_id, specialization')
        .or(`id.eq.${userId},user_id.eq.${userId}`)
        .limit(1)
        .maybeSingle();

      if (!error && data?.id) {
        teacherIdCache.set(userId, data.id);
        return {
          isRegistered: true,
          teacherId: data.id,
          employeeId: data.employee_id,
          specialization: data.specialization,
        };
      }
    }

    // 2. Lookup via user email in users joined with teachers
    if (user.email) {
      const cleanEmail = user.email.trim().toLowerCase();
      const { data: uRow } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (uRow?.id) {
        const { data: tRow } = await supabase
          .from('teachers')
          .select('id, user_id, employee_id, specialization')
          .or(`id.eq.${uRow.id},user_id.eq.${uRow.id}`)
          .maybeSingle();

        if (tRow?.id) {
          teacherIdCache.set(userId || uRow.id, tRow.id);
          return {
            isRegistered: true,
            teacherId: tRow.id,
            employeeId: tRow.employee_id,
            specialization: tRow.specialization,
          };
        }
      }
    }
  } catch (err) {
    console.warn('Teacher registration verification notice:', err);
  }

  // 3. Fallback verification against local admin teachers cache (plsnhs_teachers_cache_v3)
  try {
    const raw = localStorage.getItem('plsnhs_teachers_cache_v3');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const match = list.find(
          (t: any) =>
            (userId && (t.id === userId || t.user_id === userId)) ||
            (user.email && t.email?.toLowerCase() === user.email?.toLowerCase())
        );
        if (match) {
          const tId = match.teacher_table_id || match.id;
          if (userId && tId) teacherIdCache.set(userId, tId);
          return {
            isRegistered: true,
            teacherId: tId,
            employeeId: match.employee_id,
            specialization: match.specialization,
          };
        }
      }
    }
  } catch {
    // ignore
  }

  return {
    isRegistered: false,
    message:
      'Access Denied: Your faculty account has not been registered by the School Administrator or Registrar in the Faculty Teachers Registry.',
  };
}

/**
 * Resolves a user.id or teacher.id UUID into a valid public.teachers.id UUID
 * so foreign key constraints on attendance_records.teacher_id never fail.
 */
export async function resolveTeacherRecordId(
  userIdOrTeacherId?: string | number | null
): Promise<string | null> {
  if (!isUuid(userIdOrTeacherId)) return null;
  const key = String(userIdOrTeacherId).trim();
  if (teacherIdCache.has(key)) {
    return teacherIdCache.get(key) ?? null;
  }

  try {
    const { data } = await supabase
      .from('teachers')
      .select('id')
      .or(`id.eq.${key},user_id.eq.${key}`)
      .limit(1)
      .maybeSingle();

    const resolved = data?.id && isUuid(data.id) ? String(data.id) : null;
    teacherIdCache.set(key, resolved);
    return resolved;
  } catch {
    return null;
  }
}

function readLocalAttendanceCache(): UnifiedAttendanceRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalAttendanceCache(entry: UnifiedAttendanceRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const current = readLocalAttendanceCache();
    const existingIdx = current.findIndex(
      (item) => item.student_id === entry.student_id && item.date === entry.date
    );
    if (existingIdx >= 0) {
      const prev = current[existingIdx];
      current[existingIdx] = {
        ...prev,
        ...entry,
        time_in: entry.time_in || prev.time_in || null,
        time_out: entry.time_out || prev.time_out || null,
      };
    } else {
      current.unshift(entry);
    }
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(current.slice(0, 400)));
  } catch {
    // ignore storage quota errors
  }
}

export function broadcastAttendanceUpdate(detail?: any): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('plsnhs_attendance_updated', { detail }));
  } catch {}
  try {
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel('plsnhs_attendance_channel');
      bc.postMessage({ type: 'attendance_updated', detail, timestamp: Date.now() });
      bc.close();
    }
  } catch {}
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
  // Ensure Supabase Auth session is active to satisfy RLS on attendance_records
  await ensureAuthenticatedSession();

  const todayStr = payload.date || getLocalTodayStr();
  const currentTime =
    payload.time_in ||
    new Date().toLocaleTimeString('en-GB', { hour12: false }); // "HH:MM:SS"

  const rawStatus = (payload.status || 'present').toLowerCase();
  const cleanStatus = ['present', 'late', 'absent', 'excused'].includes(rawStatus)
    ? rawStatus
    : 'present';

  // Normalize mode to satisfy attendance_records_mode_check ('time_in' | 'time_out')
  const rawMode = (payload.mode || 'time_in').toLowerCase().trim();
  const isTimeOut = rawMode === 'time_out' || rawMode === 'time-out' || rawMode === 'out';
  const dbMode: 'time_in' | 'time_out' = isTimeOut ? 'time_out' : 'time_in';

  let resolvedStudentId = payload.student_id;
  let resolvedSectionId = isUuid(payload.section_id) ? payload.section_id : null;
  const searchKey = `${payload.qr_code || ''} ${payload.raw_payload || ''} ${payload.student_id || ''}`;
  let cleanLrn = searchKey.match(/\b(\d{10,12})\b/)?.[1] || payload.qr_code || null;

  try {
    if (!isUuid(resolvedStudentId) && cleanLrn) {
      const { data: st } = await supabase
        .from('students')
        .select('id, lrn, section_id')
        .eq('lrn', cleanLrn)
        .maybeSingle();
      if (st?.id && isUuid(st.id)) {
        resolvedStudentId = st.id;
        if (!resolvedSectionId && isUuid(st.section_id)) {
          resolvedSectionId = st.section_id;
        }
        if (st.lrn) cleanLrn = String(st.lrn);
      }
    } else if (isUuid(resolvedStudentId) && (!resolvedSectionId || !cleanLrn)) {
      const { data: st } = await supabase
        .from('students')
        .select('id, lrn, section_id')
        .eq('id', resolvedStudentId)
        .maybeSingle();
      if (st) {
        if (!resolvedSectionId && isUuid(st.section_id)) {
          resolvedSectionId = st.section_id;
        }
        if (!cleanLrn && st.lrn) {
          cleanLrn = String(st.lrn);
        }
      }
    }
  } catch {
    // ignore student lookup error
  }

  // Strict Enforcement: If attendance is initiated by a teacher, verify they are registered by Admin
  if (payload.teacher_id) {
    const regCheck = await checkTeacherRegistration({ id: payload.teacher_id });
    if (!regCheck.isRegistered) {
      return {
        success: false,
        error:
          'Attendance Denied: You cannot record attendance because your faculty account has not been registered by the School Administrator yet.',
      };
    }
  }

  const cleanTeacherId = await resolveTeacherRecordId(payload.teacher_id);
  const cleanSubjectId = isUuid(payload.subject_id) ? payload.subject_id : null;

  const effectiveTimeIn = isTimeOut ? null : currentTime;
  const effectiveTimeOut = isTimeOut ? payload.time_out || currentTime : payload.time_out || null;

  const recordPayload: Record<string, any> = {
    student_id: resolvedStudentId,
    section_id: resolvedSectionId,
    teacher_id: cleanTeacherId,
    subject_id: cleanSubjectId,
    date: todayStr,
    mode: dbMode,
    status: cleanStatus,
    time_in: effectiveTimeIn,
    time_out: effectiveTimeOut,
    remarks:
      payload.remarks ||
      (isTimeOut
        ? 'Dismissal Time-Out logged via QR Scanner'
        : rawMode === 'manual' || rawMode === 'lrn'
        ? 'Attendance logged via LRN entry'
        : 'Morning Time-In logged via QR Scanner'),
    qr_code: cleanLrn || payload.qr_code || null,
    raw_payload: payload.raw_payload || cleanLrn || null,
    scanned_at: new Date().toISOString(),
  };

  let savedRow: any = null;

  // 1. Primary write to attendance_records (if student_id is a valid UUID)
  if (isUuid(resolvedStudentId)) {
    try {
      // If logging time_out, also stamp time_out onto any existing time_in row for today
      if (isTimeOut && effectiveTimeOut) {
        await supabase
          .from('attendance_records')
          .update({ time_out: effectiveTimeOut })
          .eq('student_id', resolvedStudentId)
          .eq('date', todayStr)
          .eq('mode', 'time_in');
      }

      const { data, error } = await supabase
        .from('attendance_records')
        .upsert(recordPayload, {
          onConflict: 'student_id,date,mode',
        })
        .select()
        .maybeSingle();

      if (!error && data) {
        savedRow = data;
      } else if (error) {
        console.warn('Notice upserting to attendance_records:', error.message);
      }
    } catch (err) {
      console.warn('Exception writing to attendance_records:', err);
    }
  }

  // 2. Dual-write backup to legacy attendance table (safe select -> update/insert)
  if (isUuid(resolvedStudentId)) {
    try {
      const { data: existingLegacy } = await supabase
        .from('attendance')
        .select('id, time_in, time_out, status')
        .eq('student_id', resolvedStudentId)
        .eq('date', todayStr)
        .limit(1)
        .maybeSingle();

      // Use date-scoped qr_code token so attendance_qr_code_uq never collides across dates
      const uniqueQrKey = cleanLrn ? `${cleanLrn}_${todayStr}` : null;

      if (existingLegacy?.id) {
        await supabase
          .from('attendance')
          .update({
            section_id: resolvedSectionId,
            teacher_id: cleanTeacherId,
            subject_id: cleanSubjectId,
            status: isTimeOut ? existingLegacy.status || cleanStatus : cleanStatus,
            time_in: isTimeOut ? existingLegacy.time_in || currentTime : currentTime,
            time_out: isTimeOut ? effectiveTimeOut : existingLegacy.time_out || effectiveTimeOut,
            qr_code: uniqueQrKey,
            remarks: recordPayload.remarks,
          })
          .eq('id', existingLegacy.id);
      } else {
        await supabase.from('attendance').insert({
          student_id: resolvedStudentId,
          section_id: resolvedSectionId,
          teacher_id: cleanTeacherId,
          subject_id: cleanSubjectId,
          date: todayStr,
          status: cleanStatus,
          time_in: isTimeOut ? null : currentTime,
          time_out: isTimeOut ? effectiveTimeOut : null,
          qr_code: uniqueQrKey,
          remarks: recordPayload.remarks,
        });
      }
    } catch (err) {
      console.warn('Legacy attendance sync note:', err);
    }
  }

  // 3. Cache locally & broadcast real-time update across tabs/components
  const unifiedEntry: UnifiedAttendanceRecord = {
    id: savedRow?.id || `local-${Date.now()}`,
    student_id: resolvedStudentId,
    lrn: cleanLrn || undefined,
    section_id: resolvedSectionId,
    teacher_id: cleanTeacherId,
    date: todayStr,
    mode: rawMode === 'manual' || rawMode === 'lrn' ? 'LRN' : 'qr',
    status: cleanStatus,
    time_in: effectiveTimeIn,
    time_out: effectiveTimeOut,
    remarks: recordPayload.remarks,
    qr_code: recordPayload.qr_code,
    raw_payload: recordPayload.raw_payload,
    scanned_at: recordPayload.scanned_at,
    created_at: savedRow?.created_at || new Date().toISOString(),
  };

  writeLocalAttendanceCache(unifiedEntry);
  broadcastAttendanceUpdate(unifiedEntry);

  return { success: true, data: savedRow || unifiedEntry };
}

/**
 * Fetch attendance logs from Supabase attendance_records table
 * Merges with legacy attendance table and local cache so no historical or live logs are missed.
 */
export async function fetchAttendanceRecords(filter?: {
  student_id?: string;
  lrn?: string;
  date?: string;
  section_id?: string;
  limit?: number;
}): Promise<UnifiedAttendanceRecord[]> {
  const maxLimit = filter?.limit || 200;

  // Ensure authenticated session so RLS on attendance_records permits SELECT
  await ensureAuthenticatedSession();

  const localToday = getLocalTodayStr();
  const utcToday = new Date().toISOString().split('T')[0];
  // If querying for local today, also accept UTC today for records created before timezone normalization
  const dateCandidates =
    filter?.date && filter.date === localToday && localToday !== utcToday
      ? [localToday, utcToday]
      : filter?.date
      ? [filter.date]
      : null;

  try {
    // 1. Query attendance_records
    let q = supabase
      .from('attendance_records')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(maxLimit);

    if (dateCandidates) {
      q = dateCandidates.length > 1 ? q.in('date', dateCandidates) : q.eq('date', dateCandidates[0]);
    }
    if (filter?.section_id && isUuid(filter.section_id)) {
      q = q.eq('section_id', filter.section_id);
    }
    if (filter?.student_id && isUuid(filter.student_id)) {
      if (filter.lrn) {
        q = q.or(`student_id.eq.${filter.student_id},qr_code.ilike.%${filter.lrn}%`);
      } else {
        q = q.eq('student_id', filter.student_id);
      }
    } else if (filter?.lrn) {
      q = q.ilike('qr_code', `%${filter.lrn}%`);
    } else if (filter?.student_id) {
      q = q.ilike('qr_code', `%${filter.student_id}%`);
    }

    const { data: recordsData } = await q;

    // 2. Query legacy attendance as fallback or union
    let lq = supabase
      .from('attendance')
      .select('*')
      .order('date', { ascending: false })
      .limit(maxLimit);

    if (dateCandidates) {
      lq = dateCandidates.length > 1 ? lq.in('date', dateCandidates) : lq.eq('date', dateCandidates[0]);
    }
    if (filter?.section_id && isUuid(filter.section_id)) {
      lq = lq.eq('section_id', filter.section_id);
    }
    if (filter?.student_id && isUuid(filter.student_id)) {
      if (filter.lrn) {
        lq = lq.or(`student_id.eq.${filter.student_id},qr_code.ilike.%${filter.lrn}%`);
      } else {
        lq = lq.eq('student_id', filter.student_id);
      }
    } else if (filter?.lrn) {
      lq = lq.ilike('qr_code', `%${filter.lrn}%`);
    } else if (filter?.student_id) {
      lq = lq.ilike('qr_code', `%${filter.student_id}%`);
    }

    const { data: legacyData } = await lq;

    // Combine and merge time_in + time_out per (student_id, date)
    const map = new Map<string, UnifiedAttendanceRecord>();

    const normalizeRecordDate = (rawDate: string, createdAt?: string): string => {
      if (!rawDate) return localToday;
      // If a record was saved today in PH time but stamped with UTC yesterday date, normalize to local date
      if (createdAt && rawDate === utcToday && localToday !== utcToday) {
        const createdDate = new Date(createdAt);
        if (!isNaN(createdDate.getTime())) {
          return getLocalTodayStr(createdDate);
        }
      }
      return rawDate;
    };

    if (recordsData && recordsData.length > 0) {
      recordsData.forEach((r: any) => {
        const normDate = normalizeRecordDate(r.date, r.scanned_at || r.created_at);
        const key = `${r.student_id}_${normDate}`;
        const existing = map.get(key);
        const isOutRow = r.mode === 'time_out';
        const cleanQr = r.qr_code ? String(r.qr_code).split('_')[0] : null;

        if (existing) {
          map.set(key, {
            ...existing,
            status: !isOutRow ? (r.status || existing.status).toLowerCase() : existing.status,
            time_in: existing.time_in || (!isOutRow ? r.time_in : null),
            time_out: existing.time_out || r.time_out || (isOutRow ? r.time_in : null),
            remarks: existing.remarks || r.remarks,
            qr_code: existing.qr_code || cleanQr,
          });
        } else {
          map.set(key, {
            id: r.id,
            student_id: r.student_id,
            section_id: r.section_id,
            teacher_id: r.teacher_id,
            date: normDate,
            mode:
              r.remarks && r.remarks.toLowerCase().includes('lrn')
                ? 'LRN'
                : 'qr',
            status: (r.status || 'present').toLowerCase(),
            time_in: !isOutRow ? r.time_in : null,
            time_out: r.time_out || (isOutRow ? r.time_in : null),
            remarks: r.remarks,
            qr_code: cleanQr,
            raw_payload: r.raw_payload,
            scanned_at: r.scanned_at || r.created_at,
            created_at: r.created_at,
          });
        }
      });
    }

    if (legacyData && legacyData.length > 0) {
      legacyData.forEach((l: any) => {
        const normDate = normalizeRecordDate(l.date, l.created_at);
        const key = `${l.student_id}_${normDate}`;
        const cleanQr = l.qr_code ? String(l.qr_code).split('_')[0] : null;
        const existing = map.get(key);

        if (existing) {
          map.set(key, {
            ...existing,
            time_in: existing.time_in || l.time_in,
            time_out: existing.time_out || l.time_out,
            qr_code: existing.qr_code || cleanQr,
            remarks: existing.remarks || l.remarks,
          });
        } else {
          map.set(key, {
            id: l.id,
            student_id: l.student_id,
            section_id: l.section_id,
            date: normDate,
            mode:
              l.remarks && l.remarks.toLowerCase().includes('manual')
                ? 'Manual'
                : 'qr',
            status: (l.status || 'present').toLowerCase(),
            time_in: l.time_in,
            time_out: l.time_out,
            remarks: l.remarks,
            qr_code: cleanQr,
            created_at: l.created_at,
          });
        }
      });
    }

    // 3. Merge local cache entries that match filter
    const localEntries = readLocalAttendanceCache();
    localEntries.forEach((loc) => {
      if (filter?.date && loc.date !== filter.date) return;
      if (filter?.section_id && isUuid(filter.section_id) && loc.section_id !== filter.section_id) {
        return;
      }
      if (filter?.student_id || filter?.lrn) {
        const matchId = filter.student_id && loc.student_id === filter.student_id;
        const matchLrn =
          filter.lrn &&
          (loc.lrn === filter.lrn || (loc.qr_code && loc.qr_code.includes(filter.lrn)));
        if (!matchId && !matchLrn) return;
      }

      const key = `${loc.student_id}_${loc.date}`;
      if (!map.has(key)) {
        map.set(key, loc);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const dateCmp = String(b.date || '').localeCompare(String(a.date || ''));
      if (dateCmp !== 0) return dateCmp;
      return String(b.created_at || b.scanned_at || '').localeCompare(
        String(a.created_at || a.scanned_at || '')
      );
    });
  } catch (err) {
    console.warn('Error reading attendance records:', err);
    return [];
  }
}
