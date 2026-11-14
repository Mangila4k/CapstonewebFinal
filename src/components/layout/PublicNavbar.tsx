import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn } from 'lucide-react';

export const PublicNavbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('Home');
  const location = useLocation();
  const navigate = useNavigate();

  const navLinks = [
    { name: 'Home', path: '/', targetId: '' },
    { name: 'Activities', path: '/#activities', targetId: 'activities' },
    { name: 'Features', path: '/#features', targetId: 'features' },
    { name: 'About', path: '/#about', targetId: 'about' },
  ];

  // Scroll spy to update active section when scrolling on homepage
  useEffect(() => {
    if (location.pathname !== '/') {
      setActiveSection('');
      return;
    }

    const handleScroll = () => {
      const scrollPos = window.scrollY + 140;
      const activitiesEl = document.getElementById('activities');
      const featuresEl = document.getElementById('features');
      const aboutEl = document.getElementById('about');

      if (aboutEl && scrollPos >= aboutEl.offsetTop) {
        setActiveSection('About');
      } else if (featuresEl && scrollPos >= featuresEl.offsetTop) {
        setActiveSection('Features');
      } else if (activitiesEl && scrollPos >= activitiesEl.offsetTop) {
        setActiveSection('Activities');
      } else {
        setActiveSection('Home');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  // Handle hash scrolling if navigating with hash
  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const el = document.getElementById(targetId);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [location.pathname, location.hash]);

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    item: { name: string; path: string; targetId: string }
  ) => {
    e.preventDefault();
    setIsOpen(false);

    if (item.targetId) {
      if (location.pathname === '/') {
        const el = document.getElementById(item.targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          window.history.pushState(null, '', `#${item.targetId}`);
          setActiveSection(item.name);
        }
      } else {
        navigate(`/#${item.targetId}`);
      }
    } else if (item.path === '/') {
      if (location.pathname === '/') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.history.pushState(null, '', '/');
        setActiveSection('Home');
      } else {
        navigate('/');
      }
    } else {
      navigate(item.path);
    }
  };

  const hideNavLinks =
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/forgot-password') ||
    location.pathname.startsWith('/enroll');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#1B2A4A] shadow-md backdrop-blur-md">
      <div className="w-full flex items-center justify-between px-4 sm:px-6 lg:px-10 h-20">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="h-11 w-11 rounded-full overflow-hidden bg-white p-0.5 shadow-md flex items-center justify-center shrink-0 border border-amber-400/40">
            <img
              src="/pictures/logo sa skwelahan.png"
              alt="PLSNHS Logo"
              className="h-full w-full rounded-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/pictures/logo sa skwelahan.jpg';
              }}
            />
          </div>
          <div className="flex flex-col text-left">
            <div className="text-xl font-extrabold tracking-tight text-white font-display leading-tight">
              PLS<span className="text-[#facc15]">NHS</span>
            </div>
            <p className="text-[11px] font-medium text-slate-300 tracking-wide">
              Placido L. Señor National High School
            </p>
          </div>
        </Link>

        {!hideNavLinks && (
          <>
            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
              {navLinks.map((item) => {
                const isActive = activeSection === item.name;
                return (
                  <a
                    key={item.name}
                    href={item.path}
                    onClick={(e) => handleNavClick(e, item)}
                    className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'text-[#facc15] bg-[#223356] border border-[#facc15]/30 shadow-xs'
                        : 'text-slate-200 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {item.name}
                  </a>
                );
              })}
            </nav>

            {/* Action Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/login"
                className="flex items-center gap-1.5 rounded-lg bg-[#facc15] hover:bg-[#eab308] px-5 py-2 text-xs font-extrabold text-[#0b2b4a] shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <LogIn className="h-4 w-4 stroke-[2.5]" />
                <span className="font-extrabold">Login</span>
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden rounded-lg p-2 text-slate-200 hover:bg-white/10 focus:outline-hidden"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </>
        )}
      </div>

      {/* Mobile Drawer */}
      {!hideNavLinks && isOpen && (
        <div className="md:hidden border-b border-white/10 bg-[#16223f] px-4 pt-3 pb-6 space-y-2 animate-fade-in shadow-xl text-white">
          {navLinks.map((item) => {
            const isActive = activeSection === item.name;
            return (
              <a
                key={item.name}
                href={item.path}
                onClick={(e) => handleNavClick(e, item)}
                className={`block rounded-lg px-3 py-2 text-base font-semibold cursor-pointer transition-colors ${
                  isActive
                    ? 'text-[#facc15] bg-[#223356] border border-[#facc15]/30'
                    : 'text-slate-200 hover:bg-white/10 hover:text-white'
                }`}
              >
                {item.name}
              </a>
            );
          })}
          <div className="pt-4 border-t border-white/10 space-y-2">
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#facc15] py-2.5 text-sm font-extrabold text-[#0b2b4a]"
            >
              <LogIn className="h-4 w-4 stroke-[2.5]" />
              <span className="font-extrabold">Login</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
