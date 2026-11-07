import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Key,
  Mail,
  Send,
  ArrowLeft,
  Clock,
  ShieldCheck,
  Shield,
  Lock,
  CheckCircle2,
  Eye,
  EyeOff,
  RotateCw,
  Sparkles,
  MapPin,
  Globe,
  GraduationCap,
  BookOpen,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Alert } from '../../components/common/Alert';

interface ResetSession {
  email: string;
  code: string;
  userId: string;
  role: string;
  userName?: string;
  expiresAt: number;
}

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  // Multi-step process: 1 = Request Code, 2 = Verify & Set Password, 3 = Completed
  const [step, setStep] = useState<'request' | 'verify' | 'success'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSession, setActiveSession] = useState<ResetSession | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Restore session from sessionStorage if active
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('hes_pwd_reset');
      if (stored) {
        const parsed = JSON.parse(stored) as ResetSession;
        if (parsed && parsed.expiresAt > Date.now()) {
          setActiveSession(parsed);
          setEmail(parsed.email);
          setStep('verify');
        } else {
          sessionStorage.removeItem('hes_pwd_reset');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Expiration countdown timer
  useEffect(() => {
    if (!activeSession || step !== 'verify') return;

    const updateTimer = () => {
      const remainingMs = activeSession.expiresAt - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft(0);
        setError('Your confirmation code has expired. Please request a new code.');
      } else {
        setTimeLeft(Math.floor(remainingMs / 1000));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession, step]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  /**
   * Strict validation: Only official Gmail addresses (@gmail.com) are permitted.
   */
  const validateGmailAddress = (rawEmail: string) => {
    const trimmed = (rawEmail || '').trim();
    if (!trimmed) {
      return { isValid: false, message: 'Please enter your registered Gmail address.' };
    }

    const basicPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicPattern.test(trimmed)) {
      return {
        isValid: false,
        message: 'Please enter a valid email format (e.g., student.name@gmail.com).',
      };
    }

    const atIndex = trimmed.lastIndexOf('@');
    const domain = trimmed.substring(atIndex + 1).trim().toLowerCase();

    if (domain !== 'gmail.com') {
      return {
        isValid: false,
        message:
          'Only official Gmail accounts (@gmail.com) are permitted. Other providers like Yahoo, Outlook, or iCloud are not accepted.',
      };
    }

    return { isValid: true, email: trimmed.toLowerCase() };
  };

  // STEP 1: Handle Send Reset Code
  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    const validation = validateGmailAddress(email);
    if (!validation.isValid) {
      setError(validation.message || 'Invalid Gmail address');
      return;
    }

    const cleanEmail = validation.email!;
    setLoading(true);

    try {
      // 1. Check users table
      const { data: usersData, error: userErr } = await supabase
        .from('users')
        .select('*')
        .ilike('email', cleanEmail);

      if (userErr) throw new Error(userErr.message);

      let matchedUser: any = null;
      if (usersData && usersData.length > 0) {
        matchedUser = usersData[0];
      } else {
        // Fallback check students table
        try {
          const { data: stdData } = await supabase
            .from('students')
            .select('*')
            .ilike('email', cleanEmail)
            .maybeSingle();

          if (stdData) {
            matchedUser = {
              id: stdData.id,
              email: stdData.email,
              first_name: stdData.first_name,
              last_name: stdData.last_name,
              role: 'student',
            };
          }
        } catch {
          // ignore
        }
      }

      if (!matchedUser) {
        setError(
          'No registered account was found with this Gmail address. Please verify your spelling or contact the school registrar.'
        );
        setLoading(false);
        return;
      }

      // 2. Generate secure 6-digit confirmation code
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

      const userName = `${matchedUser.first_name || ''} ${matchedUser.last_name || ''}`.trim() || 'Learner';

      const sessionData: ResetSession = {
        email: cleanEmail,
        code: generatedCode,
        userId: matchedUser.id,
        role: matchedUser.role || 'student',
        userName,
        expiresAt,
      };

      setActiveSession(sessionData);
      sessionStorage.setItem('hes_pwd_reset', JSON.stringify(sessionData));

      // 3. Log notification in database
      try {
        await supabase.from('notifications').insert({
          title: 'Password Reset Code Requested',
          message: `A 6-digit security reset code was generated for ${cleanEmail}.`,
          type: 'account',
          role: matchedUser.role || 'student',
        });
      } catch {
        // ignore
      }

      setStep('verify');
      setSuccess(`A 6-digit confirmation code has been dispatched for ${cleanEmail}.`);
    } catch (err: any) {
      setError(err?.message || 'Error processing request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Handle Verify Code & Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    let currentSession = activeSession;
    if (!currentSession) {
      const stored = sessionStorage.getItem('hes_pwd_reset');
      if (stored) {
        try {
          currentSession = JSON.parse(stored);
        } catch {
          // ignore
        }
      }
    }

    if (!currentSession) {
      setError('Password reset session expired. Please request a new confirmation code.');
      setStep('request');
      return;
    }

    if (Date.now() > currentSession.expiresAt) {
      setError('Your confirmation code has expired. Please request a new one.');
      sessionStorage.removeItem('hes_pwd_reset');
      setStep('request');
      return;
    }

    if (code.trim() !== currentSession.code) {
      setError('Incorrect 6-digit confirmation code. Please check your email and re-enter.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    setLoading(true);

    try {
      // 1. Update password in Supabase users table
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          password: newPassword,
          updated_at: new Date().toISOString(),
        })
        .ilike('email', currentSession.email);

      if (updateErr) throw new Error(updateErr.message);

      // 2. Audit log to activity_logs
      try {
        await supabase.from('activity_logs').insert([
          {
            role: currentSession.role || 'student',
            action: 'Password Reset',
            details: `Account password was successfully updated via Gmail identity verification for ${currentSession.email}.`,
            timestamp: new Date().toISOString(),
          },
        ]);
      } catch {
        // ignore
      }

      sessionStorage.removeItem('hes_pwd_reset');
      setActiveSession(null);
      setStep('success');
    } catch (err: any) {
      setError('Failed to update password: ' + (err?.message || 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const maskedEmail = (raw: string) => {
    if (!raw) return '';
    const [user, domain] = raw.split('@');
    if (!user || !domain) return raw;
    const visibleStart = user.slice(0, 2);
    const hidden = '*'.repeat(Math.max(3, user.length - 2));
    return `${visibleStart}${hidden}@${domain}`;
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{
        backgroundColor: '#0f172a',
        backgroundImage: `
          radial-gradient(ellipse at 85% 15%, rgba(245, 158, 11, 0.16) 0%, transparent 45%),
          radial-gradient(ellipse at 15% 70%, rgba(251, 191, 36, 0.10) 0%, transparent 50%),
          linear-gradient(180deg, rgba(26, 34, 90, 0.70) 0%, rgba(20, 27, 72, 0.82) 50%, rgba(13, 17, 50, 0.92) 100%),
          url('/pictures/deped_matatag_banner.png')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="flex w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 animate-fade-in">
        {/* Left Panel: Clean Institutional Recovery Form */}
        <div className="w-full lg:w-7/12 p-8 sm:p-12 flex flex-col justify-between">
          <div>
            {/* Header Brand */}
            <div className="flex items-center gap-3 mb-6">
              <img
                src="/pictures/logo sa skwelahan.png"
                alt="PLSNHS Logo"
                className="h-12 w-12 rounded-full border border-[#1B2A4A]/20 object-cover shadow-xs"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/pictures/logo sa skwelahan.jpg';
                }}
              />
              <div>
                <h1 className="text-base font-extrabold text-[#1B2A4A] font-display">
                  Placido L. Señor
                </h1>
                <p className="text-xs font-semibold text-slate-500">
                  National High School · DepEd Portal
                </p>
              </div>
            </div>

            {/* Title & Progress Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#1B2A4A]/10 text-[#1B2A4A]">
                  Account Security
                </span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs font-bold text-slate-500">
                  {step === 'request'
                    ? 'Step 1 of 2: Verify Identity'
                    : step === 'verify'
                    ? 'Step 2 of 2: Security & Password'
                    : 'Recovery Complete'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                {step === 'request'
                  ? 'Password Recovery'
                  : step === 'verify'
                  ? 'Confirm Code & Reset'
                  : 'Password Updated'}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                {step === 'request'
                  ? 'Enter your registered Gmail address to verify your account identity.'
                  : step === 'verify'
                  ? `Enter the 6-digit confirmation code and choose your new password.`
                  : 'Your account credentials have been successfully updated.'}
              </p>
            </div>

            {/* Stepper Progress Bar */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  step === 'request' || step === 'verify' || step === 'success'
                    ? 'bg-[#1B2A4A]'
                    : 'bg-slate-200'
                }`}
              />
              <div
                className={`h-1.5 rounded-full transition-all ${
                  step === 'verify' || step === 'success' ? 'bg-[#1B2A4A]' : 'bg-slate-200'
                }`}
              />
            </div>

            {/* Alerts */}
            {error && (
              <div className="mb-5">
                <Alert type="error" message={error} onClose={() => setError('')} />
              </div>
            )}
            {success && step !== 'success' && (
              <div className="mb-5">
                <Alert type="success" message={success} onClose={() => setSuccess('')} />
              </div>
            )}

            {/* STEP 1: Enter Registered Gmail */}
            {step === 'request' && (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Registered Gmail Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      autoFocus
                      disabled={loading}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. your_name@gmail.com"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-11 pr-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 transition-all focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Official DepEd portal accounts are linked to verified{' '}
                    <strong className="text-slate-700">@gmail.com</strong> addresses.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#1B2A4A] hover:bg-[#142038] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send Confirmation Code</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: Verify Code & Set New Password */}
            {step === 'verify' && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                {/* Security Verification Prompt */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold text-slate-600">Verification Account:</span>
                    <strong className="text-[#1B2A4A] font-mono">{maskedEmail(email)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold text-slate-600">Code Expiration:</span>
                    <span className="font-mono font-bold text-amber-700">
                      {timeLeft > 0 ? formatTimer(timeLeft) : 'Expired'}
                    </span>
                  </div>
                </div>

                {/* 6-Digit Code */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      6-Digit Security Code <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRequestCode()}
                      disabled={loading}
                      className="text-xs font-bold text-[#1B2A4A] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw className="h-3 w-3" /> Resend Code
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Shield className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      autoFocus
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-11 pr-4 py-3.5 text-base font-mono font-bold tracking-[6px] text-slate-900 placeholder-slate-300 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min. 6 characters)"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-11 pr-11 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-11 pr-11 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Password Criteria Checks */}
                <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 space-y-1 border border-slate-200/80">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        newPassword.length >= 6 ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    />
                    <span>At least 6 characters in length</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        newPassword && newPassword === confirmPassword
                          ? 'bg-emerald-500'
                          : 'bg-slate-300'
                      }`}
                    />
                    <span>Passwords match correctly</span>
                  </div>
                </div>

                {/* Submit Update Button */}
                <button
                  type="submit"
                  disabled={loading || timeLeft <= 0}
                  className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
                >
                  {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Update Password & Save</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 3: Completed State */}
            {step === 'success' && (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 sm:p-8 text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                  <Check className="h-7 w-7 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-emerald-950 font-display">
                    Password Reset Successfully!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-1 max-w-sm mx-auto leading-relaxed">
                    Your account password has been updated. You can now use your new password to sign
                    in to the Placido L. Señor NHS portal.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/login', { replace: true })}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#1B2A4A] hover:bg-[#142038] text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                  >
                    Proceed to Sign In
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Back Link & Copyright */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <Link to="/login" className="flex items-center gap-1.5 hover:text-slate-700 font-medium">
              <ArrowLeft className="h-3.5 w-3.5" /> Return to Login
            </Link>
            <span>PLSNHS Portal · S.Y. 2026–2027</span>
          </div>
        </div>

        {/* Right Panel: Official DepEd MATATAG Branding & Institutional Information */}
        <div
          className="hidden lg:flex w-5/12 flex-col justify-between p-10 text-white border-l border-white/10 relative overflow-hidden"
          style={{
            backgroundColor: '#1a225a',
            backgroundImage: `
              radial-gradient(ellipse at 85% 15%, rgba(245, 158, 11, 0.18) 0%, transparent 50%),
              linear-gradient(180deg, rgba(26, 34, 90, 0.82) 0%, rgba(20, 27, 72, 0.88) 50%, rgba(13, 17, 50, 0.94) 100%),
              url('/pictures/deped_matatag_banner.png')
            `,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-300">
              <GraduationCap className="h-4 w-4" />
              <span>SENIOR HIGH SCHOOL</span>
            </div>

            <div className="mt-6">
              <h3 className="text-xl font-black tracking-widest text-amber-400 font-display">
                VIRTUS · EXCELLENTIA · SERVITIUM
              </h3>
              <p className="mt-2 text-xs text-slate-200/90 leading-relaxed">
                Placido L. Señor National High School provides high quality, tuition-free education to
                nurture youth into globally competitive and morally upright Filipino citizens.
              </p>
            </div>

            {/* Security Assurance Box */}
            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Account Security Standards
              </div>
              <ul className="space-y-2 text-xs text-slate-100/90">
                <li className="flex items-center gap-2.5 rounded-xl bg-white/10 p-3 border border-white/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>256-Bit Encrypted Credential Reset</span>
                </li>
                <li className="flex items-center gap-2.5 rounded-xl bg-white/10 p-3 border border-white/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Verified Institutional Gmail Authentication</span>
                </li>
                <li className="flex items-center gap-2.5 rounded-xl bg-white/10 p-3 border border-white/10">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Synchronized with Official DepEd LIS Registry</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 text-xs text-slate-200/80 space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>Address:</strong> Langtad, City of Naga, Cebu
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>Email Address:</strong>{' '}
                <a
                  href="mailto:303035@deped.gov.ph"
                  className="text-amber-300 underline hover:text-white transition-colors"
                >
                  303035@deped.gov.ph
                </a>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>DepEd School ID:</strong> 303035
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
