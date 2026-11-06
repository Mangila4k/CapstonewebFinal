import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LogIn,
  Eye,
  EyeOff,
  GraduationCap,
  ShieldAlert,
  ArrowLeft,
  BookOpen,
  MapPin,
  Mail,
  Globe,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/common/Alert';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Load remembered email
  useEffect(() => {
    const saved = localStorage.getItem('hes_remembered_email');
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  // Check lockout
  useEffect(() => {
    const lockoutUntil = localStorage.getItem('hes_login_lockout_until');
    if (lockoutUntil) {
      const remaining = Math.max(0, Math.ceil((parseInt(lockoutUntil, 10) - Date.now()) / 1000));
      if (remaining > 0) {
        setLockoutSeconds(remaining);
      }
    }
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          localStorage.removeItem('hes_login_lockout_until');
          localStorage.removeItem('hes_login_failed_attempts');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;

    setErrorMessage('');
    setLoading(true);

    const result = await login(email, password, rememberMe);

    if (result.success && result.role) {
      // Success!
      localStorage.removeItem('hes_login_failed_attempts');
      const roleRoutes: Record<string, string> = {
        admin: '/admin/dashboard',
        registrar: '/registrar/dashboard',
        teacher: '/teacher/dashboard',
        student: '/student/dashboard',
        parent: '/parents/dashboard',
        guidance: '/guidance/dashboard',
      };
      navigate(roleRoutes[result.role] || '/student/dashboard', { replace: true });
    } else {
      // Record failure attempt
      const attempts = parseInt(localStorage.getItem('hes_login_failed_attempts') || '0', 10) + 1;
      localStorage.setItem('hes_login_failed_attempts', attempts.toString());

      if (attempts >= 5) {
        const lockoutDuration = 30; // 30 seconds
        localStorage.setItem(
          'hes_login_lockout_until',
          (Date.now() + lockoutDuration * 1000).toString()
        );
        setLockoutSeconds(lockoutDuration);
        setErrorMessage(
          `Too many failed attempts. Security cooldown active. Please wait ${lockoutDuration}s.`
        );
      } else {
        setErrorMessage(
          result.error || `Invalid credentials. (${5 - attempts} attempts remaining before cooldown)`
        );
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#1a225a]/5">
      <div className="flex w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200">
        {/* Left Panel: Form */}
        <div className="w-full lg:w-7/12 p-8 sm:p-12 flex flex-col justify-between">
          <div>
            {/* Header / Brand */}
            <div className="flex items-center gap-3 mb-8">
              <img
                src="/pictures/logo sa skwelahan.png"
                alt="School Logo"
                className="h-12 w-12 rounded-full border border-[#1B2A4A]/20 object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <h1 className="text-base font-extrabold text-[#1B2A4A] font-display">
                  Placido L. Señor
                </h1>
                <p className="text-xs font-semibold text-slate-500">National High School</p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                Welcome <span className="text-[#1B2A4A]">Back</span>
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Sign in with your registered account credentials to access your portal.
              </p>
            </div>

            {/* Error or Lockout Alert */}
            {lockoutSeconds > 0 ? (
              <div className="mt-6 rounded-2xl border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm">
                  <ShieldAlert className="h-5 w-5 text-amber-600" />
                  <span>Security Cooldown Active</span>
                </div>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Too many unsuccessful login attempts. For your account security, submissions are
                  paused.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-2xl font-black text-amber-900 font-mono">
                    {lockoutSeconds}s
                  </span>
                  <span className="text-xs text-amber-700">remaining</span>
                </div>
              </div>
            ) : errorMessage ? (
              <div className="mt-6">
                <Alert
                  type="error"
                  message={errorMessage}
                  onClose={() => setErrorMessage('')}
                />
              </div>
            ) : null}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address / Username <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    disabled={lockoutSeconds > 0 || loading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. your_email@gmail.com"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-[#1B2A4A] hover:text-[#0b2b4a]"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    disabled={lockoutSeconds > 0 || loading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 px-4 py-3 pr-11 text-sm text-slate-900 placeholder-slate-400 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-[#1B2A4A] focus:ring-[#1B2A4A]"
                  />
                  <span>Remember my email</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={lockoutSeconds > 0 || loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B2A4A] py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#142038] hover:shadow-lg disabled:opacity-50 active:scale-[0.99] transition-all cursor-pointer"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : lockoutSeconds > 0 ? (
                  <>
                    <Lock className="h-4 w-4" /> Locked ({lockoutSeconds}s)
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" /> Sign In
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500">
              Don't have an enrolled student account yet?{' '}
              <Link to="/enroll" className="font-bold text-[#1B2A4A] hover:underline">
                Enroll Now
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <Link to="/" className="flex items-center gap-1.5 hover:text-slate-700">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
            </Link>
            <span>PLSNHS Portal · S.Y. 2026–2027</span>
          </div>
        </div>

        {/* Right Panel: Info & Strands */}
        <div className="hidden lg:flex w-5/12 flex-col justify-between bg-gradient-to-br from-[#1a225a] via-[#1B2A4A] to-[#121E36] p-10 text-white border-l border-white/10">
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
                Placido L. Señor National High School provides high quality, tuition-free education
                to nurture youth into globally competitive and morally upright Filipino citizens.
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                <BookOpen className="h-3.5 w-3.5" /> Offered Strands
              </div>
              <ul className="space-y-2 text-xs text-slate-100/90">
                <li className="flex items-center gap-2 rounded-lg bg-white/10 p-2.5 border border-white/10">
                  <span className="rounded bg-blue-500/20 text-blue-300 px-1.5 py-0.5 font-bold">
                    STEM
                  </span>
                  <span>Science, Tech, Engineering & Math</span>
                </li>
                <li className="flex items-center gap-2 rounded-lg bg-white/10 p-2.5 border border-white/10">
                  <span className="rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.5 font-bold">
                    HUMSS
                  </span>
                  <span>Humanities and Social Sciences</span>
                </li>
                <li className="flex items-center gap-2 rounded-lg bg-white/10 p-2.5 border border-white/10">
                  <span className="rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 font-bold">
                    GAS
                  </span>
                  <span>General Academic Strand</span>
                </li>
                <li className="flex items-center gap-2 rounded-lg bg-white/10 p-2.5 border border-white/10">
                  <span className="rounded bg-purple-500/20 text-purple-300 px-1.5 py-0.5 font-bold">
                    TVL
                  </span>
                  <span>Technical-Vocational Livelihood (Cookery / ICT)</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 text-xs text-slate-200/80 space-y-2">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span><strong>Address:</strong> Langtad, City of Naga, Cebu</span>
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
                <strong>Facebook:</strong>{' '}
                <a
                  href="https://www.facebook.com/search/top?q=Placido%20L.%20Senor%20303035"
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-300 underline hover:text-white transition-colors"
                >
                  Placido L. Senor 303035
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
