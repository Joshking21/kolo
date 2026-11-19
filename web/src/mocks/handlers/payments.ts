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

export const paymentHandlers = [
  // GET /banks
  http.get('/api/v1/banks', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      authenticateMockRequest(request, requestId);
      const banks = engine.getBanks();
      return jsonResponse({ data: banks }, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 401, 'UNAUTHENTICATED');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // POST /wallet/deposits [idempotent]
  http.post('/api/v1/wallet/deposits', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const idempotencyKey = request.headers.get('Idempotency-Key');
      if (!idempotencyKey) {
        return errorResponse(
          400,
          'IDEMPOTENCY_KEY_MISSING',
          'An [idempotent] endpoint was called without a valid Idempotency-Key',
          requestId
        );
      }

      const body = (await request.json()) as { amountKobo?: number };
      const bodyHash = hashBody(body);
      const path = '/wallet/deposits';

      const db = getDb();
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

      if (!body.amountKobo || body.amountKobo < 10_000 || body.amountKobo > 50_000_000) {
        return errorResponse(
          400,
          'VALIDATION_ERROR',
          'Deposit amount must be between ₦100 and ₦500,000',
          requestId,
          [{ path: 'amountKobo', message: 'Enter a valid deposit amount' }]
        );
      }

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

      const deposit = engine.createDeposit(user.id, body.amountKobo);

      inProgressRec.status = 'completed';
      inProgressRec.statusCode = 201;
      inProgressRec.responseBody = deposit;
      saveDb();

      return jsonResponse(deposit, 201, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 500, 'INTERNAL_ERROR');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // GET /wallet/deposits/:depositId
  http.get('/api/v1/wallet/deposits/:depositId', async ({ request, params }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const depositId = params.depositId as string;
      const db = getDb();

      const deposit = db.deposits.find((d) => d.id === depositId && d.userId === user.id);
      if (!deposit) {
        return errorResponse(404, 'NOT_FOUND', 'Deposit not found', requestId);
      }

      return jsonResponse(deposit, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 404, 'NOT_FOUND');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // POST /wallet/withdrawals [idempotent]
  http.post('/api/v1/wallet/withdrawals', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const idempotencyKey = request.headers.get('Idempotency-Key');
      if (!idempotencyKey) {
        return errorResponse(
          400,
          'IDEMPOTENCY_KEY_MISSING',
          'An [idempotent] endpoint was called without a valid Idempotency-Key',
          requestId
        );
      }

      const body = (await request.json()) as {
        amountKobo: number;
        bankCode: string;
        accountNumber: string;
        accountName: string;
      };
      const bodyHash = hashBody(body);
      const path = '/wallet/withdrawals';

      const db = getDb();
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
          return jsonResponse(existing.responseBody, existing.statusCode || 202, {
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

      const userWallet = engine.getUserWallet(user.id);
      if (body.amountKobo > userWallet.balanceKobo) {
        return errorResponse(
          422,
          'INSUFFICIENT_FUNDS',
          'You don’t have enough in your wallet. Add money and try again.',
          requestId
        );
      }

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
        const withdrawal = engine.createWithdrawal(user.id, body);

        inProgressRec.status = 'completed';
        inProgressRec.statusCode = 202;
        inProgressRec.responseBody = withdrawal;
        saveDb();

        return jsonResponse(withdrawal, 202, { 'X-Request-Id': requestId });
      } catch (err: unknown) {
        db.idempotencyKeys = db.idempotencyKeys.filter(
          (k) => !(k.userId === user.id && k.key === idempotencyKey)
        );
        saveDb();
        throw err;
      }
    } catch (e: unknown) {
      const err = toError(e, 400, 'VALIDATION_ERROR');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // GET /wallet/withdrawals
  http.get('/api/v1/wallet/withdrawals', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const url = new URL(request.url);
      const cursor = url.searchParams.get('cursor');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

      const paginated = engine.getWithdrawals(user.id, cursor, limit);
      return jsonResponse(paginated, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 401, 'UNAUTHENTICATED');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // GET /wallet/withdrawals/:withdrawalId
  http.get('/api/v1/wallet/withdrawals/:withdrawalId', async ({ request, params }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const withdrawalId = params.withdrawalId as string;
      const db = getDb();
      engine.syncWithdrawals();

      const w = db.withdrawals.find((item) => item.id === withdrawalId && item.userId === user.id);
      if (!w) {
        return errorResponse(404, 'NOT_FOUND', 'Withdrawal not found', requestId);
      }

      const { userId: _uid, accountNumberFull: _anf, ...safeW } = w;
      return jsonResponse(safeW, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 404, 'NOT_FOUND');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // POST /dev/fake-provider/complete
  http.post('/api/v1/dev/fake-provider/complete', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      authenticateMockRequest(request, requestId);
      const body = (await request.json()) as { reference: string; outcome: 'success' | 'failed' };
      const res = engine.completeFakeDeposit(body.reference, body.outcome);
      return jsonResponse(res, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 400, 'VALIDATION_ERROR');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),
];
