import { apiRequest } from './client';
import { Bank, Deposit, Paginated, Withdrawal } from './types';

export function getBanksApi(): Promise<{ data: Bank[] }> {
  return apiRequest<{ data: Bank[] }>('GET', '/banks');
}

export function createDepositApi(
  amountKobo: number,
  idempotencyKey: string
): Promise<Deposit> {
  return apiRequest<Deposit>('POST', '/wallet/deposits', {
    body: { amountKobo },
    idempotencyKey,
  });
}

export function getDepositApi(depositId: string): Promise<Deposit> {
  return apiRequest<Deposit>('GET', `/wallet/deposits/${depositId}`);
}

export function createWithdrawalApi(
  input: {
    amountKobo: number;
    bankCode: string;
    accountNumber: string;
    accountName: string;
  },
  idempotencyKey: string
): Promise<Withdrawal> {
  return apiRequest<Withdrawal>('POST', '/wallet/withdrawals', {
    body: input,
    idempotencyKey,
  });
}

export function getWithdrawalsApi(
  cursor?: string | null,
  limit?: number
): Promise<Paginated<Withdrawal>> {
  return apiRequest<Paginated<Withdrawal>>('GET', '/wallet/withdrawals', {
    query: { cursor: cursor ?? undefined, limit },
  });
}

export function getWithdrawalApi(withdrawalId: string): Promise<Withdrawal> {
  return apiRequest<Withdrawal>('GET', `/wallet/withdrawals/${withdrawalId}`);
}

export function completeFakeDepositApi(
  reference: string,
  outcome: 'success' | 'failed'
): Promise<{ depositId: string }> {
  return apiRequest<{ depositId: string }>('POST', '/dev/fake-provider/complete', {
    body: { reference, outcome },
  });
}
