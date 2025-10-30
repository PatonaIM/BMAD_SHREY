'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ProfileEditor } from '../../../components/profile/ProfileEditor';
import { AutoSaveStatus } from '../../../components/profile/AutoSaveStatus';
import { VersionHistoryPanel } from '../../../components/profile/VersionHistoryPanel';
import { CompletenessDisplay } from '../../../components/profile/CompletenessDisplay';
import type {
  EditableProfile,
  ProfileVersion,
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
  const [versions, setVersions] = useState<ProfileVersion[]>([]);
  const [completeness, setCompleteness] = useState<CompletenessScore | null>(
    null
  );
  const [showHistory, setShowHistory] = useState(false);

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
      loadVersions();
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
        setError(data.error?.message || 'Failed to load profile');
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
        setVersions(data.value || []);
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
        setShowHistory(false);
      } else {
        setError(data.error?.message || 'Restore failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">
          {error || 'No profile found'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <div className="flex items-center gap-4">
            <AutoSaveStatus
              saving={saving}
              lastSaved={lastSaved}
              error={error}
            />
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Save Version
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              {showHistory ? 'Hide' : 'Show'} History
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={showHistory ? 'lg:col-span-2' : 'lg:col-span-2'}>
            <ProfileEditor
              profile={profile}
              onChange={handleProfileChange}
              onSave={() => handleSave(false)}
            />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <CompletenessDisplay score={completeness} />
            {showHistory && (
              <VersionHistoryPanel
                versions={versions}
                onRestore={handleRestoreVersion}
                loading={saving}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
