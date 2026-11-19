import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Eye, EyeOff, Plus, ArrowUpRight, Users, ArrowRight } from 'lucide-react';
import { queryKeys } from '../lib/query-client';
import { getWalletApi, getWalletTransactionsApi } from '../lib/api/wallet';
import { getGroupsApi } from '../lib/api/groups';
import { useAuth } from '../lib/auth/AuthProvider';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Money } from '../components/ui/Money';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { GroupCard } from '../features/groups/GroupCard';
import { TransactionRow } from '../features/wallet/TransactionRow';
import { AddMoneyDialog } from '../features/wallet/AddMoneyDialog';
import { WithdrawDialog } from '../features/wallet/WithdrawDialog';
import { ContributeDialog } from '../features/groups/ContributeDialog';
import { formatDue } from '../lib/dates';
import { formatKobo } from '../lib/money';
import { GroupSummary } from '../lib/api/types';

export function Dashboard() {
  const { user } = useAuth();
  const [hideBalance, setHideBalance] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kolo-hide-balance') === 'true';
    } catch {
      return false;
    }
  });

  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [contributeTarget, setContributeTarget] = useState<GroupSummary | null>(null);

  const toggleHideBalance = () => {
    setHideBalance((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('kolo-hide-balance', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const {
    data: wallet,
    isLoading: walletLoading,
    error: walletError,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: queryKeys.wallet(),
    queryFn: getWalletApi,
  });

  const {
    data: groupsData,
    isLoading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
  } = useQuery({
    queryKey: queryKeys.groups(),
    queryFn: getGroupsApi,
  });

  const {
    data: txData,
    isLoading: txLoading,
  } = useQuery({
    queryKey: queryKeys.walletTransactions(),
    queryFn: () => getWalletTransactionsApi(undefined, 5),
  });

  const groups = groupsData?.data ?? [];
  const recentTransactions = txData?.data.slice(0, 5) ?? [];

  // Attention groups: active groups where iHaveContributed is false
  const attentionGroups = groups.filter(
    (g) => g.status === 'active' && g.currentRound && !g.currentRound.iHaveContributed
  );

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* 1. Wallet Balance Card */}
      {walletLoading ? (
        <Skeleton className="h-44 w-full rounded-2xl" />
      ) : walletError ? (
        <ErrorState error={walletError} onRetry={refetchWallet} />
      ) : (
        <div className="rounded-2xl bg-primary text-on-primary p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="text-[13px] font-medium text-on-primary/70 uppercase tracking-wider mb-1">
                Wallet balance
              </span>
              <div className="flex items-center gap-3">
                <Money
                  kobo={wallet?.balanceKobo ?? 0}
                  hidden={hideBalance}
                  className="text-[34px] sm:text-[40px] font-[650] text-on-primary leading-none"
                />
                <button
                  type="button"
                  onClick={toggleHideBalance}
                  aria-pressed={hideBalance}
                  aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
                  className="h-8 w-8 rounded-full inline-flex items-center justify-center text-on-primary/80 hover:text-on-primary hover:bg-white/10 transition"
                >
                  {hideBalance ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setAddMoneyOpen(true)}
              className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-white text-primary font-semibold text-[14px] hover:bg-white/90 active:translate-y-[1px] transition shadow-xs"
            >
              <Plus size={16} className="mr-1.5" />
              Add money
            </button>
            <button
              type="button"
              onClick={() => setWithdrawOpen(true)}
              className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-transparent border border-white/25 text-on-primary font-semibold text-[14px] hover:bg-white/10 active:translate-y-[1px] transition"
            >
              <ArrowUpRight size={16} className="mr-1.5" />
              Withdraw
            </button>
          </div>
        </div>
      )}

      {/* 2. Needs your attention */}
      {attentionGroups.length > 0 && (
        <section aria-labelledby="attention-heading" className="flex flex-col gap-3">
          <h2 id="attention-heading" className="text-[18px] font-display font-semibold text-ink">
            Needs your attention
          </h2>
          <div className="flex flex-col gap-2.5">
            {attentionGroups.map((group) => {
              const dueStr = formatDue(group.currentRound!.dueAt);
              const isOverdue = dueStr.toLowerCase().includes('overdue');
              const isDueSoon = dueStr.toLowerCase().includes('today') || dueStr.toLowerCase().includes('tomorrow') || dueStr.toLowerCase().includes('in 2 days');
              const isMyTurn = group.currentRound?.recipient.userId === user?.id;

              return (
                <div
                  key={group.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border border-border bg-surface shadow-xs"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/app/groups/${group.id}`}
                        className="font-semibold text-[15px] text-ink hover:text-primary transition"
                      >
                        {group.name}
                      </Link>
                      <span className="text-[14px] font-bold tabular-nums text-ink">
                        · {formatKobo(group.contributionKobo)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                      <span
                        className={`font-medium ${
                          isOverdue
                            ? 'text-danger font-semibold'
                            : isDueSoon
                            ? 'text-warning font-semibold'
                            : 'text-muted'
                        }`}
                      >
                        {dueStr}
                      </span>
                      {isMyTurn && (
                        <span className="inline-flex items-center gap-1.5 text-accent font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                          Your turn to collect this round
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setContributeTarget(group)}
                    className="w-full sm:w-auto"
                  >
                    Pay now
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Your groups */}
      <section aria-labelledby="groups-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="groups-heading" className="text-[18px] font-display font-semibold text-ink">
            Your groups
          </h2>
          {groups.length > 4 && (
            <Link
              to="/app/groups"
              className="text-[13px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              See all groups <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {groupsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        ) : groupsError ? (
          <ErrorState error={groupsError} onRetry={refetchGroups} />
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Users}
            title="You're not in any groups yet"
            description="Create one, or join with an invite code."
            action={
              <div className="flex items-center gap-3">
                <Link to="/app/groups/new">
                  <Button size="sm">Create a group</Button>
                </Link>
                <Link to="/app/join">
                  <Button variant="secondary" size="sm">
                    Join a group
                  </Button>
                </Link>
              </div>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groups.slice(0, 4).map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Recent activity */}
      <section aria-labelledby="activity-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="activity-heading" className="text-[18px] font-display font-semibold text-ink">
            Recent activity
          </h2>
          {recentTransactions.length > 0 && (
            <Link
              to="/app/wallet"
              className="text-[13px] font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {txLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="p-6 rounded-2xl border border-dashed border-border text-center text-[14px] text-muted">
            No transactions yet.
          </div>
        ) : (
          <Card className="p-2 sm:p-3 divide-y divide-border">
            {recentTransactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </Card>
        )}
      </section>

      {/* Dialogs */}
      <AddMoneyDialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen} />
      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        availableBalanceKobo={wallet?.balanceKobo ?? 0}
      />
      {contributeTarget && contributeTarget.currentRound && (
        <ContributeDialog
          open={Boolean(contributeTarget)}
          onOpenChange={(open) => !open && setContributeTarget(null)}
          groupId={contributeTarget.id}
          groupName={contributeTarget.name}
          roundNumber={contributeTarget.currentRound.roundNumber}
          recipientName={contributeTarget.currentRound.recipient.fullName}
          contributionKobo={contributeTarget.contributionKobo}
          walletBalanceKobo={wallet?.balanceKobo ?? 0}
          onOpenAddMoney={() => setAddMoneyOpen(true)}
        />
      )}
    </div>
  );
}
