import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AlertProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  onClose,
  className,
}) => {
  const styles = {
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />,
    },
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />,
    },
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: <Info className="h-5 w-5 text-blue-600 shrink-0" />,
    },
  };

  const current = styles[type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 text-sm transition-all shadow-xs',
        current.bg,
        className
      )}
    >
      {current.icon}
      <div className="flex-1">
        {title && <h4 className="font-semibold">{title}</h4>}
        <p className={title ? 'mt-1 text-xs leading-relaxed opacity-90' : 'text-sm'}>{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="rounded-md p-1 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
