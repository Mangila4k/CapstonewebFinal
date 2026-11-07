// Utility helper to parse LRN from QR Codes, Barcodes, URLs, or manual input
// and provide synthesized audio feedback via Web Audio API

/**
 * Extracts a clean 10-12 digit Learner Reference Number (LRN) from various scan formats:
 * - Direct LRN string: "109823456789"
 * - Verify URL: "https://.../verify-id?lrn=109823456789&name=..."
 * - JSON payload: '{"lrn": "109823456789"}'
 * - DepEd barcode prefix: "PLSNHS-LRN-109823456789"
 */
export function parseLrnFromInput(rawInput: string): string {
  if (!rawInput) return '';
  const trimmed = rawInput.trim();

  // 1. Try URL parsing
  if (trimmed.includes('http://') || trimmed.includes('https://') || trimmed.includes('verify-id')) {
    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `http://dummy.com/${trimmed}`);
      const lrnParam = url.searchParams.get('lrn');
      if (lrnParam && lrnParam.trim()) {
        return lrnParam.trim();
      }
    } catch {
      // Fall through to regex
    }
  }

  // 2. Try JSON parsing
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.lrn) return String(parsed.lrn).trim();
      if (parsed.student_lrn) return String(parsed.student_lrn).trim();
      if (parsed.id) return String(parsed.id).trim();
    } catch {
      // Fall through to regex
    }
  }

  // 3. Regex match for lrn=XXXX parameter
  const lrnMatch = trimmed.match(/lrn=([0-9]{10,12})/i);
  if (lrnMatch && lrnMatch[1]) {
    return lrnMatch[1];
  }

  // 4. Regex match for 10-12 continuous digits (Standard DepEd LRN)
  const digitsMatch = trimmed.match(/\b([0-9]{10,12})\b/);
  if (digitsMatch && digitsMatch[1]) {
    return digitsMatch[1];
  }

  // 5. Fallback: digits only extraction if between 6 and 14 digits
  const allDigits = trimmed.replace(/\D/g, '');
  if (allDigits.length >= 6 && allDigits.length <= 14) {
    return allDigits;
  }

  // Fallback to cleaned alphanumeric
  return trimmed;
}

/**
 * Normalizes section names for accurate comparison
 * Examples: "Section Almario" -> "Almario", "11 - Almario" -> "Almario", "Almario" -> "Almario"
 */
export function normalizeSectionName(sec?: string | null): string {
  if (!sec) return '';
  let cleaned = String(sec).trim();
  // Strip Grade prefix like "Grade 11 - ", "11-", "Grade 10 "
  cleaned = cleaned.replace(/^Grade\s*\d+\s*[-–—:]*\s*/i, '');
  cleaned = cleaned.replace(/^\d+\s*[-–—:]*\s*/, '');
  // Strip "Section" or "Sec." prefix
  cleaned = cleaned.replace(/^Section\s+/i, '');
  cleaned = cleaned.replace(/^Sec\.?\s+/i, '');
  return cleaned.trim();
}

/**
 * Normalizes grade levels to standard "Grade X" format
 * Examples: "11" -> "Grade 11", "Grade 11" -> "Grade 11", "G11" -> "Grade 11"
 */
export function normalizeGradeLevel(grade?: string | null): string {
  if (!grade) return '';
  const match = String(grade).match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num >= 7 && num <= 12) {
      return `Grade ${num}`;
    }
  }
  return String(grade).trim();
}

export interface AttendanceSectionValidation {
  isValid: boolean;
  studentSection: string;
  studentGrade: string;
  targetSection: string;
  targetGrade: string;
  errorMessage?: string;
}

/**
 * Validates that a student belongs to the section and year level being scanned for.
 * If targetSection or targetGrade is specified, a student from a different section
 * or different year level is strictly denied.
 */
export function validateStudentSectionAndGrade(
  studentSection: string | null | undefined,
  studentGrade: string | null | undefined,
  targetSection: string | null | undefined,
  targetGrade?: string | null | undefined
): AttendanceSectionValidation {
  const normStudentSec = normalizeSectionName(studentSection);
  const normStudentGrade = normalizeGradeLevel(studentGrade);
  const normTargetSec = normalizeSectionName(targetSection);
  const normTargetGrade = targetGrade && targetGrade !== 'All' ? normalizeGradeLevel(targetGrade) : '';

  // If targetSection is 'All' or not specified, no section-specific restriction is applied
  if (!normTargetSec || normTargetSec.toLowerCase() === 'all') {
    return {
      isValid: true,
      studentSection: normStudentSec,
      studentGrade: normStudentGrade,
      targetSection: normTargetSec,
      targetGrade: normTargetGrade,
    };
  }

  const isSecMatch = normStudentSec.toLowerCase() === normTargetSec.toLowerCase();
  const isGradeMatch = !normTargetGrade || normStudentGrade.toLowerCase() === normTargetGrade.toLowerCase();

  if (!isSecMatch || !isGradeMatch) {
    let reason = '';
    const studentLabel = normStudentGrade ? `${normStudentGrade} · Section ${normStudentSec || 'Unassigned'}` : `Section ${normStudentSec || 'Unassigned'}`;
    const targetLabel = normTargetGrade ? `${normTargetGrade} · Section ${normTargetSec}` : `Section ${normTargetSec}`;

    if (!isSecMatch && !isGradeMatch) {
      reason = `Student is assigned to ${studentLabel}, but this class is ${targetLabel}.`;
    } else if (!isSecMatch) {
      reason = `Student belongs to Section ${normStudentSec || 'Unassigned'}, but this class is Section ${normTargetSec}.`;
    } else {
      reason = `Student is in ${normStudentGrade}, but this class is ${normTargetGrade}.`;
    }

    return {
      isValid: false,
      studentSection: normStudentSec,
      studentGrade: normStudentGrade,
      targetSection: normTargetSec,
      targetGrade: normTargetGrade,
      errorMessage: `❌ Attendance Denied: ${reason} Students can only record attendance within their assigned section and year level.`,
    };
  }

  return {
    isValid: true,
    studentSection: normStudentSec,
    studentGrade: normStudentGrade,
    targetSection: normTargetSec,
    targetGrade: normTargetGrade,
  };
}

/**
 * Synthesizes audio feedback using the Web Audio API without needing external mp3 files
 */
export function playAttendanceSound(type: 'success' | 'warning' | 'error' = 'success'): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      // Crisp pleasant double chime (880Hz -> 1320Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'warning') {
      // Warm amber alert (659Hz -> 523Hz)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(523.25, now + 0.1);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      // Low alert buzz (220Hz)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.18);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (err) {
    console.debug('Web Audio not available or user interaction required:', err);
  }
}
