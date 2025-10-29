import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../auth/options';
import { getResume } from '../../../../../data-access/repositories/resumeRepo';
import { findUserByEmail } from '../../../../../data-access/repositories/userRepo';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const BASE_DIR = join(process.cwd(), 'data', 'resumes');

interface PageProps {
  params: Promise<{ storageKey: string }>;
}

export async function GET(req: NextRequest, { params }: PageProps) {
  const { storageKey } = await params;
  const session = await getServerSession(authOptions);

  const userEmail = (session?.user as { email?: string })?.email;
  if (!userEmail) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find user by email
    const user = await findUserByEmail(userEmail);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's resume document
    const resumeDoc = await getResume(user._id);
    if (!resumeDoc) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    // Decode the storage key
    const decodedStorageKey = decodeURIComponent(storageKey);
    // Find the resume version with this storage key
    const resumeVersion = resumeDoc.versions.find(
      v => v.storageKey === decodedStorageKey
    );
    if (!resumeVersion) {
      return NextResponse.json(
        { error: 'Resume version not found' },
        { status: 404 }
      );
    }

    // Verify the user owns this resume (extra security check)
    if (resumeDoc._id !== user._id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Construct file path
    const filePath = join(BASE_DIR, decodedStorageKey);
    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found on disk' },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = readFileSync(filePath);
    // Return file with appropriate headers
    const response = new NextResponse(fileBuffer);
    response.headers.set('Content-Type', resumeVersion.mimeType);
    response.headers.set('Content-Length', fileBuffer.length.toString());
    response.headers.set(
      'Content-Disposition',
      `inline; filename="${resumeVersion.fileName}"`
    );
    // Add cache headers for better performance
    response.headers.set('Cache-Control', 'private, max-age=3600');
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to serve file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
