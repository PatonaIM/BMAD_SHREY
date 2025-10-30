'use client';

import { useState, useEffect, useRef } from 'react';
import type { EditableProfile } from '../../shared/types/profileEditing';

interface ProfileEditorProps {
  profile: EditableProfile;
  onChange: (_updated: Partial<EditableProfile>) => void;
  onSave: () => void;
}

const AUTOSAVE_DELAY = 1500; // 1.5 seconds

export function ProfileEditor({
  profile,
  onChange,
  onSave,
}: ProfileEditorProps) {
  const [localProfile, setLocalProfile] = useState(profile);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  const handleChange = (field: keyof EditableProfile, value: unknown) => {
    const updated = { ...localProfile, [field]: value };
    setLocalProfile(updated);
    onChange({ [field]: value });

    // Debounced auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      onSave();
    }, AUTOSAVE_DELAY);
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    handleChange('tags', tags);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Summary
        </label>
        <textarea
          value={localProfile.summaryOverride || localProfile.summary || ''}
          onChange={e => handleChange('summaryOverride', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Professional summary..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          About
        </label>
        <textarea
          value={localProfile.about || ''}
          onChange={e => handleChange('about', e.target.value)}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Tell us about yourself, your interests, and goals..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          value={(localProfile.tags || []).join(', ')}
          onChange={e => handleTagsChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., React, Node.js, Machine Learning"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="isPrivate"
          checked={localProfile.isPrivate || false}
          onChange={e => handleChange('isPrivate', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="isPrivate" className="ml-2 block text-sm text-gray-700">
          Make profile private
        </label>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          AI-Extracted Data (Read-only)
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Skills ({(profile.skills || []).length})
            </label>
            <div className="flex flex-wrap gap-2">
              {(profile.skills || []).slice(0, 10).map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {skill.name}
                </span>
              ))}
              {(profile.skills || []).length > 10 && (
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                  +{(profile.skills || []).length - 10} more
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Experience ({(profile.experience || []).length} positions)
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Education ({(profile.education || []).length} entries)
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
