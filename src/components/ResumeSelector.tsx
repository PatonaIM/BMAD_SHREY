'use client';
import React, { useState } from 'react';
import { ResumeUpload } from './ResumeUpload';

interface ResumeVersion {
  versionId: string;
  fileName: string;
  storedAt: string;
  fileSize: number;
}

interface ResumeSelectorProps {
  existingResume?: {
    currentVersionId: string;
    versions: ResumeVersion[];
  };
  onResumeSelected: (_versionId: string) => void;
}

export const ResumeSelector: React.FC<ResumeSelectorProps> = ({
  existingResume,
  onResumeSelected,
}) => {
  const [mode, setMode] = useState<'select' | 'upload'>(
    existingResume ? 'select' : 'upload'
  );
  const [selectedVersion, setSelectedVersion] = useState<string | undefined>(
    existingResume?.currentVersionId
  );

  const handleVersionSelect = (versionId: string) => {
    setSelectedVersion(versionId);
    onResumeSelected(versionId);
  };

  return (
    <div className="space-y-4">
      {existingResume && (
        <div className="flex gap-4 border-b pb-4">
          <button
            type="button"
            onClick={() => setMode('select')}
            className={`px-4 py-2 rounded ${
              mode === 'select'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            }`}
          >
            Use Existing Resume
          </button>
          <button
            type="button"
            onClick={() => setMode('upload')}
            className={`px-4 py-2 rounded ${
              mode === 'upload'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            }`}
          >
            Upload New Resume
          </button>
        </div>
      )}

      {mode === 'select' && existingResume && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Select a resume version:</h3>
          {existingResume.versions
            .slice()
            .reverse()
            .map(version => (
              <label
                key={version.versionId}
                className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-muted/30 dark:hover:bg-muted/10"
              >
                <input
                  type="radio"
                  name="resumeVersion"
                  value={version.versionId}
                  checked={selectedVersion === version.versionId}
                  onChange={() => handleVersionSelect(version.versionId)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{version.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded: {new Date(version.storedAt).toLocaleDateString()}{' '}
                    • {(version.fileSize / 1024).toFixed(0)} KB •
                    {version.versionId === existingResume.currentVersionId &&
                      ' Current'}
                  </p>
                </div>
              </label>
            ))}
        </div>
      )}

      {mode === 'upload' && (
        <div>
          <ResumeUpload onUploadSuccess={handleVersionSelect} />
        </div>
      )}
    </div>
  );
};
