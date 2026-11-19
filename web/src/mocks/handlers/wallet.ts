import { http } from 'msw';
import {
  applyMockLatency,
  authenticateMockRequest,
  errorResponse,
  jsonResponse,
  toError,
} from '../http';
import { engine } from '../engine';
import { getDb } from '../db';

export const walletHandlers = [
  // GET /wallet
  http.get('/api/v1/wallet', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const wallet = engine.getUserWallet(user.id);
      return jsonResponse(wallet, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 401, 'UNAUTHENTICATED');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // GET /wallet/transactions
  http.get('/api/v1/wallet/transactions', async ({ request }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const url = new URL(request.url);
      const cursor = url.searchParams.get('cursor');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

      const paginated = engine.getWalletTransactions(user.id, cursor, limit);
      return jsonResponse(paginated, 200, { 'X-Request-Id': requestId });
    } catch (e: unknown) {
      const err = toError(e, 401, 'UNAUTHENTICATED');
      return errorResponse(err.status, err.code, err.message, requestId);
    }
  }),

  // GET /ledger/transactions/:transactionId
  http.get('/api/v1/ledger/transactions/:transactionId', async ({ request, params }) => {
    const requestId = request.headers.get('X-Request-Id') || crypto.randomUUID();
    await applyMockLatency();

    try {
      const user = authenticateMockRequest(request, requestId);
      const txId = params.transactionId as string;
      const db = getDb();

      const tx = db.ledgerTransactions.find((t) => t.id === txId);
      if (!tx) {
        return errorResponse(404, 'NOT_FOUND', 'Transaction not found', requestId);
      }

      // Check permission: caller must own one of the wallets, or be member of a group pot in the entries
      const entries = db.ledgerEntries.filter((e) => e.transactionId === txId);
      const userWalletAccount = engine.getUserWalletAccount(user.id);

      const userGroups = db.groupMembers
        .filter((m) => m.userId === user.id)
        .map((m) => m.groupId);

      const hasAccess = entries.some((e) => {
        if (e.accountId === userWalletAccount.id) return true;
        const acct = engine.getAccount(e.accountId);
        if (acct?.type === 'group_pot' && acct.groupId && userGroups.includes(acct.groupId)) {
          return true;
        }
        return false;
      });

      if (!hasAccess) {
        return errorResponse(
          404,
          'NOT_FOUND',
          'We couldn’t find that. It may have been removed, or you may not have access.',
          requestId
        );
      }

      const resolvedEntries = engine.resolveLedgerEntriesView(entries, user.id);

      return jsonResponse(
        {
          id: tx.id,
          type: tx.type,
          description: tx.description,
          createdAt: tx.createdAt,
          entries: resolvedEntries,
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
