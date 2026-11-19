export type User = {
  id: string;
  fullName: string;
  email: string;
  phone: string; // "+234..."
  createdAt: string;
};

export type Wallet = {
  accountId: string;
  balanceKobo: number;
  currency: 'NGN';
};

export type LedgerTransactionType =
  | 'dev_funding'
  | 'deposit'
  | 'contribution'
  | 'payout'
  | 'withdrawal'
  | 'withdrawal_reversal';

export type WalletTransaction = {
  id: string; // ledger entry id (numeric string)
  transactionId: string; // ledger transaction id (uuid) -> link to GET /ledger/transactions/:id
  type: LedgerTransactionType;
  amountKobo: number; // signed: + money in, - money out of THIS wallet
  balanceAfterKobo: number; // wallet balance right after this entry
  description: string; // server-written, e.g. "Contribution to Office Ajo, round 3"
  createdAt: string;
};

export type GroupStatus = 'forming' | 'active' | 'completed' | 'cancelled';
export type RoundStatus = 'upcoming' | 'collecting' | 'paid_out';

export type PersonRef = { userId: string; fullName: string };

export type CurrentRoundSummary = {
  roundNumber: number;
  status: 'collecting';
  dueAt: string;
  recipient: PersonRef;
  contributedCount: number;
  totalMembers: number;
  iHaveContributed: boolean;
};

export type GroupSummary = {
  id: string;
  name: string;
  description: string | null;
  contributionKobo: number;
  frequency: 'weekly' | 'monthly';
  maxMembers: number;
  payoutOrder: 'join_order' | 'random';
  status: GroupStatus;
  inviteCode: string; // 8 chars, e.g. "K7QM2XPA"; display as "K7QM-2XPA"
  myRole: 'admin' | 'member';
  memberCount: number;
  potBalanceKobo: number;
  createdAt: string;
  startedAt: string | null;
  currentRound: CurrentRoundSummary | null; // null unless status = "active"
};

export type GroupMember = {
  userId: string;
  fullName: string;
  role: 'admin' | 'member';
  payoutPosition: number | null; // 1-based; null while forming
  joinedAt: string;
};

export type GroupDetail = GroupSummary & {
  members: GroupMember[]; // ordered by payoutPosition, then joinedAt
  totalRounds: number; // 0 while forming; = member count once started
};

export type Round = {
  roundNumber: number;
  status: RoundStatus;
  dueAt: string;
  paidOutAt: string | null;
  payoutTransactionId: string | null;
  recipient: PersonRef;
  potKobo: number; // contributionKobo * totalRounds
  contributions: Array<{
    userId: string;
    fullName: string;
    status: 'paid' | 'pending';
    paidAt: string | null;
    transactionId: string | null;
  }>; // one per member, same order as GroupDetail.members
};

export type LedgerEntryView = {
  accountId: string;
  accountType: 'user_wallet' | 'group_pot' | 'system';
  label: string; // "Your wallet" | "Ngozi Eze's wallet" | "Office Ajo pot" | "System: funding source"
  amountKobo: number; // signed
};

export type LedgerTransaction = {
  id: string;
  type: LedgerTransactionType;
  description: string;
  createdAt: string;
  entries: LedgerEntryView[]; // always sum to 0
};

export type Deposit = {
  id: string;
  amountKobo: number;
  provider: 'fake' | 'paystack';
  reference: string; // e.g. "KOLO-DEP-7F3K9Q2M"
  status: 'pending' | 'succeeded' | 'failed';
  checkoutUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type Bank = { code: string; name: string };

export type Withdrawal = {
  id: string;
  amountKobo: number;
  bankCode: string;
  bankName: string;
  accountNumberMasked: string; // "******7890"
  accountName: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActivityType =
  | 'member_joined'
  | 'member_left'
  | 'group_started'
  | 'contribution_made'
  | 'round_paid_out'
  | 'group_completed'
  | 'reminder_sent';

export type Activity = {
  id: string;
  type: ActivityType;
  actor: PersonRef | null;
  message: string; // server-written, e.g. "Tunde Bakare paid into round 2"
  createdAt: string;
};

export type NotificationType =
  | 'contribution_due'
  | 'contribution_overdue'
  | 'contribution_received'
  | 'payout_received'
  | 'group_started'
  | 'member_joined'
  | 'group_completed'
  | 'deposit_succeeded'
  | 'deposit_failed'
  | 'withdrawal_succeeded'
  | 'withdrawal_failed';

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null; // in-app path, e.g. "/app/groups/<id>"
  readAt: string | null;
  createdAt: string;
};

export type Paginated<T> = { data: T[]; nextCursor: string | null };

export type AuthResponse = {
  user: User;
  accessToken: string;
};

export type ContributeResponse = {
  contribution: {
    id: string;
    roundNumber: number;
    amountKobo: number;
    transactionId: string;
    createdAt: string;
  };
  roundPaidOut: boolean;
  wallet: Wallet;
};

export type DevFundWalletResponse = {
  transactionId: string;
  wallet: Wallet;
};

export type DevFakeContributionsResponse = {
  contributed: number;
  roundPaidOut: boolean;
};

export type DevRunDueRoundsResponse = {
  roundsChecked: number;
  remindersSent: number;
  autoContributions: number;
  overdueNotices: number;
};
