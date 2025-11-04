'use client';

import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioLevel: number; // 0-1 range
  isActive?: boolean;
  barCount?: number;
  height?: number;
  className?: string;
}

export function AudioVisualizer({
  audioLevel,
  isActive = true,
  barCount = 12,
  height = 40,
  className = '',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    const barWidth = canvas.offsetWidth / barCount;
    const maxBarHeight = height;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Generate bar heights based on audio level
      for (let i = 0; i < barCount; i++) {
        // Create wave effect
        const wave = Math.sin((i / barCount) * Math.PI * 2 + Date.now() / 200);
        const randomness = Math.random() * 0.3 + 0.7; // 0.7-1.0
        const barHeight = isActive
          ? audioLevel * maxBarHeight * randomness * (wave * 0.3 + 0.7)
          : 2; // Minimal height when inactive

        const x = i * barWidth + barWidth * 0.2;
        const y = (maxBarHeight - barHeight) / 2;
        const width = barWidth * 0.6;

        // Gradient color based on audio level
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
        if (isActive && audioLevel > 0.5) {
          gradient.addColorStop(0, '#3b82f6'); // blue-500
          gradient.addColorStop(1, '#60a5fa'); // blue-400
        } else if (isActive && audioLevel > 0.2) {
          gradient.addColorStop(0, '#10b981'); // green-500
          gradient.addColorStop(1, '#34d399'); // green-400
        } else {
          gradient.addColorStop(0, '#6b7280'); // gray-500
          gradient.addColorStop(1, '#9ca3af'); // gray-400
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, barHeight);
      }

      if (isActive) {
        animationFrameRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioLevel, isActive, barCount, height]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: `${height}px` }}
        className="rounded-lg"
      />
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
          Microphone inactive
        </div>
      )}
    </div>
  );
}
