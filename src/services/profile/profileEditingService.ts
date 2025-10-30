import { ok, err, type Result } from '../../shared/result';
import type {
  EditableProfile,
  ProfileVersion,
  ProfileDiff,
  ProfileFieldChange,
  ComputeDiffOptions,
  DiffImpactThresholds,
  ApplyProfileChangesRequest,
} from '../../shared/types/profileEditing';
import { computeCompleteness } from './completenessScoring';
import {
  insertProfileVersion,
  updateProfileVersionDiff,
  listProfileVersions,
  getProfileVersion,
  enforceVersionRetention,
} from '../../data-access/repositories/profileVersionRepo';
import {
  getExtractedProfile,
  upsertExtractedProfile,
} from '../../data-access/repositories/extractedProfileRepo';
import { v4 as uuid } from 'uuid';

// Default thresholds for impact determination
const DEFAULT_THRESHOLDS: DiffImpactThresholds = {
  semanticChangeThreshold: 0.3,
  skillsChangeThreshold: 0.2,
  experienceChangeThreshold: 0.25,
};

// Public API surface
export class ProfileEditingService {
  constructor(private readonly _userId: string) {}

  async applyEdits(
    request: ApplyProfileChangesRequest
  ): Promise<Result<ProfileVersion>> {
    try {
      const base = await getExtractedProfile(this._userId);
      if (!base)
        return err('BASE_NOT_FOUND', 'Base extracted profile not found');

      const editable: EditableProfile = {
        ...base,
        summaryOverride: request.edits.summary ?? base.summary,
        about: request.edits.about ?? undefined,
        isPrivate: request.edits.isPrivate ?? false,
        tags: request.edits.tags ?? [],
        lastEditedAt: new Date().toISOString(),
      };

      // Persist minimal fields back to extracted profile collection (extended metadata not strictly part of original schema - stored alongside)
      await upsertExtractedProfile(this._userId, base.resumeVersionId, {
        ...base,
        summary: editable.summaryOverride || editable.summary,
        skills: base.skills,
        experience: base.experience,
        education: base.education,
        extractedAt: base.extractedAt,
        extractionStatus: base.extractionStatus,
        extractionError: base.extractionError,
        costEstimate: base.costEstimate,
      });

      const completenessResult = computeCompleteness(editable);
      if (!completenessResult.ok)
        return err('COMPLETENESS_FAILED', completenessResult.error.message);

      const versionId = uuid();
      const completeness = completenessResult.value;
      const version: ProfileVersion = {
        id: versionId,
        userId: this._userId,
        createdAt: new Date().toISOString(),
        source: request.createVersion ? 'manual' : 'auto-save',
        profile: { ...editable, cachedCompleteness: completeness },
        completeness,
        message: request.message,
      };
      const inserted = await insertProfileVersion(version);
      if (!inserted.ok)
        return err('VERSION_INSERT_FAILED', inserted.error.message);

      // retention
      await enforceVersionRetention(this._userId);
      return ok(version);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : 'Unknown apply edits error';
      return err('APPLY_FAILED', message);
    }
  }

  async restoreVersion(versionId: string): Promise<Result<ProfileVersion>> {
    const versionResult = await getProfileVersion(this._userId, versionId);
    if (!versionResult.ok)
      return err('VERSION_NOT_FOUND', versionResult.error.message);
    const version = versionResult.value;
    // Write restored snapshot as new version with source restore
    const restoredVersion: ProfileVersion = {
      ...version,
      id: uuid(),
      createdAt: new Date().toISOString(),
      source: 'restore',
      message: `Restored from version ${version.id}`,
    };
    const inserted = await insertProfileVersion(restoredVersion);
    if (!inserted.ok)
      return err('RESTORE_INSERT_FAILED', inserted.error.message);
    await enforceVersionRetention(this._userId);
    return ok(restoredVersion);
  }

  async diff(options: ComputeDiffOptions): Promise<Result<ProfileDiff>> {
    try {
      const thresholds = DEFAULT_THRESHOLDS; // could be env or dynamic later
      const { previous, current, userId, versionId } = options;
      const changes: ProfileFieldChange[] = [];

      if (!previous) {
        // all fields considered added
        Object.entries(current).forEach(([key, value]) => {
          if (['cachedCompleteness', 'lastEditedAt'].includes(key)) return;
          changes.push({
            field: key,
            before: undefined,
            after: value,
            changeType: 'added',
            significance: 'major',
          });
        });
      } else {
        // shallow compare for main scalar fields
        const scalarFields = [
          'summary',
          'summaryOverride',
          'about',
          'isPrivate',
          'tags',
        ];
        scalarFields.forEach(f => {
          const prevVal = (previous as unknown as Record<string, unknown>)[f];
          const currVal = (current as unknown as Record<string, unknown>)[f];
          if (prevVal !== currVal) {
            changes.push({
              field: f,
              before: prevVal,
              after: currVal,
              changeType:
                prevVal === undefined
                  ? 'added'
                  : currVal === undefined
                    ? 'removed'
                    : 'modified',
              significance: 'minor',
            });
          }
        });
        // array fields: skills, experience, education length diff & hash
        arrayDiff('skills', previous.skills, current.skills, changes);
        arrayDiff(
          'experience',
          previous.experience,
          current.experience,
          changes
        );
        arrayDiff('education', previous.education, current.education, changes);
      }

      // impact estimation (simple proportional heuristics)
      const impact = estimateImpact(previous, current);
      const requiresRevectorization =
        impact.semantics >= thresholds.semanticChangeThreshold ||
        impact.skills >= thresholds.skillsChangeThreshold ||
        impact.experience >= thresholds.experienceChangeThreshold;

      const diff: ProfileDiff = {
        versionId,
        userId,
        generatedAt: new Date().toISOString(),
        changes,
        summary: summarizeChanges(changes),
        impactEstimate: impact,
        requiresRevectorization,
      };

      // optionally store diff on version (best-effort)
      void updateProfileVersionDiff(userId, versionId, diff);
      return ok(diff);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown diff error';
      return err('DIFF_FAILED', message);
    }
  }

  async list(limit = 25): Promise<Result<ProfileVersion[]>> {
    const res = await listProfileVersions({ userId: this._userId, limit });
    return res;
  }
}

function arrayDiff(
  field: string,
  beforeArr: unknown[] = [],
  afterArr: unknown[] = [],
  changes: ProfileFieldChange[]
) {
  if (!beforeArr.length && !afterArr.length) return;
  if (beforeArr.length !== afterArr.length) {
    changes.push({
      field: `${field}.length`,
      before: beforeArr.length,
      after: afterArr.length,
      changeType:
        beforeArr.length === 0
          ? 'added'
          : afterArr.length === 0
            ? 'removed'
            : 'modified',
      significance: 'moderate',
    });
  }
}

function summarizeChanges(changes: ProfileFieldChange[]): string {
  if (!changes.length) return 'No changes';
  const parts: string[] = [];
  const byType = changes.reduce<Record<string, number>>((acc, c) => {
    acc[c.changeType] = (acc[c.changeType] || 0) + 1;
    return acc;
  }, {});
  parts.push(
    Object.entries(byType)
      .map(([t, n]) => `${n} ${t}`)
      .join(', ')
  );
  return parts.join('; ');
}

function estimateImpact(
  previous: EditableProfile | null,
  current: EditableProfile
): { semantics: number; skills: number; experience: number } {
  if (!previous) {
    return { semantics: 1, skills: 1, experience: 1 };
  }
  const semantics = similarityRatio(
    (previous.summaryOverride || previous.summary || '') +
      (previous.about || ''),
    (current.summaryOverride || current.summary || '') + (current.about || '')
  );
  const skills = listDifferenceRatio(
    previous.skills.map(s => s.name),
    current.skills.map(s => s.name)
  );
  const experience = listDifferenceRatio(
    previous.experience.map(e => e.company + e.position),
    current.experience.map(e => e.company + e.position)
  );
  return { semantics: 1 - semantics, skills, experience };
}

function similarityRatio(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  // simple Jaccard over tokens
  const tokensA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const tokensB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  const intersection = [...tokensA].filter(t => tokensB.has(t)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 1 : intersection / union;
}

function listDifferenceRatio(before: string[], after: string[]): number {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  let changed = 0;
  for (const item of beforeSet) if (!afterSet.has(item)) changed++;
  for (const item of afterSet) if (!beforeSet.has(item)) changed++;
  const total = beforeSet.size + afterSet.size;
  if (total === 0) return 0;
  return changed / total;
}
