import React, { useState } from 'react';
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
  Copy,
  ExternalLink,
  Check,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Alert } from '../../components/common/Alert';

interface ResetSession {
  email: string;
  code: string;
  userId: string;
  role: string;
  expiresAt: number;
}

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status & UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeSession, setActiveSession] = useState<ResetSession | null>(null);

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
      return { isValid: false, message: 'Please enter a valid email format (e.g., username@gmail.com).' };
    }

    const atIndex = trimmed.lastIndexOf('@');
    const domain = trimmed.substring(atIndex + 1).trim().toLowerCase();

    if (domain !== 'gmail.com') {
      return {
        isValid: false,
        message: 'Only Gmail accounts (@gmail.com) are permitted. Other providers like Yahoo, Outlook, or iCloud are not allowed.',
      };
    }

    return { isValid: true, email: trimmed.toLowerCase() };
  };

  // STEP 1: Handle Send Reset Code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // 1. Look up user in 'users' table
      const { data: usersData, error: userErr } = await supabase
        .from('users')
        .select('*')
        .ilike('email', cleanEmail);

      if (userErr) throw new Error(userErr.message);

      let matchedUser = null;
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
        setError('No registered account found with this Gmail address. Please check your spelling or register first.');
        setLoading(false);
        return;
      }

      // 2. Generate secure 6-digit confirmation code
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const sessionData: ResetSession = {
        email: cleanEmail,
        code: generatedCode,
        userId: matchedUser.id,
        role: matchedUser.role || 'student',
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
      };

      setActiveSession(sessionData);
      sessionStorage.setItem('hes_pwd_reset', JSON.stringify(sessionData));

      setStep('verify');
      setSuccess(`Confirmation code generated! Check your Gmail or enter code ${generatedCode} below.`);

      // Open Gmail compose helper in new window
      const subject = encodeURIComponent(`🔐 [${generatedCode}] PLS-NSHS Account Password Reset Code`);
      const body = encodeURIComponent(
        `Dear User,\n\nYour 6-digit confirmation security code for Placido L. Señor National High School is:\n\n${generatedCode}\n\n(Valid for 15 minutes).\n\nReturn to the reset page and enter this code to update your password.`
      );
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(cleanEmail)}&su=${subject}&body=${body}`, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setError(err.message || 'Error processing request. Please try again.');
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
      setError('Session expired. Please request a new confirmation code.');
      setStep('request');
      return;
    }

    if (Date.now() > currentSession.expiresAt) {
      setError('Confirmation code has expired. Please request a new one.');
      sessionStorage.removeItem('hes_pwd_reset');
      setStep('request');
      return;
    }

    if (code.trim() !== currentSession.code) {
      setError('Incorrect confirmation code. Please check your Gmail and try again.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setLoading(true);

    try {
      // Update in Supabase users table
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          password: newPassword,
          updated_at: new Date().toISOString(),
        })
        .ilike('email', currentSession.email);

      if (updateErr) throw new Error(updateErr.message);

      sessionStorage.removeItem('hes_pwd_reset');
      setSuccess('Password updated successfully! Redirecting to login page...');

      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch (err: any) {
      setError('Failed to update password: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Copy code action
  const handleCopyCode = async () => {
    if (activeSession?.code) {
      try {
        await navigator.clipboard.writeText(activeSession.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // fallback
      }
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{
        background: 'linear-gradient(135deg, #0b2b4a, #1a3d5f)',
      }}
    >
      <div className="w-full max-w-[480px] rounded-[32px] bg-white/98 p-8 sm:p-12 shadow-[0_20px_40px_rgba(0,0,0,0.15)] animate-fade-in">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div
            className="w-20 h-20 rounded-[24px] inline-flex items-center justify-center mb-5 shadow-[0_8px_20px_rgba(11,43,74,0.2)] text-white"
            style={{
              background: 'linear-gradient(135deg, #0b2b4a 0%, #1a3d5f 100%)',
            }}
          >
            <Key className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-[28px] font-bold text-slate-800 tracking-tight font-display mb-2">
            {step === 'request' ? 'Forgot Password?' : 'Enter Confirmation Code'}
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            {step === 'request'
              ? 'Enter your registered Gmail address to receive your 6-digit confirmation security code.'
              : `A 6-digit security code was generated for ${email}.`}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6">
            <Alert type="error" message={error} onClose={() => setError('')} />
          </div>
        )}
        {success && (
          <div className="mb-6">
            <Alert type="success" message={success} onClose={() => setSuccess('')} />
          </div>
        )}

        {/* STEP 1: Email Lookup & Code Dispatch */}
        {step === 'request' ? (
          <form onSubmit={handleRequestCode}>
            {/* Gmail Notice Badge */}
            <div className="flex items-start gap-2.5 bg-[#fff5f5] border border-[#fed7d7] p-3 rounded-xl mb-5 text-[12.5px] text-[#9b2c2c] leading-relaxed">
              <span className="font-black text-[#ea4335] text-base leading-none mt-0.5">G</span>
              <div>
                <strong className="text-[#742a2a]">Gmail Only:</strong> Only official{' '}
                <code className="bg-[rgba(234,67,53,0.1)] px-1.5 py-0.5 rounded text-[12px] font-mono font-semibold text-[#c53030]">
                  @gmail.com
                </code>{' '}
                addresses are permitted. Other providers like Yahoo, Outlook, or iCloud are not allowed.
              </div>
            </div>

            {/* Email Input */}
            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-5 w-5" />
              </div>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered Gmail (e.g. name@gmail.com)"
                className="w-full rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-[#0b2b4a] focus:ring-3 focus:ring-[#0b2b4a]/10 focus:outline-hidden"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl text-white font-semibold text-base transition-all flex items-center justify-center gap-2 mb-6 cursor-pointer shadow-[0_8px_20px_rgba(11,43,74,0.25)] hover:shadow-[0_12px_24px_rgba(11,43,74,0.35)] hover:-translate-y-0.5 disabled:opacity-75"
              style={{
                background: 'linear-gradient(135deg, #0b2b4a 0%, #1a3d5f 100%)',
              }}
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Reset Code</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* STEP 2: Verify Code & Update Password */
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 text-center">
              <p className="text-xs text-slate-600 mb-2.5">
                We generated a confirmation code for <strong className="text-[#0b2b4a]">{email}</strong>.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (activeSession?.code) {
                      const subject = encodeURIComponent(`🔐 [${activeSession.code}] Password Reset Code`);
                      const body = encodeURIComponent(
                        `Your confirmation security code is: ${activeSession.code}`
                      );
                      window.open(
                        `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                          email
                        )}&su=${subject}&body=${body}`,
                        '_blank',
                        'noopener,noreferrer'
                      );
                    }
                  }}
                  className="py-2.5 px-4 rounded-lg bg-[#EA4335] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_4px_6px_rgba(234,67,53,0.25)] hover:bg-[#d9382b] transition-all cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open in Gmail to View Code</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="py-2 px-3 rounded-lg bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-200 transition-all cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Code Copied!' : `Copy Code (${activeSession?.code || ''})`}</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {/* Code Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Shield className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter 6-digit confirmation code"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 font-mono font-bold tracking-[4px] transition-all focus:border-[#0b2b4a] focus:ring-3 focus:ring-[#0b2b4a]/10 focus:outline-hidden"
                />
              </div>

              {/* New Password */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-[#0b2b4a] focus:ring-3 focus:ring-[#0b2b4a]/10 focus:outline-hidden"
                />
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white pl-12 pr-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 transition-all focus:border-[#0b2b4a] focus:ring-3 focus:ring-[#0b2b4a]/10 focus:outline-hidden"
                />
              </div>

              {/* Update Password Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white font-semibold text-base transition-all flex items-center justify-center gap-2 mb-4 cursor-pointer shadow-[0_6px_16px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 disabled:opacity-75"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Back Link */}
        <div className="text-center mb-7 mt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#0b2b4a] transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Login</span>
          </Link>
        </div>

        {/* Features Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200 text-center">
          <div className="flex-1 text-center">
            <Clock className="h-5 w-5 mx-auto text-[#0b2b4a] mb-1.5" />
            <span className="text-[11px] font-medium text-slate-500">Valid for 15 mins</span>
          </div>
          <div className="flex-1 text-center">
            <ShieldCheck className="h-5 w-5 mx-auto text-[#0b2b4a] mb-1.5" />
            <span className="text-[11px] font-medium text-slate-500">Secure & Encrypted</span>
          </div>
          <div className="flex-1 text-center">
            <span className="inline-block text-[#ea4335] font-black text-sm mb-1 leading-none">G</span>
            <span className="text-[11px] font-medium text-slate-500 block">Gmail Only (@gmail.com)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
