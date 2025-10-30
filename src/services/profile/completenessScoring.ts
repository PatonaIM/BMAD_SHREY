/* eslint-disable */
import type {
  EditableProfile,
  CompletenessScore,
  CompletenessScoreSectionBreakdown,
} from '../../shared/types/profileEditing';
import { ok, err, type Result } from '../../shared/result';

// Weight configuration (sum to 1)
// Projects removed - weight redistributed to other sections
const SECTION_WEIGHTS: Record<keyof CompletenessScoreSectionBreakdown, number> =
  {
    summary: 0.2, // was 0.18, +0.02
    skills: 0.28, // was 0.26, +0.02
    experience: 0.28, // was 0.26, +0.02
    education: 0.16, // was 0.14, +0.02
    meta: 0.08, // unchanged
  };

// Simple band thresholds
function bandFor(score: number): CompletenessScore['band'] {
  if (score < 40) return 'poor';
  if (score < 65) return 'fair';
  if (score < 85) return 'good';
  return 'excellent';
}

export function computeCompleteness(
  profile: EditableProfile
): Result<CompletenessScore> {
  try {
    const breakdown: CompletenessScoreSectionBreakdown = {
      summary: scoreSummary(profile),
      skills: scoreSkills(profile),
      experience: scoreExperience(profile),
      education: scoreEducation(profile),
      meta: scoreMeta(profile),
    };
    const weighted = (
      Object.keys(breakdown) as (keyof CompletenessScoreSectionBreakdown)[]
    ).reduce(
      (acc, key) => acc + breakdown[key] * SECTION_WEIGHTS[key] * 100,
      0
    );
    const score = Math.round(Math.min(100, weighted));
    const recommendations = generateRecommendations(profile, breakdown);
    const result: CompletenessScore = {
      score,
      breakdown,
      band: bandFor(score),
      recommendations,
      lastComputedAt: new Date().toISOString(),
    };
    return ok(result);
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : 'Unknown completeness error';
    return err('COMPUTE_FAILED', message);
  }
}

function ratio(actual: number, target: number): number {
  if (target <= 0) return 1;
  return Math.min(1, actual / target);
}

function scoreSummary(p: EditableProfile): number {
  const text = p.summaryOverride || p.summary || '';
  if (!text.trim()) return 0;
  const lengthScore = ratio(text.length, 400); // 400 chars ideal target
  const richnessScore = Math.min(1, (text.split(/\s+/).length || 0) / 80); // 80 words target
  return lengthScore * 0.5 + richnessScore * 0.5;
}

function scoreSkills(p: EditableProfile): number {
  const skills = p.skills || [];
  if (!skills.length) return 0;
  const countScore = ratio(skills.length, 25); // 25 distinct skills ideal
  const proficiencyCoverage = (() => {
    const profs = skills.map(s => proficiencyToNumeric(s.proficiency));
    if (!profs.length) return 0;
    const sum = profs.reduce((a, b) => a + b, 0);
    const avg = sum / profs.length; // 0-10 scale
    return Math.min(1, avg / 7); // average proficiency target 7
  })();
  const categoryDiversity = (() => {
    const categories = new Set(skills.map(s => s.category).filter(Boolean));
    return ratio(categories.size, 6); // 6 categories ideal diversity
  })();
  return (
    countScore * 0.4 + proficiencyCoverage * 0.35 + categoryDiversity * 0.25
  );
}

function scoreExperience(p: EditableProfile): number {
  const exp = p.experience || [];
  if (!exp.length) return 0;
  const countScore = ratio(exp.length, 8); // 8 roles ideal historical breadth
  const descriptionQuality = (() => {
    const withDesc = exp.filter(
      e => e.description && e.description.length > 40
    ).length;
    return ratio(withDesc, exp.length); // proportion with meaningful description
  })();
  const recencyBoost = (() => {
    // If recent role within last 9 months present boost
    const now = Date.now();
    const nineMonthsMs = 1000 * 60 * 60 * 24 * 30 * 9;
    const recent = exp.some(e => {
      if (!e.endDate) return true; // current role
      const end = new Date(e.endDate).getTime();
      return now - end < nineMonthsMs;
    });
    return recent ? 1 : 0.6;
  })();
  return countScore * 0.4 + descriptionQuality * 0.4 + recencyBoost * 0.2;
}

function scoreEducation(p: EditableProfile): number {
  const edu = p.education || [];
  if (!edu.length) return 0;
  const countScore = ratio(edu.length, 4); // 4 entries (degrees/certs) target
  const degreeDepth = (() => {
    const hasAdvanced = edu.some(e =>
      /master|phd|doctor|postgrad/i.test(
        (e.degree || '') + ' ' + (e.fieldOfStudy || '')
      )
    );
    return hasAdvanced ? 1 : 0.6;
  })();
  return countScore * 0.6 + degreeDepth * 0.4;
}

function scoreMeta(p: EditableProfile): number {
  // Meta section scores profile metadata and additional information:
  // - About field: 40% if more than 60 characters (personal statement)
  // - Tags: 30% if 5 or more tags present (interests, domains, certifications)
  // - Privacy decision: 15% if isPrivate is explicitly set (user engagement)
  // - Cached completeness: 15% if previous scoring exists (profile maturity)
  let score = 0;
  if (p.about && p.about.length > 60) score += 0.4;
  if (p.tags && p.tags.length >= 5) score += 0.3;
  if (typeof p.isPrivate === 'boolean') score += 0.15; // explicit privacy decision
  if (p.cachedCompleteness) score += 0.15; // has previous scoring metadata
  return Math.min(1, score);
}

function generateRecommendations(
  p: EditableProfile,
  breakdown: CompletenessScoreSectionBreakdown
): string[] {
  const recs: string[] = [];
  if (breakdown.summary < 0.6)
    recs.push('Improve summary with specific achievements and keywords.');
  if ((p.skills || []).length < 15)
    recs.push('Add more relevant skills to showcase breadth.');
  if (breakdown.skills < 0.6)
    recs.push('Enhance skill proficiency details and diversify categories.');
  if ((p.experience || []).length < 4)
    recs.push('Add more past roles or internships for depth.');
  if (breakdown.experience < 0.6)
    recs.push('Expand experience descriptions with impact metrics.');
  if ((p.education || []).length === 0)
    recs.push('Add education history to strengthen credibility.');
  if (breakdown.education < 0.5)
    recs.push('List certifications or advanced coursework.');
  if (!(p.tags && p.tags.length))
    recs.push('Add tags to improve discoverability and personalization.');
  if (!p.about)
    recs.push('Write an “About” section to convey personality and goals.');
  return recs;
}

function proficiencyToNumeric(p?: string): number {
  switch (p) {
    case 'beginner':
      return 2;
    case 'intermediate':
      return 5;
    case 'advanced':
      return 8;
    case 'expert':
      return 10;
    default:
      return 0;
  }
}
