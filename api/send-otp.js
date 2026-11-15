import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Set CORS headers
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
    const { to_email, to_name, code } = req.body || {};

    if (!to_email || !code) {
      return res.status(400).json({ error: 'Missing to_email or code' });
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

    const safeName = to_name || 'Learner / Teacher';

    const info = await transporter.sendMail({
      from: '"Placido L. Señor National High School" <myleneraganas@gmail.com>',
      to: to_email,
      subject: `🔐 Your 6-Digit Password Reset Code: ${code}`,
      html: `
        <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 28px; background: #ffffff; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px; padding-bottom: 18px; border-bottom: 2px solid #f1f5f9;">
            <div style="display: inline-block; width: 60px; height: 60px; border-radius: 50%; background: #EFF6FF; line-height: 60px; font-size: 30px; margin-bottom: 6px;">🔐</div>
            <h2 style="color: #1B2A4A; margin: 0 0 6px 0; font-size: 20px; font-weight: 800;">Placido L. Señor National High School</h2>
            <p style="margin: 0; color: #64748B; font-size: 13px;">Official DepEd Matatag Portal · Password Reset</p>
          </div>

          <p style="font-size: 15px; margin: 0 0 16px 0; line-height: 1.6;">Hello <strong>${safeName}</strong>,</p>

          <p style="font-size: 14px; margin: 0 0 20px 0; line-height: 1.6; color: #334155;">
            We received a request to reset your password for your account associated with <strong>${to_email}</strong>. Use your 6-digit confirmation code below to verify your identity:
          </p>

          <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 2px solid #fbbf24; border-radius: 14px; padding: 24px; text-align: center; margin: 24px 0; box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);">
            <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">Your 6-Digit Verification Code</p>
            <div style="font-family: 'Courier New', Courier, monospace; font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #fbbf24; margin: 6px 0;">
              ${code}
            </div>
            <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 12px;">⏰ Valid for <strong>15 minutes</strong></p>
          </div>

          <div style="background: #F8FAFC; border-left: 4px solid #F59E0B; border-radius: 8px; padding: 14px 16px; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; color: #475569; line-height: 1.5;">
              <strong>Security Notice:</strong> Enter this 6-digit code into the password reset page to set your new password. Never share this code with anyone. If you did not make this request, you can safely ignore this email.
            </p>
          </div>

          <div style="text-align: center; margin-top: 28px; padding-top: 16px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 11px;">
            <p style="margin: 0;">Placido L. Señor National High School · Langtad, City of Naga, Cebu</p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send OTP email' });
  }
}
