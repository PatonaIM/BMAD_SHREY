'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ProfileEditor } from '../../../components/profile/ProfileEditor';
import { AutoSaveStatus } from '../../../components/profile/AutoSaveStatus';
import { CompletenessDisplay } from '../../../components/profile/CompletenessDisplay';
import { ResumeUpload } from '../../../components/ResumeUpload';
import type {
  EditableProfile,
  CompletenessScore,
} from '../../../shared/types/profileEditing';

export default function ProfileEditPage() {
  const { status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completeness, setCompleteness] = useState<CompletenessScore | null>(
    null
  );
  const [showResumeUpload, setShowResumeUpload] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Load profile
  useEffect(() => {
    if (status === 'authenticated') {
      loadProfile();
    }
  }, [status]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/profile?computeCompleteness=true');
      const data = await res.json();
      if (data.ok) {
        setProfile(data.value.profile);
        if (data.value.completeness) {
          setCompleteness(data.value.completeness);
        }
      } else {
        const errorMsg =
          data.error?.message || data.error?.code || 'Failed to load profile';
        setError(errorMsg);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const loadVersions = async () => {
    try {
      const res = await fetch('/api/profile/versions?limit=10');
      const data = await res.json();
      if (data.ok) {
        // Versions feature removed for now
      }
    } catch {
      // Failed to load versions, not critical
    }
  };

  const handleProfileChange = useCallback(
    (updatedProfile: Partial<EditableProfile>) => {
      setProfile((prev: EditableProfile | null) =>
        prev ? { ...prev, ...updatedProfile } : null
      );
    },
    []
  );

  const handleSave = useCallback(
    async (createVersion = false) => {
      if (!profile) return;
      try {
        setSaving(true);
        setError(null);
        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            edits: {
              summary: profile.summaryOverride || profile.summary,
              about: profile.about,
              isPrivate: profile.isPrivate,
              tags: profile.tags,
              skills: profile.skills,
              experience: profile.experience,
              education: profile.education,
              certifications: profile.certifications,
            },
            createVersion,
          }),
        });
        const data = await res.json();
        if (data.ok) {
          setLastSaved(new Date());
          await loadVersions();
        } else {
          setError(data.error?.message || 'Save failed');
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed');
      } finally {
        setSaving(false);
      }
    },
    [profile]
  );

  /* Version history feature temporarily disabled
  const handleRestoreVersion = async (versionId: string) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/profile/versions/${versionId}/restore`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.ok) {
        await loadProfile();
        await loadVersions();
      } else {
        setError(data.error?.message || 'Restore failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setSaving(false);
    }
  };
  */

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-neutral-900">
        <div className="max-w-md mx-auto p-8 bg-white dark:bg-neutral-800 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Profile Not Found
          </h2>
          <p className="text-gray-700 dark:text-neutral-300 mb-4">
            {error || 'No profile data available'}
          </p>
          {error?.includes('No profile data') && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-neutral-400">
                To edit your profile, you first need to create one by uploading
                your resume. Our AI will extract the information and create your
                initial profile.
              </p>
              <div className="flex gap-3">
                <a
                  href="/profile/resume"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Upload Resume
                </a>
                <a
                  href="/dashboard"
                  className="px-4 py-2 bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-neutral-200 rounded-md hover:bg-gray-300 dark:hover:bg-neutral-600"
                >
                  Go to Dashboard
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Notification */}
        {showUpdateNotification && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-3 h-3 text-white"
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
              <div>
                <p className="text-green-800 dark:text-green-200 font-medium">
                  Profile Updated Successfully!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your profile has been updated with the latest information from
                  your resume.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowUpdateNotification(false)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-neutral-100">
            Edit Profile
          </h1>
          <div className="flex items-center gap-4">
            <AutoSaveStatus
              saving={saving}
              lastSaved={lastSaved}
              error={error}
            />
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              Save Version
            </button>
          </div>
        </div>

        {/* Profile Complete Toggle */}
        <div className="mb-6 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-2">
                Profile Status
              </h2>
              <p className="text-sm text-gray-600 dark:text-neutral-400">
                {profileComplete
                  ? 'Your profile is marked as complete. You can now focus on applying to jobs!'
                  : "Mark your profile as complete when you're done editing to unlock full matching features."}
              </p>
            </div>
            <button
              onClick={() => setProfileComplete(!profileComplete)}
              className={`px-6 py-3 rounded-md font-medium text-sm transition-colors ${
                profileComplete
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {profileComplete ? '✓ Profile Complete' : 'Mark as Complete'}
            </button>
          </div>
        </div>

        {/* Resume Upload Section */}
        <div className="mb-6 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg shadow-sm">
          <button
            onClick={() => setShowResumeUpload(!showResumeUpload)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors rounded-lg"
          >
            <div className="flex items-center gap-3">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
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
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
                  Update Resume
                </h2>
                <p className="text-sm text-gray-600 dark:text-neutral-400">
                  Upload a new resume to refresh your profile data
                </p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${showResumeUpload ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {showResumeUpload && (
            <div className="px-6 pb-6 border-t border-gray-200 dark:border-neutral-700 pt-4">
              <ResumeUpload
                onUploadSuccess={async () => {
                  // Reload profile with new extracted data
                  await loadProfile();
                  // Show success notification
                  setShowUpdateNotification(true);
                  // Auto-close the upload section after successful extraction
                  setShowResumeUpload(false);
                  // Hide notification after 5 seconds
                  setTimeout(() => setShowUpdateNotification(false), 5000);
                }}
              />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ProfileEditor
              profile={profile}
              onChange={handleProfileChange}
              onSave={() => handleSave(false)}
            />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <CompletenessDisplay score={completeness} />
          </div>
        </div>
      </div>
    </div>
  );
}
