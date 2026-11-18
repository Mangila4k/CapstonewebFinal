import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'local-api-send-otp',
      configureServer(server) {
        server.middlewares.use('/api/send-otp', async (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const { to_email, to_name, code } = JSON.parse(body || '{}');
                const nodemailer = await import('nodemailer');
                const transporter = nodemailer.default.createTransport({
                  host: 'smtp.gmail.com',
                  port: 465,
                  secure: true,
                  auth: {
                    user: 'myleneraganas@gmail.com',
                    pass: 'xcppozrjglmtrnks',
                  },
                });
                await transporter.sendMail({
                  from: '"Placido L. Señor National High School" <myleneraganas@gmail.com>',
                  to: to_email,
                  subject: `🔐 Your 6-Digit Password Reset Code: ${code}`,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 16px;">
                      <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="color: #1B2A4A; margin: 0 0 6px 0; font-size: 20px;">Placido L. Señor National High School</h2>
                        <p style="margin: 0; color: #64748B; font-size: 13px;">Account Security · One-Time Verification Code</p>
                      </div>
                      <p style="font-size: 14px; margin: 16px 0; line-height: 1.6;">Hello <strong>${to_name || 'Learner'}</strong>,</p>
                      <p style="font-size: 14px; margin: 16px 0; line-height: 1.6;">We received a request to reset your password. Use your 6-digit verification code below to verify your account:</p>
                      <div style="background: #1B2A4A; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
                        <p style="margin: 0 0 6px 0; color: #94A3B8; font-size: 11px; text-transform: uppercase; letter-spacing: 2px;">Your 6-Digit OTP Code</p>
                        <div style="font-family: 'Courier New', Courier, monospace; font-size: 40px; font-weight: 900; letter-spacing: 12px; color: #FBBF24;">
                          ${code}
                        </div>
                        <p style="margin: 8px 0 0 0; color: #94A3B8; font-size: 11px;">Expires in 15 minutes</p>
                      </div>
                      <p style="font-size: 12px; color: #64748B; line-height: 1.5;">Never share this code with anyone. If you did not request a password reset, you can safely ignore this email.</p>
                    </div>
                  `,
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
              } catch (e: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
              }
            });
          }
        });

        server.middlewares.use('/api/send-enrollment-email', async (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const {
                  to_email,
                  to_name,
                  recipient_role = 'student',
                  student_name,
                  lrn,
                  grade_level,
                  strand,
                  section_name,
                  username,
                  password,
                  portal_url,
                } = JSON.parse(body || '{}');

                if (!to_email || !password) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'Missing to_email or password' }));
                  return;
                }

                const nodemailer = await import('nodemailer');
                const transporter = nodemailer.default.createTransport({
                  host: 'smtp.gmail.com',
                  port: 465,
                  secure: true,
                  auth: {
                    user: 'myleneraganas@gmail.com',
                    pass: 'xcppozrjglmtrnks',
                  },
                });

                const isParent = String(recipient_role).toLowerCase() === 'parent';
                const safeRecipientName = to_name || (isParent ? 'Parent / Guardian' : 'Learner');
                const safeStudentName = student_name || safeRecipientName;
                const loginIdentifier = username || to_email;
                const loginUrl = portal_url || 'http://localhost:5173/login';
                const classLabel = [
                  grade_level || 'Enrolled Grade',
                  section_name ? `Section ${section_name}` : null,
                  strand && strand !== 'General' ? `(${strand})` : null,
                ]
                  .filter(Boolean)
                  .join(' · ');

                const subject = isParent
                  ? `👨‍👩‍👧 Official Enrollment Approved & Parent Portal Credentials (${safeStudentName}) — PLSNHS`
                  : `✅ Official Enrollment Approved & Student Portal Credentials — PLSNHS`;

                const html = isParent
                  ? `
                    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; background: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 16px;">
                      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 18px; border-bottom: 2px solid #f1f5f9;">
                        <div style="display: inline-block; width: 64px; height: 64px; border-radius: 50%; background: #DCFCE7; line-height: 64px; font-size: 32px; margin-bottom: 8px;">👨‍👩‍👧</div>
                        <h2 style="color: #1B2A4A; margin: 0 0 6px 0; font-size: 20px; font-weight: 800;">Placido L. Señor National High School</h2>
                        <p style="margin: 0; color: #64748B; font-size: 13px;">Official Parent &amp; Guardian Portal · Enrollment Confirmation</p>
                      </div>
                      <p style="font-size: 15px; margin: 0 0 14px 0; line-height: 1.6;">Dear <strong>${safeRecipientName}</strong>,</p>
                      <p style="font-size: 14px; margin: 0 0 18px 0; line-height: 1.6; color: #334155;">
                        We are pleased to inform you that the enrollment application of your child/ward, <strong>${safeStudentName}</strong>, at <strong>Placido L. Señor National High School</strong> has been officially <strong style="color: #16A34A;">APPROVED</strong>.
                      </p>
                      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 18px; margin: 18px 0;">
                        <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Enrolled Learner Details</p>
                        <p style="margin: 4px 0; font-size: 14px; color: #0F172A;"><strong>Learner Name:</strong> ${safeStudentName}</p>
                        ${lrn ? `<p style="margin: 4px 0; font-size: 14px; color: #0F172A;"><strong>LRN:</strong> <span style="font-family: monospace;">${lrn}</span></p>` : ''}
                        <p style="margin: 4px 0; font-size: 14px; color: #0F172A;"><strong>Grade &amp; Section:</strong> ${classLabel}</p>
                      </div>
                      <div style="background: #0f172a; border: 2px solid #fbbf24; border-radius: 14px; padding: 22px; margin: 22px 0; color: #ffffff;">
                        <p style="margin: 0 0 12px 0; color: #fbbf24; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800;">🔐 Your Parent / Guardian Portal Login Credentials</p>
                        <p style="margin: 6px 0; font-size: 14px; color: #e2e8f0;">
                          <strong>Username (Gmail):</strong><br/>
                          <span style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: #ffffff;">${loginIdentifier}</span>
                        </p>
                        <p style="margin: 12px 0 0 0; font-size: 14px; color: #e2e8f0;">
                          <strong>Temporary Password:</strong><br/>
                          <span style="display: inline-block; margin-top: 4px; background: rgba(251, 191, 36, 0.15); border: 1px solid #fbbf24; padding: 6px 12px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 18px; font-weight: 900; color: #fbbf24;">${password}</span>
                        </p>
                      </div>
                      <p style="font-size: 13.5px; margin: 0 0 18px 0; line-height: 1.6; color: #334155;">
                        Log in at <a href="${loginUrl}" style="color: #1d4ed8; font-weight: 700;">${loginUrl}</a> to monitor your child's attendance, quarterly grades, and school announcements.
                      </p>
                    </div>
                  `
                  : `
                    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; background: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 16px;">
                      <div style="text-align: center; margin-bottom: 24px; padding-bottom: 18px; border-bottom: 2px solid #f1f5f9;">
                        <div style="display: inline-block; width: 64px; height: 64px; border-radius: 50%; background: #DCFCE7; line-height: 64px; font-size: 32px; margin-bottom: 8px;">✅</div>
                        <h2 style="color: #1B2A4A; margin: 0 0 6px 0; font-size: 20px; font-weight: 800;">Placido L. Señor National High School</h2>
                        <p style="margin: 0; color: #64748B; font-size: 13px;">Official Student Portal · Enrollment Approved</p>
                      </div>
                      <p style="font-size: 15px; margin: 0 0 14px 0; line-height: 1.6;">Hello <strong>${safeRecipientName}</strong>,</p>
                      <p style="font-size: 14px; margin: 0 0 18px 0; line-height: 1.6; color: #334155;">
                        Congratulations! Your enrollment application at <strong>Placido L. Señor National High School</strong> has been officially <strong style="color: #16A34A;">APPROVED</strong>.
                      </p>
                      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 18px; margin: 18px 0;">
                        <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase;">Official Enrollment Assignment</p>
                        <p style="margin: 4px 0; font-size: 14px; color: #0F172A;"><strong>Learner Name:</strong> ${safeStudentName}</p>
                        ${lrn ? `<p style="margin: 4px 0; font-size: 14px; color: #0F172A;"><strong>LRN:</strong> <span style="font-family: monospace;">${lrn}</span></p>` : ''}
                        <p style="margin: 4px 0; font-size: 14px; color: #0F172A;"><strong>Grade &amp; Section:</strong> ${classLabel}</p>
                      </div>
                      <div style="background: #0f172a; border: 2px solid #fbbf24; border-radius: 14px; padding: 22px; margin: 22px 0; color: #ffffff;">
                        <p style="margin: 0 0 12px 0; color: #fbbf24; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800;">🔐 Your Student Portal Login Credentials</p>
                        <p style="margin: 6px 0; font-size: 14px; color: #e2e8f0;">
                          <strong>Username (Gmail):</strong><br/>
                          <span style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: #ffffff;">${loginIdentifier}</span>
                        </p>
                        <p style="margin: 12px 0 0 0; font-size: 14px; color: #e2e8f0;">
                          <strong>Temporary Password:</strong><br/>
                          <span style="display: inline-block; margin-top: 4px; background: rgba(251, 191, 36, 0.15); border: 1px solid #fbbf24; padding: 6px 12px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 18px; font-weight: 900; color: #fbbf24;">${password}</span>
                        </p>
                      </div>
                      <p style="font-size: 13.5px; margin: 0 0 18px 0; line-height: 1.6; color: #334155;">
                        Log in at <a href="${loginUrl}" style="color: #1d4ed8; font-weight: 700;">${loginUrl}</a> to view your class schedule, QR gate pass, attendance logs, and academic records.
                      </p>
                    </div>
                  `;

                await transporter.sendMail({
                  from: '"Placido L. Señor National High School" <myleneraganas@gmail.com>',
                  to: to_email,
                  subject,
                  html,
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
              } catch (e: any) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
              }
            });
          }
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: false,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  }
});
