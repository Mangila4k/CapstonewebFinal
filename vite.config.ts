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
