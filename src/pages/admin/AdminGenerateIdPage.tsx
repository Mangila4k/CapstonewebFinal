import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  SlidersHorizontal,
  Printer,
  Download,
  Filter,
  Search,
  RotateCw,
  Camera,
  CheckCircle2,
  Trash2,
  Eye,
  ShieldCheck,
  Calendar,
  Layers,
  Phone,
  QrCode,
  User,
  ChevronDown,
  CreditCard,
  Save,
  Edit2,
  Sparkles,
  ExternalLink,
  X,
  Upload,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { supabase } from '../../lib/supabase';
import { StudentIdCard, type StudentIdCardData } from '../../components/common/StudentIdCard';
import { printOfficialStudentId } from '../../lib/printIdCard';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';

interface CreatedStudentIdRecord extends StudentIdCardData {
  created_at?: string;
  status?: string;
}

const computeStudentQrPayload = (
  st: Partial<CreatedStudentIdRecord>,
  mode: 'url' | 'raw'
) => {
  const name = st.fullname || `${st.first_name || ''} ${st.last_name || ''}`.trim() || 'Student';
  const lrn = st.lrn || '';
  const id = st.student_id || st.id || '';
  const level = st.level_category || st.grade_level || 'Junior High';
  const guardian = st.parent_name || '';
  const phone = st.parent_contact || '';

  if (mode === 'raw') {
    return `PLSNHS-STUDENT|LRN:${lrn}|ID:${id}|NAME:${name}|GRADE:${level}|CONTACT:${phone}|STATUS:OFFICIAL_ENROLLED`;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/verify-id?lrn=${encodeURIComponent(lrn)}&id=${encodeURIComponent(String(id))}&name=${encodeURIComponent(name)}&grade=${encodeURIComponent(level)}&guardian=${encodeURIComponent(guardian)}&contact=${encodeURIComponent(phone)}`;
};

const INITIAL_STUDENTS: CreatedStudentIdRecord[] = [
  {
    id: 'bbe8f070-febc-42f0-aeb8-a1e670490b4d',
    student_id: 'bbe8f070-febc-42f0-aeb8-a1e670490b4d',
    fullname: 'Charmelyn Abalo',
    first_name: 'Charmelyn',
    last_name: 'Abalo',
    lrn: '119518160054',
    grade_level: 'Grade 10',
    level_category: 'Junior High',
    strand: '',
    school_year: '2026-2027',
    parent_name: 'Merlina',
    parent_contact: '09754182276',
    principal_name: 'Dr. Ryan R. Quiroga',
    created_at: '2026-10-21T08:30:00Z',
    status: 'Active',
  },
  {
    id: '1187c85a-09c5-4a3f-9c07-dd21da0dc16c',
    student_id: '1187c85a-09c5-4a3f-9c07-dd21da0dc16c',
    fullname: 'Janrey Baylocon',
    first_name: 'Janrey',
    last_name: 'Baylocon',
    lrn: '187030160003',
    grade_level: 'Grade 10',
    level_category: 'Junior High',
    strand: '',
    school_year: '2026-2027',
    parent_name: 'Grace Baylocon',
    parent_contact: '09123456789',
    principal_name: 'Dr. Ryan R. Quiroga',
    created_at: '2026-10-21T09:15:00Z',
    status: 'Active',
  },
  {
    id: '4a2e12e1-18a1-454a-815f-5c2309e683ff',
    student_id: '4a2e12e1-18a1-454a-815f-5c2309e683ff',
    fullname: 'Jorvin Pengoc',
    first_name: 'Jorvin',
    last_name: 'Pengoc',
    lrn: '11951680082',
    grade_level: 'Grade 11',
    level_category: 'Senior High',
    strand: 'TVL-ICT',
    school_year: '2026-2027',
    parent_name: 'Marites Pengoc',
    parent_contact: '09234567890',
    principal_name: 'Dr. Ryan R. Quiroga',
    created_at: '2026-10-19T10:00:00Z',
    status: 'Active',
  },
  {
    id: 'b72f2a95-d394-4f4b-91dd-141455efb0f7',
    student_id: 'b72f2a95-d394-4f4b-91dd-141455efb0f7',
    fullname: 'Chloe Mikayla Ceballos',
    first_name: 'Chloe Mikayla',
    last_name: 'Ceballos',
    lrn: '141525469312',
    grade_level: 'Grade 7',
    level_category: 'Junior High',
    strand: '',
    school_year: '2026-2027',
    parent_name: 'Elena Ceballos',
    parent_contact: '09345678901',
    principal_name: 'Dr. Ryan R. Quiroga',
    created_at: '2026-10-19T11:20:00Z',
    status: 'Active',
  },
  {
    id: '5f57fcb0-0430-44f9-8cd4-a46552a38aa0',
    student_id: '5f57fcb0-0430-44f9-8cd4-a46552a38aa0',
    fullname: 'Jericho Maurin',
    first_name: 'Jericho',
    last_name: 'Maurin',
    lrn: '123456789101',
    grade_level: 'Grade 8',
    level_category: 'Junior High',
    strand: '',
    school_year: '2026-2027',
    parent_name: 'Ronald Maurin',
    parent_contact: '09456789012',
    principal_name: 'Dr. Ryan R. Quiroga',
    created_at: '2026-10-19T14:45:00Z',
    status: 'Active',
  },
];

export const AdminGenerateIdPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState<CreatedStudentIdRecord[]>(INITIAL_STUDENTS);
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(INITIAL_STUDENTS[0].id as string);
  const [flipped, setFlipped] = useState<boolean>(false);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [exporting, setExporting] = useState<boolean>(false);
  const [activeTableDropdownId, setActiveTableDropdownId] = useState<string | null>(null);

  // Global Page Alert & Studio Save State
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);

  // Studio Form State
  const [formData, setFormData] = useState<StudentIdCardData>(INITIAL_STUDENTS[0]);
  const [qrMode, setQrMode] = useState<'url' | 'raw'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate & Edit Modal State
  const [editModalStudent, setEditModalStudent] = useState<CreatedStudentIdRecord | null>(null);
  const [editModalFormData, setEditModalFormData] = useState<Partial<CreatedStudentIdRecord>>({});
  const [editModalFlipped, setEditModalFlipped] = useState<boolean>(false);
  const [editModalSide, setEditModalSide] = useState<'both' | 'front' | 'back'>('both');
  const [editModalLoading, setEditModalLoading] = useState<boolean>(false);
  const [editModalDownloading, setEditModalDownloading] = useState<boolean>(false);
  const [modalQrMode, setModalQrMode] = useState<'url' | 'raw'>('url');
  const editModalFileInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss alert notification
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // Load students from Supabase on mount
  useEffect(() => {
    async function loadDbStudents() {
      let combined: CreatedStudentIdRecord[] = [...INITIAL_STUDENTS];
      try {
        const { data: stData } = await supabase
          .from('students')
          .select('*')
          .order('last_name', { ascending: true });

        if (stData && stData.length > 0) {
          const mapped: CreatedStudentIdRecord[] = stData.map((s) => ({
            id: s.id,
            student_id: s.id,
            fullname: `${s.first_name} ${s.last_name}`.trim(),
            first_name: s.first_name,
            last_name: s.last_name,
            lrn: s.lrn || '',
            grade_level: s.grade_level || 'Grade 10',
            level_category: parseInt(String(s.grade_level).replace(/\D/g, '') || '10', 10) >= 11 ? 'Senior High' : 'Junior High',
            strand: s.strand || '',
            photo_url: (s as any).two_by_two_picture_url || (s as any).photo_url || (s as any).avatar_url || '',
            parent_name: s.guardian_name || (s as any).parent_name || '',
            parent_contact: s.guardian_contact || (s as any).parent_contact || '',
            principal_name: 'Dr. Ryan R. Quiroga',
            school_year: '2026-2027',
            created_at: s.created_at || new Date().toISOString(),
            status: s.status || 'Active',
          }));

          // Merge loaded with initials to ensure demo records stay available
          combined = [...mapped];
          INITIAL_STUDENTS.forEach((initSt) => {
            if (!combined.some((c) => c.lrn === initSt.lrn)) {
              combined.push(initSt);
            }
          });
        }
      } catch (err) {
        console.warn('Could not load database students:', err);
      }

      // Check if URL specifies student id, lrn, or direct applicant parameters
      const queryId = searchParams.get('id') || searchParams.get('studentId');
      const queryLrn = searchParams.get('lrn');
      const queryName = searchParams.get('name');
      const queryGrade = searchParams.get('grade');
      const queryStrand = searchParams.get('strand');
      const queryGuardian = searchParams.get('guardian');
      const queryContact = searchParams.get('contact');
      const queryPhoto = searchParams.get('photo');

      let matched = combined.find(
        (s) =>
          (queryId && String(s.id) === String(queryId)) ||
          (queryLrn && s.lrn && s.lrn === queryLrn)
      );

      if (!matched && (queryName || queryLrn)) {
        const nameParts = (queryName || 'Student').trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        const gLevel = queryGrade || 'Grade 11';
        const isShs = parseInt(gLevel.replace(/\D/g, '') || '11', 10) >= 11;
        const customRecord: CreatedStudentIdRecord = {
          id: queryId || `enr-${queryLrn || Date.now()}`,
          student_id: queryId || `enr-${queryLrn || Date.now()}`,
          fullname: queryName || 'Student',
          first_name: firstName,
          last_name: lastName,
          lrn: queryLrn || '',
          grade_level: gLevel,
          level_category: isShs ? 'Senior High' : 'Junior High',
          strand: queryStrand || '',
          photo_url: queryPhoto || '',
          parent_name: queryGuardian || '',
          parent_contact: queryContact || '',
          principal_name: 'Dr. Ryan R. Quiroga',
          school_year: '2026-2027',
          created_at: new Date().toISOString(),
          status: 'Active',
        };
        combined = [customRecord, ...combined];
        matched = customRecord;
      }

      setStudents(combined);

      if (matched) {
        setSelectedStudentId(String(matched.id));
        setFormData(matched);
      } else if (combined.length > 0) {
        setSelectedStudentId(String(combined[0].id));
        setFormData(combined[0]);
      }
    }
    loadDbStudents();
  }, [searchParams]);

  // Update selected student when dropdown changes
  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    const found = students.find((s) => String(s.id) === String(id));
    if (found) {
      setFormData({ ...found });
    }
  };

  // Filter students for dropdown
  const filteredForDropdown = students.filter((s) => {
    if (gradeFilter === 'all') return true;
    const filterNum = gradeFilter.replace(/\D/g, '');
    const sGradeNum = String(s.grade_level || '').replace(/\D/g, '');
    if (filterNum && sGradeNum) {
      return filterNum === sGradeNum;
    }
    return String(s.grade_level || '').toLowerCase().includes(gradeFilter.toLowerCase());
  });

  // Photo Upload Handler for Top Studio
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        setFormData((prev) => ({
          ...prev,
          photo_url: dataUrl,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Photo Upload Handler for Modal
  const handleModalPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const dataUrl = evt.target?.result as string;
        setEditModalFormData((prev) => ({
          ...prev,
          photo_url: dataUrl,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Open the Generate & Edit ID Modal
  const handleOpenEditModal = (st: CreatedStudentIdRecord) => {
    setEditModalStudent(st);
    setEditModalFormData({
      ...st,
      fullname: st.fullname || `${st.first_name || ''} ${st.last_name || ''}`.trim(),
      school_year: st.school_year || '2026-2027',
      principal_name: st.principal_name || 'Dr. Ryan R. Quiroga',
    });
    setEditModalFlipped(false);
    setEditModalSide('both');
    setModalQrMode(qrMode);
    setSelectedStudentId(st.id as string);
    setFormData({ ...st });
  };

  // Save changes from inside the Generate & Edit Modal
  const handleSaveEditModal = async () => {
    if (!editModalStudent) return;
    setEditModalLoading(true);
    setAlert(null);

    try {
      const sid = editModalStudent.id;
      let fullName = (editModalFormData.fullname || '').trim();
      let firstName = editModalFormData.first_name || '';
      let lastName = editModalFormData.last_name || '';

      if (fullName) {
        if (!firstName || !lastName) {
          const parts = fullName.split(' ');
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ') || '';
        }
      } else {
        fullName = `${firstName} ${lastName}`.trim();
      }

      const updatedRecord: CreatedStudentIdRecord = {
        ...editModalStudent,
        ...editModalFormData,
        id: sid,
        student_id: sid,
        fullname: fullName || 'Student',
        first_name: firstName,
        last_name: lastName,
        lrn: editModalFormData.lrn || '',
        grade_level: editModalFormData.grade_level || 'Grade 10',
        level_category:
          editModalFormData.level_category ||
          (parseInt(String(editModalFormData.grade_level).replace(/\D/g, '') || '10', 10) >= 11
            ? 'Senior High'
            : 'Junior High'),
        strand: editModalFormData.strand || '',
        school_year: editModalFormData.school_year || '2026-2027',
        parent_name: editModalFormData.parent_name || '',
        parent_contact: editModalFormData.parent_contact || '',
        principal_name: editModalFormData.principal_name || 'Dr. Ryan R. Quiroga',
        photo_url: editModalFormData.photo_url || '',
      };

      // Update in Supabase
      if (sid) {
        try {
          const { error: sbErr } = await supabase
            .from('students')
            .update({
              first_name: firstName,
              last_name: lastName,
              lrn: updatedRecord.lrn,
              grade_level: updatedRecord.grade_level,
              strand: updatedRecord.strand,
              parent_name: updatedRecord.parent_name,
              parent_contact: updatedRecord.parent_contact,
              two_by_two_picture_url: updatedRecord.photo_url,
              avatar_url: updatedRecord.photo_url,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sid);

          if (sbErr) {
            console.warn('Notice from Supabase update:', sbErr.message);
          }
        } catch (dbErr) {
          console.warn('Database sync notice:', dbErr);
        }
      }

      // Update local state list
      setStudents((prev) => prev.map((s) => (s.id === sid ? updatedRecord : s)));

      // Sync active studio form data
      if (selectedStudentId === sid) {
        setFormData(updatedRecord);
      }

      setAlert({
        type: 'success',
        message: `Official Student ID record for "${updatedRecord.fullname}" successfully generated and updated.`,
      });

      setEditModalStudent(null);
    } catch (err: any) {
      console.error('Error saving modal student ID:', err);
      setAlert({
        type: 'error',
        message: 'Failed to update student ID. Please check inputs and try again.',
      });
    } finally {
      setEditModalLoading(false);
    }
  };

  // Save changes from the Top Studio Pane
  const handleSaveStudioId = async () => {
    setSaveLoading(true);
    setAlert(null);

    try {
      const sid = formData.id || formData.student_id;
      let fullName = (formData.fullname || '').trim();
      let firstName = formData.first_name || '';
      let lastName = formData.last_name || '';

      if (fullName) {
        if (!firstName || !lastName) {
          const parts = fullName.split(' ');
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ') || '';
        }
      } else {
        fullName = `${firstName} ${lastName}`.trim();
      }

      const updatedRecord: CreatedStudentIdRecord = {
        ...formData,
        id: sid,
        student_id: sid,
        fullname: fullName || 'Student',
        first_name: firstName,
        last_name: lastName,
        lrn: formData.lrn || '',
        grade_level: formData.grade_level || 'Grade 10',
        level_category:
          formData.level_category ||
          (parseInt(String(formData.grade_level).replace(/\D/g, '') || '10', 10) >= 11
            ? 'Senior High'
            : 'Junior High'),
        strand: formData.strand || '',
        school_year: formData.school_year || '2026-2027',
        parent_name: formData.parent_name || '',
        parent_contact: formData.parent_contact || '',
        principal_name: formData.principal_name || 'Dr. Ryan R. Quiroga',
        photo_url: formData.photo_url || '',
      };

      if (sid) {
        try {
          const { error: sbErr } = await supabase
            .from('students')
            .update({
              first_name: firstName,
              last_name: lastName,
              lrn: updatedRecord.lrn,
              grade_level: updatedRecord.grade_level,
              strand: updatedRecord.strand,
              guardian_name: updatedRecord.parent_name,
              guardian_contact: updatedRecord.parent_contact,
              two_by_two_picture_url: updatedRecord.photo_url,
            })
            .eq('id', sid);

          if (sbErr) {
            console.warn('Notice from Supabase update:', sbErr.message);
          }
        } catch (dbErr) {
          console.warn('Database sync notice:', dbErr);
        }
      }

      setStudents((prev) => prev.map((s) => (s.id === sid ? updatedRecord : s)));
      setFormData(updatedRecord);

      setAlert({
        type: 'success',
        message: `Official Student ID record for "${updatedRecord.fullname}" successfully saved and updated.`,
      });
    } catch (err: any) {
      console.error('Error saving studio student ID:', err);
      setAlert({
        type: 'error',
        message: 'Failed to save student ID. Please try again.',
      });
    } finally {
      setSaveLoading(false);
    }
  };

  // QR Code Payload Computation for Studio
  const computedQrPayload = useMemo(() => {
    return computeStudentQrPayload(formData, qrMode);
  }, [formData, qrMode]);

  // PNG Export for Modal Card
  const exportModalCardAsImage = async (elementId: string, filename: string) => {
    const el = document.getElementById(elementId);
    if (!el) return;

    setEditModalDownloading(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error exporting modal card:', err);
      printOfficialStudentId(elementId);
    } finally {
      setEditModalDownloading(false);
    }
  };

  // PNG Export
  const exportCardAsImage = async (elementId: string, filename: string) => {
    const el = document.getElementById(elementId);
    if (!el) return;

    setExporting(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error exporting card:', err);
      printOfficialStudentId('printableCardContainer');
    } finally {
      setExporting(false);
    }
  };

  // Filter created students for table
  const filteredTableStudents = students.filter((s) => {
    const q = tableSearch.toLowerCase().trim();
    if (!q) return true;
    const name = (s.fullname || '').toLowerCase();
    const lrn = (s.lrn || '').toLowerCase();
    const grade = (s.grade_level || '').toLowerCase();
    const strand = (s.strand || '').toLowerCase();
    return name.includes(q) || lrn.includes(q) || grade.includes(q) || strand.includes(q);
  });

  const handleDelete = (id: string | number | undefined) => {
    if (!id) return;
    if (window.confirm('Are you sure you want to delete this student ID card record?')) {
      setStudents((prev) => prev.filter((s) => s.id !== id));
      if (selectedStudentId === id && students.length > 1) {
        const remaining = students.filter((s) => s.id !== id);
        setSelectedStudentId(remaining[0].id as string);
        setFormData(remaining[0]);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5 no-print">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">
            Student ID Card Generator
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Design, preview, encode QR credentials, and print standard DepEd CR80 student identification cards.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <PageHeaderNotificationSlot />
        </div>
      </div>

      {/* Real-time Alert Notification */}
      {alert && (
        <div className="no-print animate-fade-in">
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        </div>
      )}

      {/* Main Two-Column Generator Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Live Preview Area */}
        <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 flex-wrap gap-3 no-print">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span className="text-[#f5b72e]">🪪</span> Official Student ID Card Preview
            </h3>

            <button
              type="button"
              onClick={() => setFlipped(!flipped)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
            >
              <RotateCw className="h-3.5 w-3.5 text-slate-500" />
              Flip View
            </button>
          </div>

          {/* Card Preview Component */}
          <div
            className="overflow-x-auto flex-1 flex flex-col justify-center"
            id="printableCardContainer"
          >
            <StudentIdCard
              data={{
                ...formData,
                qrPayload: computedQrPayload,
              }}
              flipped={flipped}
              frontId="cardFrontElement"
              backId="cardBackElement"
            />
          </div>
        </div>

        {/* Right Column: Customization Controls */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between h-full id-controls-pane no-print">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#1B2A4A]" /> Student ID Controls
              </h3>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                CR80 Standard
              </span>
            </div>

            {/* Filter by Year Level & School Year */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="h-3 w-3 text-[#1B2A4A]" /> Filter by Year Level
                </label>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden"
                >
                  <option value="all">All Year Levels</option>
                  <option value="Grade 7">Grade 7 (Junior High)</option>
                  <option value="Grade 8">Grade 8 (Junior High)</option>
                  <option value="Grade 9">Grade 9 (Junior High)</option>
                  <option value="Grade 10">Grade 10 (Junior High)</option>
                  <option value="Grade 11">Grade 11 (Senior High)</option>
                  <option value="Grade 12">Grade 12 (Senior High)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-[#1B2A4A]" /> School Year (S.Y.)
                </label>
                <input
                  type="text"
                  value={formData.school_year || '2026-2027'}
                  onChange={(e) => setFormData({ ...formData, school_year: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Select Student */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Search className="h-3 w-3 text-[#1B2A4A]" /> Select Student
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => handleSelectStudent(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden"
              >
                {filteredForDropdown.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullname} ({st.lrn}) - {st.grade_level} {st.strand ? `(${st.strand})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 2x2 Photo Upload */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="h-3 w-3 text-[#1B2A4A]" /> Student Photo (2x2 / ID Picture)
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>
              <p className="text-[10.5px] text-slate-500 leading-tight">
                If no photo is provided, the card displays the student&apos;s initial letter in school gold automatically.
              </p>
            </div>

            {/* Student Full Name & Academic Classification */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3 w-3 text-[#1B2A4A]" /> Student Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullname || ''}
                  onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                  placeholder="e.g. Student Full Name"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-3 w-3 text-[#1B2A4A]" /> Classification / Level
                </label>
                <select
                  value={formData.level_category || (formData.grade_level?.includes('11') || formData.grade_level?.includes('12') ? 'Senior High' : 'Junior High')}
                  onChange={(e) => setFormData({ ...formData, level_category: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden"
                >
                  <option value="Junior High">Junior High (Grades 7–10)</option>
                  <option value="Senior High">Senior High (Grades 11–12)</option>
                  <option value="Grade 7">Grade 7</option>
                  <option value="Grade 8">Grade 8</option>
                  <option value="Grade 9">Grade 9</option>
                  <option value="Grade 10">Grade 10</option>
                  <option value="Grade 11">Grade 11</option>
                  <option value="Grade 12">Grade 12</option>
                </select>
              </div>
            </div>

            {/* LRN & Student ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  LRN
                </label>
                <input
                  type="text"
                  value={formData.lrn || ''}
                  onChange={(e) => setFormData({ ...formData, lrn: e.target.value })}
                  placeholder="12-digit LRN"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Student ID
                </label>
                <input
                  type="text"
                  value={formData.student_id || formData.id || ''}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value, id: e.target.value })}
                  placeholder="UUID / ID"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Emergency Guardian & Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Emergency Parent / Guardian
                </label>
                <input
                  type="text"
                  value={formData.parent_name || ''}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  placeholder="Parent / Guardian Name"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-[#1B2A4A]" /> Emergency Contact Phone
                </label>
                <input
                  type="text"
                  value={formData.parent_contact || ''}
                  onChange={(e) => setFormData({ ...formData, parent_contact: e.target.value })}
                  placeholder="e.g. 09XXXXXXXXX"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Principal Name & QR Code Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  School Principal Name
                </label>
                <input
                  type="text"
                  value={formData.principal_name || 'Dr. Ryan R. Quiroga'}
                  onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="h-3 w-3 text-[#1B2A4A]" /> QR Code Mode
                </label>
                <select
                  value={qrMode}
                  onChange={(e) => setQrMode(e.target.value as 'url' | 'raw')}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#1B2A4A] focus:outline-hidden"
                >
                  <option value="url">📱 Mobile Verification (Profile)</option>
                  <option value="raw">🏢 Gate Scanner (Raw Barcode)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Save & Update ID */}
              <button
                type="button"
                disabled={saveLoading}
                onClick={handleSaveStudioId}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4 text-emerald-100" />
                <span>{saveLoading ? 'Saving ID Changes...' : 'Save Changes & Update ID'}</span>
              </button>

              <button
                type="button"
                onClick={() => printOfficialStudentId('printableCardContainer')}
                className="w-full py-3 px-4 rounded-xl bg-[#152e69] hover:bg-[#0f1c3f] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4 text-[#F5C518]" /> Print Official ID
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => exportCardAsImage('cardFrontElement', `${formData.fullname || 'Student'}_ID_Front.png`)}
                  className="py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" /> Front (PNG)
                </button>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => exportCardAsImage('cardBackElement', `${formData.fullname || 'Student'}_ID_Back.png`)}
                  className="py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" /> Back (PNG)
                </button>
              </div>
            </div>

            {/* Official Verification Callout Note */}
            <div className="p-3.5 rounded-xl bg-blue-50/80 border-l-4 border-[#152e69] text-[11.5px] text-blue-900 leading-relaxed flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-[#f5b72e] shrink-0 mt-0.5" />
              <div>
                <strong>Official PLSNHS Student ID:</strong> Generates landscape CR80 high-resolution student IDs with scannable QR security for gate attendance and official school verification.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Table: Created Student IDs */}
      <div id="createdIdsSection" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden no-print">
        {/* Table Header Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-[#1B2A4A] to-[#152C6B] text-white">
          <div className="flex items-center gap-2.5">
            <span className="text-xl text-[#F5C518]">🪪</span>
            <h2 className="text-base font-extrabold tracking-tight">Created Student IDs</h2>
            <span className="ml-1 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold text-white">
              {filteredTableStudents.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search name or LRN..."
                className="w-full rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-white placeholder-white/60 focus:bg-white/20 focus:outline-hidden"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setTableSearch('');
                setStudents([...INITIAL_STUDENTS]);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/25 bg-white/10 text-xs font-bold text-white hover:bg-white/20 transition-colors cursor-pointer"
            >
              <RotateCw className="h-3 w-3" /> Refresh
            </button>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto min-h-[380px] pb-16">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">STUDENT</th>
                <th className="px-5 py-3.5">LRN</th>
                <th className="px-5 py-3.5">GRADE & STRAND</th>
                <th className="px-5 py-3.5">QR CODE</th>
                <th className="px-5 py-3.5">CREATED</th>
                <th className="px-5 py-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredTableStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No student ID records found.
                  </td>
                </tr>
              ) : (
                filteredTableStudents.map((st, idx) => {
                  const isSelected = selectedStudentId === st.id;
                  const initial = (st.first_name?.[0] || st.fullname?.[0] || 'S').toUpperCase();
                  const createdDate = st.created_at
                    ? new Date(st.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'October 19, 2026';

                  return (
                    <tr
                      key={st.id}
                      className={`transition-colors hover:bg-slate-50/70 ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      {/* Student info */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#152e69] text-[#F5C518] font-black text-sm shadow-xs">
                            {initial}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-[13px] leading-tight">
                              {st.fullname}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                              ID: {String(st.id || '').substring(0, 24)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* LRN */}
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-700">
                        {st.lrn || '—'}
                      </td>

                      {/* Grade & Strand */}
                      <td className="px-5 py-3.5 font-semibold text-slate-800">
                        {st.grade_level || 'Grade 10'}
                        {st.strand ? ` · ${st.strand}` : ''}
                      </td>

                      {/* QR Code badge */}
                      <td className="px-5 py-3.5">
                        <span className="inline-block px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#1E3A8A] font-mono text-[11px] font-bold">
                          PLSNHS-STUDENT | LRN: {st.lrn || '000000000000'}
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="px-5 py-3.5 text-slate-500 font-medium">
                        {createdDate}
                      </td>

                      {/* Action: Manage Dropdown */}
                      <td className="px-5 py-3.5 text-right relative">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTableDropdownId(
                                activeTableDropdownId === st.id ? null : (st.id as string)
                              );
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                              activeTableDropdownId === st.id
                                ? 'border-[#152e69] bg-[#152e69] text-white shadow-xs'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                            title="Manage ID Record"
                          >
                            <span>Manage</span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                activeTableDropdownId === st.id ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {activeTableDropdownId === st.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTableDropdownId(null);
                                }}
                              />
                              <div
                                className={`absolute right-0 z-50 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-black/5 divide-y divide-slate-100 ${
                                  idx >= filteredTableStudents.length - 2 && filteredTableStudents.length > 2
                                    ? 'bottom-full mb-1.5 origin-bottom-right'
                                    : 'top-full mt-1.5 origin-top-right'
                                }`}
                              >
                                <div className="py-1">
                                  {/* Generate ID / Edit */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTableDropdownId(null);
                                      handleOpenEditModal(st);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold text-[#152e69] hover:bg-blue-50/70 transition-colors cursor-pointer"
                                  >
                                    <CreditCard className="h-4 w-4 text-amber-500" />
                                    <span className="flex-1">Generate ID / Edit</span>
                                    <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-black uppercase text-amber-800">
                                      Card
                                    </span>
                                  </button>

                                  {/* Print Card */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTableDropdownId(null);
                                      handleSelectStudent(st.id as string);
                                      setTimeout(() => {
                                        printOfficialStudentId('printableCardContainer');
                                      }, 150);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#152e69] transition-colors cursor-pointer"
                                  >
                                    <Printer className="h-4 w-4 text-slate-400" />
                                    <span>Print Official ID</span>
                                  </button>

                                  {/* Download Front PNG */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTableDropdownId(null);
                                      handleSelectStudent(st.id as string);
                                      setTimeout(() => {
                                        exportCardAsImage(
                                          'cardFrontElement',
                                          `${st.fullname || 'Student'}_Front.png`
                                        );
                                      }, 150);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#152e69] transition-colors cursor-pointer"
                                  >
                                    <Download className="h-4 w-4 text-slate-400" />
                                    <span>Download Front (PNG)</span>
                                  </button>

                                  {/* Download Back PNG */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTableDropdownId(null);
                                      handleSelectStudent(st.id as string);
                                      setTimeout(() => {
                                        exportCardAsImage(
                                          'cardBackElement',
                                          `${st.fullname || 'Student'}_Back.png`
                                        );
                                      }, 150);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-[#152e69] transition-colors cursor-pointer"
                                  >
                                    <Download className="h-4 w-4 text-slate-400" />
                                    <span>Download Back (PNG)</span>
                                  </button>
                                </div>

                                <div className="py-1">
                                  {/* Delete Record */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTableDropdownId(null);
                                      handleDelete(st.id);
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4 text-rose-500" />
                                    <span>Delete Record</span>
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GENERATE ID & EDIT STUDENT CARD MODAL */}
      {editModalStudent && (
        <Modal
          isOpen={!!editModalStudent}
          onClose={() => setEditModalStudent(null)}
          title="Generate & Edit Student ID"
          subtitle={`${editModalFormData.fullname || 'Student'} · LRN: ${editModalFormData.lrn || '—'}`}
          maxWidth="5xl"
        >
          <div className="space-y-6">
            {/* Top Info Banner inside Modal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-blue-50/90 border border-blue-200 text-xs text-blue-900">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#F5C518] shrink-0" />
                <span>
                  Update student details below. Changes reflect on the official CR80 card preview in real-time.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const sid = editModalStudent.id;
                  setEditModalStudent(null);
                  handleSelectStudent(sid as string);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1 font-bold text-[#152e69] hover:underline cursor-pointer ml-auto shrink-0"
              >
                <span>Open in Full Studio</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Column: Live Card Preview & Controls */}
              <div className="lg:col-span-6 bg-slate-900/90 rounded-2xl p-4 flex flex-col items-center justify-between border border-slate-800 shadow-inner">
                <div className="w-full flex items-center justify-between mb-3 text-white text-xs">
                  <span className="font-extrabold flex items-center gap-1.5 text-amber-300">
                    <CreditCard className="h-3.5 w-3.5" /> Live Card Preview
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditModalFlipped(!editModalFlipped)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white transition-colors cursor-pointer"
                    >
                      <RotateCw className="h-3 w-3" />
                      Flip
                    </button>
                    <select
                      value={editModalSide}
                      onChange={(e) => setEditModalSide(e.target.value as 'both' | 'front' | 'back')}
                      className="rounded-lg bg-white/10 border border-white/20 px-2 py-0.5 text-[11px] font-bold text-white focus:outline-hidden"
                    >
                      <option value="both" className="text-slate-900">Both Sides</option>
                      <option value="front" className="text-slate-900">Front Only</option>
                      <option value="back" className="text-slate-900">Back Only</option>
                    </select>
                  </div>
                </div>

                <div
                  id="modalCardPreviewContainer"
                  className="w-full flex-1 overflow-x-auto flex items-center justify-center py-2"
                >
                  <StudentIdCard
                    data={{
                      ...editModalFormData,
                      qrPayload: computeStudentQrPayload(editModalFormData, modalQrMode),
                    }}
                    flipped={editModalFlipped}
                    side={editModalSide}
                    scale={0.80}
                    className="transparent-stage"
                    frontId="modalCardFrontElement"
                    backId="modalCardBackElement"
                  />
                </div>

                {/* Quick export buttons inside modal */}
                <div className="w-full grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    disabled={editModalDownloading}
                    onClick={() =>
                      exportModalCardAsImage(
                        'modalCardFrontElement',
                        `${editModalFormData.fullname || 'Student'}_Front.png`
                      )
                    }
                    className="py-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Download className="h-3 w-3 text-amber-300" /> Download Front
                  </button>
                  <button
                    type="button"
                    disabled={editModalDownloading}
                    onClick={() =>
                      exportModalCardAsImage(
                        'modalCardBackElement',
                        `${editModalFormData.fullname || 'Student'}_Back.png`
                      )
                    }
                    className="py-1.5 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Download className="h-3 w-3 text-amber-300" /> Download Back
                  </button>
                </div>
              </div>

              {/* Right Column: Editable Fields */}
              <div className="lg:col-span-6 flex flex-col justify-between space-y-3.5 text-xs bg-slate-50/70 rounded-2xl border border-slate-200 p-4">
                {/* Full Name */}
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <User className="h-3 w-3 text-[#152e69]" /> Student Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editModalFormData.fullname || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const parts = val.trim().split(' ');
                      setEditModalFormData((prev) => ({
                        ...prev,
                        fullname: val,
                        first_name: parts[0] || '',
                        last_name: parts.slice(1).join(' ') || '',
                      }));
                    }}
                    placeholder="e.g. Charmelyn Abalo"
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                  />
                </div>

                {/* LRN & School Year */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      LRN (12 Digits) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      value={editModalFormData.lrn || ''}
                      onChange={(e) =>
                        setEditModalFormData((prev) => ({ ...prev, lrn: e.target.value }))
                      }
                      placeholder="119518160054"
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 font-mono text-xs font-bold text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      School Year (S.Y.)
                    </label>
                    <input
                      type="text"
                      value={editModalFormData.school_year || '2026-2027'}
                      onChange={(e) =>
                        setEditModalFormData((prev) => ({ ...prev, school_year: e.target.value }))
                      }
                      placeholder="2026-2027"
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-medium text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Grade Level & Classification */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Layers className="h-3 w-3 text-[#152e69]" /> Year Level
                    </label>
                    <select
                      value={editModalFormData.grade_level || 'Grade 10'}
                      onChange={(e) => {
                        const g = e.target.value;
                        const gNum = parseInt(g.replace(/\D/g, '') || '10', 10);
                        setEditModalFormData((prev) => ({
                          ...prev,
                          grade_level: g,
                          level_category: gNum >= 11 ? 'Senior High' : 'Junior High',
                          strand: gNum < 11 ? '' : prev.strand || 'TVL-ICT',
                        }));
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                    >
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11</option>
                      <option value="Grade 12">Grade 12</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Department Level
                    </label>
                    <select
                      value={
                        editModalFormData.level_category ||
                        (parseInt(String(editModalFormData.grade_level).replace(/\D/g, '') || '10', 10) >= 11
                          ? 'Senior High'
                          : 'Junior High')
                      }
                      onChange={(e) =>
                        setEditModalFormData((prev) => ({ ...prev, level_category: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                    >
                      <option value="Junior High">Junior High</option>
                      <option value="Senior High">Senior High</option>
                    </select>
                  </div>
                </div>

                {/* Strand (Senior High) */}
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Strand / Specialization
                  </label>
                  <input
                    type="text"
                    value={editModalFormData.strand || ''}
                    onChange={(e) =>
                      setEditModalFormData((prev) => ({ ...prev, strand: e.target.value }))
                    }
                    placeholder="e.g. TVL-ICT, STEM, HUMSS, GAS, ABM"
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-medium text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                  />
                </div>

                {/* Emergency Guardian & Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                      Emergency Guardian
                    </label>
                    <input
                      type="text"
                      value={editModalFormData.parent_name || ''}
                      onChange={(e) =>
                        setEditModalFormData((prev) => ({ ...prev, parent_name: e.target.value }))
                      }
                      placeholder="Parent / Guardian Name"
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-medium text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-[#152e69]" /> Emergency Contact
                    </label>
                    <input
                      type="text"
                      value={editModalFormData.parent_contact || ''}
                      onChange={(e) =>
                        setEditModalFormData((prev) => ({ ...prev, parent_contact: e.target.value }))
                      }
                      placeholder="09XXXXXXXXX"
                      className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-medium text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* School Principal */}
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Principal / Headmaster
                  </label>
                  <input
                    type="text"
                    value={editModalFormData.principal_name || 'Dr. Ryan R. Quiroga'}
                    onChange={(e) =>
                      setEditModalFormData((prev) => ({ ...prev, principal_name: e.target.value }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-medium text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                  />
                </div>

                {/* 2x2 Photo Upload */}
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Camera className="h-3 w-3 text-[#152e69]" /> Student 2×2 Photo
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    {editModalFormData.photo_url ? (
                      <div className="relative group shrink-0">
                        <img
                          src={editModalFormData.photo_url}
                          alt="Preview"
                          className="h-12 w-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
                        />
                        <button
                          type="button"
                          onClick={() => setEditModalFormData((prev) => ({ ...prev, photo_url: '' }))}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-2xs cursor-pointer"
                          title="Remove Photo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-black flex items-center justify-center text-sm shrink-0">
                        {(editModalFormData.fullname?.[0] || 'S').toUpperCase()}
                      </div>
                    )}
                    <input
                      ref={editModalFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleModalPhotoUpload}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#152e69] file:text-white hover:file:bg-[#0f1c3f] cursor-pointer"
                    />
                  </div>
                </div>

                {/* QR Mode */}
                <div>
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <QrCode className="h-3 w-3 text-[#152e69]" /> QR Verification Mode
                  </label>
                  <select
                    value={modalQrMode}
                    onChange={(e) => setModalQrMode(e.target.value as 'url' | 'raw')}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:border-[#152e69] focus:outline-hidden"
                  >
                    <option value="url">Mobile Web Verification Link (Student Profile)</option>
                    <option value="raw">Campus Gate Barcode Scanner Text</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <div className="text-[11px] text-slate-500 font-medium">
                CR80 Standard PVC Card (DepEd Approved Placido L. Señor NHS layout)
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setEditModalStudent(null)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => printOfficialStudentId('modalCardPreviewContainer')}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#152e69] hover:bg-[#0e1a3c] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="h-3.5 w-3.5 text-[#F5C518]" />
                  <span>Print Official ID</span>
                </button>

                <button
                  type="button"
                  disabled={editModalLoading}
                  onClick={handleSaveEditModal}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5 text-emerald-100" />
                  <span>{editModalLoading ? 'Saving Changes...' : 'Save & Generate ID'}</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
