import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { redirect } from 'next/navigation';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';
import { getEnv } from '../../../../config/env';
import Link from 'next/link';
import { DevicePermissionGate } from '../../../../components/interview/v2/DevicePermissionGate';
import { RealtimeSessionBootstrap } from '../../../../components/interview/v2/RealtimeSessionBootstrap';

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

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <Link
        href={`/applications/${applicationId}`}
        className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
      >
        ← Back to Application
      </Link>
      <h1 className="text-3xl font-bold mb-4">AI Interview (V2)</h1>
      <p className="text-sm text-muted-foreground mb-6">
        This is the next-generation real-time AI interview experience. Initial
        scaffolding only.
      </p>

      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-6 bg-white dark:bg-neutral-900 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">Environment & Readiness</h2>
        {/* EP5-S1 Permission & Device Gate */}
        <DevicePermissionGate applicationId={applicationId} className="mb-4" />
        {/* EP5-S2 Realtime session bootstrap (initiates after permissions) */}
        <RealtimeSessionBootstrap applicationId={applicationId} />
        <ul className="list-disc pl-5 text-sm space-y-1">
          <li>Device & permission checks (camera, microphone) – TODO</li>
          <li>
            Network diagnostics (latency, jitter, TURN reachability) – TODO
          </li>
          <li>
            WebRTC peer connection establishment & signaling – IN PROGRESS
          </li>
          <li>Adaptive question stream & timers – TODO</li>
          <li>Canvas composite recording + chunked uploads – TODO</li>
          <li>Realtime scoring & feedback rail – TODO</li>
        </ul>
      </div>

      <div className="mt-8 rounded-lg border border-dashed border-brand-primary/40 p-6 text-sm">
        <p className="font-medium mb-2">Implementation Status</p>
        <p className="text-muted-foreground">
          Scaffold deployed. Subsequent stories will progressively enable
          realtime audio/video, question generation, scoring, and uploads under
          this route.
        </p>
      </div>
    </div>
  );
}
