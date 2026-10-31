import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
          <p className="mt-3 text-sm font-medium text-slate-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to user's authorized home dashboard
    const roleRoutes: Record<UserRole, string> = {
      admin: '/admin/dashboard',
      registrar: '/registrar/dashboard',
      teacher: '/teacher/dashboard',
      student: '/student/dashboard',
      parent: '/parents/dashboard',
      guidance: '/guidance/dashboard',
      principal: '/admin/dashboard',
    };
    const defaultRoute = roleRoutes[user.role] || '/login';
    return <Navigate to={defaultRoute} replace />;
  }

  return <>{children}</>;
};
