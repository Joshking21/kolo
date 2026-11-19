import { useInfiniteQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { queryKeys } from '../../lib/query-client';
import { getGroupActivityApi } from '../../lib/api/groups';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { formatRelative } from '../../lib/dates';
import { Activity } from '../../lib/api/types';

export interface ActivityTabProps {
  groupId: string;
}

export function ActivityTab({ groupId }: ActivityTabProps) {
  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.groupActivity(groupId),
    queryFn: ({ pageParam }) => getGroupActivityApi(groupId, pageParam, 20),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const activities: Activity[] = data?.pages.flatMap((page) => page.data) || [];

  if (activities.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No activity recorded yet"
        description="Transactions and group updates will appear here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface divide-y divide-border overflow-hidden">
        {activities.map((act) => (
          <div key={act.id} className="flex items-start gap-3.5 p-4 text-[14px]">
            <Avatar
              name={act.actor?.fullName || 'System'}
              userId={act.actor?.userId}
              size="sm"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[14px] text-ink leading-snug">
                {act.message}
              </span>
              <span className="text-[12px] text-muted mt-1">
                {formatRelative(act.createdAt)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center pt-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            loading={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            Load more activity
          </Button>
        </div>
      )}
    </div>
  );
}
