import { apiRequest } from './client';
import {
  DevFakeContributionsResponse,
  DevFundWalletResponse,
  DevRunDueRoundsResponse,
  GroupDetail,
} from './types';

export function devFundWalletApi(
  amountKobo: number,
  idempotencyKey?: string
): Promise<DevFundWalletResponse> {
  return apiRequest<DevFundWalletResponse>('POST', '/dev/fund-wallet', {
    body: { amountKobo },
    idempotencyKey,
  });
}

export function devFakeMembersApi(
  groupId: string,
  count: number
): Promise<GroupDetail> {
  return apiRequest<GroupDetail>(
    'POST',
    `/dev/groups/${groupId}/fake-members`,
    { body: { count } }
  );
}

export function devFakeContributionsApi(
  groupId: string
): Promise<DevFakeContributionsResponse> {
  return apiRequest<DevFakeContributionsResponse>(
    'POST',
    `/dev/groups/${groupId}/fake-contributions`
  );
}

export function devRunDueRoundsApi(): Promise<DevRunDueRoundsResponse> {
  return apiRequest<DevRunDueRoundsResponse>('POST', '/dev/jobs/run-due-rounds');
}
