'use client';

import type { ProfileVersion } from '../../shared/types/profileEditing';

interface VersionHistoryPanelProps {
  versions: ProfileVersion[];
  onRestore: (_versionId: string) => void;
  loading: boolean;
}

export function VersionHistoryPanel({
  versions,
  onRestore,
  loading,
}: VersionHistoryPanelProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getSourceBadge = (source: ProfileVersion['source']) => {
    const colors = {
      'auto-save': 'bg-gray-100 text-gray-700',
      manual: 'bg-blue-100 text-blue-700',
      restore: 'bg-purple-100 text-purple-700',
      system: 'bg-green-100 text-green-700',
    };
    return (
      <span
        className={`px-2 py-1 text-xs rounded-full ${colors[source] || colors['auto-save']}`}
      >
        {source}
      </span>
    );
  };

  const getCompletenessBadge = (score: number) => {
    const color =
      score >= 85
        ? 'bg-green-100 text-green-800'
        : score >= 65
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-red-100 text-red-800';
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${color}`}>
        {score}%
      </span>
    );
  };

  if (!versions.length) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Version History
        </h3>
        <p className="text-gray-500 text-sm">No versions yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        Version History
      </h3>
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {versions.map((version, idx) => (
          <div
            key={version.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {getSourceBadge(version.source)}
                {getCompletenessBadge(version.completeness.score)}
                {idx === 0 && (
                  <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                    Current
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-700 mb-2">
              {formatDate(version.createdAt)}
            </div>
            {version.message && (
              <div className="text-sm text-gray-600 mb-2 italic">
                {version.message}
              </div>
            )}
            {version.diff && (
              <div className="text-xs text-gray-500 mb-2">
                {version.diff.summary}
              </div>
            )}
            {idx > 0 && (
              <button
                onClick={() => onRestore(version.id)}
                disabled={loading}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                Restore
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
