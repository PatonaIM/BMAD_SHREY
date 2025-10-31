import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/options';
import { InterviewInterface } from '../../../components/interview/InterviewInterface';
import { interviewSessionRepo } from '../../../data-access/repositories/interviewSessionRepo';
import { findUserByEmail } from '../../../data-access/repositories/userRepo';

interface InterviewPageProps {
  params: Promise<{
    sessionId: string;
  }>;
}

async function getInterviewSession(sessionId: string, userId: string) {
  const session = await interviewSessionRepo.findBySessionId(sessionId);

  if (!session) {
    return null;
  }

  // Verify ownership
  if (session.userId !== userId) {
    return null;
  }

  return session;
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { sessionId } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await findUserByEmail(session.user.email);
  if (!user) {
    redirect('/login');
  }

  const interviewSession = await getInterviewSession(sessionId, user._id);

  if (!interviewSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Interview Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            This interview session does not exist or you do not have permission
            to access it.
          </p>
          <a href="/dashboard" className="btn-primary px-6 py-3">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Don't allow re-entering completed interviews
  if (interviewSession.status === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="h-16 w-16 text-green-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Interview Already Completed
          </h1>
          <p className="text-gray-600 mb-6">
            This interview has already been completed.
          </p>
          <a href="/dashboard" className="btn-primary px-6 py-3">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <svg
              className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-gray-600">Loading interview...</p>
          </div>
        </div>
      }
    >
      <InterviewInterface
        sessionId={interviewSession.sessionId}
        questions={interviewSession.questions}
      />
    </Suspense>
  );
}

export async function generateMetadata({
  params: _params,
}: InterviewPageProps) {
  return {
    title: 'AI Interview - TeamMatch',
    description: 'Complete your AI-powered interview',
    other: {
      'Permissions-Policy':
        'camera=(self), microphone=(self), display-capture=(self)',
    },
  };
}
