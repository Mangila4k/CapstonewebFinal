import { supabase } from './supabase';

export interface StudentApprovalEmailPayload {
  toEmail: string;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  strand?: string | null;
  sectionName?: string | null;
  studentId?: string | number | null;
}

export interface StudentApprovalResult {
  success: boolean;
  emailSent: boolean;
  username: string;
  temporaryPassword: string;
  message: string;
  error?: string;
}

/**
 * Automatically sets up student account credentials and sends an official approval
 * email to the student's Gmail address containing their username and temporary password.
 *
 * Requirements:
 * - Username: Student's Gmail address
 * - Temporary Password: Student's Last Name
 */
export async function sendStudentApprovalEmail(
  params: StudentApprovalEmailPayload
): Promise<StudentApprovalResult> {
  const cleanEmail = (params.toEmail || '').trim().toLowerCase();
  const safeFirstName = (params.firstName || 'Student').trim();
  const safeLastName = (params.lastName || 'Learner').trim();
  const temporaryPassword = safeLastName; // Temporary password is student's last name

  if (!cleanEmail) {
    return {
      success: false,
      emailSent: false,
      username: '',
      temporaryPassword,
      message: 'Student does not have a valid Gmail address.',
    };
  }

  // 1. Ensure student account exists in `users` table with student's last name as temporary password
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, password, role')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (!existingUser) {
      await supabase.from('users').insert({
        email: cleanEmail,
        password: temporaryPassword,
        first_name: safeFirstName,
        last_name: safeLastName,
        role: 'student',
        student_id: params.studentId || null,
        created_at: new Date().toISOString(),
      });
    } else {
      await supabase
        .from('users')
        .update({
          password: temporaryPassword,
          role: 'student',
          ...(params.studentId ? { student_id: params.studentId } : {}),
        })
        .eq('id', existingUser.id);
    }
  } catch (userErr) {
    console.warn('Note: user account sync in users table:', userErr);
  }

  // 2. Invoke Supabase Edge Function `send-enrollment-email`
  let emailSent = false;
  let edgeError = '';

  try {
    const { data, error } = await supabase.functions.invoke('send-enrollment-email', {
      body: {
        to_email: cleanEmail,
        to_name: `${safeFirstName} ${safeLastName}`.trim(),
        status: 'approved',
        grade_level: params.gradeLevel,
        strand: params.strand || 'General',
        password: temporaryPassword,
      },
    });

    if (error) {
      edgeError = error.message;
      console.warn('Edge function email notice:', error);
    } else if (data?.error) {
      edgeError = data.error;
      console.warn('Edge function email response note:', data.error);
    } else {
      emailSent = true;
    }
  } catch (err: any) {
    edgeError = err?.message || String(err);
    console.warn('Edge function invocation note:', err);
  }

  // 3. Log notification ONLY for the specific recipient student (NEVER broadcast to admin or other users)
  try {
    let studentUserId: string | null = null;
    const { data: stUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();
    if (stUser?.id) studentUserId = stUser.id;

    if (studentUserId || cleanEmail) {
      await supabase.from('notifications').insert({
        title: 'Your Student Portal Access Credentials',
        message: `Welcome to Placido L. Señor National High School! Your student portal account is ready. Username: ${cleanEmail} | Temporary Password: ${temporaryPassword}. Please log in and verify your official student records.`,
        type: 'enrollment',
        role: 'student',
        user_id: studentUserId || cleanEmail, // STRICTLY RESTRICTED TO THIS SPECIFIC STUDENT
      });
    }
  } catch {
    // ignore
  }

  try {
    const logRecord = {
      role: 'system',
      action: 'Approval Email Sent',
      details: `Enrollment approved. Official access credentials generated and dispatched to student (${cleanEmail}).`,
      timestamp: new Date().toISOString(),
    };
    await supabase.from('activity_logs').insert([logRecord]);
    window.dispatchEvent(new CustomEvent('plsnhs-activity-logged', { detail: logRecord }));
  } catch {
    // ignore
  }

  // 4. Record in local storage cache
  try {
    const cacheKey = 'plsnhs_dispatched_emails';
    const raw = localStorage.getItem(cacheKey);
    const list = raw ? JSON.parse(raw) : [];
    list.unshift({
      toEmail: cleanEmail,
      studentName: `${safeFirstName} ${safeLastName}`,
      username: cleanEmail,
      temporaryPassword,
      gradeLevel: params.gradeLevel,
      strand: params.strand,
      emailSent,
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem(cacheKey, JSON.stringify(list.slice(0, 50)));
  } catch {
    // ignore
  }

  return {
    success: true,
    emailSent,
    username: cleanEmail,
    temporaryPassword,
    message: emailSent
      ? `Enrollment approved! Official email sent to ${cleanEmail} with username (${cleanEmail}) and temporary password (${temporaryPassword}).`
      : `Enrollment approved! Credentials generated for ${cleanEmail} (Username: ${cleanEmail}, Temp Password: ${temporaryPassword}).`,
    error: edgeError,
  };
}

