import { useState } from 'react';
import { Link } from 'react-router';
import { ChevronDown, ChevronRight, Gift, Check, Clock } from 'lucide-react';
import { Round } from '../../lib/api/types';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { formatDue, formatDateTime } from '../../lib/dates';
import { formatKobo } from '../../lib/money';

export interface RoundsTabProps {
  rounds: Round[];
  userId?: string;
}

export function RoundsTab({ rounds, userId }: RoundsTabProps) {
  // Current collecting round is expanded by default
  const collectingRoundNumber = rounds.find((r) => r.status === 'collecting')?.roundNumber || 1;
  const [expandedRound, setExpandedRound] = useState<number | null>(collectingRoundNumber);

  const toggleExpand = (rNum: number) => {
    setExpandedRound(expandedRound === rNum ? null : rNum);
  };

  if (rounds.length === 0) {
    return (
      <div className="p-8 text-center text-[14px] text-muted rounded-2xl border border-dashed border-border">
        Rounds will be scheduled once the group starts.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rounds.map((round) => {
        const isExpanded = expandedRound === round.roundNumber;
        const isMyPayout = round.recipient.userId === userId;
        const isPaidOut = round.status === 'paid_out';

        return (
          <div
            key={round.roundNumber}
            className={`rounded-[14px] border transition overflow-hidden bg-surface ${
              isMyPayout
                ? 'border-l-[4px] border-l-accent border-border'
                : 'border-border'
            }`}
          >
            {/* Round Summary Header (clickable) */}
            <button
              type="button"
              onClick={() => toggleExpand(round.roundNumber)}
              className="w-full flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 text-left hover:bg-surface-muted/40 transition select-none outline-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-muted">
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[15px] text-ink">
                      Round {round.roundNumber}
                    </span>
                    {isMyPayout && (
                      <span className="rounded-full bg-[#FDF4E5] dark:bg-[#3D2E17] text-[#9A5B00] dark:text-[#E8A33D] px-2 py-0.5 text-[11px] font-bold">
                        Your payout
                      </span>
                    )}
                  </div>
                  <span className="text-[12px] text-muted">
                    {formatDue(round.dueAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pl-7 sm:pl-0">
                <div className="flex items-center gap-2">
                  <Avatar
                    name={round.recipient.fullName}
                    userId={round.recipient.userId}
                    size="sm"
                  />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-ink leading-tight">
                      {round.recipient.fullName} {isMyPayout ? '(You)' : ''}
                    </span>
                    <span className="text-[12px] font-bold tabular-nums text-primary leading-tight">
                      {formatKobo(round.potKobo)}
                    </span>
                  </div>
                </div>

                <Badge status={round.status} />
              </div>
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="p-4 pt-1 border-t border-border/60 bg-surface-muted/20 flex flex-col gap-3">
                {isPaidOut && round.payoutTransactionId && (
                  <div className="flex items-center justify-between p-2.5 rounded-[10px] bg-success-soft text-[13px] text-success font-semibold">
                    <div className="flex items-center gap-2">
                      <Gift size={16} />
                      <span>
                        Paid out on {round.paidOutAt ? formatDateTime(round.paidOutAt) : 'Completion'}
                      </span>
                    </div>
                    <Link
                      to={`/app/transactions/${round.payoutTransactionId}`}
                      className="underline text-[12px] font-bold hover:opacity-80"
                    >
                      View payout
                    </Link>
                  </div>
                )}

                <div className="rounded-[10px] border border-border bg-surface divide-y divide-border overflow-hidden text-[13px]">
                  {round.contributions.map((c) => {
                    const isPaid = c.status === 'paid';
                    return (
                      <div
                        key={c.userId}
                        className="flex items-center justify-between px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar name={c.fullName} userId={c.userId} size="sm" />
                          <span className="font-semibold text-ink">
                            {c.fullName} {c.userId === userId ? '(You)' : ''}
                          </span>
                        </div>

                        <div>
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1.5 text-success font-medium text-[12px]">
                              <Check size={14} />
                              <span>Paid · {c.paidAt ? formatDateTime(c.paidAt) : 'Done'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-muted font-medium text-[12px]">
                              <Clock size={14} />
                              <span>Not paid yet</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
