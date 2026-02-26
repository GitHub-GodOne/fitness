'use client';

import { useEffect, useRef } from 'react';

interface TrailPoint {
  x: number;
  y: number;
  timestamp: number;
}

export function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<TrailPoint[]>([]);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if ('ontouchstart' in window) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMouseMove = (e: MouseEvent) => {
      pointsRef.current.push({ x: e.clientX, y: e.clientY, timestamp: Date.now() });
      if (pointsRef.current.length > 20) pointsRef.current.shift();
    };
    window.addEventListener('mousemove', onMouseMove);

    const TRAIL_DURATION = 300;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();
      pointsRef.current = pointsRef.current.filter((p) => now - p.timestamp < TRAIL_DURATION);

      for (let i = 0; i < pointsRef.current.length; i++) {
        const point = pointsRef.current[i];
        const age = now - point.timestamp;
        const life = 1 - age / TRAIL_DURATION;
        const radius = life * 6;
        const opacity = life * 0.6;

        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(249, 115, 22, ${opacity})`;
        ctx.shadowColor = 'rgba(249, 115, 22, 0.4)';
        ctx.shadowBlur = radius * 2;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };
    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      aria-hidden="true"
    />
  );
}
