import fs from 'fs';
import path from 'path';
import { encryptToken, decryptToken } from '../utils/encryption.js';

const STORE_FILE = path.join(process.cwd(), 'data', 'store.json');

function loadStoreFromDisk() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        accounts: parsed.accounts || [],
        posts: parsed.posts || [],
        logs: parsed.logs || []
      };
    }
  } catch (err) {
    console.warn('[AccountStore] Failed to read data/store.json:', err.message);
  }
  return { accounts: [], posts: [], logs: [] };
}

export function saveStoreToDisk() {
  try {
    const dir = path.dirname(STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AccountStore] Failed to save store to disk:', err.message);
  }
}

// Persistent store for social account connections and posts
export const db = loadStoreFromDisk();

export const AccountStore = {
  getAccountsByUser(userId) {
    return db.accounts
      .filter(acc => !acc.userId || acc.userId === userId || userId === 'user_default_admin' || acc.userId === 'user_default_admin')
      .map(acc => ({
        id: acc.id,
        userId: acc.userId,
        platform: acc.platform,
        name: acc.name,
        platformUserId: acc.platformUserId,
        avatar: acc.avatar || '',
        expiresAt: acc.expiresAt || null,
        createdAt: acc.createdAt || acc.connectedAt,
        updatedAt: acc.updatedAt || acc.connectedAt
      }));
  },

  getAccountById(id, userId) {
    const acc = db.accounts.find(a => a.id === id && (!a.userId || a.userId === userId || userId === 'user_default_admin' || a.userId === 'user_default_admin'));
    if (!acc) return null;
    return {
      ...acc,
      token: decryptToken(acc.encryptedToken)
    };
  },

  getLinkedInAccount(userId) {
    const acc = db.accounts.find(
      a => (a.platform === 'linkedin' || a.platform === 'LINKEDIN') &&
           (!a.userId || a.userId === userId || userId === 'user_default_admin' || a.userId === 'user_default_admin')
    );
    if (!acc) return null;
    return {
      ...acc,
      token: decryptToken(acc.encryptedToken)
    };
  },

  getTwitterAccount(userId) {
    const acc = db.accounts.find(
      a => (a.platform === 'twitter' || a.platform === 'x' || a.platform === 'TWITTER') &&
           (!a.userId || a.userId === userId || userId === 'user_default_admin' || a.userId === 'user_default_admin')
    );
    if (!acc) return null;
    return {
      ...acc,
      token: decryptToken(acc.encryptedToken)
    };
  },

  getFacebookAccount(userId) {
    const acc = db.accounts.find(
      a => a.platform === 'facebook' &&
           (!a.userId || a.userId === userId || userId === 'user_default_admin' || a.userId === 'user_default_admin')
    );
    if (!acc) return null;
    return {
      ...acc,
      token: decryptToken(acc.encryptedToken)
    };
  },

  getInstagramAccount(userId) {
    const acc = db.accounts.find(
      a => a.platform === 'instagram' &&
           (!a.userId || a.userId === userId || userId === 'user_default_admin' || a.userId === 'user_default_admin')
    );
    if (!acc) return null;
    return {
      ...acc,
      token: decryptToken(acc.encryptedToken)
    };
  },

  addAccount({ userId, platform, name, platformUserId, token, avatar, expiresAt, authFlow }) {
    const normalizedPlatform = (platform || 'linkedin').toLowerCase();
    const existingIdx = db.accounts.findIndex(
      a => a.userId === userId && 
           (a.platform.toLowerCase() === normalizedPlatform) && 
           a.platformUserId === platformUserId
    );

    const now = new Date().toISOString();
    const item = {
      id: `acc_${normalizedPlatform}_${Date.now()}`,
      userId: userId || 'user_default_admin',
      platform: normalizedPlatform,
      name: name || `${normalizedPlatform.toUpperCase()} Account`,
      platformUserId,
      encryptedToken: encryptToken(token),
      avatar: avatar || '',
      authFlow: authFlow || null,
      expiresAt: expiresAt || null,
      createdAt: existingIdx >= 0 ? db.accounts[existingIdx].createdAt : now,
      updatedAt: now
    };

    if (existingIdx >= 0) {
      db.accounts[existingIdx] = item;
    } else {
      db.accounts.push(item);
    }
    saveStoreToDisk();
    return item;
  },

  removeAccount(id, userId) {
    const initialLen = db.accounts.length;
    db.accounts = db.accounts.filter(
      a => !(a.id === id && (a.userId === userId || userId === 'user_default_admin' || a.userId === 'user_default_admin'))
    );
    saveStoreToDisk();
    return db.accounts.length < initialLen;
  },

  removeLinkedInAccount(userId) {
    const initialLen = db.accounts.length;
    const removedAccounts = db.accounts.filter(
      a => (a.platform === 'linkedin' || a.platform === 'LINKEDIN') &&
           (a.userId === userId || userId === 'user_default_admin' || a.userId === 'user_default_admin')
    );
    db.accounts = db.accounts.filter(
      a => !((a.platform === 'linkedin' || a.platform === 'LINKEDIN') &&
             (a.userId === userId || userId === 'user_default_admin' || a.userId === 'user_default_admin'))
    );
    saveStoreToDisk();
    return { removed: db.accounts.length < initialLen, removedAccounts };
  },

  removeTwitterAccount(userId) {
    const initialLen = db.accounts.length;
    const removedAccounts = db.accounts.filter(
      a => (a.platform === 'twitter' || a.platform === 'x' || a.platform === 'TWITTER') &&
           (a.userId === userId || userId === 'user_default_admin' || a.userId === 'user_default_admin')
    );
    db.accounts = db.accounts.filter(
      a => !((a.platform === 'twitter' || a.platform === 'x' || a.platform === 'TWITTER') &&
             (a.userId === userId || userId === 'user_default_admin' || a.userId === 'user_default_admin'))
    );
    saveStoreToDisk();
    return { removed: db.accounts.length < initialLen, removedAccounts };
  },

  removeFacebookAccount(userId) {
    const initialLen = db.accounts.length;
    const removedAccounts = db.accounts.filter(
      a => a.platform === 'facebook' &&
           (a.userId === userId || userId === 'user_default_admin' || a.userId === 'user_default_admin')
    );
    db.accounts = db.accounts.filter(
      a => !(a.platform === 'facebook' &&
             (a.userId === userId || userId === 'user_default_admin' || a.userId === 'user_default_admin'))
    );
    saveStoreToDisk();
    return { removed: db.accounts.length < initialLen, removedAccounts };
  },

  removeInstagramAccount(userId) {
    const initialLen = db.accounts.length;
    const removedAccounts = db.accounts.filter(
      a => a.platform === 'instagram' &&
           (a.userId === userId || userId === 'user_default_admin' || a.userId === 'user_default_admin')
    );
    db.accounts = db.accounts.filter(
      a => !(a.platform === 'instagram' &&
             (a.userId === userId || userId === 'user_default_admin' || a.userId === 'user_default_admin'))
    );
    saveStoreToDisk();
    return { removed: db.accounts.length < initialLen, removedAccounts };
  }
};
