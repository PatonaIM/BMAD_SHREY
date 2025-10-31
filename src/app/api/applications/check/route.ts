import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { jobRepo } from '../../../../data-access/repositories/jobRepo';
import { logger } from '../../../../monitoring/logger';

/**
 * GET /api/applications/check
 * Check if user has applied to specific job(s)
 * Query params: jobId (single) or jobIds (comma-separated list)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    logger.info({
      msg: 'Application check request',
      hasSession: !!session,
      hasUser: !!session?.user,
      email: session?.user?.email,
    });

    if (!session?.user?.email) {
      return NextResponse.json({ applied: false }, { status: 200 });
    }

    // Get user from email
    const user = await findUserByEmail(session.user.email);

    logger.info({
      msg: 'User lookup',
      email: session.user.email,
      userId: user?._id,
    });

    if (!user?._id) {
      return NextResponse.json({ applied: false }, { status: 200 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const jobIds = searchParams.get('jobIds');

    // Single job check
    if (jobId) {
      // Normalize jobId - could be workableId or MongoDB _id
      // Applications are stored with MongoDB _id, so we need to resolve it
      let normalizedJobId = jobId;
      const job = await jobRepo.findById(jobId);
      if (!job) {
        // Try workableId lookup
        const jobByWorkableId = await jobRepo.findByWorkableId(jobId);
        if (jobByWorkableId) {
          normalizedJobId = jobByWorkableId._id;
        }
      } else {
        normalizedJobId = job._id;
      }

      const application = await applicationRepo.findByUserAndJob(
        user._id,
        normalizedJobId
      );

      logger.info({
        msg: 'Application check result',
        userId: user._id,
        requestedJobId: jobId,
        normalizedJobId,
        hasApplication: !!application,
        applicationId: application?._id,
      });

      return NextResponse.json({
        applied: !!application,
        applicationId: application?._id,
        status: application?.status,
      });
    }

    // Multiple jobs check
    if (jobIds) {
      const jobIdArray = jobIds.split(',').map(id => id.trim());
      const applications = await applicationRepo.findByUser(user._id);

      // Normalize all jobIds to MongoDB _id
      const normalizedJobMap = new Map<string, string>(); // requestedId -> mongoId
      for (const jid of jobIdArray) {
        let job = await jobRepo.findById(jid);
        if (!job) {
          job = await jobRepo.findByWorkableId(jid);
        }
        if (job) {
          normalizedJobMap.set(jid, job._id);
        }
      }

      const appliedMap: Record<
        string,
        { applied: boolean; applicationId?: string; status?: string }
      > = {};

      for (const jid of jobIdArray) {
        const normalizedId = normalizedJobMap.get(jid) || jid;
        const app = applications.find(
          (a: { jobId: string }) => a.jobId === normalizedId
        );
        appliedMap[jid] = {
          applied: !!app,
          applicationId: app?._id,
          status: app?.status,
        };
      }

      return NextResponse.json({ applied: appliedMap });
    }

    return NextResponse.json(
      { error: 'Missing jobId or jobIds parameter' },
      { status: 400 }
    );
  } catch (error) {
    logger.error({ msg: 'Failed to check applications', error });
    return NextResponse.json(
      { error: 'Failed to check application status' },
      { status: 500 }
    );
  }
}
