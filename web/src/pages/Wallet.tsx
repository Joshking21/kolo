import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Plus, ArrowUpRight, Wallet as WalletIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { queryKeys } from '../lib/query-client';
import { getWalletApi, getWalletTransactionsApi } from '../lib/api/wallet';
import { getWithdrawalsApi, getDepositApi } from '../lib/api/payments';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Money } from '../components/ui/Money';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { TransactionRow } from '../features/wallet/TransactionRow';
import { AddMoneyDialog } from '../features/wallet/AddMoneyDialog';
import { WithdrawDialog } from '../features/wallet/WithdrawDialog';
import { formatRelative } from '../lib/dates';
import { formatKobo } from '../lib/money';
import { toast } from 'sonner';
import { WalletTransaction, Withdrawal } from '../lib/api/types';

function getDateHeading(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfTarget) / 86_400_000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(d);
}

export function Wallet() {
  const [searchParams, setSearchParams] = useSearchParams();
  const depositId = searchParams.get('deposit');

  const [hideBalance, setHideBalance] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kolo-hide-balance') === 'true';
    } catch {
      return false;
    }
  });

  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const queryClient = useQueryClient();

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

  // 1. Wallet Balance
  const {
    data: wallet,
    isLoading: walletLoading,
    error: walletError,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: queryKeys.wallet(),
    queryFn: getWalletApi,
  });

  // 2. Withdrawals & settlement tracking
  const previousWithdrawalsRef = useRef<Map<string, Withdrawal>>(new Map());
  const { data: withdrawalsData } = useQuery({
    queryKey: queryKeys.withdrawals(),
    queryFn: () => getWithdrawalsApi(undefined, 20),
    refetchInterval: (query) => {
      const list = query.state.data?.data || [];
      const hasUnsettled = list.some(
        (w) => w.status === 'pending' || w.status === 'processing'
      );
      return hasUnsettled ? 3000 : false;
    },
  });

  const withdrawals = useMemo(() => withdrawalsData?.data || [], [withdrawalsData]);
  const unsettledWithdrawals = withdrawals.filter(
    (w) => w.status === 'pending' || w.status === 'processing'
  );

  // Watch for settlement transitions and trigger toasts
  useEffect(() => {
    const prevMap = previousWithdrawalsRef.current;
    for (const w of withdrawals) {
      const prev = prevMap.get(w.id);
      if (prev && (prev.status === 'pending' || prev.status === 'processing')) {
        if (w.status === 'succeeded') {
          toast.success(
            `Withdrawal of ${formatKobo(w.amountKobo)} sent to ${w.bankName} ${w.accountNumberMasked}`
          );
          queryClient.invalidateQueries({ queryKey: queryKeys.wallet() });
          queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions() });
        } else if (w.status === 'failed') {
          toast.error(
            `Withdrawal failed: ${w.failureReason || 'Declined'}. ${formatKobo(w.amountKobo)} is back in your wallet.`
          );
          queryClient.invalidateQueries({ queryKey: queryKeys.wallet() });
          queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions() });
        }
      }
      prevMap.set(w.id, w);
    }
  }, [withdrawals, queryClient]);

  // 3. Transactions (useInfiniteQuery)
  const {
    data: transactionsData,
    isLoading: txLoading,
    error: txError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchTx,
  } = useInfiniteQuery({
    queryKey: queryKeys.walletTransactions(),
    queryFn: ({ pageParam }) => getWalletTransactionsApi(pageParam, 20),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const allTransactions: WalletTransaction[] =
    transactionsData?.pages.flatMap((page) => page.data) || [];

  // Group by date
  const groupedTransactions: Array<{ date: string; items: WalletTransaction[] }> = [];
  let currentDate = '';
  let currentGroup: WalletTransaction[] = [];

  for (const tx of allTransactions) {
    const heading = getDateHeading(tx.createdAt);
    if (heading !== currentDate) {
      if (currentGroup.length > 0) {
        groupedTransactions.push({ date: currentDate, items: currentGroup });
      }
      currentDate = heading;
      currentGroup = [tx];
    } else {
      currentGroup.push(tx);
    }
  }
  if (currentGroup.length > 0) {
    groupedTransactions.push({ date: currentDate, items: currentGroup });
  }

  // 4. Deposit polling if ?deposit=<id>
  const [depositPollingTime, setDepositPollingTime] = useState(0);
  const { data: polledDeposit } = useQuery({
    queryKey: queryKeys.deposit(depositId || ''),
    queryFn: () => getDepositApi(depositId!),
    enabled: Boolean(depositId),
    refetchInterval: (query) => {
      const dep = query.state.data;
      if (!dep || dep.status === 'pending') {
        if (depositPollingTime >= 60) return false;
        return 2000;
      }
      return false;
    },
  });

  useEffect(() => {
    if (!depositId) return;
    const interval = setInterval(() => {
      setDepositPollingTime((prev) => prev + 2);
    }, 2000);
    return () => clearInterval(interval);
  }, [depositId]);

  useEffect(() => {
    if (polledDeposit && polledDeposit.status !== 'pending') {
      if (polledDeposit.status === 'succeeded') {
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet() });
        queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions() });
      }
      // Remove query param after 4s
      const timer = setTimeout(() => {
        searchParams.delete('deposit');
        setSearchParams(searchParams, { replace: true });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [polledDeposit, searchParams, setSearchParams, queryClient]);

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-[650] font-display text-ink leading-tight">
            Wallet
          </h1>
          <p className="text-[14px] text-muted">
            Manage your funds and view payment history.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setWithdrawOpen(true)}
          >
            <ArrowUpRight size={16} className="mr-1.5" />
            Withdraw
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => setAddMoneyOpen(true)}
          >
            <Plus size={16} className="mr-1.5" />
            Add money
          </Button>
        </div>
      </div>

      {/* Deposit Status Card if ?deposit= */}
      {depositId && (
        <Card className="p-4 border-accent bg-[#FDF4E5] dark:bg-[#2A2010]">
          {polledDeposit?.status === 'succeeded' ? (
            <div className="flex items-center gap-3 text-success font-semibold text-[14px]">
              <CheckCircle2 size={20} className="shrink-0" />
              <span>{formatKobo(polledDeposit.amountKobo)} added to your wallet</span>
            </div>
          ) : polledDeposit?.status === 'failed' ? (
            <div className="flex items-center gap-3 text-danger font-semibold text-[14px]">
              <AlertCircle size={20} className="shrink-0" />
              <span>Payment failed. No money was taken.</span>
            </div>
          ) : depositPollingTime >= 60 ? (
            <div className="flex items-center gap-3 text-warning text-[14px]">
              <AlertCircle size={20} className="shrink-0" />
              <span>
                Still waiting on the payment provider. We'll update your balance when it confirms.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-ink text-[14px]">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span className="font-medium">Confirming your payment…</span>
            </div>
          )}
        </Card>
      )}

      {/* Balance Summary Card */}
      {walletLoading ? (
        <Skeleton className="h-36 rounded-2xl" />
      ) : walletError ? (
        <ErrorState error={walletError} onRetry={refetchWallet} />
      ) : (
        <Card className="p-6 sm:p-7 border-border bg-surface flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-muted uppercase tracking-wider mb-1">
              Wallet balance
            </span>
            <div className="flex items-center gap-3">
              <Money
                kobo={wallet?.balanceKobo ?? 0}
                hidden={hideBalance}
                className="text-[34px] sm:text-[40px] font-[650] text-ink leading-none"
              />
              <button
                type="button"
                onClick={toggleHideBalance}
                aria-pressed={hideBalance}
                aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
                className="h-8 w-8 rounded-full inline-flex items-center justify-center text-muted hover:bg-surface-muted transition"
              >
                {hideBalance ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* "In progress" withdrawals section */}
      {unsettledWithdrawals.length > 0 && (
        <section aria-labelledby="in-progress-heading" className="flex flex-col gap-3">
          <h2
            id="in-progress-heading"
            className="text-[18px] font-display font-semibold text-ink"
          >
            In progress
          </h2>
          <Card className="p-0 divide-y divide-border overflow-hidden">
            {unsettledWithdrawals.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between p-4 text-[14px]"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">
                      {w.bankName}
                    </span>
                    <span className="text-muted font-mono text-[13px]">
                      {w.accountNumberMasked}
                    </span>
                  </div>
                  <span className="text-[12px] text-muted mt-0.5">
                    {formatRelative(w.createdAt)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-semibold tabular-nums text-ink">
                    {formatKobo(w.amountKobo)}
                  </span>
                  <Badge status={w.status} />
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* "Transactions" List */}
      <section aria-labelledby="tx-heading" className="flex flex-col gap-4">
        <h2
          id="tx-heading"
          className="text-[18px] font-display font-semibold text-ink"
        >
          Transactions
        </h2>

        {txLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ) : txError ? (
          <ErrorState error={txError} onRetry={refetchTx} />
        ) : allTransactions.length === 0 ? (
          <EmptyState
            icon={WalletIcon}
            title="No transactions yet"
            description="Add money to get started."
            action={
              <Button size="sm" onClick={() => setAddMoneyOpen(true)}>
                Add money
              </Button>
            }
          />
        ) : (
          <div className="flex flex-col gap-6">
            {groupedTransactions.map((group) => (
              <div key={group.date} className="flex flex-col gap-2">
                <span className="text-[12px] font-bold uppercase tracking-wider text-muted px-1">
                  {group.date}
                </span>
                <Card className="p-2 divide-y divide-border">
                  {group.items.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} />
                  ))}
                </Card>
              </div>
            ))}

            {hasNextPage && (
              <div className="flex justify-center pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                >
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Dialogs */}
      <AddMoneyDialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen} />
      <WithdrawDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        availableBalanceKobo={wallet?.balanceKobo ?? 0}
      />
    </div>
  );
}
