import React, { useState, useEffect } from 'react';
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
    recipientType: 'all' as 'all' | 'student' | 'parent' | 'teacher' | 'registrar' | 'guidance' | 'specific',
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 sm:pr-14">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            Campus Announcements & User Notifications
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Publish official school circulars and send real-time notifications to students, parents, teachers, and staff.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsDirectNotifOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[#1B2A4A] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0f1c3f] transition-all cursor-pointer"
          >
            <Bell className="h-4 w-4 text-amber-400" /> Send Notification to Users
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" /> New Announcement
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

      {/* Grid of Announcements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-2"></div>
            <p>Loading announcements...</p>
          </div>
        ) : announcements.length > 0 ? (
          announcements.map((item) => {
            const rawAudience = String(item.target_audience || 'all')
              .replace(/_/g, ' ')
              .toUpperCase();
            const audienceLabel =
              rawAudience === 'PARENT TEACHER MEETING' ? 'PARENTS & TEACHERS' : rawAudience;

            return (
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
                className="group rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-emerald-600 hover:shadow-sm focus:outline-hidden transition-all flex flex-col justify-between cursor-pointer select-none"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2 text-[11px]">
                    <span className="flex items-center gap-1 text-slate-400 font-medium shrink-0">
                      <Calendar className="h-3 w-3 text-emerald-600" />
                      {formatDate(item.created_at)}
                    </span>

                    <div className="flex items-center gap-1 min-w-0">
                      <Badge
                        variant={
                          item.priority === 'urgent'
                            ? 'danger'
                            : item.priority === 'high'
                            ? 'warning'
                            : 'info'
                        }
                        size="sm"
                      >
                        {item.priority || 'Normal'}
                      </Badge>
                      <span className="truncate rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 uppercase">
                        {audienceLabel}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-800 transition-colors mb-1 line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 min-h-[2.25rem]">
                    {item.content}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 truncate">
                    <User className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="truncate">By {item.author || 'Administration'}</span>
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handlePushExistingAnnouncement(item, e)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-[#1B2A4A] hover:bg-[#1B2A4A] hover:text-white transition-colors cursor-pointer"
                      title="Send instant notification alert to users"
                    >
                      <Send className="h-2.5 w-2.5" /> Notify Users
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(item.id, e)}
                      className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                      title="Delete announcement"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400">
            No announcements published yet.
          </div>
        )}
      </div>

      {/* Publish Announcement Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Publish Official Announcement"
        subtitle="Broadcast circulars and automatically notify target users"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. General PTA Assembly & 1st Quarter Card Distribution"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Target Audience
              </label>
              <select
                value={form.targetAudience}
                onChange={(e) => setForm({ ...form, targetAudience: e.target.value as any })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="all">Everyone (All Users)</option>
                <option value="students">Students Only</option>
                <option value="parents">Parents & Guardians Only</option>
                <option value="teachers">Teachers Only</option>
                <option value="registrar">Registrar Staff</option>
                <option value="guidance">Guidance Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Priority Level
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="important">Important</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Message Content <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Provide complete details, dates, and instructions..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:outline-hidden"
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
              Send real-time notification alert to target users' Notification Bell
            </span>
          </label>

          <div className="pt-3 flex justify-end gap-2">
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
              <Megaphone className="h-3.5 w-3.5" /> Publish & Notify
            </button>
          </div>
        </form>
      </Modal>

      {/* Send Direct / Broadcast Notification Modal */}
      <Modal
        isOpen={isDirectNotifOpen}
        onClose={() => setIsDirectNotifOpen(false)}
        title="Send Notification to Portal Users"
        subtitle="Deliver an instant notification alert from the Administration"
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
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-[#1B2A4A] focus:outline-hidden"
              >
                <option value="all">All Users (Everyone)</option>
                <option value="student">All Students</option>
                <option value="parent">All Parents & Guardians</option>
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
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-[#1B2A4A] focus:outline-hidden"
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
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-[#1B2A4A] focus:outline-hidden"
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
              placeholder="e.g. Important Advisory from the Office of the Principal"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-[#1B2A4A] focus:outline-hidden"
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
              placeholder="Enter the message that users will receive in their Notification Bell..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-[#1B2A4A] focus:outline-hidden"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
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

      {/* View Full Announcement Modal */}
      <Modal
        isOpen={Boolean(selectedAnnouncement)}
        onClose={() => setSelectedAnnouncement(null)}
        title="Official School Circular Preview"
        subtitle="Placido L. Señor National High School · School ID: 303035"
        maxWidth="md"
      >
        {selectedAnnouncement && (
          <div className="space-y-3.5">
            <div className="rounded-xl bg-gradient-to-r from-[#0f1c3f] via-[#1B2A4A] to-[#243B67] p-3.5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400/20 text-amber-300">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    Audience:{' '}
                    {String(selectedAnnouncement.target_audience || 'all')
                      .replace(/_/g, ' ')
                      .toUpperCase()}
                  </p>
                  <h4 className="text-xs font-extrabold">
                    Placido L. Señor National High School
                  </h4>
                </div>
              </div>
              <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-950">
                {selectedAnnouncement.priority || 'Normal'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                {selectedAnnouncement.title}
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {selectedAnnouncement.content}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500">
                Published on {formatDate(selectedAnnouncement.created_at)} by{' '}
                <strong className="text-slate-700">
                  {selectedAnnouncement.author || 'Administration'}
                </strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    handlePushExistingAnnouncement(selectedAnnouncement, e);
                    setSelectedAnnouncement(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800 cursor-pointer"
                >
                  <Send className="h-3 w-3" /> Re-Notify Users
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAnnouncement(null)}
                  className="rounded-xl bg-[#1B2A4A] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0f1c3f] cursor-pointer"
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
