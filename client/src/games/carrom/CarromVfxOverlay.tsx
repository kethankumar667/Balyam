import React, { useEffect, useRef } from "react";

export interface VfxParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

export interface VfxShockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

export interface CarromVfxProps {
  lastCombo?: string | null;
  activeImpact?: { x: number; y: number; power: number } | null;
  strikerPos?: { x: number; y: number; speed: number } | null;
}

/**
 * High-performance 60fps VFX overlay for Carrom:
 * - Particle spark/chalk dust bursts on coin collisions
 * - Expanding circular shockwave rings on heavy strikes
 * - Floating celebration callout banners (Miniclip style)
 */
export function CarromVfxOverlay({
  lastCombo,
  activeImpact,
  strikerPos,
}: CarromVfxProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<VfxParticle[]>([]);
  const shockwavesRef = useRef<VfxShockwave[]>([]);
  const prevComboRef = useRef<string | null>(null);
  const [activeBanner, setActiveBanner] = React.useState<string | null>(null);

  // Trigger floating celebration banner when a combo or special pot occurs
  useEffect(() => {
    if (lastCombo && lastCombo !== prevComboRef.current) {
      prevComboRef.current = lastCombo;
      setActiveBanner(lastCombo);
      const timer = setTimeout(() => {
        setActiveBanner(null);
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [lastCombo]);

  // Spawn shockwave and chalk particles on strike impact
  useEffect(() => {
    if (!activeImpact) return;
    const { x, y, power } = activeImpact;
    const p = Math.max(0.2, Math.min(1, power));

    // Shockwave
    shockwavesRef.current.push({
      x,
      y,
      radius: 2,
      maxRadius: 16 * p,
      alpha: 0.85,
      color: p > 0.7 ? "#FEF08A" : "#FFFFFF",
    });

    // Chalk dust particles
    const particleCount = Math.floor(6 + 8 * p);
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.5 + Math.random() * 1.5) * p;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 0.6 + Math.random() * 0.8,
        color: Math.random() > 0.4 ? "#FFFFFF" : "#FBBF24",
        alpha: 0.9,
        decay: 0.035 + Math.random() * 0.03,
      });
    }
  }, [activeImpact]);

  // 60fps render loop for canvas particles & shockwaves
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function render() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const scaleX = canvas.width / 100;
      const scaleY = canvas.height / 100;

      // Draw shockwaves
      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
        const sw = shockwavesRef.current[i];
        sw.radius += 0.8;
        sw.alpha *= 0.88;

        if (sw.radius >= sw.maxRadius || sw.alpha < 0.04) {
          shockwavesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x * scaleX, sw.y * scaleY, sw.radius * scaleX, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.alpha;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      // Draw particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.alpha -= p.decay;

        if (p.alpha <= 0.02) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x * scaleX, p.y * scaleY, p.radius * scaleX, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden flex items-center justify-center">
      {/* 2D Canvas for Particle Physics & Shockwaves */}
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        className="w-full h-full object-contain"
      />

      {/* Floating Celebration Banner Toast (Miniclip style) */}
      {activeBanner && (
        <div className="absolute top-1/3 -translate-y-1/2 flex flex-col items-center animate-bounce">
          <div
            className="px-5 py-2 rounded-2xl shadow-2xl border-2 border-amber-300 flex items-center gap-2 backdrop-blur-md"
            style={{
              background: "linear-gradient(135deg, rgba(120, 53, 15, 0.92) 0%, rgba(217, 119, 6, 0.92) 100%)",
              boxShadow: "0 0 24px rgba(245, 158, 11, 0.7), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
            }}
          >
            <span className="text-sm font-black uppercase tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {activeBanner}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default CarromVfxOverlay;
