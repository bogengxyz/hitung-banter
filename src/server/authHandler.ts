import crypto from 'node:crypto';
import { UserProfile, UserRole } from '../types';

export interface ServerSession {
  token: string;
  user: UserProfile & { username: string };
  expires_at: string;
}

// Server-side secret for token signing (never exposed to client)
const SERVER_SECRET = process.env.AUTH_SERVER_SECRET || 'hitung-banter-auth-secret-key-2026-secure-pbkdf2';

// Server-side salt for PBKDF2 password derivation
const SERVER_SALT = 'banter-salt-lamongan-paciran-2026';

// Known admin username
const ADMIN_USERNAME = 'admin_banter';

// Precomputed PBKDF2 hash of the authorized temporary password 'bantermas99'
// Derived via pbkdf2Sync('bantermas99', SERVER_SALT, 10000, 64, 'sha512').toString('hex')
const EXPECTED_PASSWORD_HASH = crypto
  .pbkdf2Sync('bantermas99', SERVER_SALT, 10000, 64, 'sha512')
  .toString('hex');

// In-memory blacklist for logged-out tokens
const invalidatedTokens = new Set<string>();

/**
 * Hash password using PBKDF2 SHA-512
 */
export function hashPassword(password: string): string {
  return crypto
    .pbkdf2Sync(password, SERVER_SALT, 10000, 64, 'sha512')
    .toString('hex');
}

/**
 * Timing-safe password verification
 */
export function verifyPassword(password: string, expectedHash: string): boolean {
  try {
    const inputHash = hashPassword(password);
    const bufInput = Buffer.from(inputHash, 'hex');
    const bufExpected = Buffer.from(expectedHash, 'hex');
    if (bufInput.length !== bufExpected.length) return false;
    return crypto.timingSafeEqual(bufInput, bufExpected);
  } catch {
    return false;
  }
}

/**
 * Sign a session token
 */
export function generateSessionToken(user: UserProfile & { username: string }, ttlHours = 24 * 7): ServerSession {
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    email: user.email,
    exp: expiresAt,
    iat: new Date().toISOString(),
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SERVER_SECRET)
    .update(payloadStr)
    .digest('base64url');

  const token = `${payloadStr}.${signature}`;

  return {
    token,
    user,
    expires_at: expiresAt,
  };
}

/**
 * Validate a session token
 */
export function validateSessionToken(token: string): { valid: boolean; user?: UserProfile & { username: string }; error?: string; code?: number } {
  if (!token) {
    return { valid: false, error: 'Token autentikasi tidak ditemukan.', code: 401 };
  }

  if (invalidatedTokens.has(token)) {
    return { valid: false, error: 'Sesi telah keluar. Silakan login kembali.', code: 401 };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Format token tidak valid.', code: 401 };
  }

  const [payloadStr, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', SERVER_SECRET)
    .update(payloadStr)
    .digest('base64url');

  try {
    const isSigValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'utf-8'),
      Buffer.from(expectedSignature, 'utf-8')
    );
    if (!isSigValid) {
      return { valid: false, error: 'Tanda tangan token tidak valid.', code: 401 };
    }
  } catch {
    return { valid: false, error: 'Verifikasi tanda tangan token gagal.', code: 401 };
  }

  let payload: any;
  try {
    payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
  } catch {
    return { valid: false, error: 'Payload token rusak.', code: 401 };
  }

  // Check expiration
  if (payload.exp && new Date(payload.exp).getTime() < Date.now()) {
    return { valid: false, error: 'Sesi telah kedaluwarsa. Silakan login kembali.', code: 401 };
  }

  // Enforce admin role strictly (owner is locked for deployment)
  if (payload.role !== 'admin') {
    return {
      valid: false,
      error: payload.role === 'owner'
        ? 'Akun Owner sedang dikunci untuk deployment. Silakan login menggunakan akun Admin.'
        : 'Akses ditolak. Akun ini tidak memiliki hak akses administrator.',
      code: 403,
    };
  }

  const user: UserProfile & { username: string } = {
    id: payload.sub,
    username: payload.username,
    email: payload.email,
    role: payload.role as UserRole,
    full_name: payload.username === ADMIN_USERNAME ? 'Admin BANTER' : 'Administrator',
    is_active: true,
    avatar_url: '/assets/aistudio/logo_7417d4ba.png',
    created_at: payload.iat || new Date().toISOString(),
  };

  return { valid: true, user };
}

/**
 * Invalidate a session token on logout
 */
export function invalidateToken(token: string): void {
  if (token) {
    invalidatedTokens.add(token);
  }
}

/**
 * Server-side login handler
 */
export function authenticateUser(
  usernameRaw: string,
  passwordRaw: string
): { success: boolean; session?: ServerSession; error?: string; code?: number } {
  const username = (usernameRaw || '').trim();
  const password = (passwordRaw || '').trim();

  if (!username || !password) {
    return {
      success: false,
      error: 'Username dan password wajib diisi.',
      code: 400,
    };
  }

  const userLower = username.toLowerCase();
  if (userLower.includes('owner') || userLower === 'hendra' || userLower === 'hendra_wijaya') {
    return {
      success: false,
      error: 'Akun Owner sedang dikunci untuk deployment. Hanya akun Administrator yang diizinkan untuk login.',
      code: 403,
    };
  }

  // Check username match (case-insensitive for convenience)
  if (userLower !== ADMIN_USERNAME.toLowerCase()) {
    return {
      success: false,
      error: 'Username tidak terdaftar. Periksa kembali username Anda.',
      code: 401,
    };
  }

  // Check password
  const isMatch = verifyPassword(password, EXPECTED_PASSWORD_HASH);
  if (!isMatch) {
    return {
      success: false,
      error: 'Password yang Anda masukkan salah. Silakan periksa kembali.',
      code: 401,
    };
  }

  // Successful authentication -> create admin user profile
  const user: UserProfile & { username: string } = {
    id: 'usr-admin-banter',
    username: ADMIN_USERNAME,
    email: 'admin_banter@banter.id',
    full_name: 'Admin BANTER',
    role: 'admin',
    is_active: true,
    avatar_url: '/assets/aistudio/logo_7417d4ba.png',
    created_at: '2026-01-01T00:00:00Z',
  };

  const session = generateSessionToken(user);

  return {
    success: true,
    session,
  };
}
