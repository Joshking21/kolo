import { QueryClient } from '@tanstack/react-query';
import { isApiError } from './api/errors';

export const queryKeys = {
  me: () => ['me'] as const,
  wallet: () => ['wallet'] as const,
  walletTransactions: () => ['wallet', 'transactions'] as const,
  deposit: (depositId: string) => ['wallet', 'deposits', depositId] as const,
  withdrawals: () => ['wallet', 'withdrawals'] as const,
  withdrawal: (withdrawalId: string) => ['wallet', 'withdrawals', withdrawalId] as const,
  banks: () => ['banks'] as const,
  groups: () => ['groups'] as const,
  group: (groupId: string) => ['groups', groupId] as const,
  groupRounds: (groupId: string) => ['groups', groupId, 'rounds'] as const,
  groupActivity: (groupId: string) => ['groups', groupId, 'activity'] as const,
  ledgerTransaction: (transactionId: string) => ['ledger', transactionId] as const,
  notifications: () => ['notifications'] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
};

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 15_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          if (isApiError(error)) {
            // 0 for any ApiError with status 400-499
            if (error.status >= 400 && error.status < 500) {
              return false;
            }
          }
          // up to 2 for network errors and 5xx
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
      },
      mutations: {
        retry: false,
      },
    },
  });
}
