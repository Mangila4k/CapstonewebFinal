import React from 'react';
import { Calendar, UserCheck, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const StudentAttendancePage: React.FC = () => {
  const attendanceLog = [
    { date: 'Oct 27, 2026', day: 'Tuesday', status: 'Present', timeIn: '07:15 AM' },
    { date: 'Oct 26, 2026', day: 'Monday', status: 'Present', timeIn: '07:18 AM' },
    { date: 'Oct 23, 2026', day: 'Friday', status: 'Present', timeIn: '07:22 AM' },
    { date: 'Oct 22, 2026', day: 'Thursday', status: 'Late', timeIn: '07:42 AM' },
    { date: 'Oct 21, 2026', day: 'Wednesday', status: 'Present', timeIn: '07:10 AM' },
    { date: 'Oct 20, 2026', day: 'Tuesday', status: 'Present', timeIn: '07:14 AM' },
    { date: 'Oct 19, 2026', day: 'Monday', status: 'Excused', timeIn: '—' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 font-display">
          Attendance Record
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Official daily school attendance log recorded for School Year 2026–2027.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 text-center">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
            Days Present
          </span>
          <p className="text-3xl font-black text-emerald-950 mt-1 font-display">48</p>
          <span className="text-[11px] text-emerald-600">96.0% Attendance Rate</span>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-center">
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
            Tardy / Late
          </span>
          <p className="text-3xl font-black text-amber-950 mt-1 font-display">2</p>
          <span className="text-[11px] text-amber-600">Morning assemblies</span>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5 text-center">
          <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
            Unexcused Absences
          </span>
          <p className="text-3xl font-black text-rose-950 mt-1 font-display">0</p>
          <span className="text-[11px] text-rose-600">Clean attendance record</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Day of Week</th>
                <th className="px-5 py-3">Time-In Registered</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attendanceLog.map((log, i) => (
                <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-slate-800">{log.date}</td>
                  <td className="px-5 py-3.5 text-slate-600">{log.day}</td>
                  <td className="px-5 py-3.5 font-mono text-slate-600">{log.timeIn}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Badge
                      variant={
                        log.status === 'Present'
                          ? 'success'
                          : log.status === 'Late'
                          ? 'warning'
                          : 'info'
                      }
                      size="sm"
                    >
                      {log.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
