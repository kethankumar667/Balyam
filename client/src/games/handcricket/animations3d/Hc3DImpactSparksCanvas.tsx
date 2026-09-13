import { useEffect, useRef } from "react";
import type { HcSkin } from "../hc-skin";

interface Spark {
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
  type: "spark" | "splinter" | "feather" | "star" | "cyber" | "confetti";
}

export function Hc3DImpactSparksCanvas({
  skin = "broadcast",
  mode = "sparks",
  intensity = 1,
}: {
  skin?: HcSkin;
  mode?: "sparks" | "splinters" | "duckFeathers" | "confetti" | "laserGrid";
  intensity?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    const particles: Spark[] = [];
    const centerX = width / 2;
    const centerY = height / 2;

    const colors =
      skin === "cricbuzz"
        ? ["#00B38A", "#10B981", "#34D399", "#FBBF24", "#38BDF8"]
        : skin === "doordarshan"
        ? ["#F59E0B", "#EF4444", "#FDE047", "#FFFFFF", "#F97316"]
        : skin === "nostalgia"
        ? ["#2563EB", "#DC2626", "#EAB308", "#16A34A", "#9333EA"]
        : ["#F59E0B", "#FBBF24", "#EF4444", "#FFFFFF", "#F97316"];

    // Spawn initial burst
    if (mode === "sparks") {
      const count = Math.floor(65 * intensity);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 12 + 3;
        particles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (Math.random() * 2),
          size: Math.random() * 4 + 1.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          decay: Math.random() * 0.02 + 0.015,
          rotation: 0,
          vRot: 0,
          type: "spark",
        });
      }
    } else if (mode === "splinters") {
      const count = Math.floor(45 * intensity);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 10 + 2;
        particles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          size: Math.random() * 10 + 4,
          color: Math.random() < 0.6 ? "#D97706" : "#FEF08A",
          alpha: 1,
          decay: Math.random() * 0.025 + 0.01,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.2,
          type: "splinter",
        });
      }
    } else if (mode === "duckFeathers") {
      const count = Math.floor(35 * intensity);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 7 + 1.5;
        const isStar = Math.random() < 0.35;
        particles.push({
          x: centerX + (Math.random() - 0.5) * 60,
          y: centerY - 20 + (Math.random() - 0.5) * 40,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          size: isStar ? Math.random() * 8 + 8 : Math.random() * 12 + 8,
          color: isStar ? "#FBBF24" : Math.random() < 0.5 ? "#FEF08A" : "#FFFFFF",
          alpha: 1,
          decay: Math.random() * 0.012 + 0.008,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.1,
          type: isStar ? "star" : "feather",
        });
      }
    } else if (mode === "confetti") {
      const count = Math.floor(70 * intensity);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: -20,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 4 + 2,
          size: Math.random() * 10 + 6,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1,
          decay: Math.random() * 0.007 + 0.005,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.12,
          type: "confetti",
        });
      }
    }

    function renderParticle(p: Spark) {
      if (!ctx) return;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;

      if (p.type === "spark") {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "splinter") {
        ctx.fillRect(-p.size / 2, -1.5, p.size, 3);
      } else if (p.type === "feather") {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.6, p.size * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "star") {
        ctx.font = `${Math.floor(p.size)}px sans-serif`;
        ctx.fillText("⭐", -p.size / 2, p.size / 2);
      } else if (p.type === "confetti") {
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      }
      ctx.restore();
    }

    function loop() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;
        p.alpha -= p.decay;

        if (p.type === "spark") {
          p.vy += 0.15; // gravity
          p.vx *= 0.96; // air drag
        } else if (p.type === "splinter") {
          p.vy += 0.2;
          p.vx *= 0.97;
        } else if (p.type === "feather") {
          p.vy += 0.02;
          p.vx += Math.sin(p.y * 0.03) * 0.1;
        } else if (p.type === "confetti") {
          p.vy += 0.03;
          p.vx += Math.cos(p.y * 0.02) * 0.15;
        }

        renderParticle(p);

        if (p.alpha <= 0 || p.y > height + 50) {
          particles.splice(i, 1);
        }
      }

      if (particles.length > 0) {
        animId = requestAnimationFrame(loop);
      }
    }

    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
    };
  }, [skin, mode, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
    />
  );
}
