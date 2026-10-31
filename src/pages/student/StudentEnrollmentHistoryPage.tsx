import React from 'react';
import { History, Calendar, CheckCircle, GraduationCap } from 'lucide-react';
import { Badge } from '../../components/common/Badge';

export const StudentEnrollmentHistoryPage: React.FC = () => {
  const history = [
    { sy: '2026–2027', term: '1st Semester', grade: 'Grade 11', strand: 'STEM', status: 'Enrolled', date: 'Aug 14, 2026' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 font-display">
          Enrollment History & Past Terms
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Official timeline of your semester enrollments at Placido L. Señor NHS.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        {history.map((h, i) => (
          <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">S.Y. {h.sy} · {h.term}</h3>
                <p className="text-slate-500">{h.grade} - {h.strand} · Registered {h.date}</p>
              </div>
            </div>
            <Badge variant="success" size="sm">{h.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
};
