import { AuthSession, UserProfile } from '../../types';
import { banterStore } from '../storage/store';

const SESSION_STORAGE_KEY = 'hitung_banter_auth_session';

// Authorized temporary admin credentials for static/offline deployment fallback
const TEMPORARY_ADMIN_USERNAME = 'admin_banter';
const TEMPORARY_ADMIN_PASSWORD = 'bantermas99';

export interface LoginResult {
  success: boolean;
  session?: AuthSession;
  error?: string;
}

class AuthService {
  private currentSession: AuthSession | null = null;
  private isInitialized = false;

  constructor() {
    this.currentSession = this.readStoredSession();
  }

  /**
   * Read raw stored session from localStorage
   */
  private readStoredSession(): AuthSession | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw) as AuthSession;
      if (!session || !session.token || !session.user) return null;

      // Check client-side expiration
      if (session.expires_at && new Date(session.expires_at).getTime() < Date.now()) {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  /**
   * Save session to storage
   */
  private saveSession(session: AuthSession | null): void {
    this.currentSession = session;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (session) {
          window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        } else {
          window.localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn('Failed to persist session to localStorage', e);
    }
  }

  /**
   * Fallback local authentication for static hosting (e.g. Cloudflare Pages, Vercel Static)
   * or when the backend server is temporarily unreachable.
   */
  private fallbackLocalLogin(username: string, password: string): LoginResult {
    const userLower = username.toLowerCase();
    if (userLower.includes('owner') || userLower === 'hendra' || userLower === 'hendra_wijaya') {
      return {
        success: false,
        error: 'Akun Owner sedang dikunci untuk deployment. Hanya akun Administrator yang diizinkan untuk login.',
      };
    }

    if (userLower !== TEMPORARY_ADMIN_USERNAME.toLowerCase()) {
      return {
        success: false,
        error: 'Username tidak terdaftar. Periksa kembali username Anda.',
      };
    }

    if (password !== TEMPORARY_ADMIN_PASSWORD) {
      return {
        success: false,
        error: 'Password yang Anda masukkan salah. Silakan periksa kembali.',
      };
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const localSession: AuthSession = {
      token: `local_admin_session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      user: {
        id: 'usr-admin-banter',
        username: TEMPORARY_ADMIN_USERNAME,
        email: 'admin_banter@banter.id',
        full_name: 'Admin BANTER',
        role: 'admin',
        is_active: true,
        avatar_url: '/assets/aistudio/logo_7417d4ba.png',
        created_at: '2026-01-01T00:00:00Z',
      },
      expires_at: expiresAt,
    };

    this.saveSession(localSession);
    banterStore.setCurrentUser(localSession.user);

    return {
      success: true,
      session: localSession,
    };
  }

  /**
   * Login user with username & password
   */
  public async login(usernameRaw: string, passwordRaw: string): Promise<LoginResult> {
    const username = (usernameRaw || '').trim();
    const password = (passwordRaw || '').trim();

    if (!username || !password) {
      return {
        success: false,
        error: 'Username dan password wajib diisi.',
      };
    }

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
          return {
            success: false,
            error: data.error || 'Login gagal. Periksa username dan password Anda.',
          };
        }

        const session: AuthSession = data.session;
        this.saveSession(session);

        // Sync active user in banterStore
        if (session.user) {
          banterStore.setCurrentUser(session.user);
        }

        return {
          success: true,
          session,
        };
      }

      // If response is not JSON (e.g. 404 HTML fallback from static host like Cloudflare Pages)
      return this.fallbackLocalLogin(username, password);
    } catch (err: any) {
      console.warn('Backend auth server offline or unreachable, attempting local admin fallback:', err);
      // Fallback for static deployment / offline mode
      return this.fallbackLocalLogin(username, password);
    }
  }

  /**
   * Validate current session with server
   */
  public async validateSession(): Promise<AuthSession | null> {
    const stored = this.readStoredSession();
    if (!stored || !stored.token) {
      this.saveSession(null);
      return null;
    }

    // Check expiration
    if (stored.expires_at && new Date(stored.expires_at).getTime() < Date.now()) {
      this.saveSession(null);
      return null;
    }

    // If session was authenticated via local fallback
    if (stored.token.startsWith('local_admin_session_')) {
      if (stored.user && stored.user.role === 'admin') {
        banterStore.setCurrentUser(stored.user);
        return stored;
      }
      this.saveSession(null);
      return null;
    }

    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${stored.token}`,
        },
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (response.ok && data.success && data.session) {
          const refreshedSession: AuthSession = {
            token: stored.token,
            user: data.session.user || stored.user,
            expires_at: data.session.expires_at || stored.expires_at,
          };
          this.saveSession(refreshedSession);
          if (refreshedSession.user) {
            banterStore.setCurrentUser(refreshedSession.user);
          }
          return refreshedSession;
        }

        // Server explicitly rejected token (e.g. 401/403)
        this.saveSession(null);
        return null;
      }

      // If server returned non-JSON (e.g. 404 from static hosting), preserve cached session if valid
      if (stored.user && stored.user.role === 'admin') {
        banterStore.setCurrentUser(stored.user);
        return stored;
      }
      this.saveSession(null);
      return null;
    } catch (err) {
      console.warn('Session verification offline, using cached credentials if valid', err);
      // Fallback: if network fails temporarily but token is unexpired
      if (stored.user && stored.user.role === 'admin') {
        banterStore.setCurrentUser(stored.user);
        return stored;
      }
      return null;
    }
  }

  /**
   * Log out active session
   */
  public async logout(): Promise<void> {
    const stored = this.currentSession || this.readStoredSession();
    if (stored && stored.token && !stored.token.startsWith('local_admin_session_')) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${stored.token}`,
          },
        });
      } catch {
        // Ignore network errors on logout
      }
    }

    this.saveSession(null);
    this.currentSession = null;
  }

  /**
   * Synchronous check of currently cached session
   */
  public getCachedSession(): AuthSession | null {
    return this.currentSession || this.readStoredSession();
  }

  /**
   * Check if user is authenticated with admin role
   */
  public isAuthenticatedAdmin(): boolean {
    const s = this.getCachedSession();
    if (!s || !s.token || !s.user) return false;
    return s.user.role === 'admin';
  }
}

export const authService = new AuthService();
