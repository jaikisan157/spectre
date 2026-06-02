import { createHash, randomBytes } from 'crypto';

/**
 * In-memory auth service for ShadowChat
 * Anonymous accounts: username + password only, no email
 * 
 * In production, replace with a real database (SQLite, Postgres, MongoDB, etc.)
 */

// User store: username -> user data
const users = new Map();

// Session store: token -> username
const sessions = new Map();

// Hash password with SHA-256 + salt
function hashPassword(password, salt) {
  return createHash('sha256').update(salt + password).digest('hex');
}

function generateSalt() {
  return randomBytes(16).toString('hex');
}

function generateToken() {
  return randomBytes(32).toString('hex');
}

// Username validation
function validateUsername(username) {
  if (!username || typeof username !== 'string') return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 20) return 'Username must be 20 characters or less';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
  return null;
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  if (password.length > 128) return 'Password is too long';
  return null;
}

export class AuthService {
  constructor() {
    console.log('🔐 Auth service initialized (in-memory)');
  }

  /**
   * Register a new user
   * @returns {{ success: boolean, token?: string, error?: string }}
   */
  register(username, password) {
    // Validate
    const usernameError = validateUsername(username);
    if (usernameError) return { success: false, error: usernameError };

    const passwordError = validatePassword(password);
    if (passwordError) return { success: false, error: passwordError };

    // Check if username is taken (case-insensitive)
    const normalizedUsername = username.toLowerCase();
    if (users.has(normalizedUsername)) {
      return { success: false, error: 'Username is already taken' };
    }

    // Create user
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    const token = generateToken();

    users.set(normalizedUsername, {
      username: normalizedUsername,
      displayName: username, // preserve original casing
      passwordHash,
      salt,
      isPremium: false,
      premiumExpiry: null,
      isBanned: false,
      banReason: null,
      bannedAt: null,
      createdAt: Date.now(),
    });

    sessions.set(token, normalizedUsername);

    console.log(`🔐 User registered: ${username}`);

    return {
      success: true,
      token,
      user: this.getPublicProfile(normalizedUsername),
    };
  }

  /**
   * Login with username + password
   * @returns {{ success: boolean, token?: string, error?: string }}
   */
  login(username, password) {
    if (!username || !password) {
      return { success: false, error: 'Username and password are required' };
    }

    const normalizedUsername = username.toLowerCase();
    const user = users.get(normalizedUsername);

    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    const passwordHash = hashPassword(password, user.salt);
    if (passwordHash !== user.passwordHash) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Create new session
    const token = generateToken();
    sessions.set(token, normalizedUsername);

    console.log(`🔐 User logged in: ${username}`);

    return {
      success: true,
      token,
      user: this.getPublicProfile(normalizedUsername),
    };
  }

  /**
   * Verify a session token
   * @returns {object|null} User profile or null
   */
  verifyToken(token) {
    if (!token) return null;

    const username = sessions.get(token);
    if (!username) return null;

    const user = users.get(username);
    if (!user) {
      sessions.delete(token);
      return null;
    }

    return this.getPublicProfile(username);
  }

  /**
   * Logout — invalidate token
   */
  logout(token) {
    sessions.delete(token);
  }

  /**
   * Get public profile (no sensitive data)
   */
  getPublicProfile(username) {
    const user = users.get(username.toLowerCase());
    if (!user) return null;

    return {
      username: user.username,
      displayName: user.displayName,
      isPremium: user.isPremium,
      premiumExpiry: user.premiumExpiry,
      isBanned: user.isBanned,
      banReason: user.banReason,
      createdAt: user.createdAt,
    };
  }

  // ── Premium Management ──

  activatePremium(username, durationDays = 30) {
    const user = users.get(username.toLowerCase());
    if (!user) return false;

    user.isPremium = true;
    user.premiumExpiry = Date.now() + (durationDays * 24 * 60 * 60 * 1000);
    console.log(`⚡ Premium activated for: ${username} (${durationDays} days)`);
    return true;
  }

  isPremium(username) {
    const user = users.get(username?.toLowerCase());
    if (!user) return false;

    // Check if premium has expired
    if (user.isPremium && user.premiumExpiry && Date.now() > user.premiumExpiry) {
      user.isPremium = false;
      user.premiumExpiry = null;
      return false;
    }

    return user.isPremium;
  }

  // ── Ban Management ──

  banUser(username, reason = 'Too many reports') {
    const user = users.get(username?.toLowerCase());
    if (!user) return false;

    user.isBanned = true;
    user.banReason = reason;
    user.bannedAt = Date.now();
    console.log(`🚫 User banned: ${username} — ${reason}`);
    return true;
  }

  unbanUser(username) {
    const user = users.get(username?.toLowerCase());
    if (!user) return false;

    user.isBanned = false;
    user.banReason = null;
    user.bannedAt = null;
    console.log(`✅ User unbanned: ${username}`);
    return true;
  }

  isBanned(username) {
    const user = users.get(username?.toLowerCase());
    return user?.isBanned || false;
  }

  /**
   * Get username from token (for internal server use)
   */
  getUsernameFromToken(token) {
    return sessions.get(token) || null;
  }

  /**
   * Check if user exists
   */
  userExists(username) {
    return users.has(username?.toLowerCase());
  }
}
