import React, { useState, useEffect, useMemo } from 'react';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Shield,
  GraduationCap,
  Briefcase,
  FileText,
  ShieldCheck,
  Check,
  Copy,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { formatDate, isLrnManualRequired, generateAutoLrn } from '../../lib/utils';
import type { UserRole } from '../../types';

interface AccountItem {
  id: string | number;
  email: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  created_at?: string;
}

interface CategoryDefinition {
  key: string;
  label: string;
  singular: string;
  defaultRole: UserRole;
  description: string;
  roles: string[];
  icon: React.ElementType;
  colorScheme: {
    bannerBg: string;
    bannerBorder: string;
    bannerText: string;
    iconBg: string;
    avatarBg: string;
    badgeStyle: string;
  };
}

const GRADE_LEVEL_OPTIONS = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const STUDENT_TYPE_OPTIONS = ['New Student', 'Old Student', 'Repeater', 'Transferee'];
const STRAND_OPTIONS = [
  { code: 'STEM', label: 'STEM – Science, Technology, Engineering & Mathematics' },
  { code: 'HUMSS', label: 'HUMSS – Humanities & Social Sciences' },
  { code: 'GAS', label: 'GAS – General Academic Strand' },
  { code: 'TVL-ICT', label: 'TVL – Information & Communications Technology' },
  { code: 'TVL-Cookery', label: 'TVL – Cookery' },
];
const GUARDIAN_RELATIONSHIP_OPTIONS = ['Mother', 'Father', 'Grandparent', 'Sibling', 'Aunt / Uncle', 'Legal Guardian', 'Other'];

const ENROLL_LABEL_CLS = 'block text-[11px] font-bold text-slate-700 uppercase mb-1';
const ENROLL_INPUT_CLS =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden';

const createEmptyEnrollmentForm = () => ({
  lrn: '',
  middleName: '',
  suffix: '',
  dob: '',
  gender: '',
  contactNumber: '',
  address: '',
  studentType: 'New Student',
  gradeLevel: 'Grade 7',
  strand: '',
  schoolYear: '2026-2027',
  previousSchool: '',
  generalAverage: '',
  guardianName: '',
  guardianRelationship: '',
  guardianContact: '',
});

const computeAge = (dob: string): number | null => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
};

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    key: 'student',
    label: 'Student Accounts',
    singular: 'Student',
    defaultRole: 'student',
    description: 'Officially enrolled learners and active student portal accounts',
    roles: ['student'],
    icon: GraduationCap,
    colorScheme: {
      bannerBg: 'bg-emerald-50/70',
      bannerBorder: 'border-emerald-200',
      bannerText: 'text-emerald-900',
      iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      avatarBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
  },
  {
    key: 'teacher',
    label: 'Faculty & Teaching Personnel',
    singular: 'Teacher',
    defaultRole: 'teacher',
    description: 'Classroom advisers, subject instructors, and academic faculty',
    roles: ['teacher'],
    icon: Briefcase,
    colorScheme: {
      bannerBg: 'bg-purple-50/70',
      bannerBorder: 'border-purple-200',
      bannerText: 'text-purple-900',
      iconBg: 'bg-purple-100 text-purple-700 border-purple-200',
      avatarBg: 'bg-purple-100 text-purple-800 border-purple-200',
      badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200',
    },
  },
  {
    key: 'parent',
    label: 'Parents & Guardians',
    singular: 'Parent',
    defaultRole: 'parent',
    description: 'Parent-Teacher Association (PTA) members and guardian portal accounts',
    roles: ['parent'],
    icon: Users,
    colorScheme: {
      bannerBg: 'bg-amber-50/70',
      bannerBorder: 'border-amber-200',
      bannerText: 'text-amber-900',
      iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
      avatarBg: 'bg-amber-100 text-amber-800 border-amber-200',
      badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  },
  {
    key: 'guidance',
    label: 'Guidance & Counseling Department',
    singular: 'Guidance',
    defaultRole: 'guidance',
    description: 'Guidance counselors, student behavioral coordinators, and welfare staff',
    roles: ['guidance'],
    icon: Shield,
    colorScheme: {
      bannerBg: 'bg-teal-50/70',
      bannerBorder: 'border-teal-200',
      bannerText: 'text-teal-900',
      iconBg: 'bg-teal-100 text-teal-700 border-teal-200',
      avatarBg: 'bg-teal-100 text-teal-800 border-teal-200',
      badgeStyle: 'bg-teal-50 text-teal-700 border-teal-200',
    },
  },
  {
    key: 'registrar',
    label: 'Registrar & Academic Records',
    singular: 'Registrar',
    defaultRole: 'registrar',
    description: 'Admissions staff, enrollment coordinators, and student records custodians',
    roles: ['registrar'],
    icon: FileText,
    colorScheme: {
      bannerBg: 'bg-blue-50/70',
      bannerBorder: 'border-blue-200',
      bannerText: 'text-blue-900',
      iconBg: 'bg-blue-100 text-blue-700 border-blue-200',
      avatarBg: 'bg-blue-100 text-blue-800 border-blue-200',
      badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200',
    },
  },
  {
    key: 'admin',
    label: 'System & School Administrators',
    singular: 'Administrator',
    defaultRole: 'admin',
    description: 'School principal, head administration, and portal IT coordinators',
    roles: ['admin', 'principal'],
    icon: ShieldCheck,
    colorScheme: {
      bannerBg: 'bg-rose-50/70',
      bannerBorder: 'border-rose-200',
      bannerText: 'text-rose-900',
      iconBg: 'bg-rose-100 text-rose-700 border-rose-200',
      avatarBg: 'bg-rose-100 text-rose-800 border-rose-200',
      badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200',
    },
  },
];

export const AdminAccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<AccountItem | null>(null);
  const [deleteReasonCategory, setDeleteReasonCategory] = useState('');
  const [deleteReasonNotes, setDeleteReasonNotes] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'teacher' as UserRole,
  });

  // Enrollment Information (shown only when creating a Student account)
  const [enrollForm, setEnrollForm] = useState(createEmptyEnrollmentForm());
  const isStudentRole = form.role === 'student';
  const isSeniorHighGrade = enrollForm.gradeLevel === 'Grade 11' || enrollForm.gradeLevel === 'Grade 12';
  const isEnrollLrnManual = isLrnManualRequired(enrollForm.gradeLevel, enrollForm.studentType);
  const [lastAdminManualMode, setLastAdminManualMode] = useState<boolean>(isEnrollLrnManual);
  const updateEnroll = (field: keyof ReturnType<typeof createEmptyEnrollmentForm>, value: string) =>
    setEnrollForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (!isStudentRole) return;
    if (isEnrollLrnManual !== lastAdminManualMode) {
      setLastAdminManualMode(isEnrollLrnManual);
      if (isEnrollLrnManual) {
        setEnrollForm((prev) => ({ ...prev, lrn: '' }));
      } else {
        const autoLrn = generateAutoLrn(
          form.email || `${form.firstName}${form.lastName}` || 'plsnhs'
        );
        setEnrollForm((prev) => ({ ...prev, lrn: autoLrn }));
      }
    } else if (
      !isEnrollLrnManual &&
      (!enrollForm.lrn || enrollForm.lrn.length !== 12 || !/^\d{12}$/.test(enrollForm.lrn))
    ) {
      const autoLrn = generateAutoLrn(
        form.email || `${form.firstName}${form.lastName}` || 'plsnhs'
      );
      setEnrollForm((prev) => ({ ...prev, lrn: autoLrn }));
    }
  }, [
    isStudentRole,
    isEnrollLrnManual,
    lastAdminManualMode,
    enrollForm.gradeLevel,
    enrollForm.studentType,
    form.email,
    form.firstName,
    form.lastName,
    enrollForm.lrn,
  ]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAccounts(data);
      }
    } catch (err) {
      console.warn('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const openCreateModalForRole = (role: UserRole = 'teacher') => {
    setForm({ firstName: '', lastName: '', email: '', password: '', role });
    setEnrollForm(createEmptyEnrollmentForm());
    setIsModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (isStudentRole && isSeniorHighGrade && !enrollForm.strand) {
      setNotice({ type: 'error', message: 'Please select a strand for Senior High School (Grade 11 / Grade 12) students.' });
      return;
    }

    let cleanAdminLrn = (enrollForm.lrn || '').trim();
    if (isStudentRole) {
      if (isEnrollLrnManual) {
        if (!cleanAdminLrn) {
          setNotice({
            type: 'error',
            message:
              enrollForm.gradeLevel === 'Grade 7'
                ? 'Please enter the 12-digit Learner Reference Number (LRN) for Grade 7 student.'
                : 'Please enter the 12-digit Learner Reference Number (LRN) for Transferee student.',
          });
          return;
        }
        if (cleanAdminLrn.length !== 12 || !/^\d{12}$/.test(cleanAdminLrn)) {
          setNotice({
            type: 'error',
            message: 'Student LRN must be exactly 12 numeric digits.',
          });
          return;
        }
      } else {
        if (!cleanAdminLrn || cleanAdminLrn.length !== 12 || !/^\d{12}$/.test(cleanAdminLrn)) {
          cleanAdminLrn = generateAutoLrn(
            form.email || `${form.firstName}${form.lastName}` || 'plsnhs'
          );
          setEnrollForm((prev) => ({ ...prev, lrn: cleanAdminLrn }));
        }
      }
    }

    setSubmitting(true);

    try {
      const payload: Record<string, any> = {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password.trim(),
        role: form.role,
        created_at: new Date().toISOString(),
      };

      if (isStudentRole) {
        payload.contact_number = enrollForm.contactNumber.trim() || null;
        payload.address = enrollForm.address.trim() || null;
      }

      const { error } = await supabase.from('users').insert([payload]);

      if (error) {
        throw new Error(error.message);
      }

      // For Student accounts, also file the enrollment information record
      let enrollmentWarning = '';
      if (isStudentRole) {
        const finalStrand = isSeniorHighGrade ? enrollForm.strand : null;
        const enrollmentPayload: Record<string, any> = {
          lrn: cleanAdminLrn,
          first_name: payload.first_name,
          last_name: payload.last_name,
          middle_name: enrollForm.middleName.trim() || null,
          suffix: enrollForm.suffix.trim() || null,
          email: payload.email,
          dob: enrollForm.dob || null,
          date_of_birth: enrollForm.dob || null,
          age: computeAge(enrollForm.dob),
          gender: enrollForm.gender || null,
          contact_number: enrollForm.contactNumber.trim() || null,
          address: enrollForm.address.trim() || null,
          nationality: 'Filipino',
          guardian_name: enrollForm.guardianName.trim() || null,
          guardian_relationship: enrollForm.guardianRelationship || null,
          guardian_contact: enrollForm.guardianContact.trim() || null,
          guardian_address: enrollForm.address.trim() || null,
          student_type: enrollForm.studentType,
          grade_level: enrollForm.gradeLevel,
          strand: finalStrand,
          school_year: enrollForm.schoolYear.trim() || '2026-2027',
          last_school_year: enrollForm.schoolYear.trim() || '2026-2027',
          previous_school: enrollForm.previousSchool.trim() || null,
          general_average: enrollForm.generalAverage ? parseFloat(enrollForm.generalAverage) : null,
          status: 'Pending',
        };

        let enrDataResult: any = null;
        const { data: enrData, error: enrError } = await supabase
          .from('enrollments')
          .insert(enrollmentPayload)
          .select()
          .single();

        if (enrError) {
          // Graceful fallback if PostgreSQL 'enrollments' table doesn't have the 'lrn' column yet (Code 42703)
          if (enrError.code === '42703' || String(enrError.message || '').toLowerCase().includes('lrn')) {
            const { lrn: _omitLrn, ...safeEnrPayload } = enrollmentPayload;
            const { data: retryEnr, error: retryErr } = await supabase
              .from('enrollments')
              .insert(safeEnrPayload)
              .select()
              .single();

            if (retryErr) {
              enrollmentWarning = ` (Note: enrollment information could not be saved: ${retryErr.message})`;
            } else {
              enrDataResult = retryEnr ? { ...retryEnr, lrn: cleanAdminLrn } : { ...enrollmentPayload, lrn: cleanAdminLrn };
            }
          } else {
            enrollmentWarning = ` (Note: enrollment information could not be saved: ${enrError.message})`;
          }
        } else {
          enrDataResult = enrData ? { ...enrData, lrn: cleanAdminLrn } : { ...enrollmentPayload, lrn: cleanAdminLrn };
        }

        if (enrDataResult) {
          try {
            await supabase.from('notifications').insert({
              title: 'New Student Enrollment Record',
              message: `Admin filed an enrollment record for ${payload.first_name} ${payload.last_name} – ${enrollForm.gradeLevel}${finalStrand ? ` (${finalStrand})` : ''} (${enrollForm.studentType}), awaiting verification.`,
              type: 'enrollment',
              role: 'registrar',
              enrollment_id: enrDataResult?.id || null,
            });
          } catch {
            // ignore
          }

          try {
            const rawCache = localStorage.getItem('plsnhs_enrollments_cache_v2');
            const parsedCache = rawCache ? JSON.parse(rawCache) : [];
            if (Array.isArray(parsedCache)) {
              localStorage.setItem('plsnhs_enrollments_cache_v2', JSON.stringify([enrDataResult, ...parsedCache]));
            }
            window.dispatchEvent(new Event('plsnhs-enrollment-updated'));
          } catch {
            // ignore storage errors
          }
        }
      }

      // Record in activity_logs
      try {
        const logRecord = {
          role: 'admin',
          action: 'Account Created',
          details: `Admin created new ${form.role.toUpperCase()} account for ${form.firstName} ${form.lastName} (${form.email})${
            isStudentRole ? ` with enrollment information for ${enrollForm.gradeLevel}` : ''
          }.`,
          timestamp: new Date().toISOString(),
        };
        await supabase.from('activity_logs').insert([logRecord]);
        window.dispatchEvent(new CustomEvent('plsnhs-activity-logged', { detail: logRecord }));
      } catch {
        // ignore
      }

      setNotice({
        type: enrollmentWarning ? 'error' : 'success',
        message: `Account created successfully for ${form.email}${enrollmentWarning}`,
      });
      setIsModalOpen(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'teacher' });
      setEnrollForm(createEmptyEnrollmentForm());
      fetchAccounts();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to create user account' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (acc: AccountItem) => {
    setDeletingAccount(acc);
    setDeleteReasonCategory('');
    setDeleteReasonNotes('');
  };

  const handleConfirmDeleteAccount = async () => {
    if (!deletingAccount) return;
    const finalReason =
      deleteReasonCategory === 'Other (Specify Below)'
        ? deleteReasonNotes.trim()
        : deleteReasonNotes.trim()
        ? `${deleteReasonCategory} — ${deleteReasonNotes.trim()}`
        : deleteReasonCategory.trim();

    if (!finalReason) {
      setNotice({ type: 'error', message: 'Please provide a reason before deleting the account.' });
      return;
    }

    setDeleteLoading(true);
    try {
      const { error } = await supabase.from('users').delete().eq('id', deletingAccount.id);
      if (error) throw new Error(error.message);

      try {
        const rawLogs = localStorage.getItem('plsnhs_deletion_audit_logs_v1');
        const logs = rawLogs ? JSON.parse(rawLogs) : [];
        logs.unshift({
          id: `del-acc-${Date.now()}`,
          entity_type: `Account (${deletingAccount.role})`,
          entity_name:
            `${deletingAccount.first_name || ''} ${deletingAccount.last_name || ''}`.trim() ||
            deletingAccount.email,
          identifier: deletingAccount.email,
          reason: finalReason,
          deleted_at: new Date().toISOString(),
        });
        localStorage.setItem('plsnhs_deletion_audit_logs_v1', JSON.stringify(logs.slice(0, 200)));
      } catch {
        // ignore
      }

      // Record in activity_logs
      try {
        const logRecord = {
          role: 'admin',
          action: 'Account Deleted',
          details: `Admin deleted ${deletingAccount.role.toUpperCase()} account for ${deletingAccount.email}. Reason: ${finalReason}`,
          timestamp: new Date().toISOString(),
        };
        await supabase.from('activity_logs').insert([logRecord]);
        window.dispatchEvent(new CustomEvent('plsnhs-activity-logged', { detail: logRecord }));
      } catch {
        // ignore
      }

      setNotice({
        type: 'success',
        message: `Account ${deletingAccount.email} deleted. Reason: ${finalReason}`,
      });
      setDeletingAccount(null);
      setDeleteReasonCategory('');
      setDeleteReasonNotes('');
      fetchAccounts();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Could not delete account.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Helper for initials
  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName || lastName) {
      return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    }
    return email ? email.slice(0, 2).toUpperCase() : 'U';
  };

  // Live Counts by Role
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    accounts.forEach((acc) => {
      counts[acc.role] = (counts[acc.role] || 0) + 1;
    });
    return counts;
  }, [accounts]);

  // Filtered accounts matching search
  const searchedAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((acc) => {
      const name = `${acc.first_name || ''} ${acc.last_name || ''}`.toLowerCase();
      const email = (acc.email || '').toLowerCase();
      const role = (acc.role || '').toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [accounts, search]);

  // Categories to display based on active roleFilter
  const activeCategories = useMemo(() => {
    if (roleFilter === 'all') {
      return CATEGORY_DEFINITIONS;
    }
    return CATEGORY_DEFINITIONS.filter((cat) => cat.key === roleFilter || cat.roles.includes(roleFilter));
  }, [roleFilter]);

  // Unclassified accounts (if any exist that do not match the defined categories)
  const allKnownRoles = useMemo(() => {
    return CATEGORY_DEFINITIONS.flatMap((c) => c.roles);
  }, []);

  const otherAccounts = useMemo(() => {
    if (roleFilter !== 'all') return [];
    return searchedAccounts.filter((acc) => !allKnownRoles.includes(acc.role));
  }, [searchedAccounts, roleFilter, allKnownRoles]);

  // Total matching accounts in current view
  const totalInCurrentView = useMemo(() => {
    if (roleFilter === 'all') {
      return searchedAccounts.length;
    }
    const cat = CATEGORY_DEFINITIONS.find((c) => c.key === roleFilter || c.roles.includes(roleFilter));
    if (!cat) return 0;
    return searchedAccounts.filter((acc) => cat.roles.includes(acc.role)).length;
  }, [searchedAccounts, roleFilter]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-4 sm:pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight leading-snug">
              User Accounts Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Create, monitor, and configure role credentials categorized for faculty, staff, and learners.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-auto pt-0.5">
            <button
              type="button"
              onClick={() => openCreateModalForRole('teacher')}
              className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add New Account
            </button>
            <PageHeaderNotificationSlot />
          </div>
        </div>

        {/* Mobile Action Button Row */}
        <div className="sm:hidden mt-3 flex items-center">
          <button
            type="button"
            onClick={() => openCreateModalForRole('teacher')}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add New Account
          </button>
        </div>
      </div>

      {notice && (
        <Alert
          type={notice.type}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}

      {/* Role Metrics Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total User Accounts
            </span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-display">
            {accounts.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Across all registered user types</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Student Accounts
            </span>
            <GraduationCap className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-display">
            {roleCounts['student'] || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Officially enrolled learners</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Faculty &amp; Teachers
            </span>
            <Briefcase className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700 font-display">
            {roleCounts['teacher'] || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Teaching &amp; instructional staff</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Staff, Parents &amp; Admin
            </span>
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-800 font-display">
            {(roleCounts['parent'] || 0) +
              (roleCounts['guidance'] || 0) +
              (roleCounts['registrar'] || 0) +
              (roleCounts['admin'] || 0) +
              (roleCounts['principal'] || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Guidance, admin, registrar &amp; PTA</p>
        </div>
      </div>

      {/* Category Filter Pills / Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200/80">
        <button
          type="button"
          onClick={() => setRoleFilter('all')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            roleFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>All User Categories</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              roleFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {accounts.length}
          </span>
        </button>

        {CATEGORY_DEFINITIONS.map((cat) => {
          const Icon = cat.icon;
          const count = accounts.filter((a) => cat.roles.includes(a.role)).length;
          const isActive = roleFilter === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setRoleFilter(cat.key)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{cat.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts by name or email address..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-8 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher / Faculty</option>
              <option value="parent">Parent</option>
              <option value="guidance">Guidance Counselor</option>
              <option value="registrar">Registrar</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg whitespace-nowrap">
            Showing <span className="text-slate-900">{totalInCurrentView}</span> {totalInCurrentView === 1 ? 'account' : 'accounts'}
          </div>
        </div>
      </div>

      {/* Main Content Area - Categorized by User Role */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-xs">
          <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-3"></div>
          <p className="font-semibold text-slate-600 text-sm">Loading user accounts...</p>
          <p className="text-xs text-slate-400 mt-1">Retrieving categorized portal credentials</p>
        </div>
      ) : totalInCurrentView === 0 && search.trim() !== '' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
            <Search className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">No accounts found matching your search</h3>
            <p className="text-xs text-slate-400 mt-1">
              No results found for &ldquo;<span className="font-semibold text-slate-600">{search}</span>&rdquo;. Try searching by name, role, or email.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSearch('')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            Clear Search Filter
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeCategories.map((cat) => {
            const Icon = cat.icon;
            const categoryAccounts = searchedAccounts.filter((acc) => cat.roles.includes(acc.role));

            // If searching and this category has no matches, hide it
            if (search.trim() !== '' && categoryAccounts.length === 0) {
              return null;
            }

            return (
              <div
                key={cat.key}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
              >
                {/* Category Header Banner */}
                <div
                  className={`p-4 border-b ${cat.colorScheme.bannerBorder} ${cat.colorScheme.bannerBg} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${cat.colorScheme.iconBg}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-900 font-display">
                          {cat.label}
                        </h2>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${cat.colorScheme.badgeStyle}`}
                        >
                          {cat.singular}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      {categoryAccounts.length} {categoryAccounts.length === 1 ? 'Account' : 'Accounts'}
                    </span>
                    <button
                      type="button"
                      onClick={() => openCreateModalForRole(cat.defaultRole)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 px-3 py-1 rounded-full transition-colors cursor-pointer"
                      title={`Add new ${cat.singular} account`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add {cat.singular}</span>
                    </button>
                  </div>
                </div>

                {/* Table for this User Category */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-5 py-3">Account Holder</th>
                        <th className="px-5 py-3">Role</th>
                        <th className="px-5 py-3">Email Address / Login ID</th>
                        <th className="px-5 py-3">Registered Date</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {categoryAccounts.length > 0 ? (
                        categoryAccounts.map((acc) => (
                          <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Account Holder */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-black uppercase shrink-0 shadow-2xs ${cat.colorScheme.avatarBg}`}
                                >
                                  {getInitials(acc.first_name, acc.last_name, acc.email)}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 leading-snug">
                                    {acc.first_name || acc.last_name
                                      ? `${acc.first_name || ''} ${acc.last_name || ''}`.trim()
                                      : 'User'}
                                  </div>
                                  <div className="text-[10px] text-slate-400 capitalize font-medium">
                                    {acc.role} portal access
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Role Badge */}
                            <td className="px-5 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${cat.colorScheme.badgeStyle}`}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                                {acc.role}
                              </span>
                            </td>

                            {/* Email Address with Copy Button */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md">
                                  {acc.email}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyEmail(acc.email)}
                                  title="Copy email address"
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                  {copiedEmail === acc.email ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>

                            {/* Registered Date */}
                            <td className="px-5 py-3.5 text-slate-500 font-medium whitespace-nowrap">
                              {formatDate(acc.created_at)}
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-3.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleDelete(acc)}
                                className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                                title={`Delete ${acc.role} account`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            <p className="font-medium text-xs text-slate-500">
                              No {cat.label.toLowerCase()} found.
                            </p>
                            <button
                              type="button"
                              onClick={() => openCreateModalForRole(cat.defaultRole)}
                              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add first {cat.singular.toLowerCase()} account
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Fallback Unclassified Accounts (if any) */}
          {otherAccounts.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-800">Other User Accounts</h2>
                  <p className="text-xs text-slate-500">Accounts with custom or unclassified roles</p>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700">
                  {otherAccounts.length} Accounts
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-5 py-3">Account Holder</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Email Address</th>
                      <th className="px-5 py-3">Registered Date</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {otherAccounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          {acc.first_name || acc.last_name
                            ? `${acc.first_name || ''} ${acc.last_name || ''}`.trim()
                            : 'User'}
                        </td>
                        <td className="px-5 py-3.5 capitalize">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {acc.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-slate-600">{acc.email}</td>
                        <td className="px-5 py-3.5 text-slate-400">{formatDate(acc.created_at)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(acc)}
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Account Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New User Account"
        subtitle={
          isStudentRole
            ? 'Provision student portal credentials and fill out the learner enrollment information'
            : 'Provision portal credentials for faculty, students, or administrative staff'
        }
        maxWidth={isStudentRole ? '2xl' : 'lg'}
      >
        <form onSubmit={handleCreate} autoComplete="off" className="space-y-4">
          <input type="text" name="fake_acc_user_trap" autoComplete="username" className="hidden" tabIndex={-1} />
          <input type="password" name="fake_acc_pass_trap" autoComplete="current-password" className="hidden" tabIndex={-1} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                placeholder="First name"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                autoComplete="off"
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                placeholder="Last name"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="new_account_email_address"
              required
              readOnly
              onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
              autoComplete="off"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="user@gmail.com"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Password
            </label>
            <input
              type="password"
              name="new_account_initial_password"
              required
              readOnly
              onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Temporary password"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              User Role Classification
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            >
              <option value="student">🎓 Student (Learner)</option>
              <option value="teacher">👨‍🏫 Teacher / Faculty</option>
              <option value="parent">👨‍👩‍👧 Parent / Guardian</option>
              <option value="guidance">🛡️ Guidance Counselor</option>
              <option value="registrar">📋 Registrar &amp; Records</option>
              <option value="admin">👑 Administrator</option>
            </select>
          </div>

          {/* Student Enrollment Information (only for Student accounts) */}
          {isStudentRole && (
            <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-100 text-emerald-700">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-900">Enrollment Information</h4>
                  <p className="text-[11px] text-emerald-800/80">
                    Learner details filed as an enrollment record (status: Pending) for registrar verification.
                  </p>
                </div>
              </div>

              {/* Personal Details */}
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Personal Details</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className={ENROLL_LABEL_CLS}>Middle Name</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={enrollForm.middleName}
                      onChange={(e) => updateEnroll('middleName', e.target.value)}
                      placeholder="Middle name (optional)"
                      className={ENROLL_INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={ENROLL_LABEL_CLS}>Suffix</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={enrollForm.suffix}
                      onChange={(e) => updateEnroll('suffix', e.target.value)}
                      placeholder="Jr., III (optional)"
                      className={ENROLL_INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={ENROLL_LABEL_CLS}>
                      Date of Birth <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={enrollForm.dob}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => updateEnroll('dob', e.target.value)}
                      className={ENROLL_INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={ENROLL_LABEL_CLS}>
                      Sex <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={enrollForm.gender}
                      onChange={(e) => updateEnroll('gender', e.target.value)}
                      className={ENROLL_INPUT_CLS}
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className={ENROLL_LABEL_CLS}>Contact Number</label>
                    <input
                      type="tel"
                      autoComplete="off"
                      value={enrollForm.contactNumber}
                      onChange={(e) => updateEnroll('contactNumber', e.target.value)}
                      placeholder="09XX XXX XXXX"
                      className={ENROLL_INPUT_CLS}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className={ENROLL_LABEL_CLS}>
                      Home Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={enrollForm.address}
                      onChange={(e) => updateEnroll('address', e.target.value)}
                      placeholder="House No. / Street, Barangay, City / Municipality, Province"
                      className={ENROLL_INPUT_CLS}
                    />
                  </div>
                </div>
              </div>

              {/* Academic Placement */}
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Academic Placement</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className={ENROLL_LABEL_CLS}>
                      Student Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={enrollForm.studentType}
                      onChange={(e) => updateEnroll('studentType', e.target.value)}
                      className={ENROLL_INPUT_CLS}
                    >
                      {STUDENT_TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={ENROLL_LABEL_CLS}>
                      Grade Level <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={enrollForm.gradeLevel}
                      onChange={(e) => {
                        const grade = e.target.value;
                        setEnrollForm((prev) => ({
                          ...prev,
                          gradeLevel: grade,
                          strand: grade === 'Grade 11' || grade === 'Grade 12' ? prev.strand : '',
                        }));
                      }}
                      className={ENROLL_INPUT_CLS}
                    >
                      {GRADE_LEVEL_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={ENROLL_LABEL_CLS}>
                      School Year <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={enrollForm.schoolYear}
                      onChange={(e) => updateEnroll('schoolYear', e.target.value)}
                      placeholder="e.g., 2026-2027"
                      className={ENROLL_INPUT_CLS}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className={ENROLL_LABEL_CLS}>
                        Learner Reference Number (LRN) <span className="text-rose-500">*</span>
                      </label>
                      {isEnrollLrnManual ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                          ✍️ Manual Entry ({enrollForm.studentType === 'Transferee' ? 'Transferee' : enrollForm.gradeLevel})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                          <Sparkles className="h-3 w-3 text-emerald-600" />
                          Auto-Populated ({enrollForm.gradeLevel})
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={12}
                      readOnly={!isEnrollLrnManual}
                      value={enrollForm.lrn}
                      onChange={(e) => {
                        if (isEnrollLrnManual) {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                          updateEnroll('lrn', digits);
                        }
                      }}
                      placeholder={
                        isEnrollLrnManual
                          ? 'Enter 12-digit DepEd LRN (e.g., 119518123456)'
                          : 'Auto-populated institutional LRN...'
                      }
                      className={`${ENROLL_INPUT_CLS} font-mono tracking-wider font-semibold ${
                        !isEnrollLrnManual ? 'bg-slate-100/90 text-slate-800 cursor-not-allowed select-all' : 'bg-white'
                      }`}
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      {isEnrollLrnManual
                        ? 'DepEd Rule: Grade 7 and Transferee students require manual 12-digit LRN entry from Form 138/SF9.'
                        : 'DepEd Rule: Grades 8–12 continuing students have their 12-digit LRN automatically populated.'}
                    </p>
                  </div>
                  {isSeniorHighGrade && (
                    <div className="sm:col-span-3">
                      <label className={ENROLL_LABEL_CLS}>
                        SHS Strand <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={enrollForm.strand}
                        onChange={(e) => updateEnroll('strand', e.target.value)}
                        className={ENROLL_INPUT_CLS}
                      >
                        <option value="">Select strand</option>
                        {STRAND_OPTIONS.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className={ENROLL_LABEL_CLS}>Last School Attended</label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={enrollForm.previousSchool}
                      onChange={(e) => updateEnroll('previousSchool', e.target.value)}
                      placeholder="Previous school (optional)"
                      className={ENROLL_INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={ENROLL_LABEL_CLS}>General Average</label>
                    <input
                      type="number"
                      min={60}
                      max={100}
                      step="0.01"
                      value={enrollForm.generalAverage}
                      onChange={(e) => updateEnroll('generalAverage', e.target.value)}
                      placeholder="e.g., 89.50"
                      className={ENROLL_INPUT_CLS}
                    />
                  </div>
                </div>
              </div>

              {/* Parent / Guardian */}
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Parent / Guardian</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className={ENROLL_LABEL_CLS}>
                      Guardian Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={enrollForm.guardianName}
                      onChange={(e) => updateEnroll('guardianName', e.target.value)}
                      placeholder="Full name"
                      className={ENROLL_INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label className={ENROLL_LABEL_CLS}>Relationship</label>
                    <select
                      value={enrollForm.guardianRelationship}
                      onChange={(e) => updateEnroll('guardianRelationship', e.target.value)}
                      className={ENROLL_INPUT_CLS}
                    >
                      <option value="">Select</option>
                      {GUARDIAN_RELATIONSHIP_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={ENROLL_LABEL_CLS}>
                      Guardian Contact <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      autoComplete="off"
                      value={enrollForm.guardianContact}
                      onChange={(e) => updateEnroll('guardianContact', e.target.value)}
                      placeholder="09XX XXX XXXX"
                      className={ENROLL_INPUT_CLS}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Account Deletion Modal with Required Reason */}
      {deletingAccount && (
        <Modal
          isOpen={!!deletingAccount}
          onClose={() => {
            setDeletingAccount(null);
            setDeleteReasonCategory('');
            setDeleteReasonNotes('');
          }}
          title="Confirm Account Deletion"
          subtitle="A valid reason is required to delete a user account"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1.5">
              <p className="font-bold text-sm text-rose-900">
                Are you sure you want to delete this account?
              </p>
              <p className="leading-relaxed">
                You are about to permanently remove the{' '}
                <strong className="capitalize">{deletingAccount.role}</strong> account for{' '}
                <strong>
                  {`${deletingAccount.first_name || ''} ${deletingAccount.last_name || ''}`.trim() ||
                    deletingAccount.email}
                </strong>{' '}
                (<span className="font-mono">{deletingAccount.email}</span>).
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                Reason for Deletion <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={deleteReasonCategory}
                onChange={(e) => setDeleteReasonCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-800 focus:border-rose-600 focus:bg-white focus:outline-hidden"
              >
                <option value="">— Select Reason for Deletion —</option>
                <option value="Transferred / Left School">Transferred / Left School</option>
                <option value="Resigned / Retired / End of Term">
                  Resigned / Retired / End of Term
                </option>
                <option value="Graduated / Completed Studies">
                  Graduated / Completed Studies
                </option>
                <option value="Duplicate / Erroneous Account">
                  Duplicate / Erroneous Account
                </option>
                <option value="Security / Policy Violation">
                  Security / Policy Violation
                </option>
                <option value="Other (Specify Below)">Other (Specify Below)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                Additional Remarks / Explanation{' '}
                {deleteReasonCategory === 'Other (Specify Below)' && (
                  <span className="text-rose-500">*</span>
                )}
              </label>
              <textarea
                rows={3}
                value={deleteReasonNotes}
                onChange={(e) => setDeleteReasonNotes(e.target.value)}
                placeholder="Enter official reason or remarks for audit log..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs font-medium text-slate-800 focus:border-rose-600 focus:bg-white focus:outline-hidden resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeletingAccount(null);
                  setDeleteReasonCategory('');
                  setDeleteReasonNotes('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  deleteLoading ||
                  !deleteReasonCategory ||
                  (deleteReasonCategory === 'Other (Specify Below)' && !deleteReasonNotes.trim())
                }
                onClick={handleConfirmDeleteAccount}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{deleteLoading ? 'Deleting...' : 'Confirm & Delete Account'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
