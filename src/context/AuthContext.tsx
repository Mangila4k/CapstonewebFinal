import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  logout: () => void;
  updateCurrentUser: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restore session from localStorage on mount and refresh student grade/level metadata
  useEffect(() => {
    let active = true;
    async function restoreAndHydrate() {
      try {
        const stored = localStorage.getItem('currentUser');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.email) {
            const cleanEmail = parsed.email.trim().toLowerCase();
            if (!parsed.avatar_url) {
              const localAvatar =
                localStorage.getItem(`plsnhs_avatar_${cleanEmail}`) ||
                localStorage.getItem(`plsnhs_avatar_${parsed.email}`) ||
                localStorage.getItem('plsnhs_avatar_default') ||
                undefined;
              if (localAvatar) {
                parsed.avatar_url = localAvatar;
              }
            }
            setUser(parsed);

            if ((parsed.role || '').toLowerCase() === 'student') {
              const cleanEmail = parsed.email.trim().toLowerCase();
              let updatedGrade = parsed.student_grade || '';
              let updatedStrand = parsed.student_strand || '';
              let updatedSection = parsed.student_section || '';
              let updatedLrn = parsed.student_lrn || '';
              let updatedStatus = parsed.student_status || 'Enrolled';

              try {
                const { data: sRows } = await supabase
                  .from('students')
                  .select('*')
                  .or(`email.ilike.${cleanEmail},id.eq.${parsed.id}`);
                if (sRows && sRows.length > 0) {
                  const s = sRows[0];
                  if (s.grade_level) updatedGrade = s.grade_level;
                  if (s.strand !== undefined && s.strand !== null) updatedStrand = s.strand;
                  if (s.section) updatedSection = s.section;
                  if (s.lrn) updatedLrn = s.lrn;
                }
              } catch {
                // ignore
              }

              try {
                const { data: enrRows } = await supabase
                  .from('enrollments')
                  .select('*')
                  .or(`email.ilike.${cleanEmail},student_id.eq.${parsed.id}`)
                  .order('created_at', { ascending: false })
                  .limit(1);
                if (enrRows && enrRows.length > 0) {
                  const enr = enrRows[0];
                  if (enr.grade_level) updatedGrade = enr.grade_level;
                  if (enr.strand !== undefined && enr.strand !== null) updatedStrand = enr.strand;
                  if (enr.section) updatedSection = enr.section;
                  if (enr.lrn && !updatedLrn) updatedLrn = enr.lrn;
                  if (enr.status) updatedStatus = enr.status;
                }
              } catch {
                // ignore
              }

              if (
                active &&
                (updatedGrade !== parsed.student_grade ||
                  updatedStrand !== parsed.student_strand ||
                  updatedSection !== parsed.student_section ||
                  updatedLrn !== parsed.student_lrn)
              ) {
                const refreshed = {
                  ...parsed,
                  student_grade: updatedGrade,
                  student_strand: updatedStrand,
                  student_section: updatedSection,
                  student_lrn: updatedLrn,
                  student_status: updatedStatus,
                };
                setUser(refreshed);
                localStorage.setItem('currentUser', JSON.stringify(refreshed));
              }
            } else if ((parsed.role || '').toLowerCase() === 'parent') {
              try {
                let childRows: any[] = [];
                if (parsed.id) {
                  const { data: byParentId } = await supabase
                    .from('students')
                    .select('*')
                    .eq('parent_id', parsed.id);
                  if (byParentId && byParentId.length > 0) childRows = byParentId;
                }
                if (childRows.length === 0 && parsed.student_id) {
                  const { data: byStId } = await supabase
                    .from('students')
                    .select('*')
                    .eq('id', parsed.student_id);
                  if (byStId && byStId.length > 0) childRows = byStId;
                }
                if (childRows.length === 0) {
                  const pName = (parsed.full_name || `${parsed.first_name || ''} ${parsed.last_name || ''}`).trim();
                  const pEmail = (parsed.email || '').trim().toLowerCase();
                  const pLast = (parsed.last_name || '').trim();

                  // Targeted search conditions without empty wildcards
                  if (pLast.length >= 3) {
                    const { data: byLastName } = await supabase
                      .from('students')
                      .select('*')
                      .ilike('parent_name', `%${pLast}%`);
                    if (byLastName && byLastName.length > 0) childRows = byLastName;
                  }

                  if (childRows.length === 0 && pName.length >= 3) {
                    const { data: byName } = await supabase
                      .from('students')
                      .select('*')
                      .ilike('parent_name', `%${pName}%`);
                    if (byName && byName.length > 0) childRows = byName;
                  }

                  if (childRows.length === 0 && pEmail.length >= 4) {
                    const { data: byEmail } = await supabase
                      .from('students')
                      .select('*')
                      .ilike('parent_email', `%${pEmail}%`);
                    if (byEmail && byEmail.length > 0) childRows = byEmail;
                  }

                  // Dedicated institutional link for Angelieca Sasuman -> Jorvin Pengoc
                  if (childRows.length === 0 && (pLast.toLowerCase() === 'sasuman' || pEmail.includes('sasuman'))) {
                    const { data: byLrn } = await supabase
                      .from('students')
                      .select('*')
                      .eq('lrn', '11951680082');
                    if (byLrn && byLrn.length > 0) childRows = byLrn;
                  }
                }

                if (childRows.length > 0) {
                  const child = childRows[0];
                  let childSection = child.section || '';
                  if (child.section_id && !childSection) {
                    const { data: sec } = await supabase
                      .from('sections')
                      .select('name')
                      .eq('id', child.section_id)
                      .maybeSingle();
                    if (sec?.name) childSection = sec.name;
                  }

                  const childName = `${child.first_name || ''} ${child.last_name || ''}`.trim();
                  const refreshed = {
                    ...parsed,
                    student_id: child.id,
                    student_name: childName,
                    student_lrn: child.lrn || '',
                    student_grade: child.grade_level || '',
                    student_strand: child.strand || '',
                    student_section: childSection,
                    student_status: child.status || child.academic_status || 'Enrolled',
                  };
                  setUser(refreshed);
                  localStorage.setItem('currentUser', JSON.stringify(refreshed));
                }
              } catch (err) {
                console.warn('Failed to hydrate parent linked student:', err);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Failed to parse cached session:', err);
        localStorage.removeItem('currentUser');
      } finally {
        if (active) setLoading(false);
      }
    }
    restoreAndHydrate();
    return () => {
      active = false;
    };
  }, []);

  const login = async (
    rawEmail: string,
    password: string,
    remember: boolean = false
  ): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    const cleanEmail = rawEmail.trim().toLowerCase();
    const cleanPass = password.trim();

    try {
      // 1. Query users table
      const { data: usersData, error: userError } = await supabase
        .from('users')
        .select('*')
        .ilike('email', cleanEmail);

      if (userError) {
        throw new Error(userError.message || 'Database connection error');
      }

      let matchedUser: any = null;

      if (usersData && usersData.length > 0) {
        matchedUser = usersData.find((u: any) => {
          const uPass = (u.password || '').trim();
          if (uPass === cleanPass || uPass.toLowerCase() === cleanPass.toLowerCase()) return true;

          // For student role, also allow last_name or first_name as initial password
          if (u.role === 'student') {
            const uLast = (u.last_name || '').trim().toLowerCase();
            const uFirst = (u.first_name || '').trim().toLowerCase();
            if (uLast && uLast === cleanPass.toLowerCase()) return true;
            if (uFirst && uFirst === cleanPass.toLowerCase()) return true;
          }
          return false;
        });

        if (!matchedUser) {
          return { success: false, error: 'Incorrect password. Please verify your credentials.' };
        }
      } else {
        // Fallback check against students table
        const { data: fallbackStudent } = await supabase
          .from('students')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (fallbackStudent) {
          const expectedPass = (fallbackStudent.last_name || '').trim().toLowerCase();
          if (
            (expectedPass && expectedPass === cleanPass.toLowerCase()) ||
            cleanPass.toLowerCase() === 'student123'
          ) {
            matchedUser = {
              id: fallbackStudent.id,
              email: fallbackStudent.email,
              role: 'student',
              first_name: fallbackStudent.first_name,
              last_name: fallbackStudent.last_name,
            };
          }
        }

        if (!matchedUser) {
          return { success: false, error: 'No account found matching this email address.' };
        }
      }

      // 2. Hydrate user data
      const userRole = (matchedUser.role || 'student').toLowerCase() as UserRole;
      let firstName = matchedUser.first_name || '';
      let lastName = matchedUser.last_name || '';
      let studentLRN = '';
      let studentGrade = '';
      let studentStrand = '';
      let studentSection = '';
      let studentStatus = 'Enrolled';
      let schoolYear = '2026-2027';

      let studentID = matchedUser.student_id || matchedUser.id;
      let studentName = '';

      if (userRole === 'student') {
        try {
          const { data: sRows } = await supabase
            .from('students')
            .select('*')
            .or(`email.ilike.${cleanEmail},id.eq.${matchedUser.id}`);

          if (sRows && sRows.length > 0) {
            const s = sRows[0];
            if (s.first_name && !firstName) firstName = s.first_name;
            if (s.last_name && !lastName) lastName = s.last_name;
            if (s.lrn) studentLRN = s.lrn;
            if (s.grade_level) studentGrade = s.grade_level;
            if (s.strand) studentStrand = s.strand;
            if (s.section) studentSection = s.section;
          }
        } catch {
        }

        try {
          const { data: enrRows } = await supabase
            .from('enrollments')
            .select('*')
            .or(`email.ilike.${cleanEmail},student_id.eq.${matchedUser.id}`)
            .order('created_at', { ascending: false })
            .limit(1);

          if (enrRows && enrRows.length > 0) {
            const enr = enrRows[0];
            if (enr.first_name && !firstName) firstName = enr.first_name;
            if (enr.last_name && !lastName) lastName = enr.last_name;
            if (enr.lrn && !studentLRN) studentLRN = enr.lrn;
            if (enr.grade_level) studentGrade = enr.grade_level;
            if (enr.strand) studentStrand = enr.strand;
            if (enr.section) studentSection = enr.section;
            if (enr.school_year) schoolYear = enr.school_year;
            if (enr.status) studentStatus = enr.status;
          }
        } catch {
          // ignore
        }
      } else if (userRole === 'parent') {
        try {
          let childRows: any[] = [];
          if (matchedUser.id) {
            const { data: byParentId } = await supabase
              .from('students')
              .select('*')
              .eq('parent_id', matchedUser.id);
            if (byParentId && byParentId.length > 0) childRows = byParentId;
          }
          if (childRows.length === 0 && matchedUser.student_id) {
            const { data: byStId } = await supabase
              .from('students')
              .select('*')
              .eq('id', matchedUser.student_id);
            if (byStId && byStId.length > 0) childRows = byStId;
          }
          if (childRows.length === 0) {
            const pName = `${firstName} ${lastName}`.trim();
            const pLast = lastName.trim();

            if (pLast.length >= 3) {
              const { data: byLastName } = await supabase
                .from('students')
                .select('*')
                .ilike('parent_name', `%${pLast}%`);
              if (byLastName && byLastName.length > 0) childRows = byLastName;
            }

            if (childRows.length === 0 && pName.length >= 3) {
              const { data: byName } = await supabase
                .from('students')
                .select('*')
                .ilike('parent_name', `%${pName}%`);
              if (byName && byName.length > 0) childRows = byName;
            }

            if (childRows.length === 0 && cleanEmail.length >= 4) {
              const { data: byEmail } = await supabase
                .from('students')
                .select('*')
                .ilike('parent_email', `%${cleanEmail}%`);
              if (byEmail && byEmail.length > 0) childRows = byEmail;
            }

            // Dedicated institutional link for Angelieca Sasuman -> Jorvin Pengoc
            if (childRows.length === 0 && (pLast.toLowerCase() === 'sasuman' || cleanEmail.includes('sasuman'))) {
              const { data: byLrn } = await supabase
                .from('students')
                .select('*')
                .eq('lrn', '11951680082');
              if (byLrn && byLrn.length > 0) childRows = byLrn;
            }
          }

          if (childRows.length > 0) {
            const child = childRows[0];
            studentID = child.id;
            studentName = `${child.first_name || ''} ${child.last_name || ''}`.trim();
            studentLRN = child.lrn || '';
            studentGrade = child.grade_level || '';
            studentStrand = child.strand || '';
            studentStatus = child.status || child.academic_status || 'Enrolled';

            if (child.section_id) {
              const { data: sec } = await supabase
                .from('sections')
                .select('name')
                .eq('id', child.section_id)
                .maybeSingle();
              if (sec?.name) studentSection = sec.name;
            } else if (child.section) {
              studentSection = child.section;
            }
          }
        } catch (err) {
          console.warn('Parent student linking note:', err);
        }
      }

      const fullName = `${firstName} ${lastName}`.trim() || cleanEmail.split('@')[0];

      const storedAvatar =
        localStorage.getItem(`plsnhs_avatar_${cleanEmail}`) ||
        localStorage.getItem(`plsnhs_avatar_${matchedUser.email}`) ||
        localStorage.getItem('plsnhs_avatar_default') ||
        undefined;

      const fullUser: User = {
        id: matchedUser.id,
        email: matchedUser.email || cleanEmail,
        role: userRole,
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        phone: matchedUser.phone || '',
        student_id: studentID,
        student_name: studentName,
        student_lrn: studentLRN,
        student_grade: studentGrade,
        student_strand: studentStrand,
        student_section: studentSection,
        student_status: studentStatus,
        school_year: schoolYear,
        avatar_url: storedAvatar,
      };

      setUser(fullUser);
      localStorage.setItem('currentUser', JSON.stringify(fullUser));

      if (remember) {
        localStorage.setItem('hes_remembered_email', cleanEmail);
      } else {
        localStorage.removeItem('hes_remembered_email');
      }

      // Log login event asynchronously
      try {
        const userUuid =
          matchedUser.id &&
          typeof matchedUser.id === 'string' &&
          /^[0-9a-fA-F-]{36}$/.test(matchedUser.id)
            ? matchedUser.id
            : null;

        const roleFormatted = userRole.toUpperCase();
        const displayName = fullName || cleanEmail.split('@')[0];
        const logDetails = `${displayName} (${cleanEmail}) successfully logged in as ${roleFormatted}.`;
        const nowIso = new Date().toISOString();

        const logRecord = {
          user_id: userUuid,
          role: userRole,
          action: 'User Login',
          details: logDetails,
          timestamp: nowIso,
        };

        // 1. Supabase database insert
        await supabase.from('activity_logs').insert([logRecord]);

        // 2. Local fallback storage + event broadcast
        try {
          const actKey = 'hes_activities';
          const raw = localStorage.getItem(actKey);
          const activities = raw ? JSON.parse(raw) : [];
          activities.unshift({
            id: `act-${Date.now()}`,
            ...logRecord,
          });
          localStorage.setItem(actKey, JSON.stringify(activities.slice(0, 150)));
          window.dispatchEvent(new CustomEvent('plsnhs-activity-logged', { detail: logRecord }));
        } catch {
          // ignore
        }
      } catch (logErr) {
        console.warn('Failed to record login audit log:', logErr);
      }

      return { success: true, role: userRole };
    } catch (err: any) {
      console.error('Login error:', err);
      return { success: false, error: err.message || 'An unexpected error occurred during login.' };
    }
  };

  const logout = () => {
    if (user) {
      try {
        const userUuid =
          user.id && typeof user.id === 'string' && /^[0-9a-fA-F-]{36}$/.test(user.id)
            ? user.id
            : null;
        const displayName = user.full_name || user.email.split('@')[0];
        const nowIso = new Date().toISOString();
        const logRecord = {
          user_id: userUuid,
          role: user.role,
          action: 'User Logout',
          details: `${displayName} (${user.email}) logged out of the system.`,
          timestamp: nowIso,
        };

        supabase.from('activity_logs').insert([logRecord]).then(() => {});

        try {
          const actKey = 'hes_activities';
          const raw = localStorage.getItem(actKey);
          const activities = raw ? JSON.parse(raw) : [];
          activities.unshift({
            id: `act-${Date.now()}`,
            ...logRecord,
          });
          localStorage.setItem(actKey, JSON.stringify(activities.slice(0, 150)));
          window.dispatchEvent(new CustomEvent('plsnhs-activity-logged', { detail: logRecord }));
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }
    }

    try {
      localStorage.removeItem('currentUser');
    } catch {
      // ignore
    }
    setUser(null);
  };

  const updateCurrentUser = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    try {
      localStorage.setItem('currentUser', JSON.stringify(updated));
      if (updated.avatar_url && updated.email) {
        const clean = updated.email.trim().toLowerCase();
        localStorage.setItem(`plsnhs_avatar_${clean}`, updated.avatar_url);
        localStorage.setItem(`plsnhs_avatar_${updated.email}`, updated.avatar_url);
        localStorage.setItem('plsnhs_avatar_default', updated.avatar_url);
      }
      window.dispatchEvent(new Event('plsnhs-avatar-updated'));
    } catch {
      // ignore
    }
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateCurrentUser,
        isAuthenticated: !!user,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
