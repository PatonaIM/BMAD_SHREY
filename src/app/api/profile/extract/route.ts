import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { resumeExtractionService } from '../../../../services/ai/resumeExtraction';
import { upsertExtractedProfile } from '../../../../data-access/repositories/extractedProfileRepo';
import { getResume } from '../../../../data-access/repositories/resumeRepo';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { logger } from '../../../../monitoring/logger';

interface SessionUser {
  id?: string;
  email: string;
  roles?: string[];
}

interface SafeSession {
  user?: SessionUser;
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(
    authOptions
  )) as unknown as SafeSession;

  if (!session?.user?.email) {
    return NextResponse.json(
      { ok: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { resumeVersionId } = await req.json();

    if (!resumeVersionId || typeof resumeVersionId !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'Invalid resumeVersionId' },
        { status: 400 }
      );
    }

    // Get user ID (OAuth vs credential users)
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

    // Get resume document to find the storage key
    const resumeDoc = await getResume(userId);
    if (!resumeDoc) {
      return NextResponse.json(
        { ok: false, error: 'Resume not found' },
        { status: 404 }
      );
    }

    // Find the specific version
    const resumeVersion = resumeDoc.versions.find(
      v => v.versionId === resumeVersionId
    );
    if (!resumeVersion) {
      return NextResponse.json(
        { ok: false, error: 'Resume version not found' },
        { status: 404 }
      );
    }

    logger.info({
      event: 'resume_extraction_api_start',
      userId: userId.slice(0, 8),
      resumeVersionId,
    });

    // Perform AI extraction
    const extractedProfile = await resumeExtractionService.extractProfile(
      userId,
      resumeVersionId,
      resumeVersion.storageKey
    );

    // Store the extracted profile
    const savedProfile = await upsertExtractedProfile(
      userId,
      resumeVersionId,
      extractedProfile
    );

    logger.info({
      event: 'resume_extraction_api_complete',
      userId: userId.slice(0, 8),
      resumeVersionId,
      status: extractedProfile.extractionStatus,
      skillCount: extractedProfile.skills.length,
      experienceCount: extractedProfile.experience.length,
    });

    return NextResponse.json({
      ok: true,
      value: {
        extractionStatus: savedProfile.extractionStatus,
        extractedAt: savedProfile.extractedAt,
        skillCount: savedProfile.skills.length,
        experienceCount: savedProfile.experience.length,
        educationCount: savedProfile.education.length,
        costEstimate: savedProfile.costEstimate,
      },
    });
  } catch (error) {
    logger.error({
      event: 'resume_extraction_api_error',
      error: (error as Error).message,
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'Extraction failed',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
