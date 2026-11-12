import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  Megaphone,
  CheckCheck,
  CheckCircle2,
  X,
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  ArrowUpRight,
  Building2,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Modal } from './Modal';

export interface UnifiedNotificationItem {
  uid: string;
  rawId: string | number;
  source: 'announcement' | 'notification';
  title: string;
  content: string;
  senderName: string;
  senderRole: string;
  priority: string;
  targetAudience: string;
  createdAt: string;
  isRead: boolean;
  actionUrl?: string;
  actionLabel?: string;
  meetingDate?: string;
  meetingTime?: string;
  venue?: string;
}

const LOCAL_BROADCAST_KEY = 'plsnhs_broadcast_notifications';

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return 'Recent';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recent';
  }
}

function isAudienceMatch(audience?: string, role?: string): boolean {
  if (!audience) return true;
  const aud = audience.toLowerCase().trim();
  const r = (role || 'student').toLowerCase().trim();

  if (aud === 'all' || aud === 'everyone' || aud === 'public') return true;
  if (r === 'admin' || r === 'principal') return true;

  if (r === 'student') {
    return aud === 'students' || aud === 'student' || aud === 'learners';
  }
  if (r === 'parent') {
    return (
      aud === 'parents' ||
      aud === 'parent' ||
      aud === 'guardians' ||
      aud === 'parent_teacher_meeting' ||
      aud === 'both'
    );
  }
  if (r === 'teacher') {
    return (
      aud === 'teachers' ||
      aud === 'teacher' ||
      aud === 'faculty' ||
      aud === 'parent_teacher_meeting' ||
      aud === 'both'
    );
  }
  if (r === 'registrar') {
    return aud === 'registrar' || aud === 'staff' || aud === 'all';
  }
  if (r === 'guidance') {
    return aud === 'guidance' || aud === 'staff' || aud === 'all';
  }
  return true;
}

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<UnifiedNotificationItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedItem, setSelectedItem] = useState<UnifiedNotificationItem | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const [slotElement, setSlotElement] = useState<HTMLElement | null>(null);

  // Responsive device classification for auto-adjusting on mobile phones vs tablets vs desktop
  const [deviceType, setDeviceType] = useState<'phone' | 'tablet' | 'desktop'>(() => {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    if (w < 640) return 'phone';
    if (w < 1024) return 'tablet';
    return 'desktop';
  });

  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  useEffect(() => {
    const handleResizeDevice = () => {
      const w = window.innerWidth;
      const nextType = w < 640 ? 'phone' : w < 1024 ? 'tablet' : 'desktop';
      setDeviceType((prev) => (prev !== nextType ? nextType : prev));
    };
    handleResizeDevice();
    window.addEventListener('resize', handleResizeDevice);
    return () => window.removeEventListener('resize', handleResizeDevice);
  }, []);

  // Compute exact viewport position to guarantee the dropdown never clips or overflows on mobile or tablet
  const updateDropdownPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let width = 410;
    let minMargin = 16;

    if (vw < 640) {
      // Mobile phone (e.g. iPhone, Android)
      width = Math.min(vw - 20, 375);
      minMargin = 10;
    } else if (vw < 1024) {
      // Tablet (e.g. iPad portrait/landscape)
      width = Math.min(vw - 32, 400);
      minMargin = 16;
    } else {
      // Desktop
      width = 410;
      minMargin = 20;
    }

    // Default: Align right edge of dropdown with right edge of button
    let left = rect.right - width;

    // If button is on left or center of screen, clamp left so it never overflows off left screen edge
    if (left < minMargin) {
      left = minMargin;
    }

    // Also prevent extending past the right viewport boundary
    if (left + width > vw - minMargin) {
      left = Math.max(minMargin, vw - minMargin - width);
    }

    const top = rect.bottom + (vw < 640 ? 6 : 8);
    const availableHeight = vh - top - 16;
    const maxHeight = Math.max(260, Math.min(vw < 640 ? 460 : 540, availableHeight));

    setDropdownPos({ top, left, width, maxHeight });
  }, []);

  useEffect(() => {
    const updateSlot = () => {
      const pageSlot = document.getElementById('page-header-notification-slot');
      const mobileSlot = document.getElementById('mobile-header-notification-slot');
      const target = pageSlot || mobileSlot;
      setSlotElement((prev) => (prev !== target ? target : prev));
    };

    updateSlot();
    const raf = requestAnimationFrame(updateSlot);
    const observer = new MutationObserver(updateSlot);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [location.pathname]);

  const userKey = user?.id || user?.email || user?.role || 'guest';
  const readStorageKey = `plsnhs_read_notifs_${userKey}`;
  const unreadStorageKey = `plsnhs_unread_override_${userKey}`;

  const getStoredList = useCallback((key: string): string[] => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const setStoredList = useCallback((key: string, list: string[]) => {
    try {
      localStorage.setItem(key, JSON.stringify(Array.from(new Set(list))));
    } catch {
      // ignore storage errors
    }
  }, []);

  const fetchAllNotifications = useCallback(async () => {
    if (!user) return;

    const readIds = getStoredList(readStorageKey);
    const unreadOverrides = getStoredList(unreadStorageKey);
    const role = (user.role || 'student').toLowerCase();

    // Resolve student registration timestamp for strict filtering:
    // If the user is a student (especially new students), they MUST NOT receive old notifications
    // or announcements created prior to their account registration / enrollment.
    let studentRegisteredAt: number | null = null;
    if (user?.created_at) {
      const t = new Date(user.created_at).getTime();
      if (!isNaN(t)) studentRegisteredAt = t;
    }

    if ((role === 'student' || user?.role === 'student') && !studentRegisteredAt && (user?.id || user?.email)) {
      try {
        if (user?.id) {
          const { data: uRow } = await supabase
            .from('users')
            .select('created_at')
            .eq('id', user.id)
            .maybeSingle();
          if (uRow?.created_at) {
            const t = new Date(uRow.created_at).getTime();
            if (!isNaN(t)) studentRegisteredAt = t;
          }
        }
        if (!studentRegisteredAt && user?.email) {
          const { data: stRow } = await supabase
            .from('students')
            .select('created_at')
            .ilike('email', user.email.trim().toLowerCase())
            .maybeSingle();
          if (stRow?.created_at) {
            const t = new Date(stRow.created_at).getTime();
            if (!isNaN(t)) studentRegisteredAt = t;
          }
        }
      } catch {
        // ignore
      }
    }

    const unifiedMap = new Map<string, UnifiedNotificationItem>();

    // 1. Fetch official announcements from Supabase
    try {
      const { data: annData } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (Array.isArray(annData)) {
        annData.forEach((a: any) => {
          if (!isAudienceMatch(a.target_audience, role)) return;

          // If current user is a student, discard old announcements published before they registered
          if ((role === 'student' || user?.role === 'student') && studentRegisteredAt) {
            const annTime = new Date(a.created_at || a.date_created || 0).getTime();
            if (annTime < studentRegisteredAt) return;
          }
          const uid = `ann_${a.id}`;
          const isRead = readIds.includes(uid) && !unreadOverrides.includes(uid);
          unifiedMap.set(uid, {
            uid,
            rawId: a.id,
            source: 'announcement',
            title: a.title || 'Official School Announcement',
            content: a.content || a.description || a.message || '',
            senderName: a.author || a.author_name || 'Placido L. Señor NHS Administration',
            senderRole: (a.role || a.author_role || 'admin').toUpperCase(),
            priority: (a.priority || 'normal').toLowerCase(),
            targetAudience: a.target_audience || 'all',
            createdAt: a.created_at || a.date_created || new Date().toISOString(),
            isRead,
            meetingDate: a.meeting_date,
            meetingTime: a.meeting_time,
            venue: a.venue,
          });
        });
      }
    } catch {
      // ignore announcements error
    }

    // 2. Fetch personal & broadcast notifications from Supabase
    try {
      const { data: notifData } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(40);

      if (Array.isArray(notifData)) {
        const userIds = new Set(
          [user.id, user.student_id, user.student_lrn, user.email]
            .filter(Boolean)
            .map((x) => String(x).toLowerCase())
        );

        notifData.forEach((n: any) => {
          const targetUserId = n.user_id ? String(n.user_id).toLowerCase() : '';
          const targetRole = n.role ? String(n.role).toLowerCase() : 'all';

          // Strict Security & Privacy Guard:
          // Notifications with access credentials or temporary passwords must ONLY be received by the intended user!
          // Neither the admin, registrar, teachers, nor other students may ever receive another user's credentials notice.
          const titleLower = String(n.title || '').toLowerCase();
          const msgLower = String(n.message || n.content || '').toLowerCase();
          const isCredentialsNotice =
            titleLower.includes('credentials') ||
            titleLower.includes('temporary password') ||
            msgLower.includes('temporary password') ||
            msgLower.includes('temp password');

          let matchesUser = false;
          if (targetUserId) {
            matchesUser = userIds.has(targetUserId);
          } else if (isCredentialsNotice) {
            // If targetUserId was missing on a legacy credentials notice, strictly restrict to the recipient whose email is in the message
            if (user?.email && msgLower.includes(user.email.toLowerCase().trim())) {
              matchesUser = true;
            } else {
              matchesUser = false; // Never show to admin or any other user
            }
          } else {
            matchesUser = isAudienceMatch(targetRole, role);
          }

          if (!matchesUser) return;

          // If current user is a student, they cannot receive old notifications created before their registration
          if ((role === 'student' || user?.role === 'student') && studentRegisteredAt) {
            const notifTime = new Date(n.created_at || 0).getTime();
            if (!targetUserId) {
              // Broadcast notification (sent to student body or all): strictly block if created before student registration
              if (notifTime < studentRegisteredAt) return;
            } else {
              // Direct personal notification: allow if dispatched to this student, but reject any notification from before registration handshake (5m buffer)
              if (notifTime < studentRegisteredAt - 5 * 60 * 1000) return;
            }
          }

          const uid = `notif_${n.id}`;
          let isRead = Boolean(n.read || n.is_read);
          if (readIds.includes(uid)) isRead = true;
          if (unreadOverrides.includes(uid)) isRead = false;

          const isEnrollmentNotif =
            String(n.type || '').toLowerCase() === 'enrollment' ||
            Boolean(n.enrollment_id);

          const defaultActionUrl = isEnrollmentNotif
            ? role === 'registrar'
              ? '/registrar/enrollments'
              : '/admin/enrollments'
            : undefined;

          unifiedMap.set(uid, {
            uid,
            rawId: n.id,
            source: 'notification',
            title: n.title || 'Official Admin Notification',
            content: n.message || n.content || '',
            senderName:
              n.sender ||
              (isEnrollmentNotif ? 'Online Admissions Portal' : 'School Administration'),
            senderRole: (n.sender_role || n.type || 'ADMIN').toUpperCase(),
            priority: (n.priority || (isEnrollmentNotif ? 'high' : 'normal')).toLowerCase(),
            targetAudience: n.role || 'all',
            createdAt: n.created_at || new Date().toISOString(),
            isRead,
            actionUrl: n.action_url || n.link || defaultActionUrl,
            actionLabel:
              n.action_label || (isEnrollmentNotif ? 'Review & Approve Application' : undefined),
          });
        });
      }
    } catch {
      // ignore notifications table error
    }

    // 3. Merge local broadcast notifications
    try {
      const localRaw = localStorage.getItem(LOCAL_BROADCAST_KEY);
      if (localRaw) {
        const localList = JSON.parse(localRaw);
        if (Array.isArray(localList)) {
          localList.forEach((loc: any) => {
            const targetUser = loc.target_user_id ? String(loc.target_user_id).toLowerCase() : '';
            const myIds = [user.id, user.student_id, user.student_lrn, user.email]
              .filter(Boolean)
              .map((v) => String(v).toLowerCase());

            if (targetUser && !myIds.includes(targetUser)) return;
            if (!targetUser && !isAudienceMatch(loc.target_audience, role)) return;

            // If current user is a student, discard old local broadcasts created before registration
            if ((role === 'student' || user?.role === 'student') && studentRegisteredAt && !targetUser) {
              const locTime = new Date(loc.created_at || 0).getTime();
              if (locTime < studentRegisteredAt) return;
            }

            const uid = `local_${loc.id}`;
            if (!unifiedMap.has(uid)) {
              const isRead = readIds.includes(uid) && !unreadOverrides.includes(uid);
              unifiedMap.set(uid, {
                uid,
                rawId: loc.id,
                source: 'notification',
                title: loc.title || 'Official Admin Notification',
                content: loc.content || loc.message || '',
                senderName: loc.author || 'Placido L. Señor NHS Administration',
                senderRole: 'ADMIN',
                priority: (loc.priority || 'normal').toLowerCase(),
                targetAudience: loc.target_audience || 'all',
                createdAt: loc.created_at || new Date().toISOString(),
                isRead,
                actionUrl: loc.action_url,
                actionLabel: loc.action_label,
              });
            }
          });
        }
      }
    } catch {
      // ignore
    }

    const sorted = Array.from(unifiedMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Deduplicate identical notifications by title + content and filter out any sensitive security messages
    const seenKeys = new Set<string>();
    const deduped: UnifiedNotificationItem[] = [];
    for (const item of sorted) {
      const lowerTitle = (item.title || '').toLowerCase();
      const lowerContent = (item.content || '').toLowerCase();
      if (
        lowerTitle.includes('password reset code') ||
        lowerContent.includes('password reset verification code') ||
        lowerTitle.includes('reset code:')
      ) {
        continue;
      }

      const sig = `${(item.title || '').trim().toLowerCase()}|${(item.content || '')
        .trim()
        .toLowerCase()}`;
      if (!seenKeys.has(sig)) {
        seenKeys.add(sig);
        deduped.push(item);
      }
    }

    setItems(deduped);
  }, [user, getStoredList, readStorageKey, unreadStorageKey]);

  useEffect(() => {
    fetchAllNotifications();
  }, [fetchAllNotifications]);

  // Realtime subscription to Supabase announcements & notifications + window events
  useEffect(() => {
    if (!user) return;
    const role = (user.role || 'student').toLowerCase();

    const channel = supabase
      .channel(`plsnhs-live-notifs-${userKey}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          const newAnn: any = payload.new;
          if (newAnn && isAudienceMatch(newAnn.target_audience, role)) {
            fetchAllNotifications();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif: any = payload.new;
          if (!newNotif) return;
          const targetRole = newNotif.role || 'all';
          if (isAudienceMatch(targetRole, role)) {
            fetchAllNotifications();
          }
        }
      )
      .subscribe();

    const handleCustomBroadcast = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && isAudienceMatch(customEvent.detail.target_audience, role)) {
        fetchAllNotifications();
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_BROADCAST_KEY) {
        fetchAllNotifications();
      }
    };

    window.addEventListener('plsnhs:notification-sent', handleCustomBroadcast);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('plsnhs:notification-sent', handleCustomBroadcast);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, userKey, fetchAllNotifications]);

  // Close dropdown when clicking or tapping outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Keep dropdown anchored and reposition when window is resized or scrolled
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleScrollOrResize = () => {
      updateDropdownPosition();
    };
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [dropdownOpen, updateDropdownPosition]);

  const toggleDropdown = () => {
    if (!dropdownOpen) {
      updateDropdownPosition();
    }
    setDropdownOpen((prev) => !prev);
  };

  const markItemReadStatus = async (item: UnifiedNotificationItem, readState: boolean) => {
    const readIds = getStoredList(readStorageKey);
    const unreadOverrides = getStoredList(unreadStorageKey);

    if (readState) {
      setStoredList(readStorageKey, [...readIds, item.uid]);
      setStoredList(
        unreadStorageKey,
        unreadOverrides.filter((id) => id !== item.uid)
      );
    } else {
      setStoredList(
        readStorageKey,
        readIds.filter((id) => id !== item.uid)
      );
      setStoredList(unreadStorageKey, [...unreadOverrides, item.uid]);
    }

    setItems((prev) =>
      prev.map((it) => (it.uid === item.uid ? { ...it, isRead: readState } : it))
    );

    if (selectedItem && selectedItem.uid === item.uid) {
      setSelectedItem({ ...selectedItem, isRead: readState });
    }

    if (item.source === 'notification' && typeof item.rawId === 'number') {
      try {
        await supabase
          .from('notifications')
          .update({ read: readState, is_read: readState })
          .eq('id', item.rawId);
      } catch {
        // ignore
      }
    }
  };

  const markAllAsRead = () => {
    const allUids = items.map((it) => it.uid);
    setStoredList(readStorageKey, allUids);
    setStoredList(unreadStorageKey, []);
    setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
  };

  const handleOpenItem = (item: UnifiedNotificationItem) => {
    markItemReadStatus(item, true);
    setSelectedItem({ ...item, isRead: true });
    setDropdownOpen(false);
  };

  const unreadItems = items.filter((it) => !it.isRead);
  const displayedItems = filter === 'unread' ? unreadItems : items;

  const bellDropdownNode = (
    <div ref={dropdownRef} className="relative z-40 inline-flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        aria-label="Notifications"
        title="Notifications & Announcements"
        className={`relative flex items-center justify-center rounded-xl border transition-all cursor-pointer select-none active:scale-95 touch-manipulation ${
          deviceType === 'phone' ? 'h-9 w-9' : 'h-10 w-10'
        } ${
          dropdownOpen
            ? 'border-[#152e69] bg-[#152e69] text-white shadow-sm ring-2 ring-[#152e69]/20'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 shadow-2xs hover:shadow-xs'
        }`}
      >
        <Bell
          className={`transition-colors ${
            deviceType === 'phone' ? 'h-4 w-4' : 'h-4.5 w-4.5'
          } ${
            dropdownOpen
              ? 'text-amber-400'
              : unreadItems.length > 0
              ? 'text-[#152e69]'
              : 'text-slate-600'
          }`}
        />
        {unreadItems.length > 0 && (
          <span
            className={`absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-rose-600 font-black text-white shadow-xs ring-2 ring-white leading-none ${
              deviceType === 'phone'
                ? 'h-4 min-w-[16px] text-[9px] px-1'
                : 'h-4.5 min-w-[18px] text-[10px] px-1.5'
            }`}
          >
            {unreadItems.length > 99 ? '99+' : unreadItems.length}
          </span>
        )}
      </button>
    </div>
  );

  const dropdownPanelPortal =
    dropdownOpen &&
    dropdownPos &&
    createPortal(
      <>
        {/* Mobile/Tablet Backdrop for easy touch dismissal */}
        <div
          className="fixed inset-0 z-[9990] bg-slate-900/15 sm:bg-transparent"
          onClick={() => setDropdownOpen(false)}
          aria-hidden="true"
        />

        {/* Clamped Auto-Adjusting Dropdown Panel */}
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            maxHeight: `${dropdownPos.maxHeight}px`,
          }}
          className="rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden z-[9999] animate-fade-in"
        >
          {/* Dropdown Header */}
          <div className="border-b border-slate-100 bg-white px-3.5 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between shrink-0">
            <div className="min-w-0 pr-2">
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                Notifications & Circulars
              </h4>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                Official Administration & Campus Updates
              </p>
            </div>

            {unreadItems.length > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex items-center gap-1 shrink-0 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2 sm:px-2.5 py-1 text-[10px] font-bold text-[#1B2A4A] transition-colors cursor-pointer"
              >
                <CheckCheck className="h-3 w-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-3.5 sm:px-4 py-2 shrink-0">
            <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`rounded-md px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                  filter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`rounded-md px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer ${
                  filter === 'unread'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unread ({unreadItems.length})
              </button>
            </div>

            <span className="text-[10px] font-medium text-slate-400">
              Select to view details
            </span>
          </div>

          {/* Notification Items List */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1 overscroll-contain">
            {displayedItems.length === 0 ? (
              <div className="py-10 px-6 text-center space-y-1.5">
                <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-800">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {filter === 'unread'
                    ? 'You are caught up on all official school circulars.'
                    : 'Official advisories from the Administration will appear here.'}
                </p>
              </div>
            ) : (
              displayedItems.map((item) => {
                const isUrgent =
                  item.priority === 'urgent' ||
                  item.priority === 'high' ||
                  item.priority === 'important';

                return (
                  <div
                    key={item.uid}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenItem(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenItem(item);
                      }
                    }}
                    className={`group relative p-3 sm:p-3.5 transition-all duration-150 cursor-pointer select-none flex items-start gap-2.5 sm:gap-3 border-l-2 ${
                      !item.isRead
                        ? 'bg-blue-50/40 hover:bg-blue-50/70 border-l-[#152e69]'
                        : 'bg-white hover:bg-slate-50/80 border-l-transparent'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5 ${
                        !item.isRead
                          ? 'bg-[#152e69] text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isUrgent ? (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                      ) : (
                        <Megaphone className="h-3.5 w-3.5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                          {item.senderRole || 'ADMINISTRATION'}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] text-slate-400">
                            {formatTimeAgo(item.createdAt)}
                          </span>
                          {!item.isRead && (
                            <span
                              className="h-2 w-2 rounded-full bg-blue-600 ring-2 ring-blue-100 shrink-0"
                              title="Unread"
                            />
                          )}
                        </div>
                      </div>

                      <h5
                        className={`text-xs leading-snug group-hover:text-[#152e69] transition-colors line-clamp-2 ${
                          !item.isRead
                            ? 'font-extrabold text-slate-900'
                            : 'font-semibold text-slate-700'
                        }`}
                      >
                        {item.title}
                      </h5>

                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </>,
      document.body
    );

  return (
    <>
      {slotElement ? (
        createPortal(bellDropdownNode, slotElement)
      ) : (
        <div className="w-full flex items-center justify-end mb-4">
          <div className="flex items-center gap-3 shrink-0 relative z-30">
            {bellDropdownNode}
          </div>
        </div>
      )}

      {dropdownPanelPortal}

      {/* Official School Notice & Notification Detail Modal */}
      <Modal
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title="Official School Notice & Notification"
        subtitle="Placido L. Señor National High School · School ID: 303035"
        maxWidth="xl"
      >
        {selectedItem && (
          <div className="space-y-5">
            {/* Institutional Header Banner */}
            <div className="rounded-2xl bg-[#1B2A4A] p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/15 text-amber-400 shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    {selectedItem.senderRole || 'ADMINISTRATION'} · Official Broadcast
                  </p>
                  <h4 className="text-sm sm:text-base font-extrabold tracking-tight">
                    Placido L. Señor National High School
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Issued by {selectedItem.senderName}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-start sm:items-end gap-1.5">
                <span className="rounded-md bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  {selectedItem.priority || 'Official Notice'}
                </span>
                <span className="text-[11px] text-slate-300 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-amber-300" />
                  {formatTimeAgo(selectedItem.createdAt)}
                </span>
              </div>
            </div>

            {/* Metadata Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex items-center gap-2.5">
                <UserCheck className="h-4 w-4 text-[#1B2A4A] shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Sender / Office
                  </span>
                  <span className="font-bold text-slate-800">
                    {selectedItem.senderName}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Notification Status
                  </span>
                  <span className="font-bold text-emerald-700">
                    {selectedItem.isRead ? 'Read & Acknowledged' : 'Unread Notice'}
                  </span>
                </div>
              </div>
            </div>

            {/* Full Notice Content */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-3">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-3">
                {selectedItem.title}
              </h3>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line min-h-[100px]">
                {selectedItem.content}
              </div>
            </div>

            {/* Optional Meeting Details */}
            {(selectedItem.meetingDate || selectedItem.meetingTime || selectedItem.venue) && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <h5 className="font-extrabold text-[#1B2A4A] flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-[#1B2A4A]" />
                  Schedule & Venue Information
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-700">
                  {selectedItem.meetingDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span>{selectedItem.meetingDate}</span>
                    </div>
                  )}
                  {selectedItem.meetingTime && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span>{selectedItem.meetingTime}</span>
                    </div>
                  )}
                  {selectedItem.venue && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      <span>{selectedItem.venue}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Optional Action Link */}
            {selectedItem.actionUrl && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <p className="font-extrabold text-slate-900">Related Portal Record</p>
                  <p className="text-slate-500">
                    Open the linked section in your portal to review details.
                  </p>
                </div>
                <Link
                  to={selectedItem.actionUrl}
                  onClick={() => setSelectedItem(null)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B2A4A] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0f1c3f] shrink-0"
                >
                  {selectedItem.actionLabel || 'Open Page'}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}

            {/* Footer Controls */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B2A4A] px-4 py-2 text-xs font-bold text-white hover:bg-[#0f1c3f] shadow-2xs transition-all cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                Done Reading
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export const PageHeaderNotificationSlot: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div id="page-header-notification-slot" className={`inline-flex items-center shrink-0 ml-auto self-start ${className}`} />
);
