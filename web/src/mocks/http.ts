import { HttpResponse, delay } from 'msw';
import { ApiError, ErrorCode } from '../lib/api/errors';
import { getDb, MockUser, saveDb } from './db';
import { engine } from './engine';

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

export function createMockJwt(userId: string, expiresInSeconds: number = 900): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: userId,
      iat: nowSec,
      exp: nowSec + expiresInSeconds,
    })
  );
  const signature = base64UrlEncode('mock_hs256_signature');
  return `${header}.${payload}.${signature}`;
}

export function parseMockJwt(token: string): { sub: string; exp: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadStr = base64UrlDecode(parts[1]!);
    const parsed = JSON.parse(payloadStr);
    if (!parsed || typeof parsed.sub !== 'string') return null;
    return { sub: parsed.sub, exp: Number(parsed.exp) };
  } catch {
    return null;
  }
}

export function setMockRefreshTokenCookie(token: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `kolo_rt_mock=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Strict`;
  }
  try {
    localStorage.setItem('kolo_rt_mock', token);
  } catch {
    // ignore
  }
}

export function getMockRefreshTokenCookie(): string | null {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)kolo_rt_mock=([^;]+)/);
    if (match) return decodeURIComponent(match[1]!);
  }
  try {
    const stored = localStorage.getItem('kolo_rt_mock');
    if (stored) return stored;
  } catch {
    // ignore
  }
  try {
    const db = getDb();
    const active = db.refreshTokens
      .filter((r) => !r.revoked && new Date(r.expiresAt).getTime() > Date.now())
      .pop();
    if (active) return active.token;
  } catch {
    // ignore
  }
  return null;
}

export function clearMockRefreshTokenCookie() {
  if (typeof document !== 'undefined') {
    document.cookie = 'kolo_rt_mock=; path=/; max-age=0; SameSite=Strict';
  }
  try {
    localStorage.removeItem('kolo_rt_mock');
  } catch {
    // ignore
  }
  try {
    const db = getDb();
    db.refreshTokens.forEach((r) => {
      r.revoked = true;
    });
    saveDb();
  } catch {
    // ignore
  }
}

export async function applyMockLatency() {
  // Random 250-700 ms latency
  const ms = Math.floor(Math.random() * (700 - 250 + 1)) + 250;
  await delay(ms);
}

export function jsonResponse(
  body?: Record<string, unknown> | unknown[] | string | number | boolean | null | undefined,
  status: number = 200,
  headers: Record<string, string> = {}
) {
  return HttpResponse.json(body ?? null, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Mock-API': 'true',
      ...headers,
    },
  });
}

export function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  requestId: string,
  details: Record<string, unknown> | unknown[] | null = null,
  headers: Record<string, string> = {}
) {
  return HttpResponse.json(
    {
      error: {
        code,
        message,
        details: details ?? null,
        requestId,
      },
    },
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-API': 'true',
        'X-Request-Id': requestId,
        ...headers,
      },
    }
  );
}

export function authenticateMockRequest(request: Request, requestId: string): MockUser {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError({
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Missing or malformed access token',
      requestId,
    });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const parsed = parseMockJwt(token);
  if (!parsed) {
    throw new ApiError({
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Invalid access token',
      requestId,
    });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (parsed.exp <= nowSec) {
    throw new ApiError({
      status: 401,
      code: 'UNAUTHENTICATED',
      message: 'Access token expired',
      requestId,
    });
  }

  const db = getDb();
  let user = db.users.find((u) => u.id === parsed.sub);
  if (!user) {
    // If the token's sub isn't in mock DB (mixed mock/live mode), create a mock user
    const newUser: MockUser = {
      id: parsed.sub,
      fullName: 'You',
      email: 'user@kolo.test',
      phone: '+2348030000000',
      password: 'password',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    engine.getUserWalletAccount(newUser.id);
    saveDb();
    user = newUser;
  }

  return user;
}

export function hashBody(body: unknown): string {
  try {
    return JSON.stringify(body ?? null);
  } catch {
    return '';
  }
}

export function toError(
  e: unknown,
  defaultStatus = 500,
  defaultCode: ErrorCode = 'INTERNAL_ERROR'
): { status: number; code: ErrorCode; message: string } {
  const err = e as { status?: number; code?: ErrorCode; message?: string } | null;
  return {
    status: err?.status || defaultStatus,
    code: err?.code || defaultCode,
    message: err?.message || 'An error occurred',
  };
}
