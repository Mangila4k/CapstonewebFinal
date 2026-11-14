import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  User,
  Users,
  BookOpen,
  Send,
  CheckCircle2,
  ArrowLeft,
  GraduationCap,
  School,
  UserPlus,
  Utensils,
  Laptop,
  Paperclip,
  FileText,
  CloudUpload,
  Trash2,
  AlertCircle,
  Lock,
  Mail,
  MapPin,
  Sparkles,
  Check,
  ShieldCheck,
  Calendar,
  Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';
import { useEnrollmentStatus } from '../../lib/enrollmentControlStore';
import { Alert } from '../../components/common/Alert';
import { ensureAuthenticatedSession } from '../../lib/studentDocumentsService';
import { isLrnManualRequired, generateAutoLrn } from '../../lib/utils';
import './enrollment_original.css';

interface DocConfig {
  key: string;
  title: string;
  hint: string;
  accept: string;
  applicableTypes: string[];
}

const DOCUMENT_CONFIG: DocConfig[] = [
  {
    key: 'two_by_two_picture',
    title: '2x2 ID Picture for Official School ID (White Background)',
    hint: 'JPG or PNG (Format title with plain white background).',
    accept: 'image/jpeg,image/png,image/jpg',
    applicableTypes: ['New Student', 'Transferee'],
  },
  {
    key: 'form_137',
    title: 'Form 137 (Permanent Record)',
    hint: 'PDF, JPG, JPEG, or PNG',
    accept: '.pdf,image/jpeg,image/png,image/jpg',
    applicableTypes: ['New Student', 'Transferee'],
  },
  {
    key: 'report_card',
    title: 'Report Card',
    hint: 'PDF, JPG, JPEG, or PNG',
    accept: '.pdf,image/jpeg,image/png,image/jpg',
    applicableTypes: ['New Student', 'Transferee', 'Old Student'],
  },
  {
    key: 'certificate_of_completion',
    title: 'Certificate of Completion',
    hint: 'PDF, JPG, JPEG, or PNG',
    accept: '.pdf,image/jpeg,image/png,image/jpg',
    applicableTypes: ['New Student', 'Transferee'],
  },
  {
    key: 'psa_birth_cert',
    title: 'PSA Birth Certificate',
    hint: 'PDF, JPG, JPEG, or PNG',
    accept: '.pdf,image/jpeg,image/png,image/jpg',
    applicableTypes: ['New Student', 'Transferee'],
  },
  {
    key: 'good_moral_cert',
    title: 'Good Moral Certificate',
    hint: 'PDF, JPG, JPEG, or PNG',
    accept: '.pdf,image/jpeg,image/png,image/jpg',
    applicableTypes: ['New Student', 'Transferee'],
  },
];

export const EnrollmentWizardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedStrand = searchParams.get('strand') || '';

  // Live Admin Enrollment Control
  const { settings: enrollmentSettings, isOpen: isEnrollmentOpen, loading: isEnrollmentLoading } = useEnrollmentStatus();

  // Form State
  const [formData, setFormData] = useState({
    // Personal Information
    lastName: '',
    firstName: '',
    middleName: '',
    lrn: '',
    email: '',
    dob: '',
    age: '',
    birthplace: '',
    gender: '',
    nationality: 'Filipino',
    religion: '',
    address: '',

    // Parent / Guardian Information
    motherName: '',
    motherOccupation: '',
    fatherName: '',
    fatherOccupation: '',
    guardianName: '',
    guardianRelationship: '',
    guardianContact: '',
    guardianEmail: '',
    guardianAddress: '',

    // Grade Level & Strand
    studentType: 'New Student',
    gradeLevel: 'Grade 11',
    strand: preselectedStrand || 'STEM',
    tvlSpecialization: 'TVL-Cookery',
    schoolYear: '2026-2027',
  });

  // Uploaded Documents state
  const [documents, setDocuments] = useState<Record<string, File | null>>({
    two_by_two_picture: null,
    form_137: null,
    report_card: null,
    certificate_of_completion: null,
    psa_birth_cert: null,
    good_moral_cert: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState('');
  const [submittedData, setSubmittedData] = useState<any>(null);

  const handleFileChange = (key: string, file: File | null) => {
    setDocuments((prev) => ({
      ...prev,
      [key]: file,
    }));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const activeRequirements = DOCUMENT_CONFIG.filter((doc) =>
    doc.applicableTypes.includes(formData.studentType)
  );

  // LRN requirement logic:
  // - Grade 7 & Transferees: entered manually (required 12 digits)
  // - Grades 8 through 12: populated automatically by Placido L. Señor NHS system
  const isLrnManual = isLrnManualRequired(formData.gradeLevel, formData.studentType);
  const [lastManualMode, setLastManualMode] = useState<boolean>(isLrnManual);

  useEffect(() => {
    if (isLrnManual !== lastManualMode) {
      setLastManualMode(isLrnManual);
      if (isLrnManual) {
        // Switched to Grade 7 or Transferee: clear LRN so applicant manually enters official 12-digit DepEd LRN
        setFormData((prev) => ({ ...prev, lrn: '' }));
      } else {
        // Switched to continuing learner in Grades 8-12: auto-populate institutional LRN
        const autoLrn = generateAutoLrn(
          formData.email || `${formData.firstName}${formData.lastName}` || 'plsnhs'
        );
        setFormData((prev) => ({ ...prev, lrn: autoLrn }));
      }
    } else if (!isLrnManual && (!formData.lrn || formData.lrn.length !== 12 || !/^\d{12}$/.test(formData.lrn))) {
      // Auto-populate if missing or invalid in auto mode
      const autoLrn = generateAutoLrn(
        formData.email || `${formData.firstName}${formData.lastName}` || 'plsnhs'
      );
      setFormData((prev) => ({ ...prev, lrn: autoLrn }));
    }
  }, [isLrnManual, lastManualMode, formData.gradeLevel, formData.studentType, formData.email, formData.firstName, formData.lastName, formData.lrn]);

  // Auto-calculate age from Date of Birth
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dobValue = e.target.value;
    let computedAge = '';

    if (dobValue) {
      const birthDate = new Date(dobValue);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age >= 0 && age <= 100) {
        computedAge = age.toString();
      }
    }

    setFormData((prev) => ({
      ...prev,
      dob: dobValue,
      age: computedAge,
    }));
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Hard check: Admin Enrollment On/Off Switch
    if (!isEnrollmentOpen) {
      setError(
        'Student enrollment is currently closed by the School Administration. Applications cannot be submitted at this time.'
      );
      return;
    }

    // Validation
    if (!formData.lastName.trim() || !formData.firstName.trim()) {
      setError('Please enter your full name (Last Name and First Name).');
      return;
    }

    if (!formData.email.trim()) {
      setError('Please provide your email address.');
      return;
    }

    if (!formData.email.trim().toLowerCase().endsWith('@gmail.com')) {
      setError('Only Gmail accounts (@gmail.com) are permitted.');
      return;
    }

    if (!formData.dob) {
      setError('Please provide your Date of Birth.');
      return;
    }

    if (!formData.gender) {
      setError('Please select your gender.');
      return;
    }

    if (!formData.address.trim()) {
      setError('Please enter your home address.');
      return;
    }

    // Learner Reference Number (LRN) Validation
    // - Grade 7 & Transferees: manual entry required (12 digits)
    // - Grades 8 through 12: auto-populated institutional LRN
    let cleanLrn = (formData.lrn || '').trim();
    if (isLrnManual) {
      if (!cleanLrn) {
        setError(
          formData.gradeLevel === 'Grade 7'
            ? 'Please enter your 12-digit Learner Reference Number (LRN) for Grade 7 enrollment.'
            : 'Please enter your 12-digit Learner Reference Number (LRN) as a Transferee student.'
        );
        return;
      }
      if (cleanLrn.length !== 12 || !/^\d{12}$/.test(cleanLrn)) {
        setError('The Learner Reference Number (LRN) must be exactly 12 numeric digits.');
        return;
      }
    } else {
      if (!cleanLrn || cleanLrn.length !== 12 || !/^\d{12}$/.test(cleanLrn)) {
        cleanLrn = generateAutoLrn(
          formData.email || `${formData.firstName}${formData.lastName}` || 'plsnhs'
        );
        setFormData((prev) => ({ ...prev, lrn: cleanLrn }));
      }
    }

    if (!formData.guardianName.trim() || !formData.guardianContact.trim()) {
      setError('Please provide parent or guardian name and contact number.');
      return;
    }

    const isSeniorHigh = formData.gradeLevel === 'Grade 11' || formData.gradeLevel === 'Grade 12';
    let finalStrand = null;
    if (isSeniorHigh) {
      if (formData.strand === 'TVL') {
        finalStrand = formData.tvlSpecialization;
      } else {
        finalStrand = formData.strand;
      }
    }

    setSubmitting(true);
    setUploadStatus('Uploading documents...');

    try {
      // 1. Upload attached files to Supabase storage bucket 'enrollment-documents'
      const uploadedDocUrls: Record<string, string | null> = {
        two_by_two_picture_url: null,
        form_137_url: null,
        report_card_url: null,
        certificate_of_completion_url: null,
        psa_birth_cert_url: null,
        good_moral_cert_url: null,
      };

      for (const [key, file] of Object.entries(documents)) {
        if (file) {
          try {
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const filePath = `admissions/${Date.now()}_${key}_${sanitizedName}`;

            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from('enrollment-documents')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true,
              });

            if (!uploadErr && uploadData) {
              const { data: publicData } = supabase.storage
                .from('enrollment-documents')
                .getPublicUrl(filePath);
              uploadedDocUrls[`${key}_url`] = publicData?.publicUrl || null;
            }
          } catch (storageErr) {
            console.warn(`Storage upload note for ${key}:`, storageErr);
          }
        }
      }

      // 2. Insert into Supabase enrollments table
      const payload: Record<string, any> = {
        lrn: cleanLrn,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        middle_name: formData.middleName.trim() || null,
        email: formData.email.trim().toLowerCase(),
        dob: formData.dob,
        date_of_birth: formData.dob,
        age: formData.age ? parseInt(formData.age, 10) : null,
        birthplace: formData.birthplace.trim() || null,
        gender: formData.gender,
        nationality: formData.nationality.trim() || 'Filipino',
        religion: formData.religion.trim() || null,
        address: formData.address.trim(),

        mother_name: formData.motherName.trim() || null,
        mother_occupation: formData.motherOccupation.trim() || null,
        father_name: formData.fatherName.trim() || null,
        father_occupation: formData.fatherOccupation.trim() || null,

        guardian_name: formData.guardianName.trim(),
        guardian_relationship: formData.guardianRelationship || null,
        guardian_contact: formData.guardianContact.trim(),
        guardian_email: formData.guardianEmail.trim() || null,
        guardian_address: formData.guardianAddress.trim() || formData.address.trim(),

        student_type: formData.studentType,
        grade_level: formData.gradeLevel,
        strand: finalStrand,
        school_year: formData.schoolYear,
        last_school_year: formData.schoolYear,
        status: 'Pending',

        two_by_two_picture_url: uploadedDocUrls.two_by_two_picture_url,
        form_137_url: uploadedDocUrls.form_137_url,
        report_card_url: uploadedDocUrls.report_card_url,
        certificate_of_completion_url: uploadedDocUrls.certificate_of_completion_url,
        psa_birth_cert_url: uploadedDocUrls.psa_birth_cert_url,
        good_moral_cert_url: uploadedDocUrls.good_moral_cert_url,
      };

      let createdEnrollment: any = null;
      const { data, error: insertError } = await supabase
        .from('enrollments')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        // Graceful fallback if PostgreSQL 'enrollments' table doesn't have the 'lrn' column yet (Code 42703)
        if (insertError.code === '42703' || String(insertError.message || '').toLowerCase().includes('lrn')) {
          const { lrn: _omitLrn, ...safePayload } = payload;
          const { data: retryData, error: retryErr } = await supabase
            .from('enrollments')
            .insert(safePayload)
            .select()
            .single();

          if (retryErr) throw retryErr;
          createdEnrollment = retryData ? { ...retryData, lrn: cleanLrn } : { ...payload, lrn: cleanLrn };
        } else {
          throw insertError;
        }
      } else {
        createdEnrollment = data ? { ...data, lrn: cleanLrn } : { ...payload, lrn: cleanLrn };
      }

      // 3. Save all submitted documents to Supabase student_documents table
      await ensureAuthenticatedSession().catch(() => {});

      const docTypeLabels: Record<string, string> = {
        two_by_two_picture: '2x2 ID Photo',
        form_137: 'Form 137 / SF10',
        report_card: 'Form 138 / SF9 (Report Card)',
        certificate_of_completion: 'Certificate of Junior High Completion',
        psa_birth_cert: 'PSA Birth Certificate',
        good_moral_cert: 'Certificate of Good Moral Character',
      };

      for (const [key, file] of Object.entries(documents)) {
        const fileUrl = uploadedDocUrls[`${key}_url`];
        if (file && fileUrl) {
          try {
            await supabase.from('student_documents').insert({
              student_id: data?.student_id || null,
              document_type: docTypeLabels[key] || key,
              file_url: fileUrl,
              file_name: file.name,
              file_size: file.size,
              uploaded_at: new Date().toISOString(),
              verified: false,
              remarks: `Submitted during online enrollment for ${formData.gradeLevel} (Applicant: ${formData.firstName.trim()} ${formData.lastName.trim()})`,
            });
          } catch (docSaveErr) {
            console.warn(`Notice: student_documents record for ${key}:`, docSaveErr);
          }
        }
      }

      // Notify Admin and Registrar in real time via notifications table
      try {
        await supabase.from('notifications').insert({
          title: 'New Student Enrollment Application',
          message: `${formData.firstName.trim()} ${formData.lastName.trim()} submitted an enrollment application for ${formData.gradeLevel}${finalStrand ? ` (${finalStrand})` : ''} (${formData.studentType}) and is awaiting approval.`,
          type: 'enrollment',
          role: 'registrar',
          enrollment_id: data?.id || null,
        });
      } catch (notifErr) {
        console.warn('Notification insert note:', notifErr);
      }

      // Record in activity_logs for audit trail
      try {
        const studentFullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
        const studentEmail = formData.email.trim();
        const logRecord = {
          role: 'student',
          action: 'Enrollment Submitted',
          details: `${studentFullName} (${studentEmail}) submitted an online enrollment application for ${formData.gradeLevel}${finalStrand ? ` (${finalStrand})` : ''}.`,
          timestamp: new Date().toISOString(),
        };
        await supabase.from('activity_logs').insert([logRecord]);
        window.dispatchEvent(new CustomEvent('plsnhs-activity-logged', { detail: logRecord }));
      } catch {
        // ignore
      }

      // Prepend to local enrollments cache so Admin & Registrar see it immediately
      try {
        const rawCache = localStorage.getItem('plsnhs_enrollments_cache_v2');
        const parsedCache = rawCache ? JSON.parse(rawCache) : [];
        if (Array.isArray(parsedCache)) {
          localStorage.setItem(
            'plsnhs_enrollments_cache_v2',
            JSON.stringify([createdEnrollment, ...parsedCache])
          );
        }
        window.dispatchEvent(new Event('plsnhs-enrollment-updated'));
        window.dispatchEvent(new Event('plsnhs-broadcast-updated'));
      } catch {
        // ignore storage errors
      }

      setSubmittedData(createdEnrollment);
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    } catch (err: any) {
      console.error('Enrollment submission error:', err);
      setError(err?.message || 'Failed to submit enrollment. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isSeniorHigh = formData.gradeLevel === 'Grade 11' || formData.gradeLevel === 'Grade 12';

  if (submittedData) {
    return (
      <div className="enrollment-page-bg">
        <div className="enrollment-page-wrapper">
          <div className="enrollment-card text-center py-12 px-6">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-6 shadow-md">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <h2 className="text-3xl font-extrabold text-[#1a225a] mb-2 font-display">
              Enrollment Submitted Successfully!
            </h2>
            <p className="text-slate-600 max-w-lg mx-auto text-sm leading-relaxed mb-8">
              Thank you for enrolling at <span className="font-bold text-[#1a225a]">Placido L. Señor National High School</span>.
              Your application has been received and is currently marked as <strong className="text-amber-600">Pending Verification</strong> by the school registrar.
            </p>

            <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left mb-8 shadow-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-200 pb-2">
                Application Summary
              </div>
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant:</span>
                  <span className="font-semibold text-slate-900">
                    {submittedData.first_name} {submittedData.last_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Learner Reference No. (LRN):</span>
                  <span className="font-mono font-bold text-slate-900 tracking-wider">
                    {submittedData.lrn || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-900">{submittedData.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Grade Level:</span>
                  <span className="font-semibold text-[#1a225a]">{submittedData.grade_level}</span>
                </div>
                {submittedData.strand && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Strand:</span>
                    <span className="font-semibold text-amber-600">{submittedData.strand}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Type:</span>
                  <span className="font-medium text-slate-900">{submittedData.student_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">School Year:</span>
                  <span className="font-medium text-slate-900">{submittedData.school_year}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a225a] hover:bg-[#24307d] text-white px-6 py-3 text-sm font-bold shadow-md transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Return to Homepage
              </Link>
              <button
                onClick={() => {
                  setSubmittedData(null);
                  setFormData({
                    lastName: '',
                    firstName: '',
                    middleName: '',
                    lrn: '',
                    email: '',
                    dob: '',
                    age: '',
                    birthplace: '',
                    gender: '',
                    nationality: 'Filipino',
                    religion: '',
                    address: '',
                    motherName: '',
                    motherOccupation: '',
                    fatherName: '',
                    fatherOccupation: '',
                    guardianName: '',
                    guardianRelationship: '',
                    guardianContact: '',
                    guardianEmail: '',
                    guardianAddress: '',
                    studentType: 'New Student',
                    gradeLevel: 'Grade 11',
                    strand: 'STEM',
                    tvlSpecialization: 'TVL-Cookery',
                    schoolYear: '2026-2027',
                  });
                  setDocuments({
                    two_by_two_picture: null,
                    form_137: null,
                    report_card: null,
                    certificate_of_completion: null,
                    psa_birth_cert: null,
                    good_moral_cert: null,
                  });
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 hover:bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 transition-all cursor-pointer"
              >
                Submit Another Enrollment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // When student enrollment is turned OFF by admin, display institutional closed notice
  if (!isEnrollmentLoading && !isEnrollmentOpen) {
    return (
      <div className="enrollment-page-bg min-h-screen py-12 px-4 sm:px-6 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-center animate-fade-in">
          {/* DepEd & PLSNHS Header Banner */}
          <div className="bg-[#1B2A4A] p-6 text-white relative">
            <div className="flex items-center justify-center gap-3">
              <img
                src="/pictures/logo sa skwelahan.png"
                alt="PLSNHS Logo"
                className="h-14 w-14 rounded-full border-2 border-amber-400 bg-white p-0.5 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/pictures/logo sa skwelahan.jpg';
                }}
              />
              <div className="text-left">
                <span className="text-[10px] uppercase tracking-widest font-black text-amber-400 block">
                  Republic of the Philippines · Department of Education
                </span>
                <h1 className="text-lg font-black tracking-tight text-white leading-tight">
                  Placido L. Señor National High School
                </h1>
                <p className="text-[11px] text-slate-300">
                  School ID: 303035 · Division of City of Naga, Cebu
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Lock Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shadow-sm">
              <Lock className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Admissions Closed
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-display">
                Enrollment is Currently Closed
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                {enrollmentSettings.message ||
                  `Online student admissions and enrollment for S.Y. ${enrollmentSettings.schoolYear} are currently turned off by the School Administration.`}
              </p>
            </div>

            {/* School details & guidance card */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 text-left space-y-2.5">
              <div className="font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
                <span>Registrar &amp; Admissions Office</span>
                <span className="text-[11px] font-semibold text-slate-500">
                  S.Y. {enrollmentSettings.schoolYear}
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="h-3.5 w-3.5 text-[#1B2A4A] shrink-0" />
                <span>
                  Email:{' '}
                  <strong className="text-slate-800">303035@deped.gov.ph</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="h-3.5 w-3.5 text-[#1B2A4A] shrink-0" />
                <span>
                  Campus:{' '}
                  <strong className="text-slate-800">Langtad, City of Naga, Cebu</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <School className="h-3.5 w-3.5 text-[#1B2A4A] shrink-0" />
                <span>
                  DepEd School ID: <strong className="text-slate-800">303035</strong>
                </span>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 text-xs font-bold transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Return to Home
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B2A4A] hover:bg-[#142038] text-white px-5 py-3 text-xs font-bold shadow-md transition-all"
              >
                Student / Faculty Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="enrollment-page-bg">
      <div className="enrollment-page-wrapper">
        <div className="enrollment-card">
          {/* HEADER */}
          <div className="enrollment-header">
            <div className="enrollment-logo-section">
              <div className="enrollment-school-logo">
                <img
                  src="/pictures/logo sa skwelahan.png"
                  alt="School Logo"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/pictures/logo sa skwelahan.jpg';
                  }}
                />
              </div>
              <div className="enrollment-school-name">
                <h1>PLSNHS</h1>
                <p>Placido L. Señor National High School</p>
              </div>
            </div>
            <h2>
              <span className="highlight">Student</span> <span className="highlight2">Enrollment</span>
            </h2>
            <p className="enrollment-subtitle">Fill out the form to enroll for the upcoming school year</p>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="mb-6">
              <Alert type="error" message={error} onClose={() => setError('')} />
            </div>
          )}

          {/* MAIN ENROLLMENT FORM */}
          <form onSubmit={handleSubmit} noValidate>
            {/* ====== 1. GRADE LEVEL & STRAND ====== */}
            <div className="enrollment-section">
              {/* Professional Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0f172a] text-[#F5C518] shadow-xs">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 font-display tracking-tight">
                        Grade Level &amp; Academic Classification
                      </h3>
                      <span className="hidden sm:inline-flex items-center rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-extrabold text-blue-800 shadow-xs shadow-blue-500/10">
                        Step 1 of 4
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select your student classification, intended grade level, and senior high school academic track.
                    </p>
                  </div>
                </div>
              </div>

              {/* Select Student Type */}
              <div className="enrollment-group">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Student Classification <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Choose one that applies to you</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'New Student',
                      label: 'New Student',
                      desc: 'Incoming Grade 7 from Elementary',
                      icon: <UserPlus className="h-5 w-5" />,
                      iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
                    },
                    {
                      id: 'Old Student',
                      label: 'Old Student',
                      desc: 'Continuing PLSNHS Learner',
                      icon: <GraduationCap className="h-5 w-5" />,
                      iconBg: 'bg-sky-50 text-sky-600 border-sky-200',
                    },
                    {
                      id: 'Transferee',
                      label: 'Transferee',
                      desc: 'From another Secondary School',
                      icon: <School className="h-5 w-5" />,
                      iconBg: 'bg-purple-50 text-purple-600 border-purple-200',
                    },
                  ].map((type) => {
                    const isActive = formData.studentType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => handleChange('studentType', type.id)}
                        className={`group relative flex flex-col items-start p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          isActive
                            ? 'border-blue-600 bg-blue-50/60 shadow-md shadow-blue-500/20 ring-2 ring-blue-500 ring-offset-1'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-2.5">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                              isActive ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/30' : type.iconBg
                            }`}
                          >
                            {React.cloneElement(type.icon, {
                              className: `h-5 w-5 ${isActive ? 'text-white' : ''}`,
                            })}
                          </div>
                          {isActive ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-600/30">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <span className="h-5 w-5 rounded-full border border-slate-300 bg-white group-hover:border-slate-400" />
                          )}
                        </div>
                        <span className={`text-sm font-extrabold leading-tight ${isActive ? 'text-slate-950' : 'text-slate-800'}`}>
                          {type.label}
                        </span>
                        <span className="text-[11px] text-slate-500 mt-1 leading-snug">
                          {type.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Applying for Grade Level */}
              <div className="enrollment-group">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Applying for Grade Level <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Junior High (Grades 7–10) • Senior High (Grades 11–12)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {[
                    { grade: 'Grade 7', level: 'JHS', desc: 'Junior High' },
                    { grade: 'Grade 8', level: 'JHS', desc: 'Junior High' },
                    { grade: 'Grade 9', level: 'JHS', desc: 'Junior High' },
                    { grade: 'Grade 10', level: 'JHS', desc: 'Junior High' },
                    { grade: 'Grade 11', level: 'SHS', desc: 'Senior High' },
                    { grade: 'Grade 12', level: 'SHS', desc: 'Senior High' },
                  ].map((item) => {
                    const isActive = formData.gradeLevel === item.grade;
                    const isSHS = item.level === 'SHS';
                    return (
                      <button
                        key={item.grade}
                        type="button"
                        onClick={() => handleChange('gradeLevel', item.grade)}
                        className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                          isActive
                            ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-md shadow-blue-500/20 ring-2 ring-blue-500 ring-offset-1'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 text-slate-700 shadow-2xs'
                        }`}
                      >
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md mb-1 ${
                            isActive
                              ? 'bg-blue-200/80 text-blue-950 font-black'
                              : isSHS
                              ? 'bg-amber-100/80 text-amber-900 border border-amber-200/60'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {item.level}
                        </span>
                        <span className={`text-sm font-extrabold ${isActive ? 'text-slate-950' : 'text-slate-800'}`}>
                          {item.grade}
                        </span>
                        {isActive && (
                          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white shadow-xs shadow-blue-600/30">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Professional LRN Mode Notice Banner */}
                <div
                  className={`mt-3.5 rounded-2xl p-4 border transition-all ${
                    isLrnManual
                      ? 'bg-gradient-to-r from-amber-50/90 via-amber-50/50 to-white border-amber-200/90 text-amber-950'
                      : 'bg-gradient-to-r from-blue-50/90 via-sky-50/50 to-white border-blue-200/90 text-blue-950 shadow-xs shadow-blue-500/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border mt-0.5 ${
                          isLrnManual
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-blue-100 text-blue-700 border-blue-300 shadow-xs shadow-blue-500/10'
                        }`}
                      >
                        {isLrnManual ? <FileText className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-black font-display tracking-tight text-slate-900">
                            {isLrnManual
                              ? `Learner Reference Number (LRN): Manual Entry Required (${
                                  formData.studentType === 'Transferee' ? 'Transferee' : formData.gradeLevel
                                })`
                              : `Learner Reference Number (LRN): Institutional Auto-Match (${formData.gradeLevel})`}
                          </p>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {isLrnManual
                            ? 'For incoming Grade 7 students and transferees from other schools, the 12-digit DepEd LRN must be manually entered in the Personal Information section below.'
                            : 'For continuing Placido L. Señor NHS students (Grades 8–12), the 12-digit LRN is automatically verified and populated from official school records.'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full shrink-0 border ${
                        isLrnManual
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-blue-100 text-blue-900 border-blue-300'
                      }`}
                    >
                      {isLrnManual ? 'Manual LRN' : 'Auto-Populated'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Strand Selection (If Grade 11 or 12) */}
              {isSeniorHigh && (
                <div className="enrollment-group animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Senior High School Track &amp; Strand <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">Select your specialization track</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      {
                        code: 'TVL',
                        title: 'TVL Track',
                        subtitle: 'Technical-Vocational-Livelihood',
                        desc: 'Specialized skills in Cookery & ICT',
                        badge: 'Vocational',
                      },
                      {
                        code: 'HUMSS',
                        title: 'HUMSS',
                        subtitle: 'Humanities & Social Sciences',
                        desc: 'Law, public service, education & communication',
                        badge: 'Academic',
                      },
                      {
                        code: 'GAS',
                        title: 'GAS',
                        subtitle: 'General Academic Strand',
                        desc: 'Comprehensive multi-disciplinary preparation',
                        badge: 'Academic',
                      },
                      {
                        code: 'STEM',
                        title: 'STEM',
                        subtitle: 'Science, Tech, Engineering & Math',
                        desc: 'Medicine, engineering, computing & research',
                        badge: 'Academic',
                      },
                    ].map((st) => {
                      const isActive = formData.strand === st.code;
                      return (
                        <button
                          key={st.code}
                          type="button"
                          onClick={() => handleChange('strand', st.code)}
                          className={`group relative flex flex-col items-start p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                            isActive
                              ? 'border-blue-600 bg-blue-50/60 shadow-md shadow-blue-500/20 ring-2 ring-blue-500 ring-offset-1'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full mb-2">
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                isActive ? 'bg-blue-200/80 text-blue-950 font-black' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {st.badge}
                            </span>
                            {isActive ? (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-600/30">
                                <Check className="h-3 w-3" />
                              </span>
                            ) : (
                              <span className="h-4 w-4 rounded-full border border-slate-300 bg-white" />
                            )}
                          </div>
                          <span className={`text-base font-black ${isActive ? 'text-slate-950' : 'text-slate-900'}`}>
                            {st.title}
                          </span>
                          <span className="text-xs font-bold text-slate-700 mt-0.5 leading-snug">
                            {st.subtitle}
                          </span>
                          <span className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                            {st.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* TVL Specialization Sub-options */}
                  {formData.strand === 'TVL' && (
                    <div className="mt-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 animate-fade-in shadow-xs shadow-blue-500/10">
                      <div className="flex items-center gap-2 mb-2.5">
                        <Utensils className="h-4 w-4 text-[#1a225a]" />
                        <span className="text-xs font-black uppercase tracking-wider text-[#1a225a]">
                          Select TVL Specialization Track *
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => handleChange('tvlSpecialization', 'TVL-Cookery')}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                            formData.tvlSpecialization === 'TVL-Cookery'
                              ? 'border-blue-600 bg-white shadow-md shadow-blue-500/20 ring-2 ring-blue-500'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                            <Utensils className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-extrabold text-sm text-slate-900">Cookery</div>
                            <div className="text-xs text-slate-500">Food Preparation &amp; Culinary Arts</div>
                          </div>
                          {formData.tvlSpecialization === 'TVL-Cookery' && (
                            <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleChange('tvlSpecialization', 'TVL-ICT')}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                            formData.tvlSpecialization === 'TVL-ICT'
                              ? 'border-blue-600 bg-white shadow-md shadow-blue-500/20 ring-2 ring-blue-500'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                            <Laptop className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-extrabold text-sm text-slate-900">ICT</div>
                            <div className="text-xs text-slate-500">Computer &amp; Information Tech</div>
                          </div>
                          {formData.tvlSpecialization === 'TVL-ICT' && (
                            <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* School Year Banner */}
              <div className="enrollment-group mb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0f172a] text-[#F5C518]">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Official Academic Term
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Enrollment is officially registered for School Year 2026–2027
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-900 shadow-xs shadow-blue-500/10">
                      <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                      S.Y. 2026–2027
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ====== 2. PERSONAL INFORMATION ====== */}
            <div className="enrollment-section">
              <h3 className="enrollment-section-title">
                <User /> Personal Information
              </h3>

              {/* Full Name */}
              <div className="enrollment-group">
                <label>
                  Full Name <span>*</span>
                </label>
                <div className="enrollment-row-3">
                  <div className="enrollment-input-wrap">
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="enrollment-input-wrap">
                    <input
                      type="text"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      required
                    />
                  </div>
                  <div className="enrollment-input-wrap">
                    <input
                      type="text"
                      placeholder="Middle Name"
                      value={formData.middleName}
                      onChange={(e) => handleChange('middleName', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div className="enrollment-group">
                <label>
                  Email Address <span>*</span>
                </label>
                <div className="enrollment-input-wrap">
                  <input
                    type="email"
                    placeholder="e.g., student@gmail.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                  />
                </div>
                <small className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5">
                  <span className="text-[#ea4335] font-bold">G</span>
                  <span>
                    Only Gmail accounts (<strong>@gmail.com</strong>) are accepted.
                  </span>
                </small>
              </div>

              {/* Learner Reference Number (LRN) */}
              <div className="enrollment-group">
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                  <label className="mb-0">
                    Learner Reference Number (LRN) <span>*</span>
                  </label>
                  {isLrnManual ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                      ✍️ Manual Entry ({formData.gradeLevel === 'Grade 7' ? 'Grade 7 Entrant' : 'Transferee'})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      Auto-Populated ({formData.gradeLevel})
                    </span>
                  )}
                </div>

                <div className="enrollment-input-wrap relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={
                      isLrnManual
                        ? 'Enter 12-digit DepEd LRN (e.g., 119518123456)'
                        : 'Generating institutional LRN...'
                    }
                    value={formData.lrn}
                    readOnly={!isLrnManual}
                    maxLength={12}
                    onChange={(e) => {
                      if (isLrnManual) {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                        handleChange('lrn', digits);
                      }
                    }}
                    required
                    className={`font-mono tracking-wider font-semibold ${
                      !isLrnManual
                        ? 'bg-slate-100/90 text-slate-800 cursor-not-allowed select-all'
                        : 'bg-white text-slate-900'
                    }`}
                  />
                  {!isLrnManual && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-bold text-emerald-700 pointer-events-none">
                      <Lock className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Institutional LRN</span>
                    </div>
                  )}
                </div>

                <small className="text-xs text-slate-500 mt-1.5 flex items-start gap-1.5">
                  {isLrnManual ? (
                    <>
                      <span className="font-bold text-amber-700 shrink-0">DepEd Requirement:</span>
                      <span>
                        For <strong>{formData.gradeLevel === 'Grade 7' ? 'Grade 7 students' : 'Transferees'}</strong>, the 12-digit LRN must be entered manually from your Form 138 / SF9 Report Card or Elementary Certificate.
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-emerald-700 shrink-0">DepEd Naga:</span>
                      <span>
                        Institutional LRN is <strong>automatically populated</strong> for continuing students in <strong>Grades 8 through 12</strong> (PLSNHS Division ID: 119518).
                      </span>
                    </>
                  )}
                </small>
              </div>

              {/* Date of Birth & Age */}
              <div className="enrollment-row-2">
                <div className="enrollment-group">
                  <label>
                    Date of Birth <span>*</span>
                  </label>
                  <div className="enrollment-input-wrap">
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={handleDobChange}
                      required
                    />
                  </div>
                </div>
                <div className="enrollment-group">
                  <label>
                    Age <span>*</span>
                  </label>
                  <div className="enrollment-input-wrap">
                    <input
                      type="text"
                      placeholder="Auto-calculated"
                      value={formData.age}
                      readOnly
                      className="bg-slate-50 text-slate-600 cursor-default"
                      title="Automatically calculated from Date of Birth"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Place of Birth & Gender */}
              <div className="enrollment-row-2">
                <div className="enrollment-group">
                  <label>
                    Place of Birth <span>*</span>
                  </label>
                  <div className="enrollment-input-wrap">
                    <input
                      type="text"
                      placeholder="City/Municipality, Province"
                      value={formData.birthplace}
                      onChange={(e) => handleChange('birthplace', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="enrollment-group">
                  <label>
                    Gender <span>*</span>
                  </label>
                  <div className="enrollment-input-wrap">
                    <select
                      value={formData.gender}
                      onChange={(e) => handleChange('gender', e.target.value)}
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Nationality & Religion */}
              <div className="enrollment-row-2">
                <div className="enrollment-group">
                  <label>
                    Nationality <span>*</span>
                  </label>
                  <div className="enrollment-input-wrap">
                    <input
                      type="text"
                      placeholder="e.g., Filipino"
                      value={formData.nationality}
                      onChange={(e) => handleChange('nationality', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="enrollment-group">
                  <label>Religion</label>
                  <div className="enrollment-input-wrap">
                    <input
                      type="text"
                      placeholder="e.g., Roman Catholic"
                      value={formData.religion}
                      onChange={(e) => handleChange('religion', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Home Address */}
              <div className="enrollment-group mb-0">
                <label>
                  Home Address <span>*</span>
                </label>
                <div className="enrollment-input-wrap">
                  <textarea
                    rows={2}
                    placeholder="Street, Barangay, City/Municipality, Province"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* ====== 3. PARENT/GUARDIAN INFORMATION ====== */}
            <div className="enrollment-section">
              <h3 className="enrollment-section-title">
                <Users /> Parent/Guardian Information
              </h3>

              {/* Mother's Info */}
              <div className="enrollment-row-2">
                <div className="enrollment-group">
                  <label>
                    Mother's Name <span>*</span>
                  </label>
                  <div className="enrollment-input-wrap">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={formData.motherName}
                      onChange={(e) => handleChange('motherName', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="enrollment-group">
                  <label>Mother's Occupation</label>
                  <div className="enrollment-input-wrap">
                    <input
                      type="text"
                      placeholder="Occupation"
                      value={formData.motherOccupation}
                      onChange={(e) => handleChange('motherOccupation', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Father's Info */}
              <div className="enrollment-row-2">
                <div className="enrollment-group">
                  <label>
                    Father's Name <span>*</span>
                  </label>
                  <div className="enrollment-input-wrap">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={formData.fatherName}
                      onChange={(e) => handleChange('fatherName', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="enrollment-group">
                  <label>Father's Occupation</label>
                  <div className="enrollment-input-wrap">
                    <input
                      type="text"
                      placeholder="Occupation"
                      value={formData.fatherOccupation}
                      onChange={(e) => handleChange('fatherOccupation', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Guardian's Name & Relationship */}
              <div className="enrollment-row-2">
                <div className="enrollment-group">
                  <label>
                    Guardian's Name <span>*</span>
                  </label>
                  <div className="enrollment-input-wrap">
                    <input
                      type="text"
                      placeholder="Full name of guardian"
                      value={formData.guardianName}
                      onChange={(e) => handleChange('guardianName', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="enrollment-group">
                  <label>
                    Relationship <span>*</span>
                  </label>
                  <div className="enrollment-input-wrap">
                    <select
                      value={formData.guardianRelationship}
                      onChange={(e) => handleChange('guardianRelationship', e.target.value)}
                      required
                    >
                      <option value="">Select Relationship</option>
                      <option value="Parent">Parent</option>
                      <option value="Mother">Mother</option>
                      <option value="Father">Father</option>
                      <option value="Grandparent">Grandparent</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Aunt / Uncle">Aunt / Uncle</option>
                      <option value="Legal Guardian">Legal Guardian</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Guardian's Contact & Email */}
              <div className="enrollment-row-2">
                <div className="enrollment-group">
                  <label>
                    Guardian's Contact <span>*</span>
                  </label>
                  <div className="enrollment-input-wrap">
                    <input
                      type="tel"
                      placeholder="09XX XXX XXXX"
                      value={formData.guardianContact}
                      onChange={(e) => handleChange('guardianContact', e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="enrollment-group">
                  <label>Guardian's Email</label>
                  <div className="enrollment-input-wrap">
                    <input
                      type="email"
                      placeholder="guardian@gmail.com"
                      value={formData.guardianEmail}
                      onChange={(e) => handleChange('guardianEmail', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Guardian's Address */}
              <div className="enrollment-group mb-0">
                <label>
                  Guardian's Address <span>*</span>
                </label>
                <div className="enrollment-input-wrap">
                  <textarea
                    rows={2}
                    placeholder="Street, Barangay, City/Municipality, Province"
                    value={formData.guardianAddress}
                    onChange={(e) => handleChange('guardianAddress', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* ====== 4. REQUIRED DOCUMENTS ====== */}
            <div className="requirements-container">
              <div className="requirements-title">
                <Paperclip className="h-4 w-4 text-[#1a225a]" />
                <span>Required Documents</span>
              </div>

              {formData.studentType === 'Transferee' && (
                <div className="transferee-info-banner">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <strong>Transferee Policy Notice:</strong> If a student is to be transferred, they must be removed from their previous roster and are treated as a new student. Complete credentials (Form 137, Report Card, Completion, PSA, Good Moral) are required for verification and section placement.
                  </div>
                </div>
              )}

              {/* Requirement Items */}
              <div className="space-y-3.5">
                {activeRequirements.map((req) => {
                  const file = documents[req.key];
                  return (
                    <div key={req.key} className="requirement-item">
                      <div className="requirement-header">
                        <div className="requirement-title-wrap">
                          <FileText className="h-4 w-4 text-slate-700" />
                          <span>{req.title}</span>
                        </div>
                        <span className="req-badge-required">REQUIRED</span>
                      </div>

                      {file ? (
                        <div className="file-uploaded-preview">
                          <div className="file-uploaded-info">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                            <div className="min-w-0">
                              <div className="file-uploaded-name" title={file.name}>
                                {file.name}
                              </div>
                              <div className="file-uploaded-size">{formatFileSize(file.size)}</div>
                            </div>
                          </div>
                          <div className="file-uploaded-actions">
                            <label className="file-change-btn">
                              Change
                              <input
                                type="file"
                                accept={req.accept}
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    handleFileChange(req.key, e.target.files[0]);
                                  }
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => handleFileChange(req.key, null)}
                              className="file-remove-btn"
                            >
                              <Trash2 className="h-3.5 w-3.5 inline mr-1" />
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="file-upload-box block">
                          <input
                            type="file"
                            accept={req.accept}
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileChange(req.key, e.target.files[0]);
                              }
                            }}
                          />
                          <div className="file-upload-box-icon">
                            <CloudUpload className="h-5 w-5 text-slate-400" />
                          </div>
                          <p className="file-upload-label">Click to upload</p>
                          <p className="file-upload-hint">{req.hint}</p>
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ====== SUBMIT BUTTON ====== */}
            <div className="enrollment-footer-bar">
              <button
                type="submit"
                disabled={submitting}
                className="btn-enroll-submit"
              >
                <Send className="h-4 w-4" />
                <span>{submitting ? (uploadStatus || 'Submitting Application...') : 'Submit Enrollment'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* BACK TO HOME */}
        <div className="enrollment-back-link">
          <Link to="/">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};
