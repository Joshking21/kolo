import { engine } from './engine';
import { clearDbStorage, getDb, MockDbState, setDbState } from './db';

export function seedMockDb(): MockDbState {
  clearDbStorage();

  const emptyState: MockDbState = {
    users: [],
    accounts: [],
    ledgerTransactions: [],
    ledgerEntries: [],
    groups: [],
    groupMembers: [],
    rounds: [],
    roundGroupMap: {},
    contributions: [],
    deposits: [],
    withdrawals: [],
    activities: [],
    notifications: [],
    idempotencyKeys: [],
    refreshTokens: [],
    loginAttempts: [],
    nextLedgerEntryId: 10001,
  };

  setDbState(emptyState);

  const realNow = new Date();
  const t15DaysAgo = new Date(realNow.getTime() - 15 * 86_400_000);
  const t25DaysAgo = new Date(realNow.getTime() - 25 * 86_400_000);
  const t8DaysAgo = new Date(realNow.getTime() - 8 * 86_400_000);
  const t1DayAgo = new Date(realNow.getTime() - 1 * 86_400_000);

  // 1. Create demo user Chiamaka Okafor
  const db = getDb();
  const chiamakaId = crypto.randomUUID();
  const chiamaka = {
    id: chiamakaId,
    fullName: 'Chiamaka Okafor',
    email: 'demo@kolo.test',
    password: 'kolo2026',
    phone: '+2348031234567',
    createdAt: t25DaysAgo.toISOString(),
    updatedAt: t25DaysAgo.toISOString(),
  };
  db.users.push(chiamaka);
  engine.getUserWalletAccount(chiamakaId);

  // 2. Create other users
  const othersData = [
    { fullName: 'Tunde Bakare', email: 'tunde@kolo.test', phone: '+2348031234501' },
    { fullName: 'Ngozi Eze', email: 'ngozi@kolo.test', phone: '+2348031234502' },
    { fullName: 'Ibrahim Musa', email: 'ibrahim@kolo.test', phone: '+2348031234503' },
    { fullName: 'Funke Adeyemi', email: 'funke@kolo.test', phone: '+2348031234504' },
    { fullName: 'Emeka Nwosu', email: 'emeka@kolo.test', phone: '+2348031234505' },
    { fullName: 'Halima Bello', email: 'halima@kolo.test', phone: '+2348031234506' },
    { fullName: 'Seyi Ogunleye', email: 'seyi@kolo.test', phone: '+2348031234507' },
  ];

  const userMap: Record<string, string> = {
    Chiamaka: chiamakaId,
  };

  for (const item of othersData) {
    const id = crypto.randomUUID();
    const firstName = item.fullName.split(' ')[0]!;
    userMap[firstName] = id;
    db.users.push({
      id,
      fullName: item.fullName,
      email: item.email,
      password: 'kolo2026',
      phone: item.phone,
      createdAt: t25DaysAgo.toISOString(),
      updatedAt: t25DaysAgo.toISOString(),
    });
    engine.getUserWalletAccount(id);
  }

  // 3. Dev-fund everyone's wallet
  // Chiamaka gets ₦40,000 (4,000,000 kobo)
  engine.setNow(t25DaysAgo);
  engine.devFundWallet(chiamakaId, 4_000_000);

  // Others get ₦150,000 (15,000,000 kobo)
  for (const item of othersData) {
    const id = userMap[item.fullName.split(' ')[0]!]!;
    engine.devFundWallet(id, 15_000_000);
  }

  // 4. "Office Ajo"
  // Chiamaka is admin, ₦10,000, weekly, join_order, 6 members
  // Chiamaka, Tunde, Ngozi, Ibrahim, Funke, Emeka
  engine.setNow(t15DaysAgo);
  const officeAjo = engine.createGroup(chiamakaId, {
    name: 'Office Ajo',
    description: 'Finance team weekly savings',
    contributionKobo: 1_000_000, // ₦10,000
    frequency: 'weekly',
    maxMembers: 6,
    payoutOrder: 'join_order',
  });

  const officeMembers = ['Tunde', 'Ngozi', 'Ibrahim', 'Funke', 'Emeka'];
  for (const name of officeMembers) {
    engine.joinGroup(userMap[name]!, officeAjo.inviteCode);
  }

  // Start it 15 days ago
  engine.startGroup(chiamakaId, officeAjo.id, t15DaysAgo.toISOString());

  // Complete round 1 (8 days ago)
  engine.setNow(t8DaysAgo);
  const allOfficeMembers = ['Chiamaka', ...officeMembers];
  for (const name of allOfficeMembers) {
    engine.contribute(userMap[name]!, officeAjo.id, 1, t8DaysAgo.toISOString());
  }

  // Complete round 2 (1 day ago)
  engine.setNow(t1DayAgo);
  for (const name of allOfficeMembers) {
    engine.contribute(userMap[name]!, officeAjo.id, 2, t1DayAgo.toISOString());
  }

  // In round 3, 4 of the 6 have paid, and Chiamaka has not paid.
  // Due in 6 days from now.
  engine.setNow(realNow);
  const round3PaidMembers = ['Tunde', 'Ngozi', 'Ibrahim', 'Funke'];
  for (const name of round3PaidMembers) {
    engine.contribute(userMap[name]!, officeAjo.id, 3, realNow.toISOString());
  }

  // 5. "Family Savings"
  // Ngozi is admin, ₦50,000, monthly, random, max 5
  // members: Ngozi, Chiamaka, Halima. Status forming.
  engine.setNow(t8DaysAgo);
  const ngoziId = userMap['Ngozi']!;
  const familySavings = engine.createGroup(ngoziId, {
    name: 'Family Savings',
    description: 'Monthly savings pool for family goals',
    contributionKobo: 5_000_000, // ₦50,000
    frequency: 'monthly',
    maxMembers: 5,
    payoutOrder: 'random',
  });
  engine.joinGroup(chiamakaId, familySavings.inviteCode);
  engine.joinGroup(userMap['Halima']!, familySavings.inviteCode);

  // 6. "Uni Friends Christmas"
  // Seyi is admin, ₦5,000, weekly, members Seyi, Chiamaka, Tunde
  // Run all 3 rounds to completion, so the status is completed.
  engine.setNow(t25DaysAgo);
  const seyiId = userMap['Seyi']!;
  const uniFriends = engine.createGroup(seyiId, {
    name: 'Uni Friends Christmas',
    description: 'Holiday fund with university classmates',
    contributionKobo: 500_000, // ₦5,000
    frequency: 'weekly',
    maxMembers: 3,
    payoutOrder: 'join_order',
  });
  engine.joinGroup(chiamakaId, uniFriends.inviteCode);
  engine.joinGroup(userMap['Tunde']!, uniFriends.inviteCode);
  engine.startGroup(seyiId, uniFriends.id, t25DaysAgo.toISOString());

  const uniMembers = ['Seyi', 'Chiamaka', 'Tunde'];
  // Round 1
  const t18DaysAgo = new Date(realNow.getTime() - 18 * 86_400_000);
  engine.setNow(t18DaysAgo);
  for (const name of uniMembers) {
    engine.contribute(userMap[name]!, uniFriends.id, 1, t18DaysAgo.toISOString());
  }
  // Round 2
  const t11DaysAgo = new Date(realNow.getTime() - 11 * 86_400_000);
  engine.setNow(t11DaysAgo);
  for (const name of uniMembers) {
    engine.contribute(userMap[name]!, uniFriends.id, 2, t11DaysAgo.toISOString());
  }
  // Round 3
  const t4DaysAgo = new Date(realNow.getTime() - 4 * 86_400_000);
  engine.setNow(t4DaysAgo);
  for (const name of uniMembers) {
    engine.contribute(userMap[name]!, uniFriends.id, 3, t4DaysAgo.toISOString());
  }

  // Reset clock back to real time
  engine.resetClock();

  // 7. Chiamaka's final wallet balance lands between ₦60,000 and ₦100,000 (net balance ₦80,000)

  // 8. Notifications: mark all but Chiamaka's 3 most recent as read
  const currentDb = getDb();
  const chiamakaNotifs = currentDb.notifications.filter((n) => n.userId === chiamakaId);
  // Sort newest first
  chiamakaNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  chiamakaNotifs.forEach((n, idx) => {
    if (idx >= 3) {
      n.readAt = realNow.toISOString();
    } else {
      n.readAt = null;
    }
  });

  return currentDb;
}
