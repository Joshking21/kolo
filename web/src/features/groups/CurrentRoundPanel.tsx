import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CheckCircle2, Bot } from 'lucide-react';
import { GroupDetail, Round } from '../../lib/api/types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { ContributeDialog } from './ContributeDialog';
import { formatDue } from '../../lib/dates';
import { formatKobo } from '../../lib/money';
import { queryKeys } from '../../lib/query-client';
import { devFakeContributionsApi } from '../../lib/api/dev';
import { toast } from 'sonner';

export interface CurrentRoundPanelProps {
  group: GroupDetail;
  rounds: Round[];
  userId?: string;
  walletBalanceKobo: number;
  onOpenAddMoney?: () => void;
}

export function CurrentRoundPanel({
  group,
  rounds,
  userId,
  walletBalanceKobo,
  onOpenAddMoney,
}: CurrentRoundPanelProps) {
  const [contributeOpen, setContributeOpen] = useState(false);
  const queryClient = useQueryClient();

  const isDevOrMock = Boolean(
    import.meta.env.DEV ||
    (import.meta.env.VITE_MOCK_DOMAINS && import.meta.env.VITE_MOCK_DOMAINS.includes('dev'))
  );

  const fakeContributionsMutation = useMutation({
    mutationFn: () => devFakeContributionsApi(group.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.group(group.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupRounds(group.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupActivity(group.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet() });
      queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions() });
      toast.success(
        `${data.contributed} fake members paid${data.roundPaidOut ? ' (Round paid out!)' : ''}`
      );
    },
    onError: () => {
      toast.error('Could not simulate fake contributions');
    },
  });

  const currentRound = rounds.find((r) => r.status === 'collecting');
  if (!currentRound) return null;

  const totalMembers = group.members.length;
  const paidCount = currentRound.contributions.filter((c) => c.status === 'paid').length;
  const myContrib = currentRound.contributions.find((c) => c.userId === userId);
  const iHavePaid = myContrib?.status === 'paid';
  const myReceiptId = myContrib?.transactionId;

  const potAmount = currentRound.potKobo;
  const dueStr = formatDue(currentRound.dueAt);

  return (
    <Card className="p-5 sm:p-6 bg-surface border-border shadow-xs flex flex-col gap-5">
      {/* Top row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-[18px] text-ink">
              Round {currentRound.roundNumber} of {rounds.length}
            </span>
            <span className="text-[14px] text-muted">·</span>
            <span className="text-[14px] font-medium text-muted">
              {dueStr}
            </span>
          </div>

          <div className="flex items-center gap-2.5 mt-2">
            <Avatar
              name={currentRound.recipient.fullName}
              userId={currentRound.recipient.userId}
              size="sm"
            />
            <span className="text-[14px] text-muted">
              <strong className="text-ink font-semibold">
                {currentRound.recipient.fullName}
              </strong>{' '}
              receives {formatKobo(potAmount)}
            </span>
          </div>
        </div>

        {/* Action Button or Success indicator */}
        <div className="flex flex-col sm:items-end gap-2">
          {!iHavePaid ? (
            <Button
              size="md"
              onClick={() => setContributeOpen(true)}
              className="w-full sm:w-auto"
            >
              Pay {formatKobo(group.contributionKobo)}
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-[14px] text-success font-semibold">
              <CheckCircle2 size={18} className="shrink-0" />
              <span>You've paid for this round</span>
              {myReceiptId && (
                <Link
                  to={`/app/transactions/${myReceiptId}`}
                  className="ml-1 text-[13px] text-primary font-semibold underline hover:opacity-80"
                >
                  View receipt
                </Link>
              )}
            </div>
          )}

          {isDevOrMock && (
            <button
              type="button"
              disabled={fakeContributionsMutation.isPending}
              onClick={() => fakeContributionsMutation.mutate()}
              className="text-[12px] font-semibold text-muted hover:text-ink inline-flex items-center gap-1 transition select-none disabled:opacity-50"
            >
              <Bot size={13} />
              <span>Make fake members pay</span>
            </button>
          )}
        </div>
      </div>

      {/* Large Progress bar */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-semibold text-ink">
            {paidCount} of {totalMembers} paid
          </span>
          <span className="text-muted tabular-nums">
            {Math.round((paidCount / totalMembers) * 100)}%
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-surface-muted overflow-hidden border border-border/50">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${Math.round((paidCount / totalMembers) * 100)}%` }}
          />
        </div>
      </div>

      {/* Member avatars in a row with check overlay or hollow ring */}
      <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-border/60">
        {currentRound.contributions.map((c) => {
          const isPaid = c.status === 'paid';
          return (
            <div
              key={c.userId}
              className="relative inline-flex items-center justify-center group"
              title={`${c.fullName}: ${isPaid ? 'Paid' : 'Pending'}`}
              aria-label={`${c.fullName}: ${isPaid ? 'Paid' : 'Pending'}`}
            >
              <Avatar name={c.fullName} userId={c.userId} size="sm" />
              {isPaid ? (
                <span
                  aria-label="Paid"
                  className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-success text-white ring-2 ring-surface"
                >
                  <Check size={10} strokeWidth={3} />
                </span>
              ) : (
                <span
                  aria-label="Pending payment"
                  className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-dashed border-muted bg-surface"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Contribute Dialog */}
      <ContributeDialog
        open={contributeOpen}
        onOpenChange={setContributeOpen}
        groupId={group.id}
        groupName={group.name}
        roundNumber={currentRound.roundNumber}
        recipientName={currentRound.recipient.fullName}
        contributionKobo={group.contributionKobo}
        walletBalanceKobo={walletBalanceKobo}
        onOpenAddMoney={onOpenAddMoney}
      />
    </Card>
  );
}
