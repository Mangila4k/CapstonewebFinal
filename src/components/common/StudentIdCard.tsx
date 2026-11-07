import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { GraduationCap, Phone, Shield, Camera } from 'lucide-react';
import { saveStudentQrToSupabase } from '../../lib/studentQrService';

export interface StudentIdCardData {
  id?: string | number;
  student_id?: string | number;
  lrn?: string;
  first_name?: string;
  last_name?: string;
  fullname?: string;
  grade_level?: string;
  level_category?: string;
  strand?: string;
  photo_url?: string;
  parent_name?: string;
  parent_contact?: string;
  principal_name?: string;
  school_year?: string;
  qrPayload?: string;
}

export interface StudentIdCardProps {
  data: StudentIdCardData;
  side?: 'front' | 'back' | 'both';
  flipped?: boolean;
  scale?: number;
  className?: string;
  frontId?: string;
  backId?: string;
  showFaceTag?: boolean;
  layout?: 'row' | 'column';
}

export const StudentIdCard: React.FC<StudentIdCardProps> = ({
  data,
  side = 'both',
  flipped = false,
  scale = 1,
  className = '',
  frontId = 'cardFrontElement',
  backId = 'cardBackElement',
  showFaceTag = true,
  layout = 'column',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Computations
  const defaultSchoolYear = '2026-2027';
  const defaultPrincipal = 'Dr. Ryan R. Quiroga';

  const isBlankTemplate =
    data.id === 'blank' ||
    (data.fullname === '' && !data.first_name && !data.last_name) ||
    data.fullname === 'Select a Student';

  const fullName =
    data.fullname !== undefined && data.fullname !== 'Select a Student'
      ? data.fullname
      : isBlankTemplate
      ? ''
      : `${data.first_name || ''} ${data.last_name || ''}`.trim();

  const lrn = data.lrn !== undefined && data.lrn !== '' ? data.lrn : isBlankTemplate ? '____________________' : '—';
  const schoolYear = data.school_year || defaultSchoolYear;
  const principalName = data.principal_name || defaultPrincipal;
  const parentName =
    data.parent_name !== undefined && data.parent_name !== ''
      ? data.parent_name
      : isBlankTemplate
      ? '____________________'
      : '—';
  const parentContact =
    data.parent_contact !== undefined && data.parent_contact !== ''
      ? data.parent_contact
      : isBlankTemplate
      ? '____________________'
      : '—';

  // Compute Grade/Department details
  const rawGrade = String(data.level_category || data.grade_level || 'Junior High');
  const numMatch = rawGrade.match(/\d+/);
  const gradeNum = numMatch ? parseInt(numMatch[0], 10) : null;
  const isSenior = gradeNum !== null ? gradeNum >= 11 : rawGrade.toLowerCase().includes('senior');

  const levelVal = isSenior ? 'Senior High' : 'Junior High';
  const cleanStrand = (data.strand || '').trim();
  const deptPill = isSenior && cleanStrand ? cleanStrand.toUpperCase() : isSenior ? 'SHS' : 'JHS';

  // Student initial for photo fallback
  const getInitial = (name: string) => {
    const clean = name.trim().replace(/^[^a-zA-Z0-9]+/, '');
    return clean ? clean.charAt(0).toUpperCase() : '—';
  };

  // Generate QR Code
  useEffect(() => {
    let payload = data.qrPayload;
    if (!payload) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      payload = `${origin}/verify-id?lrn=${encodeURIComponent(lrn)}&name=${encodeURIComponent(fullName)}&grade=${encodeURIComponent(levelVal)}`;
    }

    QRCode.toDataURL(payload, {
      width: 250,
      margin: 1,
      color: {
        dark: '#162d6b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setQrDataUrl(url);
        if (
          data.id &&
          data.id !== 'blank' &&
          lrn &&
          lrn !== '____________________' &&
          lrn !== '—'
        ) {
          saveStudentQrToSupabase({ id: data.id, lrn }, payload).catch(() => {});
        }
      })
      .catch((err) => {
        console.warn('QRCode generation fallback:', err);
        const encoded = encodeURIComponent(payload);
        setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encoded}&color=16-45-107`);
      });
  }, [data.qrPayload, lrn, fullName, levelVal]);

  const renderCornerWaveDesign = (uid: string) => (
    <svg
      className="id-corner-waves"
      viewBox="0 0 500 316"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`goldOuter-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d061" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#d49b27" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#f5b72e" stopOpacity="0.45" />
        </linearGradient>
        <linearGradient id={`goldInner-${uid}`} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.75" />
          <stop offset="50%" stopColor="#c4962c" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#926515" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={`blueOuter-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0a1940" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#16377e" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#0d2154" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id={`blueCap-${uid}`} x1="0%" y1="0%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#081538" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#132c68" stopOpacity="0.75" />
        </linearGradient>
      </defs>

      {/* Top-Left Sleek Corner Wave */}
      <g>
        {/* Outer slender gold trim */}
        <path
          d="M 0,0 L 142,0 C 132,28 112,46 82,52 C 44,60 12,86 0,152 Z"
          fill={`url(#goldOuter-${uid})`}
        />
        {/* Soft royal blue band */}
        <path
          d="M 0,0 L 134,0 C 124,25 105,41 76,47 C 39,55 9,80 0,142 Z"
          fill={`url(#blueOuter-${uid})`}
        />
        {/* Delicate inner gold hairline swoosh */}
        <path
          d="M 0,104 C 10,66 36,44 96,26 C 52,44 16,69 0,126 Z"
          fill={`url(#goldInner-${uid})`}
        />
        {/* Inner slender gold ribbon */}
        <path
          d="M 0,0 L 82,0 C 72,22 55,34 33,44 C 12,53 3,74 0,102 Z"
          fill={`url(#goldInner-${uid})`}
        />
        {/* Top-left deep navy cap */}
        <path
          d="M 0,0 L 72,0 C 62,19 47,29 27,38 C 9,46 2,65 0,88 Z"
          fill={`url(#blueCap-${uid})`}
        />
      </g>

      {/* Bottom-Right Sleek Corner Wave */}
      <g transform="rotate(180 250 158)">
        <path
          d="M 0,0 L 142,0 C 132,28 112,46 82,52 C 44,60 12,86 0,152 Z"
          fill={`url(#goldOuter-${uid})`}
        />
        <path
          d="M 0,0 L 134,0 C 124,25 105,41 76,47 C 39,55 9,80 0,142 Z"
          fill={`url(#blueOuter-${uid})`}
        />
        <path
          d="M 0,104 C 10,66 36,44 96,26 C 52,44 16,69 0,126 Z"
          fill={`url(#goldInner-${uid})`}
        />
        <path
          d="M 0,0 L 82,0 C 72,22 55,34 33,44 C 12,53 3,74 0,102 Z"
          fill={`url(#goldInner-${uid})`}
        />
        <path
          d="M 0,0 L 72,0 C 62,19 47,29 27,38 C 9,46 2,65 0,88 Z"
          fill={`url(#blueCap-${uid})`}
        />
      </g>
    </svg>
  );

  const frontCard = (
    <div key="front" className="id-badge-unit" id="unitFront">
      <div className="student-id-card id-card-front" id={frontId}>
        {/* Blue & Gold Wavy Corner Ribbon Overlay */}
        {renderCornerWaveDesign(`${frontId}-front`)}

        {/* Background Watermark Logo */}
        <div className="id-bg-watermark">
          <img
            className="id-watermark-img"
            src="/pictures/logo sa skwelahan.png"
            alt="School Seal Watermark"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {/* Top Header Row */}
        <div className="id-front-header-row">
          <img
            className="id-school-logo"
            src="/pictures/logo sa skwelahan.png"
            alt="School Seal"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="id-school-info">
            <div className="id-school-title">Placido L. Señor National High School</div>
            <div className="id-school-subtitle">OFFICIAL STUDENT ID</div>
          </div>
        </div>

        {/* Body Row: Photo + Metadata */}
        <div className="id-card-body-row">
          <div className="id-photo-box">
            {data.photo_url ? (
              <img
                src={data.photo_url}
                alt={fullName || 'Student Photo'}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : isBlankTemplate && !fullName ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-slate-300 p-2 text-center select-none">
                <Camera className="h-8 w-8 text-[#f5b72e]/80 mb-1" />
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#f5b72e]">2x2 PHOTO</span>
                <span className="text-[8px] text-slate-300 font-medium">AFFIX HERE</span>
              </div>
            ) : (
              <div className="id-photo-initial">{getInitial(fullName || '—')}</div>
            )}
          </div>

          <div className="id-student-info">
            <div className="id-student-fullname">
              {fullName ? (
                fullName
              ) : (
                <div className="border-b-2 border-dashed border-[#f5b72e]/60 min-w-[200px] h-7 flex items-end">
                  <span className="text-xs text-slate-300 italic font-normal">Student Full Name</span>
                </div>
              )}
            </div>

            <div className="id-meta-list">
              <div className="id-meta-item">
                <span className="id-meta-lbl">LRN:</span>
                <span className="id-meta-val">{lrn}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row: Principal & QR Code */}
        <div className="id-card-bottom-row">
          <div className="id-principal-wrap">
            <div className="id-principal-sig">{principalName}</div>
            <div className="id-principal-title">SCHOOL PRINCIPAL</div>
          </div>

          <div className="id-qr-box-wrap">
            <div className="id-qr-code-box">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Student QR Code" />
              ) : (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#162d6b] border-t-transparent" />
              )}
            </div>
          </div>
        </div>
      </div>
      {showFaceTag && <span className="card-face-tag">Front Side</span>}
    </div>
  );

  const backCard = (
    <div key="back" className="id-badge-unit" id="unitBack">
      <div className="student-id-card id-card-back" id={backId}>
        {/* Blue & Gold Wavy Corner Ribbon Overlay */}
        {renderCornerWaveDesign(`${backId}-back`)}

        {/* Background Watermark Logo */}
        <div className="id-bg-watermark">
          <img
            className="id-watermark-img"
            src="/pictures/logo sa skwelahan.png"
            alt="School Seal Watermark"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        {/* Top Header */}
        <div className="id-back-header">
          <div className="id-back-header-left">
            <img
              className="id-back-logo"
              src="/pictures/logo sa skwelahan.png"
              alt="School Seal"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <div className="id-back-school-name">PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL</div>
              <div className="id-back-school-sub">Langtad, City of Naga, Cebu • School ID: 303035</div>
            </div>
          </div>
        </div>

        {/* Body Grid: 2 Columns */}
        <div className="id-back-body-grid">
          {/* Left Column: Academic & Emergency */}
          <div className="id-back-col">
            <div className="id-back-level-card">
              <div className="id-back-level-hdr">
                <GraduationCap className="h-2.5 w-2.5 inline text-[#f5b72e]" /> ACADEMIC CLASSIFICATION
              </div>
              <div className="id-back-level-row">
                <span className="id-back-level-main">{levelVal}</span>
                <span className="id-back-level-pill">{deptPill}</span>
              </div>
            </div>

            <div className="id-back-section-title">
              <Phone className="h-2.5 w-2.5 inline text-[#f5b72e]" /> IN CASE OF EMERGENCY
            </div>
            <div className="id-back-field">
              <span className="id-back-field-lbl">Parent / Guardian:</span>
              <span className="id-back-field-val">{parentName}</span>
            </div>
            <div className="id-back-field">
              <span className="id-back-field-lbl">Emergency Contact:</span>
              <span className="id-back-field-val">{parentContact}</span>
            </div>

            {/* Signature Block */}
            <div className="id-back-sig-box">
              <div className="id-back-sig-line"></div>
              <div className="id-back-sig-name">
                {fullName ? fullName.toUpperCase() : 'STUDENT SIGNATURE OVER PRINTED NAME'}
              </div>
              <div className="id-back-sig-role">STUDENT SIGNATURE</div>
            </div>
          </div>

          {/* Right Column: Reminders */}
          <div className="id-back-col">
            <div className="id-back-section-title">
              <Shield className="h-2.5 w-2.5 inline text-[#f5b72e]" /> IMPORTANT REMINDERS
            </div>
            <ul className="id-back-rules-list">
              <li>This card is official school property and non-transferable.</li>
              <li>Must be worn visibly at all times within school grounds.</li>
              <li>Use QR code on front for gate attendance tracking.</li>
              <li>Report immediately to the Principal&apos;s Office if lost.</li>
              <li>If found, return to PLSNHS, Langtad, Naga, Cebu.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="id-back-footer">
          <span>PROPERTY OF PLSNHS • OFFICIAL STUDENT IDENTIFICATION</span>
          <span>
            VALID S.Y. <span className="text-[#f5b72e] font-extrabold">{schoolYear}</span>
          </span>
        </div>
      </div>
      {showFaceTag && <span className="card-face-tag">Back Side</span>}
    </div>
  );

  const units = side === 'front' ? [frontCard] : side === 'back' ? [backCard] : flipped ? [backCard, frontCard] : [frontCard, backCard];

  const scaleStyle: React.CSSProperties = scale !== 1 ? {
    transform: `scale(${scale})`,
    transformOrigin: 'top center',
  } : {};

  return (
    <div
      className={`printable-id-card-area id-showcase-container ${
        layout === 'row' ? 'side-by-side' : ''
      } ${className}`}
      style={scaleStyle}
    >
      {units}
    </div>
  );
};
