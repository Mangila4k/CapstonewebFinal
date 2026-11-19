import { supabase } from './supabase';
import {
  ADMIN_TEACHER_SCHEDULE_FILES_KEY,
  type AdminSentTeacherScheduleFile,
} from '../pages/teacher/TeacherClassProgramPage';

export interface AttachSchedulePayload {
  teacherId: string; // user_id or id
  teacherName: string;
  teacherTableId?: string;
  file: File;
  title?: string;
  schoolYear?: string;
  semester?: string;
  notes?: string;
  uploadedBy?: string;
}

export interface AttachedScheduleInfo {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize?: string;
  fileType?: string;
  title: string;
  updatedAt?: string;
  uploadedBy?: string;
  notes?: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const LOCAL_BROADCAST_KEY = 'plsnhs_broadcast_notifications';

/**
 * Broadcasts a real-time notification to targeted teachers (or all teachers)
 * across both local broadcast storage and Supabase `notifications` table.
 */
export async function notifyTeachersOfScheduleFile(
  file: AdminSentTeacherScheduleFile,
  senderRole?: string,
  targetUserId?: string | null
): Promise<void> {
  const nowIso = new Date().toISOString();
  const resolvedRole =
    senderRole || (file.sentBy?.toLowerCase().includes('registrar') ? 'REGISTRAR' : 'ADMIN');
  const recipientSummary =
    file.recipientType === 'all'
      ? 'All Faculty Teachers'
      : file.recipientTeacherNames.join(', ');

  const notifTitle = `📅 Official Class Schedule Sent (${file.targetGradeLevel || 'All Year Levels'})`;
  const notifMessage = `${file.sentBy} sent your official class schedule "${file.title}" (${file.fileName}) for ${recipientSummary}. Click to view, download, or print under Class Program.`;

  // 1. Local broadcast storage + real-time window event
  try {
    const raw = localStorage.getItem(LOCAL_BROADCAST_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const newLocalNotif = {
      id: `sched_notif_${file.id}_${Date.now()}`,
      title: notifTitle,
      content: notifMessage,
      message: notifMessage,
      target_audience: 'teacher',
      target_user_id: targetUserId || null,
      recipient_type: file.recipientType,
      recipient_teacher_names: file.recipientTeacherNames,
      priority: 'high',
      author: file.sentBy,
      sender_role: resolvedRole,
      action_url: '/teacher/class-program',
      action_label: 'Open Class Program',
      created_at: nowIso,
    };
    list.unshift(newLocalNotif);
    localStorage.setItem(LOCAL_BROADCAST_KEY, JSON.stringify(list.slice(0, 80)));

    // Reset read state for this schedule notification across all teacher sessions in localStorage so it shows as unread
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('plsnhs_read_notifs_')) {
        try {
          const readArr = JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(readArr)) {
            const filtered = readArr.filter((id: string) => id !== `sched_file_${file.id}`);
            localStorage.setItem(k, JSON.stringify(filtered));
          }
        } catch {
          // ignore
        }
      }
    }

    window.dispatchEvent(new CustomEvent('plsnhs:notification-sent', { detail: newLocalNotif }));
    window.dispatchEvent(new Event('plsnhs-schedule-files-updated'));
    window.dispatchEvent(new Event('storage'));
  } catch {
    // ignore storage errors
  }

  // 2. Supabase `notifications` table: insert broadcast row AND individual rows for every teacher in `users`
  try {
    const { data: teacherUsers } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .eq('role', 'teacher');

    const rowsToInsert: any[] = [
      {
        title: notifTitle,
        message: notifMessage,
        type: 'schedule',
        role: 'teacher',
        priority: 'high',
        read: false,
        is_read: false,
        user_id: null,
      },
    ];

    if (Array.isArray(teacherUsers) && teacherUsers.length > 0) {
      teacherUsers.forEach((tu: any) => {
        if (tu?.id) {
          rowsToInsert.push({
            title: notifTitle,
            message: notifMessage,
            type: 'schedule',
            role: 'teacher',
            priority: 'high',
            read: false,
            is_read: false,
            user_id: tu.id,
          });
        }
      });
    }

    await supabase.from('notifications').insert(rowsToInsert);
  } catch (err) {
    console.warn('Supabase schedule notification notice:', err);
  }
}

/**
 * Uploads a schedule file to Supabase storage bucket `teacher-schedules`
 * and attaches it directly to the specified teacher across database tables and local cache.
 */
export async function uploadAndAttachTeacherSchedule(
  payload: AttachSchedulePayload
): Promise<{ success: boolean; fileUrl: string; fileName: string; error?: string }> {
  try {
    const {
      teacherId,
      teacherName,
      teacherTableId,
      file,
      title,
      schoolYear = 'S.Y. 2026–2027',
      semester = '1st & 2nd Semester',
      notes,
      uploadedBy = 'School Administrator • Office of the Principal',
    } = payload;

    const fileExt = file.name.split('.').pop()?.toUpperCase() || 'PDF';
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `teacher_individual_workloads/${teacherId || 'faculty'}/${Date.now()}_${cleanFileName}`;

    let fileUrl = '';
    let storageError: any = null;

    // 1. Upload to Supabase Storage bucket 'teacher-schedules'
    try {
      const { data: uploadData, error: upErr } = await supabase.storage
        .from('teacher-schedules')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!upErr && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('teacher-schedules')
          .getPublicUrl(storagePath);
        fileUrl = publicUrlData.publicUrl;
      } else {
        storageError = upErr;
      }
    } catch (err) {
      storageError = err;
    }

    // Fallback to data URL if storage upload failed (ensures zero data loss)
    if (!fileUrl) {
      console.warn('Storage upload fallback triggered:', storageError);
      fileUrl = await readFileAsDataUrl(file);
    }

    const fileSizeKb = `${Math.max(1, Math.round(file.size / 1024))} KB`;
    const resolvedTitle =
      title?.trim() || `Official Faculty Teaching Schedule & Class Program (${schoolYear})`;
    const nowIso = new Date().toISOString();

    // 2. Update teachers table
    try {
      if (teacherTableId) {
        await supabase
          .from('teachers')
          .update({
            teacher_load_url: fileUrl,
            teacher_load_name: file.name,
            teacher_load_file_type: fileExt,
            teacher_load_updated_at: nowIso,
          })
          .eq('id', teacherTableId);
      }
      if (teacherId && teacherId !== teacherTableId) {
        await supabase
          .from('teachers')
          .update({
            teacher_load_url: fileUrl,
            teacher_load_name: file.name,
            teacher_load_file_type: fileExt,
            teacher_load_updated_at: nowIso,
          })
          .eq('user_id', teacherId);
      }
    } catch (tErr) {
      console.warn('Update teachers table notice:', tErr);
    }

    // 3. Insert into teacher_workloads
    try {
      await supabase.from('teacher_workloads').insert([
        {
          teacher_id: teacherId,
          file_name: file.name,
          file_url: fileUrl,
          file_type: file.type || (fileExt === 'PDF' ? 'application/pdf' : 'image/jpeg'),
          uploaded_by: uploadedBy,
        },
      ]);
    } catch (wErr) {
      console.warn('Insert teacher_workloads notice:', wErr);
    }

    // 4. Update localStorage and broadcast events
    try {
      const newEntry: AdminSentTeacherScheduleFile = {
        id: `adm-sched-${Date.now()}`,
        title: resolvedTitle,
        fileName: file.name,
        fileSize: fileSizeKb,
        fileType: fileExt,
        fileDataUrl: fileUrl,
        schoolYear,
        semester,
        recipientType: 'selected',
        recipientTeacherNames: [teacherName],
        sentBy: uploadedBy,
        sentAt: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        notes:
          notes ||
          'Please review, download, or print your official teaching schedule and room assignments for S.Y. 2026–2027.',
      };

      const existingRaw = localStorage.getItem(ADMIN_TEACHER_SCHEDULE_FILES_KEY);
      let existingFiles: AdminSentTeacherScheduleFile[] = [];
      if (existingRaw) {
        try {
          const parsed = JSON.parse(existingRaw);
          if (Array.isArray(parsed)) existingFiles = parsed;
        } catch {
          // ignore
        }
      }
      const updatedFiles = [
        newEntry,
        ...existingFiles.filter(
          (f) => f.fileName !== file.name || !f.recipientTeacherNames.includes(teacherName)
        ),
      ];
      localStorage.setItem(ADMIN_TEACHER_SCHEDULE_FILES_KEY, JSON.stringify(updatedFiles));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('plsnhs-schedule-files-updated'));

      // 5. Send real-time notification to the teacher
      await notifyTeachersOfScheduleFile(newEntry, undefined, teacherId);
    } catch {
      // ignore
    }

    // 6. Log to activity_logs
    try {
      await supabase.from('activity_logs').insert([
        {
          role: 'admin',
          action: 'Teacher Schedule Attached',
          details: `Attached official teaching schedule file "${file.name}" to teacher ${teacherName}.`,
          timestamp: nowIso,
        },
      ]);
    } catch {
      // ignore
    }

    return {
      success: true,
      fileUrl,
      fileName: file.name,
    };
  } catch (err: any) {
    console.error('Failed to attach teacher schedule file:', err);
    return {
      success: false,
      fileUrl: '',
      fileName: payload.file.name,
      error: err.message || 'Failed to upload and attach schedule file.',
    };
  }
}

/**
 * Retrieve map of attached schedule files by teacher id, user_id, and teacher name
 */
export async function getTeacherAttachedScheduleMap(): Promise<Map<string, AttachedScheduleInfo>> {
  const map = new Map<string, AttachedScheduleInfo>();

  // 1. Check localStorage first
  try {
    const raw = localStorage.getItem(ADMIN_TEACHER_SCHEDULE_FILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((f: AdminSentTeacherScheduleFile) => {
          if (f.recipientTeacherNames) {
            f.recipientTeacherNames.forEach((name) => {
              const info: AttachedScheduleInfo = {
                id: f.id,
                fileName: f.fileName,
                fileUrl: f.fileDataUrl || '',
                fileSize: f.fileSize,
                fileType: f.fileType,
                title: f.title,
                updatedAt: f.sentAt,
                uploadedBy: f.sentBy,
                notes: f.notes,
              };
              map.set(name.toLowerCase(), info);
            });
          }
        });
      }
    }
  } catch {
    // ignore
  }

  // 2. Check teachers table in Supabase
  try {
    const { data: teachersData } = await supabase
      .from('teachers')
      .select(
        'id, user_id, teacher_load_name, teacher_load_url, teacher_load_file_type, teacher_load_updated_at'
      );

    if (teachersData) {
      teachersData.forEach((row) => {
        if (row.teacher_load_url && row.teacher_load_name) {
          const info: AttachedScheduleInfo = {
            id: row.id,
            fileName: row.teacher_load_name,
            fileUrl: row.teacher_load_url,
            fileType: row.teacher_load_file_type || 'PDF',
            title: 'Official Faculty Teaching Load & Schedule',
            updatedAt: row.teacher_load_updated_at
              ? new Date(row.teacher_load_updated_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Recent',
          };
          if (row.id) map.set(String(row.id), info);
          if (row.user_id) map.set(String(row.user_id), info);
        }
      });
    }
  } catch {
    // ignore
  }

  // 3. Check teacher_workloads in Supabase
  try {
    const { data: workloads } = await supabase
      .from('teacher_workloads')
      .select('*')
      .order('created_at', { ascending: false });

    if (workloads) {
      workloads.forEach((tw) => {
        if (tw.teacher_id && tw.file_url) {
          const key = String(tw.teacher_id);
          if (!map.has(key)) {
            map.set(key, {
              id: tw.id,
              fileName: tw.file_name || 'Faculty_Teaching_Schedule.pdf',
              fileUrl: tw.file_url,
              fileType: tw.file_type || 'PDF',
              title: 'Official Faculty Class Program & Workload',
              updatedAt: tw.created_at
                ? new Date(tw.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recent',
              uploadedBy: tw.uploaded_by || 'Admin Office',
            });
          }
        }
      });
    }
  } catch {
    // ignore
  }

  return map;
}
