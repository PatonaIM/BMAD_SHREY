import type { ExtractedProfile } from '../../shared/types/profile';
import type { CandidateProfile } from '../../shared/types/matching';

/**
 * Transforms an ExtractedProfile from resume extraction into a CandidateProfile
 * format that can be used with the job matching service.
 *
 * @param userId - The user ID who owns this profile
 * @param extracted - The extracted profile data from resume parsing
 * @param vector - Optional semantic vector embeddings for the profile
 * @param preferences - Optional user preferences for job matching
 * @returns A CandidateProfile ready for matching calculations
 *
 * @example
 * ```typescript
 * const candidateProfile = extractedProfileToCandidateProfile(
 *   'user-123',
 *   extractedData,
 *   vectorEmbeddings
 * );
 * const match = await matchingService.calculateMatch(job, candidateProfile);
 * ```
 */
export function extractedProfileToCandidateProfile(
  userId: string,
  extracted: ExtractedProfile,
  vector?: number[],
  preferences?: CandidateProfile['preferences']
): CandidateProfile {
  return {
    userId,
    summary: extracted.summary,

    // Transform skills: ExtractedSkill[] -> CandidateProfile skills format
    skills: extracted.skills.map(skill => ({
      name: skill.name,
      category: skill.category,
      proficiency: skill.proficiency,
      yearsOfExperience: skill.yearsOfExperience,
    })),

    // Transform experience: Keep most fields, remove achievements not in CandidateProfile
    experience: extracted.experience.map(exp => ({
      company: exp.company,
      position: exp.position,
      startDate: exp.startDate,
      endDate: exp.endDate,
      isCurrent: exp.isCurrent,
      description: exp.description,
      skills: exp.skills,
      location: exp.location,
    })),

    // Transform education: Keep only relevant fields for matching
    education: extracted.education.map(edu => ({
      institution: edu.institution,
      degree: edu.degree,
      fieldOfStudy: edu.fieldOfStudy,
      startDate: edu.startDate,
      endDate: edu.endDate,
    })),

    // Include preferences if provided
    preferences,

    // Include vector embeddings if available
    vector,
  };
}

/**
 * Type guard to check if an extracted profile is ready for matching.
 * Validates that required fields are populated and extraction is complete.
 *
 * @param extracted - The extracted profile to validate
 * @returns True if the profile is ready for matching
 *
 * @example
 * ```typescript
 * if (isProfileReadyForMatching(extractedProfile)) {
 *   const candidate = extractedProfileToCandidateProfile(userId, extractedProfile);
 *   // Proceed with matching
 * } else {
 *   console.error('Profile not ready:', extractedProfile.extractionStatus);
 * }
 * ```
 */
export function isProfileReadyForMatching(
  extracted: ExtractedProfile
): boolean {
  // Check extraction completed successfully
  if (extracted.extractionStatus !== 'completed') {
    return false;
  }

  // Check for extraction errors
  if (extracted.extractionError) {
    return false;
  }

  // Validate minimum data requirements for meaningful matching
  const hasSkills = extracted.skills && extracted.skills.length > 0;
  const hasExperience = extracted.experience && extracted.experience.length > 0;

  // At minimum, need skills OR experience for matching
  return hasSkills || hasExperience;
}

/**
 * Calculates a profile completeness score (0-100) to help users understand
 * how complete their profile is for optimal matching.
 *
 * @param extracted - The extracted profile to score
 * @returns A score from 0-100 indicating profile completeness
 *
 * @example
 * ```typescript
 * const score = calculateProfileCompleteness(extractedProfile);
 * if (score < 70) {
 *   showNotification('Add more skills and experience for better matches!');
 * }
 * ```
 */
export function calculateProfileCompleteness(
  extracted: ExtractedProfile
): number {
  let score = 0;
  const weights = {
    summary: 15,
    skills: 30,
    experience: 35,
    education: 20,
  };

  // Summary exists (15 points)
  if (extracted.summary && extracted.summary.length > 20) {
    score += weights.summary;
  } else if (extracted.summary) {
    score += weights.summary * 0.5; // Partial credit for short summary
  }

  // Skills completeness (30 points)
  if (extracted.skills.length >= 5) {
    score += weights.skills;
  } else if (extracted.skills.length > 0) {
    score += weights.skills * (extracted.skills.length / 5);
  }

  // Check skill proficiency levels for bonus
  const skillsWithProficiency = extracted.skills.filter(
    s => s.proficiency
  ).length;
  if (skillsWithProficiency >= extracted.skills.length * 0.7) {
    score += 5; // Bonus for proficiency levels
  }

  // Experience completeness (35 points)
  if (extracted.experience.length >= 3) {
    score += weights.experience;
  } else if (extracted.experience.length > 0) {
    score += weights.experience * (extracted.experience.length / 3);
  }

  // Check for detailed experience entries
  const detailedExperience = extracted.experience.filter(
    exp => exp.description && exp.description.length > 50
  ).length;
  if (detailedExperience >= extracted.experience.length * 0.5) {
    score += 5; // Bonus for detailed descriptions
  }

  // Education completeness (20 points)
  if (extracted.education.length >= 1) {
    score += weights.education;
  }

  // Cap at 100
  return Math.min(Math.round(score), 100);
}

/**
 * Extracts key search terms from a profile for quick filtering/searching.
 * Useful for search functionality before running expensive matching calculations.
 *
 * @param extracted - The extracted profile
 * @returns Array of searchable terms (skills, companies, degrees)
 *
 * @example
 * ```typescript
 * const terms = getProfileSearchTerms(extractedProfile);
 * // ['React', 'TypeScript', 'Google', 'Stanford', 'Computer Science']
 * ```
 */
export function getProfileSearchTerms(extracted: ExtractedProfile): string[] {
  const terms: Set<string> = new Set();

  // Add all skill names
  extracted.skills.forEach(skill => {
    terms.add(skill.name.toLowerCase());
  });

  // Add company names
  extracted.experience.forEach(exp => {
    terms.add(exp.company.toLowerCase());
    terms.add(exp.position.toLowerCase());
  });

  // Add education institutions and fields
  extracted.education.forEach(edu => {
    terms.add(edu.institution.toLowerCase());
    if (edu.degree) terms.add(edu.degree.toLowerCase());
    if (edu.fieldOfStudy) terms.add(edu.fieldOfStudy.toLowerCase());
  });

  return Array.from(terms);
}
