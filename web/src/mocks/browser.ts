import { setupWorker } from 'msw/browser';
import { authHandlers } from './handlers/auth';
import { groupHandlers } from './handlers/groups';
import { walletHandlers } from './handlers/wallet';
import { paymentHandlers } from './handlers/payments';
import { notificationHandlers } from './handlers/notifications';
import { devHandlers } from './handlers/dev';
import { loadDb } from './db';
import { seedMockDb } from './seed';

export function setupMockWorker(enabledDomains: string[]) {
  const loaded = loadDb();
  if (!loaded) {
    seedMockDb();
  }

  const handlers = [];

  if (enabledDomains.includes('auth')) {
    handlers.push(...authHandlers);
  }
  if (enabledDomains.includes('groups')) {
    handlers.push(...groupHandlers);
  }
  if (enabledDomains.includes('wallet')) {
    handlers.push(...walletHandlers);
  }
  if (enabledDomains.includes('payments')) {
    handlers.push(...paymentHandlers);
  }
  if (enabledDomains.includes('notifications')) {
    handlers.push(...notificationHandlers);
  }
  if (enabledDomains.includes('dev')) {
    handlers.push(...devHandlers);
  }

  return setupWorker(...handlers);
}
