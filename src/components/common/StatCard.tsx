import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'emerald',
  className,
}) => {
  const colorThemes = {
    emerald: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-100',
      hover: 'hover:border-emerald-300',
    },
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-100',
      hover: 'hover:border-blue-300',
    },
    amber: {
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-100',
      hover: 'hover:border-amber-300',
    },
    rose: {
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-100',
      hover: 'hover:border-rose-300',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-100',
      hover: 'hover:border-purple-300',
    },
  };

  const theme = colorThemes[color];

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-5 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md',
        theme.hover,
        className
      )}
    >
      <div className="flex items-start sm:items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate">{title}</p>
          <h3 className="mt-1 sm:mt-1.5 text-xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display truncate">{value}</h3>
          {subtitle && <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-400 truncate line-clamp-1">{subtitle}</p>}
          {trend && (
            <p className="mt-1.5 text-[10px] sm:text-xs font-semibold">
              <span className={trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>{' '}
              <span className="text-slate-400 hidden sm:inline">vs last period</span>
            </p>
          )}
        </div>
        <div
          className={cn(
            'flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl transition-transform duration-300 group-hover:scale-110 shrink-0',
            theme.bg,
            theme.text
          )}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
};
