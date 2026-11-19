import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIdempotencyKey, shouldRenewIdempotencyKey } from './idempotency';
import { ApiError } from './api/errors';

describe('idempotency', () => {
  describe('useIdempotencyKey', () => {
    it('creates a UUID key on mount and preserves it across renders', () => {
      const { result, rerender } = renderHook(() => useIdempotencyKey());
      const initialKey = result.current.key;
      expect(initialKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

      rerender();
      expect(result.current.key).toBe(initialKey);
    });

    it('generates a new key when renew() is called', () => {
      const { result } = renderHook(() => useIdempotencyKey());
      const initialKey = result.current.key;

      act(() => {
        result.current.renew();
      });

      expect(result.current.key).not.toBe(initialKey);
      expect(result.current.key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('shouldRenewIdempotencyKey', () => {
    it('returns true on success (no error)', () => {
      expect(shouldRenewIdempotencyKey(null)).toBe(true);
      expect(shouldRenewIdempotencyKey(undefined)).toBe(true);
    });

    it('returns false for transient network or 5xx errors or in-progress', () => {
      const networkErr = new ApiError({
        status: 0,
        code: 'NETWORK_ERROR',
        message: 'offline',
      });
      expect(shouldRenewIdempotencyKey(networkErr)).toBe(false);

      const serverErr = new ApiError({
        status: 500,
        code: 'INTERNAL_ERROR',
        message: 'crash',
      });
      expect(shouldRenewIdempotencyKey(serverErr)).toBe(false);

      const inProgressErr = new ApiError({
        status: 409,
        code: 'IDEMPOTENCY_IN_PROGRESS',
        message: 'processing',
      });
      expect(shouldRenewIdempotencyKey(inProgressErr)).toBe(false);
    });

    it('returns true for 4xx permanent business rejections', () => {
      const insufficientFunds = new ApiError({
        status: 422,
        code: 'INSUFFICIENT_FUNDS',
        message: 'low balance',
      });
      expect(shouldRenewIdempotencyKey(insufficientFunds)).toBe(true);

      const validation = new ApiError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'bad field',
      });
      expect(shouldRenewIdempotencyKey(validation)).toBe(true);

      const alreadyPaid = new ApiError({
        status: 409,
        code: 'ALREADY_CONTRIBUTED',
        message: 'already paid',
      });
      expect(shouldRenewIdempotencyKey(alreadyPaid)).toBe(true);
    });
  });
});
