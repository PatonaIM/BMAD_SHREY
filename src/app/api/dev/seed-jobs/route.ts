import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/options';
import { jobRepo } from '../../../../data-access/repositories/jobRepo';
import { requireRole } from '../../../../auth/roleGuard';

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'DISALLOWED' }, { status: 403 });
  }
  const session = await getServerSession(authOptions);
  try {
    const roles: string[] | undefined = Array.isArray(
      (session?.user as unknown as { roles?: unknown })?.roles
    )
      ? (session?.user as unknown as { roles?: string[] })?.roles
      : undefined;
    requireRole(['ADMIN'], roles);
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }
  // Simple sample jobs
  const samples: Omit<
    import('../../../../shared/types/job').Job,
    '_id' | 'createdAt' | 'updatedAt'
  >[] = [
    {
      workableId: 'sample-frontend',
      workableShortcode: 'SF1',
      lastSyncedAt: new Date(),
      title: 'Frontend Engineer',
      description: 'Build UI components for Teamified platform',
      requirements: 'React, TypeScript',
      location: 'Remote',
      department: 'Engineering',
      employmentType: 'full-time',
      experienceLevel: 'mid',
      salary: { min: 90000, max: 120000, currency: 'USD' },
      company: 'Teamified',
      companyDescription: 'Unified talent platform',
      status: 'active',
      postedAt: new Date(Date.now() - 86400000),
      closedAt: undefined,
      skills: ['React', 'TypeScript'],
      embeddingVersion: 1,
    },
    {
      workableId: 'sample-backend',
      workableShortcode: 'SB1',
      lastSyncedAt: new Date(),
      title: 'Backend Engineer',
      description: 'APIs and services powering matchmaking',
      requirements: 'Node.js, MongoDB',
      location: 'Remote',
      department: 'Engineering',
      employmentType: 'full-time',
      experienceLevel: 'senior',
      salary: { min: 110000, max: 150000, currency: 'USD' },
      company: 'Teamified',
      companyDescription: 'Unified talent platform',
      status: 'active',
      postedAt: new Date(Date.now() - 43200000),
      closedAt: undefined,
      skills: ['Node.js', 'MongoDB'],
      embeddingVersion: 1,
    },
  ];
  let created = 0;
  for (const s of samples) {
    const { created: c } = await jobRepo.upsertByWorkableId(s.workableId, s);
    if (c) created += 1;
  }
  return NextResponse.json({ ok: true, created });
}
