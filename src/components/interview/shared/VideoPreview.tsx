'use client';

import React, { useEffect, useRef, useState } from 'react';

interface VideoPreviewProps {
  stream: MediaStream | null;
  isReady: boolean;
  onToggleCamera?: () => void;
  onToggleMicrophone?: () => void;
  cameraEnabled?: boolean;
  microphoneEnabled?: boolean;
  className?: string;
}

export function VideoPreview({
  stream,
  isReady,
  onToggleCamera,
  onToggleMicrophone,
  cameraEnabled = true,
  microphoneEnabled = true,
  className = '',
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<string>('');

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    let isMounted = true;

    const setupVideo = async () => {
      try {
        // Clear any previous playback state
        video.pause();
        video.srcObject = stream;

        // Get video resolution
        video.onloadedmetadata = () => {
          if (isMounted) {
            setResolution(`${video.videoWidth}x${video.videoHeight}`);
          }
        };

        // Wait a bit before playing to avoid interruption errors
        await new Promise(resolve => setTimeout(resolve, 100));

        if (isMounted) {
          await video.play();
        }
      } catch (err) {
        if (isMounted) {
          const error = err as Error;
          // Only show error if it's not an interruption error
          if (!error.message.includes('interrupted')) {
            setVideoError(`Failed to play video: ${error.message}`);
          }
        }
      }
    };

    setupVideo();

    return () => {
      isMounted = false;
      if (video.srcObject) {
        video.pause();
        video.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div className={`relative ${className}`}>
      {/* Video Preview */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
        {stream && cameraEnabled ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: 'scaleX(-1)' }}
            />
            {resolution && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                {resolution}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
            <svg
              className="w-16 h-16 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
              {!cameraEnabled && (
                <line
                  x1="3"
                  y1="3"
                  x2="21"
                  y2="21"
                  stroke="currentColor"
                  strokeWidth={2}
                />
              )}
            </svg>
            <p className="text-sm">
              {!cameraEnabled ? 'Camera Off' : 'No Video Feed'}
            </p>
          </div>
        )}

        {/* Status Badge */}
        {isReady && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-green-500 text-white text-xs px-2 py-1 rounded">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="font-medium">Ready</span>
          </div>
        )}

        {videoError && (
          <div className="absolute bottom-2 left-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
            {videoError}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-center gap-3">
        {onToggleCamera && (
          <button
            onClick={onToggleCamera}
            className={`
              flex items-center justify-center w-12 h-12 rounded-full
              transition-colors duration-200
              ${
                cameraEnabled
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }
            `}
            title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            {cameraEnabled ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            )}
          </button>
        )}

        {onToggleMicrophone && (
          <button
            onClick={onToggleMicrophone}
            className={`
              flex items-center justify-center w-12 h-12 rounded-full
              transition-colors duration-200
              ${
                microphoneEnabled
                  ? 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }
            `}
            title={microphoneEnabled ? 'Mute microphone' : 'Unmute microphone'}
          >
            {microphoneEnabled ? (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            ) : (
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Quality Indicators */}
      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${cameraEnabled ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span>Camera {cameraEnabled ? 'On' : 'Off'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${microphoneEnabled ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span>Microphone {microphoneEnabled ? 'On' : 'Off'}</span>
        </div>
      </div>
    </div>
  );
}
