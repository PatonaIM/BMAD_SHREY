'use client';
import React, { useCallback, useRef, useState, useEffect } from 'react';

interface UploadState {
  progress: number; // 0-100
  status:
    | 'idle'
    | 'uploading'
    | 'success'
    | 'extracting'
    | 'extraction_complete'
    | 'error';
  error?: string;
  versionId?: string;
  extractionDetails?: {
    skillCount: number;
    experienceCount: number;
    educationCount: number;
  };
}

interface ResumeUploadProps {
  onUploadSuccess?: (_versionId: string) => void;
}

export const ResumeUpload: React.FC<ResumeUploadProps> = ({
  onUploadSuccess,
}) => {
  const [state, setState] = useState<UploadState>({
    progress: 0,
    status: 'idle',
  });
  const abortRef = useRef<AbortController | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const startExtractionPolling = useCallback(
    (versionId: string) => {
      setState(prev => ({ ...prev, status: 'extracting', progress: 100 }));

      // Poll for extraction status
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/profile/extraction-status');
          const data = await res.json();

          if (data.ok && data.value.status === 'completed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setState({
              progress: 100,
              status: 'extraction_complete',
              versionId,
              extractionDetails: {
                skillCount: data.value.skillCount || 0,
                experienceCount: data.value.experienceCount || 0,
                educationCount: data.value.educationCount || 0,
              },
            });
            if (onUploadSuccess) {
              onUploadSuccess(versionId);
            }
          } else if (data.ok && data.value.status === 'failed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setState({
              progress: 100,
              status: 'error',
              error: data.value.error || 'Extraction failed',
            });
          }
          // If status is 'pending' or 'processing', continue polling
        } catch (error) {
          // Continue polling on network errors (don't show error to user)
          void error;
        }
      }, 2000); // Poll every 2 seconds
    },
    [onUploadSuccess]
  );

  const triggerExtraction = useCallback(
    async (versionId: string) => {
      try {
        const res = await fetch('/api/profile/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeVersionId: versionId }),
        });

        const data = await res.json();

        if (data.ok) {
          // Extraction initiated successfully, start polling
          startExtractionPolling(versionId);
        } else {
          setState({
            progress: 100,
            status: 'error',
            error: data.error || 'Failed to start extraction',
          });
        }
      } catch {
        setState({
          progress: 100,
          status: 'error',
          error: 'Failed to start extraction',
        });
      }
    },
    [startExtractionPolling]
  );

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file) return;
      const form = new FormData();
      form.append('file', file, file.name);
      const controller = new AbortController();
      abortRef.current = controller;

      // Start with 10% progress
      setState({ progress: 10, status: 'uploading' });

      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setState(s => {
            if (s.progress < 90) {
              return { ...s, progress: Math.min(s.progress + 10, 90) };
            }
            return s;
          });
        }, 200);

        const res = await fetch('/api/profile/resume/upload', {
          method: 'POST',
          body: form,
          signal: controller.signal,
        });

        clearInterval(progressInterval);
        setState(s => ({ ...s, progress: 95 }));

        const json = await res.json();
        if (!json.ok) {
          setState({
            progress: 100,
            status: 'error',
            error: json.error?.message || 'Upload failed',
          });
          return;
        }
        setState({
          progress: 100,
          status: 'success',
          versionId: json.value.currentVersionId,
        });

        // Automatically trigger extraction after upload
        await triggerExtraction(json.value.currentVersionId);
      } catch (e) {
        if ((e as { name?: string }).name === 'AbortError') {
          setState({ progress: 0, status: 'idle', error: 'Cancelled' });
        } else {
          setState({
            progress: 100,
            status: 'error',
            error: (e as Error).message,
          });
        }
      }
    },
    [triggerExtraction]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiles(e.target.files);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onFiles(e.dataTransfer.files);
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const cancel = () => {
    abortRef.current?.abort();
  };

  const handleClick = () => {
    const input = document.getElementById('resumeFile') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  return (
    <div className="space-y-4 max-w-lg" aria-live="polite">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onClick={handleClick}
        className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-md p-6 text-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
      >
        <input
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          id="resumeFile"
          onChange={onInputChange}
        />
        <div className="pointer-events-none">
          <svg
            className="w-12 h-12 mx-auto mb-3 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            PDF or DOC (up to 10MB)
          </p>
        </div>
      </div>
      {state.status !== 'idle' && (
        <div className="space-y-2">
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 bg-brand-primary transition-all duration-300 ease-out rounded-full"
              style={{ width: `${state.progress}%` }}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={state.progress}
              role="progressbar"
            />
          </div>
          <div className="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
            <span>Uploading...</span>
            <span>{state.progress}%</span>
          </div>
          {state.status === 'uploading' && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Uploading your resume...
              </span>
              <button
                type="button"
                onClick={cancel}
                className="btn-outline text-xs px-3 py-1"
              >
                Cancel
              </button>
            </div>
          )}
          {state.status === 'success' && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-2 h-2 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-green-600 dark:text-green-400 text-sm font-medium">
                  Resume uploaded successfully!
                </p>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Starting AI extraction...
              </p>
            </div>
          )}
          {state.status === 'extracting' && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-brand-primary text-sm font-medium">
                  AI is extracting your profile data...
                </p>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                This may take 10-30 seconds. Please wait...
              </p>
            </div>
          )}
          {state.status === 'extraction_complete' && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-2 h-2 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-green-600 dark:text-green-400 text-sm font-medium">
                  Profile extraction complete!
                </p>
              </div>
              {state.extractionDetails && (
                <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                  <p>✓ Extracted {state.extractionDetails.skillCount} skills</p>
                  <p>
                    ✓ Extracted {state.extractionDetails.experienceCount}{' '}
                    experiences
                  </p>
                  <p>
                    ✓ Extracted {state.extractionDetails.educationCount}{' '}
                    education entries
                  </p>
                </div>
              )}
              <div className="pt-2 flex gap-2">
                <a
                  href="/profile/edit"
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  Edit Profile
                </a>
                <a
                  href="/dashboard"
                  className="btn-outline text-xs px-3 py-1.5"
                >
                  Go to Dashboard
                </a>
              </div>
            </div>
          )}
          {state.status === 'error' && (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                <svg
                  className="w-2 h-2 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                {state.error}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
