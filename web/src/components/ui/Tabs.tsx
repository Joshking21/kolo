import React from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  content: React.ReactNode;
}

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (val: string) => void;
  items: TabItem[];
  className?: string;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  items,
  className = '',
}: TabsProps) {
  const defaultVal = defaultValue || items[0]?.id;

  return (
    <RadixTabs.Root
      defaultValue={defaultVal}
      value={value}
      onValueChange={onValueChange}
      className={`flex flex-col w-full ${className}`}
    >
      <RadixTabs.List
        className="flex items-center gap-6 border-b border-border mb-6 overflow-x-auto"
        aria-label="Tabs"
      >
        {items.map((tab) => (
          <RadixTabs.Trigger
            key={tab.id}
            value={tab.id}
            className="pb-3 text-[14px] font-semibold text-muted hover:text-ink transition outline-none relative select-none whitespace-nowrap
              data-[state=active]:text-primary
              data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:h-[2px] data-[state=active]:after:bg-primary
              focus-visible:ring-2 focus-visible:ring-accent focus-visible:rounded-xs"
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="ml-1.5 rounded-full bg-surface-muted px-1.5 py-0.5 text-[11px] font-medium text-muted">
                {tab.count}
              </span>
            )}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>

      {items.map((tab) => (
        <RadixTabs.Content key={tab.id} value={tab.id} className="outline-none">
          {tab.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
