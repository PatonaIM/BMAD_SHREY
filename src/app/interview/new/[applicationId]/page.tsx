import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { redirect } from 'next/navigation';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';
import { getEnv } from '../../../../config/env';
import { ModernInterviewPage } from '../../../../components/interview/v2/ModernInterviewPage';

interface PageProps {
  params: Promise<{ applicationId: string }>;
}

// NOTE: Minimal scaffold for Interview V2 page (EP5-S1 / EP5-S2)
// TODO:
//  - Permissions & device readiness gate
//  - WebRTC signaling handshake & realtime token issuance
//  - Canvas composite setup + media recorder lifecycle
//  - Adaptive question stream UI shell
//  - Chunked recording upload & manifest finalization
//  - Observability metrics hooks
//  - Accessibility semantics & keyboard flows
export default async function InterviewV2Page({ params }: PageProps) {
  const { applicationId } = await params;
  const env = getEnv();
  if (!env.ENABLE_INTERVIEW_V2_PAGE) {
    // Flag disabled: fall back to application detail page
    redirect(`/applications/${applicationId}`);
  }

  const session = await getServerSession(authOptions);
  const userSession = session
    ? (session.user as typeof session.user & { id?: string; email?: string })
    : undefined;
  if (!userSession?.email) {
    redirect(`/login?redirect=/interview/new/${applicationId}`);
  }

  const app = await applicationRepo.findById(applicationId);
  if (!app || app.candidateEmail !== userSession.email) {
    redirect(`/applications/${applicationId}`);
  }

  return <ModernInterviewPage applicationId={applicationId} />;
}
