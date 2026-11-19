import { Link } from 'react-router';
import { Bell } from 'lucide-react';
import { KoloWordmark } from '../ui/KoloWordmark';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-client';
import { getUnreadCountApi } from '../../lib/api/notifications';

export function TopBar() {
  const { data: unreadData } = useQuery({
    queryKey: queryKeys.unreadCount(),
    queryFn: getUnreadCountApi,
    refetchInterval: 30_000,
  });
  const unreadCount = unreadData?.count ?? 0;

  return (
    <header className="flex sm:hidden h-14 w-full items-center justify-between border-b border-border bg-surface px-4 sticky top-8 z-30">
      <KoloWordmark linkTo="/app" />
      <Link
        to="/app/notifications"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink hover:bg-surface-muted transition outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent" />
        )}
      </Link>
    </header>
  );
}
