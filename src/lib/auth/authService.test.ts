import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authenticateUser,
  validateSessionToken,
  invalidateToken,
  generateSessionToken,
  verifyPassword,
  hashPassword,
} from '../../server/authHandler';
import { UserProfile } from '../../types';

test('Autentikasi Server: Login dengan kredensial sementara admin_banter dan bantermas99 berhasil', () => {
  const result = authenticateUser('admin_banter', 'bantermas99');
  assert.equal(result.success, true);
  assert.ok(result.session);
  assert.ok(result.session.token);
  assert.equal(result.session.user.username, 'admin_banter');
  assert.equal(result.session.user.role, 'admin');
  assert.equal(result.session.user.is_active, true);
});

test('Autentikasi Server: Case-insensitive username match (e.g. ADMIN_BANTER)', () => {
  const result = authenticateUser('ADMIN_BANTER', 'bantermas99');
  assert.equal(result.success, true);
  assert.ok(result.session);
  assert.equal(result.session.user.role, 'admin');
});

test('Autentikasi Server: Password salah ditolak dengan status 401', () => {
  const result = authenticateUser('admin_banter', 'salah_password_123');
  assert.equal(result.success, false);
  assert.equal(result.code, 401);
  assert.match(result.error || '', /password/i);
});

test('Autentikasi Server: Username salah ditolak dengan status 401', () => {
  const result = authenticateUser('user_tidak_dikenal', 'bantermas99');
  assert.equal(result.success, false);
  assert.equal(result.code, 401);
  assert.match(result.error || '', /username/i);
});

test('Autentikasi Server: Input kosong ditolak dengan status 400', () => {
  const res1 = authenticateUser('', 'bantermas99');
  assert.equal(res1.success, false);
  assert.equal(res1.code, 400);

  const res2 = authenticateUser('admin_banter', '');
  assert.equal(res2.success, false);
  assert.equal(res2.code, 400);
});

test('Keamanan Sesi: Validasi token sesi berhasil dan mengembalikan profil admin', () => {
  const auth = authenticateUser('admin_banter', 'bantermas99');
  assert.ok(auth.session);

  const validation = validateSessionToken(auth.session.token);
  assert.equal(validation.valid, true);
  assert.ok(validation.user);
  assert.equal(validation.user.username, 'admin_banter');
  assert.equal(validation.user.role, 'admin');
});

test('Keamanan Sesi: Akun Owner dikunci dan ditolak dengan 403 Forbidden', () => {
  const ownerUser: UserProfile & { username: string } = {
    id: 'usr-owner-01',
    username: 'owner_banter',
    email: 'owner@banter.id',
    full_name: 'Hendra Wijaya (Owner)',
    role: 'owner',
    is_active: false,
    created_at: new Date().toISOString(),
  };

  const ownerSession = generateSessionToken(ownerUser);
  const validation = validateSessionToken(ownerSession.token);

  assert.equal(validation.valid, false);
  assert.equal(validation.code, 403);
  assert.match(validation.error || '', /owner sedang dikunci/i);

  // Login attempt with owner username is also rejected
  const loginAttempt = authenticateUser('owner_banter', 'bantermas99');
  assert.equal(loginAttempt.success, false);
  assert.equal(loginAttempt.code, 403);
  assert.match(loginAttempt.error || '', /owner sedang dikunci/i);
});

test('Keamanan Sesi: Role selain admin (misal viewer) ditolak dengan 403 Forbidden', () => {
  const viewerUser: UserProfile & { username: string } = {
    id: 'usr-viewer-test',
    username: 'viewer_user',
    email: 'viewer@banter.id',
    full_name: 'Viewer Testing',
    role: 'viewer',
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const viewerSession = generateSessionToken(viewerUser);
  const validation = validateSessionToken(viewerSession.token);

  assert.equal(validation.valid, false);
  assert.equal(validation.code, 403);
  assert.match(validation.error || '', /administrator/i);
});

test('Keamanan Sesi: Token kedaluwarsa ditolak', () => {
  const adminUser: UserProfile & { username: string } = {
    id: 'usr-admin-test',
    username: 'admin_banter',
    email: 'admin@banter.id',
    full_name: 'Admin Testing',
    role: 'admin',
    is_active: true,
    created_at: new Date().toISOString(),
  };

  // Generate expired token (-1 hours)
  const expiredSession = generateSessionToken(adminUser, -1);
  const validation = validateSessionToken(expiredSession.token);

  assert.equal(validation.valid, false);
  assert.equal(validation.code, 401);
  assert.match(validation.error || '', /kedaluwarsa/i);
});

test('Keamanan Sesi: Token yang dirusak atau manipulasi signature ditolak', () => {
  const auth = authenticateUser('admin_banter', 'bantermas99');
  assert.ok(auth.session);

  const tamperedToken = auth.session.token + 'invalidsignature';
  const validation = validateSessionToken(tamperedToken);

  assert.equal(validation.valid, false);
  assert.equal(validation.code, 401);
});

test('Keamanan Sesi: Logout memblacklist token sehingga tidak dapat digunakan kembali', () => {
  const auth = authenticateUser('admin_banter', 'bantermas99');
  assert.ok(auth.session);

  // Invalidate
  invalidateToken(auth.session.token);

  const validation = validateSessionToken(auth.session.token);
  assert.equal(validation.valid, false);
  assert.equal(validation.code, 401);
  assert.match(validation.error || '', /keluar/i);
});
