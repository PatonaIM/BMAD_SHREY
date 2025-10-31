'use client';

import React, { useEffect, useRef } from 'react';

interface AISpeakingAnimationProps {
  isSpeaking: boolean;
  audioLevel?: number; // 0-1 range
  size?: number;
  className?: string;
}

export function AISpeakingAnimation({
  isSpeaking,
  audioLevel = 0.5,
  size = 80,
  className = '',
}: AISpeakingAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;
    const baseRadius = size / 4;

    let phase = 0;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      if (isSpeaking) {
        // Draw animated waveform circles
        const rings = 3;
        for (let i = 0; i < rings; i++) {
          const ringPhase = phase + (i * Math.PI) / 3;
          const amplitude = audioLevel * 15 + 5;
          const radius = baseRadius + i * 15;
          const opacity = 0.3 - i * 0.1;

          ctx.beginPath();
          for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
            const wave = Math.sin(angle * 3 + ringPhase) * amplitude;
            const r = radius + wave;
            const x = centerX + r * Math.cos(angle);
            const y = centerY + r * Math.sin(angle);

            if (angle === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.closePath();

          // Gradient fill
          const gradient = ctx.createRadialGradient(
            centerX,
            centerY,
            0,
            centerX,
            centerY,
            radius + amplitude
          );
          gradient.addColorStop(0, `rgba(59, 130, 246, ${opacity})`); // blue-500
          gradient.addColorStop(1, `rgba(147, 197, 253, ${opacity})`); // blue-300

          ctx.fillStyle = gradient;
          ctx.fill();

          // Glow effect
          ctx.strokeStyle = `rgba(96, 165, 250, ${opacity * 0.5})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Central pulsing dot
        const pulseRadius = baseRadius * (0.5 + audioLevel * 0.3);
        const gradient = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          pulseRadius
        );
        gradient.addColorStop(0, 'rgba(59, 130, 246, 1)'); // blue-500
        gradient.addColorStop(1, 'rgba(96, 165, 250, 0.3)'); // blue-400

        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        phase += 0.1;
      } else {
        // Idle state - simple static circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(107, 114, 128, 0.3)'; // gray-500
        ctx.fill();
        ctx.strokeStyle = 'rgba(107, 114, 128, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isSpeaking, audioLevel, size]);

  return (
    <div className={`relative inline-block ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="rounded-full"
      />
      {isSpeaking && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <span className="text-xs text-blue-600 font-medium animate-pulse">
            AI Speaking...
          </span>
        </div>
      )}
    </div>
  );
}
