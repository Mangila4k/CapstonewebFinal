import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Users, Award, Calendar, Plus, Clock, Sparkles } from 'lucide-react';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';
import { supabase } from '../../lib/supabase';
import { StatCard } from '../../components/common/StatCard';
import { Badge } from '../../components/common/Badge';
import { formatDate } from '../../lib/utils';
import type { Violation } from '../../types';

export const GuidanceDashboardPage: React.FC = () => {
  const [violations, setViolations] = useState<any[]>([]);
  const [counselingCount, setCounselingCount] = useState<number>(2);
  const [goodMoralCount, setGoodMoralCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGuidanceData() {
      try {
        setLoading(true);
        const [
          { data: violData, error: violErr },
          { count: cCount },
          { count: gCount },
        ] = await Promise.all([
          supabase
            .from('student_violations')
            .select('*')
            .order('incident_date', { ascending: false })
            .limit(10),
          supabase.from('counseling_sessions').select('id', { count: 'exact', head: true }),
          supabase.from('good_moral_requests').select('id', { count: 'exact', head: true }),
        ]);

        if (violData && violData.length > 0) {
          setViolations(violData);
        }
        if (typeof cCount === 'number') setCounselingCount(cCount);
        if (typeof gCount === 'number') setGoodMoralCount(gCount);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
            Guidance Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Placido L. Señor NHS Student Welfare, Behavioral Records, and Counseling Services.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/guidance/violations"
            className="flex h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-all cursor-pointer"
          >
            <ShieldAlert className="h-4 w-4" /> Incident Log
          </Link>
          <PageHeaderNotificationSlot />
        </div>
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
          value={counselingCount}
          subtitle="Scheduled & completed"
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="Good Moral Requests"
          value={goodMoralCount}
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
                      <td className="px-5 py-3.5 text-slate-700">{v.violation_title || v.violation_type}</td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant={(v.offense_level || v.severity) === 'Major' ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {v.offense_level || v.severity || 'Minor'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">{formatDate(v.incident_date || v.date_reported || v.created_at)}</td>
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
