import React, { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle2, Clock, AlertTriangle, FileText, Layers, School } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../../components/common/Badge';

export const StudentEnrollmentPage: React.FC = () => {
  const { user } = useAuth();

  const rawGrade = String(user?.student_grade || 'Grade 7').trim();
  const numMatch = rawGrade.match(/\d+/);
  const gradeNum = numMatch ? parseInt(numMatch[0], 10) : 7;
  const isSeniorHigh = gradeNum >= 11 || rawGrade.toLowerCase().includes('senior');
  const levelCategory = isSeniorHigh ? 'Senior High' : 'Junior High';
  const displayStrandOrLevel = isSeniorHigh
    ? user?.student_strand || 'STEM'
    : 'Junior High';
  const displaySection =
    user?.student_section ||
    (isSeniorHigh ? `Grade ${gradeNum} - Section A` : `Grade ${gradeNum} - Rizal`);

  const requirements = [
    { title: 'Form 138 (Junior High School Report Card)', status: 'Verified' },
    { title: 'PSA Birth Certificate (Photocopy)', status: 'Verified' },
    { title: 'Certificate of Good Moral Character', status: 'Verified' },
    { title: '2x2 Recent ID Photos (White Background)', status: 'Verified' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 font-display">
          Enrollment & Registration Record
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Official status of your academic admission for School Year 2026–2027.
        </p>
      </div>

      {/* Status Card */}
      <div className="rounded-3xl border-2 border-emerald-500/30 bg-white p-6 sm:p-8 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
              <CheckCircle2 className="h-7 w-7 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Official Enrollment Status</h3>
                <Badge variant="success" size="sm">
                  {user?.student_status || 'Enrolled'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                Learner Reference Number: <span className="font-mono font-bold text-slate-800">{user?.student_lrn || '109823456789'}</span>
              </p>
            </div>
          </div>

          <div className="text-right text-xs">
            <p className="font-bold text-slate-800">School Year 2026–2027</p>
            <p className="text-slate-400">1st Semester Active</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <span className="font-semibold text-slate-400">Grade Level</span>
            <p className="text-base font-bold text-slate-900 mt-1">{rawGrade}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <span className="font-semibold text-slate-400">
              {isSeniorHigh ? 'Senior High Strand' : 'Department Level'}
            </span>
            <p className="text-base font-bold text-emerald-800 mt-1">
              {displayStrandOrLevel}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <span className="font-semibold text-slate-400">Assigned Section</span>
            <p className="text-base font-bold text-slate-900 mt-1">{displaySection}</p>
          </div>
        </div>
      </div>

      {/* Requirements Verification Checklist */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-700" />
          Documentary Requirements Status
        </h3>

        <div className="divide-y divide-slate-100 text-xs">
          {requirements.map((req, i) => (
            <div key={i} className="py-3 flex items-center justify-between">
              <span className="font-medium text-slate-800">{req.title}</span>
              <Badge variant="success" size="sm">
                {req.status}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
