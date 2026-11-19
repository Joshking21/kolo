import { http } from 'msw';
import {
  applyMockLatency,
  authenticateMockRequest,
  errorResponse,
  hashBody,
  jsonResponse,
  toError,
} from '../http';
import { engine } from '../engine';
import { getDb, saveDb, MockIdempotencyRecord } from '../db';
import { cleanInviteCode } from '../../lib/invite-code';

export const groupHandlers = [
  // POST /groups
  http.post('/api/v1/groups', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const body = (await request.json()) as {
        name: string;
        description: string;
        contributionKobo: number;
        frequency: 'weekly' | 'monthly';
        maxMembers: number;
        payoutOrder: 'join_order' | 'random';
      };

      const group = engine.createGroup(user.id, {
        name: body.name,
        description: body.description,
        contributionKobo: body.contributionKobo,
        frequency: body.frequency,
        maxMembers: body.maxMembers,
        payoutOrder: body.payoutOrder,
      });

      return jsonResponse(group, 201, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 500, 'INTERNAL_ERROR');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // GET /groups
  http.get('/api/v1/groups', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const groups = engine.getGroupsForUser(user.id);
      return jsonResponse({ data: groups }, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 401, 'UNAUTHENTICATED');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // GET /groups/:groupId
  http.get('/api/v1/groups/:groupId', async ({ request, params }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const groupId = params.groupId as string;
      const group = engine.getGroupDetail(groupId, user.id);
      return jsonResponse(group, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 404, 'NOT_FOUND');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // POST /groups/join
  http.post('/api/v1/groups/join', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const body = (await request.json()) as { inviteCode?: string };

      if (!body.inviteCode) {
        return errorResponse(400, 'VALIDATION_ERROR', 'Invite code required', requestId);
      }

      const cleaned = cleanInviteCode(body.inviteCode);
      if (!cleaned) {
        return errorResponse(
          422,
          'INVALID_INVITE_CODE',
          'That invite code doesn’t match any group.',
          requestId
        );
      }

      const group = engine.joinGroup(user.id, cleaned);
      return jsonResponse(group, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 400, 'VALIDATION_ERROR');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // POST /groups/:groupId/leave
  http.post('/api/v1/groups/:groupId/leave', async ({ request, params }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const groupId = params.groupId as string;
      engine.leaveGroup(user.id, groupId);
      return new Response(null, {
        status: 204,
        headers: { 'X-Mock-API': 'true', 'X-Request-Id': requestId },
      });
    } catch (e: unknown) {
      const err = toError(e, 400, 'FORBIDDEN');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // POST /groups/:groupId/cancel
  http.post('/api/v1/groups/:groupId/cancel', async ({ request, params }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const groupId = params.groupId as string;
      const group = engine.cancelGroup(user.id, groupId);
      return jsonResponse(group, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 403, 'FORBIDDEN');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // POST /groups/:groupId/start
  http.post('/api/v1/groups/:groupId/start', async ({ request, params }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const groupId = params.groupId as string;
      const group = engine.startGroup(user.id, groupId);
      return jsonResponse(group, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 400, 'FORBIDDEN');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // GET /groups/:groupId/rounds
  http.get('/api/v1/groups/:groupId/rounds', async ({ request, params }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      authenticateMockRequest(request, requestId);
      const groupId = params.groupId as string;
      const rounds = engine.getGroupRounds(groupId);
      return jsonResponse({ data: rounds }, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 404, 'NOT_FOUND');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // POST /groups/:groupId/rounds/:roundNumber/contribute [idempotent]
  http.post(
    '/api/v1/groups/:groupId/rounds/:roundNumber/contribute',
    async ({ request, params }) => {
      const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
      await applyMockLatency();

      try {
        const user = authenticateMockRequest(request, requestId);
        const groupId = params.groupId as string;
        const roundNumber = parseInt(params.roundNumber as string, 10);

        const idempotencyKey = request.headers.get('Idempotency-Key');
        if (!idempotencyKey) {
          return errorResponse(
            400,
            'IDEMPOTENCY_KEY_MISSING',
            'An [idempotent] endpoint was called without a valid Idempotency-Key',
            requestId
          );
        }

        const path = `/groups/${groupId}/rounds/${roundNumber}/contribute`;
        const bodyHash = hashBody(null);
        const db = getDb();

        const existingRecord = db.idempotencyKeys.find(
          (k) => k.userId === user.id && k.key === idempotencyKey
        );

        if (existingRecord) {
          if (existingRecord.status === 'in_progress') {
            return errorResponse(
              409,
              'IDEMPOTENCY_IN_PROGRESS',
              'Your payment is still processing. Give it a moment.',
              requestId
            );
          }
          if (existingRecord.path === path && existingRecord.bodyHash === bodyHash) {
            return jsonResponse(existingRecord.responseBody, existingRecord.statusCode || 200, {
              'Idempotent-Replayed': 'true',
              'X-Request-Id': requestId,
            });
          }
          return errorResponse(
            422,
            'IDEMPOTENCY_KEY_REUSED',
            'Something went wrong on our side. Please try again.',
            requestId
          );
        }

        // Record in progress
        const inProgressRec: MockIdempotencyRecord = {
          userId: user.id,
          key: idempotencyKey,
          path,
          bodyHash,
          status: 'in_progress',
          createdAt: engine.now().toISOString(),
        };
        db.idempotencyKeys.push(inProgressRec);
        saveDb();

        try {
          const res = engine.contribute(user.id, groupId, roundNumber);

          inProgressRec.status = 'completed';
          inProgressRec.statusCode = 201;
          inProgressRec.responseBody = res;
          saveDb();

          return jsonResponse(res, 201, { 'X-Request-Id': requestId });
        } catch (innerError: unknown) {
          // If permanent business rejection or error, remove the in_progress key
          db.idempotencyKeys = db.idempotencyKeys.filter(
            (k) => !(k.userId === user.id && k.key === idempotencyKey)
          );
          saveDb();
          throw innerError;
        }
      } catch (e: unknown) {
        const err = toError(e, 500, 'INTERNAL_ERROR');
        return errorResponse(err.status, err.code, err.message, requestId);
      }
    }
  ),

  // GET /groups/:groupId/activity
  http.get('/api/v1/groups/:groupId/activity', async ({ request, params }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      authenticateMockRequest(request, requestId);
      const groupId = params.groupId as string;
      const url = new URL(request.url);
      const cursor = url.searchParams.get('cursor');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

      const db = getDb();
      const groupActivities = db.activities
        .filter((a) => a.groupId === groupId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      let startIndex = 0;
      if (cursor) {
        try {
          const decoded = atob(cursor);
          const parsed = JSON.parse(decoded);
          const idx = groupActivities.findIndex((a) => a.id === parsed.id);
          if (idx !== -1) {
            startIndex = idx + 1;
          }
        } catch {
          // ignore
        }
      }

      const slice = groupActivities.slice(startIndex, startIndex + limit);
      const hasMore = startIndex + limit < groupActivities.length;
      const nextCursor =
        hasMore && slice.length > 0
          ? btoa(JSON.stringify({ id: slice[slice.length - 1]!.id }))
          : null;

      return jsonResponse(
        {
          data: slice.map(({ groupId: _gid, ...a }) => a),
          nextCursor,
        },
        200,
        { 'X-Request-Id': requestId }
      );
    } catch (e: unknown) {
      const err = toError(e, 404, 'NOT_FOUND');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),
];
