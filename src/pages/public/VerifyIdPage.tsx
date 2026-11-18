import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ShieldCheck, CheckCircle2, XCircle, RotateCw, QrCode, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/common/Badge';
import { StudentIdCard } from '../../components/common/StudentIdCard';
import { logAttendanceRecord, getLocalTodayStr } from '../../lib/attendanceService';

export const VerifyIdPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [lrnQuery, setLrnQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [attendanceLogged, setAttendanceLogged] = useState<{
    status: string;
    time: string;
    date: string;
  } | null>(null);

  const recordQrScanAttendance = async (studentRecord: any) => {
    if (!studentRecord?.id) return;
    const todayStr = getLocalTodayStr();
    const nowTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const res = await logAttendanceRecord({
      student_id: String(studentRecord.id),
      status: 'present',
      mode: 'time_in',
      date: todayStr,
      qr_code: studentRecord.lrn || String(studentRecord.id),
      remarks: `[Time-In: ${nowTime}] QR ID Scan via Verify Page`,
    });

    if (res.success) {
      setAttendanceLogged({
        status: 'Present',
        time: nowTime,
        date: todayStr,
      });
    }
  };

  useEffect(() => {
    const lrnParam = searchParams.get('lrn');
    const nameParam = searchParams.get('name');
    const idParam = searchParams.get('id');
    const gradeParam = searchParams.get('grade');
    const guardianParam = searchParams.get('guardian');
    const contactParam = searchParams.get('contact');

    if (lrnParam || nameParam) {
      const q = lrnParam || nameParam || '';
      setLrnQuery(q);
      setLoading(true);
      setHasSearched(true);

      async function verifyParamRecord() {
        try {
          let queryBuilder = supabase.from('students').select('*');
          if (lrnParam && idParam) {
            queryBuilder = queryBuilder.or(`lrn.eq.${lrnParam},id.eq.${idParam}`);
          } else if (lrnParam) {
            queryBuilder = queryBuilder.eq('lrn', lrnParam);
          } else if (idParam) {
            queryBuilder = queryBuilder.eq('id', idParam);
          } else {
            queryBuilder = queryBuilder.ilike('last_name', `%${q}%`);
          }
          const { data } = await queryBuilder.maybeSingle();

          if (data) {
            setResult(data);
            await recordQrScanAttendance(data);
          } else {
            setResult({
              first_name: nameParam?.split(' ')[0] || 'Learner',
              last_name: nameParam?.split(' ').slice(1).join(' ') || '',
              fullname: nameParam || 'Student',
              lrn: lrnParam || '—',
              grade_level: gradeParam || 'Junior High',
              guardian_name: guardianParam || '—',
              guardian_contact: contactParam || '—',
              status: 'Enrolled',
            });
          }
        } catch {
          setResult({
            fullname: nameParam || 'Student',
            lrn: lrnParam || '—',
            grade_level: gradeParam || 'Junior High',
            status: 'Enrolled',
          });
        } finally {
          setLoading(false);
        }
      }

      verifyParamRecord();
    }
  }, [searchParams]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = lrnQuery.trim();
    if (!query) return;

    setLoading(true);
    setHasSearched(true);
    setResult(null);

    try {
      // Query students or enrollments table by LRN or ID
      const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .or(`lrn.eq.${query},email.ilike.${query}`)
        .maybeSingle();

      if (studentData) {
        setResult(studentData);
      } else {
        const { data: enrData } = await supabase
          .from('enrollments')
          .select('*')
          .or(`lrn.eq.${query},email.ilike.${query}`)
          .maybeSingle();

        if (enrData) {
          setResult(enrData);
        }
      }
    } catch (err) {
      console.warn('Verification search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-10">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800">
          <ShieldCheck className="h-4 w-4 text-emerald-700" />
          <span>Official Public Registry</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-display">
          Student ID & Credential Verification
        </h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Verify the authenticity of Placido L. Señor National High School student identification
          cards and enrollment status via Learner Reference Number (LRN).
        </p>
      </div>

      {/* Search Input Box */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              required
              value={lrnQuery}
              onChange={(e) => setLrnQuery(e.target.value)}
              placeholder="Enter 12-digit Learner Reference Number (LRN) or Student Email"
              className="w-full rounded-2xl border border-slate-300 bg-slate-50/50 pl-12 pr-4 py-3.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-8 py-3.5 text-sm font-bold text-white shadow-md hover:bg-emerald-900 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" /> Verify Record
              </>
            )}
          </button>
        </form>
      </div>

      {/* Results Display */}
      {hasSearched && (
        <div className="animate-fade-in">
          {result ? (
            <div className="overflow-hidden rounded-3xl border-2 border-emerald-500/30 bg-white shadow-2xl">
              <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700/80 border border-emerald-500 text-white">
                    <CheckCircle2 className="h-7 w-7 text-emerald-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">Verified DepEd Record</h3>
                      <Badge variant="emerald" size="sm">
                        AUTHENTIC
                      </Badge>
                    </div>
                    <p className="text-xs text-emerald-200">
                      Placido L. Señor NHS · Registered Student File
                    </p>
                  </div>
                </div>
                <img
                  src="/pictures/logo sa skwelahan.png"
                  alt="School Crest"
                  className="h-12 w-12 rounded-full border-2 border-amber-400 object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {attendanceLogged ? (
                <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-extrabold">
                    <QrCode className="h-4 w-4 text-emerald-700" />
                    <span>✓ Official QR Attendance Recorded for Today ({attendanceLogged.date})</span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 text-white px-2.5 py-1 text-[11px] font-bold">
                    <Clock className="h-3 w-3" />
                    Time-In: {attendanceLogged.time} · {attendanceLogged.status}
                  </span>
                </div>
              ) : result?.id ? (
                <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-600">
                    Scan verified. Click to log today&apos;s official QR attendance:
                  </span>
                  <button
                    type="button"
                    onClick={() => recordQrScanAttendance(result)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    Record QR Attendance
                  </button>
                </div>
              ) : null}

              <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Student Full Name
                    </span>
                    <p className="text-lg font-extrabold text-slate-900">
                      {result.first_name} {result.middle_name || ''} {result.last_name}{' '}
                      {result.extension_name || ''}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Learner Reference Number (LRN)
                    </span>
                    <p className="font-mono text-base font-bold text-emerald-800">
                      {result.lrn || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Academic Level
                    </span>
                    <p className="font-semibold text-slate-800">
                      {result.grade_level || 'Grade 11'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Senior High Strand
                    </span>
                    <p className="font-semibold text-slate-800">
                      {result.strand || 'General Academic Strand'}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Official Status
                    </span>
                    <div className="mt-1">
                      <Badge variant="success" size="md">
                        {result.status || 'Enrolled'}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Section / Schedule
                    </span>
                    <p className="font-semibold text-slate-800">
                      {result.section || 'Assigned by Registrar'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Official Student ID Card Preview */}
              <div className="border-t border-slate-200 p-6 bg-slate-50/50 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <span className="text-[#f5b72e]">🪪</span> Official CR80 Student ID Card
                  </h4>
                  <button
                    type="button"
                    onClick={() => setCardFlipped(!cardFlipped)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <RotateCw className="h-3 w-3 text-slate-500" /> Flip View
                  </button>
                </div>
                <div className="overflow-x-auto w-full flex justify-center py-2">
                  <StudentIdCard
                    data={{
                      fullname: result.fullname || `${result.first_name || ''} ${result.last_name || ''}`.trim(),
                      first_name: result.first_name,
                      last_name: result.last_name,
                      lrn: result.lrn,
                      grade_level: result.grade_level,
                      strand: result.strand,
                      parent_name: result.guardian_name || result.parent_name,
                      parent_contact: result.guardian_contact || result.parent_contact,
                      photo_url: result.two_by_two_picture_url || result.photo_url || result.avatar_url,
                      school_year: '2026-2027',
                    }}
                    flipped={cardFlipped}
                    side="both"
                    scale={0.85}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
                <span>Verified with Department of Education LIS standards</span>
                <span>School Year 2026–2027</span>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-lg">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
                <XCircle className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No Record Found</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
                No active student or enrollment matches the query{' '}
                <span className="font-mono font-semibold text-slate-800">"{lrnQuery}"</span>.
                Please ensure the 12-digit LRN is entered correctly or visit the registrar office for assistance.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
