import {
  Deposit,
  GroupStatus,
  LedgerTransaction,
  Notification,
  Round,
  User,
  Withdrawal,
} from '../lib/api/types';

export type MockUser = User & {
  password: string; // Plain-text password for mock/dev environment only
  updatedAt?: string;
};

export type MockAccount = {
  id: string;
  type: 'user_wallet' | 'group_pot' | 'system';
  userId?: string;
  groupId?: string;
  systemName?: 'funding_source' | 'withdrawals_clearing' | 'payouts_sink';
  allowNegative: boolean;
  currency: 'NGN';
  createdAt: string;
};

export type MockLedgerEntry = {
  id: number;
  transactionId: string;
  accountId: string;
  amountKobo: number;
  createdAt: string;
};

export type MockGroup = {
  id: string;
  name: string;
  description: string | null;
  contributionKobo: number;
  frequency: 'weekly' | 'monthly';
  maxMembers: number;
  payoutOrder: 'join_order' | 'random';
  status: GroupStatus;
  inviteCode: string;
  createdBy: string;
  startedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MockGroupMember = {
  groupId: string;
  userId: string;
  role: 'admin' | 'member';
  payoutPosition: number | null;
  joinedAt: string;
};

export type MockRound = Round & {
  groupId: string;
};

export type MockContribution = {
  id: string;
  roundId: string;
  groupId: string;
  roundNumber: number;
  userId: string;
  amountKobo: number;
  transactionId: string;
  createdAt: string;
};

export type MockDeposit = Deposit & {
  userId: string;
};

export type MockWithdrawal = Withdrawal & {
  userId: string;
  accountNumberFull: string;
};

export type MockActivity = {
  id: string;
  groupId: string;
  type: string;
  actor: { userId: string; fullName: string } | null;
  message: string;
  createdAt: string;
};

export type MockNotification = Notification & {
  userId: string;
};

export type MockIdempotencyRecord = {
  userId: string;
  key: string;
  path: string;
  bodyHash: string;
  status: 'in_progress' | 'completed';
  statusCode?: number;
  responseHeaders?: Record<string, string>;
  responseBody?: Record<string, unknown> | unknown[] | string | number | boolean | null;
  createdAt: string;
};

export type MockRefreshToken = {
  token: string;
  userId: string;
  expiresAt: string;
  revoked: boolean;
};

export type MockLoginAttempt = {
  email: string;
  attempts: number;
  firstAttemptAt: string;
  lastAttemptAt: string;
  lockedUntil?: string;
};

export type MockDbState = {
  users: MockUser[];
  accounts: MockAccount[];
  ledgerTransactions: LedgerTransaction[];
  ledgerEntries: MockLedgerEntry[];
  groups: MockGroup[];
  groupMembers: MockGroupMember[];
  rounds: MockRound[];
  roundGroupMap: Record<string, { groupId: string; id: string }>;
  contributions: MockContribution[];
  deposits: MockDeposit[];
  withdrawals: MockWithdrawal[];
  activities: MockActivity[];
  notifications: MockNotification[];
  idempotencyKeys: MockIdempotencyRecord[];
  refreshTokens: MockRefreshToken[];
  loginAttempts: MockLoginAttempt[];
  nextLedgerEntryId: number;
};

const STORAGE_KEY = 'kolo-mock-db-v1';

let currentState: MockDbState | null = null;

export function getDb(): MockDbState {
  if (!currentState) {
    loadDb();
  }
  return currentState!;
}

export function saveDb(): void {
  if (!currentState) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  } catch {
    // ignore quota errors
  }
}

export function setDbState(state: MockDbState): void {
  currentState = state;
  saveDb();
}

export function loadDb(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.ledgerTransactions)) {
        currentState = parsed;
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

export function clearDbStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  currentState = null;
}
