import React from 'react';

interface ScoreCardProps {
  score: number;
  breakdown?: { clarity: number; correctness: number; depth: number };
  duration?: number; // seconds
  difficulty: number;
  feedback?: string; // Old feedback (legacy support)
  scoreBeforeInterview?: number;
  scoreAfterInterview?: number;
  scoreBoost?: number;
  // EP5-S21: Detailed feedback from AI
  detailedFeedback?: {
    strengths: string[];
    improvements: string[];
    summary: string;
  };
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  score,
  breakdown,
  duration = 0,
  difficulty,
  feedback,
  scoreBeforeInterview,
  scoreAfterInterview,
  scoreBoost,
  detailedFeedback,
}) => {
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-neutral-900 rounded-2xl shadow-2xl p-8 border border-neutral-800">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-block px-4 py-2 bg-green-900/30 text-green-300 rounded-full text-sm font-medium mb-4">
          ✅ Interview Complete
        </div>
        <div
          className="text-7xl font-bold text-indigo-400 mb-2"
          aria-label={`Final score: ${score} out of 100`}
        >
          {score.toFixed(2)}
        </div>
        <div className="text-2xl text-neutral-400">/ 100</div>
      </div>

      {/* Score Boost Section */}
      {scoreBeforeInterview !== undefined &&
        scoreAfterInterview !== undefined &&
        scoreBoost !== undefined && (
          <div className="mb-8 bg-gradient-to-r from-emerald-900/20 to-cyan-900/20 rounded-xl p-6 border border-emerald-800">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              🎯 Match Score Improvement
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-neutral-400 mb-1">
                  Before Interview
                </div>
                <div className="text-2xl font-bold text-neutral-300">
                  {scoreBeforeInterview.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-emerald-400 mb-1">Score Boost</div>
                <div className="text-2xl font-bold text-emerald-400">
                  +{scoreBoost.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-neutral-400 mb-1">
                  New Match Score
                </div>
                <div className="text-2xl font-bold text-indigo-400 flex items-center justify-center gap-1">
                  {scoreAfterInterview.toFixed(2)}%{' '}
                  <span className="text-lg">⬆️</span>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Breakdown */}
      {breakdown && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">
            Performance Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(breakdown).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-neutral-300">{key}</span>
                  <span
                    className="font-medium text-white"
                    aria-label={`${key}: ${(value * 100).toFixed(2)} percent`}
                  >
                    {(value * 100).toFixed(2)}%
                  </span>
                </div>
                <div
                  className="h-2 bg-neutral-800 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.round(value * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    style={{ width: `${value * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 mb-8 text-center">
        <div>
          <div className="text-2xl font-bold text-white">
            {formatDuration(duration)}
          </div>
          <div className="text-xs text-neutral-400">Duration</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-white">T{difficulty}</div>
          <div className="text-xs text-neutral-400">Difficulty</div>
        </div>
      </div>

      {/* Detailed Feedback (EP5-S21) */}
      {detailedFeedback ? (
        <div className="space-y-6">
          {/* Strengths Section */}
          {detailedFeedback.strengths.length > 0 && (
            <div className="bg-green-900/20 rounded-xl p-6 border border-green-800">
              <h3 className="text-lg font-semibold text-green-300 mb-3 flex items-center gap-2">
                ✨ Key Strengths
              </h3>
              <ul className="space-y-2">
                {detailedFeedback.strengths.map((strength, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-neutral-300 flex items-start gap-2"
                  >
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements Section */}
          {detailedFeedback.improvements.length > 0 && (
            <div className="bg-amber-900/20 rounded-xl p-6 border border-amber-800">
              <h3 className="text-lg font-semibold text-amber-300 mb-3 flex items-center gap-2">
                📈 Areas for Growth
              </h3>
              <ul className="space-y-2">
                {detailedFeedback.improvements.map((improvement, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-neutral-300 flex items-start gap-2"
                  >
                    <span className="text-amber-400 mt-0.5">→</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Overall Assessment */}
          {detailedFeedback.summary && (
            <div className="bg-indigo-900/20 rounded-xl p-6 border border-indigo-800">
              <h3 className="text-lg font-semibold text-indigo-300 mb-3 flex items-center gap-2">
                💡 Overall Assessment
              </h3>
              <p className="text-sm text-neutral-300 leading-relaxed">
                {detailedFeedback.summary}
              </p>
            </div>
          )}
        </div>
      ) : (
        // Legacy feedback (backward compatibility)
        feedback && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Feedback</h3>
            <p className="text-sm text-neutral-300 leading-relaxed">
              {feedback}
            </p>
          </div>
        )
      )}
    </div>
  );
};
