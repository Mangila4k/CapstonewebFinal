-- ==============================================================================
-- PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL — SUPABASE STUDENT DOCUMENTS SETUP
-- Run this script in the Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/tuujlqrfyuazvbvoribz/sql/new
-- ==============================================================================

-- 1. Ensure the student_documents table exists with complete schema
CREATE TABLE IF NOT EXISTS public.student_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    remarks TEXT
);

-- 2. Configure Row Level Security (RLS)
-- Enables full access for student uploads and registrar audits
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies if present
DROP POLICY IF EXISTS "Allow all access to student_documents" ON public.student_documents;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.student_documents;
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.student_documents;

-- Create permissive policy matching notifications, activity_logs, and grades
CREATE POLICY "Allow all access to student_documents" 
ON public.student_documents 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 3. Ensure the student_documents Storage Bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('student_documents', 'student_documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage object policies for student_documents bucket
DROP POLICY IF EXISTS "Allow public uploads to student_documents bucket" ON storage.objects;
CREATE POLICY "Allow public uploads to student_documents bucket"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'student_documents');

DROP POLICY IF EXISTS "Allow public reads from student_documents bucket" ON storage.objects;
CREATE POLICY "Allow public reads from student_documents bucket"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'student_documents');
