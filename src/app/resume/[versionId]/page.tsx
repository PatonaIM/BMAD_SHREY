import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/options';
import { notFound, redirect } from 'next/navigation';
import { getResume } from '../../../data-access/repositories/resumeRepo';
import { findUserByEmail } from '../../../data-access/repositories/userRepo';
import { getResumeStorage } from '../../../services/storage/resumeStorage';

interface PageProps {
  params: Promise<{ versionId: string }>;
}

export default async function ResumeViewerPage({ params }: PageProps) {
  const { versionId } = await params;
  const session = await getServerSession(authOptions);
  const userEmail = (session?.user as { email?: string })?.email;
  if (!userEmail) {
    redirect(`/login?redirect=/resume/${versionId}`);
  }

  // Find user by email to get MongoDB user ID
  const user = await findUserByEmail(userEmail);
  if (!user) {
    redirect(`/login?redirect=/resume/${versionId}`);
  }

  // Get resume document
  const resumeDoc = await getResume(user._id);
  if (!resumeDoc) {
    return notFound();
  }

  // Find the specific version
  const resumeVersion = resumeDoc.versions.find(v => v.versionId === versionId);
  if (!resumeVersion) {
    return notFound();
  }

  // Verify ownership - the user should own this resume
  if (resumeDoc._id !== user._id) {
    return notFound();
  }

  const storage = getResumeStorage();
  let resumeUrl: string;
  try {
    resumeUrl = await storage.getViewUrl(resumeVersion.storageKey);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to get resume URL:', error);
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Resume Not Available</h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">
            The resume file could not be loaded at this time.
          </p>
          <button
            onClick={() => window.history.back()}
            className="btn-primary px-4 py-2"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Resume Viewer</h1>
        <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
          <span>
            <strong>File:</strong> {resumeVersion.fileName}
          </span>
          <span>
            <strong>Size:</strong> {(resumeVersion.fileSize / 1024).toFixed(1)}{' '}
            KB
          </span>
          <span>
            <strong>Uploaded:</strong>{' '}
            {new Date(resumeVersion.storedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        {resumeVersion.mimeType === 'application/pdf' ? (
          <iframe
            src={resumeUrl}
            title={`Resume: ${resumeVersion.fileName}`}
            className="w-full h-[800px] border-0"
            sandbox="allow-same-origin"
          />
        ) : (
          <div className="p-8 text-center">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-neutral-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">
              File Preview Not Available
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              This file type ({resumeVersion.mimeType}) cannot be previewed in
              the browser.
            </p>
            <a
              href={resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary px-4 py-2 inline-flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download File
            </a>
          </div>
        )}
      </div>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => window.history.back()}
          className="btn-outline px-4 py-2"
        >
          Back
        </button>
        <a
          href={resumeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary px-4 py-2 inline-flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          Open in New Tab
        </a>
      </div>
    </div>
  );
}
