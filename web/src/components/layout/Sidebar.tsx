import { NavLink } from 'react-router';
import { House, Wallet, Users, Bell, Settings, LogOut } from 'lucide-react';
import { KoloWordmark } from '../ui/KoloWordmark';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../lib/auth/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../lib/query-client';
import { getUnreadCountApi } from '../../lib/api/notifications';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { data: unreadData } = useQuery({
    queryKey: queryKeys.unreadCount(),
    queryFn: getUnreadCountApi,
    refetchInterval: 30_000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const navItems = [
    { to: '/app', label: 'Home', icon: House, end: true },
    { to: '/app/wallet', label: 'Wallet', icon: Wallet },
    { to: '/app/groups', label: 'Groups', icon: Users },
    { to: '/app/notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    { to: '/app/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden sm:flex flex-col shrink-0 border-r border-border bg-surface h-screen sticky top-0 transition-all duration-150 sm:w-[72px] lg:w-[248px]">
      {/* Top Wordmark */}
      <div className="flex h-16 items-center px-4 lg:px-6 border-b border-border/50">
        <div className="hidden lg:block">
          <KoloWordmark linkTo="/app" />
        </div>
        <div className="lg:hidden mx-auto">
          <KoloWordmark linkTo="/app" />
        </div>
      </div>

      {/* Nav List */}
      <nav aria-label="Main Navigation" className="flex-1 py-4 flex flex-col gap-1 px-2 lg:px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              aria-label={item.label}
              className={({ isActive }) =>
                `group relative flex h-11 items-center rounded-[10px] px-3 font-semibold text-[14px] transition outline-none select-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isActive
                    ? 'bg-surface-muted text-primary'
                    : 'text-muted hover:bg-surface-muted/60 hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />
                  )}
                  <Icon size={18} className="shrink-0" />
                  <span className="ml-3 hidden lg:inline-block truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto hidden lg:inline-flex items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-bold text-ink">
                      {item.badge}
                    </span>
                  )}
                  {/* Dot for rail */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent lg:hidden" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div className="p-3 lg:p-4 border-t border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 overflow-hidden">
          <Avatar name={user?.fullName || 'User'} userId={user?.id} size="md" />
          <div className="hidden lg:flex flex-col min-w-0">
            <span className="text-[14px] font-semibold text-ink truncate leading-tight">
              {user?.fullName}
            </span>
            <span className="text-[12px] text-muted truncate leading-tight">
              {user?.email}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => logout()}
          title="Log out"
          aria-label="Log out"
          className="h-9 w-9 rounded-full inline-flex items-center justify-center text-muted hover:bg-surface-muted hover:text-danger transition shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
