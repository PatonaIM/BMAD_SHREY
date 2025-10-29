import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { applicationRepo } from '../../../../data-access/repositories/applicationRepo';
import { jobRepo } from '../../../../data-access/repositories/jobRepo';

interface RouteContext {
  params: { id: string };
}

export async function POST(req: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const job =
    (await jobRepo.findByWorkableId(params.id)) ||
    (await jobRepo.findById(params.id));
  if (!job) {
    return NextResponse.json({ error: 'JOB_NOT_FOUND' }, { status: 404 });
  }
  const existing = await applicationRepo.findByUserAndJob(
    session.user.id,
    job._id
  );
  if (existing) {
    return NextResponse.json(
      { error: 'ALREADY_APPLIED', applicationId: existing._id },
      { status: 409 }
    );
  }
  const form = await req.formData();
  const coverLetter = form.get('coverLetter')?.toString();
  const resumeUrl = form.get('resumeUrl')?.toString();
  const application = await applicationRepo.create({
    userId: session.user.id,
    jobId: job._id,
    coverLetter,
    resumeUrl,
  });
  return NextResponse.json(
    { ok: true, applicationId: application._id },
    { status: 201 }
  );
}
