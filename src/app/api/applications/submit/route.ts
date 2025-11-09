import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';
import { findUserByEmail } from '../../../../data-access/repositories/userRepo';
import { jobRepo } from '../../../../data-access/repositories/jobRepo';
import { resumeVectorRepo } from '../../../../data-access/repositories/resumeVectorRepo';
import { recruiterSubscriptionRepo } from '../../../../data-access/repositories/recruiterSubscriptionRepo';
import { getMongoClient } from '../../../../data-access/mongoClient';
import { logger } from '../../../../monitoring/logger';
import { recruiterNotificationService } from '../../../../services/recruiterNotificationService';
import { stageService } from '../../../../services/stageService';

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

    // Calculate match score using vector similarity (same as AI recommendations)
    let matchScore = 0;
    let scoreBreakdown = null;

    try {
      // Get candidate's resume vector
      const resumeVectors = await resumeVectorRepo.getByUserId(userId);

      logger.info({
        msg: 'Resume vector check',
        userId,
        hasVectors: !!resumeVectors && resumeVectors.length > 0,
        vectorCount: resumeVectors?.length || 0,
      });

      if (resumeVectors && resumeVectors.length > 0) {
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

          // First, try to get the job vector directly
          const jobVector = await jobVectors.findOne({
            jobId: job._id.toString(),
          });

          if (!jobVector) {
            logger.warn({
              msg: 'No job vector found',
              jobId: job._id.toString(),
            });
          } else if (candidateVector.embeddings) {
            // Calculate similarity using vector search without filter
            const pipeline = [
              {
                $vectorSearch: {
                  index: 'job_vector_index',
                  path: 'embedding',
                  queryVector: candidateVector.embeddings,
                  numCandidates: 100,
                  limit: 50, // Get more results to find our specific job
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
                  jobId: job._id.toString(),
                },
              },
              {
                $limit: 1,
              },
            ];

            const results = (await jobVectors
              .aggregate(pipeline)
              .toArray()) as {
              vectorScore?: number;
            }[];

            logger.info({
              msg: 'Vector search results',
              jobId: job._id.toString(),
              resultsCount: results.length,
              hasScore: !!results?.[0]?.vectorScore,
            });

            if (results?.[0]?.vectorScore) {
              const vectorScore = results[0].vectorScore;
              matchScore = Math.round(vectorScore * 1000) / 10; // Convert to percentage with 1 decimal
              scoreBreakdown = {
                skills: 0, // Not calculated separately in vector matching
                experience: 0,
                semantic: matchScore, // All score comes from vector similarity
                other: 0,
              };

              // Store the match score in the application immediately
              const updateResult = await applicationRepo.updateMatchScore(
                application._id,
                matchScore,
                {
                  semanticSimilarity: matchScore,
                  skillsAlignment: 0,
                  experienceLevel: 0,
                  otherFactors: 0,
                }
              );

              logger.info({
                msg: 'Vector-based match score calculated and stored',
                userId,
                jobId: job._id.toString(),
                applicationId: application._id,
                matchScore,
                updateResult: {
                  acknowledged: updateResult.acknowledged,
                  matchedCount: updateResult.matchedCount,
                  modifiedCount: updateResult.modifiedCount,
                },
              });

              // Verify the update worked
              if (updateResult.matchedCount === 0) {
                logger.error({
                  msg: 'Failed to match application document for score update',
                  applicationId: application._id,
                });
              } else {
                // Update local application object with the new scores
                application.matchScore = matchScore;
                application.scoreBreakdown = {
                  semanticSimilarity: matchScore,
                  skillsAlignment: 0,
                  experienceLevel: 0,
                  otherFactors: 0,
                };
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error({
        msg: 'Failed to calculate vector-based match score',
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        jobId: job._id.toString(),
      });
      // Continue without score - not critical for application submission
    }

    // Create initial stages for the application (after match score is calculated)
    try {
      // 1. Submit Application stage (completed immediately)
      await stageService.createStage(
        application._id.toString(),
        {
          type: 'submit_application',
          status: 'completed',
          visibleToCandidate: true,
          data: {
            type: 'submit_application',
            submittedAt: new Date(),
            resumeUrl: resumeVersionId
              ? `/resume/${resumeVersionId}`
              : undefined,
          },
        },
        userId
      );

      // 2. AI Interview stage (awaiting candidate)
      await stageService.createStage(
        application._id.toString(),
        {
          type: 'ai_interview',
          status: 'awaiting_candidate',
          visibleToCandidate: true,
          data: {
            type: 'ai_interview',
          },
        },
        userId
      );

      logger.info({
        msg: 'Initial stages created after match score calculation',
        applicationId: application._id,
        matchScore,
        stages: ['submit_application', 'ai_interview'],
      });
    } catch (stageError) {
      logger.error({
        msg: 'Failed to create initial stages',
        error:
          stageError instanceof Error ? stageError.message : 'Unknown error',
        applicationId: application._id,
      });
      // Continue - stages can be created later if needed
    }

    // Send notifications to subscribed recruiters
    // Run asynchronously - don't block application submission response
    setImmediate(async () => {
      try {
        const subscriptions =
          await recruiterSubscriptionRepo.findActiveSubscriptionsByJob(job._id);

        if (subscriptions.length > 0) {
          await recruiterNotificationService.notifySubscribedRecruiters(
            subscriptions,
            {
              application: {
                ...application,
                matchScore: matchScore || 0,
              },
              jobTitle: job.title,
              candidateName: candidateEmail.split('@')[0] || 'Candidate', // Use email username as fallback
              candidateEmail,
            }
          );

          logger.info({
            event: 'recruiter_notifications_sent',
            applicationId: application._id,
            jobId: job._id,
            subscriberCount: subscriptions.length,
          });
        } else {
          logger.info({
            event: 'no_subscribers_for_job',
            jobId: job._id,
          });
        }
      } catch (notificationError) {
        // Log but don't fail the application submission
        logger.error({
          event: 'notification_error',
          error:
            notificationError instanceof Error
              ? notificationError.message
              : 'Unknown error',
          applicationId: application._id,
          jobId: job._id,
        });
      }
    });

    return NextResponse.json(
      {
        success: true,
        applicationId: application._id,
        matchScore,
        scoreBreakdown,
        jobTitle: job.title,
        jobCompany: job.company,
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
