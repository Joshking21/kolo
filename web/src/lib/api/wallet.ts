import { apiRequest } from './client';
import { LedgerTransaction, Paginated, Wallet, WalletTransaction } from './types';

export function getWalletApi(): Promise<Wallet> {
  return apiRequest<Wallet>('GET', '/wallet');
}

export function getWalletTransactionsApi(
  cursor?: string | null,
  limit?: number
): Promise<Paginated<WalletTransaction>> {
  return apiRequest<Paginated<WalletTransaction>>('GET', '/wallet/transactions', {
    query: { cursor: cursor ?? undefined, limit },
  });
}

export function getLedgerTransactionApi(
  transactionId: string
): Promise<LedgerTransaction> {
  return apiRequest<LedgerTransaction>('GET', `/ledger/transactions/${transactionId}`);
}
