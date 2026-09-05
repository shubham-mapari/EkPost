import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

function loadUsersFromDisk() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[UserService] Failed to read data/users.json, initializing default:', err.message);
  }

  // Default seed user
  const initial = [
    {
      id: 'user_default_admin',
      name: 'Demo Creator',
      email: 'admin@ekpost.com',
      username: 'admin',
      passwordHash: bcrypt.hashSync('EkPost@123', 10),
      createdAt: new Date().toISOString()
    }
  ];
  saveUsersToDisk(initial);
  return initial;
}

function saveUsersToDisk(users) {
  try {
    const dir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('[UserService] Failed to save users to disk:', err.message);
  }
}

export const usersDb = loadUsersFromDisk();

export class UserService {
  /**
   * Register a new user and persist to disk
   */
  static async registerUser({ name, email, password }) {
    if (!email || !password) {
      throw new Error('Email/Username and password are required.');
    }

    const trimmedInput = email.trim();
    const normalizedIdentifier = trimmedInput.toLowerCase();

    // Check if email or username already exists
    const existing = usersDb.find(
      u => u.email.toLowerCase() === normalizedIdentifier ||
           (u.username && u.username.toLowerCase() === normalizedIdentifier) ||
           u.id.toLowerCase() === normalizedIdentifier ||
           (u.name && u.name.trim().toLowerCase() === normalizedIdentifier)
    );
    if (existing) {
      throw new Error('An account with this email or username already exists. Please log in.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const emailPrefix = trimmedInput.includes('@') ? trimmedInput.split('@')[0].toLowerCase() : normalizedIdentifier;
    const newUser = {
      id: `user_${Date.now()}`,
      name: name?.trim() || emailPrefix,
      email: trimmedInput.includes('@') ? normalizedIdentifier : `${normalizedIdentifier}@ekpost.local`,
      username: emailPrefix,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    usersDb.push(newUser);
    saveUsersToDisk(usersDb);

    console.log(`[UserService] New user registered and saved to disk: ${newUser.name} (${newUser.email})`);

    const token = UserService.generateToken(newUser);
    return {
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email }
    };
  }

  /**
   * Login user with email/username/ID and password
   */
  static async loginUser({ email, password }) {
    if (!email || !password) {
      throw new Error('Email/Username and password are required.');
    }

    const identifier = email.trim().toLowerCase();

    // Support logging in with: email, email prefix (handle), username, display name, or user ID
    const user = usersDb.find(
      u => u.email.toLowerCase() === identifier ||
           (u.email && u.email.includes('@') && u.email.split('@')[0].toLowerCase() === identifier) ||
           (u.username && u.username.toLowerCase() === identifier) ||
           u.id.toLowerCase() === identifier ||
           (u.name && u.name.trim().toLowerCase() === identifier)
    );

    if (!user) {
      throw new Error('No account found with this email or username. Please check your spelling or sign up.');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Incorrect password. Please try again.');
    }

    const token = UserService.generateToken(user);
    return {
      token,
      user: { id: user.id, name: user.name, email: user.email }
    };
  }

  static findUserById(id) {
    return usersDb.find(u => u.id === id) || null;
  }

  static updateUser(id, { name, email }) {
    const user = usersDb.find(u => u.id === id);
    if (!user) return null;
    if (name) user.name = name.trim();
    if (email) user.email = email.trim().toLowerCase();
    saveUsersToDisk(usersDb);
    return { id: user.id, name: user.name, email: user.email };
  }

  static generateToken(user) {
    return jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      config.jwtSecret,
      { expiresIn: '30d' }
    );
  }
}
