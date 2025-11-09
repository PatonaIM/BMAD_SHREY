'use client';

import React, { useState } from 'react';
import { JobsTabNavigation } from './JobsTabNavigation';
import { RecruiterJobList } from './RecruiterJobList';
import { JobSearchFilters } from './JobSearchFilters';

export type TabType = 'open' | 'closed';

export interface FilterState {
  keyword: string;
  location: string;
  department?: string;
  employmentType?:
    | 'full-time'
    | 'part-time'
    | 'contract'
    | 'temporary'
    | 'internship';
  sortBy: 'newest' | 'applications' | 'alphabetical';
}

/**
 * Main recruiter dashboard component
 * Manages tabs, filters, and displays job listings
 */
export function RecruiterDashboard(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabType>('open');
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    location: '',
    sortBy: 'newest',
  });

  const handleFilterChange = (updates: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <JobsTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Search and Filters */}
      <JobSearchFilters filters={filters} onFilterChange={handleFilterChange} />

      {/* Job List */}
      <RecruiterJobList activeTab={activeTab} filters={filters} />
    </div>
  );
}
