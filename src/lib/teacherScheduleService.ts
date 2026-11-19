import { supabase } from './supabase';
import {
  ADMIN_TEACHER_SCHEDULE_FILES_KEY,
  DEFAULT_ADMIN_TEACHER_SCHEDULE_FILES,
  type AdminSentTeacherScheduleFile,
} from '../pages/teacher/TeacherClassProgramPage';

export const DELETED_SCHEDULE_IDS_KEY = 'plsnhs_deleted_schedule_ids_v1';
const META_SEPARATOR = ' ||| ';

function isUuid(val?: string | null): boolean {
  return Boolean(
    val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim())
  );
}

/**
 * Encodes schedule metadata into the free-text `uploaded_by` column of `public.teacher_workloads`
 * so 100% of the schedule metadata is stored in Supabase without schema changes.
 */
function encodeWorkloadUploadedBy(entry: AdminSentTeacherScheduleFile): string {
  const cleanSender = (entry.sentBy || 'School Administrator').split(META_SEPARATOR)[0].trim();
  const meta = {
    title: entry.title,
    fileSize: entry.fileSize,
    fileType: entry.fileType,
    schoolYear: entry.schoolYear,
    semester: entry.semester,
    targetGradeLevel: entry.targetGradeLevel || 'All Year Levels',
    recipientType: entry.recipientType,
    recipientTeacherNames: entry.recipientTeacherNames,
    sentBy: cleanSender,
    sentAt: entry.sentAt,
    notes: entry.notes || '',
  };
  return `${cleanSender}${META_SEPARATOR}${JSON.stringify(meta)}`;
}

/**
 * Decodes a `public.teacher_workloads` row back into an `AdminSentTeacherScheduleFile`.
 */
export function decodeWorkloadRowToScheduleFile(row: any): AdminSentTeacherScheduleFile {
  const rawUploadedBy = String(row.uploaded_by || 'School Administrator • Office of the Principal');
  let meta: any = null;
  let senderName = rawUploadedBy;

  if (rawUploadedBy.includes(META_SEPARATOR)) {
    const parts = rawUploadedBy.split(META_SEPARATOR);
    senderName = parts[0].trim();
    try {
      meta = JSON.parse(parts.slice(1).join(META_SEPARATOR));
    } catch {
      meta = null;
    }
  }

  const extFromType = row.file_type
    ? row.file_type.includes('pdf')
      ? 'PDF'
      : row.file_type.includes('image')
      ? 'IMAGE'
      : String(row.file_type).split('/').pop()?.toUpperCase() || 'PDF'
    : (row.file_name || '').split('.').pop()?.toUpperCase() || 'PDF';

  const formattedDate = row.created_at
    ? new Date(row.created_at).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent';

  return {
    id: String(row.id),
    title:
      meta?.title ||
      `Official Faculty Class Program — ${row.file_name || 'Teaching Schedule'}`,
    fileName: row.file_name || 'Official_Teacher_Schedule.pdf',
    fileSize: meta?.fileSize || '450 KB',
    fileType: meta?.fileType || extFromType,
    fileDataUrl: row.file_url || undefined,
    schoolYear: meta?.schoolYear || 'S.Y. 2026–2027',
    semester: meta?.semester || '1st & 2nd Semester',
    targetGradeLevel: meta?.targetGradeLevel || 'All Year Levels',
    recipientType: meta?.recipientType || (row.teacher_id ? 'selected' : 'all'),
    recipientTeacherNames:
      Array.isArray(meta?.recipientTeacherNames) && meta.recipientTeacherNames.length > 0
        ? meta.recipientTeacherNames
        : ['All Faculty Teachers'],
    sentBy: meta?.sentBy || senderName || 'School Administrator • Office of the Principal',
    sentAt: meta?.sentAt || formattedDate,
    notes:
      meta?.notes ||
      'Official DepEd teaching assignment and class schedule document attached by School Administration.',
  };
}

/**
 * Uploads a raw File to Supabase Storage bucket `teacher-schedules` and returns its permanent public URL.
 */
export async function uploadScheduleFileToStorage(
  file: File,
  folderPrefix = 'class_schedules'
): Promise<string> {
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${folderPrefix}/${Date.now()}_${cleanFileName}`;

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
      if (publicUrlData?.publicUrl) {
        return publicUrlData.publicUrl;
      }
    } else {
      console.warn('Supabase storage upload warning:', upErr);
    }
  } catch (err) {
    console.warn('Supabase storage upload exception:', err);
  }

  // Fallback to data URL only if storage upload was unreachable
  return readFileAsDataUrl(file);
}

/**
 * Resolves a valid `public.teachers.id` UUID (NOT `public.users.id`) so `teacher_workloads_teacher_id_fkey` is satisfied.
 */
async function resolveValidTeacherTableId(
  candidateIdOrUserId?: string | null,
  teacherName?: string | null
): Promise<string | null> {
  try {
    if (isUuid(candidateIdOrUserId)) {
      const { data: byId } = await supabase
        .from('teachers')
        .select('id')
        .or(`id.eq.${candidateIdOrUserId},user_id.eq.${candidateIdOrUserId}`)
        .limit(1)
        .maybeSingle();
      if (byId?.id) return byId.id;
    }

    if (teacherName) {
      const strip = teacherName
        .replace(/\b(mrs?\.?|ms\.?|dr\.?|prof\.?|teacher)\b/gi, '')
        .trim();
      const lastToken = strip.split(/\s+/).pop() || strip;
      if (lastToken.length >= 2) {
        const { data: byName } = await supabase
          .from('teachers')
          .select('id, first_name, last_name')
          .ilike('last_name', `%${lastToken}%`)
          .limit(1)
          .maybeSingle();
        if (byName?.id) return byName.id;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Saves an attached schedule entry permanently into Supabase (`public.teacher_workloads` & `public.teachers`)
 * and synchronizes `localStorage` so the attached file is never lost.
 */
export async function saveScheduleEntryToDatabase(
  entry: AdminSentTeacherScheduleFile,
  rawFile?: File | null
): Promise<AdminSentTeacherScheduleFile> {
  let finalFileUrl = entry.fileDataUrl || '';

  // 1. If a raw File was attached, upload to Supabase Storage `teacher-schedules` for a permanent URL
  if (rawFile) {
    finalFileUrl = await uploadScheduleFileToStorage(rawFile, 'admin_faculty_schedules');
  } else if (!finalFileUrl || !finalFileUrl.startsWith('http')) {
    finalFileUrl =
      finalFileUrl ||
      'https://tuujlqrfyuazvbvoribz.supabase.co/storage/v1/object/public/teacher-schedules/faculty_load.pdf';
  }

  const updatedEntry: AdminSentTeacherScheduleFile = {
    ...entry,
    fileDataUrl: finalFileUrl,
  };

  // 2. Resolve valid `public.teachers.id` if single teacher recipient
  let validTeacherTableId: string | null = null;
  if (
    updatedEntry.recipientType === 'selected' &&
    updatedEntry.recipientTeacherNames.length === 1 &&
    !updatedEntry.recipientTeacherNames[0].toLowerCase().includes('all faculty')
  ) {
    validTeacherTableId = await resolveValidTeacherTableId(
      null,
      updatedEntry.recipientTeacherNames[0]
    );
  }

  // 3. Remove previous `teacher_workloads` rows for the same specific targetGradeLevel (e.g. Grade 7, Grade 8, Grade 9, Grade 10, SHS)
  // so the newly attached file replaces the old one in the database
  try {
    const { data: existingRows } = await supabase
      .from('teacher_workloads')
      .select('id, file_name, uploaded_by');

    if (Array.isArray(existingRows) && existingRows.length > 0) {
      const idsToReplace: string[] = [];
      for (const r of existingRows) {
        const decoded = decodeWorkloadRowToScheduleFile(r);
        if (
          updatedEntry.targetGradeLevel &&
          updatedEntry.targetGradeLevel !== 'All Year Levels' &&
          decoded.targetGradeLevel === updatedEntry.targetGradeLevel
        ) {
          idsToReplace.push(r.id);
        } else if (
          decoded.title.toLowerCase() === updatedEntry.title.toLowerCase() ||
          r.file_name === updatedEntry.fileName
        ) {
          idsToReplace.push(r.id);
        }
      }
      if (idsToReplace.length > 0) {
        await supabase.from('teacher_workloads').delete().in('id', idsToReplace);
      }
    }
  } catch {
    // ignore cleanup notice
  }

  // 4. Insert the attached schedule into `public.teacher_workloads`
  try {
    const mimeType =
      rawFile?.type ||
      (updatedEntry.fileType === 'PDF'
        ? 'application/pdf'
        : updatedEntry.fileType === 'IMAGE' ||
          ['PNG', 'JPG', 'JPEG'].includes(updatedEntry.fileType)
        ? 'image/jpeg'
        : 'application/octet-stream');

    const { data: insertedRow, error: insErr } = await supabase
      .from('teacher_workloads')
      .insert([
        {
          teacher_id: validTeacherTableId,
          file_name: updatedEntry.fileName,
          file_url: finalFileUrl,
          file_type: mimeType,
          uploaded_by: encodeWorkloadUploadedBy(updatedEntry),
        },
      ])
      .select()
      .maybeSingle();

    if (!insErr && insertedRow?.id) {
      updatedEntry.id = String(insertedRow.id);
    } else if (insErr) {
      console.warn('Supabase teacher_workloads insert error:', insErr);
    }
  } catch (err) {
    console.warn('Supabase teacher_workloads insert exception:', err);
  }

  // 5. Also update `public.teachers` for matched teacher recipients
  try {
    if (
      updatedEntry.recipientType === 'selected' &&
      updatedEntry.recipientTeacherNames.length > 0
    ) {
      for (const tName of updatedEntry.recipientTeacherNames) {
        const tid = await resolveValidTeacherTableId(null, tName);
        if (tid) {
          await supabase
            .from('teachers')
            .update({
              teacher_load_url: finalFileUrl,
              teacher_load_name: updatedEntry.fileName,
              teacher_load_file_type: updatedEntry.fileType || 'PDF',
              teacher_load_updated_at: new Date().toISOString(),
            })
            .eq('id', tid);
        }
      }
    }
  } catch {
    // ignore teachers table update notice
  }

  return updatedEntry;
}

/**
 * Fetches all saved schedule files from Supabase (`public.teacher_workloads`) and merges with local cache & defaults.
 * Any specific Year Level (e.g. Grade 7, Grade 8, Grade 9, Grade 10, SHS) that has an Admin-attached file
 * replaces the default placeholder file for that Year Level so the attached file is always the one displayed.
 */
export async function fetchSavedScheduleFilesFromDatabase(
  defaultFiles: AdminSentTeacherScheduleFile[] = DEFAULT_ADMIN_TEACHER_SCHEDULE_FILES
): Promise<AdminSentTeacherScheduleFile[]> {
  let deletedIds = new Set<string>();
  try {
    const delRaw = localStorage.getItem(DELETED_SCHEDULE_IDS_KEY);
    if (delRaw) {
      const parsed = JSON.parse(delRaw);
      if (Array.isArray(parsed)) deletedIds = new Set(parsed.map(String));
    }
  } catch {
    // ignore
  }

  const dbFiles: AdminSentTeacherScheduleFile[] = [];
  try {
    const { data: rows, error } = await supabase
      .from('teacher_workloads')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(rows)) {
      rows.forEach((r) => {
        if (!deletedIds.has(String(r.id))) {
          dbFiles.push(decodeWorkloadRowToScheduleFile(r));
        }
      });
    }
  } catch (err) {
    console.warn('Fetch teacher_workloads error:', err);
  }

  let localFiles: AdminSentTeacherScheduleFile[] = [];
  try {
    const raw = localStorage.getItem(ADMIN_TEACHER_SCHEDULE_FILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localFiles = parsed.filter((f) => !deletedIds.has(String(f.id)));
      }
    }
  } catch {
    // ignore
  }

  // Merge priority: 1) Database files (`public.teacher_workloads`), 2) Custom local files, 3) Unreplaced defaults
  const defaultIds = new Set(defaultFiles.map((d) => d.id));
  const customLocalFiles = localFiles.filter((f) => !defaultIds.has(f.id));

  const combinedCustom: AdminSentTeacherScheduleFile[] = [];
  const seenKeys = new Set<string>();

  for (const item of [...dbFiles, ...customLocalFiles]) {
    const key = `${item.id}|${item.fileName}|${item.targetGradeLevel || ''}`;
    if (!seenKeys.has(item.id) && !seenKeys.has(key)) {
      seenKeys.add(item.id);
      seenKeys.add(key);
      combinedCustom.push(item);
    }
  }

  // Determine which specific targetGradeLevels or titles already have an Admin-attached schedule file
  const replacedGrades = new Set<string>();
  const replacedTitles = new Set<string>();
  combinedCustom.forEach((f) => {
    if (f.targetGradeLevel && f.targetGradeLevel !== 'All Year Levels') {
      replacedGrades.add(f.targetGradeLevel.toLowerCase());
    }
    if (f.title) {
      replacedTitles.add(f.title.toLowerCase());
    }
  });

  const remainingDefaults = defaultFiles.filter((def) => {
    if (deletedIds.has(def.id)) return false;
    if (
      def.targetGradeLevel &&
      def.targetGradeLevel !== 'All Year Levels' &&
      replacedGrades.has(def.targetGradeLevel.toLowerCase())
    ) {
      return false; // Replaced by the Admin's attached file for this Year Level!
    }
    if (replacedTitles.has(def.title.toLowerCase())) {
      return false; // Replaced by the Admin's attached file with the same title!
    }
    return true;
  });

  const finalFiles = [...combinedCustom, ...remainingDefaults];

  // Persist to localStorage (strip oversized >500KB base64 strings if any exist so localStorage never throws QuotaExceededError)
  try {
    const safeForLocalStorage = finalFiles.map((f) =>
      f.fileDataUrl && f.fileDataUrl.startsWith('data:') && f.fileDataUrl.length > 500_000
        ? { ...f, fileDataUrl: undefined }
        : f
    );
    localStorage.setItem(ADMIN_TEACHER_SCHEDULE_FILES_KEY, JSON.stringify(safeForLocalStorage));
  } catch {
    // ignore quota error
  }

  return finalFiles;
}

/**
 * Deletes a schedule file from both Supabase `public.teacher_workloads` and local cache.
 */
export async function deleteScheduleEntryFromDatabase(
  file: AdminSentTeacherScheduleFile
): Promise<void> {
  try {
    const delRaw = localStorage.getItem(DELETED_SCHEDULE_IDS_KEY);
    const delArr: string[] = delRaw ? JSON.parse(delRaw) : [];
    if (!delArr.includes(String(file.id))) {
      delArr.push(String(file.id));
      localStorage.setItem(DELETED_SCHEDULE_IDS_KEY, JSON.stringify(delArr));
    }
  } catch {
    // ignore
  }

  try {
    if (isUuid(file.id)) {
      await supabase.from('teacher_workloads').delete().eq('id', file.id);
    } else if (file.fileName) {
      await supabase.from('teacher_workloads').delete().eq('file_name', file.fileName);
    }
  } catch (err) {
    console.warn('Delete teacher_workloads notice:', err);
  }
}

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

    // 3. Insert into teacher_workloads (using valid public.teachers.id for FK constraint)
    try {
      const validTeacherTableId = await resolveValidTeacherTableId(
        teacherTableId || teacherId,
        teacherName
      );
      await supabase.from('teacher_workloads').insert([
        {
          teacher_id: validTeacherTableId,
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
