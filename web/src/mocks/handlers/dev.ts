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
import { getDb, saveDb } from '../db';

export const devHandlers = [
  // POST /dev/fund-wallet [idempotent]
  http.post('/api/v1/dev/fund-wallet', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const idempotencyKey = request.headers.get('Idempotency-Key');
      const body = (await request.json()) as { amountKobo?: number };
      const bodyHash = hashBody(body);
      const path = '/dev/fund-wallet';

      const db = getDb();
      if (idempotencyKey) {
        const existing = db.idempotencyKeys.find(
          (k) => k.userId === user.id && k.key === idempotencyKey
        );
        if (existing) {
          if (existing.status === 'in_progress') {
            return errorResponse(
              409,
              'IDEMPOTENCY_IN_PROGRESS',
              'Your payment is still processing. Give it a moment.',
              requestId
            );
          }
          if (existing.path === path && existing.bodyHash === bodyHash) {
            return jsonResponse(existing.responseBody, existing.statusCode || 201, {
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

        const inProgressRec = {
          userId: user.id,
          key: idempotencyKey,
          path,
          bodyHash,
          status: 'in_progress' as const,
          createdAt: engine.now().toISOString(),
        };
        db.idempotencyKeys.push(inProgressRec);
        saveDb();
      }

      const amountKobo = body.amountKobo || 5_000_000;
      const res = engine.devFundWallet(user.id, amountKobo);

      if (idempotencyKey) {
        const rec = db.idempotencyKeys.find(
          (k) => k.userId === user.id && k.key === idempotencyKey
        );
        if (rec) {
          rec.status = 'completed';
          rec.statusCode = 201;
          rec.responseBody = res;
          saveDb();
        }
      }

      return jsonResponse(res, 201, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 500, 'INTERNAL_ERROR');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // POST /dev/groups/:groupId/fake-members
  http.post('/api/v1/dev/groups/:groupId/fake-members', async ({ request, params }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      authenticateMockRequest(request, requestId);
      const groupId = params.groupId as string;
      const body = (await request.json()) as { count?: number };
      const count = body.count || 1;

      const group = engine.devAddFakeMembers(groupId, count);
      return jsonResponse(group, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 400, 'VALIDATION_ERROR');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // POST /dev/groups/:groupId/fake-contributions
  http.post('/api/v1/dev/groups/:groupId/fake-contributions', async ({ request, params }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      authenticateMockRequest(request, requestId);
      const groupId = params.groupId as string;
      const res = engine.devFakeContributions(groupId);
      return jsonResponse(res, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 400, 'VALIDATION_ERROR');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // POST /dev/jobs/run-due-rounds
  http.post('/api/v1/dev/jobs/run-due-rounds', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      authenticateMockRequest(request, requestId);
      const res = engine.runDueRounds();
      return jsonResponse(res, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 500, 'INTERNAL_ERROR');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),
];
