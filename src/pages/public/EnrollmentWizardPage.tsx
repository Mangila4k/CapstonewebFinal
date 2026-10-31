import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  User,
  Users,
  BookOpen,
  Send,
  CheckCircle2,
  ArrowLeft,
  RotateCcw,
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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';
import { Alert } from '../../components/common/Alert';
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
    applicableTypes: ['New Student', 'Transferee', 'Old Student', 'Repeater'],
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

  // Form State
  const [formData, setFormData] = useState({
    // Personal Information
    lastName: '',
    firstName: '',
    middleName: '',
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
      const payload = {
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

      const { data, error: insertError } = await supabase
        .from('enrollments')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      const createdEnrollment = data || {
        ...payload,
        id: `local-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

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
            {/* ====== 1. PERSONAL INFORMATION ====== */}
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

            {/* ====== 2. PARENT/GUARDIAN INFORMATION ====== */}
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

            {/* ====== 3. GRADE LEVEL & STRAND ====== */}
            <div className="enrollment-section">
              <h3 className="enrollment-section-title">
                <BookOpen /> Grade Level & Strand
              </h3>

              {/* Select Student Type */}
              <div className="enrollment-group">
                <label>
                  Select Student Type <span>*</span>
                </label>
                <div className="student-type-grid">
                  {[
                    { id: 'New Student', label: 'New Student', icon: <UserPlus className="h-5 w-5 text-blue-600" /> },
                    { id: 'Old Student', label: 'Old Student', icon: <GraduationCap className="h-5 w-5 text-amber-600" /> },
                    { id: 'Repeater', label: 'Repeater', icon: <RotateCcw className="h-5 w-5 text-slate-700" /> },
                    { id: 'Transferee', label: 'Transferee', icon: <School className="h-5 w-5 text-emerald-600" /> },
                  ].map((type) => (
                    <div
                      key={type.id}
                      onClick={() => handleChange('studentType', type.id)}
                      className={`student-type-tile ${formData.studentType === type.id ? 'active' : ''}`}
                    >
                      {type.icon}
                      <span className="tile-title">{type.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Applying for Grade Level */}
              <div className="enrollment-group">
                <label>
                  Applying for Grade Level <span>*</span>
                </label>
                <div className="grade-options-grid">
                  {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((grade) => (
                    <div
                      key={grade}
                      onClick={() => handleChange('gradeLevel', grade)}
                      className={`grade-option-tile ${formData.gradeLevel === grade ? 'active' : ''}`}
                    >
                      {grade}
                    </div>
                  ))}
                </div>
              </div>

              {/* Strand Selection (If Grade 11 or 12) */}
              {isSeniorHigh && (
                <div className="enrollment-group animate-fade-in">
                  <label>
                    Select Strand <span>*</span>
                  </label>
                  <div className="strand-options-grid">
                    {[
                      { code: 'TVL', title: 'TVL', sub: 'Technical-Vocational-Livelihood Track' },
                      { code: 'HUMSS', title: 'HUMSS', sub: 'Humanities and Social Sciences' },
                      { code: 'GAS', title: 'GAS', sub: 'General Academic Strand' },
                      { code: 'STEM', title: 'STEM', sub: 'Science, Technology, Engineering, Math' },
                    ].map((st) => (
                      <div
                        key={st.code}
                        onClick={() => handleChange('strand', st.code)}
                        className={`strand-option-card ${formData.strand === st.code ? 'active' : ''}`}
                      >
                        <span className="strand-title">{st.title}</span>
                        <span className="strand-sub">{st.sub}</span>
                      </div>
                    ))}
                  </div>

                  {/* TVL Specialization Sub-options */}
                  {formData.strand === 'TVL' && (
                    <div className="tvl-spec-box animate-fade-in">
                      <div className="tvl-spec-box-title flex items-center gap-2">
                        <Utensils className="h-4 w-4 text-[#1a225a]" />
                        <span>Select TVL Specialization *</span>
                      </div>
                      <div className="tvl-spec-grid">
                        <div
                          onClick={() => handleChange('tvlSpecialization', 'TVL-Cookery')}
                          className={`tvl-spec-tile flex items-center gap-2.5 ${
                            formData.tvlSpecialization === 'TVL-Cookery' ? 'active' : ''
                          }`}
                        >
                          <Utensils className="h-4 w-4 text-amber-600" />
                          <div>
                            <div className="font-bold text-sm text-[#1a225a]">Cookery</div>
                            <div className="text-xs text-slate-500">Food Prep & Culinary Arts</div>
                          </div>
                        </div>

                        <div
                          onClick={() => handleChange('tvlSpecialization', 'TVL-ICT')}
                          className={`tvl-spec-tile flex items-center gap-2.5 ${
                            formData.tvlSpecialization === 'TVL-ICT' ? 'active' : ''
                          }`}
                        >
                          <Laptop className="h-4 w-4 text-blue-600" />
                          <div>
                            <div className="font-bold text-sm text-[#1a225a]">ICT</div>
                            <div className="text-xs text-slate-500">Computer & Digital Tech</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* School Year */}
              <div className="enrollment-group mb-0">
                <label>
                  School Year <span>*</span>
                </label>
                <div className="enrollment-input-wrap">
                  <input
                    type="text"
                    value={formData.schoolYear}
                    onChange={(e) => handleChange('schoolYear', e.target.value)}
                    placeholder="e.g., 2026-2027"
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
