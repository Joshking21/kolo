import { apiRequest } from './client';
import { Notification, Paginated } from './types';

export function getNotificationsApi(
  cursor?: string | null,
  limit?: number
): Promise<Paginated<Notification>> {
  return apiRequest<Paginated<Notification>>('GET', '/notifications', {
    query: { cursor: cursor ?? undefined, limit },
  });
}

export function getUnreadCountApi(): Promise<{ count: number }> {
  return apiRequest<{ count: number }>('GET', '/notifications/unread-count');
}

export function markNotificationReadApi(
  notificationId: string
): Promise<Notification> {
  return apiRequest<Notification>('POST', `/notifications/${notificationId}/read`);
}

export function markAllNotificationsReadApi(): Promise<void> {
  return apiRequest<void>('POST', '/notifications/read-all');
}
