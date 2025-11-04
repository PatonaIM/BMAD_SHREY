'use client';

import React, { useState, useEffect } from 'react';
import { VideoRecordingManager } from '../../services/media/videoRecordingManager';

interface CameraPermissionCheckProps {
  onPermissionsGranted: (_stream: MediaStream) => void;
  onPermissionsDenied: (_error: Error) => void;
  className?: string;
}

export function CameraPermissionCheck({
  onPermissionsGranted,
  onPermissionsDenied,
  className = '',
}: CameraPermissionCheckProps) {
  const [status, setStatus] = useState<
    'checking' | 'requesting' | 'testing' | 'granted' | 'denied'
  >('checking');
  const [error, setError] = useState<string | null>(null);
  const [browserSupported, setBrowserSupported] = useState(true);
  const [audioLevel] = useState(0);
  const [devices] = useState<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
  }>({ cameras: [], microphones: [] });

  useEffect(() => {
    checkBrowserSupport();
  }, []);

  const checkBrowserSupport = () => {
    const supported = VideoRecordingManager.isSupported();
    setBrowserSupported(supported);

    if (!supported) {
      setStatus('denied');
      setError(
        'Your browser does not support video recording. Please use Chrome, Firefox, Edge, or Safari.'
      );
    } else {
      setStatus('checking');
    }
  };

  const requestPermissions = async () => {
    setStatus('requesting');
    setError(null);

    try {
      const manager = new VideoRecordingManager();

      await manager.requestPermissions();

      const stream = manager.getMediaStream();

      if (!stream) {
        throw new Error('No media stream available after permissions granted');
      }

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (!videoTrack || !audioTrack) {
        throw new Error('Missing video or audio track in media stream');
      }

      setStatus('granted');
      onPermissionsGranted(stream);
    } catch (err) {
      const error = err as Error;
      setStatus('denied');
      setError(error.message);

      if (onPermissionsDenied) {
        onPermissionsDenied(error);
      }
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'checking':
      case 'requesting':
        return (
          <svg
            className="animate-spin h-16 w-16 text-blue-500"
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
        );
      case 'testing':
        return (
          <svg
            className="h-16 w-16 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
        );
      case 'granted':
        return (
          <svg
            className="h-16 w-16 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
      case 'denied':
        return (
          <svg
            className="h-16 w-16 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'checking':
        return 'Checking browser compatibility...';
      case 'requesting':
        return 'Please allow access to your camera and microphone';
      case 'testing':
        return 'Testing audio quality... Please speak to test your microphone';
      case 'granted':
        return 'Permissions granted! You are ready to start the interview.';
      case 'denied':
        return 'Permissions denied or browser not supported';
    }
  };

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Status Icon */}
        <div className="flex justify-center mb-6">{getStatusIcon()}</div>

        {/* Status Message */}
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
          Camera & Microphone Setup
        </h2>
        <p className="text-center text-gray-600 mb-6">{getStatusMessage()}</p>

        {/* Audio Level Indicator (during testing) */}
        {status === 'testing' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Microphone Level</span>
              <span className="text-sm font-medium text-gray-800">
                {Math.round(audioLevel * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-4 rounded-full transition-all duration-100 ${
                  audioLevel > 0.6
                    ? 'bg-green-500'
                    : audioLevel > 0.3
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${audioLevel * 100}%` }}
              />
            </div>
            {audioLevel < 0.2 && (
              <p className="text-xs text-yellow-600 mt-2">
                Microphone level is low. Please speak louder or check your
                microphone settings.
              </p>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
            {status === 'denied' && (
              <div className="mt-3 text-sm text-red-700">
                <p className="font-medium mb-2">To fix this:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    Check your browser's address bar for permission prompts
                  </li>
                  <li>
                    Go to browser settings and enable camera/microphone for this
                    site
                  </li>
                  <li>Restart your browser and try again</li>
                  <li>Make sure no other application is using your camera</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Device Info (when granted) */}
        {status === 'granted' && devices && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-medium text-green-800 mb-2">
              Detected Devices
            </h3>
            <div className="text-sm text-green-700 space-y-1">
              <p>📹 Cameras: {devices.cameras.length}</p>
              <p>🎤 Microphones: {devices.microphones.length}</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        {status === 'checking' && browserSupported && (
          <button
            onClick={requestPermissions}
            className="w-full btn-primary py-3 text-base font-medium"
          >
            Request Camera & Microphone Access
          </button>
        )}

        {status === 'denied' && browserSupported && (
          <button
            onClick={requestPermissions}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-base font-medium transition-colors"
          >
            Try Again
          </button>
        )}

        {/* Browser Requirements */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Requirements:
          </h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>✓ Modern browser (Chrome, Firefox, Edge, Safari)</li>
            <li>✓ Working camera and microphone</li>
            <li>✓ Stable internet connection (minimum 1 Mbps upload)</li>
            <li>✓ Quiet environment recommended</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
