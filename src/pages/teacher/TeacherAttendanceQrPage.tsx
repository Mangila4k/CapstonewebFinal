import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import jsQR from 'jsqr';
import {
  QrCode,
  Camera,
  CheckCircle2,
  Clock,
  Volume2,
  VolumeX,
  Search,
  Sparkles,
  ArrowRight,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  VideoOff,
  Video,
  ListFilter,
  Check,
  Calendar,
  Layers,
  Upload,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  logAttendanceRecord,
  fetchAttendanceRecords,
  getLocalTodayStr,
} from '../../lib/attendanceService';
import { Badge } from '../../components/common/Badge';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import {
  parseLrnFromInput,
  playAttendanceSound,
  validateStudentSectionAndGrade,
  normalizeSectionName,
  normalizeGradeLevel,
} from '../../lib/attendanceParser';

interface ScannedEntry {
  id: string | number;
  student_id?: string | number;
  name: string;
  lrn: string;
  section: string;
  grade_level?: string;
  time: string;
  time_out?: string;
  date: string;
  status: 'Present' | 'Late';
  mode: 'QR' | 'LRN';
  scanPeriod?: 'time_in' | 'time_out';
  avatar_url?: string;
}

export const TeacherAttendanceQrPage: React.FC = () => {
  const { user } = useAuth();
  // Scanner Mode: 'time-in' (Morning) | 'time-out' (Afternoon)
  const [scanMode, setScanMode] = useState<'time-in' | 'time-out'>('time-in');
  const [lateCutoff, setLateCutoff] = useState('07:30'); // 7:30 AM default cutoff

  // Audio Feedback Toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Manual/Barcode Input State
  const [inputLrn, setInputLrn] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Live Camera Scanner State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const qrImageInputRef = useRef<HTMLInputElement | null>(null);
  const lastScannedRef = useRef<{ code: string; timestamp: number } | null>(null);

  // Scanned logs for today
  const [scannedLogs, setScannedLogs] = useState<ScannedEntry[]>([]);
  const [latestStudent, setLatestStudent] = useState<ScannedEntry | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Search filter for logs
  const [logSearch, setLogSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Present' | 'Late'>('All');

  // Available sections for filtering & validation
  const [sections, setSections] = useState<{ id: string; name: string; grade_level?: string }[]>([]);
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('All');
  const [activeGradeTarget, setActiveGradeTarget] = useState<string>('All');
  const [activeSectionTarget, setActiveSectionTarget] = useState<string>('All');

  // Available sections for target class selection
  const availableTargetSections = useMemo(() => {
    if (activeGradeTarget === 'All') return sections;
    return sections.filter(
      (s) =>
        !s.grade_level ||
        normalizeGradeLevel(s.grade_level) === normalizeGradeLevel(activeGradeTarget)
    );
  }, [sections, activeGradeTarget]);

  const loadTodayAttendance = useCallback(async () => {
    try {
      const todayStr = getLocalTodayStr();
      const [{ data: secData }, attRecords, { data: stData }] = await Promise.all([
        supabase.from('sections').select('id, name, grade_level').order('name'),
        fetchAttendanceRecords({ date: todayStr }),
        supabase.from('students').select('id, first_name, last_name, lrn, grade_level, avatar_url, section_id'),
      ]);

      if (secData) setSections(secData);

      const secMap = new Map<string, string>();
      if (secData) secData.forEach((s: any) => secMap.set(String(s.id), s.name));

      const stMap = new Map<string, any>();
      if (stData) {
        stData.forEach((st: any) => {
          if (st.id) stMap.set(String(st.id), st);
          if (st.lrn) stMap.set(String(st.lrn), st);
        });
      }

      if (attRecords && attRecords.length > 0) {
        const mapped: ScannedEntry[] = attRecords.map((a: any) => {
          const st =
            (a.student_id ? stMap.get(String(a.student_id)) : null) ||
            (a.qr_code ? stMap.get(String(a.qr_code)) : null);
          const secName =
            (st?.section_id && secMap.get(String(st.section_id))) ||
            (a.section_id && secMap.get(String(a.section_id))) ||
            'Unassigned';
          const rawStatus = String(a.status || 'present').toLowerCase();
          const hasTimeOut = Boolean(a.time_out);
          return {
            id: a.id,
            student_id: a.student_id,
            name: st ? `${st.first_name} ${st.last_name}` : a.student_name || 'Enrolled Student',
            lrn: st?.lrn || a.lrn || a.qr_code?.match(/\d{10,12}/)?.[0] || '—',
            section: secName,
            grade_level: st?.grade_level || '',
            time: a.time_in
              ? a.time_in.slice(0, 5)
              : a.time_out
              ? a.time_out.slice(0, 5)
              : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            time_out: a.time_out ? a.time_out.slice(0, 5) : undefined,
            date: a.date || todayStr,
            status: rawStatus === 'late' ? 'Late' : 'Present',
            mode: a.mode === 'LRN' ? 'LRN' : 'QR',
            scanPeriod: hasTimeOut && !a.time_in ? 'time_out' : 'time_in',
            avatar_url: st?.avatar_url,
          };
        });
        setScannedLogs(mapped);
      } else {
        setScannedLogs([]);
      }
    } catch (err) {
      console.warn('Initial attendance load note:', err);
    }
  }, []);

  // Load sections and initial recent attendance from Supabase + subscribe to live changes
  useEffect(() => {
    loadTodayAttendance();

    const handleSync = () => {
      loadTodayAttendance();
    };
    window.addEventListener('plsnhs_attendance_updated', handleSync);

    let bc: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        bc = new BroadcastChannel('plsnhs_attendance_channel');
        bc.onmessage = () => loadTodayAttendance();
      }
    } catch {}

    const channel = supabase
      .channel('teacher_qr_kiosk_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
        loadTodayAttendance();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        loadTodayAttendance();
      })
      .subscribe();

    return () => {
      window.removeEventListener('plsnhs_attendance_updated', handleSync);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
      supabase.removeChannel(channel);
    };
  }, [loadTodayAttendance]);

  // Compute status (Present vs Late) based on current time and cutoff
  const determineStatus = useCallback((): 'Present' | 'Late' => {
    if (scanMode === 'time-out') return 'Present';
    const now = new Date();
    const [cutoffHours, cutoffMinutes] = lateCutoff.split(':').map(Number);
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffHours, cutoffMinutes, 0, 0);

    return now > cutoffDate ? 'Late' : 'Present';
  }, [lateCutoff, scanMode]);

  // Process a Scanned LRN or QR String
  const processLrnOrQr = useCallback(async (rawScannedText: string, scanType: 'QR' | 'LRN' = 'QR') => {
    const cleanLrn = parseLrnFromInput(rawScannedText);
    if (!cleanLrn) {
      if (soundEnabled) playAttendanceSound('error');
      setNotice({ type: 'error', message: 'Invalid scan. No valid 10–12 digit LRN could be detected.' });
      return;
    }

    setIsProcessing(true);
    setNotice(null);

    try {
      // 1. Query Supabase for student with this LRN or UUID
      const isCleanUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanLrn);
      let studentQuery = supabase
        .from('students')
        .select('id, first_name, last_name, lrn, grade_level, strand, section_id, avatar_url');

      if (isCleanUuid) {
        studentQuery = studentQuery.or(`id.eq.${cleanLrn},lrn.eq.${cleanLrn}`);
      } else {
        studentQuery = studentQuery.eq('lrn', cleanLrn);
      }
      const { data: student } = await studentQuery.maybeSingle();

      if (!student) {
        if (soundEnabled) playAttendanceSound('error');
        setNotice({
          type: 'error',
          message: `Learner with LRN "${cleanLrn}" was not found in the official student registry.`,
        });
        setIsProcessing(false);
        return;
      }

      const todayStr = getLocalTodayStr();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const time24 = new Date().toLocaleTimeString('en-GB', { hour12: false }); // HH:MM:SS
      const computedStatus = determineStatus();
      const currentPeriod: 'time_in' | 'time_out' = scanMode === 'time-out' ? 'time_out' : 'time_in';

      const studentName = `${student.first_name} ${student.last_name}`.trim();
      const matchedSec = sections.find((s) => String(s.id) === String(student.section_id));
      const sectionName = matchedSec?.name || 'Unassigned';
      const studentId = student.id;
      const resolvedLrn = String(student.lrn || cleanLrn);
      const avatarUrl = student.avatar_url;
      const gradeLevel = matchedSec?.grade_level || student.grade_level || '';

      // 2. Section and Year Level Validation when Active Class filter is selected
      if (activeSectionTarget !== 'All' || activeGradeTarget !== 'All') {
        const validation = validateStudentSectionAndGrade(
          sectionName,
          gradeLevel,
          activeSectionTarget !== 'All' ? activeSectionTarget : undefined,
          activeGradeTarget !== 'All' ? activeGradeTarget : undefined
        );

        if (!validation.isValid) {
          if (soundEnabled) playAttendanceSound('warning');
          setNotice({
            type: 'warning',
            message:
              validation.errorMessage ||
              `Student ${studentName} belongs to ${gradeLevel} · Section ${sectionName}.`,
          });
          setIsProcessing(false);
          return;
        }
      }

      // 3. Check for duplicate scan in the SAME period (time_in vs time_out) today
      const existingEntry = scannedLogs.find(
        (log) => (log.lrn === resolvedLrn || String(log.student_id) === String(studentId)) && log.date === todayStr
      );

      if (
        existingEntry &&
        ((currentPeriod === 'time_in' && existingEntry.scanPeriod !== 'time_out') ||
          (currentPeriod === 'time_out' && Boolean(existingEntry.time_out)))
      ) {
        if (soundEnabled) playAttendanceSound('warning');
        const label = currentPeriod === 'time_out' ? 'checked out' : 'checked in';
        const loggedAt = currentPeriod === 'time_out' ? existingEntry.time_out : existingEntry.time;
        setNotice({
          type: 'warning',
          message: `${studentName} (LRN: ${resolvedLrn}) was already ${label} today at ${loggedAt}.`,
        });
        setLatestStudent(existingEntry);
        setIsProcessing(false);
        return;
      }

      // 4. Insert / Upsert into Supabase attendance_records & attendance tables
      const lowerStatus = computedStatus.toLowerCase(); // 'present' or 'late'
      await logAttendanceRecord({
        student_id: String(student.id),
        section_id: student.section_id || null,
        teacher_id: user?.id ? String(user.id) : null,
        date: todayStr,
        mode: currentPeriod,
        status: lowerStatus,
        time_in: currentPeriod === 'time_in' ? time24 : undefined,
        time_out: currentPeriod === 'time_out' ? time24 : undefined,
        remarks:
          currentPeriod === 'time_out'
            ? `Dismissal Time-Out logged via ${scanType} Scanner`
            : `Morning Time-In (${computedStatus}) logged via ${scanType} Scanner`,
        qr_code: resolvedLrn,
        raw_payload: rawScannedText,
      });

      // Activity audit log (non-blocking)
      supabase
        .from('activity_logs')
        .insert([
          {
            role: 'student',
            action: `Attendance ${currentPeriod === 'time_out' ? 'Time-Out' : computedStatus}`,
            details: `${studentName} (LRN: ${resolvedLrn}) logged ${
              currentPeriod === 'time_out' ? 'Dismissal Time-Out' : computedStatus
            } via ${scanType} scan.`,
            timestamp: new Date().toISOString(),
          },
        ])
        .then(() => {});

      // 5. Audio & UI Feedback
      if (soundEnabled) {
        playAttendanceSound(computedStatus === 'Late' && currentPeriod === 'time_in' ? 'warning' : 'success');
      }

      const newEntry: ScannedEntry = {
        id: existingEntry?.id || Date.now(),
        student_id: studentId,
        name: studentName,
        lrn: resolvedLrn,
        section: sectionName,
        grade_level: gradeLevel,
        time: currentPeriod === 'time_out' && existingEntry ? existingEntry.time : timeStr,
        time_out: currentPeriod === 'time_out' ? timeStr : existingEntry?.time_out,
        date: todayStr,
        status: currentPeriod === 'time_out' && existingEntry ? existingEntry.status : computedStatus,
        mode: scanType,
        scanPeriod: currentPeriod,
        avatar_url: avatarUrl,
      };

      setScannedLogs((prev) => {
        const filtered = prev.filter(
          (item) => !(item.lrn === resolvedLrn && item.date === todayStr)
        );
        return [newEntry, ...filtered];
      });
      setLatestStudent(newEntry);
      setNotice({
        type: 'success',
        message:
          currentPeriod === 'time_out'
            ? `✓ ${studentName} (${gradeLevel} · Section ${sectionName}) checked out for Dismissal at ${timeStr} via ${scanType}!`
            : `✓ ${studentName} (${gradeLevel} · Section ${sectionName}) checked in as ${computedStatus} (${timeStr}) via ${scanType}!`,
      });

      setInputLrn('');
    } catch (err: any) {
      console.error('Scan processing error:', err);
      if (soundEnabled) playAttendanceSound('error');
      setNotice({ type: 'error', message: err?.message || 'Error processing attendance scan.' });
    } finally {
      setIsProcessing(false);
      // Auto re-focus input for hardware barcode scanners
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [
    scannedLogs,
    soundEnabled,
    activeGradeTarget,
    activeSectionTarget,
    sections,
    determineStatus,
    scanMode,
    user?.id,
  ]);

  // Handle Manual LRN Submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputLrn.trim()) return;
    const raw = inputLrn.trim();
    const isQrPayload = raw.includes('http') || raw.includes('verify-id') || raw.length > 16;
    processLrnOrQr(raw, isQrPayload ? 'QR' : 'LRN');
  };

  // Handle QR Image Upload (for teachers scanning a saved QR Pass or Student ID image)
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
          processLrnOrQr(code.data, 'QR');
        } else {
          if (soundEnabled) playAttendanceSound('error');
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

  // Camera Streaming & QR Detector Loop
  const startCamera = async (overrideFacing?: 'environment' | 'user') => {
    setCameraError(null);
    const targetFacing = overrideFacing || facingMode;
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: targetFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        // Fallback to any available video device
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera. Please allow camera permissions in your browser, upload a QR image, or use the LRN entry field below.');
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

  // Toggle Camera
  const toggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Flip Camera Front / Back
  const flipCamera = () => {
    stopCamera();
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setTimeout(() => startCamera(nextFacing), 250);
  };

  // Real-time Barcode / QR Detection loop with universal jsQR fallback for all desktop & mobile browsers
  useEffect(() => {
    let animationFrameId: number;
    let detector: any = null;

    if ('BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a'],
        });
      } catch (e) {
        console.debug('BarcodeDetector init note:', e);
      }
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scanFrame = async () => {
      if (cameraActive && videoRef.current && !isProcessing) {
        const video = videoRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0 && video.videoHeight > 0) {
          let detectedRaw: string | null = null;

          // 1. Try BarcodeDetector if available
          if (detector) {
            try {
              const barcodes = await detector.detect(video);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                detectedRaw = barcodes[0].rawValue;
              }
            } catch {
              // fallback to jsQR
            }
          }

          // 2. Universal jsQR fallback (works on desktop Chrome, Safari, Edge, Firefox, iPhone)
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
            const clean = parseLrnFromInput(detectedRaw);
            const now = Date.now();
            if (clean && lastScannedRef.current?.code === clean && now - lastScannedRef.current.timestamp < 3500) {
              // Within 3.5s cooldown window for the same card, avoid re-triggering duplicate warning
            } else {
              if (clean) {
                lastScannedRef.current = { code: clean, timestamp: now };
              }
              processLrnOrQr(detectedRaw, 'QR');
            }
          }
        }
      }
      if (cameraActive) {
        animationFrameId = requestAnimationFrame(scanFrame);
      }
    };

    if (cameraActive) {
      animationFrameId = requestAnimationFrame(scanFrame);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [cameraActive, isProcessing, processLrnOrQr]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Filter logs
  const filteredLogs = scannedLogs.filter((log) => {
    const matchesSearch =
      log.name.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.lrn.includes(logSearch) ||
      log.section.toLowerCase().includes(logSearch.toLowerCase());

    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    const matchesSection = selectedSectionFilter === 'All' || log.section === selectedSectionFilter;

    return matchesSearch && matchesStatus && matchesSection;
  });

  const presentCount = scannedLogs.filter((l) => l.status === 'Present').length;
  const lateCount = scannedLogs.filter((l) => l.status === 'Late').length;

  return (
    <div className="space-y-6 animate-fade-in w-full pb-12">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#1a225a] text-white shrink-0">
                <QrCode className="h-5 w-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-[#1a225a] font-display tracking-tight leading-snug">
                Student Attendance Scanner
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
              Automated student check-in using digital Student ID QR codes or 12-digit Learner Reference Numbers (LRN).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-auto pt-0.5">
            <Link
              to="/teacher/attendance"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition-colors"
            >
              <Layers className="h-4 w-4 text-[#1a225a]" />
              <span>Class Section Sheet</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Link>
            <PageHeaderNotificationSlot />
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="sm:hidden mt-3 flex items-center">
          <Link
            to="/teacher/attendance"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-colors"
          >
            <Layers className="h-4 w-4 text-[#1a225a]" />
            <span>Class Section Sheet</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* Control Bar: Mode, Cutoff Time & Sound */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switcher */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setScanMode('time-in')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scanMode === 'time-in'
                  ? 'bg-[#1a225a] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ☀️ Morning (Time-In)
            </button>
            <button
              onClick={() => setScanMode('time-out')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scanMode === 'time-out'
                  ? 'bg-[#1a225a] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🌙 Dismissal (Time-Out)
            </button>
          </div>

          {/* Active Class Target for Section/Grade Validation */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Layers className="h-4 w-4 text-[#1a225a]" />
            <span className="font-bold text-slate-500 uppercase text-[10px]">Active Class:</span>
            <select
              value={activeGradeTarget}
              onChange={(e) => {
                setActiveGradeTarget(e.target.value);
                setActiveSectionTarget('All');
              }}
              className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Grades</option>
              <option value="Grade 7">Grade 7</option>
              <option value="Grade 8">Grade 8</option>
              <option value="Grade 9">Grade 9</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
            </select>
            <span className="text-slate-300">/</span>
            <select
              value={activeSectionTarget}
              onChange={(e) => setActiveSectionTarget(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            >
              <option value="All">All Sections (Universal Scan)</option>
              {availableTargetSections.map((sec: any) => (
                <option key={sec.id} value={sec.name}>
                  Section {sec.name}
                </option>
              ))}
            </select>
          </div>

          {/* Late Cutoff setting */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Clock className="h-4 w-4 text-amber-600" />
            <span>Late After:</span>
            <input
              type="time"
              value={lateCutoff}
              onChange={(e) => setLateCutoff(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            />
          </div>

          {/* Audio Chime Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
              soundEnabled
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-slate-50 text-slate-500'
            }`}
            title="Toggle synthesized audio chime feedback on scan"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4" />}
            <span>Chimes: {soundEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Counter Summary */}
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="rounded-lg bg-slate-100 text-slate-700 px-3 py-1.5 border border-slate-200">
            Total Scanned: {scannedLogs.length}
          </span>
          <span className="rounded-lg bg-emerald-50 text-emerald-800 px-3 py-1.5 border border-emerald-200">
            Present: {presentCount}
          </span>
          <span className="rounded-lg bg-amber-50 text-amber-900 px-3 py-1.5 border border-amber-200">
            Late: {lateCount}
          </span>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : notice.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
            {notice.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />}
            {notice.type === 'error' && <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />}
            <span>{notice.message}</span>
          </div>
          <button
            onClick={() => setNotice(null)}
            className="text-slate-400 hover:text-slate-700 font-bold px-1.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Viewfinder & LRN Scanner Input (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* CAMERA SCANNER CARD */}
          <div className="rounded-3xl border border-slate-200 bg-slate-900 p-5 text-white shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white font-display">Live QR Camera Scanner</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  ref={qrImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleQrImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => qrImageInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 inline-flex items-center gap-1 cursor-pointer transition-colors"
                  title="Scan a saved Student ID or QR Pass image file"
                >
                  <Upload className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Upload QR</span>
                </button>
                {cameraActive && (
                  <button
                    onClick={flipCamera}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
                    title="Flip camera"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={toggleCamera}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    cameraActive
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {cameraActive ? 'Stop' : 'Start Camera'}
                </button>
              </div>
            </div>

            {/* Video or Placeholder Viewfinder */}
            <div className="relative aspect-4/3 rounded-2xl bg-black overflow-hidden flex flex-col items-center justify-center border border-slate-800">
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
                className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {!cameraActive && (
                <div className="text-center p-6 space-y-3">
                  <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-emerald-400/50 bg-emerald-950/40 text-emerald-400 mx-auto">
                    <QrCode className="h-10 w-10 text-emerald-300" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-300">Camera Viewfinder Idle</h4>
                    <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                      Click <strong>Start Camera</strong> to scan student QR codes via webcam/phone camera, or use the LRN field below.
                    </p>
                  </div>
                </div>
              )}

              {/* Animated Target Laser when camera is active */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="relative w-48 h-48 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></div>
                    {/* Corner accents */}
                    <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-300"></span>
                    <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-300"></span>
                    <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-300"></span>
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-300"></span>
                  </div>
                </div>
              )}
            </div>

            {cameraError && (
              <p className="text-xs text-rose-400 mt-2 text-center bg-rose-950/50 p-2 rounded-xl border border-rose-900">
                {cameraError}
              </p>
            )}
          </div>

          {/* HARDWARE / MANUAL LRN SCANNER INPUT */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Scan Barcode / Enter Student LRN</span>
              </label>
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                Press Enter to Log
              </span>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-2.5">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputLrn}
                  onChange={(e) => setInputLrn(e.target.value)}
                  placeholder="Scan QR/Barcode or enter 12-digit LRN..."
                  autoComplete="off"
                  className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:border-[#1a225a] focus:bg-white focus:outline-hidden transition-all shadow-inner"
                />
                {inputLrn && (
                  <button
                    type="button"
                    onClick={() => setInputLrn('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isProcessing || !inputLrn.trim()}
                  className="flex-1 rounded-xl bg-[#1a225a] hover:bg-[#25327d] disabled:opacity-50 text-white font-bold text-xs py-3 transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>{isProcessing ? 'Verifying Student...' : 'Log Attendance'}</span>
                </button>
              </div>
            </form>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              💡 <strong>Pro-Tip:</strong> Handheld USB/Bluetooth barcode and 2D QR scanners directly type into this field and automatically trigger the check-in!
            </p>
          </div>
        </div>

        {/* Right Column: Latest Scanned Learner + Scanned Log List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* LATEST SCANNED HERO CARD */}
          {latestStudent ? (
            <div className="rounded-3xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 via-white to-slate-50 p-5 shadow-sm animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                <span className="p-3 inline-block rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
              </div>

              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Latest Learner Verified
              </span>

              <div className="mt-3 flex items-start gap-4">
                <div className="h-14 w-14 rounded-2xl bg-[#1a225a] text-white flex items-center justify-center text-xl font-bold font-display shadow-md shrink-0 overflow-hidden">
                  {latestStudent.avatar_url ? (
                    <img src={latestStudent.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    latestStudent.name.charAt(0)
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-slate-900 truncate font-display">
                      {latestStudent.name}
                    </h3>
                    <Badge variant={latestStudent.status === 'Present' ? 'success' : 'warning'} size="sm">
                      {latestStudent.status}
                    </Badge>
                  </div>

                  <p className="text-xs font-mono font-bold text-slate-500 mt-0.5">
                    LRN: <span className="text-slate-800">{latestStudent.lrn}</span>
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1 font-semibold text-[#1a225a]">
                      <Layers className="h-3.5 w-3.5" /> Section {latestStudent.section}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-mono text-slate-500">
                      <Clock className="h-3.5 w-3.5 text-slate-400" /> {latestStudent.time}
                    </span>
                    <span>·</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-200 px-1.5 py-0.2 rounded">
                      Via {latestStudent.mode}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center text-slate-400">
              <QrCode className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-medium">Ready to scan student QR codes or type LRNs.</p>
            </div>
          )}

          {/* TODAY'S SCANNED LOG TABLE */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 font-display">Today's Scanned Log</h3>
                <p className="text-[11px] text-slate-400">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Search learner..."
                    className="pl-8 pr-3 py-1 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-700 focus:outline-hidden w-36 sm:w-44"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-hidden"
                >
                  <option value="All">All Status</option>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="overflow-x-auto">
              <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition-colors text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-xl bg-slate-100 text-[#1a225a] font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200">
                          {log.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{log.name}</p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span className="font-mono text-slate-600 font-semibold">{log.lrn}</span>
                            <span>·</span>
                            <span>{log.section}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-mono text-xs font-bold text-slate-700">
                            In: {log.time}
                            {log.time_out ? ` · Out: ${log.time_out}` : ''}
                          </span>
                          <Badge variant={log.status === 'Present' ? 'success' : 'warning'} size="sm">
                            {log.status}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">
                          Mode: {log.mode} {log.time_out ? '(In & Out)' : ''}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    <p className="text-xs">No attendance scans matching your criteria.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
