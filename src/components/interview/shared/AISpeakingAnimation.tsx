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
        // Draw animated waveform circles with enhanced visuals
        const rings = 4;
        for (let i = 0; i < rings; i++) {
          const ringPhase = phase + (i * Math.PI) / 2;
          const amplitude = audioLevel * 20 + 8;
          const radius = baseRadius + i * 18;
          const opacity = 0.4 - i * 0.08;

          ctx.beginPath();
          for (let angle = 0; angle < Math.PI * 2; angle += 0.08) {
            const wave = Math.sin(angle * 4 + ringPhase) * amplitude;
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

          // Enhanced gradient with multiple color stops
          const gradient = ctx.createRadialGradient(
            centerX,
            centerY,
            0,
            centerX,
            centerY,
            radius + amplitude
          );
          gradient.addColorStop(0, `rgba(59, 130, 246, ${opacity * 1.2})`); // blue-500
          gradient.addColorStop(0.5, `rgba(96, 165, 250, ${opacity})`); // blue-400
          gradient.addColorStop(1, `rgba(147, 197, 253, ${opacity * 0.6})`); // blue-300

          ctx.fillStyle = gradient;
          ctx.fill();

          // Enhanced glow effect with multiple strokes
          ctx.strokeStyle = `rgba(96, 165, 250, ${opacity * 0.8})`;
          ctx.lineWidth = 3;
          ctx.stroke();

          // Outer glow
          ctx.strokeStyle = `rgba(147, 197, 253, ${opacity * 0.4})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Central pulsing orb with more detail
        const pulseRadius = baseRadius * (0.6 + audioLevel * 0.4);

        // Outer glow halo
        const haloGradient = ctx.createRadialGradient(
          centerX,
          centerY,
          pulseRadius * 0.8,
          centerX,
          centerY,
          pulseRadius * 1.5
        );
        haloGradient.addColorStop(0, 'rgba(59, 130, 246, 0.6)');
        haloGradient.addColorStop(1, 'rgba(96, 165, 250, 0)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = haloGradient;
        ctx.fill();

        // Main orb
        const gradient = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          pulseRadius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // white center
        gradient.addColorStop(0.3, 'rgba(147, 197, 253, 1)'); // blue-300
        gradient.addColorStop(0.7, 'rgba(59, 130, 246, 1)'); // blue-500
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.8)'); // blue-600

        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Highlight shine effect
        const shineGradient = ctx.createRadialGradient(
          centerX - pulseRadius * 0.3,
          centerY - pulseRadius * 0.3,
          0,
          centerX - pulseRadius * 0.3,
          centerY - pulseRadius * 0.3,
          pulseRadius * 0.6
        );
        shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.fillStyle = shineGradient;
        ctx.fill();

        phase += 0.08;
      } else {
        // Enhanced idle state - subtle pulse
        const idlePulse = Math.sin(phase * 0.5) * 0.1 + 0.9;
        const idleRadius = baseRadius * idlePulse;

        // Outer ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, idleRadius * 1.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(107, 114, 128, 0.15)'; // gray-500
        ctx.fill();

        // Main circle with gradient
        const gradient = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          idleRadius
        );
        gradient.addColorStop(0, 'rgba(156, 163, 175, 0.5)'); // gray-400
        gradient.addColorStop(1, 'rgba(107, 114, 128, 0.3)'); // gray-500

        ctx.beginPath();
        ctx.arc(centerX, centerY, idleRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = 'rgba(107, 114, 128, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        phase += 0.02;
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
