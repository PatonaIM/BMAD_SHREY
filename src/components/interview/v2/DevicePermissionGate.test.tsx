import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DevicePermissionGate } from './DevicePermissionGate';
import ReactDOM from 'react-dom/client';

// Helper to render component into jsdom
function render(el: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOM.createRoot(container);
  root.render(el);
  return { container, root };
}

describe('DevicePermissionGate', () => {
  // Common environment stubs
  beforeEach(() => {
    // Stub HTMLMediaElement.play to avoid rejection in jsdom
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (HTMLMediaElement.prototype as any).play = () => Promise.resolve();
    // Minimal AudioContext stub
    class FakeAudioContext {
      createMediaStreamSource(): { connect: () => void } {
        return { connect: () => {} };
      }
      createAnalyser(): {
        fftSize: number;
        frequencyBinCount: number;
        getByteFrequencyData: (_arr: Uint8Array) => void;
      } {
        return {
          fftSize: 0,
          frequencyBinCount: 1,
          getByteFrequencyData: () => {},
        };
      }
      close(): void {}
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).AudioContext = FakeAudioContext;
  });
  it('dispatches interview:permissions_ready on successful permission grant', async () => {
    const mockStream = {
      id: 'test',
      active: true,
      getAudioTracks: () => [],
      getVideoTracks: () => [],
      getTracks: () => [],
      getTrackById: () => null,
      addTrack: () => {},
      removeTrack: () => {},
      clone: () => mockStream as unknown as MediaStream,
      onaddtrack: null,
      onremovetrack: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    } as unknown as MediaStream;

    // Mock getUserMedia resolves immediately
    const nav = (globalThis.navigator || ({} as Navigator)) as Navigator;
    type NavWithMock = Navigator & {
      mediaDevices: { getUserMedia: ReturnType<typeof vi.fn> };
    };
    const navWithMock = nav as unknown as NavWithMock;
    // Ensure mediaDevices object exists
    if (!(nav as unknown as { mediaDevices?: unknown }).mediaDevices) {
      (nav as unknown as { mediaDevices: Partial<MediaDevices> }).mediaDevices =
        {};
    }
    const mediaDevicesMock = navWithMock.mediaDevices as unknown as {
      getUserMedia: ReturnType<typeof vi.fn>;
    };
    mediaDevicesMock.getUserMedia = vi.fn().mockResolvedValue(mockStream);

    const eventPromise = new Promise<CustomEvent>(resolve => {
      window.addEventListener(
        'interview:permissions_ready',
        e => resolve(e as CustomEvent),
        { once: true }
      );
    });

    render(<DevicePermissionGate applicationId="app-123" />);

    const evt = await eventPromise; // waits for dispatch
    expect(evt.detail).toEqual({ applicationId: 'app-123' });
    expect(navWithMock.mediaDevices.getUserMedia).toHaveBeenCalledOnce();
  });

  it('shows denied state when getUserMedia rejects and does not dispatch ready event', async () => {
    const error = new Error('Permission denied');
    const nav = (globalThis.navigator || ({} as Navigator)) as Navigator;
    type NavWithMock = Navigator & {
      mediaDevices: { getUserMedia: ReturnType<typeof vi.fn> };
    };
    const navWithMock = nav as unknown as NavWithMock;
    if (!(nav as unknown as { mediaDevices?: unknown }).mediaDevices) {
      (nav as unknown as { mediaDevices: Partial<MediaDevices> }).mediaDevices =
        {};
    }
    const mediaDevicesMock = navWithMock.mediaDevices as unknown as {
      getUserMedia: ReturnType<typeof vi.fn>;
    };
    mediaDevicesMock.getUserMedia = vi.fn().mockRejectedValue(error);

    let readyDispatched = false;
    const listener = () => {
      readyDispatched = true;
    };
    window.addEventListener('interview:permissions_ready', listener);

    const { container } = render(
      <DevicePermissionGate applicationId="app-456" />
    );

    // Allow microtask queue & state updates to flush
    await new Promise(r => setTimeout(r, 10));

    expect(readyDispatched).toBe(false);
    expect(container.textContent).toMatch(/Permissions denied/i);
    window.removeEventListener('interview:permissions_ready', listener);
  });
});
