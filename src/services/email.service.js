import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

export class EmailService {
  static getTransporter() {
    if (!config.email.smtpUser || !config.email.smtpPass) {
      return null;
    }

    return nodemailer.createTransport({
      host: config.email.smtpHost,
      port: config.email.smtpPort,
      secure: config.email.smtpSecure,
      auth: {
        user: config.email.smtpUser,
        pass: config.email.smtpPass
      }
    });
  }

  /**
   * Send 6-digit OTP verification code via Email
   */
  static async sendOtpEmail({ to, otp, isNewUser = false }) {
    const transporter = this.getTransporter();

    // Dev Fallback if SMTP credentials are not yet entered in .env
    if (!transporter) {
      console.log('\n======================================================');
      console.log(`✉️  [EkPost Email Service - Dev Mode]`);
      console.log(`   Recipient: ${to}`);
      console.log(`   Action:    ${isNewUser ? 'Create New Account' : 'Sign In'}`);
      console.log(`   OTP Code:  👉  [ ${otp} ]  👈`);
      console.log(`   Expires:   In 5 minutes`);
      console.log('======================================================\n');

      return {
        success: true,
        devMode: true,
        message: 'OTP generated (Dev Mode: SMTP credentials not set in .env)'
      };
    }

    const subject = isNewUser
      ? `Verify your email for EkPost - ${otp}`
      : `Your EkPost Login Code - ${otp}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0e17; color: #f8fafc; margin: 0; padding: 0; }
          .container { max-width: 540px; margin: 30px auto; background: #111827; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%); padding: 30px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0 0; color: rgba(255,255,255,0.9); font-size: 13px; }
          .content { padding: 35px 30px; text-align: center; }
          .subtext { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 25px; }
          .otp-box { background: rgba(99, 102, 241, 0.1); border: 2px dashed #6366f1; border-radius: 12px; padding: 18px 24px; display: inline-block; margin: 10px 0 25px 0; }
          .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #818cf8; letter-spacing: 8px; margin: 0; }
          .expiry-note { font-size: 12px; color: #ef4444; font-weight: 600; margin-bottom: 25px; }
          .footer { border-top: 1px solid rgba(255,255,255,0.06); padding: 20px; font-size: 11px; color: #64748b; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 EkPost</h1>
            <p>One Post, Everywhere</p>
          </div>
          <div class="content">
            <p class="subtext">
              Hello,<br>
              ${isNewUser ? 'Welcome to EkPost! Use the verification code below to verify your email and complete your registration.' : 'We received a sign-in request for your EkPost account. Use the code below to securely log in.'}
            </p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            <p class="expiry-note">⏱️ This code will expire in 5 minutes. Do not share it with anyone.</p>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">
              If you did not request this code, you can safely ignore this email.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} EkPost Platform. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const info = await transporter.sendMail({
        from: config.email.fromEmail,
        to,
        subject,
        html
      });

      console.log(`✅ [Email Service] OTP successfully sent to ${to} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`❌ [Email Service] Failed to send email to ${to}:`, err.message);
      throw new Error(`Email delivery failed: ${err.message}`);
    }
  }
}
