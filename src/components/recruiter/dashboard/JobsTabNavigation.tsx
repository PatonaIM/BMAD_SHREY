'use client';

import React from 'react';
import { cn } from '../../../utils/cn';
import type { TabType } from './RecruiterDashboard';

interface JobsTabNavigationProps {
  activeTab: TabType;
  onTabChange: (_tab: TabType) => void;
}

const tabs: Array<{ id: TabType; label: string; description: string }> = [
  {
    id: 'open',
    label: 'Open Jobs',
    description: 'Active positions',
  },
  {
    id: 'closed',
    label: 'Closed Jobs',
    description: 'Archived positions',
  },
];

/**
 * Tab navigation for switching between Open/Closed jobs
 */
export function JobsTabNavigation({
  activeTab,
  onTabChange,
}: JobsTabNavigationProps): React.ReactElement {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500',
              'transition-colors duration-200',
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            )}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            <span>{tab.label}</span>
            <span className="ml-2 hidden text-xs text-gray-400 md:inline">
              {tab.description}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
