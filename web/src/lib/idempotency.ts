import { useState, useCallback } from 'react';
import { isApiError } from './api/errors';

export function shouldRenewIdempotencyKey(error: unknown): boolean {
  if (!error) return true; // Success outcome

  if (isApiError(error)) {
    if (error.code === 'NETWORK_ERROR') return false;
    if (error.code === 'IDEMPOTENCY_IN_PROGRESS') return false;
    if (error.status >= 500) return false;
    return true; // 4xx definite failure
  }

  return false;
}

export function useIdempotencyKey() {
  const [key, setKey] = useState<string>(() => crypto.randomUUID());

  const renew = useCallback(() => {
    setKey(crypto.randomUUID());
  }, []);

  return { key, renew };
}
