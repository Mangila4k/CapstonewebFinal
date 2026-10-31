import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-800 font-black text-3xl mb-4 font-display">
        404
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
        Page Not Found
      </h1>
      <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-sm">
        The requested URL was not found on the Placido L. Señor National High School portal.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          to="/"
          className="flex items-center gap-2 rounded-xl bg-emerald-800 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-900"
        >
          <Home className="h-4 w-4" /> Return to Homepage
        </Link>
      </div>
    </div>
  );
};
