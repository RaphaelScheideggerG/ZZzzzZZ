import { useEffect, useRef } from 'react';

type StarryBackgroundProps = {
  zIndex?: number;
};

export default function StarryBackground({
  zIndex = 0,
}: StarryBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 70 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.4,
      alpha: Math.random(),
      speed: Math.random() * 0.015 + 0.005,
      increasing: Math.random() > 0.5,
    }));

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (const star of stars) {
        if (!reduceMotion) {
          if (star.increasing) {
            star.alpha += star.speed;
            if (star.alpha >= 1) star.increasing = false;
          } else {
            star.alpha -= star.speed;
            if (star.alpha <= 0.1) star.increasing = true;
          }
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha.toFixed(2)})`;

        if (star.size > 1.5) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = 'rgba(230, 73, 128, 0.6)';
        }

        ctx.fill();
        ctx.restore();
      }

      if (!reduceMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex,
      }}
    />
  );
}