'use client';

import React, { useEffect, useState } from 'react';

interface ScoreComparisonCardProps {
  scoreBefore: number;
  scoreAfter: number;
  scoreBoost: number;
  showCelebration?: boolean;
  className?: string;
}

export function ScoreComparisonCard({
  scoreBefore,
  scoreAfter,
  scoreBoost,
  showCelebration = true,
  className = '',
}: ScoreComparisonCardProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (showCelebration && scoreBoost > 0) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showCelebration, scoreBoost]);

  const getBoostColor = (boost: number) => {
    if (boost >= 12) return 'text-green-600 dark:text-green-400';
    if (boost >= 8) return 'text-blue-600 dark:text-blue-400';
    return 'text-purple-600 dark:text-purple-400';
  };

  const getBoostBg = (boost: number) => {
    if (boost >= 12)
      return 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20';
    if (boost >= 8)
      return 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20';
    return 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                width: '8px',
                height: '8px',
                backgroundColor: [
                  '#10B981',
                  '#3B82F6',
                  '#8B5CF6',
                  '#F59E0B',
                  '#EF4444',
                ][Math.floor(Math.random() * 5)],
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 1}s`,
              }}
            />
          ))}
        </div>
      )}

      <div
        className={`relative ${getBoostBg(scoreBoost)} border rounded-xl p-6 overflow-hidden`}
      >
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="currentColor"
              d="M45.7,-57.8C59.3,-49.1,70.8,-35.5,75.6,-19.6C80.4,-3.7,78.5,14.5,70.8,28.9C63.1,43.3,49.6,53.9,34.7,61.2C19.8,68.5,3.5,72.5,-13.5,72.8C-30.5,73.1,-48.2,69.7,-60.7,59.8C-73.2,49.9,-80.5,33.5,-82.1,16.3C-83.7,-0.9,-79.6,-18.9,-70.8,-33.7C-62,-48.5,-48.5,-60.1,-33.4,-68.2C-18.3,-76.3,-1.6,-80.9,13.5,-77.9C28.6,-74.9,32.1,-66.5,45.7,-57.8Z"
              transform="translate(100 100)"
            />
          </svg>
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center animate-bounce">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                Score Improved! 🎉
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your interview boosted your application
              </p>
            </div>
          </div>

          {/* Score Comparison */}
          <div className="flex items-center justify-between gap-8 mb-6">
            {/* Before Score */}
            <div className="flex-1">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Before
              </div>
              <div className="text-4xl font-bold text-gray-700 dark:text-gray-300">
                {scoreBefore}%
              </div>
            </div>

            {/* Arrow & Boost */}
            <div className="flex flex-col items-center">
              <svg
                className="w-12 h-12 text-green-600 dark:text-green-400 mb-2 animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              <div
                className={`${getBoostColor(scoreBoost)} text-2xl font-bold whitespace-nowrap`}
              >
                +{scoreBoost.toFixed(1)}
              </div>
            </div>

            {/* After Score */}
            <div className="flex-1 text-right">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                After
              </div>
              <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                {scoreAfter}%
              </div>
            </div>
          </div>

          {/* Visual Bar Comparison */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 dark:text-gray-400 w-12">
                Before
              </span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gray-400 dark:bg-gray-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${scoreBefore}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-10 text-right">
                {scoreBefore}%
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 dark:text-gray-400 w-12">
                After
              </span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-1000 delay-300"
                  style={{ width: `${scoreAfter}%` }}
                />
              </div>
              <span className="text-xs font-medium text-green-600 dark:text-green-400 w-10 text-right">
                {scoreAfter}%
              </span>
            </div>
          </div>

          {/* Boost Badge */}
          <div className="mt-4 flex items-center justify-center gap-2 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-green-500/20">
            <svg
              className="w-5 h-5 text-yellow-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Interview boost applied: +{scoreBoost.toFixed(1)} points
            </span>
          </div>
        </div>
      </div>

      {/* Confetti Animation Styles */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(500px) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}
