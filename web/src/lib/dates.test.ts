import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, formatRelative, formatDue } from './dates';

describe('dates', () => {
  // Pinned base date: 19 Nov 2026, 12:00:00 Africa/Lagos (UTC+1, so 11:00 UTC)
  const now = new Date('2026-11-19T11:00:00.000Z');

  describe('formatDate', () => {
    it('formats ISO to DD Mon YYYY', () => {
      expect(formatDate('2026-11-19T09:30:00.000Z')).toBe('19 Nov 2026');
    });
  });

  describe('formatDateTime', () => {
    it('formats ISO to DD Mon YYYY, H:MM am/pm', () => {
      // 08:30 UTC is 09:30 in Africa/Lagos (UTC+1)
      expect(formatDateTime('2026-11-19T08:30:00.000Z')).toBe('19 Nov 2026, 9:30 am');
    });
  });

  describe('formatRelative', () => {
    it('handles "just now"', () => {
      const past30s = new Date(now.getTime() - 30_000);
      expect(formatRelative(past30s, now)).toBe('just now');
    });

    it('handles minutes ago', () => {
      const past5m = new Date(now.getTime() - 5 * 60_000);
      expect(formatRelative(past5m, now)).toBe('5 minutes ago');
    });

    it('handles hours ago', () => {
      const past3h = new Date(now.getTime() - 3 * 3_600_000);
      expect(formatRelative(past3h, now)).toBe('3 hours ago');
    });

    it('handles yesterday', () => {
      const yesterday = new Date(now.getTime() - 24 * 3_600_000);
      expect(formatRelative(yesterday, now)).toBe('yesterday');
    });

    it('handles days ago', () => {
      const past4d = new Date(now.getTime() - 4 * 24 * 3_600_000);
      expect(formatRelative(past4d, now)).toBe('4 days ago');
    });

    it('handles future times', () => {
      const in3h = new Date(now.getTime() + 3 * 3_600_000);
      expect(formatRelative(in3h, now)).toBe('in 3 hours');

      const tomorrow = new Date(now.getTime() + 24 * 3_600_000);
      expect(formatRelative(tomorrow, now)).toBe('tomorrow');

      const in5d = new Date(now.getTime() + 5 * 24 * 3_600_000);
      expect(formatRelative(in5d, now)).toBe('in 5 days');
    });
  });

  describe('formatDue', () => {
    it('returns "Due today" when due today', () => {
      expect(formatDue(now, now)).toBe('Due today');
    });

    it('returns "Due tomorrow" when due in 1 day', () => {
      const tomorrow = new Date(now.getTime() + 86_400_000);
      expect(formatDue(tomorrow, now)).toBe('Due tomorrow');
    });

    it('returns "Due in 5 days"', () => {
      const in5d = new Date(now.getTime() + 5 * 86_400_000);
      expect(formatDue(in5d, now)).toBe('Due in 5 days');
    });

    it('returns "Overdue by 1 day"', () => {
      const past1d = new Date(now.getTime() - 86_400_000);
      expect(formatDue(past1d, now)).toBe('Overdue by 1 day');
    });

    it('returns "Overdue by 2 days"', () => {
      const past2d = new Date(now.getTime() - 2 * 86_400_000);
      expect(formatDue(past2d, now)).toBe('Overdue by 2 days');
    });
  });
});
