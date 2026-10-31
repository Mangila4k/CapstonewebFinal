import React from 'react';
import { FileText, Award, Printer, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';

export const StudentGradesPage: React.FC = () => {
  const { user } = useAuth();

  const gradeList = [
    { code: 'CORE-OC11', title: 'Oral Communication in Context', q1: 91, q2: 93, final: 92, remarks: 'Passed' },
    { code: 'CORE-GM11', title: 'General Mathematics', q1: 89, q2: 90, final: 90, remarks: 'Passed' },
    { code: 'CORE-ELS11', title: 'Earth and Life Science', q1: 92, q2: 94, final: 93, remarks: 'Passed' },
    { code: 'CORE-FIL11', title: 'Komunikasyon at Pananaliksik', q1: 90, q2: 92, final: 91, remarks: 'Passed' },
    { code: 'SP-PC11', title: 'Pre-Calculus (STEM Specialization)', q1: 88, q2: 91, final: 90, remarks: 'Passed' },
    { code: 'CORE-PE11', title: 'Physical Education and Health 1', q1: 95, q2: 96, final: 96, remarks: 'Passed' },
  ];

  const total = gradeList.reduce((sum, g) => sum + g.final, 0);
  const genAverage = (total / gradeList.length).toFixed(2);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 sm:pr-14">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            Official Report Card (Form 138)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Senior High School Academic Performance & Quarterly Ratings.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
        >
          <Printer className="h-4 w-4" /> Print Report Card
        </button>
      </div>

      {/* General Average Spotlight */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-800 to-emerald-950 p-6 text-white shadow-lg flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-slate-950 font-black text-xl shadow-md">
            <Award className="h-8 w-8 text-slate-950" />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
              General Average
            </span>
            <h2 className="text-3xl font-black font-display">{genAverage}</h2>
            <p className="text-xs text-emerald-200">Remarks: Passed with High Academic Standing</p>
          </div>
        </div>
        <div className="hidden sm:block text-right text-xs text-emerald-200">
          <p className="font-bold text-white">Placido L. Señor NHS</p>
          <p>School Year 2026–2027</p>
        </div>
      </div>

      {/* Grades Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Subject Title</th>
                <th className="px-5 py-3 text-center">Quarter 1</th>
                <th className="px-5 py-3 text-center">Quarter 2</th>
                <th className="px-5 py-3 text-center font-bold text-emerald-800">Final Rating</th>
                <th className="px-5 py-3 text-right">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gradeList.map((g, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-slate-900">{g.title}</p>
                    <span className="font-mono text-[10px] text-slate-400">{g.code}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono font-medium text-slate-700">
                    {g.q1}
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono font-medium text-slate-700">
                    {g.q2}
                  </td>
                  <td className="px-5 py-3.5 text-center font-mono font-extrabold text-emerald-800 text-sm">
                    {g.final}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Badge variant="success" size="sm">
                      {g.remarks}
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
