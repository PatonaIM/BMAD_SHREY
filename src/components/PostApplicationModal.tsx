'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ScoreBreakdown {
  skills: number;
  experience: number;
  semantic: number;
  other?: number;
}

interface PostApplicationModalProps {
  open: boolean;
  onClose: () => void;
  matchScore: number;
  scoreBreakdown?: ScoreBreakdown;
  applicationId: string;
  jobTitle: string;
  jobCompany: string;
  autoCloseDelay?: number; // seconds (default: 10)
}

export function PostApplicationModal({
  open,
  onClose,
  matchScore,
  scoreBreakdown,
  applicationId,
  jobTitle,
  jobCompany,
  autoCloseDelay = 10,
}: PostApplicationModalProps) {
  const router = useRouter();
  const [timeRemaining, setTimeRemaining] = useState(autoCloseDelay);

  // Auto-close timer
  useEffect(() => {
    if (!open) {
      setTimeRemaining(autoCloseDelay);
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, autoCloseDelay]);

  if (!open) return null;

  // Determine score threshold and content
  const getScoreThreshold = (): 'weak' | 'good' | 'excellent' => {
    if (matchScore < 60) return 'weak';
    if (matchScore < 86) return 'good';
    return 'excellent';
  };

  const threshold = getScoreThreshold();

  // Content based on threshold
  const content = {
    weak: {
      icon: '💡',
      title: 'Improve Your Profile to Boost This Application',
      message:
        'Your profile is missing key skills and experience. Complete these sections to improve your match:',
      color: 'yellow',
      bgGradient: 'from-yellow-500 to-orange-500',
      badgeBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      badgeText: 'text-yellow-800 dark:text-yellow-200',
      actions: [
        {
          label: 'Complete Profile',
          primary: true,
          path: '/profile',
        },
        {
          label: 'View Missing Skills',
          primary: false,
          path: `/applications/${applicationId}`,
        },
      ],
      recommendations: [
        'Add missing technical skills',
        'Complete work experience details',
        'Update education background',
        'Add certifications or achievements',
      ],
    },
    good: {
      icon: '🚀',
      title: 'Good Match! Boost Your Score with AI Interview',
      message:
        "You're a good fit for this role. Take a 15-minute AI interview to increase your score by 5-15 points.",
      color: 'blue',
      bgGradient: 'from-blue-500 to-purple-500',
      badgeBg: 'bg-blue-100 dark:bg-blue-900/30',
      badgeText: 'text-blue-800 dark:text-blue-200',
      actions: [
        {
          label: 'Schedule AI Interview',
          primary: true,
          path: `/applications/${applicationId}`, // Will show interview CTA
        },
        {
          label: 'Continue to Dashboard',
          primary: false,
          path: '/dashboard',
        },
      ],
      recommendations: [
        'Take AI interview to boost score',
        'Highlight relevant experience',
        'Demonstrate technical knowledge',
        'Show communication skills',
      ],
    },
    excellent: {
      icon: '⭐',
      title: 'Excellent Match!',
      message:
        "Your profile strongly aligns with this role. We'll notify you as your application progresses.",
      color: 'green',
      bgGradient: 'from-green-500 to-emerald-500',
      badgeBg: 'bg-green-100 dark:bg-green-900/30',
      badgeText: 'text-green-800 dark:text-green-200',
      actions: [
        {
          label: 'View Application',
          primary: true,
          path: `/applications/${applicationId}`,
        },
        {
          label: 'Browse More Jobs',
          primary: false,
          path: '/jobs',
        },
      ],
      recommendations: [
        'Check application status regularly',
        'Prepare for potential interviews',
        'Review company research',
        'Update availability if needed',
      ],
    },
  };

  const currentContent = content[threshold];

  const handleAction = (path: string) => {
    onClose();
    router.push(path);
  };

  const handleContinue = () => {
    onClose();
    router.push('/dashboard');
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleContinue();
    }
  };

  // Score color
  const getScoreColor = () => {
    if (matchScore >= 85) return 'text-green-600 dark:text-green-400';
    if (matchScore >= 70) return 'text-blue-600 dark:text-blue-400';
    if (matchScore >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  // Progress percentage for timer
  const progressPercent =
    ((autoCloseDelay - timeRemaining) / autoCloseDelay) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Gradient */}
        <div
          className={`bg-gradient-to-r ${currentContent.bgGradient} text-white p-4`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{currentContent.icon}</span>
              <div>
                <h2 className="text-lg font-bold">Application Submitted</h2>
                <p className="text-xs opacity-90">
                  {jobTitle} at {jobCompany}
                </p>
              </div>
            </div>
            <button
              onClick={handleContinue}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1.5 transition"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Match Score Display */}
          <div className="text-center">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${currentContent.badgeBg} mb-2`}
            >
              <div className={`text-3xl font-bold ${getScoreColor()}`}>
                {matchScore}%
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${currentContent.bgGradient} transition-all duration-500`}
                style={{ width: `${matchScore}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Match Score
            </p>
          </div>

          {/* Score Breakdown */}
          {scoreBreakdown && (
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {scoreBreakdown.skills}%
                </div>
                <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
                  Skills
                </div>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {scoreBreakdown.experience}%
                </div>
                <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
                  Experience
                </div>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  {scoreBreakdown.semantic}%
                </div>
                <div className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
                  Semantic
                </div>
              </div>
            </div>
          )}

          {/* Message */}
          <div
            className={`${currentContent.badgeBg} rounded-lg p-3 border border-${currentContent.color}-200 dark:border-${currentContent.color}-800`}
          >
            <h3
              className={`font-semibold ${currentContent.badgeText} mb-1 text-sm`}
            >
              {currentContent.title}
            </h3>
            <p className="text-xs text-gray-700 dark:text-gray-300">
              {currentContent.message}
            </p>
          </div>

          {/* Recommendations */}
          {threshold === 'weak' && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-xs">
                Recommended Actions:
              </h4>
              <ul className="space-y-1">
                {currentContent.recommendations.slice(0, 3).map((rec, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300"
                  >
                    <span className="text-yellow-500 mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timeline Estimate */}
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg p-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
            <span>Reviewed within 3-5 business days</span>
          </div>

          {/* Action Buttons - Side by Side */}
          <div className="flex gap-2">
            {currentContent.actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleAction(action.path)}
                className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all ${
                  action.primary
                    ? `bg-gradient-to-r ${currentContent.bgGradient} text-white hover:shadow-lg hover:scale-[1.02]`
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Auto-close Timer */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>Auto-closing in {timeRemaining}s</span>
              <div className="w-12 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
