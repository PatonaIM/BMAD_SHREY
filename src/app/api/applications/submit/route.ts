import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { jobRepo } from '../../../../data-access/repositories/jobRepo';

interface SessionUser {
  id: string;
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { jobId, resumeVersionId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Find user by email to get MongoDB _id
    const user = await findUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user._id;
    const candidateEmail = session.user.email;

    // Get job details - try both MongoDB ID and Workable ID
    let job = await jobRepo.findById(jobId);
    if (!job) {
      job = await jobRepo.findByWorkableId(jobId);
    }

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check if already applied - use the found job's MongoDB ID
    const existing = await applicationRepo.findByUserEmailAndJob(
      candidateEmail,
      job._id
    );
    if (existing) {
      return NextResponse.json(
        { error: 'Already applied to this job' },
        { status: 409 }
      );
    }

    // Create application with job details - use the found job's MongoDB ID
    const application = await applicationRepo.create(
      userId,
      job._id, // Use the actual job's MongoDB ID
      candidateEmail,
      job.title,
      job.company,
      resumeVersionId
    );

    return NextResponse.json(
      {
        success: true,
        applicationId: application._id,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to submit application',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
