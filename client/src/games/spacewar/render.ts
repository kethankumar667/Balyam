import type { SpaceWarPublicState, SpaceWarEnemy, SpaceWarThemeId } from "@shared/types";

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
let prevLevelTracker = 1;
let levelCompleteTimer = 0;
let levelCompleteClearedLevel = 1;

/** 8 Distinct Monster Names for 8 Game Levels */
export function getBossName(level: number): string {
  switch (level) {
    case 1:
      return "CYBER GOLIATH DREADNOUGHT";
    case 2:
      return "VOID LEVIATHAN SERPENT";
    case 3:
      return "NEO-KRAKEN BIO-TITAN";
    case 4:
      return "APOCALYPSE HARBINGER OVERLORD";
    case 5:
      return "PHANTOM OBLIVION SCYTHE";
    case 6:
      return "MECHA HYDRA DRAGON TITAN";
    case 7:
      return "SUPERNOVA CHRONOS COLOSSUS";
    case 8:
      return "OMEGA ABYSSAL DESTROYER";
    default:
      return "OMEGA ABYSSAL DESTROYER";
  }
}

export function renderSpaceWarCanvas(
  ctx: CanvasRenderingContext2D,
  state: SpaceWarPublicState,
  orientation: "horizontal" | "vertical" = "horizontal",
  stepScale = 1
) {
  const isVertical = orientation === "vertical";
  const screenW = isVertical ? 480 : 840;
  const screenH = isVertical ? 640 : 480;

  ctx.save();
  ctx.clearRect(0, 0, screenW, screenH);

  const theme: SpaceWarThemeId = state.theme || "cyberpunk";
  const level = state.level || 1;
  const time = Date.now() * 0.003;

  // Track Level Completion Celebration
  if (level > prevLevelTracker) {
    levelCompleteClearedLevel = prevLevelTracker;
    levelCompleteTimer = 180; // ~3 seconds at 60fps
    prevLevelTracker = level;
  }
  if (levelCompleteTimer > 0) {
    levelCompleteTimer -= stepScale;
  }

  // Particle Explosions on enemy kills
  if (state.enemies.length < prevEnemyCount) {
    const burstColor =
      theme === "retro_nokia"
        ? "#1a3014"
        : theme === "neon_synthwave"
        ? "#ff0077"
        : theme === "solar_flare"
        ? "#ff6600"
        : "#00f0ff";

    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 7;
      particles.push({
        x: HORIZ_WIDTH / 2 + (Math.random() - 0.5) * 400,
        y: HORIZ_HEIGHT / 2 + (Math.random() - 0.5) * 200,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: burstColor,
        radius: 2 + Math.random() * 4,
        life: 1,
        maxLife: 22 + Math.random() * 14,
      });
    }
  }
  prevEnemyCount = state.enemies.length;

  // --- TRANSFORMATION MATRIX FOR VERTICAL PORTRAIT MODE ---
  if (isVertical) {
    ctx.save();
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
    fGrad.addColorStop(0, "#1a0303");
    fGrad.addColorStop(0.5, "#3a0902");
    fGrad.addColorStop(1, "#541402");
    ctx.fillStyle = fGrad;
    ctx.fillRect(0, 0, HORIZ_WIDTH, HORIZ_HEIGHT);

    const flare1 = ctx.createRadialGradient(300, 200, 10, 300, 200, 260);
    flare1.addColorStop(0, "rgba(255, 100, 0, 0.38)");
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

  // ── 2. DRAW ANIMATED HIGH-IMPACT SPECIAL WEAPONS ────────────────────────
  for (const s of state.specials) {
    drawAnimatedSpecialWeapon(ctx, s, theme, time, inkColor);
  }

  // ── 3. DRAW REGULAR PROJECTILES ─────────────────────────────────────────
  for (const p of state.projectiles) {
    ctx.save();
    if (p.isPlayer) {
      ctx.fillStyle = theme === "retro_nokia" ? inkColor : theme === "neon_synthwave" ? "#ffee00" : "#00f0ff";
      ctx.shadowColor = theme === "neon_synthwave" ? "#ffee00" : "#00f0ff";
      ctx.shadowBlur = 10;
      ctx.fillRect(p.x, p.y, p.width, p.height);

      // Trailing Energy Spark
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(p.x + p.width - 4, p.y + 1, 4, p.height - 2);
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

  // ── 4. DRAW POWERUPS ───────────────────────────────────────────────────
  for (const pu of state.powerUps) {
    ctx.save();
    ctx.fillStyle = theme === "retro_nokia" ? "#aad69c" : "rgba(10, 15, 35, 0.85)";
    ctx.strokeStyle = theme === "retro_nokia" ? inkColor : "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pu.x + 18, pu.y + 18, 18 + Math.sin(time * 6) * 2, 0, Math.PI * 2);
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

  // ── 5. DRAW LEVEL-EVOLVED ENEMIES & 8 UNIQUE BOSS MONSTERS ─────────────
  for (const e of state.enemies) {
    drawSpaceWarEnemy(ctx, e, theme, level, time, inkColor);
  }

  // ── 6. DRAW PLAYER STARFIGHTER ──────────────────────────────────────────
  drawPlayerStarfighter(ctx, state.player, theme, time, inkColor);

  // ── 7. UPDATE PARTICLES ─────────────────────────────────────────────────
  if (theme !== "retro_nokia") {
    ctx.save();
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
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

  // ── 8. HUD & DYNAMIC MONSTER HEALTH BAR ──────────────────────────────────
  ctx.save();
  const boss = state.enemies.find((e) => e.type === "boss");
  const bossHp = state.bossHp ?? (boss ? boss.hp : null);
  const bossMaxHp = state.bossMaxHp ?? (boss ? boss.maxHp : null);

  // Draw Top Dynamic Boss Health Bar
  if (bossHp !== null && bossMaxHp !== null && bossHp > 0) {
    drawDynamicBossHealthBar(ctx, screenW, bossHp, bossMaxHp, level, theme, time);
  }

  // Draw Level Complete Message
  if (levelCompleteTimer > 0) {
    drawLevelCompleteOverlay(ctx, screenW, screenH, levelCompleteClearedLevel, level, theme, levelCompleteTimer);
  }

  // Draw HUD Top Glass Cards (Score, Level, Lives)
  if (theme !== "retro_nokia") {
    if (bossHp === null) {
      ctx.fillStyle = "rgba(6, 9, 20, 0.85)";
      ctx.fillRect(0, 0, screenW, 44);

      // Left: LIVES
      ctx.font = "bold 12px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillStyle = "#00f0ff";
      ctx.fillText("LIVES", 14, 28);

      let livesX = 60;
      for (let i = 0; i < state.player.lives; i++) {
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
    }
  } else {
    // Retro Nokia Minimal HUD
    ctx.fillStyle = "rgba(20, 35, 15, 0.95)";
    ctx.fillRect(0, 0, screenW, 44);

    ctx.font = "bold 14px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "#aad69c";

    let livesStr = "LIVES: ";
    for (let i = 0; i < state.player.lives; i++) livesStr += "🚀 ";
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

/** ─── ANIMATED PLAYER SPECIAL WEAPON EFFECTS ─── */
function drawAnimatedSpecialWeapon(
  ctx: CanvasRenderingContext2D,
  s: SpaceWarPublicState["specials"][number],
  theme: SpaceWarThemeId,
  time: number,
  inkColor: string
) {
  ctx.save();

  if (s.type === "missile") {
    // ── ANIMATED CRUISE MISSILE WITH ROCKET FLAME & SMOKE ──
    const cx = s.x + s.width / 2;
    const cy = s.y + s.height / 2;

    if (theme === "retro_nokia") {
      ctx.fillStyle = inkColor;
      ctx.beginPath();
      ctx.moveTo(s.x + s.width, cy);
      ctx.lineTo(s.x, s.y);
      ctx.lineTo(s.x + 8, cy);
      ctx.lineTo(s.x, s.y + s.height);
      ctx.closePath();
      ctx.fill();
    } else {
      // Fiery animated exhaust flame
      const flameLen = 14 + Math.sin(time * 20) * 8;
      const flameGrad = ctx.createLinearGradient(s.x, cy, s.x - flameLen, cy);
      flameGrad.addColorStop(0, "#ffffff");
      flameGrad.addColorStop(0.3, "#ffcc00");
      flameGrad.addColorStop(0.7, "#ff3300");
      flameGrad.addColorStop(1, "rgba(255, 0, 0, 0)");
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(s.x, cy - 5);
      ctx.lineTo(s.x - flameLen, cy);
      ctx.lineTo(s.x, cy + 5);
      ctx.closePath();
      ctx.fill();

      // Missile Body
      ctx.fillStyle = "#e6edf8";
      ctx.strokeStyle = "#ff0055";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#ff3366";
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(s.x + s.width, cy); // Pointed warhead tip
      ctx.lineTo(s.x + 8, s.y);
      ctx.lineTo(s.x, s.y - 2); // Top fin
      ctx.lineTo(s.x + 6, cy - 2);
      ctx.lineTo(s.x, s.y + s.height + 2); // Bottom fin
      ctx.lineTo(s.x + 8, s.y + s.height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Glowing Warhead Core
      ctx.fillStyle = "#ff0055";
      ctx.beginPath();
      ctx.arc(s.x + s.width - 4, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (s.type === "laser") {
    // ── ANIMATED MEGA ION BEAM WITH RIPPLE RINGS & LIGHTNING ARCS ──
    if (theme === "retro_nokia") {
      ctx.fillStyle = inkColor;
      ctx.fillRect(s.x, s.y, s.width, s.height);
    } else {
      // Outer Mega Laser Bloom
      const beamGrad = ctx.createLinearGradient(0, s.y, 0, s.y + s.height);
      beamGrad.addColorStop(0, "rgba(0, 240, 255, 0.1)");
      beamGrad.addColorStop(0.3, "rgba(0, 240, 255, 0.85)");
      beamGrad.addColorStop(0.5, "#ffffff");
      beamGrad.addColorStop(0.7, "rgba(0, 240, 255, 0.85)");
      beamGrad.addColorStop(1, "rgba(0, 240, 255, 0.1)");

      ctx.fillStyle = beamGrad;
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 24;
      ctx.fillRect(s.x, s.y - 4, s.width, s.height + 8);

      // Inner Intense White-Hot Core
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(s.x, s.y + 4, s.width, s.height - 8);

      // Animated traveling plasma ripple rings
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2;
      for (let r = 0; r < 6; r++) {
        const ringX = (s.x + (time * 600 + r * 140)) % HORIZ_WIDTH;
        ctx.beginPath();
        ctx.ellipse(ringX, s.y + s.height / 2, 8, s.height * 0.9, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Crackling lightning arcs along the beam
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y + s.height / 2);
      for (let x = s.x; x < s.x + s.width; x += 30) {
        const yOffset = (Math.sin(time * 30 + x * 0.1) * (s.height * 0.6));
        ctx.lineTo(x, s.y + s.height / 2 + yOffset);
      }
      ctx.stroke();
    }
  } else if (s.type === "wall") {
    // ── ANIMATED CYBER EMP FORCEFIELD GRID ──
    if (theme === "retro_nokia") {
      ctx.fillStyle = inkColor;
      ctx.fillRect(s.x, 0, s.width, HORIZ_HEIGHT);
    } else {
      // Shimmering Forcefield Background
      const wallGrad = ctx.createLinearGradient(s.x, 0, s.x + s.width, 0);
      wallGrad.addColorStop(0, "rgba(0, 240, 255, 0.15)");
      wallGrad.addColorStop(0.5, "rgba(0, 240, 255, 0.75)");
      wallGrad.addColorStop(1, "rgba(0, 240, 255, 0.15)");

      ctx.fillStyle = wallGrad;
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 24;
      ctx.fillRect(s.x, 0, s.width, HORIZ_HEIGHT);

      // Hexagonal Lattice Matrix & Vertical Energy Surge
      ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      for (let y = 0; y < HORIZ_HEIGHT; y += 28) {
        const pulse = Math.sin(time * 8 + y * 0.1) * (s.width * 0.3);
        ctx.beginPath();
        ctx.moveTo(s.x, y);
        ctx.lineTo(s.x + s.width / 2 + pulse, y + 14);
        ctx.lineTo(s.x + s.width, y);
        ctx.stroke();
      }

      // Vertical Laser Line Beams
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(s.x + s.width / 2 - 2, 0, 4, HORIZ_HEIGHT);
    }
  }

  ctx.restore();
}

/** ─── ENEMY DISPATCH ROUTINE (8 LEVEL-EVOLVING STYLES) ─── */
function drawSpaceWarEnemy(
  ctx: CanvasRenderingContext2D,
  e: SpaceWarEnemy,
  theme: SpaceWarThemeId,
  level: number,
  time: number,
  inkColor: string
) {
  ctx.save();

  if (theme === "retro_nokia") {
    ctx.fillStyle = inkColor;
    ctx.strokeStyle = "#aad69c";
    ctx.lineWidth = 2;

    if (e.type === "boss") {
      ctx.fillRect(e.x, e.y + 10, e.width, e.height - 20);
      ctx.fillRect(e.x + 20, e.y, e.width - 40, e.height);
      ctx.fillStyle = "#aad69c";
      ctx.fillRect(e.x + 30, e.y + 25, e.width - 60, e.height - 50);
      ctx.fillStyle = inkColor;
      ctx.fillRect(e.x + 45, e.y + e.height / 2 - 8, 20, 16);
    } else if (e.type === "heavy") {
      ctx.fillRect(e.x, e.y + 8, e.width, e.height - 16);
      ctx.fillRect(e.x + 12, e.y, e.width - 24, e.height);
      ctx.fillStyle = "#aad69c";
      ctx.fillRect(e.x + 18, e.y + 12, e.width - 36, e.height - 24);
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
    const primary =
      theme === "neon_synthwave"
        ? "#ff0077"
        : theme === "solar_flare"
        ? "#ff4400"
        : "#00f0ff";
    const secondary =
      theme === "neon_synthwave"
        ? "#9900ff"
        : theme === "solar_flare"
        ? "#ffd700"
        : "#ff0055";
    const darkHull =
      theme === "neon_synthwave"
        ? "#240430"
        : theme === "solar_flare"
        ? "#2b0800"
        : "#0a1329";

    if (e.type === "boss") {
      drawSpecificBossMonster(ctx, e, theme, level, time, primary, secondary, darkHull);
    } else if (e.type === "heavy") {
      drawEvolvedHeavyCruiser(ctx, e, theme, level, time, primary, secondary, darkHull);
    } else if (e.type === "kamikaze") {
      drawEvolvedKamikaze(ctx, e, theme, level, time, primary, secondary, darkHull);
    } else if (e.type === "zigzag") {
      drawEvolvedZigzag(ctx, e, theme, level, time, primary, secondary, darkHull);
    } else {
      drawEvolvedScouter(ctx, e, theme, level, time, primary, secondary, darkHull);
    }
  }

  // Draw Health Bar on regular enemies when damaged
  if (e.hp < e.maxHp && e.type !== "boss") {
    const pct = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(e.x, e.y - 12, e.width, 6);
    ctx.fillStyle = e.hp <= 1 ? "#ff0055" : "#00f0ff";
    ctx.fillRect(e.x, e.y - 12, e.width * pct, 6);
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(e.x, e.y - 12, e.width, 6);
  }

  ctx.restore();
}

/** ─── 8 UNIQUE BOSS MONSTER RENDERERS FOR LEVELS 1–8 ─── */
function drawSpecificBossMonster(
  ctx: CanvasRenderingContext2D,
  e: SpaceWarEnemy,
  theme: SpaceWarThemeId,
  level: number,
  time: number,
  primary: string,
  secondary: string,
  darkHull: string
) {
  ctx.save();
  ctx.shadowColor = secondary;
  ctx.shadowBlur = 24;

  const cx = e.x + e.width / 2;
  const cy = e.y + e.height / 2;

  switch (level) {
    case 1:
      // ── LEVEL 1: CYBER GOLIATH DREADNOUGHT ──
      // Industrial battleship with twin kinetic railcannons, rotating ion core, and armor plates
      ctx.fillStyle = darkHull;
      ctx.strokeStyle = primary;
      ctx.lineWidth = 3.5;

      ctx.beginPath();
      ctx.moveTo(e.x, cy);
      ctx.lineTo(e.x + 35, e.y + 10);
      ctx.lineTo(e.x + e.width - 20, e.y + 5);
      ctx.lineTo(e.x + e.width, e.y + 35);
      ctx.lineTo(e.x + e.width, e.y + e.height - 35);
      ctx.lineTo(e.x + e.width - 20, e.y + e.height - 5);
      ctx.lineTo(e.x + 35, e.y + e.height - 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dual Forward Rail Cannons
      ctx.fillStyle = secondary;
      ctx.fillRect(e.x - 20, cy - 28, 26, 9);
      ctx.fillRect(e.x - 20, cy + 19, 26, 9);

      // Spinning Ion Core
      const gPulse = 18 + Math.sin(time * 6) * 4;
      const gGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, gPulse);
      gGrad.addColorStop(0, "#ffffff");
      gGrad.addColorStop(0.5, secondary);
      gGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, gPulse, 0, Math.PI * 2);
      ctx.fill();

      // Pulsing Shield Rings
      ctx.strokeStyle = primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 38 + Math.sin(time * 4) * 3, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 2:
      // ── LEVEL 2: VOID LEVIATHAN SERPENT ──
      // 6 articulated biomechanical serpentine segments, glowing dorsal spines, and razor jaws
      ctx.fillStyle = darkHull;
      ctx.strokeStyle = secondary;
      ctx.lineWidth = 3;

      for (let seg = 5; seg >= 0; seg--) {
        const segX = e.x + seg * 20;
        const segY = cy + Math.sin(time * 4 + seg * 0.75) * 16;
        const segW = 32 - seg * 2.5;
        const segH = 46 - seg * 4;

        ctx.beginPath();
        ctx.ellipse(segX, segY, segW, segH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glowing Dorsal Plasma Spines
        ctx.fillStyle = primary;
        ctx.fillRect(segX - 4, segY - segH - 8, 8, 10);
        ctx.fillRect(segX - 4, segY + segH - 2, 8, 10);
      }

      // Razor Jaws & Ruby Eyes
      const vHeadX = e.x + 8;
      const vHeadY = cy + Math.sin(time * 4) * 16;
      ctx.fillStyle = "#ff0055";
      ctx.beginPath();
      ctx.arc(vHeadX + 8, vHeadY - 14, 6, 0, Math.PI * 2);
      ctx.arc(vHeadX + 8, vHeadY + 14, 6, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 3:
      // ── LEVEL 3: NEO-KRAKEN BIO-TITAN ──
      // 6 undulating bio-electric tentacles, massive mantle carapace, and tri-optic ruby eyes
      ctx.fillStyle = darkHull;
      ctx.strokeStyle = primary;
      ctx.lineWidth = 3;

      for (let t = -3; t <= 3; t++) {
        if (t === 0) continue;
        ctx.beginPath();
        ctx.moveTo(e.x + 35, cy + t * 13);
        const wave = Math.sin(time * 5 + t * 0.9) * 26;
        ctx.quadraticCurveTo(e.x - 40, cy + t * 18 + wave, e.x - 18, cy + t * 24);
        ctx.strokeStyle = secondary;
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // Cephalopod Mantle Armor
      ctx.fillStyle = darkHull;
      ctx.strokeStyle = primary;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.ellipse(cx + 15, cy, e.width * 0.38, e.height * 0.44, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Tri-Optic Eyes
      ctx.fillStyle = "#ff0055";
      ctx.beginPath();
      ctx.arc(cx - 10, cy - 16, 7, 0, Math.PI * 2);
      ctx.arc(cx - 10, cy + 16, 7, 0, Math.PI * 2);
      ctx.arc(cx - 24, cy, 9, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 4:
      // ── LEVEL 4: APOCALYPSE HARBINGER OVERLORD ──
      // Demonic skull-crested battle titan, dark-matter furnace, and rotating energy shield nodes
      ctx.fillStyle = "#0c0214";
      ctx.strokeStyle = "#ff003c";
      ctx.lineWidth = 4;

      ctx.beginPath();
      ctx.moveTo(e.x, cy);
      ctx.lineTo(e.x + 30, e.y + 8);
      ctx.lineTo(e.x + 60, e.y);
      ctx.lineTo(e.x + e.width - 20, e.y + 12);
      ctx.lineTo(e.x + e.width, cy);
      ctx.lineTo(e.x + e.width - 20, e.y + e.height - 12);
      ctx.lineTo(e.x + 60, e.y + e.height);
      ctx.lineTo(e.x + 30, e.y + e.height - 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dark Matter Singularity Furnace
      const sRad = 20 + Math.sin(time * 8) * 5;
      const sGrad = ctx.createRadialGradient(cx, cy, 3, cx, cy, sRad);
      sGrad.addColorStop(0, "#ffffff");
      sGrad.addColorStop(0.4, "#ffd700");
      sGrad.addColorStop(0.8, "#ff003c");
      sGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, sRad, 0, Math.PI * 2);
      ctx.fill();

      // 3 Rotating Orbital Energy Shield Drones
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 2.5;
      const orbDist = 48 + Math.sin(time * 3) * 6;
      for (let o = 0; o < 3; o++) {
        const ang = time * 3 + (o * Math.PI * 2) / 3;
        const ox = cx + Math.cos(ang) * orbDist;
        const oy = cy + Math.sin(ang) * (orbDist * 0.6);
        ctx.beginPath();
        ctx.arc(ox, oy, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#ffd700";
        ctx.fill();
        ctx.stroke();
      }
      break;

    case 5:
      // ── LEVEL 5: PHANTOM OBLIVION SCYTHE ──
      // Forward-swept ethereal scythe wings, shimmering warp cloak, and spectral violet core
      ctx.fillStyle = "#120224";
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 3.5;

      // Twin Forward Swept Plasma Scythe Blades
      ctx.beginPath();
      ctx.moveTo(e.x - 30, cy - 40);
      ctx.quadraticCurveTo(cx, cy - 60, e.x + e.width, cy - 20);
      ctx.lineTo(e.x + e.width, cy + 20);
      ctx.quadraticCurveTo(cx, cy + 60, e.x - 30, cy + 40);
      ctx.lineTo(cx - 10, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Spectral Phase Shimmer Glow
      const scythePulse = 22 + Math.sin(time * 9) * 6;
      const scytheGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, scythePulse);
      scytheGrad.addColorStop(0, "#ffffff");
      scytheGrad.addColorStop(0.5, "#a855f7");
      scytheGrad.addColorStop(0.9, "#3b82f6");
      scytheGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = scytheGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, scythePulse, 0, Math.PI * 2);
      ctx.fill();

      // Dual Scythe Blade Lasers
      ctx.fillStyle = "#c084fc";
      ctx.fillRect(e.x - 34, cy - 43, 16, 6);
      ctx.fillRect(e.x - 34, cy + 37, 16, 6);
      break;

    case 6:
      // ── LEVEL 6: MECHA HYDRA DRAGON TITAN ──
      // Three cyber dragon heads with articulated undulating necks and photon venom glands
      ctx.fillStyle = darkHull;
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 3;

      // Heavy Armored Dragon Torso
      ctx.beginPath();
      ctx.ellipse(cx + 25, cy, 45, 55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 3 Articulated Cyber Dragon Necks & Heads
      const headAngles = [-26, 0, 26];
      for (let h = 0; h < 3; h++) {
        const offset = headAngles[h];
        const neckWave = Math.sin(time * 6 + h * 1.5) * 14;
        const hx = e.x - 10;
        const hy = cy + offset + neckWave;

        // Neck Segment
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx + 10, cy + offset * 0.6);
        ctx.quadraticCurveTo(cx - 15, cy + offset + neckWave * 0.5, hx, hy);
        ctx.stroke();

        // Dragon Head Jaws
        ctx.fillStyle = "#14532d";
        ctx.strokeStyle = "#4ade80";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(hx - 16, hy);
        ctx.lineTo(hx + 8, hy - 10);
        ctx.lineTo(hx + 12, hy + 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Glowing Photon Venom Eye
        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(hx, hy - 3, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 7:
      // ── LEVEL 7: SUPERNOVA CHRONOS COLOSSUS ──
      // Solar entity with dual counter-rotating golden solar rings and blazing white fusion core
      ctx.fillStyle = "#2a1200";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 4;

      // 4 Radiant Solar Spires
      ctx.beginPath();
      ctx.moveTo(cx, cy - 65);
      ctx.lineTo(cx + 15, cy - 20);
      ctx.lineTo(cx + 65, cy);
      ctx.lineTo(cx + 15, cy + 20);
      ctx.lineTo(cx, cy + 65);
      ctx.lineTo(cx - 15, cy + 20);
      ctx.lineTo(cx - 65, cy);
      ctx.lineTo(cx - 15, cy - 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Blazing Fusion Sun Core
      const sunRad = 26 + Math.sin(time * 7) * 6;
      const sunGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, sunRad);
      sunGrad.addColorStop(0, "#ffffff");
      sunGrad.addColorStop(0.3, "#fef08a");
      sunGrad.addColorStop(0.7, "#f97316");
      sunGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, sunRad, 0, Math.PI * 2);
      ctx.fill();

      // Dual Counter-Rotating Solar Rings
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 52, 28, time * 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "#f97316";
      ctx.beginPath();
      ctx.ellipse(cx, cy, 52, 28, -time * 1.6, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 8:
    default:
      // ── LEVEL 8: OMEGA ABYSSAL DESTROYER (THE FINAL NIGHTMARE) ──
      // Gargantuan 4-winged mothership, 4 orbital doom turrets, and crimson singularity vortex
      ctx.fillStyle = "#09010f";
      ctx.strokeStyle = "#e11d48";
      ctx.lineWidth = 4.5;

      // 4 Sweeping Wings Array
      ctx.beginPath();
      ctx.moveTo(e.x - 35, cy);
      ctx.lineTo(e.x + 20, cy - 65);
      ctx.lineTo(e.x + e.width, cy - 50);
      ctx.lineTo(e.x + e.width - 25, cy);
      ctx.lineTo(e.x + e.width, cy + 50);
      ctx.lineTo(e.x + 20, cy + 65);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gravitational Singularity Core
      const abyssRad = 28 + Math.sin(time * 10) * 6;
      const abyssGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, abyssRad);
      abyssGrad.addColorStop(0, "#ffffff");
      abyssGrad.addColorStop(0.3, "#f43f5e");
      abyssGrad.addColorStop(0.8, "#881337");
      abyssGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = abyssGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, abyssRad, 0, Math.PI * 2);
      ctx.fill();

      // 4 Autonomous Orbital Doom Blaster Turrets
      ctx.strokeStyle = "#fb7185";
      ctx.lineWidth = 2;
      for (let dt = 0; dt < 4; dt++) {
        const dtAng = time * 2.5 + (dt * Math.PI * 2) / 4;
        const tx = cx + Math.cos(dtAng) * 62;
        const ty = cy + Math.sin(dtAng) * 44;

        ctx.fillStyle = "#4c0519";
        ctx.beginPath();
        ctx.arc(tx, ty, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Energy Blaster Core
        ctx.fillStyle = "#ffe4e6";
        ctx.beginPath();
        ctx.arc(tx, ty, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Random crackling hyper-lightning arcs across the wings
      if (Math.random() < 0.6) {
        ctx.strokeStyle = "#fecdd3";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(e.x - 30, cy + (Math.random() - 0.5) * 60);
        ctx.stroke();
      }
      break;
  }

  ctx.restore();
}

/** ─── EVOLVED MINION SHIPS ACROSS 4 LEVEL TIERS ─── */
function drawEvolvedScouter(
  ctx: CanvasRenderingContext2D,
  e: SpaceWarEnemy,
  theme: SpaceWarThemeId,
  level: number,
  time: number,
  primary: string,
  secondary: string,
  darkHull: string
) {
  ctx.fillStyle = darkHull;
  ctx.strokeStyle = level >= 7 ? "#ffd700" : level >= 5 ? "#a855f7" : level >= 3 ? "#06b6d4" : primary;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(e.x, e.y + e.height / 2);
  ctx.lineTo(e.x + e.width, e.y + 3);
  ctx.lineTo(e.x + e.width * 0.65, e.y + e.height / 2);
  ctx.lineTo(e.x + e.width, e.y + e.height - 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing Cockpit Optic
  ctx.fillStyle = level >= 7 ? "#f43f5e" : secondary;
  ctx.beginPath();
  ctx.arc(e.x + e.width * 0.4, e.y + e.height / 2, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawEvolvedZigzag(
  ctx: CanvasRenderingContext2D,
  e: SpaceWarEnemy,
  theme: SpaceWarThemeId,
  level: number,
  time: number,
  primary: string,
  secondary: string,
  darkHull: string
) {
  ctx.fillStyle = darkHull;
  ctx.strokeStyle = level >= 7 ? "#f59e0b" : level >= 5 ? "#c084fc" : secondary;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(e.x, e.y + e.height / 2);
  ctx.lineTo(e.x + e.width * 0.4, e.y);
  ctx.lineTo(e.x + e.width, e.y + 6);
  ctx.lineTo(e.x + e.width * 0.6, e.y + e.height / 2);
  ctx.lineTo(e.x + e.width, e.y + e.height - 6);
  ctx.lineTo(e.x + e.width * 0.4, e.y + e.height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Dual Sensor Blasters
  ctx.fillStyle = level >= 7 ? "#fbbf24" : primary;
  ctx.fillRect(e.x + 12, e.y + e.height / 2 - 7, 8, 4);
  ctx.fillRect(e.x + 12, e.y + e.height / 2 + 3, 8, 4);
}

function drawEvolvedKamikaze(
  ctx: CanvasRenderingContext2D,
  e: SpaceWarEnemy,
  theme: SpaceWarThemeId,
  level: number,
  time: number,
  primary: string,
  secondary: string,
  darkHull: string
) {
  ctx.fillStyle = level >= 7 ? "#881337" : "#ff0033";
  ctx.strokeStyle = level >= 7 ? "#fb7185" : "#ffffff";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(e.x - 6, e.y + e.height / 2);
  ctx.lineTo(e.x + e.width, e.y);
  ctx.lineTo(e.x + e.width * 0.5, e.y + e.height / 2);
  ctx.lineTo(e.x + e.width, e.y + e.height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Warning Flasher Tip
  ctx.fillStyle = Math.sin(time * 14) > 0 ? "#ffff00" : "#ff0000";
  ctx.beginPath();
  ctx.arc(e.x + 4, e.y + e.height / 2, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawEvolvedHeavyCruiser(
  ctx: CanvasRenderingContext2D,
  e: SpaceWarEnemy,
  theme: SpaceWarThemeId,
  level: number,
  time: number,
  primary: string,
  secondary: string,
  darkHull: string
) {
  ctx.fillStyle = darkHull;
  ctx.strokeStyle = level >= 7 ? "#f43f5e" : level >= 5 ? "#a855f7" : primary;
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.moveTo(e.x, e.y + e.height / 2);
  ctx.lineTo(e.x + 20, e.y + 6);
  ctx.lineTo(e.x + e.width - 10, e.y);
  ctx.lineTo(e.x + e.width, e.y + 16);
  ctx.lineTo(e.x + e.width, e.y + e.height - 16);
  ctx.lineTo(e.x + e.width - 10, e.y + e.height);
  ctx.lineTo(e.x + 20, e.y + e.height - 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Command Visor Bar
  ctx.fillStyle = level >= 7 ? "#ffd700" : secondary;
  ctx.fillRect(e.x + 18, e.y + e.height / 2 - 6, e.width - 34, 12);
}

/** ─── PLAYER STARFIGHTER ─── */
function drawPlayerStarfighter(
  ctx: CanvasRenderingContext2D,
  p: SpaceWarPublicState["player"],
  theme: SpaceWarThemeId,
  time: number,
  inkColor: string
) {
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
    // Engine Afterburner Plume
    const jetLen = 14 + Math.sin(time * 18) * 6;
    ctx.fillStyle = "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 18;
    ctx.fillRect(p.x - jetLen, p.y + p.height / 2 - 6, jetLen, 12);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(p.x - 8, p.y + p.height / 2 - 3, 10, 6);

    // Starfighter Hull
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

    // Wing Cannons
    ctx.fillStyle = "#ffd700";
    ctx.fillRect(p.x + 35, p.y + 12, 20, 4);
    ctx.fillRect(p.x + 35, p.y + p.height - 16, 20, 4);

    // Glass Canopy
    const glassGrad = ctx.createLinearGradient(p.x + 25, p.y + 15, p.x + 55, p.y + 25);
    glassGrad.addColorStop(0, "#ffffff");
    glassGrad.addColorStop(1, "#00f0ff");
    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.ellipse(p.x + 42, p.y + p.height / 2, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Energy Shield Bubble
  if (p.shieldOn) {
    ctx.strokeStyle = theme === "retro_nokia" ? inkColor : "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 18;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width * 0.7 + Math.sin(time * 8) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** ─── DYNAMIC IN-CANVAS BOSS HEALTH BAR ─── */
function drawDynamicBossHealthBar(
  ctx: CanvasRenderingContext2D,
  screenW: number,
  hp: number,
  maxHp: number,
  level: number,
  theme: SpaceWarThemeId,
  time: number
) {
  ctx.save();
  const barW = Math.min(480, screenW - 60);
  const barH = 16;
  const barX = (screenW - barW) / 2;
  const barY = 18;
  const pct = Math.max(0, Math.min(1, hp / maxHp));
  const bossName = getBossName(level);

  // Warning Backdrop Box
  ctx.fillStyle = "rgba(10, 4, 18, 0.92)";
  ctx.strokeStyle = hp <= maxHp * 0.3 ? (Math.sin(time * 8) > 0 ? "#ff0033" : "#ffd700") : "#ff0055";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#ff0055";
  ctx.shadowBlur = 14;

  ctx.beginPath();
  ctx.roundRect(barX - 16, barY - 14, barW + 32, barH + 34, 10);
  ctx.fill();
  ctx.stroke();

  // Boss Name & Threat Header
  ctx.font = "bold 11px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#ffd700";
  ctx.textAlign = "left";
  ctx.fillText(`⚠️ BOSS: ${bossName}`, barX, barY - 2);

  ctx.textAlign = "right";
  ctx.fillStyle = "#ff0055";
  ctx.fillText(`${hp} / ${maxHp} (${Math.round(pct * 100)}%)`, barX + barW, barY - 2);

  // Outer Bar Track
  ctx.fillStyle = "rgba(40, 10, 20, 0.8)";
  ctx.beginPath();
  ctx.roundRect(barX, barY + 4, barW, barH, 6);
  ctx.fill();

  // Active Health Gradient
  if (pct > 0) {
    const hpGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    hpGrad.addColorStop(0, "#ff0055");
    hpGrad.addColorStop(0.6, "#ff6600");
    hpGrad.addColorStop(1, "#ffd700");
    ctx.fillStyle = hpGrad;
    ctx.beginPath();
    ctx.roundRect(barX, barY + 4, barW * pct, barH, 6);
    ctx.fill();
  }

  // Segment Marks on Health Bar
  ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
  ctx.lineWidth = 1.5;
  for (let i = 1; i <= 9; i++) {
    const sx = barX + (barW * i) / 10;
    ctx.beginPath();
    ctx.moveTo(sx, barY + 4);
    ctx.lineTo(sx, barY + 4 + barH);
    ctx.stroke();
  }

  ctx.restore();
}

/** ─── LEVEL COMPLETE CELEBRATION OVERLAY ─── */
function drawLevelCompleteOverlay(
  ctx: CanvasRenderingContext2D,
  screenW: number,
  screenH: number,
  clearedLvl: number,
  nextLvl: number,
  theme: SpaceWarThemeId,
  timer: number
) {
  ctx.save();
  const alpha = Math.min(1, timer / 30);
  ctx.globalAlpha = alpha;

  const boxW = Math.min(420, screenW - 40);
  const boxH = 110;
  const boxX = (screenW - boxW) / 2;
  const boxY = (screenH - boxH) / 2 - 30;

  // Glowing Celebration Banner
  ctx.fillStyle = "rgba(10, 20, 45, 0.94)";
  ctx.strokeStyle = "#ffd700";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#ffd700";
  ctx.shadowBlur = 24;

  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 16);
  ctx.fill();
  ctx.stroke();

  // Text
  ctx.textAlign = "center";
  ctx.font = "900 24px 'Righteous', sans-serif";
  ctx.fillStyle = "#ffd700";
  ctx.fillText(`⭐ LEVEL ${clearedLvl} CLEARED! ⭐`, screenW / 2, boxY + 42);

  ctx.font = "bold 13px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#00f0ff";
  ctx.fillText(`WARPING TO LEVEL ${nextLvl}...`, screenW / 2, boxY + 70);

  ctx.font = "bold 11px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#00ff88";
  ctx.fillText(`BONUS REWARD: +${clearedLvl * 500} PTS!`, screenW / 2, boxY + 92);

  ctx.restore();
}
