import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Printer,
  ShieldCheck,
  FileCheck,
  FolderLock,
  UserCheck,
  Award,
  Eye,
  ExternalLink,
  Layers,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { PageHeaderNotificationSlot } from '../../components/common/NotificationCenter';

interface DocumentRequirement {
  id: string;
  name: string;
  code: string;
  category: 'Academic Credential' | 'Civil Registry' | 'Institutional Clearance' | 'Biometric / Identification' | 'Health & Physical';
  description: string;
  status: 'Verified' | 'Completed';
  dateSubmitted: string;
  dateVerified: string;
  verifiedBy: string;
  trackingRef: string;
  fileSize: string;
  archiveLocation: string;
  remarks: string;
}

const DOCUMENT_REQUIREMENTS: DocumentRequirement[] = [
  {
    id: 'doc-1',
    name: 'Form 138 / SF9 (Junior High School Report Card)',
    code: 'DEPED-SF9-JHS',
    category: 'Academic Credential',
    description: 'Official original Form 138 with 12-digit LRN, complete quarterly ratings, and Junior High School General Average (91.50).',
    status: 'Verified',
    dateSubmitted: 'August 14, 2026',
    dateVerified: 'August 14, 2026',
    verifiedBy: 'Maria Elena R. Registrar (Registrar II)',
    trackingRef: 'SF9-JHS-303035-2026-082',
    fileSize: '412 KB (Scanned SECPA Authenticated)',
    archiveLocation: 'Registrar Vault 2 · Cabinet C-04 · 201 File Folder #082',
    remarks: 'Original authenticated copy submitted. Eligible for admission to Grade 11.',
  },
  {
    id: 'doc-2',
    name: 'PSA Authenticated Birth Certificate',
    code: 'PSA-SECPA-BC',
    category: 'Civil Registry',
    description: 'Philippine Statistics Authority (PSA) issued Birth Certificate on Security Paper (SECPA) with official barcoded seal.',
    status: 'Verified',
    dateSubmitted: 'August 14, 2026',
    dateVerified: 'August 14, 2026',
    verifiedBy: 'Records & Verification Section',
    trackingRef: 'PSA-B-2009-4410982-NAGA',
    fileSize: '528 KB (High-Res Digital Archive)',
    archiveLocation: 'Registrar Vault 2 · Cabinet C-04 · 201 File Folder #082',
    remarks: 'Civil Registry Number 2009-0822-NAGA. SECPA security fibers validated.',
  },
  {
    id: 'doc-3',
    name: 'Certificate of Good Moral Character',
    code: 'DEPED-GMC-CLR',
    category: 'Institutional Clearance',
    description: 'Official institutional clearance certifying exemplary student deportment, zero disciplinary actions, and honorable dismissal.',
    status: 'Verified',
    dateSubmitted: 'August 14, 2026',
    dateVerified: 'August 14, 2026',
    verifiedBy: 'Mrs. R. Mendoza, RGC (Guidance Office)',
    trackingRef: 'GMC-2026-NAGA-0914',
    fileSize: '298 KB (Digital Clearance PDF)',
    archiveLocation: 'Registrar Vault 2 · Cabinet C-04 · 201 File Folder #082',
    remarks: 'Certified by Junior High School Prefect of Discipline and School Head.',
  },
  {
    id: 'doc-4',
    name: 'Recent 2×2 ID Photos (White Background)',
    code: 'BIO-PHOTO-2X2',
    category: 'Biometric / Identification',
    description: 'Studio-captured colored portraits with white background, standard collar, and standard DepEd learner nameplate.',
    status: 'Verified',
    dateSubmitted: 'August 14, 2026',
    dateVerified: 'August 14, 2026',
    verifiedBy: 'ICT & ID Production Management',
    trackingRef: 'DIGI-ID-2026-1195168',
    fileSize: '1.2 MB (Digital Master PNG & Print Hardcopy)',
    archiveLocation: 'Archived in Physical 201 File & Digital ID System',
    remarks: 'Encoded onto official student smart ID card and turnstile gate pass system.',
  },
  {
    id: 'doc-5',
    name: 'Medical Clearance & Health Appraisal Form',
    code: 'CLINIC-MED-CLR',
    category: 'Health & Physical',
    description: 'School clinic health screening appraisal, vaccination verification, and emergency contact registry.',
    status: 'Completed',
    dateSubmitted: 'August 18, 2026',
    dateVerified: 'August 18, 2026',
    verifiedBy: 'School Clinic Nurse / Medical Officer',
    trackingRef: 'CLINIC-CLR-2026-7844',
    fileSize: '340 KB (Medical Card & Chart)',
    archiveLocation: 'School Clinic Health Vault & Registrar 201 Copy',
    remarks: 'Certified fit for secondary academic instruction and computer workshop laboratories.',
  },
];

export const StudentRequirementsPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedDoc, setSelectedDoc] = useState<DocumentRequirement | null>(null);
  const [documentRequirements, setDocumentRequirements] = useState<DocumentRequirement[]>(DOCUMENT_REQUIREMENTS);

  const learnerName = user?.full_name || 'Jorvin Pengoc';
  const learnerLrn = user?.student_lrn || '11951680082';
  const learnerGrade = user?.student_grade || 'Grade 11';
  const learnerSection = user?.student_section || 'Section Almario';
  const learnerStrand = user?.student_strand || 'TVL - ICT';
  const schoolYear = '2026–2027';

  useEffect(() => {
    async function loadStudentDocuments() {
      try {
        const studentId = user?.student_id || user?.id;
        const cleanEmail = (user?.email || '').trim().toLowerCase();
        const cleanLrn = (user?.student_lrn || '').trim();

        let sQuery = supabase.from('students').select('*');
        if (studentId) {
          sQuery = sQuery.or(`id.eq.${studentId},email.ilike.${cleanEmail},lrn.eq.${cleanLrn}`);
        } else {
          sQuery = sQuery.or(`email.ilike.${cleanEmail},lrn.eq.${cleanLrn}`);
        }

        const { data: sRows } = await sQuery.limit(1);
        if (sRows && sRows.length > 0) {
          const s = sRows[0];
          setDocumentRequirements((prev) =>
            prev.map((doc) => {
              if (doc.code === 'DEPED-SF9-JHS' && s.form_138_url) {
                return {
                  ...doc,
                  status: (s.documents_status === 'complete' ? 'Verified' : 'Completed') as any,
                  trackingRef: `SF9-URL-${s.lrn}`,
                  archiveLocation: 'Supabase Cloud Vault · Digital 201 File',
                  remarks: 'Form 138 / SF9 uploaded and verified in cloud database.',
                };
              }
              if (doc.code === 'PSA-SECPA-BC' && s.psa_birth_url) {
                return {
                  ...doc,
                  status: (s.documents_status === 'complete' ? 'Verified' : 'Completed') as any,
                  trackingRef: `PSA-URL-${s.lrn}`,
                  archiveLocation: 'Supabase Cloud Vault · Digital 201 File',
                  remarks: 'PSA Birth Certificate uploaded and verified in cloud database.',
                };
              }
              if (doc.code === 'DEPED-GMC-CLR' && s.good_moral_url) {
                return {
                  ...doc,
                  status: (s.documents_status === 'complete' ? 'Verified' : 'Completed') as any,
                  trackingRef: `GMC-URL-${s.lrn}`,
                  archiveLocation: 'Supabase Cloud Vault · Digital 201 File',
                  remarks: 'Certificate of Good Moral Character uploaded and verified in cloud database.',
                };
              }
              if (doc.code === 'BIO-PHOTO-2X2' && (s.two_by_two_picture_url || s.avatar_url)) {
                return {
                  ...doc,
                  status: (s.documents_status === 'complete' ? 'Verified' : 'Completed') as any,
                  trackingRef: `BIO-URL-${s.lrn}`,
                  archiveLocation: 'Supabase Cloud Vault · Digital ID Profile',
                  remarks: '2x2 ID Photo uploaded and verified in cloud database.',
                };
              }
              return doc;
            })
          );
        }
      } catch (e) {
        console.warn('Student documents load error:', e);
      }
    }

    loadStudentDocuments();
  }, [user]);

  // Export CSV
  const handleExportCsv = () => {
    const csvLines: string[] = [];
    csvLines.push('"PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL"');
    csvLines.push('"OFFICIAL STUDENT DOCUMENTARY COMPLIANCE & 201 FILE AUDIT RECORD"');
    csvLines.push(`"Learner Name:","${learnerName}"`);
    csvLines.push(`"LRN:","${learnerLrn}"`);
    csvLines.push(`"Grade Level & Section:","${learnerGrade} - ${learnerSection}"`);
    csvLines.push(`"Track & Strand:","${learnerStrand}"`);
    csvLines.push(`"School ID:","303035"`);
    csvLines.push(`"Compliance Status:","100% Fully Compliant (5 of 5 Verified)"`);
    csvLines.push(`"Date of Extraction:","${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}"`);
    csvLines.push('""');
    csvLines.push('"Document Name","Code","Category","Tracking Reference","Date Submitted","Date Verified","Verifying Officer","Archive Location","Status","Remarks"');

    documentRequirements.forEach((doc) => {
      csvLines.push([
        `"${doc.name}"`,
        `"${doc.code}"`,
        `"${doc.category}"`,
        `"${doc.trackingRef}"`,
        `"${doc.dateSubmitted}"`,
        `"${doc.dateVerified}"`,
        `"${doc.verifiedBy}"`,
        `"${doc.archiveLocation}"`,
        `"${doc.status}"`,
        `"${doc.remarks}"`,
      ].join(','));
    });

    const csvContent = csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `PLSNHS_Requirements_Audit_${learnerName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Clearance Sheet
  const handlePrint = () => {
    const prevTitle = document.title;
    document.title = `PLSNHS_Documentary_Clearance_${learnerName.replace(/\s+/g, '_')}`;
    window.print();
    setTimeout(() => {
      document.title = prevTitle;
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-16">
      {/* Inline Print Styles */}
      <style>{`
        @media print {
          .no-print,
          #hesChatbotContainer,
          .hes-chatbot-launcher,
          header,
          aside,
          nav {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Screen Control Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display tracking-tight whitespace-nowrap">
            Documentary Requirements
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official DepEd student document compliance status, archive tracking, and registrar clearance · S.Y. {schoolYear}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <PageHeaderNotificationSlot />
        </div>
      </div>

      {/* Learner Demographic & 201 File Archive Strip */}
      <div className="no-print rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-black shrink-0">
              <FolderLock className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm sm:text-base">{learnerName}</span>
                <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  LRN: {learnerLrn}
                </span>
                <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                  201 File: #082
                </span>
              </div>
              <p className="text-slate-500 text-[11.5px] mt-0.5">
                Current Level: <strong className="text-slate-800">{learnerGrade} – {learnerSection}</strong> · <span className="text-[#152e69] font-bold">{learnerStrand}</span> · School ID: <strong>303035</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> DepEd Compliant · Zero Deficiencies
            </span>
          </div>
        </div>
      </div>

      {/* Executive Compliance KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Compliance Rate */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Compliance Status
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-display">100% Complete</p>
            <span className="text-xs font-bold text-emerald-700">5 of 5 Credentials Cleared</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>All mandatory DepEd documents on file</span>
          </div>
        </div>

        {/* Card 2: 201 Permanent File */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Physical 201 File
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-display">Archived &amp; Locked</p>
            <span className="text-xs font-bold text-blue-700">Registrar Vault 2</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Cabinet C-04 · Folder #082</span>
          </div>
        </div>

        {/* Card 3: LIS Encoding Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              DepEd LIS Status
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-display">LIS Validated</p>
            <span className="text-xs font-bold text-amber-700">Division Reconciled</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>DepEd Naga Division Confirmed</span>
          </div>
        </div>

        {/* Card 4: Enrolment Standing */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Academic Clearance
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <p className="text-xl font-black text-slate-900 font-display">Regular Student</p>
            <span className="text-xs font-bold text-purple-700">Zero Academic Holds</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Eligible for all academic honors</span>
          </div>
        </div>
      </div>

      {/* Main Documentary Requirements Audit List */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Mandatory DepEd Admission Requirements Checklist
            </h3>
            <p className="text-xs text-slate-500">
              Individual verification details, security tracking references, and physical archive trail
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-800 font-mono bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl w-fit">
            5 of 5 Documents Cleared
          </span>
        </div>

        <div className="space-y-3">
          {documentRequirements.map((doc) => (
            <div
              key={doc.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 hover:shadow-md transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shrink-0">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
                        {doc.name}
                      </h4>
                      <Badge variant="success" size="sm">
                        {doc.status}
                      </Badge>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                        {doc.code}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {doc.description}
                    </p>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-2 flex-wrap">
                      <span>Verified: <strong className="text-slate-800">{doc.dateVerified}</strong></span>
                      <span>•</span>
                      <span>By: <strong className="text-slate-800">{doc.verifiedBy}</strong></span>
                      <span>•</span>
                      <span>Tracking Ref: <strong className="font-mono text-slate-700">{doc.trackingRef}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedDoc(doc)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5 text-slate-500" />
                    <span>View Audit Trail</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Official DepEd 201 File Attestation & Tri-Signatory Block */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
        <div className="text-xs text-slate-700 leading-relaxed space-y-1">
          <p className="font-bold text-slate-900 uppercase tracking-wide text-[11px]">
            Official Registrar 201 File Attestation:
          </p>
          <p>
            This document certifies that the student permanent record folder (DepEd 201 File) of <strong>{learnerName.toUpperCase()}</strong> (LRN: <span className="font-mono font-bold text-slate-900">{learnerLrn}</span>) of <strong>{learnerGrade} – {learnerSection}</strong> has been fully audited, validated, and cleared by the Office of the School Registrar. All mandatory requirements under DepEd Order No. 3, s. 2018 (Basic Education Enrolment Policy) are authenticated, complete, and on permanent archive with Placido L. Señor National High School.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-slate-100 text-center text-xs">
          <div>
            <div className="border-b border-slate-300 pb-1 mb-1 font-bold text-slate-950 uppercase text-[11px]">
              MARIA ELENA R. REGISTRAR
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">School Registrar II</span>
            <span className="text-[9px] text-slate-400">Head of Student Records &amp; 201 Archives</span>
          </div>

          <div>
            <div className="border-b border-slate-300 pb-1 mb-1 font-bold text-slate-950 uppercase text-[11px]">
              MR. J. ALMARIO
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Class Adviser</span>
            <span className="text-[9px] text-slate-400">Teacher II · Senior High</span>
          </div>

          <div>
            <div className="border-b border-slate-300 pb-1 mb-1 font-bold text-slate-950 uppercase text-[11px]">
              JUSTINE MANGILA, Dev.Ed.D.
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">School Principal I</span>
            <span className="text-[9px] text-slate-400">School Head / Authorized Officer</span>
          </div>
        </div>
      </div>

      {/* Official Action Controls (Bottom Aligned) */}
      <div className="no-print flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleExportCsv}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 transition-all cursor-pointer active:scale-98"
          title="Download documentary compliance record as CSV"
        >
          <Download className="h-4 w-4 text-slate-500" />
          <span>Export Compliance CSV</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#152e69] hover:bg-[#0f1f4b] px-5 text-xs font-bold text-white shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-98"
          title="Print official documentary clearance certificate"
        >
          <Printer className="h-4 w-4 text-[#F5C518]" />
          <span>Print Clearance Sheet</span>
        </button>
      </div>

      {/* MODAL: VIEW DOCUMENT AUDIT TRAIL */}
      {selectedDoc && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDoc(null)}
          title={`Document Verification Audit Trail`}
        >
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                <CheckCircle2 className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{selectedDoc.name}</h4>
                <p className="text-xs text-emerald-800">Verified &amp; Reconciled in DepEd LIS Database</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
                <span className="font-bold text-slate-900 mt-0.5 block">{selectedDoc.category}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Official Tracking Ref</span>
                <span className="font-mono font-bold text-slate-800 mt-0.5 block">{selectedDoc.trackingRef}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Date Submitted</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{selectedDoc.dateSubmitted}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Date Verified</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{selectedDoc.dateVerified}</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Verifying Officer:</span>
                <strong className="text-slate-900">{selectedDoc.verifiedBy}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Physical Vault Location:</span>
                <span className="text-slate-700">{selectedDoc.archiveLocation}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Digital Scanned Master File:</span>
                <span className="font-mono text-slate-700">{selectedDoc.fileSize}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Official Remarks:</span>
                <span className="text-slate-700">{selectedDoc.remarks}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#152e69] text-white hover:bg-[#0f1f4b] cursor-pointer"
              >
                Close Audit Details
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
