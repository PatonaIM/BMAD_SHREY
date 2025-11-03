'use client';

import React, { useRef, useState, useEffect } from 'react';
import type {
  InterviewQuestion,
  InterviewQAPair,
} from '../../shared/types/interview';
import { InterviewTranscriptViewer } from './InterviewTranscriptViewer';

interface InterviewPlayerProps {
  videoUrl: string;
  questions: InterviewQuestion[];
  duration: number; // milliseconds
  qaTranscript?: InterviewQAPair[]; // Optional Q&A transcript
  interviewSummary?: string; // Optional AI-generated summary
  className?: string;
}

export function InterviewPlayer({
  videoUrl,
  questions,
  duration,
  qaTranscript,
  interviewSummary,
  className = '',
}: InterviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(true);

  // Debug: Log video URL on mount
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('Video URL:', videoUrl);
      // Test if URL is accessible
      fetch(videoUrl, { method: 'HEAD' })
        .then(response => {
          // eslint-disable-next-line no-console
          console.log(
            'Video HEAD response:',
            response.status,
            response.headers.get('content-type')
          );
        })
        .catch(err => {
          // eslint-disable-next-line no-console
          console.error('Video HEAD request failed:', err);
        });
    }
  }, [videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedData = () => setIsLoading(false);
    const handleError = (e: Event) => {
      const videoElement = e.target as HTMLVideoElement;
      const errorCode = videoElement.error?.code;
      const errorMessage = videoElement.error?.message;

      let errorText = 'Failed to load video.';

      switch (errorCode) {
        case 1: // MEDIA_ERR_ABORTED
          errorText = 'Video loading aborted.';
          break;
        case 2: // MEDIA_ERR_NETWORK
          errorText = 'Network error while loading video.';
          break;
        case 3: // MEDIA_ERR_DECODE
          errorText = 'Video decoding error. The file may be corrupted.';
          break;
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          errorText = 'Video format not supported by your browser.';
          break;
      }

      if (errorMessage) {
        errorText += ` (${errorMessage})`;
      }

      setError(errorText);
      setIsLoading(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
    };
  }, []);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalSeconds = duration / 1000;
  const progress = totalSeconds > 0 ? (currentTime / totalSeconds) * 100 : 0;

  // Calculate approximate question timestamps
  const getQuestionTimestamps = () => {
    const timestamps: Array<{ question: InterviewQuestion; time: number }> = [];
    let accumulatedTime = 0;

    questions.forEach(q => {
      timestamps.push({ question: q, time: accumulatedTime });
      accumulatedTime += q.expectedDuration;
    });

    return timestamps;
  };

  const questionTimestamps = getQuestionTimestamps();

  const jumpToQuestion = (time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = time;
    setCurrentTime(time);
    if (!isPlaying) {
      video.play();
    }
  };

  const handleSeekFromTranscript = (time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = time;
    setCurrentTime(time);
    if (!isPlaying) {
      video.play();
    }
  };

  return (
    <div className={className}>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* AI Summary (if available) */}
        {interviewSummary && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-800 mb-1">
                  AI Summary
                </h4>
                <p className="text-sm text-gray-700">{interviewSummary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Video Player */}
        <div className="relative bg-black aspect-video">
          {/* Video content */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center">
                <svg
                  className="animate-spin h-12 w-12 text-white mx-auto mb-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <p className="text-white text-sm">Loading video...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center px-4">
                <svg
                  className="h-12 w-12 text-red-400 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-white text-sm">{error}</p>
              </div>
            </div>
          )}

          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full"
            preload="metadata"
            crossOrigin="anonymous"
            controls={false}
          />
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <input
              type="range"
              min="0"
              max={totalSeconds}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              style={{
                background: `linear-gradient(to right, #2563eb 0%, #2563eb ${progress}%, #e5e7eb ${progress}%, #e5e7eb 100%)`,
              }}
            />

            {/* Time Display */}
            <div className="flex justify-between text-sm text-gray-600">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(totalSeconds)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={togglePlayPause}
              disabled={isLoading || !!error}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-full p-3 transition-colors"
            >
              {isPlaying ? (
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Question Timeline */}
        <div className="border-t border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">
            Interview Questions
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {questionTimestamps.map((item, index) => (
              <button
                key={item.question.id}
                onClick={() => jumpToQuestion(item.time)}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-blue-600">
                        Q{index + 1}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(item.time)}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600 capitalize">
                        {item.question.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 line-clamp-2">
                      {item.question.question}
                    </p>
                  </div>
                  <svg
                    className="h-5 w-5 text-gray-400 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Q&A Transcript Viewer */}
      {qaTranscript && qaTranscript.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Q&A Transcript
            </h3>
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              {showTranscript ? (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                  Hide
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  Show
                </>
              )}
            </button>
          </div>

          {showTranscript && (
            <InterviewTranscriptViewer
              qaTranscript={qaTranscript}
              currentTime={currentTime}
              onSeek={handleSeekFromTranscript}
            />
          )}
        </div>
      )}
    </div>
  );
}
