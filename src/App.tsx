import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Layouts
import { PublicLayout } from './components/layout/PublicLayout';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Public Pages
import { HomePage } from './pages/public/HomePage';
import { LoginPage } from './pages/public/LoginPage';
import { ForgotPasswordPage } from './pages/public/ForgotPasswordPage';
import { VerifyIdPage } from './pages/public/VerifyIdPage';
import { EnrollmentWizardPage } from './pages/public/EnrollmentWizardPage';

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminAccountsPage } from './pages/admin/AdminAccountsPage';
import { AdminStudentsPage } from './pages/admin/AdminStudentsPage';
import { AdminTeachersPage } from './pages/admin/AdminTeachersPage';
import { AdminEnrollmentsPage } from './pages/admin/AdminEnrollmentsPage';
import { AdminSectionsPage } from './pages/admin/AdminSectionsPage';
import { AdminSubjectsPage } from './pages/admin/AdminSubjectsPage';
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage';
import { AdminLogsPage } from './pages/admin/AdminLogsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminAttendancePage } from './pages/admin/AdminAttendancePage';
import { AdminActivitiesPage } from './pages/admin/AdminActivitiesPage';
import { AdminGenerateIdPage } from './pages/admin/AdminGenerateIdPage';
import { AdminCreateSchedulePage } from './pages/admin/AdminCreateSchedulePage';
import { AdminProfilePage } from './pages/admin/AdminProfilePage';

// Registrar Pages
import { RegistrarDashboardPage } from './pages/registrar/RegistrarDashboardPage';
import { RegistrarRequirementsPage } from './pages/registrar/RegistrarRequirementsPage';

// Teacher Pages
import { TeacherDashboardPage } from './pages/teacher/TeacherDashboardPage';
import { TeacherClassesPage } from './pages/teacher/TeacherClassesPage';
import { TeacherAttendancePage } from './pages/teacher/TeacherAttendancePage';
import { TeacherAttendanceQrPage } from './pages/teacher/TeacherAttendanceQrPage';
import { TeacherGradesPage } from './pages/teacher/TeacherGradesPage';
import { TeacherAssessmentsPage } from './pages/teacher/TeacherAssessmentsPage';
import { TeacherClassProgramPage } from './pages/teacher/TeacherClassProgramPage';

// Student Pages
import { StudentDashboardPage } from './pages/student/StudentDashboardPage';
import { StudentEnrollmentPage } from './pages/student/StudentEnrollmentPage';
import { StudentSchedulePage } from './pages/student/StudentSchedulePage';
import { StudentGradesPage } from './pages/student/StudentGradesPage';
import { StudentAttendancePage } from './pages/student/StudentAttendancePage';
import { StudentAssessmentsPage } from './pages/student/StudentAssessmentsPage';
import { StudentRequirementsPage } from './pages/student/StudentRequirementsPage';
import { StudentViolationsPage } from './pages/student/StudentViolationsPage';
import { StudentEnrollmentHistoryPage } from './pages/student/StudentEnrollmentHistoryPage';
import { StudentProfilePage } from './pages/student/StudentProfilePage';

// Parents Pages
import { ParentsDashboardPage } from './pages/parents/ParentsDashboardPage';
import { ParentsAnnouncementsPage } from './pages/parents/ParentsAnnouncementsPage';

// Guidance Pages
import { GuidanceDashboardPage } from './pages/guidance/GuidanceDashboardPage';
import { GuidanceCounselingPage } from './pages/guidance/GuidanceCounselingPage';
import { GuidanceViolationsPage } from './pages/guidance/GuidanceViolationsPage';

// 404
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/auth/homepage.html" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/login.html" element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/forgot_password.html" element={<Navigate to="/forgot-password" replace />} />
          <Route path="/verify-id" element={<VerifyIdPage />} />
          <Route path="/verify_id.html" element={<Navigate to="/verify-id" replace />} />
          <Route path="/enroll" element={<EnrollmentWizardPage />} />
          <Route path="/student/enrollment.html" element={<Navigate to="/enroll" replace />} />
        </Route>

        {/* Authenticated Dashboard Routes */}
        <Route
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Admin Routes */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard.html" element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'principal']}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/manage_accounts.html" element={<Navigate to="/admin/accounts" replace />} />
          <Route
            path="/admin/accounts"
            element={
              <ProtectedRoute allowedRoles={['admin', 'principal']}>
                <AdminAccountsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/student.html" element={<Navigate to="/admin/students" replace />} />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute allowedRoles={['admin', 'registrar', 'principal']}>
                <AdminStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/teachers.html" element={<Navigate to="/admin/teachers" replace />} />
          <Route
            path="/admin/teachers"
            element={
              <ProtectedRoute allowedRoles={['admin', 'registrar', 'principal']}>
                <AdminTeachersPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/enrollments.html" element={<Navigate to="/admin/enrollments" replace />} />
          <Route
            path="/admin/enrollments"
            element={
              <ProtectedRoute allowedRoles={['admin', 'registrar', 'principal']}>
                <AdminEnrollmentsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/requirements.html" element={<Navigate to="/admin/requirements" replace />} />
          <Route
            path="/admin/requirements"
            element={
              <ProtectedRoute allowedRoles={['admin', 'registrar', 'principal']}>
                <RegistrarRequirementsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/sections.html" element={<Navigate to="/admin/sections" replace />} />
          <Route
            path="/admin/sections"
            element={
              <ProtectedRoute allowedRoles={['admin', 'registrar', 'principal']}>
                <AdminSectionsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/subjects.html" element={<Navigate to="/admin/subjects" replace />} />
          <Route
            path="/admin/subjects"
            element={
              <ProtectedRoute allowedRoles={['admin', 'principal']}>
                <AdminSubjectsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/attendance.html" element={<Navigate to="/admin/attendance" replace />} />
          <Route
            path="/admin/attendance"
            element={
              <ProtectedRoute allowedRoles={['admin', 'principal']}>
                <AdminAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/activities.html" element={<Navigate to="/admin/activities" replace />} />
          <Route
            path="/admin/activities"
            element={
              <ProtectedRoute allowedRoles={['admin', 'principal']}>
                <AdminActivitiesPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/generate_id.html" element={<Navigate to="/admin/generate-id" replace />} />
          <Route
            path="/admin/generate-id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'registrar', 'principal']}>
                <AdminGenerateIdPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/create_schedule.html" element={<Navigate to="/admin/create-schedule" replace />} />
          <Route
            path="/admin/create-schedule"
            element={
              <ProtectedRoute allowedRoles={['admin', 'principal']}>
                <AdminCreateSchedulePage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/guidance_violations.html" element={<Navigate to="/admin/guidance-violations" replace />} />
          <Route
            path="/admin/guidance-violations"
            element={
              <ProtectedRoute allowedRoles={['admin', 'guidance', 'principal']}>
                <GuidanceViolationsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/announcements.html" element={<Navigate to="/admin/announcements" replace />} />
          <Route
            path="/admin/announcements"
            element={
              <ProtectedRoute allowedRoles={['admin', 'principal']}>
                <AdminAnnouncementsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/logs.html" element={<Navigate to="/admin/logs" replace />} />
          <Route
            path="/admin/logs"
            element={
              <ProtectedRoute allowedRoles={['admin', 'principal']}>
                <AdminLogsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/reports.html" element={<Navigate to="/admin/reports" replace />} />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'registrar', 'principal']}>
                <AdminReportsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/profile.html" element={<Navigate to="/admin/profile" replace />} />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute allowedRoles={['admin', 'principal']}>
                <AdminProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Registrar Routes */}
          <Route path="/registrar" element={<Navigate to="/registrar/dashboard" replace />} />
          <Route path="/registrar/dashboard.html" element={<Navigate to="/registrar/dashboard" replace />} />
          <Route
            path="/registrar/dashboard"
            element={
              <ProtectedRoute allowedRoles={['registrar', 'admin']}>
                <RegistrarDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/registrar/enrollments.html" element={<Navigate to="/registrar/enrollments" replace />} />
          <Route
            path="/registrar/enrollments"
            element={
              <ProtectedRoute allowedRoles={['registrar', 'admin']}>
                <AdminEnrollmentsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/registrar/students.html" element={<Navigate to="/registrar/students" replace />} />
          <Route
            path="/registrar/students"
            element={
              <ProtectedRoute allowedRoles={['registrar', 'admin']}>
                <AdminStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/registrar/teachers.html" element={<Navigate to="/registrar/teachers" replace />} />
          <Route
            path="/registrar/teachers"
            element={
              <ProtectedRoute allowedRoles={['registrar', 'admin', 'principal']}>
                <AdminTeachersPage />
              </ProtectedRoute>
            }
          />
          <Route path="/registrar/requirements.html" element={<Navigate to="/registrar/requirements" replace />} />
          <Route
            path="/registrar/requirements"
            element={
              <ProtectedRoute allowedRoles={['registrar', 'admin']}>
                <RegistrarRequirementsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/registrar/sections.html" element={<Navigate to="/registrar/sections" replace />} />
          <Route
            path="/registrar/sections"
            element={
              <ProtectedRoute allowedRoles={['registrar', 'admin']}>
                <AdminSectionsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/registrar/generate_id.html" element={<Navigate to="/registrar/generate-id" replace />} />
          <Route
            path="/registrar/generate-id"
            element={
              <ProtectedRoute allowedRoles={['registrar', 'admin']}>
                <AdminGenerateIdPage />
              </ProtectedRoute>
            }
          />
          <Route path="/registrar/reports.html" element={<Navigate to="/registrar/reports" replace />} />
          <Route
            path="/registrar/reports"
            element={
              <ProtectedRoute allowedRoles={['registrar', 'admin']}>
                <AdminReportsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/registrar/profile.html" element={<Navigate to="/registrar/profile" replace />} />
          <Route
            path="/registrar/profile"
            element={
              <ProtectedRoute allowedRoles={['registrar', 'admin']}>
                <AdminProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Teacher Routes */}
          <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
          <Route path="/teacher/dashboard.html" element={<Navigate to="/teacher/dashboard" replace />} />
          <Route
            path="/teacher/dashboard"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <TeacherDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/teacher/classes.html" element={<Navigate to="/teacher/classes" replace />} />
          <Route
            path="/teacher/classes"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <TeacherClassesPage />
              </ProtectedRoute>
            }
          />
          <Route path="/teacher/student-attendance.html" element={<Navigate to="/teacher/attendance" replace />} />
          <Route path="/teacher/attendance-qr.html" element={<Navigate to="/teacher/attendance" replace />} />
          <Route path="/teacher/attendance-face.html" element={<Navigate to="/teacher/attendance" replace />} />
          <Route path="/teacher/attendance-qr" element={<Navigate to="/teacher/attendance" replace />} />
          <Route
            path="/teacher/attendance"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <TeacherAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route path="/teacher/grades.html" element={<Navigate to="/teacher/grades" replace />} />
          <Route
            path="/teacher/grades"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <TeacherGradesPage />
              </ProtectedRoute>
            }
          />
          <Route path="/teacher/assessments.html" element={<Navigate to="/teacher/assessments" replace />} />
          <Route
            path="/teacher/assessments"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <TeacherAssessmentsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/teacher/class-program.html" element={<Navigate to="/teacher/class-program" replace />} />
          <Route path="/teacher/teacher-load.html" element={<Navigate to="/teacher/class-program" replace />} />
          <Route
            path="/teacher/class-program"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <TeacherClassProgramPage />
              </ProtectedRoute>
            }
          />
          <Route path="/teacher/profile.html" element={<Navigate to="/teacher/profile" replace />} />
          <Route
            path="/teacher/profile"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <AdminProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Student Routes */}
          <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
          <Route path="/student/dashboard.html" element={<Navigate to="/student/dashboard" replace />} />
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/enrollment"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentEnrollmentPage />
              </ProtectedRoute>
            }
          />
          <Route path="/student/schedule.html" element={<Navigate to="/student/schedule" replace />} />
          <Route
            path="/student/schedule"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentSchedulePage />
              </ProtectedRoute>
            }
          />
          <Route path="/student/grades.html" element={<Navigate to="/student/grades" replace />} />
          <Route
            path="/student/grades"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentGradesPage />
              </ProtectedRoute>
            }
          />
          <Route path="/student/attendance.html" element={<Navigate to="/student/attendance" replace />} />
          <Route
            path="/student/attendance"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route path="/student/assessments.html" element={<Navigate to="/student/assessments" replace />} />
          <Route
            path="/student/assessments"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentAssessmentsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/student/requirements.html" element={<Navigate to="/student/requirements" replace />} />
          <Route
            path="/student/requirements"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentRequirementsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/student/violations.html" element={<Navigate to="/student/violations" replace />} />
          <Route
            path="/student/violations"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentViolationsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/student/enrollment_history.html" element={<Navigate to="/student/enrollment-history" replace />} />
          <Route
            path="/student/enrollment-history"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentEnrollmentHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route path="/student/profile.html" element={<Navigate to="/student/profile" replace />} />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Parents Routes */}
          <Route path="/parents" element={<Navigate to="/parents/dashboard" replace />} />
          <Route path="/parents/dashboard.html" element={<Navigate to="/parents/dashboard" replace />} />
          <Route
            path="/parents/dashboard"
            element={
              <ProtectedRoute allowedRoles={['parent', 'admin']}>
                <ParentsDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/parents/grades.html" element={<Navigate to="/parents/grades" replace />} />
          <Route
            path="/parents/grades"
            element={
              <ProtectedRoute allowedRoles={['parent', 'admin']}>
                <StudentGradesPage />
              </ProtectedRoute>
            }
          />
          <Route path="/parents/attendance.html" element={<Navigate to="/parents/attendance" replace />} />
          <Route
            path="/parents/attendance"
            element={
              <ProtectedRoute allowedRoles={['parent', 'admin']}>
                <StudentAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route path="/parents/announcements.html" element={<Navigate to="/parents/announcements" replace />} />
          <Route
            path="/parents/announcements"
            element={
              <ProtectedRoute allowedRoles={['parent', 'admin']}>
                <ParentsAnnouncementsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/parents/profile.html" element={<Navigate to="/parents/profile" replace />} />
          <Route
            path="/parents/profile"
            element={
              <ProtectedRoute allowedRoles={['parent', 'admin']}>
                <AdminProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Guidance Routes */}
          <Route path="/guidance" element={<Navigate to="/guidance/dashboard" replace />} />
          <Route path="/guidance/dashboard.html" element={<Navigate to="/guidance/dashboard" replace />} />
          <Route
            path="/guidance/dashboard"
            element={
              <ProtectedRoute allowedRoles={['guidance', 'admin']}>
                <GuidanceDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/guidance/violations.html" element={<Navigate to="/guidance/violations" replace />} />
          <Route path="/guidance/add_violation.html" element={<Navigate to="/guidance/violations" replace />} />
          <Route
            path="/guidance/violations"
            element={
              <ProtectedRoute allowedRoles={['guidance', 'admin']}>
                <GuidanceViolationsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/guidance/counseling.html" element={<Navigate to="/guidance/counseling" replace />} />
          <Route
            path="/guidance/counseling"
            element={
              <ProtectedRoute allowedRoles={['guidance', 'admin']}>
                <GuidanceCounselingPage />
              </ProtectedRoute>
            }
          />
          <Route path="/guidance/students.html" element={<Navigate to="/guidance/students" replace />} />
          <Route
            path="/guidance/students"
            element={
              <ProtectedRoute allowedRoles={['guidance', 'admin']}>
                <AdminStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/guidance/reports.html" element={<Navigate to="/guidance/reports" replace />} />
          <Route
            path="/guidance/reports"
            element={
              <ProtectedRoute allowedRoles={['guidance', 'admin']}>
                <AdminReportsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/guidance/profile.html" element={<Navigate to="/guidance/profile" replace />} />
          <Route
            path="/guidance/profile"
            element={
              <ProtectedRoute allowedRoles={['guidance', 'admin']}>
                <AdminProfilePage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Fallback 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
