import { Card } from '../../components/ui/Card';
import { CopyButton } from '../../components/ui/CopyButton';
import { formatInviteCode } from '../../lib/invite-code';

export interface InviteCardProps {
  inviteCode: string;
  memberCount: number;
  maxMembers: number;
}

export function InviteCard({
  inviteCode,
  memberCount,
  maxMembers,
}: InviteCardProps) {
  const formattedCode = formatInviteCode(inviteCode);
  const joinUrl = `${window.location.origin}/app/join?code=${inviteCode}`;

  return (
    <Card className="p-5 sm:p-6 bg-surface border-border shadow-xs flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[12px] font-bold uppercase tracking-wider text-muted">
            Invite your people
          </span>
          <span className="font-mono text-[24px] sm:text-[28px] font-bold tracking-widest text-ink mt-0.5">
            {formattedCode}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <CopyButton value={formattedCode} label="Copy code" />
          <CopyButton value={joinUrl} label="Copy invite link" />
        </div>
      </div>

      <div className="flex items-center justify-between text-[13px] text-muted pt-3 border-t border-border">
        <span>{memberCount} of {maxMembers} joined</span>
        <span>Share the code or link with prospective members</span>
      </div>
    </Card>
  );
}
