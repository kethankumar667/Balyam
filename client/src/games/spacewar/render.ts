import type { SpaceWarPublicState } from "@shared/types";

const HORIZ_WIDTH = 840;
const HORIZ_HEIGHT = 480;

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  life: number;
  maxLife: number;
}

let particles: SparkParticle[] = [];
let prevEnemyCount = 0;

export function renderSpaceWarCanvas(
  ctx: CanvasRenderingContext2D,
  state: SpaceWarPublicState,
  orientation: "horizontal" | "vertical" = "horizontal",
  /**
   * How much of a server tick this frame represents.
   *
   * The particle burst below advances once per CALL — it was written when
   * this function ran exactly when a packet landed, i.e. 30 times a second.
   * Now the board draws on requestAnimationFrame so it can interpolate
   * between packets, which means ~60 calls a second and sparks that would
   * fly and die twice as fast as they were tuned to.
   *
   * 1 keeps the original per-packet pacing, so a caller that has not been
   * updated behaves exactly as before.
   */
  stepScale = 1
) {
  const isVertical = orientation === "vertical";
  const screenW = isVertical ? 480 : 840;
  const screenH = isVertical ? 640 : 480;

  ctx.save();
  ctx.clearRect(0, 0, screenW, screenH);

  const theme = state.theme || "cyberpunk";
  const level = state.level || 1;
  const time = Date.now() * 0.003;

  // Particle Explosions on enemy kills
  if (state.enemies.length < prevEnemyCount) {
    const burstColor =
      theme === "retro_nokia"
        ? "#1a3014"
        : theme === "neon_synthwave"
        ? "#ff0077"
        : theme === "solar_flare"
        ? "#ff4400"
        : "#00f0ff";

    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      particles.push({
        x: HORIZ_WIDTH / 2 + (Math.random() - 0.5) * 400,
        y: HORIZ_HEIGHT / 2 + (Math.random() - 0.5) * 200,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: burstColor,
        radius: 2 + Math.random() * 3.5,
        life: 1,
        maxLife: 20 + Math.random() * 12,
      });
    }
  }
  prevEnemyCount = state.enemies.length;

  // --- TRANSFORMATION MATRIX FOR VERTICAL PORTRAIT MODE ---
  if (isVertical) {
    ctx.save();
    // Rotate 90 deg CCW and scale 840x480 horizontal game space into 480x640 vertical screen
    ctx.translate(0, 640);
    ctx.rotate(-Math.PI / 2);
    ctx.scale(640 / 840, 480 / 480);
  }

  // --- THEME BACKGROUND RENDERING ---
  if (theme === "retro_nokia") {
    ctx.fillStyle = "#aad69c";
    ctx.fillRect(0, 0, HORIZ_WIDTH, HORIZ_HEIGHT);

    ctx.strokeStyle = "rgba(25, 45, 20, 0.12)";
    ctx.lineWidth = 1;
    for (let x = 0; x < HORIZ_WIDTH; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HORIZ_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < HORIZ_HEIGHT; y += 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(HORIZ_WIDTH, y);
      ctx.stroke();
    }
  } else if (theme === "neon_synthwave") {
    const sGrad = ctx.createLinearGradient(0, 0, 0, HORIZ_HEIGHT);
    sGrad.addColorStop(0, "#120324");
    sGrad.addColorStop(0.5, "#3b0433");
    sGrad.addColorStop(1, "#660c38");
    ctx.fillStyle = sGrad;
    ctx.fillRect(0, 0, HORIZ_WIDTH, HORIZ_HEIGHT);

    const sunGrad = ctx.createRadialGradient(HORIZ_WIDTH / 2, 200, 10, HORIZ_WIDTH / 2, 200, 140);
    sunGrad.addColorStop(0, "#ffee00");
    sunGrad.addColorStop(0.5, "#ff0077");
    sunGrad.addColorStop(1, "rgba(255, 0, 119, 0)");
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(HORIZ_WIDTH / 2, 200, 140, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
    ctx.lineWidth = 1;
    for (let x = 0; x < HORIZ_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HORIZ_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < HORIZ_HEIGHT; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(HORIZ_WIDTH, y);
      ctx.stroke();
    }
  } else if (theme === "solar_flare") {
    const fGrad = ctx.createLinearGradient(0, 0, HORIZ_WIDTH, HORIZ_HEIGHT);
    fGrad.addColorStop(0, "#1f0303");
    fGrad.addColorStop(0.5, "#380a04");
    fGrad.addColorStop(1, "#521603");
    ctx.fillStyle = fGrad;
    ctx.fillRect(0, 0, HORIZ_WIDTH, HORIZ_HEIGHT);

    const flare1 = ctx.createRadialGradient(300, 200, 10, 300, 200, 260);
    flare1.addColorStop(0, "rgba(255, 100, 0, 0.35)");
    flare1.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = flare1;
    ctx.fillRect(0, 0, HORIZ_WIDTH, HORIZ_HEIGHT);
  } else {
    // Galactic Cyberpunk (Default)
    const bgGrad = ctx.createLinearGradient(0, 0, HORIZ_WIDTH, HORIZ_HEIGHT);
    bgGrad.addColorStop(0, "#050714");
    bgGrad.addColorStop(0.5, "#0b0f26");
    bgGrad.addColorStop(1, "#140a24");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, HORIZ_WIDTH, HORIZ_HEIGHT);

    const n1x = 200 + Math.sin(time * 0.5) * 40;
    const n1y = 120 + Math.cos(time * 0.5) * 30;
    const nebula1 = ctx.createRadialGradient(n1x, n1y, 10, n1x, n1y, 260);
    nebula1.addColorStop(0, "rgba(0, 240, 255, 0.22)");
    nebula1.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = nebula1;
    ctx.fillRect(0, 0, HORIZ_WIDTH, HORIZ_HEIGHT);
  }

  // Dynamic 3-Layer Parallax Starfield
  if (theme !== "retro_nokia") {
    for (let i = 0; i < 60; i++) {
      const sx = (i * 97 + time * 25) % HORIZ_WIDTH;
      const sy = (i * 163) % HORIZ_HEIGHT;
      const sz = (i % 3) + 1;
      ctx.fillStyle = i % 2 === 0 ? "#00f0ff" : "#ffffff";
      ctx.fillRect(sx, sy, sz, sz);
    }
  }

  const inkColor = theme === "retro_nokia" ? "#1a3014" : "#00f0ff";

  // 2. Draw Specials
  for (const s of state.specials) {
    ctx.save();
    if (s.type === "missile") {
      ctx.fillStyle = theme === "retro_nokia" ? inkColor : "#ff3366";
      ctx.shadowColor = "#ff3366";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(s.x + s.width, s.y + s.height / 2);
      ctx.lineTo(s.x, s.y);
      ctx.lineTo(s.x + 8, s.y + s.height / 2);
      ctx.lineTo(s.x, s.y + s.height);
      ctx.closePath();
      ctx.fill();
    } else if (s.type === "laser") {
      ctx.fillStyle = theme === "retro_nokia" ? inkColor : "#00f0ff";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 15;
      ctx.fillRect(s.x, s.y, s.width, s.height);
    } else if (s.type === "wall") {
      ctx.fillStyle = theme === "retro_nokia" ? inkColor : "rgba(0, 240, 255, 0.75)";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 20;
      ctx.fillRect(s.x, 0, s.width, HORIZ_HEIGHT);
    }
    ctx.restore();
  }

  // 3. Draw Projectiles
  for (const p of state.projectiles) {
    ctx.save();
    if (p.isPlayer) {
      ctx.fillStyle = theme === "retro_nokia" ? inkColor : theme === "neon_synthwave" ? "#ffee00" : "#00f0ff";
      ctx.shadowColor = theme === "neon_synthwave" ? "#ffee00" : "#00f0ff";
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x, p.y, p.width, p.height);
    } else {
      ctx.fillStyle = theme === "retro_nokia" ? inkColor : "#ff0055";
      ctx.shadowColor = "#ff0055";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 4. Draw PowerUps
  for (const pu of state.powerUps) {
    ctx.save();
    ctx.fillStyle = theme === "retro_nokia" ? "#aad69c" : "rgba(10, 15, 35, 0.85)";
    ctx.strokeStyle = theme === "retro_nokia" ? inkColor : "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pu.x + 18, pu.y + 18, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = theme === "retro_nokia" ? inkColor : "#ffffff";
    const icon = pu.type === "life" ? "❤️" : pu.type === "ammo" ? "⚡" : "🛡️";
    ctx.fillText(icon, pu.x + 18, pu.y + 18);
    ctx.restore();
  }

  // 5. Draw Level-Specific Opponents & Scary Boss Monsters
  for (const e of state.enemies) {
    ctx.save();
    if (theme === "retro_nokia") {
      ctx.fillStyle = inkColor;
      ctx.strokeStyle = "#aad69c";
      ctx.lineWidth = 2;

      if (e.type === "boss") {
        ctx.fillRect(e.x, e.y, e.width, e.height);
        ctx.fillStyle = "#aad69c";
        ctx.fillRect(e.x + 15, e.y + 15, e.width - 30, e.height - 30);
      } else {
        ctx.beginPath();
        ctx.moveTo(e.x, e.y + e.height / 2);
        ctx.lineTo(e.x + e.width, e.y);
        ctx.lineTo(e.x + e.width * 0.7, e.y + e.height / 2);
        ctx.lineTo(e.x + e.width, e.y + e.height);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      const levelColors: Record<number, { body: string; trim: string; eye: string }> = {
        1: { body: "#00a8ff", trim: "#0055ff", eye: "#ffffff" },
        2: { body: "#00e676", trim: "#00a843", eye: "#ffea00" },
        3: { body: "#8a00c4", trim: "#ff00ea", eye: "#ff0055" },
        4: { body: "#d50000", trim: "#ffab00", eye: "#ffffff" },
        5: { body: "#aa00ff", trim: "#aeea00", eye: "#ff0000" },
        6: { body: "#00e5ff", trim: "#002673", eye: "#00ffff" },
        7: { body: "#37474f", trim: "#ffd600", eye: "#ff3d00" },
        8: { body: "#ff003c", trim: "#ffd700", eye: "#ffffff" },
      };
      const lc = levelColors[level] || levelColors[1];

      if (e.type === "boss") {
        ctx.shadowColor = lc.trim;
        ctx.shadowBlur = 24;

        if (level >= 8) {
          ctx.fillStyle = "#11001c";
          ctx.strokeStyle = "#ff003c";
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(e.x + e.width, e.y + e.height / 2);
          ctx.lineTo(e.x + e.width * 0.7, e.y);
          ctx.lineTo(e.x + 30, e.y + 10);
          ctx.lineTo(e.x, e.y + e.height / 2 - 15);
          ctx.lineTo(e.x + 20, e.y + e.height / 2);
          ctx.lineTo(e.x, e.y + e.height / 2 + 15);
          ctx.lineTo(e.x + 30, e.y + e.height - 10);
          ctx.lineTo(e.x + e.width * 0.7, e.y + e.height);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ff003c";
          for (let ey = -25; ey <= 25; ey += 10) {
            ctx.beginPath();
            ctx.arc(e.x + 45, e.y + e.height / 2 + ey, 4, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = "#ffd700";
          const oRad = 55 + Math.sin(time * 3) * 5;
          ctx.beginPath();
          ctx.arc(e.x + e.width / 2 + Math.cos(time * 2) * oRad, e.y + e.height / 2 + Math.sin(time * 2) * oRad, 8, 0, Math.PI * 2);
          ctx.arc(e.x + e.width / 2 - Math.cos(time * 2) * oRad, e.y + e.height / 2 - Math.sin(time * 2) * oRad, 8, 0, Math.PI * 2);
          ctx.fill();
        } else if (level === 5 || level === 6) {
          ctx.fillStyle = "#260338";
          ctx.strokeStyle = "#aeea00";
          ctx.lineWidth = 3;

          for (let tIdx = -2; tIdx <= 2; tIdx++) {
            ctx.beginPath();
            ctx.moveTo(e.x + 20, e.y + e.height / 2 + tIdx * 20);
            ctx.quadraticCurveTo(e.x - 30, e.y + e.height / 2 + Math.sin(time * 3 + tIdx) * 30, e.x - 10, e.y + e.height / 2 + tIdx * 25);
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.ellipse(e.x + e.width * 0.6, e.y + e.height / 2, e.width * 0.4, e.height * 0.45, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = "#ff003c";
          ctx.beginPath();
          ctx.arc(e.x + 40, e.y + e.height / 2 - 15, 7, 0, Math.PI * 2);
          ctx.arc(e.x + 40, e.y + e.height / 2 + 15, 7, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = lc.body;
          ctx.strokeStyle = lc.trim;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(e.x + e.width, e.y + e.height / 2);
          ctx.lineTo(e.x + e.width * 0.7, e.y);
          ctx.lineTo(e.x, e.y + 20);
          ctx.lineTo(e.x + 20, e.y + e.height / 2);
          ctx.lineTo(e.x, e.y + e.height - 20);
          ctx.lineTo(e.x + e.width * 0.7, e.y + e.height);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = lc.eye;
          ctx.fillRect(e.x - 15, e.y + 25, 25, 12);
          ctx.fillRect(e.x - 15, e.y + e.height - 37, 25, 12);
        }
      } else {
        ctx.fillStyle = lc.body;
        ctx.strokeStyle = lc.trim;
        ctx.lineWidth = 2;

        if (e.type === "heavy") {
          ctx.beginPath();
          ctx.moveTo(e.x + e.width, e.y + e.height / 2);
          ctx.lineTo(e.x + e.width * 0.6, e.y);
          ctx.lineTo(e.x, e.y + 10);
          ctx.lineTo(e.x, e.y + e.height - 10);
          ctx.lineTo(e.x + e.width * 0.6, e.y + e.height);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = lc.eye;
          ctx.fillRect(e.x + 15, e.y + e.height / 2 - 8, e.width - 30, 16);
        } else if (e.type === "kamikaze") {
          ctx.beginPath();
          ctx.moveTo(e.x, e.y + e.height / 2);
          ctx.lineTo(e.x + e.width, e.y);
          ctx.lineTo(e.x + e.width * 0.7, e.y + e.height / 2);
          ctx.lineTo(e.x + e.width, e.y + e.height);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (e.type === "zigzag") {
          ctx.beginPath();
          ctx.moveTo(e.x, e.y + e.height / 2);
          ctx.lineTo(e.x + e.width, e.y + 5);
          ctx.lineTo(e.x + e.width * 0.5, e.y + e.height / 2);
          ctx.lineTo(e.x + e.width, e.y + e.height - 5);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = lc.eye;
          ctx.beginPath();
          ctx.arc(e.x + e.width * 0.4, e.y + e.height / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(e.x, e.y + e.height / 2);
          ctx.lineTo(e.x + e.width, e.y);
          ctx.lineTo(e.x + e.width * 0.7, e.y + e.height / 2);
          ctx.lineTo(e.x + e.width, e.y + e.height);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = lc.eye;
          ctx.fillRect(e.x + 12, e.y + e.height / 2 - 4, 12, 8);
        }
      }
    }

    if (e.hp < e.maxHp && e.type !== "boss") {
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(e.x, e.y - 10, e.width, 5);
      ctx.fillStyle = "#00f0ff";
      ctx.fillRect(e.x, e.y - 10, e.width * pct, 5);
    }
    ctx.restore();
  }

  // 6. Draw Player Starfighter
  const p = state.player;
  ctx.save();
  if (theme === "retro_nokia") {
    ctx.fillStyle = inkColor;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 10);
    ctx.lineTo(p.x + p.width, p.y + p.height / 2);
    ctx.lineTo(p.x, p.y + p.height - 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(p.x + 10, p.y, 40, p.height);
    ctx.fillStyle = "#aad69c";
    ctx.fillRect(p.x + 25, p.y + 15, 20, p.height - 30);
  } else {
    ctx.fillStyle = "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 18;
    ctx.fillRect(p.x - 14, p.y + p.height / 2 - 6, 16, 12);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(p.x - 8, p.y + p.height / 2 - 3, 10, 6);

    ctx.fillStyle = theme === "neon_synthwave" ? "#ff0077" : theme === "solar_flare" ? "#ffd700" : "#0a2540";
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x + p.width, p.y + p.height / 2);
    ctx.lineTo(p.x + 15, p.y);
    ctx.lineTo(p.x, p.y + 15);
    ctx.lineTo(p.x + 20, p.y + p.height / 2);
    ctx.lineTo(p.x, p.y + p.height - 15);
    ctx.lineTo(p.x + 15, p.y + p.height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffd700";
    ctx.fillRect(p.x + 35, p.y + 12, 20, 4);
    ctx.fillRect(p.x + 35, p.y + p.height - 16, 20, 4);

    const glassGrad = ctx.createLinearGradient(p.x + 25, p.y + 15, p.x + 55, p.y + 25);
    glassGrad.addColorStop(0, "#ffffff");
    glassGrad.addColorStop(1, "#00f0ff");
    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.ellipse(p.x + 42, p.y + p.height / 2, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (p.shieldOn) {
    ctx.strokeStyle = theme === "retro_nokia" ? inkColor : "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width * 0.7, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // 7. Update Particles
  if (theme !== "retro_nokia") {
    ctx.save();
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      // Scaled by the frame's share of a tick, so sparks keep the speed and
      // lifetime they were tuned with whatever rate the board draws at.
      pt.x += pt.vx * stepScale;
      pt.y += pt.vy * stepScale;
      pt.life += stepScale;
      const alpha = Math.max(0, 1 - pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.shadowColor = pt.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
      if (pt.life >= pt.maxLife) particles.splice(i, 1);
    }
    ctx.restore();
  }

  // --- RESTORE TRANSFORMATION MATRIX BEFORE DRAWING UPRIGHT HUD OVERLAYS ---
  if (isVertical) {
    ctx.restore();
  }

  // --- 8. HUD HEADER & GLASS CARDS OVERLAYS ---
  ctx.save();
  if (theme !== "retro_nokia") {
    // Top Bar Background
    ctx.fillStyle = "rgba(6, 9, 20, 0.85)";
    ctx.fillRect(0, 0, screenW, 44);

    // Left: LIVES
    ctx.font = "bold 12px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#00f0ff";
    ctx.fillText("LIVES", 14, 28);

    let livesX = 60;
    for (let i = 0; i < p.lives; i++) {
      ctx.font = "15px sans-serif";
      ctx.fillText("🚀", livesX, 30);
      livesX += 20;
    }

    // Center: SCORE
    ctx.textAlign = "center";
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#00f0ff";
    ctx.fillText("SCORE", screenW / 2, 18);
    ctx.font = "bold 16px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#ffd700";
    ctx.fillText(`${state.score}`, screenW / 2, 34);

    // Right: LEVEL & PAUSE ICON
    ctx.textAlign = "right";
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#00f0ff";
    ctx.fillText("LEVEL", screenW - 65, 18);
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`${state.level}/${state.maxLevels}`, screenW - 65, 34);

    // Pause Button Box
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(screenW - 42, 8, 28, 28);
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#00f0ff";
    ctx.fillText("⏸", screenW - 28, 27);

    // --- BOTTOM IN-GAME HUD GLASS CARDS ---
    const cardY = screenH - 85;
    ctx.save();
    ctx.fillStyle = "rgba(6, 15, 30, 0.75)";
    ctx.strokeStyle = "rgba(0, 240, 255, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(12, cardY, 135, 75, 10);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.font = "bold 9px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#00f0ff";
    ctx.fillText("WEAPON", 20, cardY + 16);
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#ffd700";
    ctx.fillText(`${p.specialAttack.toUpperCase()} (x${p.specialCount})`, 20, cardY + 32);

    ctx.font = "bold 9px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#00f0ff";
    ctx.fillText(`SCORE: ${state.score}  LVL: ${state.level}/${state.maxLevels}`, 20, cardY + 48);
    ctx.fillText(`LIVES: ${p.lives}`, 20, cardY + 63);
    ctx.restore();

    // Right Purple Glass Card (SPECIAL WEAPON)
    ctx.save();
    ctx.fillStyle = "rgba(25, 6, 40, 0.8)";
    ctx.strokeStyle = "rgba(176, 0, 255, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(screenW - 90, cardY, 78, 75, 10);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = "bold 9px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#e066ff";
    ctx.fillText("SPECIAL", screenW - 51, cardY + 16);

    ctx.font = "20px sans-serif";
    ctx.fillText("🚀", screenW - 51, cardY + 44);

    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#e066ff";
    ctx.fillText(`x${p.specialCount}`, screenW - 51, cardY + 64);
    ctx.restore();
  } else {
    // Retro Nokia Minimal HUD
    ctx.fillStyle = "rgba(20, 35, 15, 0.95)";
    ctx.fillRect(0, 0, screenW, 44);

    ctx.font = "bold 14px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#aad69c";

    let livesStr = "LIVES: ";
    for (let i = 0; i < p.lives; i++) livesStr += "🚀 ";
    ctx.fillText(livesStr, 14, 28);

    ctx.fillText(`SCORE: ${state.score}`, screenW / 2 - 40, 28);
    ctx.fillText(`LVL: ${state.level}/${state.maxLevels}`, screenW - 100, 28);
  }

  // Overlay for Paused / Over
  if (state.isPaused) {
    ctx.fillStyle = "rgba(6, 8, 20, 0.85)";
    ctx.fillRect(0, 0, screenW, screenH);
    ctx.fillStyle = theme === "retro_nokia" ? "#aad69c" : "#00f0ff";
    ctx.font = "bold 36px 'Righteous', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PAUSED", screenW / 2, screenH / 2);
  } else if (state.isOver) {
    ctx.fillStyle = "rgba(6, 8, 20, 0.9)";
    ctx.fillRect(0, 0, screenW, screenH);
    ctx.textAlign = "center";
    ctx.font = "bold 40px 'Righteous', sans-serif";
    ctx.fillStyle = state.winnerId ? "#ffd700" : "#ff0055";
    ctx.fillText(state.winnerId ? "VICTORY!" : "GAME OVER", screenW / 2, screenH / 2);
  }

  ctx.restore();
}
