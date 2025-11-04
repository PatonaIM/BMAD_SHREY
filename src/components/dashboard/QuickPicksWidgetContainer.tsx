'use client';

import React, { useEffect, useState } from 'react';
import { QuickPicksWidget } from './QuickPicksWidget';

interface TopMatch {
  _id: string;
  jobTitle: string;
  jobCompany: string;
  matchScore: number;
  appliedAt: Date;
  status: string;
  interviewStatus?: 'not_started' | 'in_progress' | 'completed';
}

export const QuickPicksWidgetContainer: React.FC = () => {
  const [topMatches, setTopMatches] = useState<TopMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopMatches = async () => {
      try {
        const res = await fetch('/api/applications/top-matches?limit=5');
        if (!res.ok) {
          throw new Error('Failed to fetch top matches');
        }
        const data = await res.json();

        // Convert date strings to Date objects
        const matches = data.topMatches.map(
          (match: TopMatch & { appliedAt: string }) => ({
            ...match,
            appliedAt: new Date(match.appliedAt),
          })
        );

        setTopMatches(matches);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTopMatches();
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6">
        <p className="text-sm text-red-700 dark:text-red-300">
          Failed to load top matches: {error}
        </p>
      </div>
    );
  }

  return <QuickPicksWidget topMatches={topMatches} loading={loading} />;
};
