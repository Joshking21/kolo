import { useState, useEffect } from 'react';
import { Code, X } from 'lucide-react';
import { getDevLogs, subscribeDevLogs } from '../../lib/devlog';
import { RequestLog } from './RequestLog';
import { DevSettings } from './DevSettings';

export function DevPanel() {
  const showDevPanel =
    import.meta.env.DEV || import.meta.env.VITE_SHOW_DEV_PANEL === 'true';

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'settings'>('requests');
  const [recentCount, setRecentCount] = useState(0);

  useEffect(() => {
    if (!showDevPanel) return;

    const updateRecent = () => {
      const nowMs = Date.now();
      const logs = getDevLogs();
      const count = logs.filter(
        (l) => nowMs - new Date(l.timestamp).getTime() <= 10_000
      ).length;
      setRecentCount(count);
    };

    updateRecent();
    const interval = setInterval(updateRecent, 2000);
    const unsub = subscribeDevLogs(() => updateRecent());

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [showDevPanel]);

  if (!showDevPanel) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open developer panel"
        className="fixed bottom-20 sm:bottom-4 left-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-on-primary shadow-md hover:bg-primary-hover transition outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Code size={18} />
        {recentCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-ink">
            {recentCount}
          </span>
        )}
      </button>

      {/* Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-none transition-opacity animate-in fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="relative z-50 flex h-full w-full sm:max-w-[480px] flex-col bg-surface border-l border-border shadow-xl animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <Code size={18} className="text-primary" />
                <h3 className="font-display font-semibold text-[16px] text-ink">
                  Under the hood
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close developer panel"
                className="h-8 w-8 rounded-full inline-flex items-center justify-center text-muted hover:bg-surface-muted transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab switch */}
            <div className="flex border-b border-border px-4">
              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className={`py-2.5 px-3 text-[13px] font-semibold transition border-b-2 -mb-[1px] ${
                  activeTab === 'requests'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                Requests
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`py-2.5 px-3 text-[13px] font-semibold transition border-b-2 -mb-[1px] ${
                  activeTab === 'settings'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                Settings
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'requests' ? <RequestLog /> : <DevSettings />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
