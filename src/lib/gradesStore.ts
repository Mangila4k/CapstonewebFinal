/**
 * Centralized Grades Storage & Synchronization Engine
 * PLSNHS — Placido L. Señor National High School
 * 
 * Provides unified, resilient persistence across:
 * 1. Supabase 'grades' cloud table
 * 2. High-speed local cache (plshs_teacher_grades_store)
 * 3. Real-time broadcast channel across teacher encoder, student SF9, and parent portal
 */

import { supabase } from './supabase';

export interface GradeRecord {
  id?: string;
  student_id: string | number;
  subject_id: string;
  section_id?: string | null;
  school_year: string;
  quarter: number; // 1, 2, 3, or 4
  grade: number; // 60 - 100
  remarks?: 'Passed' | 'Failed';
  updated_at?: string;
}

const STORAGE_KEY = 'plshs_teacher_grades_store_v1';

/**
 * Read local cache of encoded grades
 */
export function getLocalGradesCache(): Record<string, GradeRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('Failed to parse local grades cache:', err);
    return {};
  }
}

/**
 * Write local cache of encoded grades
 */
export function saveLocalGradesCache(cache: Record<string, GradeRecord>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    // Trigger custom event so other tabs/components update in real time
    window.dispatchEvent(new CustomEvent('plshs_grades_updated'));
  } catch (err) {
    console.warn('Failed to write local grades cache:', err);
  }
}

/**
 * Create consistent compound key: student_id:subject_id:school_year:quarter
 */
export function makeGradeKey(
  studentId: string | number,
  subjectId: string,
  schoolYear: string,
  quarter: number
): string {
  return `${studentId}:::${subjectId}:::${schoolYear}:::${quarter}`;
}

/**
 * Fetch all grades for a specific student across cloud and local cache
 */
export async function fetchGradesForStudent(
  studentId: string | number,
  schoolYear: string = '2026–2027'
): Promise<GradeRecord[]> {
  const mergedMap = new Map<string, GradeRecord>();

  // 1. Fetch from Supabase
  try {
    const { data: cloudGrades, error } = await supabase
      .from('grades')
      .select('*')
      .eq('student_id', studentId);

    if (!error && cloudGrades && cloudGrades.length > 0) {
      cloudGrades.forEach((g: any) => {
        const k = makeGradeKey(g.student_id, g.subject_id, g.school_year || schoolYear, Number(g.quarter));
        mergedMap.set(k, {
          id: g.id,
          student_id: g.student_id,
          subject_id: g.subject_id,
          section_id: g.section_id,
          school_year: g.school_year || schoolYear,
          quarter: Number(g.quarter),
          grade: Number(g.grade),
          remarks: Number(g.grade) >= 75 ? 'Passed' : 'Failed',
          updated_at: g.updated_at,
        });
      });
    }
  } catch (err) {
    console.warn('Error fetching cloud grades for student:', err);
  }

  // 2. Overlay local cache (which contains latest teacher inputs)
  const localCache = getLocalGradesCache();
  Object.values(localCache).forEach((g) => {
    if (String(g.student_id) === String(studentId)) {
      const k = makeGradeKey(g.student_id, g.subject_id, g.school_year || schoolYear, g.quarter);
      mergedMap.set(k, g);
    }
  });

  return Array.from(mergedMap.values());
}

/**
 * Fetch recorded grades for a subject and a list of students
 */
export async function fetchSubjectGradesForRoster(
  subjectId: string,
  studentIds: (string | number)[],
  schoolYear: string = '2026–2027'
): Promise<Record<string | number, Record<number, number>>> {
  const resultMap: Record<string | number, Record<number, number>> = {};

  studentIds.forEach((sid) => {
    resultMap[sid] = {};
  });

  // 1. Fetch from Supabase
  try {
    if (subjectId && studentIds.length > 0) {
      const { data: dbGrades, error } = await supabase
        .from('grades')
        .select('*')
        .eq('subject_id', subjectId)
        .in('student_id', studentIds);

      if (!error && dbGrades && dbGrades.length > 0) {
        dbGrades.forEach((g: any) => {
          const sid = g.student_id;
          const q = Number(g.quarter);
          const val = Number(g.grade);
          if (resultMap[sid] && q >= 1 && q <= 4 && !isNaN(val) && val > 0) {
            resultMap[sid][q] = val;
          }
        });
      }
    }
  } catch (err) {
    console.warn('Error querying roster grades from cloud:', err);
  }

  // 2. Overlay local cache for the subject
  const localCache = getLocalGradesCache();
  Object.values(localCache).forEach((g) => {
    if (g.subject_id === subjectId && (g.school_year === schoolYear || !g.school_year)) {
      const sid = g.student_id;
      if (resultMap[sid] !== undefined && g.quarter >= 1 && g.quarter <= 4) {
        if (typeof g.grade === 'number' && g.grade > 0) {
          resultMap[sid][g.quarter] = g.grade;
        }
      }
    }
  });

  return resultMap;
}

/**
 * Persist teacher's encoded grades to both local cache and Supabase
 */
export async function saveGradesToStore(
  records: GradeRecord[]
): Promise<{
  success: boolean;
  count: number;
  savedToCloud: boolean;
  error?: string;
}> {
  if (!records || records.length === 0) {
    return { success: true, count: 0, savedToCloud: false };
  }

  // 1. Always immediately update local cache so inputs are NEVER lost
  const localCache = getLocalGradesCache();
  records.forEach((rec) => {
    const k = makeGradeKey(rec.student_id, rec.subject_id, rec.school_year, rec.quarter);
    localCache[k] = {
      ...rec,
      updated_at: new Date().toISOString(),
    };
  });
  saveLocalGradesCache(localCache);

  // 2. Attempt upsert to Supabase
  let savedToCloud = false;
  let cloudError: string | undefined;

  try {
    const rowsToUpsert = records.map((r) => ({
      student_id: r.student_id,
      subject_id: r.subject_id,
      section_id: r.section_id || null,
      school_year: r.school_year,
      quarter: r.quarter,
      grade: r.grade,
      remarks: r.grade >= 75 ? 'Passed' : 'Failed',
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('grades')
      .upsert(rowsToUpsert, {
        onConflict: 'student_id,subject_id,school_year,quarter',
      });

    if (!error) {
      savedToCloud = true;
    } else {
      cloudError = error.message;
      console.warn('Notice from Supabase grades upsert:', error.message);
    }
  } catch (err: any) {
    cloudError = err?.message || String(err);
    console.warn('Exception during Supabase grades upsert:', err);
  }

  return {
    success: true,
    count: records.length,
    savedToCloud,
    error: cloudError,
  };
}

/**
 * Clear cached grades for a specific subject (optional utility for teachers)
 */
export function clearCachedGradesForSubject(subjectId: string): void {
  const localCache = getLocalGradesCache();
  const filtered: Record<string, GradeRecord> = {};
  Object.entries(localCache).forEach(([key, rec]) => {
    if (rec.subject_id !== subjectId) {
      filtered[key] = rec;
    }
  });
  saveLocalGradesCache(filtered);
}

