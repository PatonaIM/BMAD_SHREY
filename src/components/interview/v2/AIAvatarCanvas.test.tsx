import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom/vitest';
import { AIAvatarCanvas } from './AIAvatarCanvas';

// Mock Three.js and React Three Fiber
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="three-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
}));

vi.mock('@react-three/drei', () => {
  const mockFn = vi.fn(() => ({
    scene: {
      traverse: vi.fn(),
    },
  }));
  Object.assign(mockFn, { preload: vi.fn() });

  return {
    OrbitControls: () => <div data-testid="orbit-controls" />,
    useGLTF: mockFn,
  };
});

vi.mock('three', () => ({
  Group: class Group {},
  Mesh: class Mesh {},
  SkinnedMesh: class SkinnedMesh {},
}));

describe('AIAvatarCanvas', () => {
  beforeEach(() => {
    // Reset canvas mock
    vi.clearAllMocks();
  });

  describe('WebGL Support', () => {
    it('renders canvas when WebGL is supported', () => {
      // Mock WebGL support
      const mockGetContext = vi.fn(
        () => ({})
      ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = mockGetContext;

      const { getByText } = render(<AIAvatarCanvas isSpeaking={false} />);

      // Should show loading state initially
      expect(getByText(/initializing 3d view/i)).toBeInTheDocument();
    });

    it('renders fallback when WebGL is not supported', () => {
      // Mock WebGL not supported
      const mockGetContext = vi.fn(
        () => null
      ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = mockGetContext;

      const { getByText } = render(<AIAvatarCanvas isSpeaking={false} />);

      // Should show fallback with AI Interviewer text
      expect(getByText(/ai interviewer/i)).toBeInTheDocument();
    });
  });

  describe('Speaking State', () => {
    it('renders without speaking indicator when not speaking', () => {
      const mockGetContext = vi.fn(
        () => null
      ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = mockGetContext;

      const { getByText } = render(<AIAvatarCanvas isSpeaking={false} />);

      expect(getByText(/listening/i)).toBeInTheDocument();
    });

    it('displays speaking indicator when isSpeaking is true', () => {
      const mockGetContext = vi.fn(
        () => null
      ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = mockGetContext;

      const { getAllByText } = render(<AIAvatarCanvas isSpeaking={true} />);

      const speakingIndicators = getAllByText(/speaking/i);
      expect(speakingIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Fallback Rendering', () => {
    beforeEach(() => {
      // Mock WebGL not supported
      const mockGetContext = vi.fn(
        () => null
      ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = mockGetContext;
    });

    it('renders static fallback with emoji when WebGL unavailable', () => {
      const { getByText } = render(<AIAvatarCanvas isSpeaking={false} />);

      expect(getByText('🤖')).toBeInTheDocument();
      expect(getByText(/ai interviewer/i)).toBeInTheDocument();
    });

    it('shows animated rings when speaking in fallback mode', () => {
      const { container } = render(<AIAvatarCanvas isSpeaking={true} />);

      const animatedElements = container.querySelectorAll('.animate-ping');
      expect(animatedElements.length).toBeGreaterThan(0);
    });

    it('displays correct status text based on speaking state', () => {
      const { getByText, rerender } = render(
        <AIAvatarCanvas isSpeaking={false} />
      );

      expect(getByText(/listening/i)).toBeInTheDocument();

      rerender(<AIAvatarCanvas isSpeaking={true} />);

      expect(getByText(/speaking/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides meaningful text content for screen readers', () => {
      // Mock WebGL not supported for predictable fallback
      const mockGetContext = vi.fn(
        () => null
      ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = mockGetContext;

      const { getByText } = render(<AIAvatarCanvas isSpeaking={false} />);

      expect(getByText(/ai interviewer/i)).toBeInTheDocument();
      expect(getByText(/listening/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('renders without crashing with WebGL support', () => {
      const mockGetContext = vi.fn(
        () => ({})
      ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = mockGetContext;

      const { container } = render(<AIAvatarCanvas isSpeaking={false} />);
      expect(container).toBeTruthy();
    });

    it('updates when isSpeaking prop changes', () => {
      const mockGetContext = vi.fn(
        () => null
      ) as unknown as typeof HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = mockGetContext;

      const { getAllByText, rerender } = render(
        <AIAvatarCanvas isSpeaking={false} />
      );

      // Change speaking state
      rerender(<AIAvatarCanvas isSpeaking={true} />);

      // Component should update - speaking indicator should appear
      const speakingIndicators = getAllByText(/speaking/i);
      expect(speakingIndicators.length).toBeGreaterThan(0);
    });
  });
});
