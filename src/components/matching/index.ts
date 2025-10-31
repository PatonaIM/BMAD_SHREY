/**
 * Matching Components & Utilities
 *
 * This module provides UI components and utilities for displaying
 * job-candidate match scores throughout the application.
 *
 * @module matching
 */

// UI Components
export { MatchScoreBadge } from './MatchScoreBadge';
export { ScoreBreakdownModal } from './ScoreBreakdownModal';

// Utilities
export {
  extractedProfileToCandidateProfile,
  isProfileReadyForMatching,
  calculateProfileCompleteness,
  getProfileSearchTerms,
} from './profileTransformer';

// Re-export types for convenience
export type {
  MatchScore,
  MatchFactors,
  JobCandidateMatch,
  CandidateProfile,
} from '../../shared/types/matching';
