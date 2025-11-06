import { getMongoClient } from '../../../../data-access/mongoClient';
import { notFound } from 'next/navigation';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';
import { ScoreCard } from '../../../../components/interview/v2/ScoreCard';
import Link from 'next/link';

interface ScorePageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function InterviewScorePage({ params }: ScorePageProps) {
  const { sessionId } = await params;

  const client = await getMongoClient();
  const db = client.db();
  const session = await db
    .collection('interviewSessions')
    .findOne({ sessionId });

  if (!session || session.status !== 'completed') {
    notFound();
  }

  const { finalScore, scoreBreakdown, duration, metadata, applicationId } =
    session;

  // Fetch application to get before/after scores
  const application = await applicationRepo.findById(applicationId);
  const scoreBeforeInterview = application?.scoreBeforeInterview;
  const scoreAfterInterview = application?.scoreAfterInterview;
  const scoreBoost =
    scoreAfterInterview && scoreBeforeInterview
      ? scoreAfterInterview - scoreBeforeInterview
      : undefined;

  // Count questions answered from events
  const questionsAnswered =
    session.events?.filter((e: { type: string }) => e.type === 'question.ready')
      .length ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-neutral-950 dark:to-neutral-900 py-12">
      <div className="max-w-3xl mx-auto px-4">
        <ScoreCard
          score={finalScore ?? 0}
          breakdown={scoreBreakdown}
          duration={duration}
          questionsAnswered={questionsAnswered}
          difficulty={metadata?.difficultyTier ?? 3}
          feedback={session.aiSummary}
          scoreBeforeInterview={scoreBeforeInterview}
          scoreAfterInterview={scoreAfterInterview}
          scoreBoost={scoreBoost}
        />

        {/* Dual Navigation Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={`/applications/${applicationId}`}
            className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Return to Application
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-3 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition font-medium"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Interview Score',
  robots: 'noindex',
};
