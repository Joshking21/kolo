import { Link } from 'react-router';
import { GroupSummary } from '../../lib/api/types';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { formatKobo } from '../../lib/money';

export function GroupCard({ group }: { group: GroupSummary }) {
  const isWeekly = group.frequency === 'weekly';
  const freqLabel = isWeekly ? 'weekly' : 'monthly';

  return (
    <Link to={`/app/groups/${group.id}`} className="block group outline-none">
      <Card className="h-full flex flex-col justify-between p-5 border-border hover:border-primary/40 hover:shadow-xs transition group-focus-visible:ring-2 group-focus-visible:ring-accent">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-display font-semibold text-[17px] text-ink group-hover:text-primary transition line-clamp-1">
              {group.name}
            </h3>
            <Badge status={group.status} />
          </div>

          {/* Meta */}
          <div className="flex items-center gap-2 text-[13px] text-muted mb-4">
            <span className="font-medium tabular-nums">
              {formatKobo(group.contributionKobo)} {freqLabel}
            </span>
            <span>·</span>
            <span>{group.memberCount} members</span>
          </div>

          {/* Body based on status */}
          {group.status === 'active' && group.currentRound && (
            <div className="rounded-xl bg-surface-muted p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-semibold text-ink">
                  Round {group.currentRound.roundNumber}
                </span>
                <span className="text-[12px] text-muted">
                  {group.currentRound.contributedCount} of {group.currentRound.totalMembers} paid
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round(
                      (group.currentRound.contributedCount / group.currentRound.totalMembers) * 100
                    )}%`,
                  }}
                />
              </div>

              {/* Recipient */}
              <div className="flex items-center gap-2 pt-1 text-[12px] text-muted">
                <Avatar
                  name={group.currentRound.recipient.fullName}
                  userId={group.currentRound.recipient.userId}
                  size="sm"
                />
                <span className="truncate">
                  Recipient:{' '}
                  <strong className="text-ink font-semibold">
                    {group.currentRound.recipient.fullName}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {group.status === 'forming' && (
            <div className="rounded-xl bg-surface-muted p-3 flex items-center justify-between text-[13px]">
              <span className="font-semibold text-ink">
                {group.memberCount} of {group.maxMembers} joined
              </span>
              <span className="text-[12px] text-muted">
                Waiting to start
              </span>
            </div>
          )}

          {group.status === 'completed' && (
            <div className="rounded-xl bg-surface-muted p-3 text-[13px] text-muted">
              All rounds completed and paid out.
            </div>
          )}

          {group.status === 'cancelled' && (
            <div className="rounded-xl bg-surface-muted p-3 text-[13px] text-danger">
              This group was cancelled.
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
