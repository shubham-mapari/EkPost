import crypto from 'crypto';
import { config } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY = crypto.createHash('sha256').update(config.encryptionSecret).digest();

/**
 * Encrypt a sensitive token string before saving to database
 * @param {string} text
 * @returns {string} iv:authTag:encryptedHex
 */
export function encryptToken(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted token string retrieved from database
 * @param {string} encryptedString
 * @returns {string} plaintext
 */
export function decryptToken(encryptedString) {
  if (!encryptedString || !encryptedString.includes(':')) return encryptedString;
  try {
    const [ivHex, authTagHex, encryptedText] = encryptedString.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return encryptedString;
  }
}
