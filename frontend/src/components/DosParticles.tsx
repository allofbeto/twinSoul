import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const CHARS = '01001101000111001001110100111001001アイウエオカキクケコサシスセソタチツテトナニヌネノ日月火水木金土年月日時分秒①②③④⑤⑥⑦⑧⑨⑩∑∆∏∫≠≤≥∞√πΩαβγδεζηθλμξρστφψ!@#$%^&*()[]{}\\|<>?/=+-_~';

interface Column {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  length: number;
  opacity: number;
}

const DosParticles = () => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -999, y: -999 });

  useEffect(() => {
    if (user?.theme !== 'dos') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fontSize = 12;
    let cols: number;
    let columns: Column[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.floor(canvas.width / fontSize);
      columns = Array.from({ length: Math.floor(cols / 8) }, (_, i) => ({
        x: i * fontSize * 8,
        y: Math.random() * -canvas.height,
        speed: Math.random() * 0.4 + 0.1,
        chars: Array.from({ length: 30 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
        length: Math.floor(Math.random() * 20) + 10,
        opacity: Math.random() * 0.1 + 0.03,
      }));
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

    const MOUSE_RADIUS = 120;
    let frame = 0;
    let animationId: number;

    const animate = () => {
      frame++;
      ctx.fillStyle = 'rgba(10, 10, 10, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const mouse = mouseRef.current;

      columns.forEach((col) => {
        const dx = col.x - mouse.x;
        const dy = col.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speedBoost = dist < MOUSE_RADIUS
          ? (1 - dist / MOUSE_RADIUS) * 4
          : 0;

        if (frame % 2 === 0) {
          col.chars = col.chars.map(() =>
            CHARS[Math.floor(Math.random() * CHARS.length)]
          );
        }

        col.chars.slice(0, col.length).forEach((char, i) => {
          const charY = col.y - i * fontSize;
          if (charY < 0 || charY > canvas.height) return;

          const isFront = i === 0;
          const alpha = isFront
            ? Math.min(1, col.opacity * 2)
            : col.opacity * (1 - i / col.length);

          ctx.fillStyle = isFront
            ? `rgba(180, 255, 180, ${alpha})`
            : `rgba(0, 255, 65, ${alpha})`;

          if (isFront) {
            ctx.shadowColor = '#00ff41';
            ctx.shadowBlur = dist < MOUSE_RADIUS ? 15 : 6;
          } else {
            ctx.shadowBlur = 0;
          }

          ctx.font = `${fontSize}px 'Share Tech Mono', monospace`;
          ctx.fillText(char, col.x, charY);
        });

        ctx.shadowBlur = 0;
        col.y += col.speed + speedBoost;

        if (col.y - col.length * fontSize > canvas.height) {
          col.y = Math.random() * -100;
          col.speed = Math.random() * 0.4 + 0.1;
          col.length = Math.floor(Math.random() * 20) + 10;
          col.opacity = Math.random() * 0.1 + 0.03;
        }
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

  if (user?.theme !== 'dos') return null;

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
        zIndex: 1,
        opacity: 0.15,
      }}
    />
  );
};

export default DosParticles;