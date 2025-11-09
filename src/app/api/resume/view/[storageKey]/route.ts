import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../auth/options';
import { getResume } from '../../../../../data-access/repositories/resumeRepo';
import { findUserByEmail } from '../../../../../data-access/repositories/userRepo';
import { getResumeStorageAsync } from '../../../../../services/storage/resumeStorage';

interface PageProps {
  params: Promise<{ storageKey: string }>;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
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

    // Get storage instance (will use Azure or local based on configuration)
    const storage = await getResumeStorageAsync();

    // Get file from storage (works with both Azure and local storage)
    const fileBuffer = await storage.get(decodedStorageKey);

    // Return file with appropriate headers for inline viewing
    const response = new NextResponse(new Uint8Array(fileBuffer));
    response.headers.set('Content-Type', resumeVersion.mimeType);
    response.headers.set('Content-Length', fileBuffer.length.toString());

    // For PDFs, use inline to display in browser
    if (resumeVersion.mimeType === 'application/pdf') {
      response.headers.set('Content-Disposition', 'inline');
      // Allow PDF to be embedded in iframe
      response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    } else {
      response.headers.set(
        'Content-Disposition',
        `inline; filename="${resumeVersion.fileName}"`
      );
    }

    // Security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');

    // CORS headers to allow iframe embedding
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

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
