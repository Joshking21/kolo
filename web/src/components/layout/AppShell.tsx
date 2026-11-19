import { Outlet } from 'react-router';
import { TestModeBanner } from './TestModeBanner';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

export function AppShell() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <TestModeBanner />
      <TopBar />

      <div className="flex-1 flex w-full">
        <Sidebar />

        <main className="flex-1 min-w-0 flex flex-col items-center px-4 py-6 sm:px-8 sm:py-8 pb-24 sm:pb-8">
          <div className="w-full max-w-[1080px]">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
