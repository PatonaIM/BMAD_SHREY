'use client';
import React, { useState } from 'react';
import { ResumeSelector } from './ResumeSelector';
import { PostApplicationModal } from './PostApplicationModal';

interface ResumeVersion {
  versionId: string;
  fileName: string;
  storedAt: string;
  fileSize: number;
}

interface ApplyFormProps {
  jobId: string;
  existingResume?: {
    currentVersionId: string;
    versions: ResumeVersion[];
  };
}

export const ApplyForm: React.FC<ApplyFormProps> = ({
  jobId,
  existingResume,
}) => {
  const [selectedResumeVersion, setSelectedResumeVersion] = useState<
    string | undefined
  >(existingResume?.currentVersionId);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state (EP3-S9)
  const [showModal, setShowModal] = useState(false);
  const [applicationData, setApplicationData] = useState<{
    applicationId: string;
    matchScore: number;
    scoreBreakdown?: {
      skills: number;
      experience: number;
      semantic: number;
      other?: number;
    };
    jobTitle: string;
    jobCompany: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/applications/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          resumeVersionId: selectedResumeVersion,
          coverLetter,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit application');
        setSubmitting(false);
        return;
      }

      // Show modal with match score guidance (EP3-S9)
      setApplicationData({
        applicationId: data.applicationId,
        matchScore: data.matchScore || 0,
        scoreBreakdown: data.scoreBreakdown,
        jobTitle: data.jobTitle,
        jobCompany: data.jobCompany,
      });
      setShowModal(true);
      setSubmitting(false);
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Resume</h2>
          <ResumeSelector
            existingResume={existingResume}
            onResumeSelected={setSelectedResumeVersion}
          />
          {!selectedResumeVersion && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Please select or upload a resume to continue
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="coverLetter" className="block text-sm font-medium">
            Cover Letter (Optional)
          </label>
          <textarea
            id="coverLetter"
            value={coverLetter}
            onChange={e => setCoverLetter(e.target.value)}
            rows={6}
            className="input w-full"
            placeholder="Tell us why you're a great fit for this position..."
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !selectedResumeVersion}
          className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>

      {/* Post-Application Modal (EP3-S9) */}
      {applicationData && (
        <PostApplicationModal
          open={showModal}
          onClose={() => setShowModal(false)}
          matchScore={applicationData.matchScore}
          scoreBreakdown={applicationData.scoreBreakdown}
          applicationId={applicationData.applicationId}
          jobTitle={applicationData.jobTitle}
          jobCompany={applicationData.jobCompany}
        />
      )}
    </>
  );
};
