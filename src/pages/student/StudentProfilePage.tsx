import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Camera,
  Save,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  BadgeCheck,
  CheckCircle2,
  RefreshCw,
  QrCode,
  Shield,
  MapPin,
  Calendar,
  Copy,
  Check,
  FileText,
  ExternalLink,
  ArrowRight,
  BookOpen,
  School,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/common/Alert';
import { supabase } from '../../lib/supabase';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import { uploadAndSaveAvatar, fetchUserAvatarFromDatabase } from '../../lib/avatarService';

export const StudentProfilePage: React.FC = () => {
  const { user, updateCurrentUser } = useAuth();

  const resolveInitialAvatar = () => {
    if (user?.avatar_url) return user.avatar_url;
    if (typeof window !== 'undefined' && user?.email) {
      const cleanEmail = user.email.trim().toLowerCase();
      return localStorage.getItem(`plsnhs_avatar_${cleanEmail}`) || '';
    }
    return '';
  };

  const [studentRecord, setStudentRecord] = useState<any>(null);
  const [firstName, setFirstName] = useState(
    user?.first_name || user?.full_name?.split(' ')[0] || ''
  );
  const [lastName, setLastName] = useState(
    user?.last_name || user?.full_name?.split(' ').slice(1).join(' ') || ''
  );
  const [phone, setPhone] = useState(user?.phone || '');
  const [parentName, setParentName] = useState('');
  const [parentContact, setParentContact] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string>(resolveInitialAvatar);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedLrn, setCopiedLrn] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize state whenever user object is hydrated or updated
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || user.full_name?.split(' ')[0] || '');
      setLastName(user.last_name || user.full_name?.split(' ').slice(1).join(' ') || '');
      setPhone(user.phone || '');
      const cleanEmail = (user.email || '').trim().toLowerCase();
      const local = cleanEmail ? localStorage.getItem(`plsnhs_avatar_${cleanEmail}`) : '';
      setAvatarUrl(user.avatar_url || local || '');
    }
  }, [user]);

  // Load rich student demographic record from Supabase
  useEffect(() => {
    async function loadStudentDemographics() {
      if (!user) return;
      try {
        let student: any = null;
        if (user.student_lrn) {
          const { data } = await supabase.from('students').select('*').eq('lrn', user.student_lrn).maybeSingle();
          if (data) student = data;
        }
        if (!student && user.student_id) {
          const { data } = await supabase.from('students').select('*').eq('id', user.student_id).maybeSingle();
          if (data) student = data;
        }
        if (!student && user.email) {
          const cleanEmail = user.email.trim().toLowerCase();
          const { data } = await supabase.from('students').select('*').ilike('email', cleanEmail).maybeSingle();
          if (data) student = data;
        }
        if (!student && user.id) {
          const { data } = await supabase.from('students').select('*').eq('id', user.id).maybeSingle();
          if (data) student = data;
        }

        if (student) {
          setStudentRecord(student);
          if (student.first_name && !firstName) setFirstName(student.first_name);
          if (student.last_name && !lastName) setLastName(student.last_name);
          if (student.contact_number && !phone) setPhone(student.contact_number);
          setParentName(student.parent_name || student.guardian_name || '');
          setParentContact(student.parent_contact || student.guardian_contact || '');
          setAddress(student.address || '');
          setGender(student.gender || '');
          setBirthdate(student.birthdate || student.date_of_birth || '');
        }
      } catch (err) {
        console.warn('Error fetching student demographics in profile:', err);
      }
    }

    loadStudentDemographics();
  }, [user]);

  // Load avatar from Supabase database if not in memory
  useEffect(() => {
    if (user?.email || user?.id || user?.student_lrn) {
      fetchUserAvatarFromDatabase({ id: user.id, email: user.email, role: 'student' }).then((photo) => {
        if (photo) {
          setAvatarUrl(photo);
          updateCurrentUser({ avatar_url: photo });
        }
      });
    }
  }, [user?.email, user?.id, user?.student_lrn]);

  const fullNameDisplay =
    `${firstName} ${lastName}`.trim() ||
    user?.full_name ||
    user?.email?.split('@')[0] ||
    'Student Learner';

  const studentLrn = studentRecord?.lrn || user?.student_lrn || '11951680002';
  const studentGrade = studentRecord?.grade_level || user?.student_grade || 'Grade 11';
  const studentStrand = studentRecord?.strand || user?.student_strand || (studentGrade.includes('11') || studentGrade.includes('12') ? 'TVL-ICT' : 'Junior High School');
  const studentSection = studentRecord?.section || user?.student_section || 'Section Almario';
  const adviserName = studentRecord?.adviser_name || 'SHS Faculty Adviser';
  const schoolYear = studentRecord?.school_year || user?.school_year || '2026–2027';

  const getInitials = () => {
    const f = firstName.trim()[0] || '';
    const l = lastName.trim()[0] || '';
    if (f || l) return `${f}${l}`.toUpperCase();
    if (user?.email) return user.email.substring(0, 2).toUpperCase();
    return 'ST';
  };

  const copyLrn = () => {
    if (!studentLrn) return;
    navigator.clipboard.writeText(studentLrn);
    setCopiedLrn(true);
    setTimeout(() => setCopiedLrn(false), 2000);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice({ type: 'error', message: 'Please select a valid image file (JPG, PNG, WEBP).' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        setAvatarUrl(compressed);

        // Upload and save directly to Supabase cloud storage & database
        if (user) {
          uploadAndSaveAvatar({ id: user.id, email: user.email, role: 'student' }, compressed).then((permanentUrl) => {
            if (permanentUrl) {
              setAvatarUrl(permanentUrl);
              updateCurrentUser({ avatar_url: permanentUrl });
            }
          });
        }

        if (user?.email) {
          const cleanEmail = user.email.trim().toLowerCase();
          localStorage.setItem(`plsnhs_avatar_${cleanEmail}`, compressed);
          localStorage.setItem(`plsnhs_avatar_${user.email}`, compressed);
        }
        updateCurrentUser({ avatar_url: compressed });
        window.dispatchEvent(new Event('plsnhs-avatar-updated'));
        setNotice({ type: 'success', message: 'Student 2×2 profile photo updated and synchronized.' });
      };
      img.src = String(ev.target?.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.trim() && newPassword.trim() !== confirmPassword.trim()) {
      setNotice({
        type: 'error',
        message: 'New password and confirmation password do not match.',
      });
      return;
    }

    setSaving(true);
    try {
      const cleanFirst = firstName.trim();
      const cleanLast = lastName.trim();
      const updates: Record<string, any> = {
        first_name: cleanFirst,
        last_name: cleanLast,
      };

      if (newPassword.trim()) {
        updates.password = newPassword.trim();
      }

      if (user?.id) {
        try {
          const withAvatar = avatarUrl ? { ...updates, avatar_url: avatarUrl } : updates;
          const { error } = await supabase.from('users').update(withAvatar).eq('id', user.id);
          if (error) {
            await supabase.from('users').update(updates).eq('id', user.id);
          }
        } catch {
          await supabase.from('users').update(updates).eq('id', user.id);
        }
      }

      // Sync changes to students and enrollments table in Supabase
      const cleanEmail = (user?.email || '').trim().toLowerCase();
      const studentUpdates: Record<string, any> = {
        first_name: cleanFirst,
        last_name: cleanLast,
        contact_number: phone.trim(),
        parent_name: parentName.trim(),
        parent_contact: parentContact.trim(),
        address: address.trim(),
        gender: gender.trim(),
        birthdate: birthdate.trim(),
        avatar_url: avatarUrl,
        two_by_two_picture_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      if (cleanEmail) {
        await supabase.from('students').update(studentUpdates).ilike('email', cleanEmail);
        await supabase.from('enrollments').update({
          two_by_two_picture_url: avatarUrl,
          guardian_name: parentName.trim(),
          guardian_contact: parentContact.trim(),
          updated_at: new Date().toISOString(),
        }).ilike('email', cleanEmail);
      }
      if (studentLrn) {
        await supabase.from('students').update(studentUpdates).eq('lrn', studentLrn);
      }

      updateCurrentUser({
        first_name: cleanFirst,
        last_name: cleanLast,
        full_name: `${cleanFirst} ${cleanLast}`.trim(),
        phone: phone.trim(),
        avatar_url: avatarUrl,
      });

      if (avatarUrl) {
        if (user) {
          uploadAndSaveAvatar({ id: user.id, email: user.email, role: 'student' }, avatarUrl).catch(() => {});
        }
        if (user?.email) {
          const cleanEmail = user.email.trim().toLowerCase();
          localStorage.setItem(`plsnhs_avatar_${cleanEmail}`, avatarUrl);
          localStorage.setItem(`plsnhs_avatar_${user.email}`, avatarUrl);
        }
      }
      window.dispatchEvent(new Event('plsnhs-avatar-updated'));

      setNotice({ type: 'success', message: 'Learner profile and contact credentials successfully saved.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in w-full pb-16">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {notice && (
        <Alert
          type={notice.type}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}

      {/* Screen Control Header */}
      <div className="border-b border-slate-200/90 pb-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-display tracking-tight leading-tight">
              Learner Profile &amp; Official Credentials
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Manage personal demographic records, parent/guardian emergency contacts, and portal account security.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            <Link
              to="/student"
              className="inline-flex h-9 sm:h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 sm:px-4 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all cursor-pointer active:scale-98"
              title="View student digital ID QR pass"
            >
              <QrCode className="h-4 w-4 text-amber-600" />
              <span>Campus QR Pass</span>
            </Link>

            <Link
              to="/student/enrollment"
              className="inline-flex h-9 sm:h-10 items-center justify-center gap-2 rounded-xl bg-[#152e69] hover:bg-[#0f1f4b] px-3.5 sm:px-4 text-xs font-bold text-white shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-98"
              title="View official registration record"
            >
              <GraduationCap className="h-4 w-4 text-[#F5C518]" />
              <span>Enrollment Record</span>
            </Link>

            <PageHeaderNotificationSlot />
          </div>
        </div>
      </div>

      {/* Top Student Executive Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d1b38] via-[#152e69] to-[#1e3c79] text-white shadow-md border border-slate-700/30 w-full p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 -bottom-16 h-48 w-48 rounded-full bg-blue-400/10 blur-2xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6 min-w-0">
            {/* Avatar Frame with Gold Accent and Upload Trigger */}
            <div className="relative group shrink-0 self-start sm:self-auto">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullNameDisplay}
                  className="h-24 w-24 rounded-2xl object-cover border-2 border-[#F5C518] shadow-lg bg-slate-900"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-[#0d1b38] font-black text-3xl shadow-lg border-2 border-white/30 select-none">
                  {getInitials()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#152e69] shadow-md border border-slate-200 hover:bg-[#F5C518] hover:text-[#0d1b38] transition-all cursor-pointer active:scale-95"
                title="Change 2x2 ID Photo"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            {/* Student Info Details */}
            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
                  {fullNameDisplay}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 border border-emerald-400/40 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-200">
                  <BadgeCheck className="h-4 w-4" />
                  {user?.student_status || 'Officially Enrolled'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-amber-300 font-bold">
                <span>{studentGrade}</span>
                <span>•</span>
                <span>{studentStrand}</span>
                <span>•</span>
                <span className="text-white font-medium">{studentSection}</span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs text-slate-300/90 font-mono">
                <div className="inline-flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                  <span className="text-slate-300 font-sans text-[11px]">DepEd LRN:</span>
                  <span className="font-bold text-white tracking-wider">{studentLrn}</span>
                  <button
                    type="button"
                    onClick={copyLrn}
                    className="ml-1 hover:text-[#F5C518] transition-colors cursor-pointer"
                    title="Copy LRN"
                  >
                    {copiedLrn ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <span>•</span>
                <span className="font-sans">S.Y. {schoolYear}</span>
                <span>•</span>
                <span className="font-sans text-slate-300">Placido L. Señor NHS · School ID: 303035</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges on Banner Right */}
          <div className="flex sm:flex-row lg:flex-col gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-white/15 lg:pl-6">
            <div className="rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 p-3 sm:px-4 text-left">
              <span className="text-[10px] uppercase font-bold text-slate-300 block tracking-wider">DepEd LIS Status</span>
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-300 mt-0.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Confirmed &amp; Synchronized</span>
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 p-3 sm:px-4 text-left">
              <span className="text-[10px] uppercase font-bold text-slate-300 block tracking-wider">Academic Load</span>
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-300 mt-0.5">
                <BookOpen className="h-3.5 w-3.5" />
                <span>9 Learning Areas (33.0 Units)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Form & Records Layout: Full Width Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        {/* Left Column (4 cols): Scholastic Registration Summary */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#152e69]">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 font-display">
                  Scholastic Registration
                </h3>
                <p className="text-[11px] text-slate-500">
                  Official DepEd Registrar Assignment
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Learner Reference Number (LRN)
                </span>
                <span className="font-extrabold font-mono text-slate-900 text-sm mt-0.5 block">
                  {studentLrn}
                </span>
              </div>

              <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Grade Level &amp; Track Strand
                </span>
                <span className="font-extrabold text-slate-800 text-sm mt-0.5 block">
                  {studentGrade} · {studentStrand}
                </span>
              </div>

              <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Assigned Section &amp; Adviser
                </span>
                <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                  {studentSection}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Adviser: {adviserName}
                </span>
              </div>

              <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Curriculum Program
                </span>
                <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                  K to 12 Basic Education Program
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  DepEd Division of City of Naga, Cebu
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50/80 p-4 border border-emerald-200/80 flex items-start gap-3 shadow-2xs">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950 leading-relaxed">
                <strong className="font-bold block text-emerald-900">Active Campus Digital ID</strong>
                Your QR security pass is validated for campus turnstile scanning, library access, and classroom attendance.
              </div>
            </div>
          </div>

          {/* Quick Academic Document Links */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Official Student Records
            </h4>
            <div className="space-y-2 text-xs">
              <Link
                to="/student/enrollment"
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-200 text-slate-800 font-bold transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Certificate of Enrollment</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/student/grades"
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-200 text-slate-800 font-bold transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  <span>Learner Progress Report (SF9)</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/student/attendance"
                className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-200 text-slate-800 font-bold transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <span>Official Attendance Log</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column (8 cols): Personal, Contact, Guardian & Password Form */}
        <div className="lg:col-span-8">
          <form
            onSubmit={handleSave}
            className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-7"
          >
            {/* Section 1: Learner Personal Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 font-display">
                    Learner Personal &amp; Contact Details
                  </h3>
                  <p className="text-xs text-slate-500">
                    Keep your demographic details and phone number current for school advisories.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    First Name
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#152e69] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Last Name
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#152e69] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Registered Student Email (Username)
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      disabled
                      value={user?.email || studentRecord?.email || ''}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <span className="text-[10.5px] text-slate-400 mt-1 block">
                    Institutional login username. Assigned by School Administration.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Learner Contact Number
                  </label>
                  <div className="relative">
                    <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 0912-345-6789"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#152e69] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <span className="text-[10.5px] text-slate-400 mt-1 block">
                    Used for SMS emergency notices and portal alerts.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#152e69] focus:bg-white focus:outline-hidden"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#152e69] focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Permanent Home Address
                  </label>
                  <div className="relative">
                    <MapPin className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Barangay, Municipality / City, Province"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#152e69] focus:bg-white focus:outline-hidden resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Parent / Guardian Emergency Contact */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-3 pb-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 font-display">
                    Parent / Guardian Emergency Contact
                  </h3>
                  <p className="text-xs text-slate-500">
                    Primary authorized guardian contacted by the school clinic and guidance office.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Parent / Guardian Full Name
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="e.g. Marites Pengoc"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#152e69] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Parent / Guardian Contact Number
                  </label>
                  <div className="relative">
                    <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={parentContact}
                      onChange={(e) => setParentContact(e.target.value)}
                      placeholder="e.g. 0917-000-1122"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#152e69] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Password Security */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-3 pb-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 font-display">
                    Account Security &amp; Password
                  </h3>
                  <p className="text-xs text-slate-500">
                    Leave blank if you wish to keep your current portal login password.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#152e69] focus:bg-white focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#152e69] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Action Bar */}
            <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-400 font-medium">
                Changes will sync across student records and cloud database.
              </span>

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#152e69] hover:bg-[#0f1f4b] px-7 py-3 text-xs font-extrabold text-white shadow-xs hover:shadow-md disabled:opacity-60 transition-all cursor-pointer active:scale-98"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-[#F5C518]" />
                ) : (
                  <Save className="h-4 w-4 text-[#F5C518]" />
                )}
                <span>{saving ? 'Saving Records...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
