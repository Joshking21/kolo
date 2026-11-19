import { describe, it, expect, beforeEach } from 'vitest';
import { engine } from './engine';
import { getDb } from './db';
import { seedMockDb } from './seed';
import { ApiError } from '../lib/api/errors';

describe('engine', () => {
  beforeEach(() => {
    seedMockDb();
  });

  it('guarantees that the ledger always sums to zero after a full group lifecycle', () => {
    const db = getDb();
    const sum = db.ledgerEntries.reduce((acc, e) => acc + e.amountKobo, 0);
    expect(sum).toBe(0);

    for (const tx of db.ledgerTransactions) {
      const txEntries = db.ledgerEntries.filter((e) => e.transactionId === tx.id);
      const txSum = txEntries.reduce((acc, e) => acc + e.amountKobo, 0);
      expect(txSum).toBe(0);
    }
  });

  it('rejects debits when funds are insufficient', () => {
    const db = getDb();
    const poorUserId = crypto.randomUUID();
    db.users.push({
      id: poorUserId,
      fullName: 'Zero Naira',
      email: 'zero@kolo.test',
      phone: '+2348039999999',
      password: 'password',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    engine.getUserWalletAccount(poorUserId);

    const group = engine.createGroup(poorUserId, {
      name: 'Test Group',
      contributionKobo: 100_000,
      frequency: 'weekly',
      maxMembers: 2,
      payoutOrder: 'join_order',
    });

    const otherUser = db.users[1]!;
    engine.joinGroup(otherUser.id, group.inviteCode);
    engine.startGroup(poorUserId, group.id);

    expect(() => {
      engine.contribute(poorUserId, group.id, 1);
    }).toThrowError(ApiError);
  });

  it('prevents double contributions into the same round', () => {
    const db = getDb();
    const user = db.users.find((u) => u.email === 'demo@kolo.test')!;
    const group = db.groups.find((g) => g.name === 'Office Ajo')!;

    // Chiamaka pays round 3
    engine.contribute(user.id, group.id, 3);

    // Paying again should fail with ALREADY_CONTRIBUTED
    expect(() => {
      engine.contribute(user.id, group.id, 3);
    }).toThrowError(/already paid/i);
  });

  it('triggers payout automatically on the last payment of a round', () => {
    const db = getDb();
    const group = db.groups.find((g) => g.name === 'Office Ajo')!;
    const round3 = engine.getGroupRounds(group.id).find((r) => r.roundNumber === 3)!;

    // In round 3, recipient is Ngozi Eze (position 3)
    const recipientUserId = round3.recipient.userId;
    const initialRecipientBalance = engine.getUserWallet(recipientUserId).balanceKobo;

    // Chiamaka and Emeka are unpaid in round 3
    const chiamaka = db.users.find((u) => u.email === 'demo@kolo.test')!;
    const emeka = db.users.find((u) => u.email === 'emeka@kolo.test')!;

    const res1 = engine.contribute(chiamaka.id, group.id, 3);
    expect(res1.roundPaidOut).toBe(false);

    const res2 = engine.contribute(emeka.id, group.id, 3);
    expect(res2.roundPaidOut).toBe(true);

    const finalRecipientBalance = engine.getUserWallet(recipientUserId).balanceKobo;
    const expectedPot = group.contributionKobo * 6; // 6 members * ₦10,000 = ₦60,000
    expect(finalRecipientBalance).toBe(initialRecipientBalance + expectedPot);
  });

  it('completes the group when the last round is paid out', () => {
    const db = getDb();
    const completedGroup = db.groups.find((g) => g.name === 'Uni Friends Christmas')!;
    expect(completedGroup.status).toBe('completed');
  });

  it('fails to start a group with fewer than 2 members', () => {
    const db = getDb();
    const user = db.users[0]!;
    const soloGroup = engine.createGroup(user.id, {
      name: 'Solo Group',
      contributionKobo: 100_000,
      frequency: 'weekly',
      maxMembers: 4,
      payoutOrder: 'join_order',
    });

    expect(() => {
      engine.startGroup(user.id, soloGroup.id);
    }).toThrowError(/at least 2 members/i);
  });

  it('fails to join a full group', () => {
    const db = getDb();
    const user1 = db.users[0]!;
    const user2 = db.users[1]!;
    const user3 = db.users[2]!;

    const tinyGroup = engine.createGroup(user1.id, {
      name: 'Tiny Group',
      contributionKobo: 100_000,
      frequency: 'weekly',
      maxMembers: 2,
      payoutOrder: 'join_order',
    });

    engine.joinGroup(user2.id, tinyGroup.inviteCode);

    expect(() => {
      engine.joinGroup(user3.id, tinyGroup.inviteCode);
    }).toThrowError(/group is full/i);
  });

  it('reverses a failed withdrawal and returns money to the wallet', () => {
    const db = getDb();
    const user = db.users.find((u) => u.email === 'demo@kolo.test')!;
    const initialBalance = engine.getUserWallet(user.id).balanceKobo;

    const withdrawalAmount = 500_000; // ₦5,000
    const w = engine.createWithdrawal(user.id, {
      amountKobo: withdrawalAmount,
      bankCode: '058',
      accountNumber: '0123450000', // Ends in 0000 -> fails
      accountName: 'Chiamaka Okafor',
    });

    // Money leaves wallet immediately
    expect(engine.getUserWallet(user.id).balanceKobo).toBe(initialBalance - withdrawalAmount);

    // Fast-forward simulated time by 6 seconds
    engine.setNow(new Date(Date.now() + 6000));
    engine.syncWithdrawals();

    const updatedW = db.withdrawals.find((item) => item.id === w.id)!;
    expect(updatedW.status).toBe('failed');
    expect(updatedW.failureReason).toBe('The bank rejected this account number.');

    // Balance is restored
    expect(engine.getUserWallet(user.id).balanceKobo).toBe(initialBalance);

    // Check ledger balance sum
    const totalLedgerSum = db.ledgerEntries.reduce((sum, e) => sum + e.amountKobo, 0);
    expect(totalLedgerSum).toBe(0);
  });
});
