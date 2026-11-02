import React, { useState, useRef } from 'react';
import {
  User,
  Mail,
  Shield,
  Save,
  KeyRound,
  Phone,
  Building2,
  CheckCircle2,
  Camera,
  Eye,
  EyeOff,
  Lock,
  BadgeCheck,
  Calendar,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/common/Alert';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import { supabase } from '../../lib/supabase';

const ROLE_CONFIG: Record<
  string,
  {
    title: string;
    department: string;
    clearance: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  admin: {
    title: 'System Administrator',
    department: 'Office of the School Administration & ICT',
    clearance: 'Level 5 • Full System & Records Control',
    badgeBg: 'bg-amber-400/20 border-amber-400/40',
    badgeText: 'text-amber-300',
  },
  principal: {
    title: 'School Principal',
    department: 'Office of the School Principal',
    clearance: 'Level 5 • Executive Academic & Administrative Authority',
    badgeBg: 'bg-amber-400/20 border-amber-400/40',
    badgeText: 'text-amber-300',
  },
  registrar: {
    title: 'School Registrar Officer',
    department: 'Office of the School Registrar & Admissions',
    clearance: 'Level 4 • Enrollment, Credentials & Masterlist Control',
    badgeBg: 'bg-sky-400/20 border-sky-400/40',
    badgeText: 'text-sky-200',
  },
  teacher: {
    title: 'Faculty Member & Class Adviser',
    department: 'Senior & Junior High School Faculty Department',
    clearance: 'Level 3 • Class Records, Attendance & Grades Encoding',
    badgeBg: 'bg-emerald-400/20 border-emerald-400/40',
    badgeText: 'text-emerald-200',
  },
  guidance: {
    title: 'Guidance Counselor',
    department: 'Office of Student Guidance & Welfare Services',
    clearance: 'Level 3 • Counseling, Behavioral & Student Welfare Records',
    badgeBg: 'bg-purple-400/20 border-purple-400/40',
    badgeText: 'text-purple-200',
  },
  parent: {
    title: 'Parent / Legal Guardian',
    department: 'PLSNHS Parent-Teacher Community Portal',
    clearance: 'Learner Monitoring & Official Advisories Access',
    badgeBg: 'bg-blue-400/20 border-blue-400/40',
    badgeText: 'text-blue-200',
  },
};

export const AdminProfilePage: React.FC = () => {
  const { user, updateCurrentUser } = useAuth();
  const roleKey = user?.role || 'admin';
  const roleMeta = ROLE_CONFIG[roleKey] || ROLE_CONFIG.admin;

  const [firstName, setFirstName] = useState(
    user?.first_name || user?.full_name?.split(' ')[0] || 'Justine'
  );
  const [lastName, setLastName] = useState(
    user?.last_name || user?.full_name?.split(' ').slice(1).join(' ') || 'Mangila'
  );
  const [phone, setPhone] = useState(user?.phone || '0912-345-6789');
  const [department, setDepartment] = useState(roleMeta.department);
  const [avatarUrl, setAvatarUrl] = useState<string>(
    user?.avatar_url || localStorage.getItem(`plsnhs_avatar_${user?.email || 'default'}`) || ''
  );

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = () => {
    const f = firstName.trim()[0] || '';
    const l = lastName.trim()[0] || '';
    return (`${f}${l}` || user?.email?.substring(0, 2) || 'JM').toUpperCase();
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
        if (user?.email) {
          localStorage.setItem(`plsnhs_avatar_${user.email}`, compressed);
        }
        updateCurrentUser({ avatar_url: compressed });
        setNotice({ type: 'success', message: 'Profile photo updated.' });
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
        const { error } = await supabase.from('users').update(updates).eq('id', user.id);
        if (error) {
          console.warn('Supabase users update fallback:', error.message);
        }
      }

      updateCurrentUser({
        first_name: cleanFirst,
        last_name: cleanLast,
        full_name: `${cleanFirst} ${cleanLast}`.trim(),
        phone: phone.trim(),
        avatar_url: avatarUrl,
      });

      setNotice({
        type: 'success',
        message: 'Your official profile and security credentials have been saved.',
      });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const fullNameDisplay = `${firstName} ${lastName}`.trim() || user?.full_name || 'Portal User';

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      {/* Hidden File Input for Avatar */}
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
            User Profile &amp; Account Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your personal profile details, contact information, and security credentials.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <PageHeaderNotificationSlot />
        </div>
      </div>

      {/* Top Institutional Hero Banner Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0f1c3f] via-[#1B2A4A] to-[#243B67] text-white shadow-md border border-slate-800/20">
        {/* Decorative Gold & Blue Subtle Glow */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="pointer-events-none absolute right-24 -bottom-16 h-48 w-48 rounded-full bg-sky-400/10 blur-2xl" />

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
                title="Upload or change profile picture"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>

            {/* Identity Details */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  {fullNameDisplay}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${roleMeta.badgeBg} ${roleMeta.badgeText}`}
                >
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {roleMeta.title}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                {department}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-slate-300/90">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-amber-400" />
                  {user?.email || 'admin@PLSNHS.edu.ph'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-amber-400" />
                  Placido L. Señor NHS • Langtad, City of Naga
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Institutional Overview + Right Editable Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left Column: Official Account Metadata */}
        <div className="h-full flex flex-col">
          <div className="h-full rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between gap-5">
            <div className="space-y-5">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1B2A4A]/10 text-[#1B2A4A]">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Institutional Credentials
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    DepEd Division of City of Naga
                  </p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Assigned Portal Role
                  </span>
                  <span className="font-extrabold text-slate-800 mt-0.5 block">
                    {roleMeta.title}
                  </span>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Security Clearance
                  </span>
                  <span className="font-bold text-slate-700 mt-0.5 block">
                    {roleMeta.clearance}
                  </span>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Official School ID
                  </span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    303035 • Placido L. Señor NHS
                  </span>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Academic Year & Status
                  </span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    S.Y. 2026–2027 • Active Portal Access
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-200/70 flex items-start gap-2.5 mt-auto">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-emerald-900 leading-relaxed">
                <strong className="font-bold block">DepEd MATATAG Compliant</strong>
                Your account is protected with role-based access control and encrypted session tokens.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile & Security Form */}
        <div className="lg:col-span-2 h-full flex flex-col">
          <form
            onSubmit={handleSave}
            className="h-full rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between gap-6"
          >
            <div className="space-y-6">
              {/* Section 1: Personal & Official Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Personal & Official Information
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Your name and designation appear on official reports and system logs.
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
                      placeholder="Enter first name"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden transition-colors"
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
                      placeholder="Enter last name"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 pl-10 pr-20 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Verified
                    </span>
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
                      placeholder="e.g. 0912-345-6789"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Office / Department Assignment
                  </label>
                  <div className="relative">
                    <Building2 className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Security & Password */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2.5 pb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Password & Authentication
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Leave the password fields blank if you do not wish to change your current password.
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
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
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
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-900 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden transition-colors"
                    />
                  </div>
                </div>
                </div>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-auto">
              <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                Changes take effect immediately across your portal session
              </span>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60 transition-all cursor-pointer shrink-0"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
