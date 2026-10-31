import React from 'react';
import { FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const StudentRequirementsPage: React.FC = () => {
  const reqs = [
    { name: 'Form 138 (Junior High School Report Card)', status: 'Verified', date: 'Aug 14, 2026', remarks: 'Official original submitted' },
    { name: 'PSA Birth Certificate (Photocopy)', status: 'Verified', date: 'Aug 14, 2026', remarks: 'Clear authenticated copy' },
    { name: 'Certificate of Good Moral Character', status: 'Verified', date: 'Aug 14, 2026', remarks: 'From previous junior high school' },
    { name: 'Recent 2x2 ID Photos (White Background)', status: 'Verified', date: 'Aug 14, 2026', remarks: 'Archived in student physical 201 file' },
    { name: 'Medical Clearance / Health Form', status: 'Completed', date: 'Aug 18, 2026', remarks: 'School clinic verified' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 font-display">
          Documentary Requirements
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Official DepEd student document compliance status verified by the Registrar.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {reqs.map((r, i) => (
            <div key={i} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{r.name}</h3>
                  <p className="text-slate-400 text-[11px] mt-0.5">{r.remarks} · Recorded {r.date}</p>
                </div>
              </div>

              <div>
                <Badge variant="success" size="sm">
                  {r.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
