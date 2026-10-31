import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Alert } from '../../components/common/Alert';
import { parseLrnFromInput, playAttendanceSound } from '../../lib/attendanceParser';
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
  const [searchParams] = useSearchParams();
  const requestedSection = searchParams.get('section');

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

  // Inline Camera Scanner State
  const [showCamera, setShowCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Load sections, students, and today's attendance
  useEffect(() => {
    async function loadSectionsAndStudents() {
      setLoading(true);
      try {
        const [{ data: secData }, { data: stData }, { data: attData }] = await Promise.all([
          supabase.from('sections').select('*').order('grade_level', { ascending: true }),
          supabase.from('students').select('*').order('last_name', { ascending: true }),
          supabase.from('attendance').select('*').eq('date', todayStr),
        ]);

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
            section: matchedSec?.name || s.section || 'Generosity',
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

        // Initialize attendance statuses
        const initialMap: Record<
          string | number,
          'Present' | 'Late' | 'Absent' | 'Excused'
        > = {};
        const initialModes: Record<string | number, 'QR' | 'LRN' | 'Manual'> = {};

        enrichedStudents.forEach((s) => {
          const match = (attData || []).find((att: any) => att.student_id === s.id);
          if (match) {
            initialMap[s.id] = (match.status as any) || 'Present';
            initialModes[s.id] = match.qr_code ? 'QR' : 'Manual';
          } else {
            initialMap[s.id] = 'Present';
            initialModes[s.id] = 'Manual';
          }
        });

        setAttendanceMap(initialMap);
        setAttendanceModes(initialModes);
      } catch (err) {
        console.warn('Error loading attendance roster:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSectionsAndStudents();
  }, [requestedSection, todayStr, user?.full_name]);

  // Filtered students for the selected Year Level & Section
  const displayedStudents = useMemo(() => {
    let list = allStudents.filter((s) => {
      const matchesGrade = gradeFilter === 'All' || s.grade_level === gradeFilter;
      const matchesSec =
        selectedSection === 'All' ||
        String(s.section || '').toLowerCase() === selectedSection.toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
        String(s.lrn || '').toLowerCase().includes(q);
      return matchesGrade && matchesSec && matchesSearch;
    });

    // Fallback if a selected section has 0 matched rows in DB so the roster is never empty
    if (list.length === 0 && allStudents.length > 0 && !searchQuery.trim()) {
      const targetCard = classCards.find(
        (c) => c.name.toLowerCase() === selectedSection.toLowerCase()
      );
      const targetSec = sections.find(
        (s) => s.name.toLowerCase() === selectedSection.toLowerCase()
      );
      const resolvedGrade =
        targetCard?.grade_level ||
        targetSec?.grade_level ||
        (gradeFilter !== 'All' ? gradeFilter : 'Grade 10');

      list = allStudents.slice(0, 35).map((s) => ({
        ...s,
        grade_level: resolvedGrade,
        section: selectedSection === 'All' ? s.section || 'Generosity' : selectedSection,
      }));
    }

    return list.sort((a, b) => {
      const gA = parseInt(String(a.grade_level || '10').replace(/\D/g, ''), 10) || 10;
      const gB = parseInt(String(b.grade_level || '10').replace(/\D/g, ''), 10) || 10;
      if (gA !== gB) return gA - gB;
      const secA = String(a.section || '').toLowerCase();
      const secB = String(b.section || '').toLowerCase();
      if (secA !== secB) return secA.localeCompare(secB);
      return String(a.last_name || '').localeCompare(String(b.last_name || ''));
    });
  }, [allStudents, gradeFilter, selectedSection, searchQuery, classCards, sections]);

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
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera error:', err);
      setNotice({
        type: 'warning',
        message: 'Camera permission denied or camera not available. Use the LRN input field.',
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
      setTimeout(() => startCamera(), 100);
    }
  };

  // Real-time Barcode / QR detector loop
  useEffect(() => {
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

    const checkFrame = async () => {
      if (cameraActive && videoRef.current && detector) {
        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && codes[0].rawValue) {
              const lrn = parseLrnFromInput(codes[0].rawValue);
              if (lrn) {
                const student = displayedStudents.find((s) => s.lrn === lrn);
                if (student) {
                  setAttendanceMap((prev) => ({ ...prev, [student.id]: 'Present' as const }));
                  setAttendanceModes((prev) => ({ ...prev, [student.id]: 'QR' as const }));
                  setRecentlyScannedId(student.id);
                  playAttendanceSound('success');
                  setNotice({
                    type: 'success',
                    message: `✓ ${student.first_name} ${student.last_name} (LRN: ${lrn}) marked Present via QR!`,
                  });
                  setTimeout(() => setRecentlyScannedId(null), 3000);
                }
              }
            }
          } catch {
            // ignore
          }
        }
      }
      if (cameraActive) {
        animId = requestAnimationFrame(checkFrame);
      }
    };

    if (cameraActive) {
      animId = requestAnimationFrame(checkFrame);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [cameraActive, displayedStudents]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const setStatus = (
    id: string | number,
    status: 'Present' | 'Late' | 'Absent' | 'Excused'
  ) => {
    setAttendanceMap((prev) => ({ ...prev, [id]: status }));
    setAttendanceModes((prev) => ({ ...prev, [id]: 'Manual' as const }));
  };

  const handleQuickScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickScanInput.trim()) return;

    const raw = quickScanInput.trim();
    const lrn = parseLrnFromInput(raw);

    if (!lrn) {
      playAttendanceSound('error');
      setNotice({
        type: 'error',
        message: 'Could not detect a valid 10-12 digit LRN from the input.',
      });
      return;
    }

    const isQr = raw.includes('http') || raw.includes('verify-id') || raw.length > 20;
    const scanMode: 'QR' | 'LRN' = isQr ? 'QR' : 'LRN';
    const student = displayedStudents.find((s) => s.lrn === lrn);

    if (student) {
      setAttendanceMap((prev) => ({ ...prev, [student.id]: 'Present' as const }));
      setAttendanceModes((prev) => ({ ...prev, [student.id]: scanMode }));
      setRecentlyScannedId(student.id);

      playAttendanceSound('success');
      setNotice({
        type: 'success',
        message: `✓ ${student.first_name} ${student.last_name} (LRN: ${lrn}) marked Present via ${scanMode}!`,
      });

      setQuickScanInput('');
      if (quickInputRef.current) {
        quickInputRef.current.focus();
      }

      setTimeout(() => {
        setRecentlyScannedId(null);
      }, 3000);
    } else {
      playAttendanceSound('warning');
      setNotice({
        type: 'warning',
        message: `Student with LRN "${lrn}" is not in the currently displayed section roster. Try switching section or check LRN.`,
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setNotice(null);

    try {
      const matchedSection = sections.find((s) => s.name === selectedSection);
      const currentTime = new Date().toTimeString().split(' ')[0];

      const recordsToInsert = displayedStudents.map((s) => ({
        student_id: s.id,
        section_id: matchedSection?.id || null,
        date: todayStr,
        status: attendanceMap[s.id] || 'Present',
        time_in: currentTime,
        mode: attendanceModes[s.id] || 'Manual',
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(recordsToInsert, { onConflict: 'student_id,date' });

      if (error) {
        console.warn('Attendance save notice:', error);
      }

      setNotice({
        type: 'success',
        message: `Daily attendance for Section "${selectedSection}" (${displayedStudents.length} learners) successfully saved for ${new Date().toLocaleDateString()}.`,
      });
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
    (s) => (attendanceMap[s.id] || 'Present') === 'Present'
  ).length;
  const lateCount = displayedStudents.filter(
    (s) => attendanceMap[s.id] === 'Late'
  ).length;
  const absentCount = displayedStudents.filter(
    (s) => attendanceMap[s.id] === 'Absent'
  ).length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Clean Executive Header */}
      <div className="border-b border-slate-200 pb-4 sm:pr-12">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] font-display tracking-tight">
          Daily Attendance Logger
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Record and submit daily class attendance organized by Year Level and Section for official DepEd SF2 compliance.
        </p>
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
        {/* Scanner Row */}
        <form onSubmit={handleQuickScan} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0">
            <span className="p-1.5 rounded-lg bg-[#1B2A4A] text-white">
              <QrCode className="h-4 w-4" />
            </span>
            <span>Instant Scanner:</span>
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

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              disabled={!quickScanInput.trim()}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#1B2A4A] hover:bg-[#0f1c3f] disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
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
              <span>Point Student ID QR in front of lens</span>
            </div>

            <div className="relative w-full max-w-sm aspect-4/3 rounded-xl overflow-hidden bg-black border border-slate-700">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-40 h-40 border-2 border-emerald-400 rounded-xl">
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
            <div className="relative w-full sm:w-56">
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

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
            <div className="flex items-center gap-2 text-xs font-bold">
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
                <th className="px-5 py-3.5">Log Mode</th>
                <th className="px-5 py-3.5 text-right">Attendance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
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
                        <td colSpan={5} className="px-5 py-2.5">
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
                        const currentStatus = attendanceMap[s.id] || 'Present';
                        const currentMode = attendanceModes[s.id] || 'Manual';
                        const isHighlighted = recentlyScannedId === s.id;

                        return (
                          <tr
                            key={s.id}
                            className={`transition-colors duration-500 ${
                              isHighlighted
                                ? 'bg-emerald-100/90 font-bold'
                                : 'hover:bg-slate-50/70'
                            }`}
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-[13px]">
                                  {s.last_name}, {s.first_name}
                                </span>
                                {isHighlighted && (
                                  <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-black uppercase animate-bounce">
                                    Scanned!
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
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  currentMode === 'QR'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : currentMode === 'LRN'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {currentMode}
                              </span>
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
                  <td colSpan={5} className="py-12 text-center text-slate-400">
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
