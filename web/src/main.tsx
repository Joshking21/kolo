import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import './index.css';
import { router } from './router';
import { createQueryClient } from './lib/query-client';
import { AuthProvider } from './lib/auth/AuthProvider';
import { DevPanel } from './components/dev/DevPanel';
import { setupMockWorker } from './mocks/browser';

// Apply initial theme early to prevent flash
try {
  const savedTheme = localStorage.getItem('kolo-theme');
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
} catch {
  // ignore
}

async function prepareApp() {
  const rawDomains = import.meta.env.VITE_MOCK_DOMAINS || '';
  const enabledDomains = rawDomains
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  if (enabledDomains.length > 0) {
    const worker = setupMockWorker(enabledDomains);
    window.__MSW_ACTIVE_DOMAINS__ = enabledDomains;
    await worker.start({
      onUnhandledRequest: 'bypass',
      quiet: false,
    });
  }
}

const queryClient = createQueryClient();

prepareApp().then(() => {
  const container = document.getElementById('root');
  if (!container) throw new Error('Root element not found');

  createRoot(container).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster richColors position="top-right" closeButton />
          <DevPanel />
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>
  );
});
