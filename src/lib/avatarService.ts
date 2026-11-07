import { supabase } from './supabase';

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

  // 3. Persist in Supabase app_settings table for universal cross-device access
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

  // 4. If student, also update students table in Supabase
  if (user.role === 'student' && finalAvatar) {
    try {
      const studentUpdates: Record<string, any> = {
        avatar_url: finalAvatar,
        two_by_two_picture_url: finalAvatar,
        updated_at: new Date().toISOString(),
      };
      let sQ = supabase.from('students').update(studentUpdates);
      if (user.id) sQ = sQ.eq('id', user.id);
      else if (cleanEmail) sQ = sQ.ilike('email', cleanEmail);
      await sQ;
    } catch {
      // ignore
    }
  }

  // 5. Store in localStorage as instant fast local cache
  if (typeof window !== 'undefined' && finalAvatar) {
    if (cleanEmail) {
      localStorage.setItem(`plsnhs_avatar_${cleanEmail}`, finalAvatar);
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

  // 1. If student, check students table
  if (user.role === 'student') {
    try {
      const idFilter = user.id ? `,id.eq.${user.id}` : '';
      const { data } = await supabase
        .from('students')
        .select('avatar_url, two_by_two_picture_url')
        .or(`email.ilike.${cleanEmail}${idFilter}`)
        .maybeSingle();
      const photo = data?.avatar_url || data?.two_by_two_picture_url;
      if (photo) return photo;
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

    if (setting?.value) {
      return setting.value;
    }
  } catch {
    // ignore
  }

  // 3. Check public Supabase storage directly
  try {
    const safeId = cleanEmail.replace(/[^a-z0-9]/g, '_');
    const filePath = `avatars/avatar_${safeId}.jpg`;
    const { data } = supabase.storage.from('student_documents').getPublicUrl(filePath);
    if (data?.publicUrl) {
      return `${data.publicUrl}?t=${Date.now()}`;
    }
  } catch {
    // ignore
  }

  return null;
}
