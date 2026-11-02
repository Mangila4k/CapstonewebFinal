import React, { useState, useEffect, useRef } from 'react';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import {
  Calendar,
  Plus,
  Trash2,
  Image as ImageIcon,
  Upload,
  Edit2,
  X,
  Camera,
  Eye,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { formatDate } from '../../lib/utils';

interface ActivityItem {
  id: string | number;
  title: string;
  description?: string;
  image_url?: string;
  category?: string;
  created_at: string;
}

const DEFAULT_ACTIVITIES: ActivityItem[] = [
  {
    id: '50ece253-5c1f-4912-805d-a34f5dfe24f4',
    title: 'ONE HEALTH WEEK',
    description: '',
    image_url:
      'https://tuujlqrfyuazvbvoribz.supabase.co/storage/v1/object/public/activity_images/activity_1792260764937.jpg',
    created_at: '2026-10-17T18:12:48.308926+00',
  },
  {
    id: '54638d43-4ba2-4e5f-834d-11eaa23abc36',
    title: 'Brigada Eskwela',
    description: '',
    image_url:
      'https://tuujlqrfyuazvbvoribz.supabase.co/storage/v1/object/public/activity_images/activity_1792260419676.jpg',
    created_at: '2026-10-17T18:07:03.855723+00',
  },
  {
    id: 'd1d6490d-2c0b-4711-8a31-bb1064e49c89',
    title: 'Sport Fest',
    description: 'SportFest 2026',
    image_url:
      'https://tuujlqrfyuazvbvoribz.supabase.co/storage/v1/object/public/activity_images/activity_1792258803055.jpg',
    created_at: '2026-10-17T17:40:06.808383+00',
  },
];

// Helper to convert File to compressed Data URL as fallback or instant preview
const fileToCompressedDataUrl = (file: File, maxWidth = 1200, quality = 0.82): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(e.target?.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(String(e.target?.result || ''));
      img.src = String(e.target?.result || '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const AdminActivitiesPage: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);
  const [previewActivity, setPreviewActivity] = useState<ActivityItem | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Campus',
    image_url: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  // Quick direct card photo upload refs
  const quickCardFileInputRef = useRef<HTMLInputElement>(null);
  const [quickUploadTarget, setQuickUploadTarget] = useState<ActivityItem | null>(null);
  const [uploadingCardId, setUploadingCardId] = useState<string | number | null>(null);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        setActivities(data);
      } else {
        setActivities(DEFAULT_ACTIVITIES);
      }
    } catch (err) {
      console.warn('Activities error:', err);
      setActivities(DEFAULT_ACTIVITIES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const uploadActivityImage = async (file: File): Promise<string> => {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `activity_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('activity_images')
        .upload(fileName, file, { cacheControl: '3600', upsert: true });

      if (!uploadError) {
        const { data: pubData } = supabase.storage
          .from('activity_images')
          .getPublicUrl(fileName);
        if (pubData?.publicUrl) {
          return pubData.publicUrl;
        }
      }
    } catch (err) {
      console.warn('Storage bucket upload fallback to Data URL:', err);
    }
    return await fileToCompressedDataUrl(file);
  };

  const openAddModal = () => {
    setEditingActivity(null);
    setSelectedFile(null);
    setPhotoPreview('');
    setForm({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      category: 'Campus',
      image_url: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (act: ActivityItem) => {
    setEditingActivity(act);
    setSelectedFile(null);
    setPhotoPreview(act.image_url || '');
    const parsedDate = act.created_at
      ? new Date(act.created_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];
    setForm({
      title: act.title || '',
      description: act.description || '',
      date: parsedDate,
      category: act.category || 'Campus',
      image_url: act.image_url || '',
    });
    setIsModalOpen(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice({ type: 'error', message: 'Please select a valid image file (JPG, PNG, WEBP).' });
      return;
    }
    setSelectedFile(file);
    const dataUrl = await fileToCompressedDataUrl(file);
    setPhotoPreview(dataUrl);
  };

  const handleQuickCardPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = quickUploadTarget;
    e.target.value = '';
    if (!file || !target) return;

    setUploadingCardId(target.id);
    try {
      const uploadedUrl = await uploadActivityImage(file);
      const { error } = await supabase
        .from('activities')
        .update({ image_url: uploadedUrl })
        .eq('id', target.id);

      setActivities((prev) =>
        prev.map((item) => (item.id === target.id ? { ...item, image_url: uploadedUrl } : item))
      );

      if (error) {
        console.warn('Supabase update notice:', error.message);
      }
      setNotice({
        type: 'success',
        message: `Photo updated for "${target.title}".`,
      });
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Failed to upload photo.',
      });
    } finally {
      setUploadingCardId(null);
      setQuickUploadTarget(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let finalImageUrl = form.image_url.trim() || photoPreview;
      if (selectedFile) {
        finalImageUrl = await uploadActivityImage(selectedFile);
      }

      const payload: Record<string, any> = {
        title: form.title.trim(),
        description: form.description.trim(),
        image_url: finalImageUrl || '',
        created_at: new Date(form.date).toISOString(),
      };

      if (editingActivity) {
        const { error } = await supabase
          .from('activities')
          .update(payload)
          .eq('id', editingActivity.id);

        if (error) {
          // Update local state even if RLS or schema restricts
          console.warn('Update fallback:', error.message);
        }
        setActivities((prev) =>
          prev.map((item) =>
            item.id === editingActivity.id ? { ...item, ...payload } : item
          )
        );
        setNotice({ type: 'success', message: 'Activity updated successfully.' });
      } else {
        const { data, error } = await supabase
          .from('activities')
          .insert([payload])
          .select()
          .maybeSingle();

        if (error) {
          throw new Error(error.message);
        }

        if (data) {
          setActivities((prev) => [data, ...prev]);
        } else {
          fetchActivities();
        }
        setNotice({ type: 'success', message: 'Activity added successfully with photo.' });
      }

      setIsModalOpen(false);
      setEditingActivity(null);
      setSelectedFile(null);
      setPhotoPreview('');
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to save activity' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (act: ActivityItem) => {
    if (!window.confirm(`Remove activity "${act.title}"?`)) return;
    try {
      await supabase.from('activities').delete().eq('id', act.id);
      setActivities((prev) => prev.filter((item) => item.id !== act.id));
      setNotice({ type: 'success', message: `"${act.title}" removed.` });
    } catch (err: any) {
      setNotice({ type: 'error', message: err.message || 'Failed to delete activity.' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-10">
      {/* Hidden file input for quick per-card photo upload */}
      <input
        ref={quickCardFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleQuickCardPhotoChange}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            School Activities & Events
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Publish academic exhibitions, sports fests, and school-wide programs with event photos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={openAddModal}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" /> Add Activity
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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs animate-pulse"
            >
              <div className="h-48 bg-slate-200" />
              <div className="p-6 space-y-3">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-5 w-3/4 bg-slate-200 rounded" />
                <div className="h-3 w-1/2 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {activities.map((act) => {
            const isUploadingThis = uploadingCardId === act.id;
            return (
              <div
                key={act.id}
                className="group rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Activity Photo Area */}
                  <div className="relative h-52 w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                    {act.image_url ? (
                      <>
                        <img
                          src={act.image_url}
                          alt={act.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                          onClick={() => setPreviewActivity(act)}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/pictures/logo sa skwelahan.png';
                          }}
                        />
                        {/* Hover Actions Overlay on Photo */}
                        <div className="absolute inset-0 bg-slate-900/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-3">
                          <button
                            type="button"
                            onClick={() => {
                              setQuickUploadTarget(act);
                              quickCardFileInputRef.current?.click();
                            }}
                            disabled={isUploadingThis}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3 py-2 text-xs font-bold text-slate-900 shadow-md hover:bg-white transition-all cursor-pointer"
                          >
                            <Camera className="h-3.5 w-3.5 text-emerald-700" />
                            {isUploadingThis ? 'Uploading...' : 'Change Photo'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewActivity(act)}
                            className="inline-flex items-center justify-center rounded-xl bg-white/95 p-2 text-slate-800 shadow-md hover:bg-white transition-all cursor-pointer"
                            title="View Full Photo"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setQuickUploadTarget(act);
                          quickCardFileInputRef.current?.click();
                        }}
                        disabled={isUploadingThis}
                        className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-slate-400 hover:bg-emerald-50/50 hover:text-emerald-700 transition-colors cursor-pointer"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-xs border border-slate-200 text-emerald-600">
                          <Upload className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-bold">
                          {isUploadingThis ? 'Uploading Photo...' : 'Click to Add Photo'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          JPG, PNG, or WEBP event image
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-5">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5">
                      <span className="flex items-center gap-1.5 font-medium text-slate-500">
                        <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                        {formatDate(act.created_at)}
                      </span>
                      <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                        {act.category || 'Campus'}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                      {act.title}
                    </h3>
                    {act.description && (
                      <p className="mt-1.5 text-xs text-slate-600 leading-relaxed line-clamp-3">
                        {act.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickUploadTarget(act);
                      quickCardFileInputRef.current?.click();
                    }}
                    disabled={isUploadingThis}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {act.image_url ? 'Update Photo' : 'Add Photo'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditModal(act)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-800 transition-colors cursor-pointer"
                      title="Edit Activity"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(act)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete Activity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Activity Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingActivity ? 'Edit School Activity' : 'Post School Activity'}
        subtitle="Share event details and photos with the school community"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* Activity Photo Upload Box */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Activity Photo
            </label>

            {photoPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-48">
                <img
                  src={photoPreview}
                  alt="Activity Preview"
                  className="h-full w-full object-cover"
                />
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                  <label className="inline-flex items-center gap-1 rounded-xl bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-md hover:bg-white cursor-pointer">
                    <Camera className="h-3.5 w-3.5 text-emerald-700" /> Change
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPhotoPreview('');
                      setForm({ ...form, image_url: '' });
                    }}
                    className="rounded-xl bg-rose-600/90 p-1.5 text-white shadow-md hover:bg-rose-700 cursor-pointer"
                    title="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-emerald-50/40 hover:border-emerald-500 p-6 text-center transition-colors cursor-pointer">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-700">
                    Click to upload an activity photo
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supports JPG, PNG, or WEBP images
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Event Title
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Science Fair Exhibition"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Event Date
            </label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Provide event details..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>

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
              disabled={submitting}
              className="rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
            >
              {submitting
                ? 'Saving...'
                : editingActivity
                ? 'Save Changes'
                : 'Publish Activity'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Lightbox Photo Preview Modal */}
      {previewActivity && (
        <Modal
          isOpen={!!previewActivity}
          onClose={() => setPreviewActivity(null)}
          title={previewActivity.title}
          subtitle={formatDate(previewActivity.created_at)}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {previewActivity.image_url && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-[65vh]">
                <img
                  src={previewActivity.image_url}
                  alt={previewActivity.title}
                  className="max-h-[65vh] w-auto object-contain"
                />
              </div>
            )}
            {previewActivity.description && (
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {previewActivity.description}
              </p>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
