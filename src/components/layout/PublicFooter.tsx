import React from 'react';
import { MapPin, Mail, Globe, GraduationCap, ShieldCheck } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="border-t border-[#1B2A4A]/20 bg-[#1B2A4A] text-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Motto */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/pictures/logo sa skwelahan.png"
                alt="Logo"
                className="h-12 w-12 rounded-full border border-amber-400/60 object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <h3 className="text-lg font-black text-white tracking-wide">
                  PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL
                </h3>
                <p className="text-xs text-amber-300 font-medium">
                  PLSNHS Enrollment & Academic Information System
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-md">
              A premier public senior high school dedicated to molding competent, values-driven,
              and productive citizens through quality basic education in Academic and TVL tracks.
            </p>

            <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-amber-400">
              <GraduationCap className="h-4 w-4" />
              <span>VIRTUS · EXCELLENTIA · SERVITIUM</span>
            </div>
          </div>

          {/* Col 2: Programs */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              Senior High Strands
            </h4>
            <ul className="mt-4 space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                <span>STEM (Science, Tech, Eng, Math)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                <span>HUMSS (Humanities & Social Sciences)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                <span>GAS (General Academic Strand)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                <span>TVL (Cookery & ICT Specializations)</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">
              Campus Contact
            </h4>
            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Address:</strong> Langtad, City of Naga, Cebu
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  <strong className="text-white">Email Address:</strong>{' '}
                  <a
                    href="mailto:303035@deped.gov.ph"
                    className="text-amber-300 underline hover:text-white transition-colors"
                  >
                    303035@deped.gov.ph
                  </a>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-amber-400 shrink-0" />
                <span>
                  <strong className="text-white">Facebook:</strong>{' '}
                  <a
                    href="https://www.facebook.com/search/top?q=Placido%20L.%20Senor%20303035"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-300 underline hover:text-white transition-colors"
                  >
                    Placido L. Senor 303035
                  </a>
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
                <span>DepEd School ID: 303035</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <p>© {new Date().getFullYear()} Placido L. Señor National High School. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-amber-400 font-semibold">DepEd MATATAG</span>
            <span>·</span>
            <span>PLSNHS Web Portal</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
