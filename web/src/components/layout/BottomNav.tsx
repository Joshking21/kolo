import { NavLink } from 'react-router';
import { House, Wallet, Users, Settings } from 'lucide-react';

export function BottomNav() {
  const tabs = [
    { to: '/app', label: 'Home', icon: House, end: true },
    { to: '/app/wallet', label: 'Wallet', icon: Wallet },
    { to: '/app/groups', label: 'Groups', icon: Users },
    { to: '/app/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-30 flex sm:hidden h-16 items-center justify-around border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center h-full gap-1 text-[11px] font-semibold transition outline-none select-none ${
                isActive
                  ? 'text-primary'
                  : 'text-muted hover:text-ink'
              }`
            }
          >
            <Icon size={20} />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
