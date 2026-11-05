export type UserRole = 
  | 'admin' 
  | 'registrar' 
  | 'teacher' 
  | 'student' 
  | 'parent' 
  | 'guidance' 
  | 'principal';

export interface User {
  id: string | number;
  email: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  phone?: string;
  student_id?: string | number;
  student_name?: string;
  student_lrn?: string;
  student_grade?: string;
  student_strand?: string;
  student_section?: string;
  student_status?: string;
  school_year?: string;
  avatar_url?: string;
  created_at?: string;
}

export interface Student {
  id: string | number;
  lrn: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  extension_name?: string;
  email?: string;
  contact_number?: string;
  grade_level: string;
  strand: string;
  section?: string;
  status: 'Enrolled' | 'Pending' | 'Rejected' | 'Graduated' | 'Dropped' | 'Transferred';
  gender?: string;
  birthdate?: string;
  address?: string;
  guardian_name?: string;
  guardian_contact?: string;
  created_at?: string;
}

export interface Enrollment {
  id: string | number;
  student_id?: string | number;
  lrn?: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  contact_number?: string;
  grade_level: string;
  strand: string;
  semester?: string;
  school_year?: string;
  student_type?: string;
  two_by_two_picture_url?: string;
  form_137_url?: string;
  report_card_url?: string;
  certificate_of_completion_url?: string;
  psa_birth_cert_url?: string;
  good_moral_cert_url?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Enrolled';
  gender?: string;
  birthdate?: string;
  address?: string;
  guardian_name?: string;
  guardian_contact?: string;
  remarks?: string;
  created_at?: string;
}

export interface Teacher {
  id: string | number;
  user_id?: string;
  employee_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  department?: string;
  specialization?: string;
  position?: string;
  contact_number?: string;
  phone?: string;
  status?: string;
  advisory_section?: string;
  advisory_grade?: string;
  advisory_section_id?: string;
  created_at?: string;
}

export interface Section {
  id: string | number;
  name: string;
  grade_level: string;
  strand?: string | null;
  adviser?: string | null;
  adviser_name?: string | null;
  adviser_id?: string | null;
  room?: string | null;
  capacity?: number;
  enrolled_count?: number;
  created_at?: string;
}

export interface Subject {
  id: string | number;
  code: string;
  name?: string;
  title?: string;
  grade_level: string;
  strand?: string | null;
  semester?: string | null;
  units?: number;
  hours?: number;
  subject_type?: 'Core' | 'Applied' | 'Specialized' | string;
  quarter?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Announcement {
  id: string | number;
  title: string;
  content: string;
  author?: string;
  role?: string;
  target_audience?: 'all' | 'students' | 'teachers' | 'parents';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
}

export interface AttendanceRecord {
  id: string | number;
  student_id: string | number;
  student_name: string;
  lrn?: string;
  section?: string;
  date: string;
  status: 'Present' | 'Late' | 'Absent' | 'Excused';
  mode?: 'QR' | 'LRN' | 'Manual';
  time_in?: string;
  time_out?: string;
  remarks?: string;
  photo_url?: string;
}

export interface GradeRecord {
  id: string | number;
  student_id: string | number;
  subject_code: string;
  subject_title: string;
  q1?: number;
  q2?: number;
  q3?: number;
  q4?: number;
  final_grade?: number;
  remarks?: 'Passed' | 'Failed' | 'Incomplete' | 'Ongoing';
}

export interface Violation {
  id: string | number;
  student_id?: string | number;
  student_name: string;
  lrn?: string;
  violation_type: string;
  severity: 'Minor' | 'Moderate' | 'Major';
  description: string;
  action_taken?: string;
  status: 'Pending' | 'Under Investigation' | 'Resolved' | 'Closed';
  date_reported: string;
}

export interface CounselingSession {
  id: string | number;
  student_id?: string | number;
  student_name: string;
  counselor_name?: string;
  session_date: string;
  purpose: string;
  notes?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

export interface ActivityLog {
  id: string | number;
  user_id?: string | null;
  user_email?: string;
  user_role?: string;
  role?: string;
  action: string;
  details?: string;
  timestamp?: string;
  created_at?: string;
}

export interface Activity {
  id: string | number;
  title: string;
  description?: string;
  image_url: string;
  created_at: string;
}
