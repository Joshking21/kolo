import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, UserMinus, XCircle, Bot, ArrowLeft } from 'lucide-react';
import { queryKeys } from '../lib/query-client';
import {
  getGroupApi,
  getGroupRoundsApi,
  startGroupApi,
  leaveGroupApi,
  cancelGroupApi,
} from '../lib/api/groups';
import { getWalletApi } from '../lib/api/wallet';
import { devFakeMembersApi } from '../lib/api/dev';
import { useAuth } from '../lib/auth/AuthProvider';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Tabs } from '../components/ui/Tabs';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { InviteCard } from '../features/groups/InviteCard';
import { CurrentRoundPanel } from '../features/groups/CurrentRoundPanel';
import { RoundsTab } from '../features/groups/RoundsTab';
import { MembersTab } from '../features/groups/MembersTab';
import { ActivityTab } from '../features/groups/ActivityTab';
import { AddMoneyDialog } from '../features/wallet/AddMoneyDialog';
import { formatKobo } from '../lib/money';
import { formatDate } from '../lib/dates';
import { messageFor } from '../lib/api/errors';
import { toast } from 'sonner';

export function GroupDetail() {
  const { groupId = '' } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [fakeMemberCount, setFakeMemberCount] = useState(1);

  // Group Details Query
  const {
    data: group,
    isLoading: groupLoading,
    error: groupError,
    refetch: refetchGroup,
  } = useQuery({
    queryKey: queryKeys.group(groupId),
    queryFn: () => getGroupApi(groupId),
    enabled: Boolean(groupId),
  });

  // Group Rounds Query
  const { data: roundsData } = useQuery({
    queryKey: queryKeys.groupRounds(groupId),
    queryFn: () => getGroupRoundsApi(groupId),
    enabled: Boolean(groupId && group?.status !== 'forming'),
  });
  const rounds = roundsData?.data || [];

  // Wallet Query
  const { data: wallet } = useQuery({
    queryKey: queryKeys.wallet(),
    queryFn: getWalletApi,
  });

  // Start Group Mutation
  const startMutation = useMutation({
    mutationFn: () => startGroupApi(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupRounds(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
      toast.success('Group started!');
      setStartConfirmOpen(false);
    },
    onError: (err) => {
      toast.error(messageFor(err));
    },
  });

  // Cancel Group Mutation
  const cancelMutation = useMutation({
    mutationFn: () => cancelGroupApi(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
      toast.info('Group cancelled');
      setCancelConfirmOpen(false);
    },
    onError: (err) => {
      toast.error(messageFor(err));
    },
  });

  // Leave Group Mutation
  const leaveMutation = useMutation({
    mutationFn: () => leaveGroupApi(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
      toast.info('You have left the group');
      navigate('/app/groups');
    },
    onError: (err) => {
      toast.error(messageFor(err));
    },
  });

  // Add Fake Members Mutation
  const fakeMembersMutation = useMutation({
    mutationFn: (count: number) => devFakeMembersApi(groupId, count),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupActivity(groupId) });
      toast.success('Fake members added');
    },
    onError: (err) => {
      toast.error(messageFor(err));
    },
  });

  if (groupLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (groupError || !group) {
    return <ErrorState error={groupError} onRetry={refetchGroup} />;
  }

  const isAdmin = group.myRole === 'admin';
  const isForming = group.status === 'forming';
  const isActive = group.status === 'active';
  const isCompleted = group.status === 'completed';
  const isCancelled = group.status === 'cancelled';

  const freqLabel = group.frequency === 'weekly' ? 'weekly' : 'monthly';
  const orderLabel = group.payoutOrder === 'join_order' ? 'Join order' : 'Random';
  const potAmount = group.contributionKobo * group.members.length;

  const firstDueDate = new Date();
  if (group.frequency === 'weekly') {
    firstDueDate.setDate(firstDueDate.getDate() + 7);
  } else {
    firstDueDate.setMonth(firstDueDate.getMonth() + 1);
  }

  const availableSlots = group.maxMembers - group.members.length;
  const isDevOrMock = Boolean(
    import.meta.env.DEV ||
    (import.meta.env.VITE_MOCK_DOMAINS && import.meta.env.VITE_MOCK_DOMAINS.includes('dev'))
  );

  const tabs = [
    {
      id: 'rounds',
      label: 'Rounds',
      count: isForming ? undefined : rounds.length,
      content: <RoundsTab rounds={rounds} userId={user?.id} />,
    },
    {
      id: 'members',
      label: 'Members',
      count: group.members.length,
      content: <MembersTab members={group.members} userId={user?.id} isForming={isForming} />,
    },
    {
      id: 'activity',
      label: 'Activity',
      content: <ActivityTab groupId={groupId} />,
    },
  ];

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Back Link */}
      <Link
        to="/app/groups"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink transition w-fit -mb-4"
      >
        <ArrowLeft size={16} />
        <span>All groups</span>
      </Link>

      {/* Header section */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] font-[650] font-display text-ink leading-tight">
              {group.name}
            </h1>
            <Badge status={group.status} />
          </div>

          {/* Admin / Member Actions while forming */}
          {isForming && (
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin ? (
                <>
                  <Button
                    size="sm"
                    disabled={group.members.length < 2}
                    title={group.members.length < 2 ? 'Needs at least 2 members to start' : undefined}
                    onClick={() => setStartConfirmOpen(true)}
                  >
                    <Play size={14} className="mr-1.5" />
                    Start group
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger-soft"
                    onClick={() => setCancelConfirmOpen(true)}
                  >
                    <XCircle size={14} className="mr-1.5" />
                    Cancel group
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger hover:bg-danger-soft"
                  onClick={() => setLeaveConfirmOpen(true)}
                >
                  <UserMinus size={14} className="mr-1.5" />
                  Leave group
                </Button>
              )}
            </div>
          )}
        </div>

        {group.description && (
          <p className="text-[15px] text-muted leading-relaxed">
            {group.description}
          </p>
        )}

        <div className="flex items-center gap-2 text-[13px] text-muted font-medium">
          <span className="tabular-nums">
            {formatKobo(group.contributionKobo)} {freqLabel}
          </span>
          <span>·</span>
          <span>{group.members.length} members</span>
          <span>·</span>
          <span>{orderLabel}</span>
        </div>
      </div>

      {/* Forming: Invite Card & Dev Actions */}
      {isForming && (
        <div className="flex flex-col gap-4">
          <InviteCard
            inviteCode={group.inviteCode}
            memberCount={group.members.length}
            maxMembers={group.maxMembers}
          />

          {isDevOrMock && isAdmin && availableSlots > 0 && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-muted border border-border text-[13px]">
              <Bot size={16} className="text-primary shrink-0" />
              <span className="font-semibold text-ink">Dev simulation:</span>
              <div className="flex items-center gap-2 ml-auto">
                <select
                  value={fakeMemberCount}
                  onChange={(e) => setFakeMemberCount(parseInt(e.target.value, 10))}
                  className="h-8 rounded-lg border border-border bg-surface px-2 text-[13px] font-semibold outline-none"
                >
                  {Array.from({ length: availableSlots }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'member' : 'members'}
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  size="sm"
                  loading={fakeMembersMutation.isPending}
                  onClick={() => fakeMembersMutation.mutate(fakeMemberCount)}
                >
                  Add fake members
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active: Current Round Panel */}
      {isActive && (
        <CurrentRoundPanel
          group={group}
          rounds={rounds}
          userId={user?.id}
          walletBalanceKobo={wallet?.balanceKobo ?? 0}
          onOpenAddMoney={() => setAddMoneyOpen(true)}
        />
      )}

      {/* Completed Group Summary Banner */}
      {isCompleted && (
        <Card className="p-5 bg-surface-muted border-border">
          <h3 className="font-semibold text-[15px] text-ink mb-1">
            Group Completed
          </h3>
          <p className="text-[14px] text-muted">
            This group finished on {formatDate(rounds[rounds.length - 1]?.paidOutAt || new Date())}. Everyone collected {formatKobo(potAmount)}.
          </p>
        </Card>
      )}

      {/* Cancelled Banner */}
      {isCancelled && (
        <div className="p-4 rounded-[14px] bg-surface-muted text-[14px] text-danger font-medium border border-border">
          This group was cancelled.
        </div>
      )}

      {/* Tabs */}
      <Tabs items={tabs} />

      {/* Dialogs */}
      {/* Start Group ConfirmDialog */}
      <ConfirmDialog
        open={startConfirmOpen}
        onOpenChange={setStartConfirmOpen}
        title="Start group"
        warning="Once started, nobody can join or leave."
        confirmLabel="Start group"
        confirmLoading={startMutation.isPending}
        onConfirm={() => startMutation.mutate()}
        rows={[
          { label: 'Members', value: group.members.length },
          { label: 'Rounds', value: group.members.length },
          { label: 'Each payout', value: formatKobo(potAmount) },
          { label: 'First payment due', value: formatDate(firstDueDate) },
        ]}
      />

      {/* Cancel Group ConfirmDialog */}
      <ConfirmDialog
        open={cancelConfirmOpen}
        onOpenChange={setCancelConfirmOpen}
        title="Cancel group"
        description="Are you sure you want to cancel this group? This action cannot be undone."
        confirmLabel="Cancel group"
        confirmVariant="danger"
        confirmLoading={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
      />

      {/* Leave Group ConfirmDialog */}
      <ConfirmDialog
        open={leaveConfirmOpen}
        onOpenChange={setLeaveConfirmOpen}
        title="Leave group"
        description="Are you sure you want to leave this group?"
        confirmLabel="Leave group"
        confirmVariant="danger"
        confirmLoading={leaveMutation.isPending}
        onConfirm={() => leaveMutation.mutate()}
      />

      <AddMoneyDialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen} />
    </div>
  );
}
