import { apiRequest } from './client';
import { AuthResponse, User } from './types';

export function registerApi(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('POST', '/auth/register', { body: input });
}

export function loginApi(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('POST', '/auth/login', { body: input });
}

export function refreshApi(): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('POST', '/auth/refresh', { skipAuthRefresh: true });
}

export function logoutApi(): Promise<void> {
  return apiRequest<void>('POST', '/auth/logout');
}

export function logoutAllApi(): Promise<void> {
  return apiRequest<void>('POST', '/auth/logout-all');
}

export function getMeApi(): Promise<User> {
  return apiRequest<User>('GET', '/me');
}

export function updateMeApi(input: {
  fullName?: string;
  phone?: string;
}): Promise<User> {
  return apiRequest<User>('PATCH', '/me', { body: input });
}

export function changePasswordApi(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  return apiRequest<void>('POST', '/me/password', { body: input });
}
