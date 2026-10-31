import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

const READ_STORAGE_KEY = 'plsnhs_parent_read_announcements';

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
  const [activeFilter, setActiveFilter] = useState<'all' | 'important' | 'unread'>('all');
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

  const unreadCount = announcements.filter((a) => !readIds.includes(String(a.id))).length;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 sm:pr-14">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            PTA & School Announcements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Official general circulars, parent-teacher conferences, and academic advisories. Click any announcement to view the full circular.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-emerald-600 hover:text-emerald-700 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Mark All Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 self-start">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#1B2A4A] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Circulars ({announcements.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('important')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'important'
                ? 'bg-[#1B2A4A] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Important / Urgent
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('unread')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              activeFilter === 'unread'
                ? 'bg-[#1B2A4A] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search circulars or topics..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#1B2A4A] focus:outline-none"
          />
        </div>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs animate-pulse space-y-3"
            >
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-5 w-64 bg-slate-200 rounded" />
              <div className="h-12 w-full bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-2">
          <Bell className="h-8 w-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-extrabold text-slate-800">No Announcements Found</h3>
          <p className="text-xs text-slate-500">
            No school circulars match your current filter or search keywords.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((a, idx) => {
            const isRead = readIds.includes(String(a.id));
            const priorityLower = (a.priority || 'general').toLowerCase();
            const isUrgent =
              priorityLower === 'urgent' ||
              priorityLower === 'important' ||
              priorityLower === 'high';

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
                className={`group relative rounded-2xl border bg-white p-6 shadow-xs transition-all duration-200 cursor-pointer select-none hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]/30 ${
                  isRead
                    ? 'border-slate-200 hover:border-[#1B2A4A]/60'
                    : 'border-l-4 border-l-[#1B2A4A] border-slate-200 hover:border-[#1B2A4A]'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                      {formatDate(a.created_at)}
                    </span>

                    {!isRead ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        New Circular
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Viewed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={isUrgent ? 'info' : 'neutral'} size="sm">
                      {a.priority || 'General'}
                    </Badge>
                  </div>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-[#1B2A4A] transition-colors">
                  {a.title}
                </h3>

                <p className="mt-1.5 text-xs text-slate-600 leading-relaxed line-clamp-2 whitespace-pre-line">
                  {a.content}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px]">
                  <span className="text-slate-400">
                    Published by{' '}
                    <strong className="font-semibold text-slate-600">
                      {a.author || 'Placido L. Señor NHS Administration'}
                    </strong>
                  </span>

                  <span className="inline-flex items-center gap-1 font-extrabold text-[#1B2A4A] group-hover:translate-x-0.5 transition-transform">
                    <Eye className="h-3.5 w-3.5 text-amber-500" />
                    Read Full Circular
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
