// Profile Editing & Versioning Types
// These types extend the extracted profile structure with user-managed metadata,
// version snapshots, diff modeling, and completeness scoring representation.
// They will be used by the profile editing service, scoring utility, and API routes.
import type { ExtractedProfile } from './profile';

// EditableProfile is the canonical shape exposed to the UI editor. It merges
// AI-extracted data with user overrides and additional manual fields.
export interface EditableProfile extends ExtractedProfile {
  // User ID (from MongoDB document)
  userId?: string;
  // Resume version this profile was extracted from
  resumeVersionId?: string;
  // User-provided summary override (if they tweak AI summary)
  summaryOverride?: string;
  // Free-form bio / about section distinct from summary
  about?: string;
  // Visibility / privacy controls
  isPrivate?: boolean;
  // User managed tags (interests, domains, certifications not parsed yet)
  tags?: string[];
  // Last manual edit timestamp
  lastEditedAt?: string;
  // Completeness cached (can be stale; recalculated server-side)
  cachedCompleteness?: CompletenessScore;
}

// Snapshot of a profile at a point in time for version history & restore.
export interface ProfileVersion {
  id: string; // Unique version id (e.g., ULID)
  userId: string;
  createdAt: string;
  source: 'system' | 'auto-save' | 'manual' | 'restore';
  // Baseline data snapshot
  profile: EditableProfile;
  // Diff metadata relative to previous version (optional lazy-computed)
  diff?: ProfileDiff;
  completeness: CompletenessScore; // Score at time of snapshot
  message?: string; // Optional user-entered change note
}

// Atomic change operation for diff representation.
export interface ProfileFieldChange<T = unknown> {
  field: string; // dot-path (e.g., skills[2].proficiency)
  before: T | undefined;
  after: T | undefined;
  changeType: 'added' | 'removed' | 'modified';
  significance: 'minor' | 'moderate' | 'major';
}

export interface ProfileDiff {
  versionId: string;
  userId: string;
  generatedAt: string;
  changes: ProfileFieldChange[];
  summary: string; // Human readable summary of main changes
  impactEstimate: {
    semantics: number; // 0-1 estimated impact on semantic content (affects matching/vectorization)
    skills: number; // 0-1 impact on skills set
    experience: number; // 0-1 impact on experience timeline
  };
  requiresRevectorization: boolean; // Derived flag using impact thresholds
}

// Completeness scoring breakdown - each major section weighed.
export interface CompletenessScoreSectionBreakdown {
  summary: number; // Summary presence & length quality
  skills: number; // Skill count, diversity, proficiency coverage
  experience: number; // Experience entries with dates & descriptions
  education: number; // Education entries coverage
  meta: number; // About section, privacy preferences
}

export interface CompletenessScore {
  score: number; // 0-100 aggregate
  breakdown: CompletenessScoreSectionBreakdown;
  lastComputedAt: string;
  // Optional qualitative band for UI (e.g., "poor", "fair", "good", "excellent")
  band: 'poor' | 'fair' | 'good' | 'excellent';
  recommendations: string[]; // Actionable improvement tips
}

// Result shape for diff computation utility
export interface ComputeDiffOptions {
  previous: EditableProfile | null;
  current: EditableProfile;
  userId: string;
  versionId: string;
}

// Utility thresholds for deciding significance & revectorization needs
export interface DiffImpactThresholds {
  semanticChangeThreshold: number; // e.g., 0.3
  skillsChangeThreshold: number; // e.g., 0.2
  experienceChangeThreshold: number; // e.g., 0.25
}

// Public interface for version repository filtering
export interface ListProfileVersionsQuery {
  userId: string;
  limit?: number;
  beforeId?: string; // For pagination (fetch versions older than beforeId)
}

// Auto-save payload (lightweight) to reduce network churn
export interface AutoSavePayload {
  summary?: string;
  about?: string;
  isPrivate?: boolean;
  tags?: string[];
  // Allow editing structured data
  skills?: ExtractedProfile['skills'];
  experience?: ExtractedProfile['experience'];
  education?: ExtractedProfile['education'];
}

// Editor status response shape for UI live updates
export interface EditorStatusResponse {
  autoSaveEnabled: boolean;
  lastAutoSaveAt?: string;
  pendingChanges: number;
  completeness?: CompletenessScore;
}

// Change application request shape
export interface ApplyProfileChangesRequest {
  edits: AutoSavePayload; // For now simple form partial
  message?: string; // Optional user comment
  createVersion?: boolean; // Force version snapshot
}

// Service contract summary (informational; not used directly yet)
export interface ProfileEditingServiceContract {
  applyEdits(_req: ApplyProfileChangesRequest): Promise<ProfileVersion>;
  computeDiff(_opts: ComputeDiffOptions): Promise<ProfileDiff>;
  computeCompleteness(_profile: EditableProfile): Promise<CompletenessScore>;
  listVersions(_query: ListProfileVersionsQuery): Promise<ProfileVersion[]>;
  restoreVersion(_userId: string, _versionId: string): Promise<ProfileVersion>;
}
