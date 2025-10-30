'use client';

import { useState } from 'react';

interface ProfileCreationResponse {
  ok: boolean;
  value?: {
    userId: string;
    resumeVersionId: string;
    extractionStatus: string;
    skillCount: number;
    experienceCount: number;
    educationCount: number;
    extractedAt: string;
    costEstimate?: number;
    summary?: string;
    message?: string;
  };
  error?: string;
}

interface ProfileCheckResponse {
  ok: boolean;
  value?: {
    hasProfile: boolean;
    hasResume: boolean;
    profileInfo?: {
      resumeVersionId: string;
      extractionStatus: string;
      skillCount: number;
      experienceCount: number;
      educationCount: number;
      extractedAt: string;
    } | null;
    resumeInfo?: {
      currentVersionId: string;
      versionCount: number;
      latestFileName?: string;
    } | null;
  };
  error?: string;
}

export function CreateProfileFromResume() {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ProfileCreationResponse | null>(null);
  const [checkResult, setCheckResult] = useState<ProfileCheckResponse | null>(
    null
  );

  const checkStatus = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const response = await fetch('/api/profile/create-from-resume');
      const data = await response.json();
      setCheckResult(data);
    } catch (error) {
      setCheckResult({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setChecking(false);
    }
  };

  const createProfile = async (forceRegenerate = false) => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/profile/create-from-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRegenerate }),
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-md max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Create Profile from Resume
        </h2>
        <p className="text-sm text-gray-600">
          Generate your AI-extracted profile from your latest uploaded resume.
        </p>
      </div>

      {/* Check Status Section */}
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={checkStatus}
          disabled={checking}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {checking ? 'Checking...' : 'Check Profile Status'}
        </button>

        {checkResult && (
          <div
            className={`mt-4 p-4 rounded-md ${
              checkResult.ok ? 'bg-blue-50' : 'bg-red-50'
            }`}
          >
            {checkResult.ok && checkResult.value ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Profile:</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      checkResult.value.hasProfile
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {checkResult.value.hasProfile ? 'EXISTS' : 'NOT FOUND'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Resume:</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      checkResult.value.hasResume
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {checkResult.value.hasResume ? 'UPLOADED' : 'NOT FOUND'}
                  </span>
                </div>
                {checkResult.value.profileInfo && (
                  <div className="mt-3 text-sm text-gray-700 space-y-1">
                    <div>
                      Skills: {checkResult.value.profileInfo.skillCount}
                    </div>
                    <div>
                      Experience:{' '}
                      {checkResult.value.profileInfo.experienceCount}
                    </div>
                    <div>
                      Education: {checkResult.value.profileInfo.educationCount}
                    </div>
                    <div className="text-xs text-gray-500">
                      Extracted:{' '}
                      {new Date(
                        checkResult.value.profileInfo.extractedAt
                      ).toLocaleString()}
                    </div>
                  </div>
                )}
                {checkResult.value.resumeInfo && (
                  <div className="mt-3 text-sm text-gray-700">
                    <div>
                      Resume versions:{' '}
                      {checkResult.value.resumeInfo.versionCount}
                    </div>
                    {checkResult.value.resumeInfo.latestFileName && (
                      <div className="text-xs text-gray-500">
                        Latest: {checkResult.value.resumeInfo.latestFileName}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-red-700 text-sm">{checkResult.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Create/Regenerate Section */}
      <div className="border-t border-gray-200 pt-4 space-y-3">
        <button
          onClick={() => createProfile(false)}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Profile...' : 'Create Profile'}
        </button>

        <button
          onClick={() => createProfile(true)}
          disabled={loading}
          className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Regenerating...' : 'Force Regenerate Profile'}
        </button>

        <p className="text-xs text-gray-500">
          Note: Force regenerate will recreate your profile even if one already
          exists.
        </p>
      </div>

      {/* Result Display */}
      {result && (
        <div
          className={`p-4 rounded-md ${
            result.ok
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {result.ok && result.value ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium text-green-900">
                  Profile Created Successfully!
                </span>
              </div>

              {result.value.message && (
                <p className="text-sm text-blue-700 italic">
                  {result.value.message}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Skills:</span>
                  <span className="ml-2 text-gray-900">
                    {result.value.skillCount}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Experience:</span>
                  <span className="ml-2 text-gray-900">
                    {result.value.experienceCount}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Education:</span>
                  <span className="ml-2 text-gray-900">
                    {result.value.educationCount}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className="ml-2 text-gray-900">
                    {result.value.extractionStatus}
                  </span>
                </div>
              </div>

              {result.value.summary && (
                <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-1">
                    Summary Preview:
                  </p>
                  <p className="text-sm text-gray-800">
                    {result.value.summary}
                  </p>
                </div>
              )}

              {result.value.costEstimate && (
                <p className="text-xs text-gray-500">
                  AI Cost: ${(result.value.costEstimate / 100).toFixed(2)}
                </p>
              )}

              <div className="pt-2 border-t border-green-200">
                <a
                  href="/profile/edit"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Go to Profile Editor →
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-red-600 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium text-red-900">Error</p>
                <p className="text-sm text-red-700">{result.error}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
