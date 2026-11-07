import { supabase } from './supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface StudentQrData {
  id?: string | number;
  student_id?: string | number;
  lrn?: string;
  first_name?: string;
  last_name?: string;
  fullname?: string;
  grade_level?: string;
  level_category?: string;
  strand?: string;
  parent_name?: string;
  parent_contact?: string;
  qr_code?: string;
}

/**
 * Computes official QR Code payload for student pass / verification
 */
export function computeStudentQrPayload(
  student: Partial<StudentQrData>,
  mode: 'url' | 'raw' = 'url'
): string {
  const name =
    student.fullname ||
    `${student.first_name || ''} ${student.last_name || ''}`.trim() ||
    'Student';
  const lrn = student.lrn || '';
  const id = student.student_id || student.id || '';
  const level = student.level_category || student.grade_level || 'Junior High';
  const guardian = student.parent_name || '';
  const phone = student.parent_contact || '';

  if (mode === 'raw') {
    return `PLSNHS-STUDENT|LRN:${lrn}|ID:${id}|NAME:${name}|GRADE:${level}|CONTACT:${phone}|STATUS:OFFICIAL_ENROLLED`;
  }

  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://placido-enrollment.vercel.app';

  return `${origin}/verify-id?lrn=${encodeURIComponent(lrn)}&id=${encodeURIComponent(
    String(id)
  )}&name=${encodeURIComponent(name)}&grade=${encodeURIComponent(
    level
  )}&guardian=${encodeURIComponent(guardian)}&contact=${encodeURIComponent(phone)}`;
}

/**
 * Persists a student's QR code string directly into Supabase students table.
 */
export async function saveStudentQrToSupabase(
  studentIdentifier: { id?: string | number; lrn?: string },
  qrPayload: string
): Promise<{ success: boolean; error?: string }> {
  if (!qrPayload || (!studentIdentifier.id && !studentIdentifier.lrn)) {
    return { success: false, error: 'Missing student identifier or payload' };
  }

  const sid = studentIdentifier.id ? String(studentIdentifier.id) : '';
  const isUuid = UUID_REGEX.test(sid);
  const lrn = studentIdentifier.lrn ? String(studentIdentifier.lrn).trim() : '';

  try {
    let updateQuery;
    if (isUuid) {
      updateQuery = supabase
        .from('students')
        .update({ qr_code: qrPayload, updated_at: new Date().toISOString() })
        .eq('id', sid);
    } else if (lrn && lrn !== '000000000000') {
      updateQuery = supabase
        .from('students')
        .update({ qr_code: qrPayload, updated_at: new Date().toISOString() })
        .eq('lrn', lrn);
    } else {
      return { success: false, error: 'No valid UUID or LRN found' };
    }

    const { error } = await updateQuery;
    if (error) {
      console.warn('Notice saving QR code to Supabase:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Exception updating student QR code in Supabase:', err);
    return { success: false, error: err?.message || 'Database error' };
  }
}

/**
 * Checks all students in the Supabase database.
 * If any student does NOT yet have a qr_code saved in Supabase,
 * this computes and persists their official QR code automatically.
 */
export async function syncAllStudentsMissingQrCodes(): Promise<{ updatedCount: number }> {
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('id, first_name, last_name, lrn, grade_level, strand, parent_name, parent_contact, contact_number, qr_code')
      .or('qr_code.is.null,qr_code.eq.');

    if (error || !students || students.length === 0) {
      return { updatedCount: 0 };
    }

    let updatedCount = 0;
    for (const st of students) {
      const payload = computeStudentQrPayload({
        id: st.id,
        first_name: st.first_name,
        last_name: st.last_name,
        lrn: st.lrn,
        grade_level: st.grade_level,
        strand: st.strand,
        parent_name: st.parent_name,
        parent_contact: st.parent_contact || st.contact_number,
      });

      const res = await saveStudentQrToSupabase({ id: st.id, lrn: st.lrn }, payload);
      if (res.success) {
        updatedCount++;
      }
    }

    return { updatedCount };
  } catch (err) {
    console.warn('syncAllStudentsMissingQrCodes error:', err);
    return { updatedCount: 0 };
  }
}
