import { http } from 'msw';
import {
  applyMockLatency,
  authenticateMockRequest,
  clearMockRefreshTokenCookie,
  createMockJwt,
  errorResponse,
  getMockRefreshTokenCookie,
  jsonResponse,
  setMockRefreshTokenCookie,
  toError,
} from '../http';
import { getDb, saveDb } from '../db';
import { engine } from '../engine';
import { normalizePhone } from '../../lib/phone';

export const authHandlers = [
  // POST /auth/register
  http.post('/api/v1/auth/register', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    let body: Record<string, string>;
    try {
      body = (await request.json()) as Record<string, string>;
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Invalid JSON body', requestId);
    }

    const { fullName, email, phone, password } = body;
    if (!fullName || !email || !phone || !password) {
      return errorResponse(400, 'VALIDATION_ERROR', 'All fields are required', requestId);
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'Invalid phone number',
        requestId,
        [{ path: 'phone', message: 'Enter a Nigerian phone number, e.g. 0803 123 4567' }]
      );
    }

    const db = getDb();
    const existingEmail = db.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase().trim()
    );
    if (existingEmail) {
      return errorResponse(
        409,
        'EMAIL_TAKEN',
        'An account with this email already exists.',
        requestId
      );
    }

    const existingPhone = db.users.find((u) => u.phone === normalizedPhone);
    if (existingPhone) {
      return errorResponse(
        409,
        'PHONE_TAKEN',
        'An account with this phone number already exists.',
        requestId
      );
    }

    const userId = crypto.randomUUID();
    const nowIso = engine.now().toISOString();
    const newUser = {
      id: userId,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: normalizedPhone,
      password: password,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    db.users.push(newUser);

    // Create wallet
    engine.getUserWalletAccount(userId);

    const accessToken = createMockJwt(userId);
    const refreshToken = crypto.randomUUID();
    db.refreshTokens.push({
      token: refreshToken,
      userId,
      expiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      revoked: false,
    });
    setMockRefreshTokenCookie(refreshToken);
    saveDb();

    const { password: _p, ...safeUser } = newUser;
    return jsonResponse(
      {
        user: safeUser,
        accessToken,
      },
      201,
      { 'X-Request-Id': requestId }
    );
  }),

  // POST /auth/login
  http.post('/api/v1/auth/login', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    let body: Record<string, string>;
    try {
      body = (await request.json()) as Record<string, string>;
    } catch {
      return errorResponse(400, 'INVALID_JSON', 'Invalid JSON body', requestId);
    }

    const { email, password } = body;
    const cleanEmail = (email || '').trim().toLowerCase();

    const db = getDb();

    // Check rate limit: 5 failed attempts in 15 minutes
    const nowMs = Date.now();
    let attemptRecord = db.loginAttempts.find((a) => a.email === cleanEmail);
    if (attemptRecord) {
      if (attemptRecord.lockedUntil && new Date(attemptRecord.lockedUntil).getTime() > nowMs) {
        const remainingSec = Math.ceil(
          (new Date(attemptRecord.lockedUntil).getTime() - nowMs) / 1000
        );
        return errorResponse(
          429,
          'RATE_LIMITED',
          `Too many attempts. Try again in ${remainingSec} seconds.`,
          requestId,
          null,
          { 'Retry-After': String(remainingSec) }
        );
      }
      // Reset if older than 15 mins
      if (nowMs - new Date(attemptRecord.firstAttemptAt).getTime() > 15 * 60 * 1000) {
        attemptRecord.attempts = 0;
        attemptRecord.firstAttemptAt = new Date().toISOString();
        attemptRecord.lockedUntil = undefined;
      }
    }

    const user = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    const passwordMatch = user && user.password === password;

    if (!user || !passwordMatch) {
      if (!attemptRecord) {
        attemptRecord = {
          email: cleanEmail,
          attempts: 1,
          firstAttemptAt: new Date().toISOString(),
          lastAttemptAt: new Date().toISOString(),
        };
        db.loginAttempts.push(attemptRecord);
      } else {
        attemptRecord.attempts++;
        attemptRecord.lastAttemptAt = new Date().toISOString();
      }

      if (attemptRecord.attempts >= 5) {
        attemptRecord.lockedUntil = new Date(nowMs + 15 * 60 * 1000).toISOString();
        saveDb();
        return errorResponse(
          429,
          'RATE_LIMITED',
          'Too many attempts. Try again in 15 minutes.',
          requestId,
          null,
          { 'Retry-After': '900' }
        );
      }
      saveDb();

      return errorResponse(
        401,
        'INVALID_CREDENTIALS',
        'That email and password don’t match.',
        requestId
      );
    }

    // Success: reset attempts
    if (attemptRecord) {
      attemptRecord.attempts = 0;
      attemptRecord.lockedUntil = undefined;
    }

    const accessToken = createMockJwt(user.id);
    const refreshToken = crypto.randomUUID();
    db.refreshTokens.push({
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(nowMs + 30 * 86400 * 1000).toISOString(),
      revoked: false,
    });
    setMockRefreshTokenCookie(refreshToken);
    saveDb();

    const { password: _p, ...safeUser } = user;
    return jsonResponse(
      {
        user: safeUser,
        accessToken,
      },
      200,
      { 'X-Request-Id': requestId }
    );
  }),

  // POST /auth/refresh
  http.post('/api/v1/auth/refresh', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    const cookieToken = getMockRefreshTokenCookie();
    if (!cookieToken) {
      return errorResponse(
        401,
        'REFRESH_TOKEN_INVALID',
        'Refresh token missing or expired',
        requestId
      );
    }

    const db = getDb();
    const tokenRecord = db.refreshTokens.find((r) => r.token === cookieToken);
    if (!tokenRecord || tokenRecord.revoked || new Date(tokenRecord.expiresAt).getTime() < Date.now()) {
      clearMockRefreshTokenCookie();
      return errorResponse(
        401,
        'REFRESH_TOKEN_INVALID',
        'Your session has ended. Please log in again.',
        requestId
      );
    }

    // Rotate refresh token
    tokenRecord.revoked = true;
    const newRefreshToken = crypto.randomUUID();
    db.refreshTokens.push({
      token: newRefreshToken,
      userId: tokenRecord.userId,
      expiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
      revoked: false,
    });
    setMockRefreshTokenCookie(newRefreshToken);

    const user = db.users.find((u) => u.id === tokenRecord.userId);
    if (!user) {
      return errorResponse(401, 'REFRESH_TOKEN_INVALID', 'User not found', requestId);
    }

    const newAccessToken = createMockJwt(user.id);
    saveDb();

    const { password: _p, ...safeUser } = user;
    return jsonResponse(
      {
        user: safeUser,
        accessToken: newAccessToken,
      },
      200,
      { 'X-Request-Id': requestId }
    );
  }),

  // POST /auth/logout
  http.post('/api/v1/auth/logout', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    const cookieToken = getMockRefreshTokenCookie();
    if (cookieToken) {
      const db = getDb();
      const tokenRecord = db.refreshTokens.find((r) => r.token === cookieToken);
      if (tokenRecord) {
        tokenRecord.revoked = true;
        saveDb();
      }
    }
    clearMockRefreshTokenCookie();

    return new Response(null, {
      status: 204,
      headers: {
        'X-Mock-API': 'true',
        'X-Request-Id': requestId,
      },
    });
  }),

  // POST /auth/logout-all
  http.post('/api/v1/auth/logout-all', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const db = getDb();
      db.refreshTokens
        .filter((r) => r.userId === user.id)
        .forEach((r) => {
          r.revoked = true;
        });
      clearMockRefreshTokenCookie();
      saveDb();

      return new Response(null, {
        status: 204,
        headers: {
          'X-Mock-API': 'true',
          'X-Request-Id': requestId,
        },
      });
    } catch (e: unknown) {
      const err = toError(e, 401, 'UNAUTHENTICATED');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // GET /me
  http.get('/api/v1/me', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const { password: _p, ...safeUser } = user;
      return jsonResponse(safeUser, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 401, 'UNAUTHENTICATED');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // PATCH /me
  http.patch('/api/v1/me', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const body = (await request.json()) as { fullName?: string; phone?: string };

      const db = getDb();
      const liveUser = db.users.find((u) => u.id === user.id)!;

      if (body.phone) {
        const norm = normalizePhone(body.phone);
        if (!norm) {
          return errorResponse(
            400,
            'VALIDATION_ERROR',
            'Invalid phone number',
            requestId,
            [{ path: 'phone', message: 'Enter a Nigerian phone number, e.g. 0803 123 4567' }]
          );
        }
        const phoneClash = db.users.find((u) => u.id !== user.id && u.phone === norm);
        if (phoneClash) {
          return errorResponse(
            409,
            'PHONE_TAKEN',
            'An account with this phone number already exists.',
            requestId
          );
        }
        liveUser.phone = norm;
      }

      if (body.fullName) {
        liveUser.fullName = body.fullName.trim();
      }

      liveUser.updatedAt = engine.now().toISOString();
      saveDb();

      const { password: _p, ...safeUser } = liveUser;
      return jsonResponse(safeUser, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 401, 'UNAUTHENTICATED');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // POST /me/password
  http.post('/api/v1/me/password', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const body = (await request.json()) as { currentPassword?: string; newPassword?: string };

      if (!body.currentPassword || !body.newPassword) {
        return errorResponse(400, 'VALIDATION_ERROR', 'Fields required', requestId);
      }

      if (user.password !== body.currentPassword) {
        return errorResponse(401, 'INVALID_CREDENTIALS', 'Incorrect current password', requestId);
      }

      const db = getDb();
      const liveUser = db.users.find((u) => u.id === user.id)!;
      liveUser.password = body.newPassword;
      liveUser.updatedAt = engine.now().toISOString();

      // Revoke all other refresh tokens
      const currentRt = getMockRefreshTokenCookie();
      db.refreshTokens
        .filter((r) => r.userId === user.id && r.token !== currentRt)
        .forEach((r) => {
          r.revoked = true;
        });

      saveDb();

      return new Response(null, {
        status: 204,
        headers: {
          'X-Mock-API': 'true',
          'X-Request-Id': requestId,
        },
      });
    } catch (e: unknown) {
      const err = toError(e, 401, 'UNAUTHENTICATED');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),
];
