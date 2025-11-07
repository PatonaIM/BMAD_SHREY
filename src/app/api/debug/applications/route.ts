import { NextResponse } from 'next/server';
import { getMongoClient } from '@/data-access/mongoClient';
import { ObjectId } from 'mongodb';

const TARGET_JOB_ID = '6901abf11f54928bf9275781';

export async function GET() {
  try {
    const client = await getMongoClient();
    const db = client.db();

    // Check if job exists
    const job = await db
      .collection('jobs')
      .findOne({ _id: new ObjectId(TARGET_JOB_ID) });

    // Get applications for this job
    const applications = await db
      .collection('applications')
      .find({ jobId: new ObjectId(TARGET_JOB_ID) })
      .toArray();

    // Get subscriptions for this job
    const subscriptions = await db
      .collection('recruiterSubscriptions')
      .find({ jobId: new ObjectId(TARGET_JOB_ID) })
      .toArray();

    // Get all subscriptions
    const allSubscriptions = await db
      .collection('recruiterSubscriptions')
      .find({})
      .toArray();

    return NextResponse.json({
      targetJobId: TARGET_JOB_ID,
      job: job
        ? {
            title: job.title,
            company: job.company,
            status: job.status,
          }
        : null,
      applications: {
        count: applications.length,
        items: applications.map(app => ({
          candidateEmail: app.candidateEmail,
          status: app.status,
          matchScore: app.matchScore,
          jobId: app.jobId,
        })),
      },
      subscriptionsForThisJob: {
        count: subscriptions.length,
        items: subscriptions.map(sub => ({
          recruiterId: sub.recruiterId,
          jobId: sub.jobId.toString(),
          isActive: sub.isActive,
          subscribedAt: sub.subscribedAt,
        })),
      },
      allSubscriptions: {
        count: allSubscriptions.length,
        items: allSubscriptions.map(sub => ({
          recruiterId: sub.recruiterId,
          jobId: sub.jobId.toString(),
          isActive: sub.isActive,
        })),
      },
      diagnosis:
        applications.length === 0
          ? 'No applications found for this job'
          : subscriptions.length === 0
            ? 'No recruiter subscriptions found for this job - this is why applications are not showing'
            : 'Both applications and subscriptions exist - applications should appear',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
