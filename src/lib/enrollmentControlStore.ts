import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

export interface EnrollmentControlSettings {
  isOpen: boolean;
  schoolYear: string;
  semester: string;
  message?: string;
  updatedAt?: string;
  updatedBy?: string;
}

const STORAGE_KEY = 'plsnhs_enrollment_control_v1';
export const ENROLLMENT_STATUS_EVENT = 'plsnhs_enrollment_status_changed';

const DEFAULT_SETTINGS: EnrollmentControlSettings = {
  isOpen: true,
  schoolYear: '2026–2027',
  semester: '1st Semester',
  message:
    'Online admissions and student enrollment for Placido L. Señor National High School are currently closed by the School Administration.',
  updatedAt: new Date().toISOString(),
  updatedBy: 'School Administrator',
};

/**
 * Synchronous local retrieval of current enrollment settings.
 */
export function getEnrollmentStatus(): EnrollmentControlSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        isOpen: Boolean(parsed.isOpen),
      };
    }
  } catch {
    // fallback
  }
  return DEFAULT_SETTINGS;
}

/**
 * Saves enrollment settings to localStorage and dispatches window broadcast.
 */
function persistLocalSettings(settings: EnrollmentControlSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(
      new CustomEvent(ENROLLMENT_STATUS_EVENT, { detail: settings })
    );
  } catch (err) {
    console.warn('Could not persist enrollment control settings to localStorage:', err);
  }
}

/**
 * Asynchronously fetch live enrollment control settings from Supabase `app_settings`
 */
export async function fetchEnrollmentStatus(): Promise<EnrollmentControlSettings> {
  const current = getEnrollmentStatus();
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value, updated_at')
      .in('key', [
        'enrollment_open',
        'enrollment_school_year',
        'enrollment_semester',
        'enrollment_closed_message',
        'enrollment_updated_by',
      ]);

    if (error) {
      console.warn('Could not fetch app_settings from Supabase:', error.message);
      return current;
    }

    if (data && data.length > 0) {
      const kvMap: Record<string, { value: string; updated_at?: string }> = {};
      data.forEach((row: any) => {
        kvMap[row.key] = { value: row.value, updated_at: row.updated_at };
      });

      const isOpen =
        kvMap['enrollment_open'] !== undefined
          ? kvMap['enrollment_open'].value === 'true'
          : current.isOpen;

      const schoolYear = kvMap['enrollment_school_year']?.value || current.schoolYear;
      const semester = kvMap['enrollment_semester']?.value || current.semester;
      const message = kvMap['enrollment_closed_message']?.value || current.message;
      const updatedBy = kvMap['enrollment_updated_by']?.value || current.updatedBy;
      const updatedAt =
        kvMap['enrollment_open']?.updated_at ||
        kvMap['enrollment_school_year']?.updated_at ||
        current.updatedAt;

      const resolved: EnrollmentControlSettings = {
        isOpen,
        schoolYear,
        semester,
        message,
        updatedBy,
        updatedAt,
      };

      persistLocalSettings(resolved);
      return resolved;
    }
  } catch (err) {
    console.warn('Error reading enrollment control status:', err);
  }
  return current;
}

/**
 * Admin toggles or updates enrollment status in Supabase and local cache.
 */
export async function setEnrollmentStatus(
  isOpen: boolean,
  details?: Partial<EnrollmentControlSettings>
): Promise<EnrollmentControlSettings> {
  const previous = getEnrollmentStatus();
  const now = new Date().toISOString();

  const newSettings: EnrollmentControlSettings = {
    ...previous,
    ...details,
    isOpen,
    updatedAt: now,
    updatedBy: details?.updatedBy || 'School Administrator',
  };

  // 1. Immediately persist locally so UI responds with zero lag
  persistLocalSettings(newSettings);

  // 2. Upsert to Supabase `app_settings`
  try {
    const rowsToUpsert = [
      {
        key: 'enrollment_open',
        value: String(isOpen),
        updated_at: now,
      },
      {
        key: 'enrollment_school_year',
        value: newSettings.schoolYear,
        updated_at: now,
      },
      {
        key: 'enrollment_semester',
        value: newSettings.semester,
        updated_at: now,
      },
      {
        key: 'enrollment_closed_message',
        value: newSettings.message || DEFAULT_SETTINGS.message,
        updated_at: now,
      },
      {
        key: 'enrollment_updated_by',
        value: newSettings.updatedBy,
        updated_at: now,
      },
    ];

    await supabase.from('app_settings').upsert(rowsToUpsert, { onConflict: 'key' });

    // 3. Log to activity_logs
    try {
      const logRecord = {
        role: 'admin',
        action: isOpen ? 'Enrollment Opened' : 'Enrollment Closed',
        details: `Administrator toggled student enrollment ${isOpen ? 'ON (OPEN)' : 'OFF (CLOSED)'} for S.Y. ${newSettings.schoolYear}.`,
        timestamp: now,
      };
      await supabase.from('activity_logs').insert([logRecord]);
      window.dispatchEvent(new CustomEvent('plsnhs-activity-logged', { detail: logRecord }));
    } catch {
      // ignore
    }

    // 4. Send official notification to the portal
    try {
      await supabase.from('notifications').insert({
        title: isOpen ? 'Enrollment is Now Open' : 'Enrollment Has Been Closed',
        message: isOpen
          ? `School Administration has opened student enrollment applications for S.Y. ${newSettings.schoolYear}.`
          : `Student enrollment for S.Y. ${newSettings.schoolYear} is now officially closed by School Administration.`,
        type: 'enrollment',
        role: 'student',
      });
      window.dispatchEvent(new Event('plsnhs-broadcast-updated'));
    } catch {
      // ignore
    }
  } catch (err) {
    console.warn('Could not sync enrollment status to Supabase:', err);
  }

  return newSettings;
}

/**
 * React hook to listen for live enrollment status updates in any component.
 */
export function useEnrollmentStatus() {
  const [settings, setSettings] = useState<EnrollmentControlSettings>(getEnrollmentStatus);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const live = await fetchEnrollmentStatus();
    setSettings(live);
    return live;
  }, []);

  useEffect(() => {
    let mounted = true;

    // Initial fetch
    fetchEnrollmentStatus().then((res) => {
      if (mounted) {
        setSettings(res);
        setLoading(false);
      }
    });

    // Listen to local broadcast events
    const handleStatusChanged = (e: any) => {
      if (!mounted) return;
      if (e.detail) {
        setSettings(e.detail);
      } else {
        setSettings(getEnrollmentStatus());
      }
    };

    window.addEventListener(ENROLLMENT_STATUS_EVENT, handleStatusChanged);
    window.addEventListener('storage', handleStatusChanged);

    // Subscribe to Supabase realtime table changes for `app_settings`
    const channel = supabase
      .channel('app_settings_enrollment_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        () => {
          fetchEnrollmentStatus().then((res) => {
            if (mounted) setSettings(res);
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      window.removeEventListener(ENROLLMENT_STATUS_EVENT, handleStatusChanged);
      window.removeEventListener('storage', handleStatusChanged);
      supabase.removeChannel(channel);
    };
  }, []);

  const setStatus = useCallback(
    async (isOpen: boolean, details?: Partial<EnrollmentControlSettings>) => {
      const updated = await setEnrollmentStatus(isOpen, details);
      setSettings(updated);
      return updated.isOpen;
    },
    []
  );

  return {
    settings,
    isOpen: settings.isOpen,
    loading,
    setStatus,
    refresh,
  };
}

