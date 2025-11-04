/**
 * InterviewContainer Component
 * Main orchestrator for split-panel interview architecture
 * Coordinates AI Interview Panel and Interview Helper Panel
 */

'use client';

import React, { useState } from 'react';
import {
  InterviewProvider,
  useInterviewContext,
} from './context/InterviewContext';
import { AIInterviewPanel } from './panels/AIInterviewPanel';
import { InterviewHelperPanel } from './panels/InterviewHelperPanel';
import { VideoPreview } from './shared/VideoPreview';
import { InterviewStatus } from './shared/InterviewStatus';
import { InterviewControls } from './shared/InterviewControls';
import { CameraPermissionCheck } from './shared/CameraPermissionCheck';
import type { InterviewQuestion } from './../../shared/types/interview';

export interface InterviewContainerProps {
  sessionId: string;
  questions?: InterviewQuestion[];
}

export function InterviewContainer({ sessionId }: InterviewContainerProps) {
  const [questionContext, setQuestionContext] = useState<{
    text: string;
    category: string;
  } | null>(null);

  const handleQuestionAsked = (text: string, category: string) => {
    setQuestionContext({ text, category });
  };

  return (
    <InterviewProvider sessionId={sessionId}>
      <InterviewContainerContent
        onQuestionAsked={handleQuestionAsked}
        questionContext={questionContext}
      />
    </InterviewProvider>
  );
}

interface InterviewContainerContentProps {
  onQuestionAsked: (_text: string, _category: string) => void;
  questionContext: { text: string; category: string } | null;
}

function InterviewContainerContent({
  onQuestionAsked,
  questionContext,
}: InterviewContainerContentProps) {
  const context = useInterviewContext();
  const {
    sharedState,
    audioState,
    toggleCamera,
    toggleMicrophone,
    startInterview,
    endInterview,
  } = context;

  // Setup phase - show camera permission check
  if (sharedState.phase === 'setup') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <CameraPermissionCheck
          onPermissionsGranted={(stream: MediaStream) => {
            context.setMediaStream(stream);
            context.setPhase('ready');
          }}
          onPermissionsDenied={(err: Error) => {
            context.setError(err.message);
          }}
        />
      </div>
    );
  }

  // Main interview interface
  return (
    <div className="fixed inset-0 overflow-hidden bg-white dark:bg-gray-900 flex flex-col top-[20px]">
      {/* Error Banner */}
      {sharedState.error && (
        <div className="bg-red-500/90 backdrop-blur-sm border-b border-red-400 px-4 py-3 flex-shrink-0">
          <p className="text-white text-sm text-center font-medium flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {sharedState.error}
          </p>
        </div>
      )}

      {/* Header with Controls */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <InterviewStatus
            status={sharedState.connectionStatus}
            currentQuestion={1}
            totalQuestions={1}
            elapsedSeconds={sharedState.elapsedSeconds}
          />
        </div>

        {/* Action Buttons */}
        <InterviewControls
          phase={sharedState.phase}
          onStart={startInterview}
          onEnd={endInterview}
          isProcessing={false}
        />
      </div>

      {/* Main Split-Panel Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden min-h-0 bg-gray-50 dark:bg-gray-900">
        {/* Left Section: Video Preview + AI Interview (60%) */}
        <div className="flex-1 lg:w-3/5 flex flex-col gap-4 min-h-0">
          {/* Video Preview */}
          <div className="flex-1 relative rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700 bg-black min-h-0">
            <VideoPreview
              stream={audioState.mediaStream}
              isReady={
                sharedState.phase === 'ready' ||
                sharedState.phase === 'interviewing'
              }
              onToggleCamera={toggleCamera}
              onToggleMicrophone={toggleMicrophone}
              cameraEnabled={audioState.cameraEnabled}
              microphoneEnabled={audioState.microphoneEnabled}
            />
          </div>

          {/* AI Interview Panel */}
          <div className="h-64">
            <AIInterviewPanel onQuestionAsked={onQuestionAsked} />
          </div>
        </div>

        {/* Right Section: Interview Helper (40%) */}
        <div className="flex-1 lg:w-2/5 min-h-0">
          <InterviewHelperPanel questionContext={questionContext} />
        </div>
      </div>
    </div>
  );
}
