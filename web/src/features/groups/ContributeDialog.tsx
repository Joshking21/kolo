import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatKobo } from '../../lib/money';
import { queryKeys } from '../../lib/query-client';
import { contributeApi } from '../../lib/api/groups';
import { useIdempotencyKey, shouldRenewIdempotencyKey } from '../../lib/idempotency';
import { messageFor } from '../../lib/api/errors';
import { toast } from 'sonner';

export interface ContributeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  roundNumber: number;
  recipientName: string;
  contributionKobo: number;
  walletBalanceKobo: number;
  onOpenAddMoney?: () => void;
}

export function ContributeDialog({
  open,
  onOpenChange,
  groupId,
  groupName,
  roundNumber,
  recipientName,
  contributionKobo,
  walletBalanceKobo,
  onOpenAddMoney,
}: ContributeDialogProps) {
  const { key, renew } = useIdempotencyKey();
  const queryClient = useQueryClient();

  const balanceAfter = walletBalanceKobo - contributionKobo;
  const isInsufficient = balanceAfter < 0;

  const contributeMutation = useMutation({
    mutationFn: async () => {
      return contributeApi(groupId, roundNumber, key);
    },
    onSuccess: () => {
      renew();
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet() });
      queryClient.invalidateQueries({ queryKey: queryKeys.walletTransactions() });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups() });
      queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupRounds(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.groupActivity(groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount() });

      toast.success(`Paid ${formatKobo(contributionKobo)} for round ${roundNumber}`);
      onOpenChange(false);
    },
    onError: (err) => {
      if (shouldRenewIdempotencyKey(err)) {
        renew();
      }
      toast.error(messageFor(err));
    },
  });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Confirm contribution"
      confirmLabel={`Pay ${formatKobo(contributionKobo)}`}
      confirmDisabled={isInsufficient}
      confirmLoading={contributeMutation.isPending}
      onConfirm={() => contributeMutation.mutate()}
      rows={[
        { label: 'Group', value: groupName },
        { label: 'Round', value: `Round ${roundNumber}` },
        { label: 'Recipient', value: recipientName },
        { label: 'Amount', value: formatKobo(contributionKobo) },
        {
          label: 'Your balance after',
          value: formatKobo(balanceAfter),
          isDanger: isInsufficient,
        },
      ]}
    >
      {isInsufficient && (
        <div className="flex items-center justify-between rounded-[10px] bg-danger-soft p-3 text-[13px] text-danger font-medium">
          <span>You need more funds in your wallet.</span>
          {onOpenAddMoney && (
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onOpenAddMoney();
              }}
              className="font-bold underline hover:opacity-80 transition"
            >
              Add money
            </button>
          )}
        </div>
      )}
    </ConfirmDialog>
  );
}
