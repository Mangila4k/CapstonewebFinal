import React, { useState, useEffect, useMemo } from 'react';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import {
  Bell,
  Calendar,
  Search,
  CheckCircle2,
  Eye,
  Printer,
  ChevronLeft,
  ChevronRight,
  Building2,
  UserCheck,
  FileText,
  ArrowUpRight,
  Users,
  AlertTriangle,
  Clock,
  MapPin,
  X,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

const READ_STORAGE_KEY = 'plsnhs_parent_read_announcements';

function getCategoryInfo(title: string = '', content: string = '') {
  const text = `${title} ${content}`.toLowerCase();
  if (text.includes('pta') || text.includes('assembly') || text.includes('parent') || text.includes('guardian') || text.includes('meeting') || text.includes('conference')) {
    return { label: 'PTA Assembly & Meeting', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  }
  if (text.includes('exam') || text.includes('quarter') || text.includes('card') || text.includes('grade') || text.includes('academic')) {
    return { label: 'Academic & Examination', color: 'bg-blue-50 text-blue-800 border-blue-200' };
  }
  if (text.includes('id') || text.includes('gate') || text.includes('qr') || text.includes('attendance') || text.includes('safety')) {
    return { label: 'Campus Safety & Protocol', color: 'bg-purple-50 text-purple-800 border-purple-200' };
  }
  return { label: 'Official School Advisory', color: 'bg-slate-100 text-slate-800 border-slate-200' };
}

function formatDisplayTitle(rawTitle: string): string {
  if (!rawTitle) return 'Official School Circular';
  const trimmed = rawTitle.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'meeting') {
    return '1st General PTA Consultation & Homeroom Meeting';
  }
  if (lower === 'pta meeting') {
    return 'General Parent-Teacher Association (PTA) Assembly';
  }
  if (lower === 'exam date') {
    return 'Quarterly Academic Examination Schedule';
  }
  if (trimmed === trimmed.toUpperCase() && trimmed.length > 3) {
    return trimmed
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function detectVenueTag(content: string = ''): string | null {
  if (!content) return null;
  const match = content.match(/(ward\s+[ivx\d]+(?:,\s*[\w\s]+)?|covered\s+court|school\s+gym|campus\s+grounds|avr|audio-visual\s+room)/i);
  if (match) {
    return match[0].trim();
  }
  if (content.toLowerCase().includes('langtad')) {
    return 'PLSNHS Campus / Langtad';
  }
  return null;
}

const FALLBACK_ANNOUNCEMENTS = [
  {
    id: 'fallback-1',
    title: 'General PTA Assembly & 1st Quarter Card Distribution',
    content:
      'All parents and legal guardians are cordially invited to attend the General PTA Assembly and 1st Quarter Report Card (SF9) Distribution this coming Friday at 1:30 PM at the PLSNHS Covered Court.\n\nAgenda:\n1. Academic Performance Review for Quarter 1\n2. Campus Gate QR Attendance & Safety Guidelines\n3. Homeroom Parent-Teacher Consultation with Class Advisers\n\nPlease bring a valid ID and your child’s LRN reference for attendance registration.',
    priority: 'important',
    target_audience: 'parents',
    author: 'Placido L. Señor NHS Administration',
    created_at: new Date().toISOString(),
  },
  {
    id: 'fallback-2',
    title: 'Mandatory Wearing of Official QR-Coded Student ID',
    content:
      'Please ensure your child wears their official PLSNHS QR-coded Student ID every day upon entering and leaving the campus gates so real-time attendance logs remain accurate.\n\nLost or damaged ID cards may be reprinted at the Office of the School Registrar.',
    priority: 'general',
    target_audience: 'all',
    author: 'Office of the Principal · Dr. Ryan R. Quiroga',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

export const ParentsAnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pta' | 'important' | 'unread'>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(READ_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    async function fetchAnnouncements() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && data.length > 0) {
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
        } else {
          setAnnouncements(FALLBACK_ANNOUNCEMENTS);
        }
      } catch {
        setAnnouncements(FALLBACK_ANNOUNCEMENTS);
      } finally {
        setLoading(false);
      }
    }
    fetchAnnouncements();
  }, []);

  const markAsRead = (id: string | number) => {
    const strId = String(id);
    setReadIds((prev) => {
      if (prev.includes(strId)) return prev;
      const updated = [...prev, strId];
      try {
        localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage quota errors
      }
      return updated;
    });
  };

  const markAllAsRead = () => {
    const allIds = announcements.map((a) => String(a.id));
    setReadIds(allIds);
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(allIds));
    } catch {
      // ignore
    }
  };

  const handleOpenAnnouncement = (announcement: any) => {
    setSelectedAnnouncement(announcement);
    markAsRead(announcement.id);
  };

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((a) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (a.title && a.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.content && a.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (a.author && a.author.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeFilter === 'pta') {
        const text = `${a.title || ''} ${a.content || ''}`.toLowerCase();
        return text.includes('pta') || text.includes('parent') || text.includes('meeting') || text.includes('conference') || text.includes('assembly');
      }
      if (activeFilter === 'important') {
        const p = (a.priority || '').toLowerCase();
        return p === 'important' || p === 'urgent' || p === 'high';
      }
      if (activeFilter === 'unread') {
        return !readIds.includes(String(a.id));
      }
      return true;
    });
  }, [announcements, searchQuery, activeFilter, readIds]);

  const currentModalIndex = selectedAnnouncement
    ? filteredAnnouncements.findIndex((a) => String(a.id) === String(selectedAnnouncement.id))
    : -1;

  const handleStepAnnouncement = (direction: 'prev' | 'next') => {
    if (currentModalIndex === -1) return;
    const targetIdx = direction === 'prev' ? currentModalIndex - 1 : currentModalIndex + 1;
    if (targetIdx >= 0 && targetIdx < filteredAnnouncements.length) {
      handleOpenAnnouncement(filteredAnnouncements[targetIdx]);
    }
  };

  const handlePrintCircular = (a: any) => {
    const printWin = window.open('', '_blank', 'width=800,height=700');
    if (!printWin) return;
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Official School Circular - ${a.title || 'Announcement'}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; padding: 40px; max-width: 720px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #1B2A4A; padding-bottom: 16px; margin-bottom: 24px; }
            .header h2 { margin: 4px 0; font-size: 18px; color: #1B2A4A; text-transform: uppercase; }
            .header p { margin: 2px 0; font-size: 12px; color: #475569; }
            .meta { display: flex; justify-content: space-between; font-size: 12px; color: #475569; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px; }
            .title { font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 16px; }
            .content { font-size: 14px; line-height: 1.7; white-space: pre-line; color: #334155; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; min-height: 160px; }
            .footer { margin-top: 32px; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="header">
            <p>Republic of the Philippines · Department of Education</p>
            <h2>Placido L. Señor National High School</h2>
            <p>Langtad, City of Naga, Cebu · School ID: 303035</p>
          </div>
          <div class="meta">
            <span><strong>Date Published:</strong> ${formatDate(a.created_at)}</span>
            <span><strong>Priority:</strong> ${(a.priority || 'General').toUpperCase()}</span>
          </div>
          <div class="title">${a.title}</div>
          <div class="content">${a.content}</div>
          <div class="footer">
            <span>Published by: <strong>${a.author || 'Placido L. Señor NHS Administration'}</strong></span>
            <span>Official Parent & Guardian Portal Circular</span>
          </div>
          <script>window.onload = () => { window.print(); }</script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const totalCount = announcements.length;
  const ptaCount = announcements.filter((a) => {
    const text = `${a.title || ''} ${a.content || ''}`.toLowerCase();
    return text.includes('pta') || text.includes('parent') || text.includes('meeting') || text.includes('conference') || text.includes('assembly');
  }).length;
  const urgentCount = announcements.filter((a) => {
    const p = (a.priority || '').toLowerCase();
    return p === 'important' || p === 'urgent' || p === 'high';
  }).length;
  const unreadCount = announcements.filter((a) => !readIds.includes(String(a.id))).length;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 font-display tracking-tight leading-snug">
              PTA &amp; School Announcements
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Official general circulars, parent-teacher conferences, and academic advisories · S.Y. 2026–2027
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 ml-auto pt-0.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="hidden sm:inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 hover:border-emerald-600 hover:text-emerald-700 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-98"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Mark All Read ({unreadCount})
              </button>
            )}
            <PageHeaderNotificationSlot />
          </div>
        </div>

        {unreadCount > 0 && (
          <div className="sm:hidden mt-3 flex items-center">
            <button
              type="button"
              onClick={markAllAsRead}
              className="w-full inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-emerald-600 hover:text-emerald-700 transition-all cursor-pointer shadow-2xs active:scale-98"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Mark All Read ({unreadCount})
            </button>
          </div>
        )}
      </div>

      {/* 4 Executive Overview KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Bulletins */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Circulars
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#152e69]/10 text-[#152e69]">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-900 font-display">{totalCount}</p>
            <span className="text-xs font-bold text-slate-500">Active Notices</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Official S.Y. 2026–2027 bulletins</span>
          </div>
        </div>

        {/* Card 2: PTA Assemblies */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              PTA Conferences
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-900 font-display">{ptaCount}</p>
            <span className="text-xs font-bold text-slate-500">Scheduled</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Homeroom &amp; General Body</span>
          </div>
        </div>

        {/* Card 3: Priority Notices */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Priority Actions
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-900 font-display">{urgentCount}</p>
            <span className="text-xs font-bold text-slate-500">Important</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-amber-700 font-semibold">
            <Clock className="h-3.5 w-3.5" />
            <span>Parent acknowledgement required</span>
          </div>
        </div>

        {/* Card 4: Unread Circulars */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Unread Bulletins
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Bell className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-3xl font-black text-slate-900 font-display">{unreadCount}</p>
            <span className="text-xs font-bold text-slate-500">Pending</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            {unreadCount === 0 ? (
              <span className="text-emerald-700 font-bold">All bulletins acknowledged</span>
            ) : (
              <span>Review updates below</span>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar Card */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search circulars, agenda, keywords, or administrative topics..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#152e69] focus:outline-none focus:ring-2 focus:ring-[#152e69]/20 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-98 ${
              activeFilter === 'all'
                ? 'bg-[#152e69] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <span>All Circulars</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
              activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('pta')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-98 ${
              activeFilter === 'pta'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100/70'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>PTA Meetings</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
              activeFilter === 'pta' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900'
            }`}>
              {ptaCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('important')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-98 ${
              activeFilter === 'important'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200/80 hover:bg-amber-100/70'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Priority</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
              activeFilter === 'important' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
            }`}>
              {urgentCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('unread')}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-98 ${
              activeFilter === 'unread'
                ? 'bg-[#152e69] text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 border border-blue-200/80 hover:bg-blue-100/70'
            }`}
          >
            <Bell className="h-3.5 w-3.5" />
            <span>Unread</span>
            <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md ${
              activeFilter === 'unread' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-900'
            }`}>
              {unreadCount}
            </span>
          </button>
        </div>
      </div>

      {/* 2-Column Responsive Institutional Circulars Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs animate-pulse space-y-3"
            >
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-5 w-64 bg-slate-200 rounded" />
              <div className="h-16 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-2 shadow-xs">
          <Bell className="h-8 w-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-extrabold text-slate-800">No Announcements Found</h3>
          <p className="text-xs text-slate-500">
            No school circulars match your current filter or search keywords.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5">
          {filteredAnnouncements.map((a, idx) => {
            const isRead = readIds.includes(String(a.id));
            const priorityLower = (a.priority || 'general').toLowerCase();
            const isUrgent =
              priorityLower === 'urgent' ||
              priorityLower === 'important' ||
              priorityLower === 'high';
            const cat = getCategoryInfo(a.title, a.content);
            const displayTitle = formatDisplayTitle(a.title);
            const venue = detectVenueTag(a.content);

            return (
              <div
                key={a.id || idx}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenAnnouncement(a)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOpenAnnouncement(a);
                  }
                }}
                className={`group relative rounded-2xl border bg-white p-5.5 shadow-xs transition-all duration-200 cursor-pointer select-none hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between ${
                  !isRead
                    ? 'border-l-4 border-l-[#152e69] border-slate-200 hover:border-[#152e69]'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Top Badge Strip */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-bold border ${cat.color}`}>
                        {cat.label}
                      </span>
                      {!isRead ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          New Circular
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Acknowledged
                        </span>
                      )}
                    </div>

                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      isUrgent
                        ? 'bg-rose-50 border border-rose-200 text-rose-800'
                        : 'bg-slate-100 border border-slate-200 text-slate-600'
                    }`}>
                      {a.priority || 'General'}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#152e69] transition-colors leading-snug line-clamp-2">
                    {displayTitle}
                  </h3>

                  {/* Content Preview */}
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-3 whitespace-pre-line">
                    {a.content}
                  </p>

                  {/* Optional Venue / Location Badge */}
                  {venue && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-50/80 border border-amber-200/80 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
                      <MapPin className="h-3 w-3 text-amber-600 shrink-0" />
                      <span>Assembly Venue: {venue}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>{formatDate(a.created_at)}</span>
                  </div>

                  <span className="inline-flex items-center gap-1 font-bold text-xs text-[#152e69] group-hover:translate-x-0.5 transition-transform">
                    <Eye className="h-3.5 w-3.5 text-amber-500" />
                    <span>Read Notice</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Official School Circular Detail Modal */}
      <Modal
        isOpen={Boolean(selectedAnnouncement)}
        onClose={() => setSelectedAnnouncement(null)}
        title="Official School Circular & Parent Advisory"
        subtitle="Placido L. Señor National High School · School ID: 303035"
        maxWidth="xl"
      >
        {selectedAnnouncement && (
          <div className="space-y-5">
            {/* Institutional Letterhead Banner */}
            <div className="rounded-2xl bg-gradient-to-r from-[#0f1c3f] via-[#1B2A4A] to-[#243B67] p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    DepEd School ID: 303035 · Official Advisory
                  </p>
                  <h4 className="text-sm sm:text-base font-extrabold tracking-tight">
                    Placido L. Señor National High School
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Langtad, City of Naga, Cebu
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-start sm:items-end gap-1.5">
                <span className="rounded-full bg-amber-400 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950">
                  {selectedAnnouncement.priority || 'General Circular'}
                </span>
                <span className="text-[11px] text-slate-300 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-amber-300" />
                  {formatDate(selectedAnnouncement.created_at)}
                </span>
              </div>
            </div>

            {/* Metadata Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex items-center gap-2.5">
                <UserCheck className="h-4 w-4 text-[#1B2A4A] shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Issued By
                  </span>
                  <span className="font-bold text-slate-800">
                    {selectedAnnouncement.author || 'Placido L. Señor NHS Administration'}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex items-center gap-2.5">
                <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Target Audience & Status
                  </span>
                  <span className="font-bold text-emerald-700">
                    Parents, Guardians & Learners · Acknowledged
                  </span>
                </div>
              </div>
            </div>

            {/* Full Announcement Body */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-3 shadow-2xs">
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-snug border-b border-slate-100 pb-3">
                {selectedAnnouncement.title}
              </h3>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line min-h-[120px]">
                {selectedAnnouncement.content}
              </div>
            </div>

            {/* Modal Footer Controls (Prev/Next + Print + Close) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentModalIndex <= 0}
                  onClick={() => handleStepAnnouncement('prev')}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  type="button"
                  disabled={
                    currentModalIndex === -1 ||
                    currentModalIndex >= filteredAnnouncements.length - 1
                  }
                  onClick={() => handleStepAnnouncement('next')}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintCircular(selectedAnnouncement)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-[#1B2A4A] hover:text-[#1B2A4A] transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Circular
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAnnouncement(null)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B2A4A] px-4 py-2 text-xs font-bold text-white hover:bg-[#0f1c3f] transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                  Done Reading
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
