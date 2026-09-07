import { EmailService } from './email.service.js';
import { usersDb } from './user.service.js';

// In-memory store for active OTPs with TTL
// Key: normalized email -> { otp, expiresAt, attempts, isNewUser }
const otpStore = new Map();

export class OTPService {
  /**
   * Generate 6-digit cryptographic OTP and dispatch email
   */
  static async requestOtp(email) {
    if (!email || !email.includes('@')) {
      throw new Error('Please provide a valid email address.');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Rate-limit: Check if an OTP was issued less than 30 seconds ago
    const existing = otpStore.get(normalizedEmail);
    if (existing && existing.createdAt && (Date.now() - existing.createdAt < 30 * 1000)) {
      const waitSec = Math.ceil((30 * 1000 - (Date.now() - existing.createdAt)) / 1000);
      throw new Error(`Please wait ${waitSec}s before requesting a new OTP.`);
    }

    // Generate 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // Check if user already exists
    const user = usersDb.find(u => u.email.toLowerCase() === normalizedEmail);
    const isNewUser = !user;

    otpStore.set(normalizedEmail, {
      otp,
      expiresAt,
      attempts: 0,
      createdAt: Date.now(),
      isNewUser
    });

    const emailResult = await EmailService.sendOtpEmail({
      to: normalizedEmail,
      otp,
      isNewUser
    });

    return {
      success: true,
      email: normalizedEmail,
      isNewUser,
      devMode: emailResult.devMode || false,
      devOtp: emailResult.devMode ? otp : undefined,
      message: `Verification code sent to ${normalizedEmail}`
    };
  }

  /**
   * Verify entered 6-digit code
   */
  static verifyOtp(email, enteredOtp) {
    if (!email || !enteredOtp) {
      throw new Error('Email and 6-digit OTP code are required.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const record = otpStore.get(normalizedEmail);

    if (!record) {
      throw new Error('No OTP requested or code has expired. Please request a new code.');
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(normalizedEmail);
      throw new Error('OTP code has expired. Please request a new one.');
    }

    if (record.attempts >= 5) {
      otpStore.delete(normalizedEmail);
      throw new Error('Too many failed attempts. Please request a new OTP code.');
    }

    if (record.otp !== enteredOtp.trim()) {
      record.attempts += 1;
      const remaining = 5 - record.attempts;
      throw new Error(`Incorrect OTP code. ${remaining} attempts remaining.`);
    }

    // Verified successfully
    return {
      verified: true,
      isNewUser: record.isNewUser
    };
  }

  /**
   * Clear OTP record once registration/login completes
   */
  static consumeOtp(email) {
    const normalizedEmail = email.trim().toLowerCase();
    otpStore.delete(normalizedEmail);
  }
}
