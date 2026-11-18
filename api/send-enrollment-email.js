import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      to_email,
      to_name,
      recipient_role = 'student', // 'student' | 'parent'
      student_name,
      lrn,
      grade_level,
      strand,
      section_name,
      username,
      password,
      portal_url,
    } = req.body || {};

    if (!to_email || !password) {
      return res.status(400).json({ error: 'Missing to_email or password' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER || 'myleneraganas@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD || 'xcppozrjglmtrnks',
      },
    });

    const isParent = String(recipient_role).toLowerCase() === 'parent';
    const safeRecipientName = to_name || (isParent ? 'Parent / Guardian' : 'Learner');
    const safeStudentName = student_name || safeRecipientName;
    const loginIdentifier = username || to_email;
    const loginUrl = portal_url || 'https://plsnhs-portal.vercel.app/login';
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
        <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; background: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px; padding-bottom: 18px; border-bottom: 2px solid #f1f5f9;">
            <div style="display: inline-block; width: 64px; height: 64px; border-radius: 50%; background: #DCFCE7; line-height: 64px; font-size: 32px; margin-bottom: 8px;">👨‍👩‍👧</div>
            <h2 style="color: #1B2A4A; margin: 0 0 6px 0; font-size: 20px; font-weight: 800;">Placido L. Señor National High School</h2>
            <p style="margin: 0; color: #64748B; font-size: 13px;">Official Parent &amp; Guardian Portal · Enrollment Confirmation</p>
          </div>

          <p style="font-size: 15px; margin: 0 0 14px 0; line-height: 1.6;">Dear <strong>${safeRecipientName}</strong>,</p>

          <p style="font-size: 14px; margin: 0 0 18px 0; line-height: 1.6; color: #334155;">
            We are pleased to inform you that the enrollment application of your child/ward, <strong>${safeStudentName}</strong>, at <strong>Placido L. Señor National High School</strong> has been officially <strong style="color: #16A34A;">APPROVED</strong> for the current School Year.
          </p>

          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px 18px; margin: 18px 0;">
            <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">Enrolled Learner Details</p>
            <p style="margin: 4px 0; font-size: 14px; color: #0F172A;"><strong>Learner Name:</strong> ${safeStudentName}</p>
            ${lrn ? `<p style="margin: 4px 0; font-size: 14px; color: #0F172A;"><strong>LRN:</strong> <span style="font-family: monospace;">${lrn}</span></p>` : ''}
            <p style="margin: 4px 0; font-size: 14px; color: #0F172A;"><strong>Grade &amp; Section:</strong> ${classLabel}</p>
          </div>

          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 2px solid #fbbf24; border-radius: 14px; padding: 22px; margin: 22px 0; color: #ffffff;">
            <p style="margin: 0 0 12px 0; color: #fbbf24; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800;">🔐 Your Parent / Guardian Portal Login Credentials</p>
            <p style="margin: 6px 0; font-size: 14px; color: #e2e8f0;">
              <strong>Username (Gmail):</strong><br/>
              <span style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: #ffffff;">${loginIdentifier}</span>
            </p>
            <p style="margin: 12px 0 0 0; font-size: 14px; color: #e2e8f0;">
              <strong>Temporary Password:</strong><br/>
              <span style="display: inline-block; margin-top: 4px; background: rgba(251, 191, 36, 0.15); border: 1px solid #fbbf24; padding: 6px 12px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 18px; font-weight: 900; color: #fbbf24; letter-spacing: 1px;">${password}</span>
            </p>
          </div>

          <p style="font-size: 13.5px; margin: 0 0 18px 0; line-height: 1.6; color: #334155;">
            You can now sign in to the <strong>Parent / Guardian Portal</strong> (<a href="${loginUrl}" style="color: #1d4ed8; font-weight: 700;">${loginUrl}</a>) using the username and password above to monitor your child's daily attendance, quarterly grades, school announcements, and academic progress.
          </p>

          <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 12px 14px; margin: 18px 0;">
            <p style="margin: 0; font-size: 12px; color: #92400E; line-height: 1.5;">
              <strong>Security Reminder:</strong> Passwords are case-sensitive. For your account security, please update your password after your first sign-in.
            </p>
          </div>

          <div style="text-align: center; margin-top: 26px; padding-top: 16px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 11px;">
            <p style="margin: 0;">Placido L. Señor National High School · Langtad, City of Naga, Cebu</p>
          </div>
        </div>
      `
      : `
        <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 28px; background: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 16px;">
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
            <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 1px;">Official Enrollment Assignment</p>
            <p style="margin: 4px 0; font-size: 14px; color: #0F172A;"><strong>Learner Name:</strong> ${safeStudentName}</p>
            ${lrn ? `<p style="margin: 4px 0; font-size: 14px; color: #0F172A;"><strong>LRN:</strong> <span style="font-family: monospace;">${lrn}</span></p>` : ''}
            <p style="margin: 4px 0; font-size: 14px; color: #0F172A;"><strong>Grade &amp; Section:</strong> ${classLabel}</p>
          </div>

          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 2px solid #fbbf24; border-radius: 14px; padding: 22px; margin: 22px 0; color: #ffffff;">
            <p style="margin: 0 0 12px 0; color: #fbbf24; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800;">🔐 Your Student Portal Login Credentials</p>
            <p style="margin: 6px 0; font-size: 14px; color: #e2e8f0;">
              <strong>Username (Gmail):</strong><br/>
              <span style="font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: #ffffff;">${loginIdentifier}</span>
            </p>
            <p style="margin: 12px 0 0 0; font-size: 14px; color: #e2e8f0;">
              <strong>Temporary Password:</strong><br/>
              <span style="display: inline-block; margin-top: 4px; background: rgba(251, 191, 36, 0.15); border: 1px solid #fbbf24; padding: 6px 12px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 18px; font-weight: 900; color: #fbbf24; letter-spacing: 1px;">${password}</span>
            </p>
          </div>

          <p style="font-size: 13.5px; margin: 0 0 18px 0; line-height: 1.6; color: #334155;">
            You can now log in to your <strong>Student Portal</strong> (<a href="${loginUrl}" style="color: #1d4ed8; font-weight: 700;">${loginUrl}</a>) to view your class schedule, QR gate pass, attendance logs, and academic records.
          </p>

          <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 12px 14px; margin: 18px 0;">
            <p style="margin: 0; font-size: 12px; color: #92400E; line-height: 1.5;">
              <strong>Security Reminder:</strong> Passwords are case-sensitive. Please change your temporary password after your first login.
            </p>
          </div>

          <div style="text-align: center; margin-top: 26px; padding-top: 16px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 11px;">
            <p style="margin: 0;">Placido L. Señor National High School · Langtad, City of Naga, Cebu</p>
          </div>
        </div>
      `;

    const info = await transporter.sendMail({
      from: '"Placido L. Señor National High School" <myleneraganas@gmail.com>',
      to: to_email,
      subject,
      html,
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Enrollment email error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send enrollment email' });
  }
}
