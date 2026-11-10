import { supabase } from './supabase';
import { ensureAuthenticatedSession } from './studentDocumentsService';

/**
 * Uploads a profile picture to Supabase Storage and updates the database records
 * so it permanently persists in the cloud database across all devices and official web deployments.
 */
export async function uploadAndSaveAvatar(
  user: { id?: string | number; email?: string; role?: string },
  dataUrlOrBlob: string | Blob
): Promise<string> {
  const cleanEmail = (user.email || '').trim().toLowerCase();
  const safeId = cleanEmail.replace(/[^a-z0-9]/g, '_') || (user.id ? String(user.id) : 'default');
  const filePath = `avatars/avatar_${safeId}.jpg`;

  let publicUrl = '';

  try {
    // 1. Convert base64 Data URL to Blob if needed
    let blob: Blob;
    if (typeof dataUrlOrBlob === 'string') {
      const parts = dataUrlOrBlob.split(',');
      const byteString = atob(parts[1] || parts[0]);
      const mimeMatch = dataUrlOrBlob.match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      blob = new Blob([ab], { type: mime });
    } else {
      blob = dataUrlOrBlob;
    }

    // 2. Upload directly to Supabase Storage bucket
    const { error: uploadErr } = await supabase.storage
      .from('student_documents')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (!uploadErr) {
      const { data } = supabase.storage.from('student_documents').getPublicUrl(filePath);
      // Append timestamp query parameter to bust browser cache
      publicUrl = `${data.publicUrl}?t=${Date.now()}`;
    } else {
      console.warn('Notice from Supabase storage upload:', uploadErr.message);
    }
  } catch (err) {
    console.warn('Notice during avatar upload processing:', err);
  }

  // Fallback to compressed Data URL if storage didn't return publicUrl
  const finalAvatar = publicUrl || (typeof dataUrlOrBlob === 'string' ? dataUrlOrBlob : '');

  // 3. Try updating users table directly if avatar_url column exists
  if (finalAvatar && cleanEmail) {
    try {
      await supabase.from('users').update({ avatar_url: finalAvatar }).ilike('email', cleanEmail);
    } catch {
      // ignore if avatar_url column is not yet added to users table
    }
  }

  // 4. Persist in Supabase app_settings table for universal cross-device access
  if (finalAvatar && cleanEmail) {
    try {
      await supabase.from('app_settings').upsert({
        key: `avatar_${cleanEmail}`,
        value: finalAvatar,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  }

  // 5. If student, also update students and enrollments table in Supabase
  if (user.role === 'student' && finalAvatar) {
    try {
      const studentUpdates: Record<string, any> = {
        avatar_url: finalAvatar,
        two_by_two_picture_url: finalAvatar,
        updated_at: new Date().toISOString(),
      };
      if (cleanEmail) {
        await supabase.from('students').update(studentUpdates).ilike('email', cleanEmail);
        await supabase.from('enrollments').update({
          two_by_two_picture_url: finalAvatar,
          updated_at: new Date().toISOString(),
        }).ilike('email', cleanEmail);
      }
      if (user.id) {
        await supabase.from('students').update(studentUpdates).eq('id', user.id);
      }

      // Also register in student_documents table in Supabase
      try {
        await ensureAuthenticatedSession().catch(() => {});
        let studentDbId: string | null = null;
        if (cleanEmail) {
          const { data: sRow } = await supabase.from('students').select('id').ilike('email', cleanEmail).maybeSingle();
          if (sRow?.id) studentDbId = sRow.id;
        }
        await supabase.from('student_documents').insert({
          student_id: studentDbId || (typeof user.id === 'string' && user.id.includes('-') ? user.id : null),
          document_type: '2x2 ID Photo',
          file_url: finalAvatar,
          file_name: `avatar_${safeId}.jpg`,
          file_size: null,
          uploaded_at: new Date().toISOString(),
          verified: false,
          remarks: 'Updated student profile picture / 2x2 ID photo',
        });
      } catch (docErr) {
        console.warn('Notice registering avatar in student_documents:', docErr);
      }
    } catch (err) {
      console.warn('Notice updating student avatar in database:', err);
    }
  }

  // 5. Store in localStorage as instant fast local cache
  if (typeof window !== 'undefined' && finalAvatar) {
    if (cleanEmail) {
      localStorage.setItem(`plsnhs_avatar_${cleanEmail}`, finalAvatar);
      localStorage.setItem(`plsnhs_avatar_${user.email}`, finalAvatar);
    }
    localStorage.setItem('plsnhs_avatar_default', finalAvatar);
    window.dispatchEvent(new Event('plsnhs-avatar-updated'));
  }

  return finalAvatar;
}

/**
 * Fetches user avatar from Supabase database
 */
export async function fetchUserAvatarFromDatabase(user: {
  id?: string | number;
  email?: string;
  role?: string;
}): Promise<string | null> {
  const cleanEmail = (user.email || '').trim().toLowerCase();
  if (!cleanEmail) return null;

  // 1. Check users table directly if avatar_url column exists
  try {
    const { data: uData } = await supabase
      .from('users')
      .select('avatar_url')
      .ilike('email', cleanEmail)
      .maybeSingle();
    if (uData?.avatar_url && uData.avatar_url.trim().length > 0) {
      return uData.avatar_url;
    }
  } catch {
    // ignore if avatar_url column not yet added to users
  }

  // 2. If student, check students table by email
  if (user.role === 'student' || !user.role) {
    try {
      const { data } = await supabase
        .from('students')
        .select('avatar_url, two_by_two_picture_url')
        .ilike('email', cleanEmail)
        .maybeSingle();
      const photo = data?.avatar_url || data?.two_by_two_picture_url;
      if (photo && photo.trim().length > 0) return photo;
    } catch {
      // ignore
    }

    try {
      const { data } = await supabase
        .from('enrollments')
        .select('two_by_two_picture_url')
        .ilike('email', cleanEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.two_by_two_picture_url && data.two_by_two_picture_url.trim().length > 0) {
        return data.two_by_two_picture_url;
      }
    } catch {
      // ignore
    }
  }

  // 2. For all roles, check app_settings in Supabase
  try {
    const { data: setting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', `avatar_${cleanEmail}`)
      .maybeSingle();

    if (setting?.value && setting.value.trim().length > 0) {
      return setting.value;
    }
  } catch {
    // ignore
  }

  return null;
}
