import { useNavigate } from 'react-router';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Clock,
  AlertCircle,
  Gift,
  CheckCircle2,
  Users,
  Check,
} from 'lucide-react';
import { queryKeys } from '../lib/query-client';
import {
  getNotificationsApi,
  getUnreadCountApi,
  markAllNotificationsReadApi,
  markNotificationReadApi,
} from '../lib/api/notifications';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { formatRelative } from '../lib/dates';
import { Notification, NotificationType } from '../lib/api/types';

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'payout_received':
      return { icon: Gift, text: 'text-accent', bg: 'bg-[#FDF4E5] dark:bg-[#3D2E17]' };
    case 'contribution_due':
      return { icon: Clock, text: 'text-warning', bg: 'bg-warning-soft' };
    case 'contribution_overdue':
      return { icon: AlertCircle, text: 'text-danger', bg: 'bg-danger-soft' };
    case 'deposit_succeeded':
    case 'contribution_received':
    case 'withdrawal_succeeded':
      return { icon: CheckCircle2, text: 'text-success', bg: 'bg-success-soft' };
    case 'group_started':
    case 'member_joined':
    case 'group_completed':
      return { icon: Users, text: 'text-primary', bg: 'bg-surface-muted' };
    default:
      return { icon: Bell, text: 'text-muted', bg: 'bg-surface-muted' };
  }
}

export function Notifications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: unreadData } = useQuery({
    queryKey: queryKeys.unreadCount(),
    queryFn: getUnreadCountApi,
  });
  const unreadCount = unreadData?.count ?? 0;

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.notifications(),
    queryFn: ({ pageParam }) => getNotificationsApi(pageParam, 20),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const markReadMutation = useMutation({
    mutationFn: (notifId: string) => markNotificationReadApi(notifId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount() });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsReadApi(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications() });
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount() });
    },
  });

  const notifications: Notification[] =
    data?.pages.flatMap((page) => page.data) || [];

  const handleNotificationClick = (n: Notification) => {
    if (!n.readAt) {
      markReadMutation.mutate(n.id);
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-[650] font-display text-ink leading-tight">
            Notifications
          </h1>
          <p className="text-[14px] text-muted">
            Updates on your circles, payments, and turns.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={unreadCount === 0 || markAllMutation.isPending}
          onClick={() => markAllMutation.mutate()}
        >
          <Check size={14} className="mr-1.5" />
          Mark all as read
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="You're all caught up"
          description="We'll notify you when it's your turn to pay or collect."
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {notifications.map((n) => {
            const isUnread = n.readAt === null;
            const { icon: Icon, text, bg } = getNotificationIcon(n.type);

            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleNotificationClick(n)}
                className={`relative flex items-start gap-3.5 p-4 rounded-[14px] text-left border transition outline-none select-none ${
                  isUnread
                    ? 'border-l-[3px] border-l-accent border-border bg-surface shadow-xs'
                    : 'border-border/60 bg-surface-muted/30 hover:bg-surface-muted/60'
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full mt-0.5 ${bg} ${text}`}
                >
                  <Icon size={18} />
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[14px] font-semibold ${
                        isUnread ? 'text-ink' : 'text-muted'
                      }`}
                    >
                      {n.title}
                    </span>
                    <span className="text-[12px] text-muted shrink-0">
                      {formatRelative(n.createdAt)}
                    </span>
                  </div>

                  <p className="text-[13px] text-muted leading-relaxed mt-0.5">
                    {n.body}
                  </p>
                </div>
              </button>
            );
          })}

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
    </div>
  );
}
