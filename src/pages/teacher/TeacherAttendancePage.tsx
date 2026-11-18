import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import {
  CheckCircle2,
  Save,
  QrCode,
  Search,
  UserCheck,
  Layers,
  Camera,
  VideoOff,
  GraduationCap,
  Users,
  BookOpen,
  MapPin,
  Maximize2,
  Clock,
  Upload,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  logAttendanceRecord,
  fetchAttendanceRecords,
  getLocalTodayStr,
  resolveTeacherRecordId,
  broadcastAttendanceUpdate,
} from '../../lib/attendanceService';
import { ensureAuthenticatedSession } from '../../lib/studentDocumentsService';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/common/Alert';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import {
  parseLrnFromInput,
  playAttendanceSound,
  validateStudentSectionAndGrade,
  normalizeSectionName,
  normalizeGradeLevel,
} from '../../lib/attendanceParser';
import type { Student, Section } from '../../types';

interface AttendanceClassCard {
  id: string;
  grade_level: string;
  name: string;
  subject: string;
  strand?: string | null;
  count: number;
  room: string;
  time: string;
  isAdvisory?: boolean;
}

const DEFAULT_ATTENDANCE_CLASSES: AttendanceClassCard[] = [
  {
    id: 'sec-1',
    grade_level: 'Grade 10',
    name: 'Generosity',
    subject: 'General Mathematics',
    strand: null,
    count: 37,
    room: 'Rm 201 • Bldg A',
    time: '07:30 AM – 08:30 AM',
    isAdvisory: true,
  },
  {
    id: 'sec-2',
    grade_level: 'Grade 10',
    name: 'Wisdom',
    subject: 'Pre-Calculus (Specialized)',
    strand: null,
    count: 40,
    room: 'Math Lab • Bldg A',
    time: '08:30 AM – 09:30 AM',
  },
  {
    id: 'sec-3',
    grade_level: 'Grade 10',
    name: 'Perseverance',
    subject: 'Mathematics 10',
    strand: null,
    count: 36,
    room: 'Rm 105 • JHS Bldg',
    time: '10:00 AM – 11:00 AM',
  },
  {
    id: 'sec-4',
    grade_level: 'Grade 10',
    name: 'Kindness',
    subject: 'Statistics & Probability',
    strand: null,
    count: 38,
    room: 'Rm 304 • SHS Bldg',
    time: '01:00 PM – 02:00 PM',
  },
  {
    id: 'sec-5',
    grade_level: 'Grade 10',
    name: 'Honesty',
    subject: 'Practical Research 1',
    strand: null,
    count: 35,
    room: 'Rm 204 • Bldg B',
    time: '02:00 PM – 03:00 PM',
  },
  {
    id: 'sec-6',
    grade_level: 'Grade 11',
    name: 'Baltazar',
    subject: 'Mathematics 9',
    strand: 'STEM',
    count: 41,
    room: 'Rm 108 • JHS Bldg',
    time: '03:00 PM – 04:00 PM',
  },
];

const ALL_GRADES = [
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
];

export const TeacherAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedSection = searchParams.get('section');
  const autoScan = searchParams.get('scan');

  const [sections, setSections] = useState<Section[]>([]);
  const [classCards, setClassCards] = useState<AttendanceClassCard[]>(DEFAULT_ATTENDANCE_CLASSES);
  const [allStudents, setAllStudents] = useState<Student[]>([]);

  const [gradeFilter, setGradeFilter] = useState<string>('All');
  const [selectedSection, setSelectedSection] = useState<string>(
    requestedSection || 'Generosity'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [attendanceMap, setAttendanceMap] = useState<
    Record<string | number, 'Present' | 'Late' | 'Absent' | 'Excused'>
  >({});
  const [attendanceModes, setAttendanceModes] = useState<
    Record<string | number, 'QR' | 'LRN' | 'Manual'>
  >({});
  const [scanTimes, setScanTimes] = useState<Record<string | number, string>>({});
  const [lateCutoff, setLateCutoff] = useState<string>('07:30');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  // Quick QR/LRN Scanner Input
  const [quickScanInput, setQuickScanInput] = useState('');
  const [recentlyScannedId, setRecentlyScannedId] = useState<string | number | null>(null);
  const quickInputRef = useRef<HTMLInputElement | null>(null);
  const qrImageInputRef = useRef<HTMLInputElement | null>(null);

  // Inline Camera Scanner State
  const [showCamera, setShowCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScannedRef = useRef<{ code: string; timestamp: number } | null>(null);

  const todayStr = getLocalTodayStr();

  const normalizeDisplayStatus = (raw?: string): 'Present' | 'Late' | 'Absent' | 'Excused' => {
    const s = String(raw || 'present').toLowerCase();
    if (s === 'late') return 'Late';
    if (s === 'absent') return 'Absent';
    if (s === 'excused') return 'Excused';
    return 'Present';
  };

  const formatTime12h = (rawTime?: string | null): string => {
    if (!rawTime) return '';
    if (rawTime.includes('AM') || rawTime.includes('PM')) return rawTime;
    const parts = String(rawTime).split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parts[1];
      if (!isNaN(h)) {
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
      }
    }
    return String(rawTime);
  };

  // Load sections, students, and today's attendance
  useEffect(() => {
    async function loadSectionsAndStudents() {
      setLoading(true);
      try {
        const [{ data: secData }, { data: stData }, attRecords] = await Promise.all([
          supabase.from('sections').select('*').order('grade_level', { ascending: true }),
          supabase.from('students').select('*').order('last_name', { ascending: true }),
          fetchAttendanceRecords({ date: todayStr }),
        ]);

        const attData = attRecords || [];

        const dbSections: Section[] = secData || [];
        if (dbSections.length > 0) {
          setSections(dbSections);
        }

        const secById = new Map<string, Section>();
        dbSections.forEach((sec) => {
          if (sec.id) secById.set(String(sec.id), sec);
        });

        const enrichedStudents: Student[] = (stData || []).map((s: any) => {
          const matchedSec = s.section_id ? secById.get(String(s.section_id)) : undefined;
          return {
            ...s,
            grade_level: matchedSec?.grade_level || s.grade_level || 'Grade 10',
            section: matchedSec?.name || s.section || 'Unassigned',
          };
        });

        setAllStudents(enrichedStudents);

        // Build My Classes cards identical to TeacherClassesPage
        if (dbSections.length > 0) {
          const teacherName = (user?.full_name || '').toLowerCase().trim();
          const countBySectionId = new Map<string, number>();
          const countBySectionName = new Map<string, number>();

          enrichedStudents.forEach((s: any) => {
            if (s.section_id) {
              const k = String(s.section_id);
              countBySectionId.set(k, (countBySectionId.get(k) || 0) + 1);
            }
            if (s.section) {
              const k = String(s.section).toLowerCase();
              countBySectionName.set(k, (countBySectionName.get(k) || 0) + 1);
            }
          });

          const matchedAdvisory = dbSections.filter((sec: any) => {
            const adv = String(sec.adviser_name || '').toLowerCase();
            return teacherName && adv && (adv.includes(teacherName) || teacherName.includes(adv));
          });

          const baseSections =
            matchedAdvisory.length > 0
              ? [
                  ...matchedAdvisory,
                  ...dbSections
                    .filter((s: any) => !matchedAdvisory.some((m: any) => m.id === s.id))
                    .slice(0, Math.max(0, 6 - matchedAdvisory.length)),
                ]
              : dbSections.slice(0, 6);

          const subjects = [
            'General Mathematics',
            'Pre-Calculus (Specialized)',
            'Mathematics 10',
            'Statistics & Probability',
            'Practical Research 1',
            'Mathematics 9',
          ];
          const times = [
            '07:30 AM – 08:30 AM',
            '08:30 AM – 09:30 AM',
            '10:00 AM – 11:00 AM',
            '01:00 PM – 02:00 PM',
            '02:00 PM – 03:00 PM',
            '03:00 PM – 04:00 PM',
          ];
          const rooms = [
            'Rm 201 • Bldg A',
            'Math Lab • Bldg A',
            'Rm 105 • JHS Bldg',
            'Rm 304 • SHS Bldg',
            'Rm 204 • Bldg B',
            'Rm 108 • JHS Bldg',
          ];

          const mappedCards: AttendanceClassCard[] = baseSections.map((sec: any, idx: number) => {
            const gradeNum =
              parseInt(String(sec.grade_level || '10').replace(/\D/g, ''), 10) || 10;
            const count =
              countBySectionId.get(String(sec.id)) ||
              countBySectionName.get(String(sec.name || '').toLowerCase()) ||
              [37, 40, 36, 38, 35, 41][idx % 6];

            return {
              id: String(sec.id || `sec-${idx}`),
              grade_level: sec.grade_level || 'Grade 10',
              name: sec.name || 'Generosity',
              subject: subjects[idx % subjects.length],
              strand: gradeNum >= 11 ? sec.strand || 'STEM' : null,
              count,
              room: sec.room || rooms[idx % rooms.length],
              time: times[idx % times.length],
              isAdvisory: matchedAdvisory.some((m: any) => m.id === sec.id) || idx === 0,
            };
          });

          setClassCards(mappedCards);

          if (requestedSection) {
            const matchedReq = dbSections.find(
              (s) => s.name.toLowerCase() === requestedSection.toLowerCase()
            );
            if (matchedReq) {
              setSelectedSection(matchedReq.name);
              setGradeFilter(matchedReq.grade_level || 'All');
            }
          } else if (mappedCards[0]?.name) {
            setSelectedSection(mappedCards[0].name);
          }
        }

        // Initialize attendance statuses ONLY for students who have actually scanned or been recorded today
        const initialMap: Record<
          string | number,
          'Present' | 'Late' | 'Absent' | 'Excused'
        > = {};
        const initialModes: Record<string | number, 'QR' | 'LRN' | 'Manual'> = {};
        const initialTimes: Record<string | number, string> = {};

        enrichedStudents.forEach((s) => {
          const match = (attData || []).find(
            (att: any) =>
              String(att.student_id) === String(s.id) ||
              (s.lrn && att.qr_code && String(att.qr_code).includes(String(s.lrn)))
          );
          if (match) {
            initialMap[s.id] = normalizeDisplayStatus(match.status);
            initialModes[s.id] =
              match.mode === 'LRN' || (match.remarks && String(match.remarks).toLowerCase().includes('lrn'))
                ? 'LRN'
                : match.mode === 'Manual' || (match.remarks && String(match.remarks).toLowerCase().includes('manual'))
                ? 'Manual'
                : 'QR';
            if (match.time_in) {
              initialTimes[s.id] = formatTime12h(match.time_in);
            }
          }
        });

        setAttendanceMap(initialMap);
        setAttendanceModes(initialModes);
        setScanTimes(initialTimes);
      } catch (err) {
        console.warn('Error loading attendance roster:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSectionsAndStudents();

    const syncLiveScans = async () => {
      try {
        const latestRecords = await fetchAttendanceRecords({ date: todayStr });
        if (!latestRecords || latestRecords.length === 0) return;
        setAttendanceMap((prev) => {
          const next = { ...prev };
          latestRecords.forEach((r) => {
            if (r.student_id) {
              next[r.student_id] = normalizeDisplayStatus(r.status);
            }
          });
          return next;
        });
        setAttendanceModes((prev) => {
          const next = { ...prev };
          latestRecords.forEach((r) => {
            if (r.student_id) {
              next[r.student_id] =
                r.mode === 'LRN'
                  ? 'LRN'
                  : r.mode === 'Manual' || (r.remarks && String(r.remarks).toLowerCase().includes('manual'))
                  ? 'Manual'
                  : 'QR';
            }
          });
          return next;
        });
        setScanTimes((prev) => {
          const next = { ...prev };
          latestRecords.forEach((r) => {
            if (r.student_id && r.time_in) {
              next[r.student_id] = formatTime12h(r.time_in);
            }
          });
          return next;
        });
      } catch {}
    };

    window.addEventListener('plsnhs_attendance_updated', syncLiveScans);
    let bc: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel('plsnhs_attendance_channel');
        bc.onmessage = () => syncLiveScans();
      }
    } catch {}

    const channel = supabase
      .channel('teacher_class_attendance_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
        syncLiveScans();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        syncLiveScans();
      })
      .subscribe();

    return () => {
      window.removeEventListener('plsnhs_attendance_updated', syncLiveScans);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
      supabase.removeChannel(channel);
    };
  }, [requestedSection, todayStr, user?.full_name]);

  // Filtered students for the selected Year Level & Section
  const displayedStudents = useMemo(() => {
    const list = allStudents.filter((s) => {
      const matchesGrade =
        gradeFilter === 'All' ||
        normalizeGradeLevel(s.grade_level) === normalizeGradeLevel(gradeFilter);
      const matchesSec =
        selectedSection === 'All' ||
        normalizeSectionName(s.section).toLowerCase() ===
          normalizeSectionName(selectedSection).toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
        String(s.lrn || '').toLowerCase().includes(q);
      return matchesGrade && matchesSec && matchesSearch;
    });

    return list.sort((a, b) => {
      const gA = parseInt(String(a.grade_level || '10').replace(/\D/g, ''), 10) || 10;
      const gB = parseInt(String(b.grade_level || '10').replace(/\D/g, ''), 10) || 10;
      if (gA !== gB) return gA - gB;
      const secA = String(a.section || '').toLowerCase();
      const secB = String(b.section || '').toLowerCase();
      if (secA !== secB) return secA.localeCompare(secB);
      return String(a.last_name || '').localeCompare(String(b.last_name || ''));
    });
  }, [allStudents, gradeFilter, selectedSection, searchQuery]);

  // Group displayedStudents by Year Level & Section
  const groupedBySection = useMemo(() => {
    const groups: {
      key: string;
      grade: string;
      section: string;
      items: Student[];
    }[] = [];
    const map = new Map<
      string,
      { key: string; grade: string; section: string; items: Student[] }
    >();

    displayedStudents.forEach((s) => {
      const g = s.grade_level || 'Grade 10';
      const sec = s.section || selectedSection || 'Generosity';
      const key = `${g}___${sec}`;
      if (!map.has(key)) {
        const entry = { key, grade: g, section: sec, items: [] as Student[] };
        map.set(key, entry);
        groups.push(entry);
      }
      map.get(key)!.items.push(s);
    });

    return groups;
  }, [displayedStudents, selectedSection]);

  // Available sections for the selected Year Level dropdown
  const availableSectionNames = useMemo(() => {
    const set = new Set<string>();
    classCards.forEach((c) => {
      if (gradeFilter === 'All' || c.grade_level === gradeFilter) set.add(c.name);
    });
    sections.forEach((s) => {
      if (gradeFilter === 'All' || s.grade_level === gradeFilter) set.add(s.name);
    });
    return Array.from(set);
  }, [classCards, sections, gradeFilter]);

  // Camera Management
  const startCamera = async (overrideFacing?: 'environment' | 'user') => {
    const targetFacing = overrideFacing || facingMode;
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: targetFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera error:', err);
      setNotice({
        type: 'warning',
        message: 'Camera permission denied or camera not available. You can upload a QR image or use the LRN input field.',
      });
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const toggleCamera = () => {
    if (showCamera) {
      stopCamera();
      setShowCamera(false);
    } else {
      setShowCamera(true);
      startCamera();
    }
  };

  const flipCamera = () => {
    stopCamera();
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setTimeout(() => startCamera(nextFacing), 250);
  };

  // If page loaded with ?scan=1, automatically trigger camera scanner
  useEffect(() => {
    if (autoScan === '1' || autoScan === 'camera') {
      setShowCamera(true);
      startCamera();
    } else if (autoScan === 'input') {
      setTimeout(() => quickInputRef.current?.focus(), 300);
    }
  }, [autoScan]);

  const determineStatus = (): 'Present' | 'Late' => {
    const now = new Date();
    const [cutoffH, cutoffM] = lateCutoff.split(':').map(Number);
    const cutoffDate = new Date();
    cutoffDate.setHours(isNaN(cutoffH) ? 7 : cutoffH, isNaN(cutoffM) ? 30 : cutoffM, 0, 0);
    return now > cutoffDate ? 'Late' : 'Present';
  };

  // Centralized function to validate and record attendance for a scanned LRN / QR
  const recordAttendanceForLrn = async (rawInput: string, scanMode: 'QR' | 'LRN') => {
    const lrn = parseLrnFromInput(rawInput);
    if (!lrn) {
      playAttendanceSound('error');
      setNotice({
        type: 'error',
        message: 'Could not detect a valid 10–12 digit LRN from the QR / barcode scan.',
      });
      return false;
    }

    // 1. Find the student in the masterlist (by LRN or by UUID)
    let student = allStudents.find((s) => {
      const sLrn = String(s.lrn || '').trim();
      const sId = String(s.id || '').trim().toLowerCase();
      return sLrn === lrn || sId === lrn.toLowerCase();
    });

    if (!student) {
      try {
        const isCleanUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lrn);
        let q = supabase.from('students').select('*');
        q = isCleanUuid ? q.or(`lrn.eq.${lrn},id.eq.${lrn}`) : q.eq('lrn', lrn);
        const { data: dbSt } = await q.maybeSingle();

        if (dbSt) {
          const matchedSec = sections.find((sec) => String(sec.id) === String(dbSt.section_id));
          student = {
            ...dbSt,
            section: matchedSec?.name || dbSt.section || 'Unassigned',
            grade_level: matchedSec?.grade_level || dbSt.grade_level || 'Grade 10',
          };
          setAllStudents((prev) => [student!, ...prev]);
        }
      } catch (e) {
        console.warn('Student lookup error:', e);
      }
    }

    if (!student) {
      playAttendanceSound('error');
      setNotice({
        type: 'error',
        message: `Student with LRN "${lrn}" was not found in the official student registry.`,
      });
      return false;
    }

    // 2. Strict Section & Year Level Validation when a specific section is selected
    if (selectedSection !== 'All' || gradeFilter !== 'All') {
      const validation = validateStudentSectionAndGrade(
        student.section,
        student.grade_level,
        selectedSection !== 'All' ? selectedSection : undefined,
        gradeFilter !== 'All' ? gradeFilter : undefined
      );

      if (!validation.isValid) {
        playAttendanceSound('warning');
        setNotice({
          type: 'warning',
          message:
            validation.errorMessage ||
            `${student.first_name} ${student.last_name} belongs to ${student.grade_level} · Section ${student.section}, not Section ${selectedSection}.`,
        });
        return false;
      }
    }

    // 3. Check duplicate QR/LRN scan today
    const existingStatus = attendanceMap[student.id];
    const existingTime = scanTimes[student.id];
    if ((existingStatus === 'Present' || existingStatus === 'Late') && existingTime) {
      playAttendanceSound('warning');
      setRecentlyScannedId(student.id);
      setNotice({
        type: 'warning',
        message: `${student.first_name} ${student.last_name} (LRN: ${student.lrn || lrn}) was already scanned in today as ${existingStatus} at ${existingTime}.`,
      });
      setTimeout(() => setRecentlyScannedId(null), 3000);
      return true;
    }

    const computedStatus = determineStatus();
    const currentTime24 = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const currentTime12 = formatTime12h(currentTime24);

    // 4. Mark student as Present or Late in state with live timestamp
    setAttendanceMap((prev) => ({ ...prev, [student!.id]: computedStatus }));
    setAttendanceModes((prev) => ({ ...prev, [student!.id]: scanMode }));
    setScanTimes((prev) => ({ ...prev, [student!.id]: currentTime12 }));
    setRecentlyScannedId(student.id);
    playAttendanceSound(computedStatus === 'Late' ? 'warning' : 'success');

    setNotice({
      type: 'success',
      message: `✓ ${student.first_name} ${student.last_name} (${student.grade_level} · Section ${student.section}) scanned ${computedStatus} at ${currentTime12} via ${scanMode}!`,
    });

    // 5. Live sync to Supabase database & local cache
    try {
      const matchedSection = sections.find(
        (s) => s.name.toLowerCase() === (student!.section || '').toLowerCase()
      );

      await logAttendanceRecord({
        student_id: String(student.id),
        section_id: (student as any).section_id
          ? String((student as any).section_id)
          : matchedSection?.id
          ? String(matchedSection.id)
          : null,
        teacher_id: user?.id ? String(user.id) : null,
        date: todayStr,
        mode: 'time_in',
        status: computedStatus.toLowerCase(),
        time_in: currentTime24,
        remarks:
          scanMode === 'QR'
            ? `Class Attendance (${computedStatus}) logged via QR Scan`
            : `Class Attendance (${computedStatus}) logged via LRN Entry`,
        qr_code: String(student.lrn || lrn),
        raw_payload: rawInput,
      });
    } catch (dbErr) {
      console.warn('Realtime QR attendance sync notice:', dbErr);
    }

    setTimeout(() => {
      setRecentlyScannedId(null);
    }, 3500);

    return true;
  };

  const recordAttendanceRef = useRef(recordAttendanceForLrn);
  recordAttendanceRef.current = recordAttendanceForLrn;

  // Real-time Barcode / QR detector loop with universal jsQR fallback for all desktop & mobile browsers
  useEffect(() => {
    if (!cameraActive) return;

    let animId: number;
    let detector: any = null;

    if ('BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39'],
        });
      } catch (e) {
        console.debug(e);
      }
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const checkFrame = async () => {
      if (videoRef.current) {
        const video = videoRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
          let detectedRaw: string | null = null;

          // 1. Try BarcodeDetector if available
          if (detector) {
            try {
              const codes = await detector.detect(video);
              if (codes.length > 0 && codes[0].rawValue) {
                detectedRaw = codes[0].rawValue;
              }
            } catch {
              // fallback to jsQR
            }
          }

          // 2. Universal jsQR fallback
          if (!detectedRaw && ctx) {
            try {
              if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
              }
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: 'attemptBoth',
              });
              if (code && code.data) {
                detectedRaw = code.data;
              }
            } catch {
              // ignore canvas frame read errors
            }
          }

          if (detectedRaw) {
            const lrn = parseLrnFromInput(detectedRaw);
            if (lrn) {
              const now = Date.now();
              if (
                lastScannedRef.current?.code === lrn &&
                now - lastScannedRef.current.timestamp < 3500
              ) {
                // In cooldown debounce window
              } else {
                lastScannedRef.current = { code: lrn, timestamp: now };
                await recordAttendanceRef.current(detectedRaw, 'QR');
              }
            }
          }
        }
      }
      animId = requestAnimationFrame(checkFrame);
    };

    animId = requestAnimationFrame(checkFrame);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [cameraActive]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'attemptBoth',
        });
        if (code && code.data) {
          recordAttendanceForLrn(code.data, 'QR');
        } else {
          playAttendanceSound('error');
          setNotice({
            type: 'error',
            message: 'No valid Student QR Code could be detected in the uploaded image.',
          });
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const setStatus = (
    id: string | number,
    status: 'Present' | 'Late' | 'Absent' | 'Excused'
  ) => {
    const now12 = formatTime12h(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    setAttendanceMap((prev) => ({ ...prev, [id]: status }));
    setAttendanceModes((prev) => ({ ...prev, [id]: 'Manual' as const }));
    if (status === 'Present' || status === 'Late') {
      setScanTimes((prev) => ({ ...prev, [id]: prev[id] || now12 }));
    }
  };

  const handleMarkUnscannedAbsent = () => {
    let marked = 0;
    setAttendanceMap((prev) => {
      const next = { ...prev };
      displayedStudents.forEach((s) => {
        if (!next[s.id]) {
          next[s.id] = 'Absent';
          marked++;
        }
      });
      return next;
    });
    setAttendanceModes((prev) => {
      const next = { ...prev };
      displayedStudents.forEach((s) => {
        if (!next[s.id]) {
          next[s.id] = 'Manual';
        }
      });
      return next;
    });
    if (marked > 0) {
      setNotice({
        type: 'warning',
        message: `Marked ${marked} unscanned learner(s) as Absent. Click "Save Attendance" to finalize in the database.`,
      });
    } else {
      setNotice({
        type: 'success',
        message: 'All learners in this view have already been scanned or marked.',
      });
    }
  };

  const handleQuickScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickScanInput.trim()) return;

    const raw = quickScanInput.trim();
    const isQr = raw.includes('http') || raw.includes('verify-id') || raw.length > 20;
    const scanMode: 'QR' | 'LRN' = isQr ? 'QR' : 'LRN';

    recordAttendanceForLrn(raw, scanMode);
    setQuickScanInput('');
    if (quickInputRef.current) {
      quickInputRef.current.focus();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);

    try {
      await ensureAuthenticatedSession();
      const resolvedTeacherId = await resolveTeacherRecordId(user?.id);
      const matchedSection = sections.find((s) => s.name === selectedSection);
      const currentTime = new Date().toLocaleTimeString('en-GB', { hour12: false });

      // Any student not yet scanned when finalizing is marked 'absent'
      const nextMap: Record<string | number, 'Present' | 'Late' | 'Absent' | 'Excused'> = {
        ...attendanceMap,
      };
      const nextModes: Record<string | number, 'QR' | 'LRN' | 'Manual'> = {
        ...attendanceModes,
      };
      displayedStudents.forEach((s) => {
        if (!nextMap[s.id]) {
          nextMap[s.id] = 'Absent';
          nextModes[s.id] = 'Manual';
        }
      });
      setAttendanceMap(nextMap);
      setAttendanceModes(nextModes);

      const recordsToInsert = displayedStudents.map((s) => ({
        student_id: s.id,
        section_id: (s as any).section_id || matchedSection?.id || null,
        teacher_id: resolvedTeacherId,
        date: todayStr,
        status: (nextMap[s.id] || 'absent').toLowerCase(),
        time_in: nextMap[s.id] === 'Absent' || nextMap[s.id] === 'Excused' ? null : currentTime,
        qr_code: s.lrn ? `${s.lrn}_${todayStr}` : null,
        remarks: nextModes[s.id] || 'Manual',
      }));

      // Cache locally to ensure zero data loss
      try {
        const cacheKey = `plsnhs_attendance_${selectedSection}_${todayStr}`;
        localStorage.setItem(cacheKey, JSON.stringify(recordsToInsert));
      } catch {
        // ignore cache write error
      }

      // Try database sync on legacy attendance table
      const studentIds = displayedStudents.map((s) => s.id);
      await supabase
        .from('attendance')
        .delete()
        .in('student_id', studentIds)
        .eq('date', todayStr);

      const { error } = await supabase.from('attendance').insert(recordsToInsert);

      // Also persist to attendance_records table with valid mode ('time_in') & resolved teacher_id
      try {
        const recordsForAttendanceRecords = displayedStudents.map((s) => ({
          student_id: s.id,
          section_id: (s as any).section_id || matchedSection?.id || null,
          teacher_id: resolvedTeacherId,
          date: todayStr,
          status: (nextMap[s.id] || 'absent').toLowerCase(),
          mode: 'time_in',
          time_in: nextMap[s.id] === 'Absent' || nextMap[s.id] === 'Excused' ? null : currentTime,
          qr_code: s.lrn || null,
          remarks: nextModes[s.id] || 'Manual',
          scanned_at: new Date().toISOString(),
        }));
        await supabase
          .from('attendance_records')
          .upsert(recordsForAttendanceRecords, { onConflict: 'student_id,date,mode' });
      } catch (attRecErr) {
        console.warn('attendance_records table sync note:', attRecErr);
      }

      // Broadcast real-time update event so student attendance syncs immediately
      broadcastAttendanceUpdate();

      if (error) {
        console.warn('Attendance database notice:', error);
        setNotice({
          type: 'warning',
          message: `Daily attendance for Section "${selectedSection}" saved locally. (Database note: ${error.message})`,
        });
      } else {
        setNotice({
          type: 'success',
          message: `Daily attendance for Section "${selectedSection}" (${displayedStudents.length} learners) successfully saved to official database for ${new Date().toLocaleDateString()}.`,
        });
      }
    } catch (err: any) {
      console.error('Failed to save attendance:', err);
      setNotice({
        type: 'error',
        message: err?.message || 'Failed to save attendance to database. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const presentCount = displayedStudents.filter(
    (s) => attendanceMap[s.id] === 'Present'
  ).length;
  const lateCount = displayedStudents.filter(
    (s) => attendanceMap[s.id] === 'Late'
  ).length;
  const absentCount = displayedStudents.filter(
    (s) => attendanceMap[s.id] === 'Absent'
  ).length;
  const unscannedCount = displayedStudents.filter(
    (s) => !attendanceMap[s.id]
  ).length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Clean Executive Header */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0f172a] font-display tracking-tight leading-snug">
              Daily Attendance Logger
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Record and submit daily class attendance organized by Year Level and Section for official DepEd SF2 compliance.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 ml-auto pt-0.5">
            <PageHeaderNotificationSlot />
          </div>
        </div>
      </div>

      {notice && (
        <Alert
          type={notice.type}
          message={notice.message}
          onClose={() => setNotice(null)}
        />
      )}

      {/* MY TEACHING SECTIONS CARDS (Same Year Level & Section design as "My Classes") */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classCards.map((c) => {
          const isActive =
            selectedSection.toLowerCase() === c.name.toLowerCase();
          return (
            <div
              key={c.id}
              onClick={() => {
                setSelectedSection(c.name);
                setGradeFilter('All');
              }}
              className={`rounded-2xl border p-4 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                isActive
                  ? 'border-[#1B2A4A] bg-white ring-2 ring-[#1B2A4A]/15 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-md bg-[#1B2A4A] px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                      <GraduationCap className="h-3 w-3 text-[#F5C518]" />
                      {c.grade_level}
                    </span>
                    {c.strand && (
                      <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                        {c.strand}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {c.room}
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 font-display flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-[#1B2A4A]" />
                        Section {c.name}
                      </h3>
                      {c.isAdvisory && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                          Advisory
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">{c.subject}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 border-t border-slate-100 pt-2.5">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-700">{c.count} Enrolled Learners</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500">
                    <BookOpen className="h-3 w-3 text-slate-400" />
                    <span>{c.time}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* QUICK QR / LRN SCANNER & FILTER CONTROLS BAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
        <input
          ref={qrImageInputRef}
          type="file"
          accept="image/*"
          onChange={handleQrImageUpload}
          className="hidden"
        />
        {/* Scanner Row */}
        <form onSubmit={handleQuickScan} className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0">
            <span className="p-1.5 rounded-lg bg-[#1B2A4A] text-white">
              <QrCode className="h-4 w-4" />
            </span>
            <span>Instant QR Scanner:</span>
          </div>

          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              ref={quickInputRef}
              type="text"
              value={quickScanInput}
              onChange={(e) => setQuickScanInput(e.target.value)}
              placeholder="Scan Student ID QR or enter 12-digit LRN (press Enter)..."
              autoComplete="off"
              className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-10 pr-4 py-2 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <button
              type="submit"
              disabled={!quickScanInput.trim()}
              className="px-4 py-2 rounded-xl bg-[#1B2A4A] hover:bg-[#0f1c3f] disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
            >
              Check In
            </button>

            <button
              type="button"
              onClick={toggleCamera}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                showCamera
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
              }`}
            >
              {showCamera ? (
                <VideoOff className="h-4 w-4 text-rose-600" />
              ) : (
                <Camera className="h-4 w-4 text-emerald-600" />
              )}
              <span>{showCamera ? 'Close Camera' : 'Camera Scan'}</span>
            </button>

            <button
              type="button"
              onClick={() => qrImageInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800"
              title="Upload a Student ID QR Code screenshot or photo to scan"
            >
              <Upload className="h-4 w-4 text-blue-700" />
              <span>Upload QR</span>
            </button>

            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
              <Clock className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-[11px] font-bold text-slate-600">Late After:</span>
              <input
                type="time"
                value={lateCutoff}
                onChange={(e) => setLateCutoff(e.target.value)}
                className="bg-transparent text-xs font-extrabold text-slate-900 focus:outline-hidden cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => navigate('/teacher/attendance-qr')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
              title="Launch dedicated Fullscreen QR / Turnstile Kiosk"
            >
              <Maximize2 className="h-4 w-4 text-emerald-700" />
              <span>Fullscreen Kiosk</span>
            </button>
          </div>
        </form>

        {/* INLINE LIVE CAMERA SCANNER VIEWFINDER */}
        {showCamera && (
          <div className="p-4 rounded-xl bg-slate-950 text-white border border-slate-800 animate-fade-in flex flex-col items-center">
            <div className="flex items-center justify-between w-full max-w-sm mb-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Camera Active
              </span>
              <div className="flex items-center gap-2">
                <span>Point Student ID QR at lens</span>
                <button
                  type="button"
                  onClick={flipCamera}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] font-bold text-white border border-slate-700 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" /> Flip
                </button>
              </div>
            </div>

            <div className="relative w-full max-w-sm aspect-4/3 rounded-xl overflow-hidden bg-black border border-slate-700">
              <video
                ref={(el) => {
                  videoRef.current = el;
                  if (el && streamRef.current && el.srcObject !== streamRef.current) {
                    el.srcObject = streamRef.current;
                    el.play().catch(() => {});
                  }
                }}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-44 h-44 border-2 border-emerald-400 rounded-xl">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter by Year Level, Section & Live Counts + Save Button */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Year Level Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase text-slate-500">Year Level:</span>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden"
              >
                <option value="All">All Year Levels (7–12)</option>
                {ALL_GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase text-slate-500">Section:</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-[#1B2A4A] focus:border-[#1B2A4A] focus:outline-hidden"
              >
                <option value="All">All Sections</option>
                {availableSectionNames.map((secName) => (
                  <option key={secName} value={secName}>
                    Section {secName}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Student */}
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter learner name..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:border-[#1B2A4A] focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700 border border-slate-200">
                Awaiting Scan: {unscannedCount}
              </span>
              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700 border border-emerald-200">
                Present: {presentCount}
              </span>
              <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-amber-700 border border-amber-200">
                Late: {lateCount}
              </span>
              <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-rose-700 border border-rose-200">
                Absent: {absentCount}
              </span>
            </div>

            {unscannedCount > 0 && (
              <button
                type="button"
                onClick={handleMarkUnscannedAbsent}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700 transition-all cursor-pointer whitespace-nowrap"
                title="Mark all remaining unscanned students in this view as Absent"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Mark Unscanned Absent</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grouped Roster Table by Year Level & Section */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Learner Name</th>
                <th className="px-5 py-3.5">LRN</th>
                <th className="px-5 py-3.5">Year Level</th>
                <th className="px-5 py-3.5">Time-In</th>
                <th className="px-5 py-3.5">Log Mode</th>
                <th className="px-5 py-3.5 text-right">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent mb-2"></div>
                    <p>Loading class roster...</p>
                  </td>
                </tr>
              ) : groupedBySection.length > 0 ? (
                groupedBySection.map((group) => {
                  const gradeNum =
                    parseInt(String(group.grade).replace(/\D/g, ''), 10) || 10;
                  const isShs = gradeNum >= 11;

                  return (
                    <React.Fragment key={group.key}>
                      {/* Year Level & Section Banner Row */}
                      <tr className="bg-slate-100/90 border-y border-slate-200">
                        <td colSpan={6} className="px-5 py-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 rounded-lg bg-[#1B2A4A] px-2.5 py-1 text-[11px] font-extrabold text-white">
                                <GraduationCap className="h-3.5 w-3.5 text-[#F5C518]" />
                                {group.grade}
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-300 px-3 py-1 text-xs font-extrabold text-[#1B2A4A] shadow-2xs">
                                <Layers className="h-3.5 w-3.5 text-[#1B2A4A]" />
                                Section {group.section}
                              </span>
                              <span className="text-[11px] font-semibold text-slate-500">
                                {isShs
                                  ? 'Senior High School (SHS)'
                                  : 'Junior High School (JHS)'}
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[11px] font-bold text-[#1B2A4A] whitespace-nowrap">
                              <Users className="h-3 w-3" />
                              {group.items.length}{' '}
                              {group.items.length === 1 ? 'Learner' : 'Learners'}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {group.items.map((s) => {
                        const currentStatus = attendanceMap[s.id];
                        const currentMode = attendanceModes[s.id];
                        const timeIn = scanTimes[s.id];
                        const isHighlighted = recentlyScannedId === s.id;

                        return (
                          <tr
                            key={s.id}
                            className={`transition-colors duration-500 ${
                              isHighlighted
                                ? 'bg-emerald-100/90 font-bold'
                                : currentStatus === 'Present'
                                ? 'bg-emerald-50/25 hover:bg-emerald-50/50'
                                : currentStatus === 'Late'
                                ? 'bg-amber-50/25 hover:bg-amber-50/50'
                                : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-[13px]">
                                  {s.last_name}, {s.first_name}
                                </span>
                                {isHighlighted && (
                                  <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-black uppercase animate-bounce">
                                    ✓ QR Verified!
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 font-mono font-bold text-slate-600">
                              {s.lrn || '—'}
                            </td>
                            <td className="px-5 py-3.5 font-bold text-slate-800">
                              {s.grade_level || group.grade}
                            </td>
                            <td className="px-5 py-3.5">
                              {timeIn ? (
                                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                  <Clock className="h-3 w-3 text-emerald-600" />
                                  {timeIn}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono text-xs">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              {currentStatus && currentMode ? (
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-md ${
                                    currentMode === 'QR'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : currentMode === 'LRN'
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {currentMode === 'QR' && <QrCode className="h-3 w-3" />}
                                  {currentMode}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-amber-50/80 text-amber-700 border border-amber-200/80">
                                  <QrCode className="h-3 w-3" />
                                  Awaiting QR Scan
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50 gap-1">
                                {(['Present', 'Late', 'Absent', 'Excused'] as const).map(
                                  (st) => (
                                    <button
                                      key={st}
                                      type="button"
                                      onClick={() => setStatus(s.id, st)}
                                      className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                                        currentStatus === st
                                          ? st === 'Present'
                                            ? 'bg-emerald-700 text-white shadow-xs'
                                            : st === 'Late'
                                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                                            : st === 'Absent'
                                            ? 'bg-rose-600 text-white shadow-xs'
                                            : 'bg-blue-600 text-white shadow-xs'
                                          : 'text-slate-500 hover:text-slate-900'
                                      }`}
                                    >
                                      {st}
                                    </button>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No students found in this section.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
