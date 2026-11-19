import { http } from 'msw';
import {
  applyMockLatency,
  authenticateMockRequest,
  errorResponse,
  jsonResponse,
  toError,
} from '../http';
import { getDb, saveDb } from '../db';
import { engine } from '../engine';

export const notificationHandlers = [
  // GET /notifications
  http.get('/api/v1/notifications', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const url = new URL(request.url);
      const cursor = url.searchParams.get('cursor');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

      const db = getDb();
      const userNotifs = db.notifications
        .filter((n) => n.userId === user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      let startIndex = 0;
      if (cursor) {
        try {
          const decoded = atob(cursor);
          const parsed = JSON.parse(decoded);
          const idx = userNotifs.findIndex((n) => n.id === parsed.id);
          if (idx !== -1) {
            startIndex = idx + 1;
          }
        } catch {
          // ignore
        }
      }

      const slice = userNotifs.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < userNotifs.length;
      const nextCursor =
        hasMore && slice.length > 0
          ? btoa(JSON.stringify({ id: slice[slice.length - 1]!.id }))
          : null;

      return jsonResponse(
        {
          data: slice.map(({ userId: _uid, ...n }) => n),
          nextCursor,
        },
        200,
        { 'X-Request-Id': requestId }
      );
    } catch (e: unknown) {
      const err = toError(e, 401, 'UNAUTHENTICATED');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // GET /notifications/unread-count
  http.get('/api/v1/notifications/unread-count', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const db = getDb();
      const count = db.notifications.filter(
        (n) => n.userId === user.id && n.readAt === null
      ).length;

      return jsonResponse({ count }, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 401, 'UNAUTHENTICATED');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // POST /notifications/:notificationId/read
  http.post('/api/v1/notifications/:notificationId/read', async ({ request, params }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const notifId = params.notificationId as string;
      const db = getDb();

      const notif = db.notifications.find(
        (n) => n.id === notifId && n.userId === user.id
      );
      if (!notif) {
        return errorResponse(404, 'NOT_FOUND', 'Notification not found', requestId);
      }

      if (!notif.readAt) {
        notif.readAt = engine.now().toISOString();
        saveDb();
      }

      const { userId: _uid, ...safeN } = notif;
      return jsonResponse(safeN, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 404, 'NOT_FOUND');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // POST /notifications/read-all
  http.post('/api/v1/notifications/read-all', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const db = getDb();
      const nowIso = engine.now().toISOString();

      db.notifications
        .filter((n) => n.userId === user.id && n.readAt === null)
        .forEach((n) => {
          n.readAt = nowIso;
        });

      saveDb();

      return new Response(null, {
        status: 204,
        headers: { 'X-Mock-API': 'true', 'X-Request-Id': requestId },
      });
    } catch (e: unknown) {
      const err = toError(e, 401, 'UNAUTHENTICATED');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),
];
