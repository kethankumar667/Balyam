import { useEffect, useRef, memo } from "react";
import { getPrefersReducedMotion } from "../../hooks/useReducedMotion";
import { Crown, Zap } from "lucide-react";

export interface HyperspaceWarpProps {
  onDismiss: () => void;
}

function HyperspaceWarp({ onDismiss }: HyperspaceWarpProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (getPrefersReducedMotion()) {
      const timer = setTimeout(onDismiss, 2000);
      return () => clearTimeout(timer);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const numStars = 250;
    interface Star {
      x: number;
      y: number;
      z: number;
      pz: number;
      color: string;
    }

    const starColors = ["#FFD700", "#38BDF8", "#F59E0B", "#F43F5E", "#FFFFFF", "#A855F7"];
    const stars: Star[] = Array.from({ length: numStars }, () => ({
      x: (Math.random() - 0.5) * width * 2,
      y: (Math.random() - 0.5) * height * 2,
      z: Math.random() * width,
      pz: width,
      color: starColors[Math.floor(Math.random() * starColors.length)],
    }));

    let startTime = Date.now();

    const render = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > 2800) {
        onDismiss();
        return;
      }

      ctx.fillStyle = "rgba(5, 5, 16, 0.28)";
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const speed = Math.min(48, 12 + elapsed * 0.03);

      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.pz = star.z;
        star.z -= speed;

        if (star.z <= 0) {
          star.z = width;
          star.pz = width;
          star.x = (Math.random() - 0.5) * width * 2;
          star.y = (Math.random() - 0.5) * height * 2;
        }

        const sx = (star.x / star.z) * width + cx;
        const sy = (star.y / star.z) * height + cy;
        const px = (star.x / star.pz) * width + cx;
        const py = (star.y / star.pz) * height + cy;

        ctx.beginPath();
        ctx.strokeStyle = star.color;
        ctx.lineWidth = Math.min(4, (1 - star.z / width) * 4);
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }

      // Golden central singularity core
      const coreRadius = Math.min(180, elapsed * 0.08);
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
      gradient.addColorStop(0, "rgba(255, 215, 0, 0.9)");
      gradient.addColorStop(0.4, "rgba(245, 158, 11, 0.4)");
      gradient.addColorStop(1, "rgba(245, 158, 11, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-md cursor-pointer select-none animate-fade-in"
      role="dialog"
      aria-label="Hyperspace Singularity Event"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Cybernetic Telemetry Announcement */}
      <div className="relative z-10 text-center space-y-3 px-6 py-4 rounded-3xl bg-stone-950/80 border-2 border-amber-400/80 shadow-[0_0_60px_rgba(255,215,0,0.6)] backdrop-blur-xl max-w-md mx-4 animate-scale-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold tracking-widest">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>HYPERSPACE WARP ENGAGED</span>
        </div>

        <div className="flex items-center justify-center gap-2">
          <Crown className="w-7 h-7 text-amber-400 fill-amber-300 animate-bounce" />
          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 tracking-tight">
            QUANTUM SINGULARITY
          </h2>
        </div>

        <p className="text-xs font-mono text-amber-200/90 leading-relaxed">
          A.N.N.A. // Core resonance limit surpassed. Sovereign 2048 protocol online.
        </p>

        <span className="inline-block text-[11px] font-mono text-stone-400 pt-1">
          [Tap anywhere to return to console]
        </span>
      </div>
    </div>
  );
}

export default memo(HyperspaceWarp);
