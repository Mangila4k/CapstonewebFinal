import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Determines whether the student must complete all information manually:
 * - Grade 7 students (incoming from elementary school)
 * - Transferees (students transferring from another secondary school)
 *
 * For continuing learners in Grades 8 through 12, entering their 12-digit LRN
 * automatically populates their Grade 7 school records, and they only need
 * to provide their latest Report Card.
 */
export function isLrnManualRequired(gradeLevel?: string, studentType?: string): boolean {
  const normalizedGrade = (gradeLevel || '').trim().toLowerCase();
  const normalizedType = (studentType || '').trim().toLowerCase();
  if (normalizedGrade === 'grade 7' || normalizedGrade === '7') return true;
  if (normalizedType === 'transferee') return true;
  return false;
}

export function isGrade7OrTransferee(gradeLevel?: string, studentType?: string): boolean {
  return isLrnManualRequired(gradeLevel, studentType);
}

/**
 * Generates an institutional 12-digit DepEd Learner Reference Number (LRN)
 * using Placido L. Señor NHS division prefix (119518).
 */
export function generateAutoLrn(seed?: string): string {
  const prefix = '119518';
  let hash = 0;
  if (seed && seed.trim()) {
    const clean = seed.trim().toLowerCase();
    for (let i = 0; i < clean.length; i++) {
      hash = (hash * 31 + clean.charCodeAt(i)) % 900000;
    }
  }
  if (!hash) {
    hash = Math.floor(100000 + Math.random() * 900000);
  }
  const suffix = String(100000 + (Math.abs(hash) % 900000));
  return `${prefix}${suffix}`;
}
