'use client';
import React from 'react';

interface JobsFiltersProps {
  filters: {
    keyword?: string;
    location?: string;
    experienceLevel?: string;
    employmentType?: string;
    limit: number;
    sort: string;
  };
  experienceLevels: readonly string[];
  employmentTypes: readonly string[];
  pageSizes: readonly number[];
  hasProfile: boolean;
  isAuthenticated: boolean;
}

export function JobsFilters({
  filters,
  experienceLevels,
  employmentTypes,
  pageSizes,
  hasProfile,
  isAuthenticated,
}: JobsFiltersProps): React.ReactElement {
  return (
    <div className="mb-8">
      <form method="get" action="/jobs" className="space-y-4">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="keyword" className="text-xs font-medium">
              Keyword
            </label>
            <input
              id="keyword"
              name="keyword"
              defaultValue={filters.keyword || ''}
              placeholder="e.g. frontend, data"
              className="input"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="location" className="text-xs font-medium">
              Location
            </label>
            <input
              id="location"
              name="location"
              defaultValue={filters.location || ''}
              placeholder="City or Remote"
              className="input"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="experienceLevel" className="text-xs font-medium">
              Experience Level
            </label>
            <select
              id="experienceLevel"
              name="experienceLevel"
              defaultValue={filters.experienceLevel || ''}
              className="input text-sm"
            >
              <option value="">Any</option>
              {experienceLevels.map(lvl => (
                <option key={lvl} value={lvl}>
                  {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="employmentType" className="text-xs font-medium">
              Employment Type
            </label>
            <select
              id="employmentType"
              name="employmentType"
              defaultValue={filters.employmentType || ''}
              className="input text-sm"
            >
              <option value="">Any</option>
              {employmentTypes.map(type => (
                <option key={type} value={type}>
                  {type
                    .split('-')
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex flex-col gap-1 w-32">
            <label htmlFor="limit" className="text-xs font-medium">
              Jobs per page
            </label>
            <select
              id="limit"
              name="limit"
              defaultValue={String(filters.limit)}
              className="input text-sm"
            >
              {pageSizes.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {isAuthenticated && hasProfile && (
            <div className="flex flex-col gap-1 w-40">
              <label htmlFor="sort" className="text-xs font-medium">
                Sort by
              </label>
              <select
                id="sort"
                name="sort"
                defaultValue={filters.sort}
                className="input text-sm"
              >
                <option value="time">Most Recent</option>
                <option value="score">Best Match</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn-primary px-6 py-2 text-sm">
            Apply Filters
          </button>

          <a href="/jobs" className="btn-ghost px-6 py-2 text-sm">
            Reset
          </a>
        </div>
      </form>
    </div>
  );
}
