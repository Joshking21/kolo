import { apiRequest } from './client';
import {
  Activity,
  ContributeResponse,
  GroupDetail,
  GroupSummary,
  Paginated,
  Round,
} from './types';

export function createGroupApi(input: {
  name: string;
  description?: string | null;
  contributionKobo: number;
  frequency: 'weekly' | 'monthly';
  maxMembers: number;
  payoutOrder: 'join_order' | 'random';
}): Promise<GroupDetail> {
  return apiRequest<GroupDetail>('POST', '/groups', { body: input });
}

export function getGroupsApi(): Promise<{ data: GroupSummary[] }> {
  return apiRequest<{ data: GroupSummary[] }>('GET', '/groups');
}

export function getGroupApi(groupId: string): Promise<GroupDetail> {
  return apiRequest<GroupDetail>('GET', `/groups/${groupId}`);
}

export function joinGroupApi(inviteCode: string): Promise<GroupDetail> {
  return apiRequest<GroupDetail>('POST', '/groups/join', { body: { inviteCode } });
}

export function leaveGroupApi(groupId: string): Promise<void> {
  return apiRequest<void>('POST', `/groups/${groupId}/leave`);
}

export function cancelGroupApi(groupId: string): Promise<GroupDetail> {
  return apiRequest<GroupDetail>('POST', `/groups/${groupId}/cancel`);
}

export function startGroupApi(groupId: string): Promise<GroupDetail> {
  return apiRequest<GroupDetail>('POST', `/groups/${groupId}/start`);
}

export function getGroupRoundsApi(groupId: string): Promise<{ data: Round[] }> {
  return apiRequest<{ data: Round[] }>('GET', `/groups/${groupId}/rounds`);
}

export function contributeApi(
  groupId: string,
  roundNumber: number,
  idempotencyKey: string
): Promise<ContributeResponse> {
  return apiRequest<ContributeResponse>(
    'POST',
    `/groups/${groupId}/rounds/${roundNumber}/contribute`,
    { idempotencyKey }
  );
}

export function getGroupActivityApi(
  groupId: string,
  cursor?: string | null,
  limit?: number
): Promise<Paginated<Activity>> {
  return apiRequest<Paginated<Activity>>('GET', `/groups/${groupId}/activity`, {
    query: { cursor: cursor ?? undefined, limit },
  });
}
