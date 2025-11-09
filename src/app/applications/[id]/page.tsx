import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/options';
import { notFound, redirect } from 'next/navigation';
import { applicationRepo } from '../../../data-access/repositories/applicationRepo';
import { jobRepo } from '../../../data-access/repositories/jobRepo';
// import { getResume } from '../../../data-access/repositories/resumeRepo';
import { findUserByEmail } from '../../../data-access/repositories/userRepo';
// import { interviewSessionRepo } from '../../../data-access/repositories/interviewSessionRepo';
import { resumeVectorRepo } from '../../../data-access/repositories/resumeVectorRepo';
import { getMongoClient } from '../../../data-access/mongoClient';
import { logger } from '../../../monitoring/logger';
// import { InterviewLauncher } from '../../../components/interview/InterviewLauncher';
// import { InterviewPlayer } from '../../../components/interview/InterviewPlayer';
// import { ScoreComparisonCard } from '../../../components/application/ScoreComparisonCard';
// import { InterviewCompletionBadge } from '../../../components/application/InterviewCompletionBadge';
// import { AIInterviewCTA } from '../../../components/AIInterviewCTA';
// import { InterviewStatusCard } from '../../../components/InterviewStatusCard';
// import { CandidateScheduling } from '../../../components/candidate/scheduling';
import { ApplicationTimeline } from '../../../components/timeline';
import { CollapsibleApplicationHeader } from '@/components/application/CollapsibleApplicationHeader';
// import { getEnv } from '../../../config/env';

interface PageProps {
  params: Promise<{ id: string }>;
}

// const statusColors: Record<string, string> = {
//   submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
//   ai_interview:
//     'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
//   under_review:
//     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
//   interview_scheduled:
//     'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
//   offer: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
//   rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
// };

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const userSession = session
    ? (session.user as typeof session.user & { id?: string; email?: string })
    : undefined;
  if (!userSession?.email) redirect(`/login?redirect=/applications/${id}`);

  const app = await applicationRepo.findById(id);
  if (!app) return notFound();
  if (app.candidateEmail !== userSession.email) return notFound();
  const job = await jobRepo.findById(app.jobId);

  // Get user ID for fetching profile
  let userId: string = app.userId;
  if (userSession.id) {
    userId = userSession.id;
  } else {
    const user = await findUserByEmail(userSession.email);
    if (user) {
      userId = user._id;
    }
  }

  // Calculate match score if not available
  let matchScore = app.matchScore;
  let scoreBreakdown = app.scoreBreakdown;

  if (!matchScore || !scoreBreakdown) {
    // Use vector-based matching (same as AI recommendations)
    try {
      const resumeVectors = await resumeVectorRepo.getByUserId(userId);

      if (resumeVectors && resumeVectors.length > 0 && job) {
        // Use the most recent resume vector
        const candidateVector = resumeVectors.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];

        if (
          candidateVector?.embeddings &&
          Array.isArray(candidateVector.embeddings) &&
          candidateVector.embeddings.length > 0
        ) {
          // Get job vector and calculate similarity
          const client = await getMongoClient();
          const db = client.db();
          const jobVectors = db.collection('jobVectors');

          const pipeline = [
            {
              $vectorSearch: {
                index: 'job_vector_index',
                path: 'embedding',
                queryVector: candidateVector.embeddings,
                numCandidates: 100,
                limit: 50, // Get more results to filter
              },
            },
            {
              $addFields: {
                vectorScore: { $meta: 'vectorSearchScore' },
              },
            },
            // Filter for our specific job after vector search
            {
              $match: {
                jobId: app.jobId.toString(),
              },
            },
            {
              $limit: 1,
            },
          ];

          const results = (await jobVectors.aggregate(pipeline).toArray()) as {
            vectorScore?: number;
          }[];

          if (results?.[0]?.vectorScore) {
            const vectorScore = results[0].vectorScore;
            matchScore = Math.round(vectorScore * 1000) / 10; // Convert to percentage with 1 decimal
            scoreBreakdown = {
              semanticSimilarity: matchScore,
              skillsAlignment: 0, // Not calculated separately in vector matching
              experienceLevel: 0,
              otherFactors: 0,
            };

            // Update application with calculated score
            try {
              await applicationRepo.updateMatchScore(
                app._id.toString(),
                matchScore,
                scoreBreakdown
              );
            } catch (error) {
              logger.error('Failed to update application with match score', {
                error,
                applicationId: app._id.toString(),
              });
            }
          }
        }
      }
    } catch (error) {
      logger.error('Failed to calculate vector-based match score', {
        error,
        applicationId: app._id.toString(),
      });
    }
  }

  // Fetch resume details if resumeVersionId exists
  // let resumeInfo = null;
  if (app.resumeVersionId) {
    // For OAuth users, we need to get their actual user ID, not from the application
    // let userId: string = app.userId; // Default to app.userId
    // If the user has an ID in session (OAuth), use that instead
    if (userSession.id) {
      // userId = userSession.id;
    } else {
      // For credential users, look up by email to get the correct user ID
      const user = await findUserByEmail(userSession.email);
      if (user) {
        // userId = user._id;
      }
    }

    // const resumeDoc = await getResume(userId);
    // if (resumeDoc) {
    //   resumeInfo = resumeDoc.versions.find(
    //     v => v.versionId === app.resumeVersionId
    //   );
    // }
  }

  // Fetch interview session if exists
  // let interviewSession = null;
  // if (app.interviewSessionId) {
  //   interviewSession = await interviewSessionRepo.findBySessionId(
  //     app.interviewSessionId
  //   );
  // }

  // Feature flag for new interview page (v2)
  // const env = getEnv();
  // const interviewV2Enabled = env.ENABLE_INTERVIEW_V2_PAGE;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 -mx-4 sm:-mx-6 lg:-mx-8 -my-6 relative">
      {/* Collapsible Header - Full Width */}
      <CollapsibleApplicationHeader
        backHref="/dashboard"
        backLabel="Back to Dashboard"
        jobTitle={job?.title || 'Unknown Role'}
        // company={job?.company}
        // jobLink={job ? `/jobs/${job.workableId || job._id}` : undefined}
        status={app.status}
        // statusColors={statusColors}
        matchScore={matchScore ?? undefined}
      />

      {/* Scrollable Timeline Container */}
      <div
        id="timeline-scroll-container"
        className="flex-1 overflow-y-auto scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Timeline - Video and Job Description will be shown inline within timeline stages */}
          <ApplicationTimeline
            applicationId={app._id.toString()}
            jobId={app.jobId.toString()}
            viewAs="candidate"
            applicationData={{
              candidateEmail: app.candidateEmail,
              matchScore: app.matchScore ?? undefined,
              scoreBreakdown: app.scoreBreakdown
                ? {
                    semanticSimilarity: app.scoreBreakdown.semanticSimilarity,
                    skillsAlignment: app.scoreBreakdown.skillsAlignment,
                    experienceLevel: app.scoreBreakdown.experienceLevel,
                    otherFactors: app.scoreBreakdown.otherFactors,
                  }
                : undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}
