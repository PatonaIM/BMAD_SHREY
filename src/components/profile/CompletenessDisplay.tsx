'use client';

import type { CompletenessScore } from '../../shared/types/profileEditing';

interface CompletenessDisplayProps {
  score: CompletenessScore | null;
}

export function CompletenessDisplay({ score }: CompletenessDisplayProps) {
  if (!score) return null;

  const getBandColor = (band: string) => {
    const colors = {
      poor: 'text-red-600 bg-red-50',
      fair: 'text-yellow-600 bg-yellow-50',
      good: 'text-blue-600 bg-blue-50',
      excellent: 'text-green-600 bg-green-50',
    };
    return colors[band as keyof typeof colors] || colors.fair;
  };

  const getBarColor = (score: number) => {
    if (score >= 85) return 'bg-green-500';
    if (score >= 65) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Profile Completeness
        </h3>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${getBandColor(score.band)}`}
        >
          {score.band.toUpperCase()}
        </span>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-3xl font-bold text-gray-900">
            {score.score}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getBarColor(score.score)}`}
            style={{ width: `${score.score}%` }}
          />
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <h4 className="text-sm font-medium text-gray-700">Breakdown:</h4>
        {Object.entries(score.breakdown).map(([section, sectionScore]) => (
          <div key={section} className="flex items-center justify-between">
            <span className="text-sm text-gray-600 capitalize">
              {section.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <span className="text-sm font-medium text-gray-900">
              {sectionScore}%
            </span>
          </div>
        ))}
      </div>

      {score.recommendations && score.recommendations.length > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Recommendations:
          </h4>
          <ul className="space-y-2">
            {score.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-gray-600 flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
