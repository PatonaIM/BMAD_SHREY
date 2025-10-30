import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { getResume } from '../../../../data-access/repositories/resumeRepo';
import {
  getExtractedProfile,
  upsertExtractedProfile,
} from '../../../../data-access/repositories/extractedProfileRepo';
import { resumeExtractionService } from '../../../../services/ai/resumeExtraction';
import { logger } from '../../../../monitoring/logger';

interface SessionUser {
  id?: string;
  email?: string;
}

interface SafeSession {
  user: SessionUser;
}

/**
 * POST /api/profile/create-from-resume
 *
 * Creates or updates a user's profile by extracting data from their latest resume.
 * If the profile already exists, it will be regenerated from the current resume version.
 *
 * Request body (optional):
 * {
 *   "resumeVersionId"?: string  // If not provided, uses currentVersionId
 *   "forceRegenerate"?: boolean // If true, regenerates even if profile exists
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "value": {
 *     "userId": string,
 *     "resumeVersionId": string,
 *     "extractionStatus": string,
 *     "skillCount": number,
 *     "experienceCount": number,
 *     "educationCount": number,
 *     "extractedAt": string,
 *     "costEstimate": number
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const session = (await getServerSession(authOptions)) as SafeSession | null;

  if (!session?.user?.email) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { resumeVersionId: requestedVersionId, forceRegenerate = false } =
      body;

    // Get user ID (supports both OAuth and credential users)
    let userId: string;
    if (session.user.id) {
      userId = session.user.id;
    } else {
      const user = await findUserByEmail(session.user.email);
      if (!user) {
        return NextResponse.json(
          { ok: false, error: 'User not found' },
          { status: 404 }
        );
      }
      userId = user._id;
    }

    logger.info({
      event: 'profile_creation_started',
      userId: userId.slice(0, 8),
      email: session.user.email,
      forceRegenerate,
    });

    // Check if profile already exists
    const existingProfile = await getExtractedProfile(userId);
    if (existingProfile && !forceRegenerate) {
      logger.info({
        event: 'profile_already_exists',
        userId: userId.slice(0, 8),
        resumeVersionId: existingProfile.resumeVersionId,
      });

      return NextResponse.json({
        ok: true,
        value: {
          userId,
          resumeVersionId: existingProfile.resumeVersionId,
          extractionStatus: existingProfile.extractionStatus,
          skillCount: existingProfile.skills.length,
          experienceCount: existingProfile.experience.length,
          educationCount: existingProfile.education.length,
          extractedAt: existingProfile.extractedAt,
          costEstimate: existingProfile.costEstimate,
          message:
            'Profile already exists. Use forceRegenerate=true to recreate.',
        },
      });
    }

    // Get user's resume document
    const resumeDoc = await getResume(userId);
    if (!resumeDoc) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No resume found. Please upload a resume first.',
        },
        { status: 404 }
      );
    }

    // Determine which version to use
    const targetVersionId = requestedVersionId || resumeDoc.currentVersionId;
    const resumeVersion = resumeDoc.versions.find(
      v => v.versionId === targetVersionId
    );

    if (!resumeVersion) {
      return NextResponse.json(
        {
          ok: false,
          error: `Resume version ${targetVersionId} not found`,
        },
        { status: 404 }
      );
    }

    logger.info({
      event: 'profile_extraction_starting',
      userId: userId.slice(0, 8),
      resumeVersionId: resumeVersion.versionId,
      fileName: resumeVersion.fileName,
      fileSize: resumeVersion.fileSize,
    });

    // Extract profile from resume using AI
    const extractedProfile = await resumeExtractionService.extractProfile(
      userId,
      resumeVersion.versionId,
      resumeVersion.storageKey
    );

    // Save the extracted profile
    const savedProfile = await upsertExtractedProfile(
      userId,
      resumeVersion.versionId,
      extractedProfile
    );

    const duration = Date.now() - startTime;

    logger.info({
      event: 'profile_creation_completed',
      userId: userId.slice(0, 8),
      resumeVersionId: resumeVersion.versionId,
      status: savedProfile.extractionStatus,
      skillCount: savedProfile.skills.length,
      experienceCount: savedProfile.experience.length,
      educationCount: savedProfile.education.length,
      durationMs: duration,
      costCents: savedProfile.costEstimate,
    });

    return NextResponse.json({
      ok: true,
      value: {
        userId,
        resumeVersionId: savedProfile.resumeVersionId,
        extractionStatus: savedProfile.extractionStatus,
        skillCount: savedProfile.skills.length,
        experienceCount: savedProfile.experience.length,
        educationCount: savedProfile.education.length,
        extractedAt: savedProfile.extractedAt,
        costEstimate: savedProfile.costEstimate,
        summary: savedProfile.summary?.slice(0, 100) + '...',
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error({
      event: 'profile_creation_failed',
      error: (error as Error).message,
      stack: (error as Error).stack,
      durationMs: duration,
    });

    return NextResponse.json(
      {
        ok: false,
        error: `Profile creation failed: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/profile/create-from-resume
 *
 * Checks if a profile exists for the authenticated user.
 *
 * Response:
 * {
 *   "ok": true,
 *   "value": {
 *     "hasProfile": boolean,
 *     "hasResume": boolean,
 *     "profileInfo"?: { ... }
 *   }
 * }
 */
export async function GET(_req: NextRequest) {
  const session = (await getServerSession(authOptions)) as SafeSession | null;

  if (!session?.user?.email) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Get user ID
    let userId: string;
    if (session.user.id) {
      userId = session.user.id;
    } else {
      const user = await findUserByEmail(session.user.email);
      if (!user) {
        return NextResponse.json(
          { ok: false, error: 'User not found' },
          { status: 404 }
        );
      }
      userId = user._id;
    }

    // Check for existing profile and resume
    const profile = await getExtractedProfile(userId);
    const resume = await getResume(userId);

    return NextResponse.json({
      ok: true,
      value: {
        hasProfile: !!profile,
        hasResume: !!resume,
        profileInfo: profile
          ? {
              resumeVersionId: profile.resumeVersionId,
              extractionStatus: profile.extractionStatus,
              skillCount: profile.skills.length,
              experienceCount: profile.experience.length,
              educationCount: profile.education.length,
              extractedAt: profile.extractedAt,
            }
          : null,
        resumeInfo: resume
          ? {
              currentVersionId: resume.currentVersionId,
              versionCount: resume.versions.length,
              latestFileName:
                resume.versions[resume.versions.length - 1]?.fileName,
            }
          : null,
      },
    });
  } catch (error) {
    logger.error({
      event: 'profile_check_failed',
      error: (error as Error).message,
    });

    return NextResponse.json(
      {
        ok: false,
        error: `Profile check failed: ${(error as Error).message}`,
      },
      { status: 500 }
    );
  }
}
