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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/common/Alert';
import { supabase } from '../../lib/supabase';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import { uploadAndSaveAvatar, fetchUserAvatarFromDatabase } from '../../lib/avatarService';

export const StudentProfilePage: React.FC = () => {
  const { user, updateCurrentUser } = useAuth();

  const [firstName, setFirstName] = useState(
    user?.first_name || user?.full_name?.split(' ')[0] || 'Student'
  );
  const [lastName, setLastName] = useState(
    user?.last_name || user?.full_name?.split(' ').slice(1).join(' ') || 'Learner'
  );
  const [phone, setPhone] = useState(user?.phone || '0912-345-6789');
  const [avatarUrl, setAvatarUrl] = useState<string>(
    user?.avatar_url || localStorage.getItem(`plsnhs_avatar_${user?.email || 'student'}`) || ''
  );

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const fullNameDisplay = `${firstName} ${lastName}`.trim() || user?.full_name || 'Student Name';
  const studentLrn = user?.student_lrn || '109823456789';
  const studentGrade = user?.student_grade || 'Grade 7';
  const gradeNumMatch = String(studentGrade).match(/\d+/);
  const gradeNum = gradeNumMatch ? parseInt(gradeNumMatch[0], 10) : 7;
  const isSeniorHigh = gradeNum >= 11 || String(studentGrade).toLowerCase().includes('senior');
  const studentStrand = isSeniorHigh ? user?.student_strand || 'STEM' : 'Junior High';
  const studentSection =
    user?.student_section ||
    (isSeniorHigh ? `Grade ${gradeNum} - Section A` : `Grade ${gradeNum} - Rizal`);
  const schoolYear = user?.school_year || '2026-2027';

  const getInitials = () => {
    const f = firstName.trim()[0] || '';
    const l = lastName.trim()[0] || '';
    return (`${f}${l}` || 'ST').toUpperCase();
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
        localStorage.setItem('plsnhs_avatar_default', compressed);
        updateCurrentUser({ avatar_url: compressed });
        window.dispatchEvent(new Event('plsnhs-avatar-updated'));
        setNotice({ type: 'success', message: 'Student 2x2 profile photo saved to database.' });
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
        await supabase.from('users').update(updates).eq('id', user.id);
      }

      // Sync changes to students table in Supabase
      if (user?.student_id || user?.student_lrn || user?.email) {
        const studentUpdates: Record<string, any> = {
          first_name: cleanFirst,
          last_name: cleanLast,
          contact_number: phone.trim(),
          avatar_url: avatarUrl,
          two_by_two_picture_url: avatarUrl,
          updated_at: new Date().toISOString(),
        };
        let sQ = supabase.from('students').update(studentUpdates);
        if (user?.student_id) sQ = sQ.eq('id', user.student_id);
        else if (user?.student_lrn) sQ = sQ.eq('lrn', user.student_lrn);
        else if (user?.email) sQ = sQ.eq('email', user.email);
        await sQ;
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
        localStorage.setItem('plsnhs_avatar_default', avatarUrl);
      }
      window.dispatchEvent(new Event('plsnhs-avatar-updated'));

      setNotice({ type: 'success', message: 'Student profile and credentials saved.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            Learner Profile &amp; Account Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review your official school records, emergency contacts, and security credentials.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <PageHeaderNotificationSlot />
        </div>
      </div>

      {/* Top Student Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0f1c3f] via-[#1B2A4A] to-[#243B67] text-white shadow-md border border-slate-800/20">
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-amber-400/10 blur-2xl" />

        <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar Box with Corner Camera Button */}
            <div className="relative group shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullNameDisplay}
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-amber-400/80 shadow-lg bg-slate-900"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-[#0f1c3f] font-black text-3xl shadow-lg border-2 border-white/30 select-none">
                  {getInitials()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#1B2A4A] shadow-md border border-slate-200 hover:bg-amber-400 hover:text-slate-950 transition-colors cursor-pointer"
                title="Upload 2x2 ID Picture"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  {fullNameDisplay}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 border border-emerald-400/40 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {user?.student_status || 'Officially Enrolled'}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-amber-300 font-bold">
                {studentGrade} • {studentStrand} ({studentSection})
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-300/90 font-mono">
                <span>LRN: {studentLrn}</span>
                <span>•</span>
                <span className="font-sans">S.Y. {schoolYear}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center shrink-0">
            <Link
              to="/student"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all cursor-pointer backdrop-blur-xs"
            >
              <QrCode className="h-3.5 w-3.5 text-amber-300" />
              Attendance QR Pass
            </Link>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left Column: Academic Registration Summary */}
        <div className="h-full flex flex-col">
          <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1B2A4A]/10 text-[#1B2A4A]">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Scholastic Registration
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Official Registrar Assignment
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Learner Reference Number (LRN)
                  </span>
                  <span className="font-extrabold font-mono text-slate-900 mt-0.5 block">
                    {studentLrn}
                  </span>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Grade Level & Strand
                  </span>
                  <span className="font-extrabold text-slate-800 mt-0.5 block">
                    {studentGrade} • {studentStrand}
                  </span>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Advisory Section
                  </span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {studentSection}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-200/70 flex items-start gap-2.5 mt-auto">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-900 leading-relaxed">
                <strong className="font-bold block">Active Digital Badge</strong>
                Your QR code is active for daily campus gate and classroom attendance.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Student Profile & Password */}
        <div className="lg:col-span-2 h-full flex flex-col">
          <form
            onSubmit={handleSave}
            className="h-full rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between gap-6"
          >
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Learner Personal & Contact Details
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Keep your name and contact number accurate for official school advisories.
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
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden"
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
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Registered Email
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Contact Number
                  </label>
                  <div className="relative">
                    <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2.5 pb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Account Password
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Leave blank if you want to keep your current password.
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
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden"
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
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 mt-auto">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60 transition-all cursor-pointer"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
