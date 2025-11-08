'use client';

import React from 'react';
import { JobRecommendations } from './JobRecommendations';

interface JobRecommendationsContainerProps {
  limit?: number;
  minMatchScore?: number;
}

/**
 * Client-side container for JobRecommendations component
 * This wrapper is needed because the dashboard page is a server component
 * but tRPC queries must run on the client
 */
export const JobRecommendationsContainer: React.FC<
  JobRecommendationsContainerProps
> = props => {
  return <JobRecommendations {...props} />;
};
