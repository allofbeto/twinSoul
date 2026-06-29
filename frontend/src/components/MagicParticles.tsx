import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  baseSpeedX: number;
  baseSpeedY: number;
  opacity: number;
  opacitySpeed: number;
}

const MagicParticles = () => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -999, y: -999 });

  useEffect(() => {
    if (user?.theme !== 'magic') return;

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

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    const handleMouseLeave = () => {
      mouseRef.current = { x: -999, y: -999 };
    };
    window.addEventListener('mouseleave', handleMouseLeave);

    const particles: Particle[] = Array.from({ length: 120 }, () => {
      const speedX = (Math.random() - 0.5) * 0.8;
      const speedY = (Math.random() - 0.5) * 0.8 - 0.3;
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 1.2 + 0.2,
        speedX,
        speedY,
        baseSpeedX: speedX,
        baseSpeedY: speedY,
        opacity: Math.random(),
        opacitySpeed: Math.random() * 0.012 + 0.005,
      };
    });

    const MOUSE_RADIUS = 100;
    const REPEL_STRENGTH = 3;

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mouse = mouseRef.current;

      particles.forEach((p) => {
        // mouse repel
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MOUSE_RADIUS) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
          p.speedX += (dx / dist) * force * REPEL_STRENGTH * 0.1;
          p.speedY += (dy / dist) * force * REPEL_STRENGTH * 0.1;
        } else {
          // drift back to base speed
          p.speedX += (p.baseSpeedX - p.speedX) * 0.05;
          p.speedY += (p.baseSpeedY - p.speedY) * 0.05;
        }

        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity += p.opacitySpeed;

        if (p.opacity > 1 || p.opacity < 0) p.opacitySpeed *= -1;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity * 0.6})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity * 0.1})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [user?.theme]);

  if (user?.theme !== 'magic') return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

export default MagicParticles;