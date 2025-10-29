'use client';
import React, { useCallback, useRef, useState } from 'react';

interface UploadState {
  progress: number; // 0-100
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
  versionId?: string;
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

  const onFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (!file) return;
      const form = new FormData();
      form.append('file', file, file.name);
      const controller = new AbortController();
      abortRef.current = controller;
      setState({ progress: 5, status: 'uploading' });
      try {
        // Using fetch without real progress events; simulate simple progress steps
        const res = await fetch('/api/profile/resume/upload', {
          method: 'POST',
          body: form,
          signal: controller.signal,
        });
        setState(s => ({ ...s, progress: 70 }));
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
        if (onUploadSuccess) {
          onUploadSuccess(json.value.currentVersionId);
        }
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
    [onUploadSuccess]
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

  return (
    <div className="space-y-4 max-w-lg" aria-live="polite">
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/30 dark:hover:bg-muted/10"
      >
        <input
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          id="resumeFile"
          onChange={onInputChange}
        />
        <label htmlFor="resumeFile" className="block text-sm font-medium">
          Drag & drop your resume or click to select (PDF/DOC up to 10MB)
        </label>
      </div>
      {state.status !== 'idle' && (
        <div className="space-y-2">
          <div className="w-full bg-muted rounded h-3 overflow-hidden">
            <div
              className="h-3 bg-primary transition-all"
              style={{ width: `${state.progress}%` }}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={state.progress}
              role="progressbar"
            />
          </div>
          {state.status === 'uploading' && (
            <button
              type="button"
              onClick={cancel}
              className="btn-outline text-xs"
            >
              Cancel
            </button>
          )}
          {state.status === 'success' && (
            <p className="text-green-600 text-sm">
              Uploaded. Version ID: {state.versionId}
            </p>
          )}
          {state.status === 'error' && (
            <p className="text-red-600 text-sm">{state.error}</p>
          )}
        </div>
      )}
    </div>
  );
};
