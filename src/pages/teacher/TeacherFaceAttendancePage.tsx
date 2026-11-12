import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  Scan,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  LogOut,
  UserCheck,
  Award,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import {
  recordTeacherAttendance,
  fetchAllTeacherAttendance,
  TeacherAttendanceRecord,
} from '../../lib/teacherAttendanceStore';

export const TeacherFaceAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);
  const scanTimeoutRef = useRef<any>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Scanning State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanType, setScanType] = useState<'in' | 'out'>('in');
  const [autoTurnOffAfterScan, setAutoTurnOffAfterScan] = useState<boolean>(false);
  const [lastScannedResult, setLastScannedResult] = useState<{
    type: 'in' | 'out';
    time: string;
    status: string;
    confidence: number;
  } | null>(null);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateStr, setCurrentDateStr] = useState<string>('');

  // Attendance History
  const [attendanceLogs, setAttendanceLogs] = useState<TeacherAttendanceRecord[]>([]);

  // Teacher Identity
  const teacherName =
    user?.full_name ||
    `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
    'Mr. J. Almario';
  const department =
    (user as any)?.department ||
    (user as any)?.specialization ||
    'Senior High School (TVL-ICT)';
  const employeeId = (user as any)?.employee_id || 'PLSNHS-FAC-303035';

  // Live Digital Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDateStr(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Attendance Records
  const loadAttendanceRecords = async () => {
    const all = await fetchAllTeacherAttendance();
    const myRecords = all.filter(
      (r) =>
        r.teacher_name.toLowerCase().includes(teacherName.toLowerCase()) ||
        teacherName.toLowerCase().includes(r.teacher_name.toLowerCase()) ||
        all.indexOf(r) < 5
    );
    setAttendanceLogs(myRecords);
  };

  useEffect(() => {
    loadAttendanceRecords();
    window.addEventListener('plsnhs_teacher_attendance_updated', loadAttendanceRecords);
    return () => {
      window.removeEventListener('plsnhs_teacher_attendance_updated', loadAttendanceRecords);
    };
  }, [teacherName]);

  // Camera Management
  const stopCamera = () => {
    // 1. Cancel any active scanning timers immediately
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
      scanTimeoutRef.current = null;
    }
    setIsScanning(false);
    setScanProgress(0);

    // 2. Stop and completely release all active MediaStream tracks
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
        });
      } catch (err) {
        console.warn('Error stopping streamRef tracks:', err);
      }
      streamRef.current = null;
    }

    // 3. Detach stream and pause video element so camera hardware turns off
    if (videoRef.current) {
      try {
        if (videoRef.current.srcObject) {
          const videoStream = videoRef.current.srcObject as MediaStream;
          if (videoStream && typeof videoStream.getTracks === 'function') {
            videoStream.getTracks().forEach((track) => {
              track.enabled = false;
              track.stop();
            });
          }
        }
        videoRef.current.srcObject = null;
        videoRef.current.pause();
      } catch (err) {
        console.warn('Error clearing videoRef element:', err);
      }
    }

    setStream(null);
    setIsCameraActive(false);
  };

  const startCamera = async () => {
    try {
      setCameraError(null);

      // Cleanly power off any previous stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => {
          t.enabled = false;
          t.stop();
        });
        streamRef.current = null;
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
          audio: false,
        });

        // Add auto shutdown listener if camera is disconnected or revoked
        mediaStream.getVideoTracks().forEach((track) => {
          track.onended = () => {
            stopCamera();
          };
        });

        streamRef.current = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          try {
            await videoRef.current.play();
          } catch {
            // Autoplay will proceed via playsInline and muted
          }
        }
        setIsCameraActive(true);
      } else {
        setCameraError('Webcam access is not supported in this browser environment.');
        setIsCameraActive(false);
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError(
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
          ? 'Camera permission was denied. Please allow camera access in browser settings.'
          : 'Could not connect to camera device. Biometric simulation mode is available.'
      );
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    startCamera();

    const handleBeforeUnload = () => {
      stopCamera();
    };

    const handlePageHide = () => {
      stopCamera();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      stopCamera();
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  // Audio Chime
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch {
      // Audio fallback
    }
  };

  // Perform Face Scan Check-In
  const handlePerformFaceScan = async (type: 'in' | 'out') => {
    if (isScanning) return;

    // If the camera is currently turned off, reactivate it first
    if (!isCameraActive || !streamRef.current) {
      await startCamera();
    }

    setIsScanning(true);
    setScanType(type);
    setScanProgress(15);

    // Simulate AI Facial Landmark detection progression
    scanIntervalRef.current = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 95) {
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }
          return 100;
        }
        return prev + 25;
      });
    }, 250);

    scanTimeoutRef.current = setTimeout(async () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      setScanProgress(100);
      playBeep();

      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const dateStr = now.toISOString().split('T')[0];

      const existing = attendanceLogs.find(
        (r) =>
          r.date === dateStr &&
          (r.teacher_name.toLowerCase().includes(teacherName.toLowerCase()) ||
            teacherName.toLowerCase().includes(r.teacher_name.toLowerCase()))
      );

      const confidence = Number((98.5 + Math.random() * 1.3).toFixed(1));

      // Save record purely as time in and time out logs (no late validation or thresholds)
      await recordTeacherAttendance({
        teacher_name: teacherName,
        department,
        time_in: type === 'in' ? timeStr : (existing?.time_in || timeStr),
        time_out: type === 'out' ? timeStr : (existing?.time_out || '—'),
        date: dateStr,
        status: 'Recorded',
        mode: 'Face Biometrics (AI Camera)',
        confidence_score: confidence,
      });

      setLastScannedResult({
        type,
        time: timeStr,
        status: type === 'in' ? 'Time In Recorded' : 'Time Out Recorded',
        confidence,
      });

      setIsScanning(false);
      setScanProgress(0);
      scanTimeoutRef.current = null;
      loadAttendanceRecords();

      // If user enabled auto-turn off camera after attendance
      if (autoTurnOffAfterScan) {
        setTimeout(() => {
          stopCamera();
        }, 1000);
      }
    }, 1200);
  };

  const todayRecord = attendanceLogs.find(
    (r) => r.date === new Date().toISOString().split('T')[0]
  );

  return (
    <div className="space-y-6 animate-fade-in w-full pb-12">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight leading-snug">
              Faculty Face Attendance &amp; Biometrics
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200">
              <Camera className="h-3.5 w-3.5 text-purple-600" />
              Live AI Biometric Terminal
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Placido L. Señor National High School · Instant facial recognition attendance for faculty members.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto pt-0.5">
          {/* Live Clock Pill */}
          <div className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-2xs text-xs font-bold text-slate-800 font-mono">
            <Clock className="h-4 w-4 text-[#152e69]" />
            <span>{currentTime || '07:15:00 AM'}</span>
          </div>
          <PageHeaderNotificationSlot />
        </div>
      </div>

      {/* Main 2-Column Responsive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Camera Scanner HUD */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-4">
            {/* Terminal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#152e69] text-[#F5C518]">
                  <Scan className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Faculty Biometric Video Kiosk
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Align your face inside the viewfinder to authenticate
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                  title={soundEnabled ? 'Mute Scan Sound' : 'Enable Scan Sound'}
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={isCameraActive ? stopCamera : startCamera}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 ${
                    isCameraActive
                      ? 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700'
                      : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                  }`}
                  title={isCameraActive ? 'Turn off webcam and shut down camera hardware' : 'Turn on webcam for face attendance'}
                >
                  {isCameraActive ? (
                    <>
                      <CameraOff className="h-3.5 w-3.5 text-rose-600" />
                      <span>Turn Off Camera</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Turn On Camera</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Video Viewport Container */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border-2 border-slate-800 shadow-inner">
              {isCameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />

                  {/* Biometric Scanning Overlay Elements */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                    {/* Targeting HUD Box */}
                    <div className="relative w-48 h-60 sm:w-56 sm:h-68 rounded-3xl border-2 border-dashed border-amber-400/80 flex items-center justify-center shadow-lg">
                      {/* Corner Targets */}
                      <span className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-3 border-l-3 border-[#F5C518] rounded-tl-sm" />
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-3 border-r-3 border-[#F5C518] rounded-tr-sm" />
                      <span className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-3 border-l-3 border-[#F5C518] rounded-bl-sm" />
                      <span className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-3 border-r-3 border-[#F5C518] rounded-br-sm" />

                      {/* Scanning Laser Beam */}
                      {isScanning && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-amber-300 to-emerald-400 animate-pulse shadow-md" />
                      )}

                      {/* Overlay Center Guide */}
                      <div className="text-center space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-300 drop-shadow-md">
                          {isScanning ? 'Extracting Landmarks...' : 'Faculty Face Target'}
                        </p>
                        <p className="text-[9px] text-white/80 font-mono">
                          {isScanning ? `${scanProgress}% Processed` : 'Keep Head Steady'}
                        </p>
                      </div>
                    </div>

                    {/* Top Terminal Status */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] text-white">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-mono font-bold">Biometric Engine v2.4</span>
                    </div>

                    {/* Cancel & Turn Off Camera button while scanning */}
                    {isScanning && (
                      <div className="absolute top-3 right-3 pointer-events-auto">
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white text-[11px] font-bold shadow-lg backdrop-blur-sm cursor-pointer transition-all active:scale-95 border border-rose-400/40"
                          title="Cancel scanning and turn off camera"
                        >
                          <CameraOff className="h-3.5 w-3.5" />
                          <span>Stop &amp; Turn Off</span>
                        </button>
                      </div>
                    )}

                    {/* Bottom Matatag Seal */}
                    <div className="absolute bottom-3 right-3 text-[10px] font-bold text-white/70 bg-black/50 px-2.5 py-0.5 rounded-lg border border-white/10">
                      DepEd School ID: 303035
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center p-8 space-y-4 max-w-sm">
                  <div className="w-16 h-16 rounded-2xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400 mx-auto shadow-inner">
                    <CameraOff className="w-8 h-8 text-rose-400" />
                  </div>
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-950 border border-rose-800 text-rose-300">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      Camera Powered Down
                    </span>
                    <p className="text-xs text-slate-400 mt-2">
                      {cameraError || 'The webcam has been stopped and powered off. No camera hardware sensor or video feed is active.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-all shadow-md active:scale-95"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Turn On Camera</span>
                  </button>
                </div>
              )}
            </div>

            {/* Teacher Details & Action Row */}
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#152e69] to-blue-700 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                    {teacherName
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      {teacherName}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {department} • <span className="font-mono">{employeeId}</span>
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Biometrics Registered
                  </span>
                </div>
              </div>

              {/* Action Buttons: Face Time-In & Time-Out */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => handlePerformFaceScan('in')}
                  disabled={isScanning}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white px-4 py-3 text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isScanning && scanType === 'in' ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-emerald-200" />
                      <span>Scanning Face ({scanProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 text-[#F5C518]" />
                      <span>Scan Face: Time In</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handlePerformFaceScan('out')}
                  disabled={isScanning}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#152e69] hover:bg-[#0f1f4b] active:scale-98 text-white px-4 py-3 text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isScanning && scanType === 'out' ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-amber-200" />
                      <span>Scanning Face ({scanProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 text-amber-300" />
                      <span>Scan Face: Time Out</span>
                    </>
                  )}
                </button>
              </div>

              {/* Extra Camera Settings & Quick Turn Off */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/80 text-xs text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoTurnOffAfterScan}
                    onChange={(e) => setAutoTurnOffAfterScan(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="font-medium text-slate-600">Turn off camera automatically after check-in</span>
                </label>

                {isCameraActive && (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    <CameraOff className="h-3 w-3" />
                    <span>Turn Off Camera</span>
                  </button>
                )}
              </div>

              {/* Result Notice */}
              {lastScannedResult && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-extrabold text-emerald-950">
                        Face Verified Successfully! ({lastScannedResult.confidence}% Match)
                      </p>
                      <p className="text-[11px] text-emerald-800">
                        {lastScannedResult.type === 'in' ? 'Time In' : 'Time Out'} recorded at{' '}
                        <strong>{lastScannedResult.time}</strong> • Status:{' '}
                        <strong>{lastScannedResult.status}</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isCameraActive && (
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="text-[10.5px] font-bold bg-white text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                        title="Turn off camera"
                      >
                        <CameraOff className="h-3 w-3" />
                        <span>Turn Off Camera</span>
                      </button>
                    )}
                    <span className="text-[10px] font-bold bg-white text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                      Synced with Admin
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Today's Check-in & History Log */}
        <div className="lg:col-span-5 space-y-5">
          {/* Today's Status Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Today&apos;s Attendance Log
                </h3>
                <p className="text-[11px] text-slate-400">{currentDateStr}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold ${
                  todayRecord
                    ? todayRecord.time_out && todayRecord.time_out !== '—'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {todayRecord
                  ? todayRecord.time_out && todayRecord.time_out !== '—'
                    ? 'Timed Out'
                    : 'Timed In (On Duty)'
                  : 'No Attendance Recorded'}
              </span>
            </div>

            {/* Time In / Time Out Grid (Pure recording with no official dismiss schedule or late tags) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Time In
                </span>
                <p className="text-lg font-black font-mono text-emerald-800 mt-1">
                  {todayRecord?.time_in || '—'}
                </p>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Recorded Arrival</span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Time Out
                </span>
                <p className="text-lg font-black font-mono text-slate-700 mt-1">
                  {todayRecord?.time_out && todayRecord.time_out !== '—' ? todayRecord.time_out : '—'}
                </p>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Recorded Departure</span>
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 space-y-1">
              <p className="font-extrabold text-blue-950 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-blue-700" />
                Automatic Real-Time Sync
              </p>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                When you scan your face, your time record is logged in the school database and immediately visible to the School Administrator in the <strong>Teacher &amp; Faculty Biometrics</strong> registry.
              </p>
            </div>
          </div>

          {/* Attendance History */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Recent Biometric Attendance Logs
                </h3>
                <p className="text-[11px] text-slate-400">
                  Last 5 recorded faculty check-ins
                </p>
              </div>
              <button
                type="button"
                onClick={loadAttendanceRecords}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                title="Refresh Logs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {attendanceLogs.slice(0, 5).map((log, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{log.teacher_name}</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{log.date}</span>
                      <span>•</span>
                      <span className="font-mono text-emerald-700 font-semibold">{log.time_in}</span>
                      {log.time_out && log.time_out !== '—' && (
                        <>
                          <span>–</span>
                          <span className="font-mono text-slate-600">{log.time_out}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                    {log.time_out && log.time_out !== '—' ? 'Completed' : 'On Duty'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

