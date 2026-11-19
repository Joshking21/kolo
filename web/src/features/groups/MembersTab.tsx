import { GroupMember } from '../../lib/api/types';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { formatDate } from '../../lib/dates';

export interface MembersTabProps {
  members: GroupMember[];
  userId?: string;
  isForming: boolean;
}

export function MembersTab({ members, userId, isForming }: MembersTabProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
      {members.map((member) => {
        const isMe = member.userId === userId;
        const positionLabel = isForming || member.payoutPosition === null ? '–' : `#${member.payoutPosition}`;

        return (
          <div
            key={member.userId}
            className="flex items-center justify-between p-4 text-[14px]"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <span className="w-6 font-mono text-[14px] font-bold text-muted text-center">
                {positionLabel}
              </span>

              <Avatar name={member.fullName} userId={member.userId} size="md" />

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-ink truncate">
                    {member.fullName} {isMe ? '(You)' : ''}
                  </span>
                  {member.role === 'admin' && <Badge status="admin" />}
                </div>
                <span className="text-[12px] text-muted">
                  Joined {formatDate(member.joinedAt)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
