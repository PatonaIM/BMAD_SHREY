import React from 'react';

interface ScoreCardProps {
  score: number;
  breakdown?: { clarity: number; correctness: number; depth: number };
  duration?: number; // seconds
  questionsAnswered: number;
  difficulty: number;
  feedback?: string;
  scoreBeforeInterview?: number;
  scoreAfterInterview?: number;
  scoreBoost?: number;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  score,
  breakdown,
  duration = 0,
  questionsAnswered,
  difficulty,
  feedback,
  scoreBeforeInterview,
  scoreAfterInterview,
  scoreBoost,
}) => {
  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-block px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm font-medium mb-4">
          ✅ Interview Complete
        </div>
        <div
          className="text-7xl font-bold text-indigo-600 dark:text-indigo-400 mb-2"
          aria-label={`Final score: ${score} out of 100`}
        >
          {score}
        </div>
        <div className="text-2xl text-neutral-500 dark:text-neutral-400">
          / 100
        </div>
      </div>

      {/* Score Boost Section */}
      {scoreBeforeInterview !== undefined &&
        scoreAfterInterview !== undefined &&
        scoreBoost !== undefined && (
          <div className="mb-8 bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              🎯 Match Score Improvement
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Before Interview
                </div>
                <div className="text-2xl font-bold text-neutral-700 dark:text-neutral-300">
                  {scoreBeforeInterview}%
                </div>
              </div>
              <div>
                <div className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">
                  Score Boost
                </div>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  +{scoreBoost}%
                </div>
              </div>
              <div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  New Match Score
                </div>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
                  {scoreAfterInterview}% <span className="text-lg">⬆️</span>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Breakdown */}
      {breakdown && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Performance Breakdown
          </h3>
          <div className="space-y-3">
            {Object.entries(breakdown).map(([key, value]) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-neutral-700 dark:text-neutral-300">
                    {key}
                  </span>
                  <span
                    className="font-medium text-neutral-900 dark:text-white"
                    aria-label={`${key}: ${Math.round(value * 100)} percent`}
                  >
                    {Math.round(value * 100)}%
                  </span>
                </div>
                <div
                  className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden"
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
      <div className="grid grid-cols-3 gap-4 mb-8 text-center">
        <div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {formatDuration(duration)}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Duration
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            {questionsAnswered}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Questions
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold text-neutral-900 dark:text-white">
            T{difficulty}
          </div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Difficulty
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
            Feedback
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
            {feedback}
          </p>
        </div>
      )}
    </div>
  );
};
