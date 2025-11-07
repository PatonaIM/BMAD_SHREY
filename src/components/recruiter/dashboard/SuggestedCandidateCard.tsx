'use client';

import React, { useState } from 'react';
import { trpc } from '../../../services/trpc/client';

interface CandidateSuggestion {
  _id: string;
  candidateId: string;
  firstName: string;
  lastName: string;
  email: string;
  currentTitle?: string;
  location?: string;
  skills: string[];
  yearsOfExperience?: number;
  matchScore: number;
  matchBreakdown: {
    vectorSimilarity: number;
    skillOverlap: number;
    experienceMatch: number;
    additionalFactors: number;
  };
  matchedSkills: string[];
  missingSkills: string[];
}

interface SuggestedCandidateCardProps {
  suggestion: CandidateSuggestion;
  jobId?: string;
  onInviteSent?: () => void;
  onDismissed?: () => void;
}

export function SuggestedCandidateCard({
  suggestion,
  jobId,
  onInviteSent,
  onDismissed,
}: SuggestedCandidateCardProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const dismissMutation = trpc.recruiter.dismissSuggestion.useMutation({
    onSuccess: () => {
      onDismissed?.();
    },
  });

  const handleDismiss = () => {
    dismissMutation.mutate({ candidateId: suggestion.candidateId });
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {suggestion.firstName} {suggestion.lastName}
            </h3>
            {suggestion.currentTitle && (
              <p className="text-sm text-gray-600 mt-1">
                {suggestion.currentTitle}
              </p>
            )}
            {suggestion.location && (
              <p className="text-sm text-gray-500 mt-1">
                📍 {suggestion.location}
              </p>
            )}
          </div>

          <div className="ml-4 flex flex-col items-end">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="text-2xl font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              {suggestion.matchScore}%
            </button>
            <div className="text-xs text-gray-500 mt-1">Match Score</div>
          </div>
        </div>

        {showBreakdown && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Score Breakdown:
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Semantic Similarity:</span>
                <span className="ml-2 font-medium">
                  {suggestion.matchBreakdown.vectorSimilarity}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">Skill Match:</span>
                <span className="ml-2 font-medium">
                  {suggestion.matchBreakdown.skillOverlap}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">Experience:</span>
                <span className="ml-2 font-medium">
                  {suggestion.matchBreakdown.experienceMatch}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">Other Factors:</span>
                <span className="ml-2 font-medium">
                  {suggestion.matchBreakdown.additionalFactors}%
                </span>
              </div>
            </div>
          </div>
        )}

        {suggestion.matchedSkills.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Matched Skills:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestion.matchedSkills.slice(0, 8).map(skill => (
                <span
                  key={skill}
                  className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded"
                >
                  ✓ {skill}
                </span>
              ))}
              {suggestion.matchedSkills.length > 8 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  +{suggestion.matchedSkills.length - 8} more
                </span>
              )}
            </div>
          </div>
        )}

        {suggestion.missingSkills.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Missing Skills:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestion.missingSkills.slice(0, 5).map(skill => (
                <span
                  key={skill}
                  className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded"
                >
                  {skill}
                </span>
              ))}
              {suggestion.missingSkills.length > 5 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  +{suggestion.missingSkills.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {suggestion.skills.length > 0 &&
          suggestion.matchedSkills.length === 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Skills:</p>
              <div className="flex flex-wrap gap-2">
                {suggestion.skills.slice(0, 8).map(skill => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                  >
                    {skill}
                  </span>
                ))}
                {suggestion.skills.length > 8 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    +{suggestion.skills.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

        {suggestion.yearsOfExperience !== undefined && (
          <div className="mt-4 text-sm text-gray-600">
            <span className="font-medium">{suggestion.yearsOfExperience}</span>{' '}
            years of experience
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex gap-3">
            {jobId ? (
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={dismissMutation.isPending}
              >
                Invite to Apply
              </button>
            ) : (
              <button
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                title="Select a job first to invite this candidate"
                disabled
              >
                Invite to Apply
              </button>
            )}
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
              View Profile
            </button>
            <button
              onClick={handleDismiss}
              disabled={dismissMutation.isPending}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {dismissMutation.isPending ? 'Dismissing...' : 'Dismiss'}
            </button>
          </div>
        </div>
      </div>

      {showInviteModal && jobId && (
        <InviteModal
          candidateId={suggestion.candidateId}
          candidateName={`${suggestion.firstName} ${suggestion.lastName}`}
          jobId={jobId}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            onInviteSent?.();
          }}
        />
      )}
    </>
  );
}

interface InviteModalProps {
  candidateId: string;
  candidateName: string;
  jobId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function InviteModal({
  candidateId,
  candidateName,
  jobId,
  onClose,
  onSuccess,
}: InviteModalProps) {
  const [message, setMessage] = useState(
    `Hi! We found your profile and think you'd be a great fit for this position. We'd love to invite you to apply!`
  );

  const inviteMutation = trpc.recruiter.inviteCandidate.useMutation({
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.length < 10) {
      return;
    }
    inviteMutation.mutate({
      jobId,
      candidateId,
      message,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Invite {candidateName}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invitation Message
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your invitation message..."
              minLength={10}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum 10 characters ({message.length}/10)
            </p>
          </div>

          {inviteMutation.error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-sm text-red-800">
                {inviteMutation.error.message}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              disabled={inviteMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={inviteMutation.isPending || message.length < 10}
            >
              {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
