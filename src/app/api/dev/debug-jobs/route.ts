import { NextResponse } from 'next/server';
import { jobRepo } from '../../../../data-access/repositories/jobRepo';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'DISALLOWED' }, { status: 403 });
  }

  try {
    // Get all jobs to see their ID format
    const jobs = await jobRepo.findActive(10);

    const jobInfo = jobs.map(job => ({
      _id: job._id,
      _idType: typeof job._id,
      _idLength: job._id.length,
      workableId: job.workableId,
      title: job.title,
    }));

    return NextResponse.json({
      totalJobs: jobs.length,
      jobs: jobInfo,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch jobs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
