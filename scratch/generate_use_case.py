import os
import subprocess
import shutil

def generate_use_case_html():
    canvas_w = 1800
    canvas_h = 1350

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Placido L. Señor NHS - UML Use Case Model</title>
    <style>
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        body {{
            background-color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            width: {canvas_w}px;
            height: {canvas_h}px;
            position: relative;
            overflow: hidden;
            -webkit-font-smoothing: antialiased;
        }}
        .canvas {{
            width: {canvas_w}px;
            height: {canvas_h}px;
            position: absolute;
            left: 0;
            top: 0;
            background: #ffffff;
        }}
        .header-banner {{
            position: absolute;
            left: 30px;
            top: 14px;
            right: 30px;
            height: 48px;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 6px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 1px 2px rgba(0,0,0,0.03);
            z-index: 50;
        }}
        .header-left h4 {{
            font-size: 8.5px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.8px;
        }}
        .header-left h1 {{
            font-size: 13.5px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 1px;
            letter-spacing: -0.2px;
        }}
        .legend {{
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 9.5px;
            font-weight: 700;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 4px 10px;
        }}
        .legend-item {{
            display: flex;
            align-items: center;
            gap: 5px;
        }}
        .system-boundary {{
            position: absolute;
            left: 250px;
            top: 75px;
            width: 1300px;
            height: 1245px;
            border: 2px dashed #94a3b8;
            border-radius: 12px;
            background: #fbfcfe;
            z-index: 10;
        }}
        .system-boundary-title {{
            position: absolute;
            top: 10px;
            left: 20px;
            font-size: 12px;
            font-weight: 800;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 3px 10px;
            border-radius: 4px;
        }}
        /* Subsystem Containers */
        .subsystem-box {{
            position: absolute;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background: #ffffff;
            padding: 12px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }}
        .subsystem-header {{
            font-size: 10.5px;
            font-weight: 800;
            color: #152e69;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
            border-bottom: 1.5px solid #e2e8f0;
            padding-bottom: 4px;
        }}
        .subsystem-header .badge {{
            background: #152e69;
            color: #ffffff;
            font-size: 8.5px;
            padding: 1px 5px;
            border-radius: 3px;
        }}
        /* Use Case Ovals */
        .use-case-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        }}
        .use-case {{
            background: #f8fafc;
            border: 1.2px solid #334155;
            border-radius: 18px;
            padding: 6px 12px;
            text-align: center;
            font-size: 10px;
            font-weight: 700;
            color: #0f172a;
            box-shadow: 0 1px 2px rgba(0,0,0,0.03);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 38px;
            line-height: 1.25;
            transition: all 0.2s;
        }}
        .use-case .code {{
            font-size: 8px;
            font-weight: 800;
            color: #152e69;
            margin-right: 4px;
            font-family: Consolas, monospace;
        }}
        /* Actor Cards */
        .actor-card {{
            position: absolute;
            width: 190px;
            background: #ffffff;
            border: 1.5px solid #334155;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            z-index: 40;
            text-align: center;
        }}
        .actor-icon-svg {{
            width: 32px;
            height: 32px;
            margin: 0 auto 4px auto;
            display: block;
        }}
        .actor-title {{
            font-size: 11px;
            font-weight: 800;
            color: #0f172a;
        }}
        .actor-subtitle {{
            font-size: 8.5px;
            color: #64748b;
            font-weight: 600;
            margin-top: 1px;
        }}
        .actor-roles {{
            margin-top: 4px;
            display: flex;
            flex-wrap: wrap;
            gap: 3px;
            justify-content: center;
        }}
        .role-pill {{
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            color: #334155;
            font-size: 7.5px;
            font-weight: 700;
            padding: 1px 4px;
            border-radius: 3px;
        }}
        svg.connectors {{
            position: absolute;
            left: 0;
            top: 0;
            width: {canvas_w}px;
            height: {canvas_h}px;
            pointer-events: none;
            z-index: 25;
        }}
    </style>
</head>
<body>
    <div class="canvas">
        <!-- Header Banner -->
        <div class="header-banner">
            <div class="header-left">
                <h4>Republic of the Philippines • Department of Education • Region VII</h4>
                <h1>PLACIDO L. SEÑOR NATIONAL HIGH SCHOOL — UML USE CASE MODEL</h1>
            </div>
            <div class="legend">
                <div class="legend-item"><span style="width:12px;height:12px;border:1.2px solid #334155;border-radius:6px;display:inline-block;background:#f8fafc;"></span> Use Case</div>
                <div class="legend-item"><span style="width:14px;border-top:1.5px solid #475569;display:inline-block;"></span> Primary Association</div>
                <div class="legend-item"><span style="width:14px;border-top:1.5px dashed #0284c7;display:inline-block;"></span> &laquo;include&raquo; / &laquo;extend&raquo;</div>
                <div class="legend-item" style="color:#152e69;">System Scope: 6 Actors • 5 Subsystems • 25 Use Cases</div>
            </div>
        </div>

        <!-- Left Actors (Learners & Stakeholders) -->
        <!-- Student -->
        <div class="actor-card" style="left: 30px; top: 120px;">
            <svg class="actor-icon-svg" viewBox="0 0 24 24" fill="none" stroke="#152e69" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="7" r="4"/><path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2"/>
            </svg>
            <div class="actor-title">Student Learner</div>
            <div class="actor-subtitle">Enrolled JHS / SHS Learner</div>
            <div class="actor-roles">
                <span class="role-pill">Primary Actor</span>
                <span class="role-pill">Student Portal</span>
            </div>
        </div>

        <!-- Parent / Guardian -->
        <div class="actor-card" style="left: 30px; top: 520px;">
            <svg class="actor-icon-svg" viewBox="0 0 24 24" fill="none" stroke="#152e69" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <div class="actor-title">Parent / Guardian</div>
            <div class="actor-subtitle">Learner Support & Monitoring</div>
            <div class="actor-roles">
                <span class="role-pill">Primary Actor</span>
                <span class="role-pill">Parent Portal</span>
            </div>
        </div>

        <!-- Transferee / Applicant -->
        <div class="actor-card" style="left: 30px; top: 920px;">
            <svg class="actor-icon-svg" viewBox="0 0 24 24" fill="none" stroke="#152e69" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1"/><path d="M18 8l4 4-4 4"/><path d="M8 12h14"/>
            </svg>
            <div class="actor-title">Applicant / Transferee</div>
            <div class="actor-subtitle">New Admission / Returning Learner</div>
            <div class="actor-roles">
                <span class="role-pill">External Actor</span>
                <span class="role-pill">Public Admissions</span>
            </div>
        </div>

        <!-- Right Actors (School Personnel) -->
        <!-- Teacher / Adviser -->
        <div class="actor-card" style="left: 1580px; top: 120px;">
            <svg class="actor-icon-svg" viewBox="0 0 24 24" fill="none" stroke="#152e69" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/>
            </svg>
            <div class="actor-title">Subject Teacher / Adviser</div>
            <div class="actor-subtitle">Instruction, Attendance & Grading</div>
            <div class="actor-roles">
                <span class="role-pill">Internal Actor</span>
                <span class="role-pill">Faculty Portal</span>
            </div>
        </div>

        <!-- School Registrar -->
        <div class="actor-card" style="left: 1580px; top: 440px;">
            <svg class="actor-icon-svg" viewBox="0 0 24 24" fill="none" stroke="#152e69" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M9 21V10"/>
            </svg>
            <div class="actor-title">School Registrar</div>
            <div class="actor-subtitle">Records, Admissions & DepEd SF</div>
            <div class="actor-roles">
                <span class="role-pill">Internal Actor</span>
                <span class="role-pill">Registrar Portal</span>
            </div>
        </div>

        <!-- Guidance Counselor -->
        <div class="actor-card" style="left: 1580px; top: 760px;">
            <svg class="actor-icon-svg" viewBox="0 0 24 24" fill="none" stroke="#152e69" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"/><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M9.5 15a3.5 3.5 0 0 0 5 0"/>
            </svg>
            <div class="actor-title">Guidance Counselor</div>
            <div class="actor-subtitle">Welfare, Counseling & Compliance</div>
            <div class="actor-roles">
                <span class="role-pill">Internal Actor</span>
                <span class="role-pill">Guidance Portal</span>
            </div>
        </div>

        <!-- System Administrator -->
        <div class="actor-card" style="left: 1580px; top: 1070px;">
            <svg class="actor-icon-svg" viewBox="0 0 24 24" fill="none" stroke="#152e69" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            <div class="actor-title">System Administrator</div>
            <div class="actor-subtitle">Accounts, Security & Database</div>
            <div class="actor-roles">
                <span class="role-pill">Superuser</span>
                <span class="role-pill">Admin Portal</span>
            </div>
        </div>

        <!-- System Boundary Box -->
        <div class="system-boundary">
            <div class="system-boundary-title">Placido L. Señor NHS Automated Campus Management System</div>

            <!-- Subsystem 1: Admissions & Enrollment -->
            <div class="subsystem-box" style="left: 20px; top: 40px; width: 610px; height: 260px;">
                <div class="subsystem-header">
                    <span class="badge">PKG-01</span>
                    Admissions &amp; Enrollment Management Subsystem
                </div>
                <div class="use-case-grid">
                    <div class="use-case"><span class="code">UC01</span> Register &amp; Submit Online Enrollment</div>
                    <div class="use-case"><span class="code">UC02</span> Upload Academic Credentials (PSA/F138)</div>
                    <div class="use-case"><span class="code">UC03</span> Verify Documents &amp; Validate LRN</div>
                    <div class="use-case"><span class="code">UC04</span> Section Assignment &amp; Strand Track</div>
                    <div class="use-case"><span class="code">UC05</span> Process Transferee / Returnee Status</div>
                    <div class="use-case"><span class="code">UC06</span> Issue Official Certificate of Enrollment</div>
                </div>
            </div>

            <!-- Subsystem 2: Attendance & Biometrics -->
            <div class="subsystem-box" style="left: 650px; top: 40px; width: 620px; height: 260px;">
                <div class="subsystem-header">
                    <span class="badge">PKG-02</span>
                    Attendance &amp; Biometric Verification Subsystem
                </div>
                <div class="use-case-grid">
                    <div class="use-case"><span class="code">UC07</span> Register Faculty Face Biometrics</div>
                    <div class="use-case"><span class="code">UC08</span> Log Faculty Attendance via Face Kiosk</div>
                    <div class="use-case"><span class="code">UC09</span> Validate GPS Geofence Perimeter Bounds</div>
                    <div class="use-case"><span class="code">UC10</span> Scan Daily Student QR Code Attendance</div>
                    <div class="use-case"><span class="code">UC11</span> Track Daily Absences &amp; Late Incidents</div>
                    <div class="use-case"><span class="code">UC12</span> Generate DepEd SF2 Attendance Register</div>
                </div>
            </div>

            <!-- Subsystem 3: Academic & Curriculum -->
            <div class="subsystem-box" style="left: 20px; top: 320px; width: 610px; height: 260px;">
                <div class="subsystem-header">
                    <span class="badge">PKG-03</span>
                    Academic, Scheduling &amp; Grading Subsystem
                </div>
                <div class="use-case-grid">
                    <div class="use-case"><span class="code">UC13</span> Manage DepEd Learning Areas &amp; Units</div>
                    <div class="use-case"><span class="code">UC14</span> Distribute &amp; Attach Official Class Schedule</div>
                    <div class="use-case"><span class="code">UC15</span> View, Print &amp; Download Timetable File</div>
                    <div class="use-case"><span class="code">UC16</span> Encode Quarterly Grades (Q1–Q4)</div>
                    <div class="use-case"><span class="code">UC17</span> Review Academic Cards &amp; Progress (SF9)</div>
                    <div class="use-case"><span class="code">UC18</span> Endorse Form 137 Permanent Records</div>
                </div>
            </div>

            <!-- Subsystem 4: Guidance & Student Welfare -->
            <div class="subsystem-box" style="left: 650px; top: 320px; width: 620px; height: 260px;">
                <div class="subsystem-header">
                    <span class="badge">PKG-04</span>
                    Guidance, Counseling &amp; Child Protection Subsystem
                </div>
                <div class="use-case-grid">
                    <div class="use-case"><span class="code">UC19</span> Request Counseling Consultation</div>
                    <div class="use-case"><span class="code">UC20</span> File Behavioral Referrals &amp; Incidents</div>
                    <div class="use-case"><span class="code">UC21</span> Conduct Counseling &amp; Formulate Action Plan</div>
                    <div class="use-case"><span class="code">UC22</span> Issue Certificate of Good Moral Character</div>
                    <div class="use-case"><span class="code">UC23</span> Generate Child Protection Compliance Report</div>
                    <div class="use-case"><span class="code">UC24</span> Track Restorative Agreements &amp; Follow-ups</div>
                </div>
            </div>

            <!-- Subsystem 5: Institutional Administration & Portal Services -->
            <div class="subsystem-box" style="left: 20px; top: 600px; width: 1250px; height: 220px;">
                <div class="subsystem-header">
                    <span class="badge">PKG-05</span>
                    Institutional Administration, Security &amp; Portal Services Subsystem
                </div>
                <div class="use-case-grid" style="grid-template-columns: repeat(4, 1fr);">
                    <div class="use-case"><span class="code">UC25</span> Authenticate &amp; Role Access Control</div>
                    <div class="use-case"><span class="code">UC26</span> Manage User Accounts &amp; Credentials</div>
                    <div class="use-case"><span class="code">UC27</span> Generate Digital Student IDs &amp; QR Badges</div>
                    <div class="use-case"><span class="code">UC28</span> Broadcast Campus Announcements</div>
                    <div class="use-case"><span class="code">UC29</span> Audit Security Logs &amp; Activity Trails</div>
                    <div class="use-case"><span class="code">UC30</span> Configure Campus Geofence Locations</div>
                    <div class="use-case"><span class="code">UC31</span> Manage Academic Year &amp; Semester Cycles</div>
                    <div class="use-case"><span class="code">UC32</span> Backup Database &amp; Cloud Synchronization</div>
                </div>
            </div>

            <!-- Detailed Relationship & Association Summary Table -->
            <div style="position: absolute; left: 20px; top: 840px; right: 20px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px;">
                <div style="font-size: 11px; font-weight: 800; color: #152e69; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Actor-to-Subsystem Association Matrix
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 9.5px; text-align: left;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 1.5px solid #cbd5e1; color: #0f172a;">
                            <th style="padding: 6px 10px; font-weight: 800;">Subsystem Package</th>
                            <th style="padding: 6px 10px; font-weight: 800;">Student Learner</th>
                            <th style="padding: 6px 10px; font-weight: 800;">Parent / Guardian</th>
                            <th style="padding: 6px 10px; font-weight: 800;">Teacher / Adviser</th>
                            <th style="padding: 6px 10px; font-weight: 800;">School Registrar</th>
                            <th style="padding: 6px 10px; font-weight: 800;">Guidance Counselor</th>
                            <th style="padding: 6px 10px; font-weight: 800;">System Administrator</th>
                        </tr>
                    </thead>
                    <tbody style="color: #334155;">
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 6px 10px; font-weight: 700; color: #152e69;">PKG-01: Admissions &amp; Enrollment</td>
                            <td style="padding: 6px 10px;">Primary Applicant</td>
                            <td style="padding: 6px 10px;">Guardian Co-Signer</td>
                            <td style="padding: 6px 10px;">View Section Roster</td>
                            <td style="padding: 6px 10px; font-weight: 700; color: #047857;">Primary Approver</td>
                            <td style="padding: 6px 10px;">Clearance Check</td>
                            <td style="padding: 6px 10px;">System Oversight</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 6px 10px; font-weight: 700; color: #152e69;">PKG-02: Attendance &amp; Biometrics</td>
                            <td style="padding: 6px 10px;">QR Presenter</td>
                            <td style="padding: 6px 10px;">View Daily Logs</td>
                            <td style="padding: 6px 10px; font-weight: 700; color: #047857;">Face Log &amp; QR Scanner</td>
                            <td style="padding: 6px 10px;">Export SF2 Register</td>
                            <td style="padding: 6px 10px;">Habitual Absenteeism</td>
                            <td style="padding: 6px 10px;">Geofence Config</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 6px 10px; font-weight: 700; color: #152e69;">PKG-03: Academic &amp; Scheduling</td>
                            <td style="padding: 6px 10px;">View Sched / Grades</td>
                            <td style="padding: 6px 10px;">View Report Card</td>
                            <td style="padding: 6px 10px; font-weight: 700; color: #047857;">Encoder &amp; Sched Distr.</td>
                            <td style="padding: 6px 10px; font-weight: 700; color: #047857;">Custodian &amp; SF9/SF10</td>
                            <td style="padding: 6px 10px;">Academic Advisement</td>
                            <td style="padding: 6px 10px;">Curriculum Builder</td>
                        </tr>
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 6px 10px; font-weight: 700; color: #152e69;">PKG-04: Guidance &amp; Welfare</td>
                            <td style="padding: 6px 10px;">Appointment / Good Moral</td>
                            <td style="padding: 6px 10px;">Conference Attendee</td>
                            <td style="padding: 6px 10px;">Incident Referrer</td>
                            <td style="padding: 6px 10px;">Verify Clearances</td>
                            <td style="padding: 6px 10px; font-weight: 700; color: #047857;">Primary Counselor</td>
                            <td style="padding: 6px 10px;">CPC Compliance</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 10px; font-weight: 700; color: #152e69;">PKG-05: Institutional Admin</td>
                            <td style="padding: 6px 10px;">Digital ID Card</td>
                            <td style="padding: 6px 10px;">Campus Bulletins</td>
                            <td style="padding: 6px 10px;">Workload Profile</td>
                            <td style="padding: 6px 10px;">Official Transcripts</td>
                            <td style="padding: 6px 10px;">Welfare Bulletins</td>
                            <td style="padding: 6px 10px; font-weight: 700; color: #047857;">Full Superuser Control</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- SVG Association Lines -->
        <svg class="connectors" width="{canvas_w}" height="{canvas_h}">
            <!-- Student to PKG-01, PKG-02, PKG-03, PKG-04 -->
            <path d="M 220 160 L 250 160" stroke="#475569" stroke-width="1.5"/>
            <path d="M 220 180 L 270 180 L 270 380 L 290 380" stroke="#475569" stroke-width="1.3"/>
            <path d="M 220 200 L 260 200 L 260 500 L 920 500 L 920 460" stroke="#475569" stroke-width="1.2" stroke-dasharray="4,3"/>

            <!-- Parent to PKG-01, PKG-02, PKG-03 -->
            <path d="M 220 560 L 250 560 L 250 200 L 270 200" stroke="#475569" stroke-width="1.3"/>
            <path d="M 220 580 L 270 580" stroke="#475569" stroke-width="1.3"/>

            <!-- Applicant to PKG-01 -->
            <path d="M 220 960 L 240 960 L 240 220 L 270 220" stroke="#475569" stroke-width="1.3"/>

            <!-- Teacher to PKG-02, PKG-03, PKG-04 -->
            <path d="M 1580 160 L 1550 160 L 1550 180 L 1270 180" stroke="#475569" stroke-width="1.5"/>
            <path d="M 1580 180 L 1540 180 L 1540 400 L 630 400" stroke="#475569" stroke-width="1.3"/>
            <path d="M 1580 200 L 1530 200 L 1530 460 L 1270 460" stroke="#475569" stroke-width="1.3"/>

            <!-- Registrar to PKG-01, PKG-03 -->
            <path d="M 1580 480 L 1540 480 L 1540 240 L 630 240" stroke="#475569" stroke-width="1.3"/>
            <path d="M 1580 500 L 1530 500 L 1530 420 L 630 420" stroke="#475569" stroke-width="1.3"/>

            <!-- Guidance to PKG-04 -->
            <path d="M 1580 800 L 1270 800 L 1270 480" stroke="#475569" stroke-width="1.5"/>

            <!-- Admin to PKG-05, PKG-01, PKG-02 -->
            <path d="M 1580 1110 L 1550 1110 L 1550 720 L 1270 720" stroke="#475569" stroke-width="1.5"/>
        </svg>
    </div>
</body>
</html>
"""
    return html

def main():
    html_str = generate_use_case_html()
    html_path = os.path.abspath("scratch/use_case.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_str)
    print(f"Generated {html_path}")

    temp_png = "C:/Users/mylen/AppData/Local/Temp/use_case_diagram.png"
    public_png = os.path.abspath("public/use_case_diagram.png")
    artifact_png = "C:/Users/mylen/.gemini/antigravity/brain/dc7aecf0-c3d2-4549-97e7-544cdb56c808/use_case_diagram.png"

    chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    file_url = "file:///" + html_path.replace("\\", "/")

    cmd = [
        chrome_path,
        "--headless=new",
        "--disable-gpu",
        "--force-device-scale-factor=2",
        f"--screenshot={temp_png}",
        "--window-size=1800,1350",
        "--hide-scrollbars",
        file_url
    ]

    print("Running headless chrome capture for Use-Case diagram (Retina 2x)...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    print("Chrome exit code:", res.returncode)
    if os.path.exists(temp_png):
        shutil.copyfile(temp_png, public_png)
        shutil.copyfile(temp_png, artifact_png)
        size_kb = os.path.getsize(public_png) // 1024
        print(f"SUCCESS: Saved {public_png} ({size_kb} KB)")
        print(f"SUCCESS: Saved {artifact_png} ({size_kb} KB)")
    else:
        print("ERROR: temp_png was not generated. stderr:", res.stderr)

if __name__ == "__main__":
    main()
