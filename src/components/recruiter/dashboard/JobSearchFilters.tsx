'use client';

import React from 'react';
import type { FilterState } from './RecruiterDashboard';

interface JobSearchFiltersProps {
  filters: FilterState;
  onFilterChange: (_updates: Partial<FilterState>) => void;
}

const employmentTypes = [
  { value: '', label: 'All Types' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'internship', label: 'Internship' },
];

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'applications', label: 'Most Applications' },
  { value: 'alphabetical', label: 'Alphabetical' },
];

/**
 * Search and filter controls for job listings
 */
export function JobSearchFilters({
  filters,
  onFilterChange,
}: JobSearchFiltersProps): React.ReactElement {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Keyword Search */}
        <div className="md:col-span-2">
          <label
            htmlFor="keyword"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Search Jobs
          </label>
          <input
            type="text"
            id="keyword"
            name="keyword"
            value={filters.keyword}
            onChange={e => onFilterChange({ keyword: e.target.value })}
            placeholder="Search by title, company, or location..."
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        {/* Employment Type Filter */}
        <div>
          <label
            htmlFor="employmentType"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Employment Type
          </label>
          <select
            id="employmentType"
            name="employmentType"
            value={filters.employmentType || ''}
            onChange={e =>
              onFilterChange({
                employmentType: e.target.value as FilterState['employmentType'],
              })
            }
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            {employmentTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label
            htmlFor="sortBy"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Sort By
          </label>
          <select
            id="sortBy"
            name="sortBy"
            value={filters.sortBy}
            onChange={e =>
              onFilterChange({
                sortBy: e.target.value as FilterState['sortBy'],
              })
            }
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filters Indicator */}
      {(filters.keyword || filters.employmentType) && (
        <div className="mt-3 flex items-center text-sm">
          <span className="text-gray-500 dark:text-gray-400 mr-2">
            Active filters:
          </span>
          {filters.keyword && (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-medium mr-2">
              "{filters.keyword}"
              <button
                onClick={() => onFilterChange({ keyword: '' })}
                className="ml-1 hover:text-indigo-900 dark:hover:text-indigo-100"
                aria-label="Clear keyword filter"
              >
                ×
              </button>
            </span>
          )}
          {filters.employmentType && (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-medium mr-2">
              {
                employmentTypes.find(t => t.value === filters.employmentType)
                  ?.label
              }
              <button
                onClick={() => onFilterChange({ employmentType: undefined })}
                className="ml-1 hover:text-indigo-900 dark:hover:text-indigo-100"
                aria-label="Clear employment type filter"
              >
                ×
              </button>
            </span>
          )}
          <button
            onClick={() =>
              onFilterChange({ keyword: '', employmentType: undefined })
            }
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs font-medium"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
