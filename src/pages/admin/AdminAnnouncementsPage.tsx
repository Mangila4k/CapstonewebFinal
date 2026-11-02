import React, { useState, useEffect, useMemo } from 'react';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import {
  Bell,
  Plus,
  Trash2,
  Calendar,
  User,
  Send,
  Megaphone,
  CheckCircle2,
  Eye,
  Users,
  Building2,
  Search,
  GraduationCap,
  UserCheck,
  LayoutGrid,
  List,
  ShieldCheck,
  Printer,
  Sparkles,
  AlertTriangle,
  X,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Alert } from '../../components/common/Alert';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import type { Announcement } from '../../types';

const LOCAL_BROADCAST_KEY = 'plsnhs_broadcast_notifications';

export const AdminAnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDirectNotifOpen, setIsDirectNotifOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search, Filter & View Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<
    'all' | 'students' | 'parents' | 'teachers' | 'important'
  >('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const { user } = useAuth();

  const [form, setForm] = useState({
    title: '',
    content: '',
    targetAudience: 'all' as 'all' | 'students' | 'teachers' | 'parents' | 'guidance' | 'registrar',
    priority: 'important' as 'low' | 'medium' | 'high' | 'urgent' | 'important',
    notifyUsersImmediately: true,
  });

  const [directForm, setDirectForm] = useState({
    title: '',
    message: '',
    recipientType: 'all' as
      | 'all'
      | 'student'
      | 'parent'
      | 'teacher'
      | 'registrar'
      | 'guidance'
      | 'specific',
    targetUserId: '',
    priority: 'important' as 'normal' | 'important' | 'urgent',
  });

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const seen = new Set<string>();
        const unique = data.filter((a: any) => {
          const sig = `${(a.title || '').trim().toLowerCase()}|${(a.content || '')
            .trim()
            .toLowerCase()}`;
          if (seen.has(sig)) return false;
          seen.add(sig);
          return true;
        });
        setAnnouncements(unique);
      }
    } catch (err) {
      console.warn('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role')
        .limit(100);
      if (data) setUsersList(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchUsers();
  }, []);

  const broadcastNotificationToUsers = async (params: {
    title: string;
    content: string;
    targetAudience: string;
    priority: string;
    targetUserId?: string;
  }) => {
    const senderName = user?.full_name || 'Placido L. Señor NHS Administration';
    const nowIso = new Date().toISOString();

    // 1. Save to local broadcast storage and fire real-time window event
    try {
      const raw = localStorage.getItem(LOCAL_BROADCAST_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const newLocalNotif = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: params.title,
        content: params.content,
        message: params.content,
        target_audience: params.targetAudience,
        target_user_id: params.targetUserId || null,
        priority: params.priority,
        author: senderName,
        created_at: nowIso,
      };
      list.unshift(newLocalNotif);
      localStorage.setItem(LOCAL_BROADCAST_KEY, JSON.stringify(list.slice(0, 80)));

      window.dispatchEvent(
        new CustomEvent('plsnhs:notification-sent', { detail: newLocalNotif })
      );
    } catch {
      // ignore storage errors
    }

    // 2. Also insert into Supabase `notifications` table if available
    try {
      const roleMap: Record<string, string> = {
        all: 'all',
        students: 'student',
        student: 'student',
        parents: 'parent',
        parent: 'parent',
        teachers: 'teacher',
        teacher: 'teacher',
        registrar: 'registrar',
        guidance: 'guidance',
      };

      const notifPayload: Record<string, any> = {
        title: params.title,
        message: params.content,
        role: roleMap[params.targetAudience] || params.targetAudience || 'all',
        user_id: params.targetUserId || null,
        sender: senderName,
        priority: params.priority,
        read: false,
        is_read: false,
        created_at: nowIso,
      };

      await supabase.from('notifications').insert([notifPayload]);
    } catch {
      // gracefully ignore if notifications table schema differs
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        author: user?.full_name || 'Placido L. Señor NHS Administration',
        role: user?.role || 'admin',
        target_audience: form.targetAudience,
        priority: form.priority,
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('announcements').insert([payload]);
      if (error) throw new Error(error.message);

      if (form.notifyUsersImmediately) {
        await broadcastNotificationToUsers({
          title: payload.title,
          content: payload.content,
          targetAudience: form.targetAudience,
          priority: form.priority,
        });
      }

      setNotice({
        type: 'success',
        message:
          'Announcement published and notification sent to target users successfully.',
      });
      setIsModalOpen(false);
      setForm({
        title: '',
        content: '',
        targetAudience: 'all',
        priority: 'important',
        notifyUsersImmediately: true,
      });
      fetchAnnouncements();
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Failed to publish announcement',
      });
    }
  };

  const handleSendDirectNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const title = directForm.title.trim();
      const content = directForm.message.trim();
      const targetAudience =
        directForm.recipientType === 'specific' ? 'all' : directForm.recipientType;
      const targetUserId =
        directForm.recipientType === 'specific' ? directForm.targetUserId : undefined;

      await broadcastNotificationToUsers({
        title,
        content,
        targetAudience,
        priority: directForm.priority,
        targetUserId,
      });

      setNotice({
        type: 'success',
        message:
          directForm.recipientType === 'specific'
            ? 'Direct notification delivered to selected user.'
            : `Notification broadcast delivered to ${
                directForm.recipientType === 'all'
                  ? 'all portal users'
                  : directForm.recipientType + 's'
              }.`,
      });
      setIsDirectNotifOpen(false);
      setDirectForm({
        title: '',
        message: '',
        recipientType: 'all',
        targetUserId: '',
        priority: 'important',
      });
      fetchAnnouncements();
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Failed to send notification.',
      });
    }
  };

  const handlePushExistingAnnouncement = async (item: any, e: React.MouseEvent) => {
    e.stopPropagation();
    await broadcastNotificationToUsers({
      title: item.title,
      content: item.content,
      targetAudience: item.target_audience || 'all',
      priority: item.priority || 'important',
    });
    setNotice({
      type: 'success',
      message: `Notification alert for "${item.title}" sent to ${
        item.target_audience || 'all'
      } users.`,
    });
  };

  const handleDelete = async (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this announcement?')) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setNotice({ type: 'success', message: 'Announcement deleted.' });
      fetchAnnouncements();
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Could not delete.' });
    }
  };

  // Metrics overview calculation
  const metrics = useMemo(() => {
    let total = announcements.length;
    let studentsCount = 0;
    let parentsCount = 0;
    let teachersCount = 0;
    let importantCount = 0;

    announcements.forEach((a) => {
      const aud = (a.target_audience || '').toLowerCase();
      const pri = (a.priority || '').toLowerCase();

      if (aud.includes('student') || aud === 'all') studentsCount++;
      if (aud.includes('parent') || aud === 'all') parentsCount++;
      if (aud.includes('teacher') || aud.includes('faculty') || aud === 'all') teachersCount++;
      if (pri === 'urgent' || pri === 'important' || pri === 'high') importantCount++;
    });

    return { total, studentsCount, parentsCount, teachersCount, importantCount };
  }, [announcements]);

  // Filtered announcements list
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      if (audienceFilter === 'students') {
        const aud = (item.target_audience || '').toLowerCase();
        if (!aud.includes('student') && aud !== 'all') return false;
      } else if (audienceFilter === 'parents') {
        const aud = (item.target_audience || '').toLowerCase();
        if (!aud.includes('parent') && aud !== 'all') return false;
      } else if (audienceFilter === 'teachers') {
        const aud = (item.target_audience || '').toLowerCase();
        if (!aud.includes('teacher') && !aud.includes('faculty') && aud !== 'all') return false;
      } else if (audienceFilter === 'important') {
        const pri = (item.priority || '').toLowerCase();
        if (pri !== 'important' && pri !== 'urgent' && pri !== 'high') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (item.title || '').toLowerCase().includes(q);
        const matchContent = (item.content || '').toLowerCase().includes(q);
        const matchAudience = (item.target_audience || '').toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchAudience) return false;
      }

      return true;
    });
  }, [announcements, audienceFilter, searchQuery]);

  // Audience helper badge rendering
  const renderAudienceBadge = (targetAudience?: string) => {
    const raw = String(targetAudience || 'all').toLowerCase();
    if (raw.includes('student')) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-800">
          <GraduationCap className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          Students
        </span>
      );
    }
    if (raw.includes('parent')) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800">
          <Users className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          Parents &amp; PTA
        </span>
      );
    }
    if (raw.includes('teacher') || raw.includes('faculty')) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-800">
          <UserCheck className="h-3.5 w-3.5 text-purple-600 shrink-0" />
          Faculty &amp; Staff
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
        <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        Campus-Wide
      </span>
    );
  };

  // Priority indicator rendering
  const renderPriorityBadge = (priority?: string) => {
    const pri = String(priority || 'normal').toLowerCase();
    if (pri === 'urgent') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
          Urgent
        </span>
      );
    }
    if (pri === 'important' || pri === 'high') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Important
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        General
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight">
            Campus Announcements &amp; Circulars
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Publish official school circulars, manage campus bulletins, and broadcast real-time alerts to students, parents, and faculty.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New Announcement
          </button>
          <PageHeaderNotificationSlot />
        </div>
      </div>

      {notice && (
        <Alert
          type={notice.type}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}

      {/* Executive Overview Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Circulars
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Megaphone className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-display text-slate-900">
              {metrics.total}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">Published</span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">Active campus bulletins</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Student Advisories
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <GraduationCap className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-display text-blue-900">
              {metrics.studentsCount}
            </span>
            <span className="text-[11px] font-semibold text-blue-600">Learners</span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">Academic &amp; exam notices</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Parent Circulars
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Users className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-display text-amber-900">
              {metrics.parentsCount}
            </span>
            <span className="text-[11px] font-semibold text-amber-600">PTA &amp; Home</span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">Assembly &amp; card releases</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:shadow-xs transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Faculty Memos
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
              <UserCheck className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black font-display text-purple-900">
              {metrics.teachersCount}
            </span>
            <span className="text-[11px] font-semibold text-purple-600">Personnel</span>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">Staff &amp; teacher meetings</p>
        </div>
      </div>

      {/* Control Bar: Filter Tabs, Search Bar & View Mode Toggle */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        {/* Audience Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setAudienceFilter('all')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              audienceFilter === 'all'
                ? 'bg-[#1B2A4A] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            All Circulars ({metrics.total})
          </button>

          <button
            type="button"
            onClick={() => setAudienceFilter('students')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              audienceFilter === 'students'
                ? 'bg-blue-700 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-blue-50 hover:text-blue-800'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            Students ({metrics.studentsCount})
          </button>

          <button
            type="button"
            onClick={() => setAudienceFilter('parents')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              audienceFilter === 'parents'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-amber-50 hover:text-amber-800'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Parents &amp; PTA ({metrics.parentsCount})
          </button>

          <button
            type="button"
            onClick={() => setAudienceFilter('teachers')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              audienceFilter === 'teachers'
                ? 'bg-purple-700 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-purple-50 hover:text-purple-800'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Faculty ({metrics.teachersCount})
          </button>

          <button
            type="button"
            onClick={() => setAudienceFilter('important')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              audienceFilter === 'important'
                ? 'bg-rose-700 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-rose-50 hover:text-rose-800'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Important ({metrics.importantCount})
          </button>
        </div>

        {/* Search Input & View Switcher */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search circulars by title..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`rounded-lg p-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Grid View or Table View */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-slate-400">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-2"></div>
          <p className="text-xs font-semibold text-slate-600">Loading campus circulars...</p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-14 px-4 text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Megaphone className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-800">No Announcements Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No school circulars matched your search criteria or audience filter. Try clearing filters.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Executive Grid Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAnnouncements.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedAnnouncement(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedAnnouncement(item);
                }
              }}
              className="group relative rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer select-none"
            >
              <div className="space-y-3">
                {/* Card Top Header: Category Badge + Priority Pill */}
                <div className="flex items-center justify-between gap-2">
                  {renderAudienceBadge(item.target_audience)}
                  {renderPriorityBadge(item.priority)}
                </div>

                {/* Date & Published Timestamp */}
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                  <Calendar className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>{formatDate(item.created_at)}</span>
                  <span>•</span>
                  <span>Official Memo</span>
                </div>

                {/* Announcement Title */}
                <div>
                  <h3 className="text-[15px] font-extrabold text-slate-900 group-hover:text-emerald-800 transition-colors line-clamp-1 leading-snug">
                    {item.title}
                  </h3>
                  {/* Clean Excerpt */}
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 mt-1 min-h-[2.5rem]">
                    {item.content}
                  </p>
                </div>
              </div>

              {/* Card Footer: Author + Professional Action Buttons */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate text-[11px] font-semibold text-slate-600">
                    {item.author || 'Office of Administration'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handlePushExistingAnnouncement(item, e)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-[#1B2A4A] hover:text-white hover:border-[#1B2A4A] px-2.5 py-1 text-[11px] font-bold text-[#1B2A4A] transition-all cursor-pointer shadow-2xs"
                    title="Send instant real-time notification alert to users"
                  >
                    <Send className="h-3 w-3" />
                    Notify Users
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDelete(item.id, e)}
                    className="rounded-xl p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete circular"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Executive Table View */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5 min-w-[220px]">Circular Title &amp; Excerpt</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Target Audience</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Priority</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Date Published</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Issued By</th>
                  <th className="px-4 py-3.5 text-right whitespace-nowrap">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAnnouncements.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedAnnouncement(item)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900 hover:text-emerald-800 transition-colors">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500 line-clamp-1 max-w-md">
                          {item.content}
                        </p>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {renderAudienceBadge(item.target_audience)}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {renderPriorityBadge(item.priority)}
                    </td>

                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(item.created_at)}
                    </td>

                    <td className="px-4 py-3.5 text-slate-600 font-medium whitespace-nowrap">
                      {item.author || 'Administration'}
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handlePushExistingAnnouncement(item, e)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-[#1B2A4A] hover:text-white px-2.5 py-1 text-[11px] font-bold text-[#1B2A4A] transition-all cursor-pointer"
                        >
                          <Send className="h-3 w-3" /> Notify
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAnnouncement(item);
                          }}
                          className="rounded-xl border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="View Memo"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDelete(item.id, e)}
                          className="rounded-xl p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Publish Official Announcement Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Publish Official Campus Announcement"
        subtitle="Broadcast school circulars, memoranda, and notify users in real time"
        maxWidth="lg"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Circular Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. General PTA Assembly & 1st Quarter Card Distribution"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Target Audience
              </label>
              <select
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value as any })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              >
                <option value="all">Everyone (Campus-Wide)</option>
                <option value="students">Students Only</option>
                <option value="parents">Parents &amp; Guardians Only</option>
                <option value="teachers">Faculty &amp; Teachers Only</option>
                <option value="registrar">Registrar Personnel</option>
                <option value="guidance">Guidance Counselors</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Priority Level
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
              >
                <option value="important">Important Advisory</option>
                <option value="urgent">Urgent Circular</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Standard Bulletin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Circular Message Content <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="State the full guidelines, schedules, venue, and required actions..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          <label className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={form.notifyUsersImmediately}
              onChange={(e) =>
                setForm({ ...form, notifyUsersImmediately: e.target.checked })
              }
              className="h-4 w-4 rounded border-emerald-300 text-emerald-700"
            />
            <span className="font-bold text-emerald-950">
              Broadcast instant alert to target users' Notification Bell immediately
            </span>
          </label>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 cursor-pointer"
            >
              <Megaphone className="h-3.5 w-3.5" /> Publish &amp; Notify
            </button>
          </div>
        </form>
      </Modal>

      {/* Send Direct / Broadcast Notification Modal */}
      <Modal
        isOpen={isDirectNotifOpen}
        onClose={() => setIsDirectNotifOpen(false)}
        title="Send Notification to Portal Users"
        subtitle="Deliver an immediate administrative alert directly into user notification bells"
        maxWidth="lg"
      >
        <form onSubmit={handleSendDirectNotification} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Recipient Group <span className="text-rose-500">*</span>
              </label>
              <select
                value={directForm.recipientType}
                onChange={(e) =>
                  setDirectForm({
                    ...directForm,
                    recipientType: e.target.value as any,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden"
              >
                <option value="all">All Users (Campus-Wide)</option>
                <option value="student">All Students</option>
                <option value="parent">All Parents &amp; Guardians</option>
                <option value="teacher">All Teachers</option>
                <option value="registrar">Registrar Officers</option>
                <option value="guidance">Guidance Counselors</option>
                <option value="specific">Specific User Account</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Alert Priority
              </label>
              <select
                value={directForm.priority}
                onChange={(e) =>
                  setDirectForm({
                    ...directForm,
                    priority: e.target.value as any,
                  })
                }
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden"
              >
                <option value="important">Important Notice</option>
                <option value="urgent">Urgent Alert</option>
                <option value="normal">Standard Notification</option>
              </select>
            </div>
          </div>

          {directForm.recipientType === 'specific' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Select Recipient User <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={directForm.targetUserId}
                onChange={(e) =>
                  setDirectForm({ ...directForm, targetUserId: e.target.value })
                }
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden"
              >
                <option value="">-- Choose a user --</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.email || u.id}>
                    {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email} (
                    {(u.role || 'user').toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Notification Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={directForm.title}
              onChange={(e) =>
                setDirectForm({ ...directForm, title: e.target.value })
              }
              placeholder="e.g. Schedule Advisory from the Office of the Principal"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Notification Message <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={directForm.message}
              onChange={(e) =>
                setDirectForm({ ...directForm, message: e.target.value })
              }
              placeholder="Enter the alert message that will pop up on recipient devices..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDirectNotifOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B2A4A] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0f1c3f] cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 text-amber-400" /> Send Notification Now
            </button>
          </div>
        </form>
      </Modal>

      {/* Official School Circular Full Preview Modal */}
      <Modal
        isOpen={Boolean(selectedAnnouncement)}
        onClose={() => setSelectedAnnouncement(null)}
        title="Official School Circular Preview"
        subtitle="Placido L. Señor National High School · School ID: 303035"
        maxWidth="lg"
      >
        {selectedAnnouncement && (
          <div className="space-y-4">
            {/* Memorandum Header Banner */}
            <div className="rounded-2xl bg-gradient-to-r from-[#0f1c3f] via-[#1B2A4A] to-[#243B67] p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    Republic of the Philippines • Department of Education
                  </p>
                  <h4 className="text-sm font-extrabold uppercase">
                    Placido L. Señor National High School
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {renderPriorityBadge(selectedAnnouncement.priority)}
              </div>
            </div>

            {/* Official DepEd Memo Sheet */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 border-b border-slate-200 pb-3 text-slate-600">
                <div>
                  <span className="font-bold text-slate-800">MEMORANDUM CIRCULAR</span>
                  <p className="font-mono text-[11px] text-slate-500">
                    REF: PLSNHS-CIRC-{new Date(selectedAnnouncement.created_at).getFullYear()}-
                    {String(selectedAnnouncement.id).slice(-4)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-800">DATE ISSUED</span>
                  <p className="text-[11px] text-slate-500">
                    {formatDate(selectedAnnouncement.created_at)}
                  </p>
                </div>
                <div className="pt-1">
                  <span className="font-bold text-slate-800">TO / TARGET AUDIENCE:</span>
                  <div className="mt-0.5">{renderAudienceBadge(selectedAnnouncement.target_audience)}</div>
                </div>
                <div className="pt-1 text-right">
                  <span className="font-bold text-slate-800">FROM:</span>
                  <p className="text-[11px] font-semibold text-emerald-800">
                    {selectedAnnouncement.author || 'Office of the Principal'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
                  {selectedAnnouncement.title}
                </h3>
                <div className="mt-3 text-slate-700 leading-relaxed whitespace-pre-line text-[13px]">
                  {selectedAnnouncement.content}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Placido L. Señor National High School · DepEd Region VII</span>
                <span className="font-bold text-slate-700">Official Campus Communication</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 text-slate-500" />
                Print Circular
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    handlePushExistingAnnouncement(selectedAnnouncement, e);
                    setSelectedAnnouncement(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" /> Re-Notify Target Users
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAnnouncement(null)}
                  className="rounded-xl bg-[#1B2A4A] px-4 py-2 text-xs font-bold text-white hover:bg-[#0f1c3f] cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
