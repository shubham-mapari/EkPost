/**
 * oauth-state.js
 * Stateless CSRF-safe OAuth state token using HMAC-SHA256.
 * No express-session required — the state is self-verifying.
 *
 * Format: <random_hex>.<userId>.<timestamp>.<hmac>
 * The HMAC is signed with ENCRYPTION_SECRET_KEY so it cannot be forged.
 */
import crypto from 'crypto';
import { config } from '../config/env.js';

const STATE_TTL_SECONDS = 600; // 10 minutes

function getSigningKey() {
  return crypto.createHash('sha256').update(config.encryptionSecret + ':oauth_state').digest();
}

/**
 * Generate a signed OAuth state token for CSRF protection.
 * @param {string} userId  The EkPost user ID initiating the OAuth flow
 * @returns {string}       Opaque state string to include in the OAuth redirect
 */
export function generateOAuthState(userId, context = '') {
  const nonce     = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const payload   = context
    ? `${nonce}.${userId}.${context}.${timestamp}`
    : `${nonce}.${userId}.${timestamp}`;
  const hmac      = crypto
    .createHmac('sha256', getSigningKey())
    .update(payload)
    .digest('hex');
  return `${payload}.${hmac}`;
}

/**
 * Verify and parse a state token. Throws if invalid or expired.
 * @param {string} state  The state query parameter from the OAuth callback
 * @returns {{ userId: string, nonce: string }}
 */
export function verifyOAuthState(state) {
  if (!state || typeof state !== 'string') {
    throw new Error('Missing or invalid OAuth state parameter.');
  }

  const parts = state.split('.');
  if (parts.length !== 4 && parts.length !== 5) {
    throw new Error('Malformed OAuth state token.');
  }

  const hasContext = parts.length === 5;
  const nonce = parts[0];
  const userId = parts[1];
  const context = hasContext ? parts[2] : '';
  const timestampStr = hasContext ? parts[3] : parts[2];
  const receivedHmac = hasContext ? parts[4] : parts[3];
  const payload   = hasContext
    ? `${nonce}.${userId}.${context}.${timestampStr}`
    : `${nonce}.${userId}.${timestampStr}`;
  const expected  = crypto
    .createHmac('sha256', getSigningKey())
    .update(payload)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(receivedHmac, 'hex'))) {
    throw new Error('OAuth state signature mismatch. Possible CSRF attack.');
  }

  const timestamp = parseInt(timestampStr, 10);
  const now       = Math.floor(Date.now() / 1000);
  if (now - timestamp > STATE_TTL_SECONDS) {
    throw new Error('OAuth state has expired. Please try connecting again.');
  }

  return { userId, nonce, context };
}
