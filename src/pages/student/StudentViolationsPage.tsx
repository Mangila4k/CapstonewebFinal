import React from 'react';
import { ShieldCheck, Award, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const StudentViolationsPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 font-display">
          Guidance & Student Conduct Record
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Official behavioral standing and guidance office clearance.
        </p>
      </div>

      <div className="rounded-3xl border-2 border-emerald-500/30 bg-emerald-50/40 p-8 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-800 shadow-md">
          <ShieldCheck className="h-10 w-10 text-emerald-700" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 font-display">
            Exemplary Student Conduct
          </h2>
          <p className="text-xs text-emerald-800 max-w-md mx-auto">
            You have a pristine disciplinary record with zero recorded violations or behavioral
            infractions for School Year 2026–2027.
          </p>
        </div>
        <div className="pt-2">
          <Badge variant="emerald" size="md">
            CLEAN DISCIPLINARY RECORD
          </Badge>
        </div>
      </div>
    </div>
  );
};
