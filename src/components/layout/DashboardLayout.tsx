import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  Gauge,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Layers,
  FileText,
  Megaphone,
  Bell,
  LogOut,
  Menu,
  X,
  UserCheck,
  ShieldAlert,
  QrCode,
  Award,
  History,
  FileCheck,
  Clock,
  Camera,
  Scale,
  UserCog,
  BarChart3,
  User,
  Shield,
  FileSignature,
  CalendarCheck,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Chatbot } from '../common/Chatbot';
import { NotificationCenter } from '../common/NotificationCenter';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  isLogout?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Nav sections per role
  const getNavSections = (): NavSection[] => {
    const role = user?.role || 'student';

    switch (role) {
      case 'admin':
      case 'principal':
        return [
          {
            title: 'MAIN MENU',
            items: [
              { name: 'Dashboard', path: '/admin/dashboard', icon: Gauge },
              { name: 'Students', path: '/admin/students', icon: GraduationCap },
              { name: 'Generate ID', path: '/admin/generate-id', icon: CreditCard },
              { name: 'Teachers', path: '/admin/teachers', icon: Users },
              { name: 'Sections', path: '/admin/sections', icon: Layers },
              { name: 'Subjects', path: '/admin/subjects', icon: BookOpen },
              { name: 'Enrollments', path: '/admin/enrollments', icon: FileSignature },
              { name: 'Requirements', path: '/admin/requirements', icon: FileCheck },
            ],
          },
          {
            title: 'COMMUNICATION & MANAGEMENT',
            items: [
              { name: 'Announcements', path: '/admin/announcements', icon: Megaphone },
              { name: 'School Activities', path: '/admin/activities', icon: Calendar },
              { name: 'Guidance & Violations', path: '/admin/guidance-violations', icon: Scale },
              { name: 'Accounts', path: '/admin/accounts', icon: UserCog },
              { name: 'Teacher Attendance', path: '/admin/attendance', icon: CalendarCheck },
                            { name: 'Logs', path: '/admin/logs', icon: History },
              { name: 'Reports', path: '/admin/reports', icon: BarChart3 },
            ],
          },
          {
            title: 'ACCOUNT',
            items: [
              { name: 'Profile', path: '/admin/profile', icon: User },
              { name: 'Logout', path: '#logout', icon: LogOut, isLogout: true },
            ],
          },
        ];

      case 'registrar':
        return [
          {
            title: 'MAIN MENU',
            items: [
              { name: 'Dashboard', path: '/registrar/dashboard', icon: Gauge },
              { name: 'Enrollments', path: '/registrar/enrollments', icon: FileSignature },
              { name: 'Students', path: '/registrar/students', icon: GraduationCap },
              { name: 'Teachers', path: '/registrar/teachers', icon: Users },
              { name: 'Requirements', path: '/registrar/requirements', icon: FileCheck },
              { name: 'Sections', path: '/registrar/sections', icon: Layers },
            ],
          },
          {
            title: 'COMMUNICATION & MANAGEMENT',
            items: [
              { name: 'Generate ID', path: '/registrar/generate-id', icon: Award },
              { name: 'Reports', path: '/registrar/reports', icon: BarChart3 },
            ],
          },
          {
            title: 'ACCOUNT',
            items: [
              { name: 'Profile', path: '/registrar/profile', icon: User },
              { name: 'Logout', path: '#logout', icon: LogOut, isLogout: true },
            ],
          },
        ];

      case 'teacher':
        return [
          {
            title: 'MAIN MENU',
            items: [
              { name: 'Dashboard', path: '/teacher/dashboard', icon: Gauge },
              { name: 'My Classes', path: '/teacher/classes', icon: Layers },
              { name: 'Attendance', path: '/teacher/attendance', icon: CalendarCheck },
            ],
          },
          {
            title: 'ACADEMICS',
            items: [
              { name: 'Grades', path: '/teacher/grades', icon: FileText },
              { name: 'Assessments', path: '/teacher/assessments', icon: BookOpen },
              { name: 'Class Program', path: '/teacher/class-program', icon: Clock },
            ],
          },
          {
            title: 'ACCOUNT',
            items: [
              { name: 'Profile', path: '/teacher/profile', icon: User },
              { name: 'Logout', path: '#logout', icon: LogOut, isLogout: true },
            ],
          },
        ];

      case 'student':
        return [
          {
            title: 'MAIN MENU',
            items: [
              { name: 'Dashboard', path: '/student/dashboard', icon: Gauge },
              { name: 'Enrollment', path: '/student/enrollment', icon: FileSignature },
              { name: 'Schedule', path: '/student/schedule', icon: Calendar },
              { name: 'Grades', path: '/student/grades', icon: FileText },
            ],
          },
          {
            title: 'ACADEMIC SERVICES',
            items: [
              { name: 'Attendance', path: '/student/attendance', icon: CalendarCheck },
              { name: 'Assessments', path: '/student/assessments', icon: BookOpen },
              { name: 'Requirements', path: '/student/requirements', icon: FileCheck },
              { name: 'Violations', path: '/student/violations', icon: ShieldAlert },
              { name: 'Enrollment History', path: '/student/enrollment-history', icon: History },
            ],
          },
          {
            title: 'ACCOUNT',
            items: [
              { name: 'Profile', path: '/student/profile', icon: User },
              { name: 'Logout', path: '#logout', icon: LogOut, isLogout: true },
            ],
          },
        ];

      case 'parent':
        return [
          {
            title: 'MAIN MENU',
            items: [
              { name: 'Dashboard', path: '/parents/dashboard', icon: Gauge },
              { name: 'Child Grades', path: '/parents/grades', icon: FileText },
              { name: 'Attendance', path: '/parents/attendance', icon: CalendarCheck },
            ],
          },
          {
            title: 'COMMUNICATION',
            items: [
              { name: 'Announcements', path: '/parents/announcements', icon: Megaphone },
            ],
          },
          {
            title: 'ACCOUNT',
            items: [
              { name: 'Profile', path: '/parents/profile', icon: User },
              { name: 'Logout', path: '#logout', icon: LogOut, isLogout: true },
            ],
          },
        ];

      case 'guidance':
        return [
          {
            title: 'MAIN MENU',
            items: [
              { name: 'Dashboard', path: '/guidance/dashboard', icon: Gauge },
              { name: 'Guidance & Violations', path: '/guidance/violations', icon: Scale },
              { name: 'Counseling', path: '/guidance/counseling', icon: Users },
              { name: 'Students', path: '/guidance/students', icon: GraduationCap },
            ],
          },
          {
            title: 'REPORTS',
            items: [
              { name: 'Reports', path: '/guidance/reports', icon: BarChart3 },
            ],
          },
          {
            title: 'ACCOUNT',
            items: [
              { name: 'Profile', path: '/guidance/profile', icon: User },
              { name: 'Logout', path: '#logout', icon: LogOut, isLogout: true },
            ],
          },
        ];

      default:
        return [
          {
            title: 'MAIN MENU',
            items: [{ name: 'Dashboard', path: `/${role}/dashboard`, icon: Gauge }],
          },
          {
            title: 'ACCOUNT',
            items: [
              { name: 'Profile', path: `/${role}/profile`, icon: User },
              { name: 'Logout', path: '#logout', icon: LogOut, isLogout: true },
            ],
          },
        ];
    }
  };

  const navSections = getNavSections();

  // Determine Junior High (Grades 7-10) vs Senior High (Grades 11-12) for students
  const getStudentLevelTitle = () => {
    const rawGrade = String(user?.student_grade || '').trim();
    const numMatch = rawGrade.match(/\d+/);
    if (numMatch) {
      const gradeNum = parseInt(numMatch[0], 10);
      if (gradeNum >= 7 && gradeNum <= 10) return 'Junior High';
      if (gradeNum >= 11 && gradeNum <= 12) return 'Senior High';
    }
    if (rawGrade.toLowerCase().includes('junior')) return 'Junior High';
    if (rawGrade.toLowerCase().includes('senior')) return 'Senior High';
    return 'Junior High';
  };

  // Role title mappings
  const roleLabels: Record<string, string> = {
    admin: 'Administrator',
    principal: 'Administrator',
    registrar: 'Registrar Officer',
    teacher: 'Faculty Teacher',
    student: getStudentLevelTitle(),
    parent: 'Parent / Guardian',
    guidance: 'Guidance Counselor',
  };

  const roleTitle = roleLabels[user?.role || 'student'] || 'Portal User';

  // Display Name
  const displayName =
    user?.full_name ||
    (user?.first_name || user?.last_name
      ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
      : user?.email?.split('@')[0] || 'User');

  // Avatar Initials
  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user?.full_name) {
      const parts = user.full_name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return user.full_name.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'JM';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-[#1B2A4A] text-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="px-3.5 pt-4 pb-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/pictures/logo sa skwelahan.png"
                alt="School Logo"
                className="h-10 w-10 rounded-full object-cover border border-white/30 shrink-0 shadow-sm"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="min-w-0">
                <h1 className="text-xl font-black tracking-tight text-white leading-none">
                  PLS<span className="text-[#FBBF24]">NHS</span>
                </h1>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden rounded-lg p-1 text-slate-300 hover:bg-white/10 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-2 text-[11px] font-normal text-slate-300/90 leading-tight">
            Placido L. Señor National High School
          </div>
        </div>

        {/* Scrollable Nav Menu */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-3 space-y-3.5 sidebar-nav-scroll">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-[0.4px] text-[#8A99AD] mb-1 select-none whitespace-nowrap">
                {section.title}
              </div>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  if (item.isLogout) {
                    return (
                      <li key={item.name}>
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium text-slate-300 hover:text-white hover:bg-white/8 transition-colors cursor-pointer text-left"
                        >
                          <span className="w-5 h-5 flex items-center justify-center shrink-0">
                            <Icon className="h-[18px] w-[18px] shrink-0 text-slate-300" />
                          </span>
                          <span className="truncate">{item.name}</span>
                        </button>
                      </li>
                    );
                  }

                  return (
                    <li key={item.name}>
                      <Link
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition-colors ${
                          isActive
                            ? 'bg-white/16 text-white font-semibold'
                            : 'text-slate-300 hover:text-white hover:bg-white/8 font-medium'
                        }`}
                      >
                        <span className="w-5 h-5 flex items-center justify-center shrink-0">
                          <Icon
                            className={`h-[18px] w-[18px] shrink-0 ${
                              isActive ? 'text-white' : 'text-slate-300'
                            }`}
                          />
                        </span>
                        <span className="truncate">{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Pinned User Profile Card at Bottom */}
        <div className="mt-auto shrink-0 p-3.5 border-t border-white/10 bg-[#142238]/60">
          <div className="rounded-xl border border-white/12 bg-white/5 px-3 py-2.5 flex items-center gap-3">
            {/* Avatar Circle with Initials and Online Dot */}
            <div className="relative shrink-0">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={displayName}
                  className="h-10 w-10 rounded-full object-cover border border-[#FACC15]"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-[#FACC15] flex items-center justify-center text-[#0b2b4a] font-extrabold text-sm tracking-tight select-none">
                  {getInitials()}
                </div>
              )}
              <span
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#10b981] border-2 border-[#152238]"
                title="Online"
              />
            </div>

            {/* User Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white leading-tight">
                {displayName}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 truncate">
                <Shield className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate">{roleTitle}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Sidebar Toggle Bar (hidden on desktop) */}
        <header className="flex lg:hidden h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-sm font-extrabold text-[#1B2A4A]">PLSNHS Portal</span>
          <div className="w-10" />
        </header>

        {/* Dashboard Content Body */}
        <main className="flex-1 overflow-y-auto px-4 pt-5 pb-6 sm:px-6 lg:px-8 bg-slate-50/70">
          <NotificationCenter />
          <Outlet />
        </main>
      </div>

      <Chatbot />
    </div>
  );
};

export default DashboardLayout;
