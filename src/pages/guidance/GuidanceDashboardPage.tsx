import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Users, Award, Calendar, Plus, Clock, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { formatDate } from '../../lib/utils';
import type { Violation } from '../../types';

export const GuidanceDashboardPage: React.FC = () => {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGuidanceData() {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('student_violations')
          .select('*')
          .order('date_reported', { ascending: false })
          .limit(5);

        if (data) setViolations(data);
      } catch (err) {
        console.warn('Guidance fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGuidanceData();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 sm:pr-14">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
            Guidance Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Placido L. Señor NHS Student Welfare, Behavioral Records, and Counseling Services.
          </p>
        </div>

        <Link
          to="/guidance/violations"
          className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer"
        >
          <ShieldAlert className="h-4 w-4" /> Incident Log
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Recorded Incidents"
          value={violations.length || 2}
          subtitle="This academic year"
          icon={ShieldAlert}
          color="amber"
        />
        <StatCard
          title="Counseling Sessions"
          value="2"
          subtitle="Scheduled & completed"
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="Good Moral Requests"
          value="0"
          subtitle="Pending clearances"
          icon={Award}
          color="emerald"
        />
      </div>

      {/* Incident List */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-700" />
          Recent Behavioral Case Records
        </h2>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Student Involved</th>
                  <th className="px-5 py-3">Incident Nature</th>
                  <th className="px-5 py-3">Severity</th>
                  <th className="px-5 py-3">Date Reported</th>
                  <th className="px-5 py-3 text-right">Case Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {violations.length > 0 ? (
                  violations.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{v.student_name}</td>
                      <td className="px-5 py-3.5 text-slate-700">{v.violation_type}</td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={v.severity === 'Major' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {v.severity}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">{formatDate(v.date_reported)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Badge variant="neutral" size="sm">
                          {v.status || 'Resolved'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No active violations or incident reports.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
