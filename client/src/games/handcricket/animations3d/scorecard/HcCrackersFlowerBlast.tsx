import { useEffect, useRef, useState } from "react";
import type { HcSkin } from "../../hc-skin";
import { HapticsManager } from "../../../../services/HapticsManager";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation: number;
  vRot: number;
  kind: "spark" | "rose" | "marigold" | "jasmine" | "crackle";
}

interface Rocket {
  x: number;
  y: number;
  targetY: number;
  speed: number;
  color: string;
  exploded: boolean;
}

export function HcCrackersFlowerBlast({
  skin = "broadcast",
  onComplete,
}: {
  skin?: HcSkin;
  onComplete?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visible, setVisible] = useState(true);
  const [bannerVisible] = useState(true);

  // Auto-dismiss after exactly 5 seconds
  useEffect(() => {
    const tDismiss = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 5000);

    // Initial celebratory haptic pattern
    HapticsManager.trigger("win");
    const tHaptic2 = setTimeout(() => HapticsManager.trigger("reward"), 1200);
    const tHaptic3 = setTimeout(() => HapticsManager.trigger("win"), 2400);

    return () => {
      clearTimeout(tDismiss);
      clearTimeout(tHaptic2);
      clearTimeout(tHaptic3);
    };
  }, [onComplete]);

  // Canvas particle physics for crackers + flower blast
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const particles: Particle[] = [];
    const rockets: Rocket[] = [];

    // Theme color palettes
    const palette =
      skin === "cricbuzz"
        ? ["#00B38A", "#10B981", "#34D399", "#FBBF24", "#38BDF8", "#F43F5E"]
        : skin === "doordarshan"
        ? ["#F59E0B", "#EF4444", "#FDE047", "#10B981", "#FFFFFF", "#F97316"]
        : skin === "nostalgia"
        ? ["#2563EB", "#DC2626", "#16A34A", "#EAB308", "#9333EA", "#F97316"]
        : ["#F59E0B", "#EF4444", "#FBBF24", "#EC4899", "#8B5CF6", "#10B981"];

    const flowerColors = {
      rose: skin === "nostalgia" ? "#EF4444" : "#DC2626",
      marigold: skin === "nostalgia" ? "#F59E0B" : "#FBBF24",
      jasmine: "#FFFBEB",
    };

    function spawnExplosion(x: number, y: number, color: string) {
      // Crackers burst sparks
      const sparkCount = skin === "cricbuzz" ? 35 : 45;
      for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 7 + 2;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 3.5 + 1.5,
          color,
          alpha: 1,
          decay: Math.random() * 0.025 + 0.015,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.1,
          kind: "spark",
        });
      }

      // Crackle micro-pops
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 1;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 2 + 1,
          color: "#FFFFFF",
          alpha: 1,
          decay: Math.random() * 0.04 + 0.03,
          rotation: 0,
          vRot: 0,
          kind: "crackle",
        });
      }

      // Flower blast petals erupting from burst point
      const flowerCount = 18;
      for (let i = 0; i < flowerCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 1.5;
        const r = Math.random();
        const kind = r < 0.45 ? "marigold" : r < 0.8 ? "rose" : "jasmine";
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5, // slight upward flutter
          size: Math.random() * 7 + 7,
          color: flowerColors[kind],
          alpha: 1,
          decay: Math.random() * 0.008 + 0.004, // linger longer!
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.08,
          kind,
        });
      }
    }

    // Continuously drop flower petals from top
    let petalDropTimer = 0;
    function spawnTopPetals() {
      for (let i = 0; i < 4; i++) {
        const r = Math.random();
        const kind = r < 0.5 ? "marigold" : r < 0.85 ? "rose" : "jasmine";
        particles.push({
          x: Math.random() * width,
          y: -20,
          vx: (Math.random() - 0.5) * 2.5,
          vy: Math.random() * 2 + 1.8,
          size: Math.random() * 8 + 8,
          color: flowerColors[kind],
          alpha: 1,
          decay: Math.random() * 0.005 + 0.003,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.06,
          kind,
        });
      }
    }

    // Launch periodic firecracker rockets from bottom
    let rocketTimer = 0;
    function launchRocket() {
      const startX = width * (0.15 + Math.random() * 0.7);
      const targetY = height * (0.18 + Math.random() * 0.35);
      rockets.push({
        x: startX,
        y: height + 10,
        targetY,
        speed: Math.random() * 6 + 13,
        color: palette[Math.floor(Math.random() * palette.length)],
        exploded: false,
      });
    }

    // Launch initial salvo immediately
    launchRocket();
    setTimeout(launchRocket, 250);
    setTimeout(launchRocket, 600);

    const startTime = Date.now();

    function drawPetal(p: Particle) {
      if (!ctx) return;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;

      if (p.kind === "rose") {
        // Heart-curved rose petal
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-p.size / 2, -p.size / 2, -p.size, p.size / 3, 0, p.size);
        ctx.bezierCurveTo(p.size, p.size / 3, p.size / 2, -p.size / 2, 0, 0);
        ctx.fill();
      } else if (p.kind === "marigold") {
        // Rounded rich marigold floret
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.65, p.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        // Inner golden accent
        ctx.fillStyle = "#D97706";
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "jasmine") {
        // Delicate teardrop jasmine petal
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.55, p.size * 0.3, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function loop() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const elapsed = Date.now() - startTime;

      // Keep launching fireworks for first 4.2 seconds
      if (elapsed < 4200) {
        rocketTimer++;
        if (rocketTimer % 28 === 0) {
          launchRocket();
        }
        petalDropTimer++;
        if (petalDropTimer % 10 === 0) {
          spawnTopPetals();
        }
      }

      // Update & render rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.y -= r.speed;

        // Spark trail behind rocket
        particles.push({
          x: r.x + (Math.random() - 0.5) * 4,
          y: r.y + 4,
          vx: (Math.random() - 0.5) * 1.5,
          vy: Math.random() * 2 + 1,
          size: Math.random() * 2 + 1,
          color: "#FDE047",
          alpha: 0.9,
          decay: 0.06,
          rotation: 0,
          vRot: 0,
          kind: "spark",
        });

        if (r.y <= r.targetY && !r.exploded) {
          r.exploded = true;
          spawnExplosion(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }

      // Update & render particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;
        p.alpha -= p.decay;

        if (p.kind === "spark" || p.kind === "crackle") {
          p.vy += 0.12; // gravity
          p.vx *= 0.96; // air drag
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          // Petal drift physics with gentle wind sway
          p.vy += 0.025;
          p.vx += Math.sin(p.y * 0.02) * 0.08;
          p.vx *= 0.98;
          drawPetal(p);
        }

        if (p.alpha <= 0 || p.y > height + 40) {
          particles.splice(i, 1);
        }
      }

      if (elapsed < 5200 || particles.length > 0) {
        animId = requestAnimationFrame(loop);
      }
    }

    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
    };
  }, [skin]);

  if (!visible) return null;

  return (
    <div
      onClick={() => {
        setVisible(false);
        onComplete?.();
      }}
      className="pointer-events-auto fixed inset-0 z-[70] flex flex-col items-center justify-start cursor-pointer select-none transition-opacity duration-700"
      style={{ opacity: visible ? 1 : 0 }}
      title="Tap anywhere to dismiss celebration"
    >
      {/* 60fps Particle Canvas (Crackers + Flower Petals) */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      />

      {/* 5-Second Celebration Banner Overlay */}
      {bannerVisible && (
        <div className="relative z-10 mt-6 sm:mt-10 px-4 text-center animate-bounce">
          <div
            className={`inline-flex flex-col items-center rounded-2xl px-6 py-4 shadow-2xl backdrop-blur-md border ${
              skin === "cricbuzz"
                ? "bg-[#00261C]/90 border-[#00B38A]/60 text-white"
                : skin === "doordarshan"
                ? "bg-[#1F160E]/90 border-[#F59E0B]/70 text-[#FEF3C7]"
                : skin === "nostalgia"
                ? "bg-[#FFFBEB]/95 border-[#2563EB]/50 text-[#1E3A8A]"
                : "bg-slate-950/85 border-amber-400/60 text-white"
            }`}
          >
            <div className="flex items-center gap-2 text-2xl sm:text-3xl mb-1">
              <span>🎆</span>
              <span>🌸</span>
              <span>🏆</span>
              <span>🌺</span>
              <span>🎇</span>
            </div>
            <div
              className="text-xl sm:text-3xl font-black uppercase tracking-wider"
              style={{
                background:
                  skin === "cricbuzz"
                    ? "linear-gradient(180deg, #A7F3D0 0%, #34D399 50%, #059669 100%)"
                    : skin === "doordarshan"
                    ? "linear-gradient(180deg, #FEF08A 0%, #F59E0B 50%, #B45309 100%)"
                    : skin === "nostalgia"
                    ? "linear-gradient(180deg, #93C5FD 0%, #2563EB 55%, #1D4ED8 100%)"
                    : "linear-gradient(180deg, #FFFBEB 0%, #FBBF24 50%, #D97706 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              CHAMPION CELEBRATION!
            </div>
            <p className="text-xs sm:text-sm font-extrabold opacity-90 mt-1">
              🎆 Firing Crackers & 🌸 Flower Shower In Full Blast!
            </p>
            <span className="text-[10px] font-semibold opacity-60 mt-1 uppercase tracking-widest">
              Tap anywhere to dismiss
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
