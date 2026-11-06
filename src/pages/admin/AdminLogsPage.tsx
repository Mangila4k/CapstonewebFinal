import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import {
  FileText,
  Search,
  Clock,
  Shield,
  LogIn,
  LogOut,
  UserPlus,
  Trash2,
  RefreshCw,
  Camera,
  Activity,
  CheckCircle2,
  Users,
  GraduationCap,
  Briefcase,
  QrCode,
  Download,
  ShieldCheck,
  User,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDateTime } from '../../lib/utils';
import type { ActivityLog } from '../../types';

interface ParsedLogItem extends ActivityLog {
  parsedName: string;
  parsedEmail: string;
  displayRole: string;
  cleanDetails: string;
}

interface RoleCategoryConfig {
  key: string;
  label: string;
  singular: string;
  description: string;
  roles: string[];
  icon: React.ElementType;
  badgeStyle: string;
  avatarBg: string;
  bannerBg: string;
  bannerBorder: string;
  iconBg: string;
}

const ROLE_CATEGORIES: RoleCategoryConfig[] = [
  {
    key: 'admin',
    label: 'Administrator & System Activities',
    singular: 'Administrator',
    description: 'System administration, user credential management, and portal configuration',
    roles: ['admin', 'principal'],
    icon: ShieldCheck,
    badgeStyle: 'border-rose-200 bg-rose-50 text-rose-700',
    avatarBg: 'bg-rose-100 text-rose-800 border-rose-200',
    bannerBg: 'bg-rose-50/70',
    bannerBorder: 'border-rose-200',
    iconBg: 'bg-rose-100 text-rose-700 border-rose-200',
  },
  {
    key: 'teacher',
    label: 'Faculty & Teacher Activities',
    singular: 'Teacher',
    description: 'Faculty portal authentications, biometric registrations, and daily attendance logs',
    roles: ['teacher'],
    icon: Briefcase,
    badgeStyle: 'border-purple-200 bg-purple-50 text-purple-700',
    avatarBg: 'bg-purple-100 text-purple-800 border-purple-200',
    bannerBg: 'bg-purple-50/70',
    bannerBorder: 'border-purple-200',
    iconBg: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  {
    key: 'student',
    label: 'Student & Learner Activities',
    singular: 'Student',
    description: 'Learner portal logins, QR attendance scans, and enrollment interactions',
    roles: ['student'],
    icon: GraduationCap,
    badgeStyle: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    avatarBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    bannerBg: 'bg-emerald-50/70',
    bannerBorder: 'border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  {
    key: 'registrar',
    label: 'Registrar & Admissions Activities',
    singular: 'Registrar',
    description: 'Academic records management, admission sessions, and enrollment approvals',
    roles: ['registrar'],
    icon: FileText,
    badgeStyle: 'border-blue-200 bg-blue-50 text-blue-700',
    avatarBg: 'bg-blue-100 text-blue-800 border-blue-200',
    bannerBg: 'bg-blue-50/70',
    bannerBorder: 'border-blue-200',
    iconBg: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  {
    key: 'parent',
    label: 'Parent & Guardian Activities',
    singular: 'Parent',
    description: 'Parent-Teacher Association (PTA) logins and guardian portal sessions',
    roles: ['parent'],
    icon: Users,
    badgeStyle: 'border-amber-200 bg-amber-50 text-amber-700',
    avatarBg: 'bg-amber-100 text-amber-800 border-amber-200',
    bannerBg: 'bg-amber-50/70',
    bannerBorder: 'border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  {
    key: 'guidance',
    label: 'Guidance & Counseling Activities',
    singular: 'Guidance Counselor',
    description: 'Counseling logs, student welfare monitoring, and behavioral records',
    roles: ['guidance'],
    icon: Shield,
    badgeStyle: 'border-teal-200 bg-teal-50 text-teal-700',
    avatarBg: 'bg-teal-100 text-teal-800 border-teal-200',
    bannerBg: 'bg-teal-50/70',
    bannerBorder: 'border-teal-200',
    iconBg: 'bg-teal-100 text-teal-700 border-teal-200',
  },
];

export const AdminLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch logs from Supabase with local cache fallback & merge
  const fetchLogs = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    setIsRefreshing(true);

    try {
      // 1. Fetch from Supabase activity_logs table ordered by timestamp
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(250);

      let fetchedList: ActivityLog[] = [];
      if (!error && data) {
        fetchedList = data;
      }

      // 2. Fetch from local cache fallback
      try {
        const localRaw = localStorage.getItem('hes_activities');
        if (localRaw) {
          const localList: ActivityLog[] = JSON.parse(localRaw);
          if (Array.isArray(localList)) {
            localList.forEach((localItem) => {
              const exists = fetchedList.some(
                (f) =>
                  String(f.id) === String(localItem.id) ||
                  (f.action === localItem.action &&
                    (f.timestamp || f.created_at) === (localItem.timestamp || localItem.created_at))
              );
              if (!exists) {
                fetchedList.push(localItem);
              }
            });
          }
        }
      } catch {
        // ignore
      }

      // Sort combined list by timestamp descending
      fetchedList.sort((a, b) => {
        const timeA = new Date(a.timestamp || a.created_at || 0).getTime();
        const timeB = new Date(b.timestamp || b.created_at || 0).getTime();
        return timeB - timeA;
      });

      setLogs(fetchedList);
    } catch (err) {
      console.warn('Error fetching logs:', err);
    } finally {
      if (showLoadingSpinner) setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(true);

    // Subscribe to real-time changes
    const channel = supabase
      .channel('realtime-audit-logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_logs' },
        () => {
          fetchLogs(false);
        }
      )
      .subscribe();

    const handleLocalEvent = () => fetchLogs(false);
    window.addEventListener('plsnhs-activity-logged', handleLocalEvent);
    window.addEventListener('storage', handleLocalEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('plsnhs-activity-logged', handleLocalEvent);
      window.removeEventListener('storage', handleLocalEvent);
    };
  }, [fetchLogs]);

  // Clean log parser
  const parsedLogs: ParsedLogItem[] = useMemo(() => {
    return logs.map((log) => {
      const details = log.details || '';
      const action = log.action || '';
      let name = '';
      let email = '';
      let subtext = '';
      let role = (log.role || log.user_role || 'user').toLowerCase();
      let cleanDetails = details;

      if (action === 'Face Biometrics Registered') {
        const match = details.match(/for\s+([^(]+)(?:\(([^)]+)\))?/i);
        if (match) {
          name = match[1].trim();
          subtext = match[2] ? match[2].trim() : '';
        }
        role = 'teacher';
        cleanDetails = 'Registered facial recognition biometric template for automated attendance kiosk.';
      } else if (action === 'Teacher Time In' || action === 'Teacher Time Out') {
        const nameMatch = details.match(/(?:Teacher\s+)?([A-Za-z\s]+?)\s+(?:recorded|validated)/i);
        if (nameMatch) {
          name = nameMatch[1].trim();
        }
        role = 'teacher';
        const validationMatch =
          details.match(/Validation:\s*([^)]+(?:\)[^)]*)?)/i) ||
          details.match(/Validated via\s*([^.]+)/i);
        const method = validationMatch ? validationMatch[1].trim() : 'Direct Validation';
        cleanDetails =
          action === 'Teacher Time In'
            ? `Recorded official faculty attendance Time-In (${method}).`
            : `Recorded official faculty attendance Time-Out (${method}).`;
      } else if (action.includes('Student QR Attendance')) {
        const match = details.match(/Student\s+([^(]+)(?:\(LRN:\s*([^)]+)\))?/i);
        if (match) {
          name = match[1].trim();
          subtext = match[2] ? `LRN: ${match[2].trim()}` : '';
        }
        role = 'student';
        cleanDetails = 'Daily attendance recorded as Present via QR Scanner.';
      } else if (action === 'User Login' || action === 'User Logout') {
        const emailMatch = details.match(/\(([^)]+@[^)]+)\)/);
        email = emailMatch ? emailMatch[1] : '';
        const nameMatch = details.match(/^([^(]+)\s*\(/);
        name = nameMatch ? nameMatch[1].trim() : (email ? email.split('@')[0] : 'User');
        cleanDetails =
          action === 'User Login'
            ? 'Authenticated into portal session via Web Application.'
            : 'Terminated active portal session.';
      } else if (action === 'Account Created') {
        const emailMatch = details.match(/\(([^)]+@[^)]+)\)/);
        if (emailMatch) email = emailMatch[1];
        cleanDetails = details.replace(/Admin created new/i, 'Provisioned new');
      } else if (action.includes('Announcement')) {
        name = 'School Administration';
        role = 'admin';
        cleanDetails = 'Removed or archived official campus circular notice.';
      } else {
        const emailMatch = details.match(/\(([^)]+@[^)]+)\)/);
        if (emailMatch) email = emailMatch[1];
        const nameMatch = details.match(/^([^(]+)\s*\(/);
        if (nameMatch) name = nameMatch[1].trim();
      }

      // Title case name
      if (name) {
        name = name
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
      } else {
        name = email ? email.split('@')[0] : 'System User';
      }

      return {
        ...log,
        parsedName: name,
        parsedEmail: email || subtext,
        displayRole: role,
        cleanDetails,
      };
    });
  }, [logs]);

  // Live Role Counts
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    parsedLogs.forEach((l) => {
      const r = l.displayRole;
      counts[r] = (counts[r] || 0) + 1;
    });
    return counts;
  }, [parsedLogs]);

  // Filtered logs based on search and action
  const filteredLogs = useMemo(() => {
    return parsedLogs.filter((l) => {
      const q = search.trim().toLowerCase();
      const action = (l.action || '').toLowerCase();
      const email = (l.parsedEmail || '').toLowerCase();
      const name = (l.parsedName || '').toLowerCase();
      const role = l.displayRole.toLowerCase();
      const details = (l.cleanDetails || l.details || '').toLowerCase();

      // Search matching
      const matchesSearch =
        !q ||
        action.includes(q) ||
        email.includes(q) ||
        name.includes(q) ||
        role.includes(q) ||
        details.includes(q);

      if (!matchesSearch) return false;

      // Role filter
      if (roleFilter !== 'all') {
        const cat = ROLE_CATEGORIES.find((c) => c.key === roleFilter);
        if (cat) {
          if (!cat.roles.includes(role)) return false;
        } else if (role !== roleFilter) {
          return false;
        }
      }

      // Action filter
      if (actionFilter === 'login' && !action.includes('login')) return false;
      if (actionFilter === 'logout' && !action.includes('logout')) return false;
      if (
        actionFilter === 'attendance' &&
        !action.includes('time') &&
        !action.includes('attendance')
      )
        return false;
      if (actionFilter === 'biometric' && !action.includes('biometric') && !action.includes('face'))
        return false;
      if (
        actionFilter === 'account' &&
        !action.includes('account') &&
        !action.includes('user') &&
        !action.includes('delete') &&
        !action.includes('created')
      )
        return false;

      return true;
    });
  }, [parsedLogs, search, roleFilter, actionFilter]);

  // Categories to display based on active roleFilter
  const activeCategories = useMemo(() => {
    if (roleFilter === 'all') {
      return ROLE_CATEGORIES;
    }
    return ROLE_CATEGORIES.filter(
      (cat) => cat.key === roleFilter || cat.roles.includes(roleFilter)
    );
  }, [roleFilter]);

  // Format relative time helper
  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return '';
  };

  // Get Initials for avatar
  const getInitials = (name?: string, email?: string) => {
    if (name && name !== 'System User' && name !== 'School Administration') {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return email ? email.slice(0, 2).toUpperCase() : 'PL';
  };

  // Render Action Badge
  const renderActionBadge = (action: string) => {
    const act = (action || '').toLowerCase();

    if (act.includes('login')) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
          <LogIn className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>User Login</span>
        </span>
      );
    }
    if (act.includes('logout')) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
          <LogOut className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          <span>User Logout</span>
        </span>
      );
    }
    if (act.includes('time in')) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-800">
          <Clock className="h-3.5 w-3.5 text-purple-600 shrink-0" />
          <span>Teacher Time In</span>
        </span>
      );
    }
    if (act.includes('time out')) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800">
          <Clock className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          <span>Teacher Time Out</span>
        </span>
      );
    }
    if (act.includes('qr attendance')) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-800">
          <QrCode className="h-3.5 w-3.5 text-teal-600 shrink-0" />
          <span>QR Attendance</span>
        </span>
      );
    }
    if (act.includes('created') || act.includes('add')) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800">
          <UserPlus className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          <span>{action}</span>
        </span>
      );
    }
    if (act.includes('delete') || act.includes('remove')) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800">
          <Trash2 className="h-3.5 w-3.5 text-rose-600 shrink-0" />
          <span>{action}</span>
        </span>
      );
    }
    if (act.includes('biometric') || act.includes('face')) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-800">
          <Camera className="h-3.5 w-3.5 text-violet-600 shrink-0" />
          <span>Biometrics Enrolled</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
        <Activity className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        <span>{action}</span>
      </span>
    );
  };

  // Export CSV Handler
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const headers = [
      'Timestamp',
      'Action Type',
      'User Name',
      'Identifier / Email',
      'Role',
      'Details',
    ];
    const rows = filteredLogs.map((l) => [
      `"${new Date(l.timestamp || l.created_at || '').toLocaleString()}"`,
      `"${l.action || ''}"`,
      `"${l.parsedName || ''}"`,
      `"${l.parsedEmail || ''}"`,
      `"${l.displayRole.toUpperCase()}"`,
      `"${(l.cleanDetails || l.details || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `PLSNHS_System_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-28">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            System Activity Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Chronological audit trail categorized by user role for administrative security and compliance.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
            title="Export filtered audit logs as CSV"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => fetchLogs(false)}
            disabled={isRefreshing}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-50"
            title="Refresh latest system audit logs"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Logs'}</span>
          </button>

          <PageHeaderNotificationSlot />
        </div>
      </div>

      {/* Role Metrics Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Audit Logs
            </span>
            <Activity className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-display">
            {parsedLogs.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Chronological records across all roles</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Administrators
            </span>
            <ShieldCheck className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700 font-display">
            {roleCounts['admin'] || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Admin &amp; principal portal logs</p>
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
          <p className="text-[11px] text-slate-400 mt-0.5">Time In/Out, Biometrics &amp; logins</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Students, Parents &amp; Staff
            </span>
            <GraduationCap className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 font-display">
            {(roleCounts['student'] || 0) +
              (roleCounts['parent'] || 0) +
              (roleCounts['registrar'] || 0) +
              (roleCounts['guidance'] || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Learners, parents &amp; registrar records</p>
        </div>
      </div>

      {/* Role Category Filter Tabs */}
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
          <span>All User Roles</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              roleFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {parsedLogs.length}
          </span>
        </button>

        {ROLE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = roleCounts[cat.key] || 0;
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
              <span>{cat.singular} Logs</span>
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
            placeholder="Search logs by user name, action, or details..."
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

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {/* Action Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Action:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Actions</option>
              <option value="login">User Login</option>
              <option value="logout">User Logout</option>
              <option value="attendance">Attendance (Time In/Out)</option>
              <option value="biometric">Face Biometrics</option>
              <option value="account">Account Operations</option>
            </select>
          </div>

          {/* Role Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrator</option>
              <option value="teacher">Teacher / Faculty</option>
              <option value="student">Student</option>
              <option value="registrar">Registrar</option>
              <option value="parent">Parent</option>
              <option value="guidance">Guidance</option>
            </select>
          </div>

          <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg whitespace-nowrap">
            Showing <span className="text-slate-900">{filteredLogs.length}</span> matching
          </div>
        </div>
      </div>

      {/* Main Content Area - Categorized by User Role */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-14 text-center text-slate-400 shadow-xs">
          <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-2"></div>
          <p className="font-semibold text-slate-600 text-sm">Loading activity audit trail...</p>
          <p className="text-xs text-slate-400 mt-0.5">Fetching latest system logs and authentication events</p>
        </div>
      ) : filteredLogs.length === 0 && search.trim() !== '' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-400 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400 mb-3">
            <Search className="h-6 w-6" />
          </div>
          <p className="font-bold text-slate-700 text-sm">No activity logs found matching &ldquo;{search}&rdquo;.</p>
          <p className="text-xs text-slate-400 mt-1">Try searching by another name, action, or reset your filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setRoleFilter('all');
              setActionFilter('all');
            }}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeCategories.map((cat) => {
            const Icon = cat.icon;
            const categoryLogs = filteredLogs.filter((l) => cat.roles.includes(l.displayRole));

            // If searching and this category has no matches, hide it
            if (search.trim() !== '' && categoryLogs.length === 0) {
              return null;
            }

            return (
              <div
                key={cat.key}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
              >
                {/* Category Header Banner */}
                <div
                  className={`p-4 border-b ${cat.bannerBorder} ${cat.bannerBg} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${cat.iconBg}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-extrabold text-slate-900 font-display">
                          {cat.label}
                        </h2>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${cat.badgeStyle}`}
                        >
                          {cat.singular}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{cat.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      {categoryLogs.length} {categoryLogs.length === 1 ? 'Record' : 'Records'}
                    </span>
                  </div>
                </div>

                {/* Table for this User Role */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-5 py-3.5 w-48">Timestamp</th>
                        <th className="px-5 py-3.5 w-52">Action Type</th>
                        <th className="px-5 py-3.5 w-64">User &amp; Classification</th>
                        <th className="px-5 py-3.5">Activity Details</th>
                        <th className="px-5 py-3.5 w-24 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {categoryLogs.length > 0 ? (
                        categoryLogs.map((log) => {
                          const logTime = log.timestamp || log.created_at;
                          const relativeTime = getRelativeTime(logTime);

                          return (
                            <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Timestamp */}
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                  <div>
                                    <div className="font-mono text-xs font-semibold text-slate-700">
                                      {formatDateTime(logTime)}
                                    </div>
                                    {relativeTime && (
                                      <div className="text-[10px] font-bold text-emerald-600 mt-0.5">
                                        {relativeTime}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Action Type */}
                              <td className="px-5 py-3.5 whitespace-nowrap">
                                {renderActionBadge(log.action)}
                              </td>

                              {/* User & Role */}
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-black uppercase shrink-0 shadow-2xs ${cat.avatarBg}`}
                                  >
                                    {getInitials(log.parsedName, log.parsedEmail)}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 leading-snug">
                                      {log.parsedName}
                                    </div>
                                    {log.parsedEmail && (
                                      <div className="font-mono text-[11px] text-slate-500">
                                        {log.parsedEmail}
                                      </div>
                                    )}
                                    <div className="mt-1">
                                      <span
                                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${cat.badgeStyle}`}
                                      >
                                        <Icon className="h-2.5 w-2.5" />
                                        {cat.singular}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Details */}
                              <td className="px-5 py-3.5 text-slate-600 font-medium leading-relaxed">
                                {log.cleanDetails || log.details || '—'}
                              </td>

                              {/* Status */}
                              <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  Logged
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            <p className="font-medium text-xs text-slate-500">
                              No {cat.label.toLowerCase()} recorded.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
