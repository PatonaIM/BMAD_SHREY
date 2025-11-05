'use client';
import React, { useEffect, useRef, useState } from 'react';
import {
  detectBrowserInterviewSupport,
  runNetworkDiagnostics,
  setupAudioLevelMeter,
} from '../../../utils/interview/deviceSupport';

interface DevicePermissionGateProps {
  applicationId: string;
  className?: string;
  // NOTE: Cannot receive function prop from Server Component; stream ready event dispatched instead.
}

type PermissionState = 'awaiting' | 'granted' | 'denied';

export const DevicePermissionGate: React.FC<DevicePermissionGateProps> = ({
  applicationId,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [permissionState, setPermissionState] =
    useState<PermissionState>('awaiting');
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [network, setNetwork] = useState<{
    status: 'idle' | 'testing' | 'complete';
    latencyMs: number | null;
    classification: string;
  }>({ status: 'idle', latencyMs: null, classification: 'unknown' });
  const [support] = useState(() => detectBrowserInterviewSupport());
  const cleanupAudioRef = useRef<() => void>();

  async function requestPermissions() {
    setError(null);
    setPermissionState('awaiting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setPermissionState('granted');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      // Expose stream globally for subsequent realtime initialization (EP5-S2)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__interviewV2LocalStream = stream;
      } catch {
        /* no-op */
      }
      cleanupAudioRef.current = setupAudioLevelMeter(stream, lvl =>
        setAudioLevel(lvl)
      );
      // Notify via DOM event instead of callback to maintain RSC serialization rules
      window.dispatchEvent(
        new CustomEvent('interview:permissions_ready', {
          detail: { applicationId },
        })
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('analytics', {
            detail: { event: 'permission_granted', applicationId },
          })
        );
      }
    } catch (e: unknown) {
      setPermissionState('denied');
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as Record<string, unknown>).message)
          : 'Permission denied or unavailable';
      setError(msg);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('analytics', {
            detail: {
              event: 'permission_denied',
              reason:
                e && typeof e === 'object' && 'name' in e
                  ? String((e as Record<string, unknown>).name)
                  : 'unknown',
              applicationId,
            },
          })
        );
      }
    }
  }

  async function runNetworkTest() {
    setNetwork({
      status: 'testing',
      latencyMs: null,
      classification: 'unknown',
    });
    const result = await runNetworkDiagnostics();
    setNetwork({
      status: 'complete',
      latencyMs: result.latencyMs,
      classification: result.classification,
    });
  }

  useEffect(() => {
    if (support.browser !== 'safari') requestPermissions();
  }, [support.browser]);
  useEffect(
    () => () => {
      cleanupAudioRef.current?.();
    },
    []
  );

  const ariaStatus =
    permissionState === 'awaiting'
      ? 'Requesting camera and microphone permissions.'
      : permissionState === 'granted'
        ? 'Permissions granted. Preview active.'
        : 'Permissions denied. Retry needed.';

  return (
    <div
      className={`rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-900 ${className}`}
    >
      <div className="sr-only" aria-live="polite">
        {ariaStatus}
      </div>
      <h2 className="text-sm font-semibold mb-3">Device Readiness</h2>
      <div className="flex flex-wrap gap-2 text-xs mb-3">
        <Badge label="MediaDevices" ok={support.hasMediaDevices} />
        <Badge label="getUserMedia" ok={support.hasGetUserMedia} />
        <Badge label="WebRTC" ok={support.hasWebRTC} />
        <Badge label="WebSocket" ok={support.hasWebSocket} />
        <Badge label={support.browser} ok={support.browser !== 'unknown'} />
      </div>
      {permissionState === 'awaiting' && (
        <p className="text-xs text-muted-foreground mb-3">
          Awaiting permissions…
        </p>
      )}
      {permissionState === 'denied' && (
        <div className="mb-3 text-xs text-red-600 dark:text-red-400">
          <p className="font-medium">Permissions denied.</p>
          <p className="mt-1">
            Please grant camera & microphone access in your browser settings and
            retry.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="aspect-video bg-neutral-100 dark:bg-neutral-800 rounded flex items-center justify-center overflow-hidden">
          {permissionState === 'granted' ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
          ) : (
            <span className="text-xs text-muted-foreground">
              Camera preview unavailable
            </span>
          )}
        </div>
        <div className="rounded border border-neutral-200 dark:border-neutral-700 p-3 text-xs space-y-2">
          <div>
            <span className="font-medium">Audio Level:</span>
            <div className="h-2 w-full bg-neutral-200 dark:bg-neutral-700 rounded mt-1 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-primary to-brand-secondary transition-all"
                style={{
                  width: `${Math.min(100, Math.round(audioLevel * 100))}%`,
                }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Network:</span>
            <span className="uppercase font-semibold text-[10px] tracking-wide">
              {network.status === 'testing'
                ? 'TESTING'
                : network.classification}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            Latency:{' '}
            {network.latencyMs != null
              ? `${Math.round(network.latencyMs)}ms`
              : '—'}
          </div>
          <button
            type="button"
            onClick={runNetworkTest}
            className="btn-outline px-2 py-1 text-[11px]"
            disabled={network.status === 'testing'}
            aria-label="Run network latency test"
          >
            {network.status === 'testing' ? 'Testing…' : 'Run Network Test'}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {permissionState === 'denied' && (
          <button
            type="button"
            onClick={requestPermissions}
            className="btn-primary px-3 py-1.5 text-xs"
          >
            Retry Permissions
          </button>
        )}
        {support.browser === 'safari' && permissionState === 'awaiting' && (
          <button
            type="button"
            onClick={requestPermissions}
            className="btn-primary px-3 py-1.5 text-xs"
          >
            Request Permissions
          </button>
        )}
        {permissionState === 'granted' && (
          <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-[11px] font-medium">
            READY
          </span>
        )}
      </div>
      {error && (
        <div className="mt-3 text-xs text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
};

const Badge: React.FC<{ label: string; ok: boolean }> = ({ label, ok }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium ${ok ? 'border-green-300 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'border-neutral-300 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'}`}
  >
    {label}
    <svg
      className="w-3 h-3"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={ok ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'}
      />
    </svg>
  </span>
);
