import { supabase } from './supabase';

export interface StudentApprovalEmailPayload {
  toEmail: string;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  strand?: string | null;
  sectionName?: string | null;
  studentId?: string | number | null;
  lrn?: string | null;
  parentEmail?: string | null;
  parentName?: string | null;
  enrollmentId?: string | number | null;
}

export interface StudentApprovalResult {
  success: boolean;
  emailSent: boolean;
  username: string;
  temporaryPassword: string;
  parentEmailSent: boolean;
  parentUsername: string;
  parentTemporaryPassword: string;
  parentName: string;
  message: string;
  error?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(val?: any): boolean {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
}

/**
 * Extracts clean first_name and last_name from a full guardian name (e.g. "Mrs. Maria Aguilar" -> { firstName: "Maria", lastName: "Aguilar" })
 */
function parseGuardianName(rawName?: string | null, fallbackLastName: string = 'Parent'): {
  fullName: string;
  firstName: string;
  lastName: string;
} {
  const cleaned = String(rawName || '')
    .replace(/^(mr\.?|mrs\.?|ms\.?|dr\.?|engr\.?|atty\.?)\s+/i, '')
    .trim();

  if (!cleaned) {
    return {
      fullName: `Parent / Guardian of ${fallbackLastName}`,
      firstName: 'Parent',
      lastName: fallbackLastName,
    };
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return {
      fullName: cleaned,
      firstName: parts[0],
      lastName: fallbackLastName || parts[0],
    };
  }

  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(' ');
  return {
    fullName: cleaned,
    firstName,
    lastName,
  };
}

/**
 * Dispatches an email through the local/Vercel Nodemailer API (/api/send-enrollment-email)
 * with automatic fallback to the Supabase Edge Function (send-enrollment-email).
 */
async function dispatchEmailPayload(payload: {
  to_email: string;
  to_name: string;
  recipient_role: 'student' | 'parent';
  student_name: string;
  lrn?: string | null;
  grade_level: string;
  strand?: string | null;
  section_name?: string | null;
  username: string;
  password: string;
}): Promise<{ sent: boolean; error?: string }> {
  const portalUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://plsnhs-portal.vercel.app/login';

  // 1. Primary: Local / Vercel Serverless Nodemailer SMTP Endpoint
  try {
    const res = await fetch('/api/send-enrollment-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        portal_url: portalUrl,
      }),
    });

    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      if (json && json.success) {
        return { sent: true };
      }
    }
  } catch (apiErr) {
    console.warn('Direct /api/send-enrollment-email notice:', apiErr);
  }

  // 2. Fallback: Supabase Edge Function `send-enrollment-email`
  try {
    const { data, error } = await supabase.functions.invoke('send-enrollment-email', {
      body: {
        to_email: payload.to_email,
        to_name: payload.to_name,
        status: 'approved',
        grade_level: payload.grade_level,
        strand: payload.strand || 'General',
        password: payload.password,
      },
    });

    if (!error && !data?.error) {
      return { sent: true };
    }
    return {
      sent: false,
      error: error?.message || data?.error || 'Could not dispatch email',
    };
  } catch (edgeErr: any) {
    return {
      sent: false,
      error: edgeErr?.message || String(edgeErr),
    };
  }
}

/**
 * Automatically sets up both the Student Portal account and the Parent/Guardian Portal account
 * upon enrollment approval, and sends official approval emails to:
 * 1. The Student's Gmail address (with the student's username & temporary password)
 * 2. The Parent/Guardian's Gmail address (with the parent/guardian's username & temporary password)
 */
export async function sendStudentApprovalEmail(
  params: StudentApprovalEmailPayload
): Promise<StudentApprovalResult> {
  const cleanStudentEmail = (params.toEmail || '').trim().toLowerCase();
  const safeFirstName = (params.firstName || 'Student').trim();
  const safeLastName = (params.lastName || 'Learner').trim();
  const studentFullName = `${safeFirstName} ${safeLastName}`.trim();
  const studentTempPassword = safeLastName; // Student temporary password is their Last Name

  let resolvedStudentUuid = isUuid(params.studentId) ? String(params.studentId) : null;
  let resolvedLrn = params.lrn ? String(params.lrn).trim() : null;
  let rawParentEmail = (params.parentEmail || '').trim().toLowerCase();
  let rawParentName = (params.parentName || '').trim();

  // 0. If parentEmail or studentUuid or LRN wasn't supplied, look up from students / enrollments tables
  try {
    if (!rawParentEmail || !resolvedStudentUuid || !resolvedLrn) {
      let stRow: any = null;
      if (resolvedStudentUuid) {
        const { data } = await supabase
          .from('students')
          .select('id, lrn, parent_name, parent_email, enrollment_id')
          .eq('id', resolvedStudentUuid)
          .maybeSingle();
        stRow = data;
      } else if (cleanStudentEmail) {
        const { data } = await supabase
          .from('students')
          .select('id, lrn, parent_name, parent_email, enrollment_id')
          .ilike('email', cleanStudentEmail)
          .maybeSingle();
        stRow = data;
      }

      if (stRow) {
        if (!resolvedStudentUuid && isUuid(stRow.id)) resolvedStudentUuid = stRow.id;
        if (!resolvedLrn && stRow.lrn) resolvedLrn = String(stRow.lrn);
        if (!rawParentEmail && stRow.parent_email) {
          rawParentEmail = String(stRow.parent_email).trim().toLowerCase();
        }
        if (!rawParentName && stRow.parent_name) {
          rawParentName = String(stRow.parent_name).trim();
        }
      }

      if (!rawParentEmail || !rawParentName) {
        let enrQuery = supabase
          .from('enrollments')
          .select('id, guardian_name, guardian_email, mother_name, father_name')
          .order('created_at', { ascending: false })
          .limit(1);

        if (params.enrollmentId && isUuid(params.enrollmentId)) {
          enrQuery = enrQuery.eq('id', params.enrollmentId);
        } else if (resolvedStudentUuid) {
          enrQuery = enrQuery.eq('student_id', resolvedStudentUuid);
        } else if (cleanStudentEmail) {
          enrQuery = enrQuery.ilike('email', cleanStudentEmail);
        }

        const { data: enrRow } = await enrQuery.maybeSingle();
        if (enrRow) {
          if (!rawParentEmail && enrRow.guardian_email) {
            rawParentEmail = String(enrRow.guardian_email).trim().toLowerCase();
          }
          if (!rawParentName) {
            rawParentName =
              enrRow.guardian_name ||
              enrRow.mother_name ||
              enrRow.father_name ||
              '';
          }
        }
      }
    }
  } catch (lookupErr) {
    console.warn('Parent metadata lookup note:', lookupErr);
  }

  const guardianParsed = parseGuardianName(rawParentName, safeLastName);
  const parentTempPassword = guardianParsed.lastName || safeLastName;

  if (!cleanStudentEmail) {
    return {
      success: false,
      emailSent: false,
      username: '',
      temporaryPassword: studentTempPassword,
      parentEmailSent: false,
      parentUsername: rawParentEmail,
      parentTemporaryPassword: parentTempPassword,
      parentName: guardianParsed.fullName,
      message: 'Student does not have a valid Gmail address.',
    };
  }

  // 1. Ensure Student account exists in `users` table with student's last name as temporary password
  let studentUserId: string | null = null;
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, password, role')
      .ilike('email', cleanStudentEmail)
      .maybeSingle();

    if (!existingUser) {
      const { data: insertedUser } = await supabase
        .from('users')
        .insert({
          email: cleanStudentEmail,
          password: studentTempPassword,
          first_name: safeFirstName,
          last_name: safeLastName,
          role: 'student',
          student_id: resolvedStudentUuid,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();
      if (insertedUser?.id) studentUserId = insertedUser.id;
    } else {
      studentUserId = existingUser.id;
      await supabase
        .from('users')
        .update({
          password: studentTempPassword,
          first_name: safeFirstName,
          last_name: safeLastName,
          role: 'student',
          ...(resolvedStudentUuid ? { student_id: resolvedStudentUuid } : {}),
        })
        .eq('id', existingUser.id);
    }
  } catch (userErr) {
    console.warn('Note: student account sync in users table:', userErr);
  }

  // 2. Ensure Parent / Guardian account exists in `users` table & is linked to the student
  let parentUserId: string | null = null;
  if (rawParentEmail) {
    try {
      // Only create a separate users row if parent email differs from student email
      if (rawParentEmail !== cleanStudentEmail) {
        const { data: existingParent } = await supabase
          .from('users')
          .select('id, role')
          .ilike('email', rawParentEmail)
          .maybeSingle();

        if (!existingParent) {
          const { data: insertedParent } = await supabase
            .from('users')
            .insert({
              email: rawParentEmail,
              password: parentTempPassword,
              first_name: guardianParsed.firstName,
              last_name: guardianParsed.lastName,
              role: 'parent',
              student_id: resolvedStudentUuid,
              created_at: new Date().toISOString(),
            })
            .select('id')
            .maybeSingle();
          if (insertedParent?.id) parentUserId = insertedParent.id;
        } else {
          parentUserId = existingParent.id;
          // Update password & student link if this account is a parent account
          if (!existingParent.role || existingParent.role === 'parent') {
            await supabase
              .from('users')
              .update({
                password: parentTempPassword,
                first_name: guardianParsed.firstName,
                last_name: guardianParsed.lastName,
                role: 'parent',
                ...(resolvedStudentUuid ? { student_id: resolvedStudentUuid } : {}),
              })
              .eq('id', existingParent.id);
          }
        }
      }

      // Link parent_id and parent_email on the students record so Parent Portal immediately loads the child
      if (resolvedStudentUuid) {
        await supabase
          .from('students')
          .update({
            parent_email: rawParentEmail,
            ...(rawParentName ? { parent_name: rawParentName } : {}),
            ...(parentUserId && isUuid(parentUserId) ? { parent_id: parentUserId } : {}),
          })
          .eq('id', resolvedStudentUuid);
      }
    } catch (parentErr) {
      console.warn('Note: parent account sync in users table:', parentErr);
    }
  }

  // 3. Dispatch Student Approval Email to Student's Gmail
  const studentDispatch = await dispatchEmailPayload({
    to_email: cleanStudentEmail,
    to_name: studentFullName,
    recipient_role: 'student',
    student_name: studentFullName,
    lrn: resolvedLrn,
    grade_level: params.gradeLevel,
    strand: params.strand || 'General',
    section_name: params.sectionName,
    username: cleanStudentEmail,
    password: studentTempPassword,
  });

  const emailSent = studentDispatch.sent;
  let edgeError = studentDispatch.error || '';

  // 4. Dispatch Parent / Guardian Approval Email to Parent/Guardian's Gmail
  let parentEmailSent = false;
  if (rawParentEmail) {
    const parentDispatch = await dispatchEmailPayload({
      to_email: rawParentEmail,
      to_name: guardianParsed.fullName,
      recipient_role: 'parent',
      student_name: studentFullName,
      lrn: resolvedLrn,
      grade_level: params.gradeLevel,
      strand: params.strand || 'General',
      section_name: params.sectionName,
      username: rawParentEmail,
      password: parentTempPassword,
    });
    parentEmailSent = parentDispatch.sent;
    if (!parentDispatch.sent && parentDispatch.error && !edgeError) {
      edgeError = parentDispatch.error;
    }
  }

  // 5. Log in-app notifications for Student and Parent
  try {
    if (studentUserId || cleanStudentEmail) {
      await supabase.from('notifications').insert({
        title: 'Your Student Portal Access Credentials',
        message: `Welcome to Placido L. Señor National High School! Your student portal account is ready. Username: ${cleanStudentEmail} | Temporary Password: ${studentTempPassword}.`,
        type: 'enrollment',
        role: 'student',
        user_id: studentUserId || cleanStudentEmail,
      });
    }

    if (rawParentEmail) {
      await supabase.from('notifications').insert({
        title: `Parent Portal Access Credentials (${studentFullName})`,
        message: `Your child ${studentFullName} (${params.gradeLevel}${params.sectionName ? ` · Section ${params.sectionName}` : ''}) is officially enrolled. Parent Portal Username: ${rawParentEmail} | Temporary Password: ${parentTempPassword}.`,
        type: 'enrollment',
        role: 'parent',
        user_id: parentUserId || rawParentEmail,
      });
    }
  } catch {
    // ignore
  }

  try {
    const logRecord = {
      role: 'system',
      action: 'Approval Emails Dispatched',
      details: rawParentEmail
        ? `Enrollment approved for ${studentFullName}. Credentials sent to Student (${cleanStudentEmail}) and Parent/Guardian (${rawParentEmail}).`
        : `Enrollment approved for ${studentFullName}. Credentials sent to Student (${cleanStudentEmail}).`,
      timestamp: new Date().toISOString(),
    };
    await supabase.from('activity_logs').insert([logRecord]);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('plsnhs-activity-logged', { detail: logRecord }));
    }
  } catch {
    // ignore
  }

  // 6. Record in local storage cache
  try {
    const cacheKey = 'plsnhs_dispatched_emails';
    const raw = localStorage.getItem(cacheKey);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({
      toEmail: cleanStudentEmail,
      studentName: studentFullName,
      username: cleanStudentEmail,
      temporaryPassword: studentTempPassword,
      parentEmail: rawParentEmail || null,
      parentName: guardianParsed.fullName,
      parentUsername: rawParentEmail || null,
      parentTemporaryPassword: rawParentEmail ? parentTempPassword : null,
      gradeLevel: params.gradeLevel,
      strand: params.strand,
      emailSent,
      parentEmailSent,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem(cacheKey, JSON.stringify(list.slice(0, 50)));
  } catch {
    // ignore
  }

  let summaryMessage = '';
  if (rawParentEmail) {
    summaryMessage =
      emailSent && parentEmailSent
        ? `Enrollment approved! Official emails sent to Student (${cleanStudentEmail} | Password: ${studentTempPassword}) AND Parent/Guardian (${rawParentEmail} | Password: ${parentTempPassword}).`
        : `Enrollment approved! Student credentials (${cleanStudentEmail} / ${studentTempPassword}) and Parent/Guardian credentials (${rawParentEmail} / ${parentTempPassword}) generated and ready.`;
  } else {
    summaryMessage = emailSent
      ? `Enrollment approved! Official email sent to Student (${cleanStudentEmail} | Password: ${studentTempPassword}).`
      : `Enrollment approved! Credentials generated for ${cleanStudentEmail} (Password: ${studentTempPassword}).`;
  }

  return {
    success: true,
    emailSent,
    username: cleanStudentEmail,
    temporaryPassword: studentTempPassword,
    parentEmailSent,
    parentUsername: rawParentEmail,
    parentTemporaryPassword: parentTempPassword,
    parentName: guardianParsed.fullName,
    message: summaryMessage,
    error: edgeError,
  };
}
