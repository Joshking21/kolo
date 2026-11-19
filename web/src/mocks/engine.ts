import {
  ActivityType,
  Bank,
  ContributeResponse,
  CurrentRoundSummary,
  Deposit,
  GroupDetail,
  GroupMember,
  GroupStatus,
  GroupSummary,
  LedgerEntryView,
  LedgerTransaction,
  LedgerTransactionType,
  NotificationType,
  Paginated,
  Round,
  Wallet,
  WalletTransaction,
  Withdrawal,
} from '../lib/api/types';
import { ApiError } from '../lib/api/errors';
import {
  getDb,
  MockAccount,
  MockActivity,
  MockDeposit,
  MockGroup,
  MockLedgerEntry,
  MockNotification,
  MockRound,
  MockUser,
  MockWithdrawal,
  saveDb,
} from './db';

let simulatedNow: Date | null = null;

export const engine = {
  now(): Date {
    return simulatedNow ?? new Date();
  },

  setNow(d: Date | null) {
    simulatedNow = d;
  },

  resetClock() {
    simulatedNow = null;
  },

  getAccount(id: string): MockAccount | undefined {
    return getDb().accounts.find((a) => a.id === id);
  },

  getSystemAccount(name: 'funding_source' | 'withdrawals_clearing' | 'payouts_sink'): MockAccount {
    const db = getDb();
    let account = db.accounts.find((a) => a.systemName === name);
    if (!account) {
      account = {
        id: crypto.randomUUID(),
        type: 'system',
        systemName: name,
        allowNegative: name !== 'withdrawals_clearing',
        currency: 'NGN',
        createdAt: engine.now().toISOString(),
      };
      db.accounts.push(account);
      saveDb();
    }
    return account;
  },

  getUserWalletAccount(userId: string): MockAccount {
    const db = getDb();
    let account = db.accounts.find((a) => a.type === 'user_wallet' && a.userId === userId);
    if (!account) {
      account = {
        id: crypto.randomUUID(),
        type: 'user_wallet',
        userId,
        allowNegative: false,
        currency: 'NGN',
        createdAt: engine.now().toISOString(),
      };
      db.accounts.push(account);
      saveDb();
    }
    return account;
  },

  getGroupPotAccount(groupId: string): MockAccount {
    const db = getDb();
    let account = db.accounts.find((a) => a.type === 'group_pot' && a.groupId === groupId);
    if (!account) {
      account = {
        id: crypto.randomUUID(),
        type: 'group_pot',
        groupId,
        allowNegative: false,
        currency: 'NGN',
        createdAt: engine.now().toISOString(),
      };
      db.accounts.push(account);
      saveDb();
    }
    return account;
  },

  getAccountBalance(accountId: string): number {
    const db = getDb();
    return db.ledgerEntries
      .filter((e) => e.accountId === accountId)
      .reduce((sum, e) => sum + e.amountKobo, 0);
  },

  getUserWallet(userId: string): Wallet {
    const account = engine.getUserWalletAccount(userId);
    return {
      accountId: account.id,
      balanceKobo: engine.getAccountBalance(account.id),
      currency: 'NGN',
    };
  },

  postLedgerTransaction(opts: {
    type: LedgerTransactionType;
    description: string;
    reference?: string;
    createdAt?: string;
    entries: Array<{ accountId: string; amountKobo: number }>;
  }): LedgerTransaction {
    const sum = opts.entries.reduce((acc, e) => acc + e.amountKobo, 0);
    if (sum !== 0) {
      throw new Error(`Ledger entries do not sum to zero (sum is ${sum} kobo)`);
    }

    // Check balance rules
    for (const e of opts.entries) {
      if (e.amountKobo < 0) {
        const account = engine.getAccount(e.accountId);
        if (!account) {
          throw new Error(`Account not found: ${e.accountId}`);
        }
        if (!account.allowNegative) {
          const currentBalance = engine.getAccountBalance(account.id);
          if (currentBalance + e.amountKobo < 0) {
            throw new ApiError({
              status: 422,
              code: 'INSUFFICIENT_FUNDS',
              message: 'Your wallet balance is too low for this payment.',
            });
          }
        }
      }
    }

    const db = getDb();
    const timestamp = opts.createdAt ?? engine.now().toISOString();
    const transactionId = crypto.randomUUID();

    const createdEntries: MockLedgerEntry[] = opts.entries.map((e) => {
      const entryId = db.nextLedgerEntryId++;
      return {
        id: entryId,
        transactionId,
        accountId: e.accountId,
        amountKobo: e.amountKobo,
        createdAt: timestamp,
      };
    });

    db.ledgerEntries.push(...createdEntries);

    const transaction: LedgerTransaction = {
      id: transactionId,
      type: opts.type,
      description: opts.description,
      createdAt: timestamp,
      entries: engine.resolveLedgerEntriesView(createdEntries),
    };

    db.ledgerTransactions.push(transaction);
    saveDb();
    return transaction;
  },

  resolveLedgerEntriesView(entries: MockLedgerEntry[], viewerUserId?: string): LedgerEntryView[] {
    const db = getDb();
    return entries.map((entry) => {
      const account = engine.getAccount(entry.accountId);
      let label = 'Account';
      let accountType: 'user_wallet' | 'group_pot' | 'system' = 'system';

      if (!account) {
        label = 'Unknown account';
      } else if (account.type === 'user_wallet') {
        accountType = 'user_wallet';
        if (viewerUserId && account.userId === viewerUserId) {
          label = 'Your wallet';
        } else {
          const owner = db.users.find((u) => u.id === account.userId);
          label = owner ? `${owner.fullName}'s wallet` : 'User wallet';
        }
      } else if (account.type === 'group_pot') {
        accountType = 'group_pot';
        const group = db.groups.find((g) => g.id === account.groupId);
        label = group ? `${group.name} pot` : 'Group pot';
      } else if (account.type === 'system') {
        accountType = 'system';
        if (account.systemName === 'funding_source') {
          label = 'System: funding source';
        } else if (account.systemName === 'withdrawals_clearing') {
          label = 'System: withdrawals in progress';
        } else if (account.systemName === 'payouts_sink') {
          label = 'System: paid out to bank';
        }
      }

      return {
        accountId: entry.accountId,
        accountType,
        label,
        amountKobo: entry.amountKobo,
      };
    });
  },

  addActivity(groupId: string, type: ActivityType, actorUserId: string | null, message: string, createdAt?: string) {
    const db = getDb();
    const actor = actorUserId ? db.users.find((u) => u.id === actorUserId) : null;
    const item: MockActivity = {
      id: crypto.randomUUID(),
      groupId,
      type,
      actor: actor ? { userId: actor.id, fullName: actor.fullName } : null,
      message,
      createdAt: createdAt ?? engine.now().toISOString(),
    };
    db.activities.unshift(item);
    saveDb();
    return item;
  },

  addNotification(userId: string, type: NotificationType, title: string, body: string, link: string | null = null, createdAt?: string) {
    const db = getDb();
    const item: MockNotification = {
      id: crypto.randomUUID(),
      userId,
      type,
      title,
      body,
      link,
      readAt: null,
      createdAt: createdAt ?? engine.now().toISOString(),
    };
    db.notifications.unshift(item);
    saveDb();
    return item;
  },

  generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  createGroup(userId: string, input: {
    name: string;
    description?: string | null;
    contributionKobo: number;
    frequency: 'weekly' | 'monthly';
    maxMembers: number;
    payoutOrder: 'join_order' | 'random';
  }): GroupDetail {
    const db = getDb();
    const creator = db.users.find((u) => u.id === userId);
    if (!creator) {
      throw new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'User not found' });
    }

    const groupId = crypto.randomUUID();
    const nowIso = engine.now().toISOString();
    const inviteCode = engine.generateInviteCode();

    const group: MockGroup = {
      id: groupId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      contributionKobo: input.contributionKobo,
      frequency: input.frequency,
      maxMembers: input.maxMembers,
      payoutOrder: input.payoutOrder,
      status: 'forming',
      inviteCode,
      createdBy: userId,
      startedAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.groups.push(group);
    db.groupMembers.push({
      groupId,
      userId,
      role: 'admin',
      payoutPosition: null,
      joinedAt: nowIso,
    });

    engine.getGroupPotAccount(groupId);
    engine.addActivity(groupId, 'member_joined', userId, `${creator.fullName} created the group`);
    saveDb();
    return engine.getGroupDetail(groupId, userId);
  },

  joinGroup(userId: string, inviteCode: string): GroupDetail {
    const db = getDb();
    const cleaned = inviteCode.toUpperCase().replace(/[\s-]/g, '').trim();
    const group = db.groups.find((g) => g.inviteCode === cleaned);
    if (!group) {
      throw new ApiError({
        status: 422,
        code: 'INVALID_INVITE_CODE',
        message: 'That invite code doesn’t match any group.',
      });
    }

    if (group.status !== 'forming') {
      throw new ApiError({
        status: 409,
        code: 'GROUP_NOT_FORMING',
        message: 'This group has already started, so that’s no longer possible.',
      });
    }

    const members = db.groupMembers.filter((m) => m.groupId === group.id);
    if (members.some((m) => m.userId === userId)) {
      throw new ApiError({
        status: 409,
        code: 'ALREADY_MEMBER',
        message: 'You’re already in this group.',
      });
    }

    if (members.length >= group.maxMembers) {
      throw new ApiError({
        status: 409,
        code: 'GROUP_FULL',
        message: 'This group is full.',
      });
    }

    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      throw new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'User not found' });
    }

    const nowIso = engine.now().toISOString();
    db.groupMembers.push({
      groupId: group.id,
      userId,
      role: 'member',
      payoutPosition: null,
      joinedAt: nowIso,
    });

    engine.addActivity(group.id, 'member_joined', userId, `${user.fullName} joined the group`);
    saveDb();
    return engine.getGroupDetail(group.id, userId);
  },

  leaveGroup(userId: string, groupId: string): void {
    const db = getDb();
    const group = db.groups.find((g) => g.id === groupId);
    if (!group) {
      throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Group not found' });
    }

    if (group.status !== 'forming') {
      throw new ApiError({
        status: 409,
        code: 'GROUP_NOT_FORMING',
        message: 'This group has already started, so that’s no longer possible.',
      });
    }

    const member = db.groupMembers.find((m) => m.groupId === groupId && m.userId === userId);
    if (!member) {
      throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Not a member' });
    }

    if (member.role === 'admin') {
      throw new ApiError({
        status: 409,
        code: 'ADMIN_CANNOT_LEAVE',
        message: 'As the admin, you can’t leave. Cancel the group instead.',
      });
    }

    const user = db.users.find((u) => u.id === userId);
    db.groupMembers = db.groupMembers.filter((m) => !(m.groupId === groupId && m.userId === userId));

    if (user) {
      engine.addActivity(groupId, 'member_left', userId, `${user.fullName} left the group`);
    }
    saveDb();
  },

  cancelGroup(userId: string, groupId: string): GroupDetail {
    const db = getDb();
    const group = db.groups.find((g) => g.id === groupId);
    if (!group) {
      throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Group not found' });
    }

    const member = db.groupMembers.find((m) => m.groupId === groupId && m.userId === userId);
    if (!member || member.role !== 'admin') {
      throw new ApiError({
        status: 403,
        code: 'FORBIDDEN',
        message: 'Only the group admin can do that.',
      });
    }

    if (group.status !== 'forming') {
      throw new ApiError({
        status: 409,
        code: 'GROUP_NOT_FORMING',
        message: 'This group has already started, so that’s no longer possible.',
      });
    }

    group.status = 'cancelled';
    group.updatedAt = engine.now().toISOString();
    saveDb();
    return engine.getGroupDetail(groupId, userId);
  },

  startGroup(userId: string, groupId: string, startedAt?: string): GroupDetail {
    const db = getDb();
    const group = db.groups.find((g) => g.id === groupId);
    if (!group) {
      throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Group not found' });
    }

    const admin = db.groupMembers.find((m) => m.groupId === groupId && m.userId === userId);
    if (!admin || admin.role !== 'admin') {
      throw new ApiError({
        status: 403,
        code: 'FORBIDDEN',
        message: 'Only the group admin can do that.',
      });
    }

    if (group.status !== 'forming') {
      throw new ApiError({
        status: 409,
        code: 'GROUP_NOT_FORMING',
        message: 'This group has already started, so that’s no longer possible.',
      });
    }

    const members = db.groupMembers.filter((m) => m.groupId === groupId);
    if (members.length < 2) {
      throw new ApiError({
        status: 409,
        code: 'NOT_ENOUGH_MEMBERS',
        message: 'A group needs at least 2 members to start.',
      });
    }

    if (group.payoutOrder === 'join_order') {
      members.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
      members.forEach((m, idx) => {
        m.payoutPosition = idx + 1;
      });
    } else {
      const shuffled = [...members];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffled[i]!;
        shuffled[i] = shuffled[j]!;
        shuffled[j] = temp;
      }
      shuffled.forEach((m, idx) => {
        m.payoutPosition = idx + 1;
      });
    }

    const startDate = startedAt ? new Date(startedAt) : engine.now();
    const totalRounds = members.length;

    for (let k = 1; k <= totalRounds; k++) {
      const recipientMember = members.find((m) => m.payoutPosition === k)!;
      const recipientUser = db.users.find((u) => u.id === recipientMember.userId)!;

      const dueDate = new Date(startDate);
      if (group.frequency === 'weekly') {
        dueDate.setDate(dueDate.getDate() + 7 * k);
      } else {
        dueDate.setMonth(dueDate.getMonth() + k);
      }

      const roundId = crypto.randomUUID();
      const roundContributions = members.map((m) => {
        const u = db.users.find((user) => user.id === m.userId)!;
        return {
          userId: m.userId,
          fullName: u.fullName,
          status: 'pending' as const,
          paidAt: null,
          transactionId: null,
        };
      });

      const round: MockRound = {
        groupId,
        roundNumber: k,
        status: k === 1 ? 'collecting' : 'upcoming',
        dueAt: dueDate.toISOString(),
        paidOutAt: null,
        payoutTransactionId: null,
        recipient: { userId: recipientUser.id, fullName: recipientUser.fullName },
        potKobo: group.contributionKobo * totalRounds,
        contributions: roundContributions,
      };

      db.rounds.push(round);
      db.roundGroupMap[roundId] = { groupId, id: roundId };
    }

    group.status = 'active';
    group.startedAt = startDate.toISOString();
    group.updatedAt = engine.now().toISOString();

    engine.addActivity(groupId, 'group_started', userId, `Group started with ${totalRounds} members`);

    for (const m of members) {
      engine.addNotification(
        m.userId,
        'group_started',
        'Group started',
        `"${group.name}" has started! First contribution is now collecting.`,
        `/app/groups/${groupId}`
      );
    }

    saveDb();
    return engine.getGroupDetail(groupId, userId);
  },

  contribute(userId: string, groupId: string, roundNumber: number, contributeTime?: string): ContributeResponse {
    const db = getDb();
    const group = db.groups.find((g) => g.id === groupId);
    if (!group) {
      throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Group not found' });
    }

    if (group.status !== 'active') {
      throw new ApiError({
        status: 409,
        code: 'GROUP_NOT_ACTIVE',
        message: 'This group isn’t active.',
      });
    }

    const member = db.groupMembers.find((m) => m.groupId === groupId && m.userId === userId);
    if (!member) {
      throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'You are not in this group' });
    }

    const groupRounds = engine.getGroupRounds(groupId);
    const targetRound = groupRounds.find((r) => r.roundNumber === roundNumber);
    if (!targetRound) {
      throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Round not found' });
    }

    if (targetRound.status !== 'collecting') {
      throw new ApiError({
        status: 409,
        code: 'ROUND_NOT_COLLECTING',
        message: 'This round isn’t taking payments.',
      });
    }

    const user = db.users.find((u) => u.id === userId);
    if (!user) {
      throw new ApiError({ status: 401, code: 'UNAUTHENTICATED', message: 'User not found' });
    }

    const existingContribution = db.contributions.find(
      (c) => c.groupId === groupId && c.roundNumber === roundNumber && c.userId === userId
    );
    if (existingContribution) {
      throw new ApiError({
        status: 409,
        code: 'ALREADY_CONTRIBUTED',
        message: 'You’ve already paid into this round.',
      });
    }

    const timestamp = contributeTime ?? engine.now().toISOString();
    const userWalletAccount = engine.getUserWalletAccount(userId);
    const groupPotAccount = engine.getGroupPotAccount(groupId);

    const tx = engine.postLedgerTransaction({
      type: 'contribution',
      description: `Contribution to ${group.name}, round ${roundNumber}`,
      createdAt: timestamp,
      entries: [
        { accountId: userWalletAccount.id, amountKobo: -group.contributionKobo },
        { accountId: groupPotAccount.id, amountKobo: group.contributionKobo },
      ],
    });

    const contributionId = crypto.randomUUID();
    db.contributions.push({
      id: contributionId,
      roundId: `round-${groupId}-${roundNumber}`,
      groupId,
      roundNumber,
      userId,
      amountKobo: group.contributionKobo,
      transactionId: tx.id,
      createdAt: timestamp,
    });

    const roundContribItem = targetRound.contributions.find((c) => c.userId === userId);
    if (roundContribItem) {
      roundContribItem.status = 'paid';
      roundContribItem.paidAt = timestamp;
      roundContribItem.transactionId = tx.id;
    }

    engine.addActivity(
      groupId,
      'contribution_made',
      userId,
      `${user.fullName} paid into round ${roundNumber}`,
      timestamp
    );

    if (targetRound.recipient.userId !== userId) {
      engine.addNotification(
        targetRound.recipient.userId,
        'contribution_received',
        'Contribution received',
        `${user.fullName} paid into round ${roundNumber} of "${group.name}".`,
        `/app/groups/${groupId}`,
        timestamp
      );
    }

    const paidCount = targetRound.contributions.filter((c) => c.status === 'paid').length;
    let roundPaidOut = false;

    if (paidCount === targetRound.contributions.length) {
      roundPaidOut = true;
      const totalPot = group.contributionKobo * targetRound.contributions.length;
      const recipientWalletAccount = engine.getUserWalletAccount(targetRound.recipient.userId);

      const payoutTx = engine.postLedgerTransaction({
        type: 'payout',
        description: `Payout for ${group.name}, round ${roundNumber}`,
        createdAt: timestamp,
        entries: [
          { accountId: groupPotAccount.id, amountKobo: -totalPot },
          { accountId: recipientWalletAccount.id, amountKobo: totalPot },
        ],
      });

      targetRound.status = 'paid_out';
      targetRound.paidOutAt = timestamp;
      targetRound.payoutTransactionId = payoutTx.id;

      engine.addActivity(
        groupId,
        'round_paid_out',
        targetRound.recipient.userId,
        `${targetRound.recipient.fullName} received payout of ₦${(totalPot / 100).toLocaleString('en-NG')} for round ${roundNumber}`,
        timestamp
      );

      engine.addNotification(
        targetRound.recipient.userId,
        'payout_received',
        'You collected the pot!',
        `₦${(totalPot / 100).toLocaleString('en-NG')} from round ${roundNumber} of "${group.name}" has landed in your wallet.`,
        `/app/groups/${groupId}`,
        timestamp
      );

      const nextRound = groupRounds.find((r) => r.roundNumber === roundNumber + 1);
      if (nextRound) {
        nextRound.status = 'collecting';
      } else {
        group.status = 'completed';
        group.updatedAt = timestamp;
        engine.addActivity(groupId, 'group_completed', null, `Group "${group.name}" completed! All rounds collected.`, timestamp);

        const groupMembers = db.groupMembers.filter((m) => m.groupId === groupId);
        for (const m of groupMembers) {
          engine.addNotification(
            m.userId,
            'group_completed',
            'Group completed',
            `"${group.name}" has finished! All members have collected.`,
            `/app/groups/${groupId}`,
            timestamp
          );
        }
      }
    }

    saveDb();

    return {
      contribution: {
        id: contributionId,
        roundNumber,
        amountKobo: group.contributionKobo,
        transactionId: tx.id,
        createdAt: timestamp,
      },
      roundPaidOut,
      wallet: engine.getUserWallet(userId),
    };
  },

  getGroupDetail(groupId: string, viewerUserId: string): GroupDetail {
    const db = getDb();
    const group = db.groups.find((g) => g.id === groupId);
    if (!group) {
      throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Group not found' });
    }

    const members = db.groupMembers.filter((m) => m.groupId === groupId);
    const viewerMember = members.find((m) => m.userId === viewerUserId);
    if (!viewerMember) {
      throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Group not found' });
    }

    const sortedMembers = [...members].sort((a, b) => {
      if (a.payoutPosition !== null && b.payoutPosition !== null) {
        return a.payoutPosition - b.payoutPosition;
      }
      if (a.payoutPosition !== null) return -1;
      if (b.payoutPosition !== null) return 1;
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });

    const populatedMembers: GroupMember[] = sortedMembers.map((m) => {
      const u = db.users.find((user) => user.id === m.userId);
      return {
        userId: m.userId,
        fullName: u?.fullName ?? 'Unknown',
        role: m.role,
        payoutPosition: m.payoutPosition,
        joinedAt: m.joinedAt,
      };
    });

    const groupRounds = engine.getGroupRounds(groupId);
    const potAccount = engine.getGroupPotAccount(groupId);
    const potBalanceKobo = engine.getAccountBalance(potAccount.id);

    let currentRoundSummary: CurrentRoundSummary | null = null;
    if (group.status === 'active') {
      const collectingRound = groupRounds.find((r) => r.status === 'collecting');
      if (collectingRound) {
        const contributedCount = collectingRound.contributions.filter((c) => c.status === 'paid').length;
        const iContributed = collectingRound.contributions.some(
          (c) => c.userId === viewerUserId && c.status === 'paid'
        );
        currentRoundSummary = {
          roundNumber: collectingRound.roundNumber,
          status: 'collecting',
          dueAt: collectingRound.dueAt,
          recipient: collectingRound.recipient,
          contributedCount,
          totalMembers: members.length,
          iHaveContributed: iContributed,
        };
      }
    }

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      contributionKobo: group.contributionKobo,
      frequency: group.frequency,
      maxMembers: group.maxMembers,
      payoutOrder: group.payoutOrder,
      status: group.status,
      inviteCode: group.inviteCode,
      myRole: viewerMember.role,
      memberCount: members.length,
      potBalanceKobo,
      createdAt: group.createdAt,
      startedAt: group.startedAt,
      currentRound: currentRoundSummary,
      members: populatedMembers,
      totalRounds: group.status === 'forming' ? 0 : groupRounds.length,
    };
  },

  getGroupRounds(groupId: string): Round[] {
    const db = getDb();
    const group = db.groups.find((g) => g.id === groupId);
    if (!group || group.status === 'forming') {
      return [];
    }

    const rounds = db.rounds.filter((r) => r.groupId === groupId);
    return rounds.sort((a, b) => a.roundNumber - b.roundNumber);
  },

  getGroupsForUser(userId: string): GroupSummary[] {
    const db = getDb();
    const userMemberships = db.groupMembers.filter((m) => m.userId === userId);
    const summaries: GroupSummary[] = [];

    for (const membership of userMemberships) {
      const group = db.groups.find((g) => g.id === membership.groupId);
      if (!group) continue;
      const detail = engine.getGroupDetail(group.id, userId);
      const { members: _m, totalRounds: _t, ...summary } = detail;
      summaries.push(summary);
    }

    return summaries.sort((a, b) => {
      const statusOrder: Record<GroupStatus, number> = {
        active: 1,
        forming: 2,
        completed: 3,
        cancelled: 4,
      };
      if (a.status !== b.status) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      if (a.status === 'active' && a.currentRound && b.currentRound) {
        return new Date(a.currentRound.dueAt).getTime() - new Date(b.currentRound.dueAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  },

  getWalletTransactions(userId: string, cursor?: string | null, limit: number = 20): Paginated<WalletTransaction> {
    const db = getDb();
    const walletAccount = engine.getUserWalletAccount(userId);

    const entries = db.ledgerEntries
      .filter((e) => e.accountId === walletAccount.id)
      .sort((a, b) => a.id - b.id);

    let runningBalance = 0;
    const computedTransactions: WalletTransaction[] = [];

    for (const entry of entries) {
      runningBalance += entry.amountKobo;
      const tx = db.ledgerTransactions.find((t) => t.id === entry.transactionId);
      computedTransactions.push({
        id: String(entry.id),
        transactionId: entry.transactionId,
        type: tx?.type ?? 'dev_funding',
        amountKobo: entry.amountKobo,
        balanceAfterKobo: runningBalance,
        description: tx?.description ?? 'Transaction',
        createdAt: entry.createdAt,
      });
    }

    computedTransactions.reverse();

    let startIndex = 0;
    if (cursor) {
      try {
        const decoded = atob(cursor);
        const parsed = JSON.parse(decoded);
        const cursorId = String(parsed.id);
        const idx = computedTransactions.findIndex((t) => t.id === cursorId);
        if (idx !== -1) {
          startIndex = idx + 1;
        }
      } catch {
        // ignore
      }
    }

    const slice = computedTransactions.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < computedTransactions.length;
    const nextCursor = hasMore && slice.length > 0
      ? btoa(JSON.stringify({ id: slice[slice.length - 1]!.id }))
      : null;

    return {
      data: slice,
      nextCursor,
    };
  },

  devFundWallet(userId: string, amountKobo: number): { transactionId: string; wallet: Wallet } {
    const fundingSource = engine.getSystemAccount('funding_source');
    const userWalletAccount = engine.getUserWalletAccount(userId);

    const tx = engine.postLedgerTransaction({
      type: 'dev_funding',
      description: 'Dev wallet funding',
      entries: [
        { accountId: fundingSource.id, amountKobo: -amountKobo },
        { accountId: userWalletAccount.id, amountKobo },
      ],
    });

    return {
      transactionId: tx.id,
      wallet: engine.getUserWallet(userId),
    };
  },

  devAddFakeMembers(groupId: string, count: number): GroupDetail {
    const db = getDb();
    const group = db.groups.find((g) => g.id === groupId);
    if (!group) throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Group not found' });
    if (group.status !== 'forming') {
      throw new ApiError({ status: 409, code: 'GROUP_NOT_FORMING', message: 'Group is not forming' });
    }

    const currentMembers = db.groupMembers.filter((m) => m.groupId === groupId);
    const availableSlots = group.maxMembers - currentMembers.length;
    if (count > availableSlots) {
      throw new ApiError({ status: 409, code: 'GROUP_FULL', message: 'Not enough slots in group' });
    }

    const nigerianFirstNames = ['Tolu', 'Kelechi', 'Babajide', 'Yetunde', 'Chioma', 'Damilola', 'Obinna', 'Zainab', 'Chinedu', 'Amina'];
    const nigerianLastNames = ['Adeleke', 'Okoro', 'Balogun', 'Okonkwo', 'Danladi', 'Suleiman', 'Nwachukwu', 'Oladipo', 'Gbadamosi', 'Ibrahim'];

    for (let i = 0; i < count; i++) {
      const randFirst = nigerianFirstNames[Math.floor(Math.random() * nigerianFirstNames.length)]!;
      const randLast = nigerianLastNames[Math.floor(Math.random() * nigerianLastNames.length)]!;
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      const fakeEmail = `fake+${randomSuffix}@kolo.test`;
      const fakePhone = `+23480${Math.floor(10000000 + Math.random() * 90000000)}`;

      const fakeUser: MockUser = {
        id: crypto.randomUUID(),
        fullName: `${randFirst} ${randLast}`,
        email: fakeEmail,
        phone: fakePhone,
        password: 'kolo2026password',
        createdAt: engine.now().toISOString(),
        updatedAt: engine.now().toISOString(),
      };
      db.users.push(fakeUser);

      engine.getUserWalletAccount(fakeUser.id);

      db.groupMembers.push({
        groupId,
        userId: fakeUser.id,
        role: 'member',
        payoutPosition: null,
        joinedAt: engine.now().toISOString(),
      });

      engine.addActivity(groupId, 'member_joined', fakeUser.id, `${fakeUser.fullName} joined the group`);
    }

    saveDb();
    return engine.getGroupDetail(groupId, group.createdBy);
  },

  devFakeContributions(groupId: string): { contributed: number; roundPaidOut: boolean } {
    const db = getDb();
    const group = db.groups.find((g) => g.id === groupId);
    if (!group || group.status !== 'active') {
      throw new ApiError({ status: 409, code: 'GROUP_NOT_ACTIVE', message: 'Group is not active' });
    }

    const groupRounds = engine.getGroupRounds(groupId);
    const activeRound = groupRounds.find((r) => r.status === 'collecting');
    if (!activeRound) {
      throw new ApiError({ status: 409, code: 'ROUND_NOT_COLLECTING', message: 'No round is collecting' });
    }

    const members = db.groupMembers.filter((m) => m.groupId === groupId);
    let contributedCount = 0;
    let roundPaidOutResult = false;

    for (const m of members) {
      const user = db.users.find((u) => u.id === m.userId);
      if (user && user.email.startsWith('fake+')) {
        const hasPaid = db.contributions.some(
          (c) => c.groupId === groupId && c.roundNumber === activeRound.roundNumber && c.userId === m.userId
        );
        if (!hasPaid) {
          const balance = engine.getAccountBalance(engine.getUserWalletAccount(m.userId).id);
          if (balance < group.contributionKobo) {
            engine.devFundWallet(m.userId, group.contributionKobo * 2);
          }
          const res = engine.contribute(m.userId, groupId, activeRound.roundNumber);
          contributedCount++;
          if (res.roundPaidOut) {
            roundPaidOutResult = true;
          }
        }
      }
    }

    return { contributed: contributedCount, roundPaidOut: roundPaidOutResult };
  },

  createDeposit(userId: string, amountKobo: number): Deposit {
    const db = getDb();
    const ref = `KOLO-DEP-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const nowIso = engine.now().toISOString();

    const deposit: MockDeposit = {
      id: crypto.randomUUID(),
      userId,
      amountKobo,
      provider: 'fake',
      reference: ref,
      status: 'pending',
      checkoutUrl: `http://localhost:5173/dev/fake-checkout?reference=${ref}`,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.deposits.push(deposit);
    saveDb();
    return deposit;
  },

  completeFakeDeposit(reference: string, outcome: 'success' | 'failed'): { depositId: string } {
    const db = getDb();
    const deposit = db.deposits.find((d) => d.reference === reference);
    if (!deposit) {
      throw new ApiError({ status: 404, code: 'NOT_FOUND', message: 'Deposit not found' });
    }

    if (deposit.status !== 'pending') {
      return { depositId: deposit.id };
    }

    const nowIso = engine.now().toISOString();
    deposit.updatedAt = nowIso;

    if (outcome === 'success') {
      deposit.status = 'succeeded';
      const fundingSource = engine.getSystemAccount('funding_source');
      const userWalletAccount = engine.getUserWalletAccount(deposit.userId);

      engine.postLedgerTransaction({
        type: 'deposit',
        description: `Deposit via test checkout (${deposit.reference})`,
        reference: deposit.reference,
        entries: [
          { accountId: fundingSource.id, amountKobo: -deposit.amountKobo },
          { accountId: userWalletAccount.id, amountKobo: deposit.amountKobo },
        ],
      });

      engine.addNotification(
        deposit.userId,
        'deposit_succeeded',
        'Deposit successful',
        `₦${(deposit.amountKobo / 100).toLocaleString('en-NG')} added to your wallet.`,
        '/app/wallet'
      );
    } else {
      deposit.status = 'failed';
      engine.addNotification(
        deposit.userId,
        'deposit_failed',
        'Deposit failed',
        `Your deposit of ₦${(deposit.amountKobo / 100).toLocaleString('en-NG')} could not be completed.`,
        '/app/wallet'
      );
    }

    saveDb();
    return { depositId: deposit.id };
  },

  createWithdrawal(userId: string, input: {
    amountKobo: number;
    bankCode: string;
    accountNumber: string;
    accountName: string;
  }): Withdrawal {
    const db = getDb();
    const banks = engine.getBanks();
    const bank = banks.find((b) => b.code === input.bankCode);
    const bankName = bank?.name ?? 'Bank';

    const userWalletAccount = engine.getUserWalletAccount(userId);
    const clearingAccount = engine.getSystemAccount('withdrawals_clearing');

    const masked = `******${input.accountNumber.slice(-4)}`;
    const nowIso = engine.now().toISOString();
    const withdrawalId = crypto.randomUUID();

    engine.postLedgerTransaction({
      type: 'withdrawal',
      description: `Withdrawal to ${bankName} ${masked}`,
      entries: [
        { accountId: userWalletAccount.id, amountKobo: -input.amountKobo },
        { accountId: clearingAccount.id, amountKobo: input.amountKobo },
      ],
    });

    const withdrawal: MockWithdrawal = {
      id: withdrawalId,
      userId,
      amountKobo: input.amountKobo,
      bankCode: input.bankCode,
      bankName,
      accountNumberMasked: masked,
      accountNumberFull: input.accountNumber,
      accountName: input.accountName,
      status: 'pending',
      failureReason: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.withdrawals.push(withdrawal);
    saveDb();

    engine.scheduleWithdrawalProgression(withdrawalId);

    return withdrawal;
  },

  scheduleWithdrawalProgression(withdrawalId: string) {
    if (typeof window === 'undefined') return;

    setTimeout(() => {
      const db = getDb();
      const w = db.withdrawals.find((item) => item.id === withdrawalId);
      if (w && w.status === 'pending') {
        w.status = 'processing';
        w.updatedAt = engine.now().toISOString();
        saveDb();
      }
    }, 2000);

    setTimeout(() => {
      const db = getDb();
      const w = db.withdrawals.find((item) => item.id === withdrawalId);
      if (w && (w.status === 'pending' || w.status === 'processing')) {
        const nowIso = engine.now().toISOString();
        w.updatedAt = nowIso;

        if (w.accountNumberFull.endsWith('0000')) {
          w.status = 'failed';
          w.failureReason = 'The bank rejected this account number.';

          const clearingAccount = engine.getSystemAccount('withdrawals_clearing');
          const userWalletAccount = engine.getUserWalletAccount(w.userId);
          engine.postLedgerTransaction({
            type: 'withdrawal_reversal',
            description: `Reversal of failed withdrawal to ${w.bankName} ${w.accountNumberMasked}`,
            entries: [
              { accountId: clearingAccount.id, amountKobo: -w.amountKobo },
              { accountId: userWalletAccount.id, amountKobo: w.amountKobo },
            ],
          });

          engine.addNotification(
            w.userId,
            'withdrawal_failed',
            'Withdrawal failed',
            `Withdrawal of ₦${(w.amountKobo / 100).toLocaleString('en-NG')} to ${w.bankName} failed. The money has returned to your wallet.`,
            '/app/wallet'
          );
        } else {
          w.status = 'succeeded';
          const clearingAccount = engine.getSystemAccount('withdrawals_clearing');
          const payoutsSink = engine.getSystemAccount('payouts_sink');

          engine.postLedgerTransaction({
            type: 'withdrawal',
            description: `Completed withdrawal to ${w.bankName} ${w.accountNumberMasked}`,
            entries: [
              { accountId: clearingAccount.id, amountKobo: -w.amountKobo },
              { accountId: payoutsSink.id, amountKobo: w.amountKobo },
            ],
          });

          engine.addNotification(
            w.userId,
            'withdrawal_succeeded',
            'Withdrawal complete',
            `₦${(w.amountKobo / 100).toLocaleString('en-NG')} has been sent to ${w.bankName} ${w.accountNumberMasked}.`,
            '/app/wallet'
          );
        }
        saveDb();
      }
    }, 5000);
  },

  syncWithdrawals() {
    const db = getDb();
    const nowMs = engine.now().getTime();

    for (const w of db.withdrawals) {
      if (w.status === 'pending' || w.status === 'processing') {
        const elapsed = (nowMs - new Date(w.createdAt).getTime()) / 1000;
        if (elapsed >= 5) {
          if (w.accountNumberFull.endsWith('0000')) {
            w.status = 'failed';
            w.failureReason = 'The bank rejected this account number.';
            const clearingAccount = engine.getSystemAccount('withdrawals_clearing');
            const userWalletAccount = engine.getUserWalletAccount(w.userId);
            engine.postLedgerTransaction({
              type: 'withdrawal_reversal',
              description: `Reversal of failed withdrawal to ${w.bankName} ${w.accountNumberMasked}`,
              entries: [
                { accountId: clearingAccount.id, amountKobo: -w.amountKobo },
                { accountId: userWalletAccount.id, amountKobo: w.amountKobo },
              ],
            });
            engine.addNotification(
              w.userId,
              'withdrawal_failed',
              'Withdrawal failed',
              `Withdrawal of ₦${(w.amountKobo / 100).toLocaleString('en-NG')} failed. ₦${(w.amountKobo / 100).toLocaleString('en-NG')} is back in your wallet.`,
              '/app/wallet'
            );
          } else {
            w.status = 'succeeded';
            const clearingAccount = engine.getSystemAccount('withdrawals_clearing');
            const payoutsSink = engine.getSystemAccount('payouts_sink');
            engine.postLedgerTransaction({
              type: 'withdrawal',
              description: `Completed withdrawal to ${w.bankName} ${w.accountNumberMasked}`,
              entries: [
                { accountId: clearingAccount.id, amountKobo: -w.amountKobo },
                { accountId: payoutsSink.id, amountKobo: w.amountKobo },
              ],
            });
            engine.addNotification(
              w.userId,
              'withdrawal_succeeded',
              'Withdrawal complete',
              `₦${(w.amountKobo / 100).toLocaleString('en-NG')} sent to ${w.bankName} ${w.accountNumberMasked}.`,
              '/app/wallet'
            );
          }
          w.updatedAt = engine.now().toISOString();
        } else if (elapsed >= 2 && w.status === 'pending') {
          w.status = 'processing';
          w.updatedAt = engine.now().toISOString();
        }
      }
    }
    saveDb();
  },

  getWithdrawals(userId: string, cursor?: string | null, limit: number = 20): Paginated<Withdrawal> {
    engine.syncWithdrawals();
    const db = getDb();
    const userWithdrawals = db.withdrawals
      .filter((w) => w.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let startIndex = 0;
    if (cursor) {
      try {
        const decoded = atob(cursor);
        const parsed = JSON.parse(decoded);
        const idx = userWithdrawals.findIndex((w) => w.id === parsed.id);
        if (idx !== -1) {
          startIndex = idx + 1;
        }
      } catch {
        // ignore
      }
    }

    const slice = userWithdrawals.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < userWithdrawals.length;
    const nextCursor = hasMore && slice.length > 0
      ? btoa(JSON.stringify({ id: slice[slice.length - 1]!.id }))
      : null;

    return {
      data: slice.map(({ userId: _uid, accountNumberFull: _anf, ...w }) => w),
      nextCursor,
    };
  },

  getBanks(): Bank[] {
    return [
      { code: '044', name: 'Access Bank' },
      { code: '011', name: 'First Bank of Nigeria' },
      { code: '058', name: 'Guaranty Trust Bank' },
      { code: '50211', name: 'Kuda Microfinance Bank' },
      { code: '50515', name: 'Moniepoint Microfinance Bank' },
      { code: '999992', name: 'OPay' },
      { code: '033', name: 'United Bank for Africa' },
      { code: '057', name: 'Zenith Bank' },
    ];
  },

  runDueRounds(nowInput?: Date): {
    roundsChecked: number;
    remindersSent: number;
    autoContributions: number;
    overdueNotices: number;
  } {
    const now = nowInput ?? engine.now();
    const db = getDb();
    let roundsChecked = 0;
    let remindersSent = 0;
    let autoContributions = 0;
    let overdueNotices = 0;

    const collectingRounds = db.rounds.filter((r) => r.status === 'collecting');
    roundsChecked = collectingRounds.length;

    for (const round of collectingRounds) {
      const group = db.groups.find((g) => g.id === round.groupId);
      if (!group || group.status !== 'active') continue;

      const dueAtTime = new Date(round.dueAt).getTime();
      const nowTime = now.getTime();
      const diffHours = (dueAtTime - nowTime) / (3600 * 1000);

      if (diffHours >= 0 && diffHours <= 24) {
        for (const contrib of round.contributions) {
          if (contrib.status === 'pending') {
            const alreadySent = db.notifications.some(
              (n) => n.userId === contrib.userId && n.type === 'contribution_due' && n.link?.includes(group.id)
            );
            if (!alreadySent) {
              engine.addNotification(
                contrib.userId,
                'contribution_due',
                'Contribution due soon',
                `Your ₦${(group.contributionKobo / 100).toLocaleString('en-NG')} payment for "${group.name}" is due within 24 hours.`,
                `/app/groups/${group.id}`
              );
              remindersSent++;
            }
          }
        }
      }

      if (nowTime > dueAtTime) {
        for (const contrib of round.contributions) {
          if (contrib.status === 'pending') {
            const userWallet = engine.getUserWallet(contrib.userId);
            if (userWallet.balanceKobo >= group.contributionKobo) {
              try {
                engine.contribute(contrib.userId, group.id, round.roundNumber);
                autoContributions++;
              } catch {
                // ignore
              }
            } else {
              const recentNotice = db.notifications.find(
                (n) =>
                  n.userId === contrib.userId &&
                  n.type === 'contribution_overdue' &&
                  (nowTime - new Date(n.createdAt).getTime()) < 24 * 3600 * 1000
              );
              if (!recentNotice) {
                engine.addNotification(
                  contrib.userId,
                  'contribution_overdue',
                  'Contribution overdue',
                  `Your ₦${(group.contributionKobo / 100).toLocaleString('en-NG')} payment for "${group.name}" is overdue. Add money to your wallet to pay.`,
                  `/app/groups/${group.id}`
                );
                overdueNotices++;

                const admin = db.groupMembers.find((m) => m.groupId === group.id && m.role === 'admin');
                if (admin && admin.userId !== contrib.userId) {
                  engine.addNotification(
                    admin.userId,
                    'contribution_overdue',
                    'Member contribution overdue',
                    `${contrib.fullName}'s payment for round ${round.roundNumber} in "${group.name}" is overdue.`,
                    `/app/groups/${group.id}`
                  );
                }
              }
            }
          }
        }
      }
    }

    saveDb();
    return { roundsChecked, remindersSent, autoContributions, overdueNotices };
  },
};
