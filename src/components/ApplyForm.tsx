'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ResumeSelector } from './ResumeSelector';

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
  const router = useRouter();
  const [selectedResumeVersion, setSelectedResumeVersion] = useState<
    string | undefined
  >(existingResume?.currentVersionId);
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Redirect to application detail page
      router.push(`/applications/${data.applicationId}`);
    } catch {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  return (
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
  );
};
