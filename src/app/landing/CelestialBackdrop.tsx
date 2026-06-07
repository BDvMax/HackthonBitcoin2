"use client";

import { useEffect, useRef } from "react";

type CelestialBackdropProps = {
  className?: string;
};

type Star = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speed: number;
  phase: number;
};

export function CelestialBackdrop({ className }: CelestialBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let animationId = 0;
    let stars: Star[] = [];
    const pointer = { x: 0, y: 0 };
    const smoothPointer = { x: 0, y: 0 };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth * ratio;
      canvas.height = innerHeight * ratio;
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const amount = Math.floor((innerWidth * innerHeight) / 7800);
      stars = Array.from({ length: amount }, () => ({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        radius: Math.random() * 1.25 + 0.25,
        alpha: Math.random() * 0.56 + 0.16,
        speed: Math.random() * 0.25 + 0.08,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const render = () => {
      frame += 0.006;
      const width = window.innerWidth;
      const height = window.innerHeight;

      context.clearRect(0, 0, width, height);

      smoothPointer.x += (pointer.x - smoothPointer.x) * 0.045;
      smoothPointer.y += (pointer.y - smoothPointer.y) * 0.045;

      const scroll = Math.min(window.scrollY / Math.max(height, 1), 1.4);

      for (const star of stars) {
        const driftX = smoothPointer.x * 10 + Math.sin(frame * star.speed + star.phase) * 2.4;
        const driftY = smoothPointer.y * 7 + scroll * 8 + Math.cos(frame * star.speed + star.phase) * 1.8;
        const x = (star.x + driftX + width) % width;
        const y = (star.y + driftY + height) % height;
        const shimmer = Math.sin(frame * 6 + star.phase) * 0.16;
        context.fillStyle = `rgba(236, 241, 255, ${Math.max(0, star.alpha + shimmer)})`;
        context.beginPath();
        context.arc(x, y, star.radius, 0, Math.PI * 2);
        context.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    resize();
    render();
    const handlePointerMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
