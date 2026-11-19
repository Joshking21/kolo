import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Plus, UserPlus, Users } from 'lucide-react';
import { queryKeys } from '../lib/query-client';
import { getGroupsApi } from '../lib/api/groups';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { GroupCard } from '../features/groups/GroupCard';
import { GroupSummary } from '../lib/api/types';

export function Groups() {
  const [selectedTab, setSelectedTab] = useState('active');

  const {
    data: groupsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.groups(),
    queryFn: getGroupsApi,
  });

  const groups = groupsData?.data ?? [];

  const activeGroups = groups.filter((g) => g.status === 'active');
  const formingGroups = groups.filter((g) => g.status === 'forming');
  const pastGroups = groups.filter(
    (g) => g.status === 'completed' || g.status === 'cancelled'
  );

  const renderGroupGrid = (
    list: GroupSummary[],
    emptyTitle: string,
    emptyDesc: string
  ) => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      );
    }

    if (error) {
      return <ErrorState error={error} onRetry={refetch} />;
    }

    if (list.length === 0) {
      return (
        <EmptyState
          icon={Users}
          title={emptyTitle}
          description={emptyDesc}
          action={
            <div className="flex items-center gap-3">
              <Link to="/app/groups/new">
                <Button size="sm">Create a group</Button>
              </Link>
              <Link to="/app/join">
                <Button variant="secondary" size="sm">
                  Join with code
                </Button>
              </Link>
            </div>
          }
        />
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((group) => (
          <GroupCard key={group.id} group={group} />
        ))}
      </div>
    );
  };

  const tabItems = [
    {
      id: 'active',
      label: 'Active',
      count: activeGroups.length,
      content: renderGroupGrid(
        activeGroups,
        'No active groups',
        'Start a forming group or join one to begin collecting.'
      ),
    },
    {
      id: 'forming',
      label: 'Forming',
      count: formingGroups.length,
      content: renderGroupGrid(
        formingGroups,
        'No forming groups',
        'Create a group or invite friends to join.'
      ),
    },
    {
      id: 'past',
      label: 'Past',
      count: pastGroups.length,
      content: renderGroupGrid(
        pastGroups,
        'No past groups',
        'Completed and cancelled groups will appear here.'
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-[650] font-display text-ink leading-tight">
            Groups
          </h1>
          <p className="text-[14px] text-muted">
            Your savings circles, past and present.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/app/join">
            <Button variant="secondary">
              <UserPlus size={16} className="mr-1.5" />
              Join a group
            </Button>
          </Link>
          <Link to="/app/groups/new">
            <Button variant="primary">
              <Plus size={16} className="mr-1.5" />
              Create a group
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs list */}
      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        items={tabItems}
      />
    </div>
  );
}
