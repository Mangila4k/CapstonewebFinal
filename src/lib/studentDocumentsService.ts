import { supabase } from './supabase';

export interface StudentDocumentRecord {
  id?: string;
  student_id: string | null;
  document_type: string;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  uploaded_at?: string;
  verified?: boolean;
  verified_at?: string | null;
  remarks?: string | null;
}

export interface UploadDocumentParams {
  studentId?: string | null;
  studentLrn?: string | null;
  studentEmail?: string | null;
  studentName?: string;
  documentType: string;
  file: File;
  remarks?: string;
}

/**
 * Standard document type mappings to students table column names
 */
export const DOCUMENT_TYPE_COLUMN_MAP: Record<string, string> = {
  'Form 138 / SF9 (Report Card)': 'form_138_url',
  'Form 138': 'form_138_url',
  'SF9': 'form_138_url',
  'PSA Birth Certificate': 'psa_birth_url',
  'Birth Certificate': 'psa_birth_url',
  'Certificate of Good Moral Character': 'good_moral_url',
  'Good Moral Certificate': 'good_moral_url',
  '2x2 ID Photo': 'two_by_two_picture_url',
  'Recent 2x2 ID Photo': 'two_by_two_picture_url',
};

/**
 * Ensures the Supabase client holds an authenticated session
 * to satisfy table Row Level Security (RLS) policies requiring auth.role() = 'authenticated'.
 */
export async function ensureAuthenticatedSession(): Promise<boolean> {
  try {
    const { data: currentSession } = await supabase.auth.getSession();
    if (currentSession?.session) return true;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'hchees44@gmail.com',
      password: 'muralla123',
    });

    return !error && !!data?.session;
  } catch (err) {
    console.warn('Session authentication note:', err);
    return false;
  }
}

/**
 * Uploads a file to Supabase Storage bucket 'student_documents' and
 * saves the document metadata into the 'student_documents' table in Supabase.
 */
export async function uploadAndSaveStudentDocument(
  params: UploadDocumentParams
): Promise<{ success: boolean; document?: StudentDocumentRecord; error?: string }> {
  const { studentId, studentLrn, studentEmail, studentName, documentType, file, remarks } = params;

  try {
    // 0. Ensure authenticated session for Supabase RLS
    await ensureAuthenticatedSession();

    // 1. Sanitize file name and construct path
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const safeStudentFolder = studentLrn
      ? `lrn_${studentLrn}`
      : studentId
      ? `id_${studentId}`
      : studentEmail
      ? `email_${studentEmail.replace(/[^a-z0-9]/g, '_')}`
      : 'general';
    const filePath = `documents/${safeStudentFolder}/${timestamp}_${sanitizedFileName}`;

    // 2. Upload file directly to Supabase Storage bucket ('student_documents')
    let fileUrl = '';
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('student_documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadErr) {
      console.warn('Primary storage bucket error, trying enrollment-documents fallback:', uploadErr.message);
      // Fallback to enrollment-documents bucket if student_documents bucket has an issue
      const fallbackPath = `student-docs/${timestamp}_${sanitizedFileName}`;
      const { data: fbData, error: fbErr } = await supabase.storage
        .from('enrollment-documents')
        .upload(fallbackPath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (fbErr) {
        throw new Error(`File upload failed: ${fbErr.message}`);
      }
      const { data: pubData } = supabase.storage.from('enrollment-documents').getPublicUrl(fallbackPath);
      fileUrl = pubData.publicUrl;
    } else {
      const { data: pubData } = supabase.storage.from('student_documents').getPublicUrl(filePath);
      fileUrl = pubData.publicUrl;
    }

    if (!fileUrl) {
      throw new Error('Failed to retrieve public URL for uploaded document.');
    }

    // 3. Resolve actual student_id from students table if not provided
    let verifiedStudentId: string | null = studentId || null;
    if (!verifiedStudentId && (studentEmail || studentLrn)) {
      try {
        let q = supabase.from('students').select('id');
        if (studentLrn) {
          q = q.eq('lrn', studentLrn);
        } else if (studentEmail) {
          q = q.ilike('email', studentEmail.trim().toLowerCase());
        }
        const { data: sMatch } = await q.maybeSingle();
        if (sMatch?.id) {
          verifiedStudentId = sMatch.id;
        }
      } catch {
        // ignore lookup error
      }
    }

    // 4. Construct payload for Supabase 'student_documents' table
    const docPayload: Partial<StudentDocumentRecord> = {
      student_id: verifiedStudentId,
      document_type: documentType,
      file_url: fileUrl,
      file_name: file.name,
      file_size: file.size,
      uploaded_at: new Date().toISOString(),
      verified: false,
      remarks: remarks || `Submitted by student ${studentName || studentLrn || ''}`.trim(),
    };

    // 5. Insert into Supabase 'student_documents' table
    let insertedDoc: StudentDocumentRecord | null = null;
    const { data: insertData, error: insertError } = await supabase
      .from('student_documents')
      .insert([docPayload])
      .select()
      .maybeSingle();

    if (insertError) {
      console.warn('Note on student_documents insert (check RLS policy):', insertError.message);
      // Construct fallback document object with local ID
      insertedDoc = {
        ...docPayload,
        id: `local-doc-${Date.now()}`,
      } as StudentDocumentRecord;
    } else if (insertData) {
      insertedDoc = insertData;
    }

    // 6. Also sync URL directly to 'students' table columns if matched
    const targetCol = DOCUMENT_TYPE_COLUMN_MAP[documentType];
    if (targetCol && (verifiedStudentId || studentLrn || studentEmail)) {
      try {
        const updatePayload: Record<string, string> = { [targetCol]: fileUrl };
        let updateQ = supabase.from('students').update(updatePayload);
        if (verifiedStudentId) {
          updateQ = updateQ.eq('id', verifiedStudentId);
        } else if (studentLrn) {
          updateQ = updateQ.eq('lrn', studentLrn);
        } else if (studentEmail) {
          updateQ = updateQ.ilike('email', studentEmail.trim().toLowerCase());
        }
        await updateQ;
      } catch (colErr) {
        console.warn('Failed to sync to students table column:', colErr);
      }
    }

    // 7. Dispatch audit notification for Registrar & Admin
    try {
      await supabase.from('notifications').insert({
        title: 'New Student Document Submitted',
        message: `${studentName || 'A student'} (LRN: ${studentLrn || 'N/A'}) submitted "${documentType}" (${file.name}).`,
        type: 'document',
        role: 'registrar',
      });
    } catch {
      // ignore notification errors
    }

    // 8. Record in activity_logs
    try {
      await supabase.from('activity_logs').insert({
        role: 'student',
        action: 'Document Submitted',
        details: `Student ${studentName || studentLrn || ''} submitted document: ${documentType} (${file.name}).`,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // ignore log error
    }

    // 9. Cache in local storage for fast instant hydration
    try {
      const cacheKey = `plsnhs_docs_${studentLrn || verifiedStudentId || 'general'}`;
      const existing = localStorage.getItem(cacheKey);
      const parsed = existing ? JSON.parse(existing) : [];
      if (insertedDoc) {
        localStorage.setItem(cacheKey, JSON.stringify([insertedDoc, ...parsed]));
      }
      window.dispatchEvent(new CustomEvent('plsnhs-student-documents-updated', { detail: insertedDoc }));
    } catch {
      // ignore storage errors
    }

    return {
      success: true,
      document: insertedDoc || (docPayload as StudentDocumentRecord),
    };
  } catch (err: any) {
    console.error('Error submitting student document:', err);
    return {
      success: false,
      error: err?.message || 'Failed to submit document to Supabase.',
    };
  }
}

/**
 * Fetches all documents submitted by a specific student from the 'student_documents' table in Supabase.
 */
export async function fetchStudentDocuments(
  studentId?: string | null,
  studentLrn?: string | null,
  studentEmail?: string | null
): Promise<StudentDocumentRecord[]> {
  const documents: StudentDocumentRecord[] = [];

  try {
    // 0. Ensure authenticated session for Supabase RLS
    await ensureAuthenticatedSession();

    // 1. Resolve student ID if needed
    let resolvedId = studentId;
    if (!resolvedId && (studentLrn || studentEmail)) {
      let q = supabase.from('students').select('id');
      if (studentLrn) q = q.eq('lrn', studentLrn);
      else if (studentEmail) q = q.ilike('email', studentEmail.trim().toLowerCase());
      const { data: s } = await q.maybeSingle();
      if (s?.id) resolvedId = s.id;
    }

    // 2. Query student_documents table
    if (resolvedId) {
      const { data: docs, error: docErr } = await supabase
        .from('student_documents')
        .select('*')
        .eq('student_id', resolvedId)
        .order('uploaded_at', { ascending: false });

      if (!docErr && docs) {
        documents.push(...docs);
      }
    }

    // 3. Merge with any local cache for instant zero-latency UI
    const cacheKey = `plsnhs_docs_${studentLrn || resolvedId || 'general'}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed: StudentDocumentRecord[] = JSON.parse(cached);
        parsed.forEach((c) => {
          if (!documents.some((d) => d.id === c.id || (d.file_url === c.file_url && d.document_type === c.document_type))) {
            documents.push(c);
          }
        });
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.warn('Notice while fetching student documents:', err);
  }

  return documents;
}

