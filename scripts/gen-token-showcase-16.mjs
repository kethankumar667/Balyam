import fs from 'fs';
import path from 'path';
import sharp from '../client/node_modules/sharp/dist/index.mjs';

const WIDTH = 3200;
const HEIGHT = 2200;

// High-fidelity SVG displaying all 16 Inventive 3D Token Designs (4x4 Matrix)
const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <!-- Background Gradients -->
    <radialGradient id="bgGlow" cx="50%" cy="40%" r="85%">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="45%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
    
    <!-- Gold Metallics -->
    <linearGradient id="goldMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFBEB"/>
      <stop offset="20%" stop-color="#FDE047"/>
      <stop offset="45%" stop-color="#F59E0B"/>
      <stop offset="75%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#78350F"/>
    </linearGradient>

    <linearGradient id="goldLight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="50%" stop-color="#EAB308"/>
      <stop offset="100%" stop-color="#A16207"/>
    </linearGradient>

    <!-- Jewels & Elements -->
    <radialGradient id="rubyGem" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#FECDD3"/>
      <stop offset="40%" stop-color="#E11D48"/>
      <stop offset="80%" stop-color="#9F1239"/>
      <stop offset="100%" stop-color="#4C0519"/>
    </radialGradient>

    <radialGradient id="emeraldGem" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#A7F3D0"/>
      <stop offset="40%" stop-color="#10B981"/>
      <stop offset="80%" stop-color="#047857"/>
      <stop offset="100%" stop-color="#064E3B"/>
    </radialGradient>

    <radialGradient id="sapphireGem" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#BAE6FD"/>
      <stop offset="40%" stop-color="#0284C7"/>
      <stop offset="80%" stop-color="#0369A1"/>
      <stop offset="100%" stop-color="#0C4A6E"/>
    </radialGradient>

    <radialGradient id="amethystGem" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#F5D0FE"/>
      <stop offset="40%" stop-color="#C084FC"/>
      <stop offset="80%" stop-color="#7E22CE"/>
      <stop offset="100%" stop-color="#3B0764"/>
    </radialGradient>

    <radialGradient id="cyanPlasma" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#CFFAFE"/>
      <stop offset="45%" stop-color="#06B6D4"/>
      <stop offset="80%" stop-color="#0891B2"/>
      <stop offset="100%" stop-color="#164E63"/>
    </radialGradient>

    <linearGradient id="magmaScale" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB923C"/>
      <stop offset="35%" stop-color="#EA580C"/>
      <stop offset="70%" stop-color="#C2410C"/>
      <stop offset="100%" stop-color="#431407"/>
    </linearGradient>

    <linearGradient id="bronzeArmor" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FED7AA"/>
      <stop offset="35%" stop-color="#F97316"/>
      <stop offset="70%" stop-color="#9A3412"/>
      <stop offset="100%" stop-color="#451A03"/>
    </linearGradient>

    <linearGradient id="chromePlate" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="30%" stop-color="#E2E8F0"/>
      <stop offset="50%" stop-color="#94A3B8"/>
      <stop offset="70%" stop-color="#475569"/>
      <stop offset="100%" stop-color="#1E293B"/>
    </linearGradient>

    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0.95"/>
    </linearGradient>

    <!-- Pedestal Auras -->
    <radialGradient id="auraGold" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FDE047" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#CA8A04" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#713F12" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="auraRed" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F87171" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#DC2626" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#7F1D1D" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="auraCyan" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#0284C7" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#082F49" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="auraEmerald" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#34D399" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#059669" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#064E3B" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="auraPurple" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#C084FC" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#7E22CE" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#3B0764" stop-opacity="0"/>
    </radialGradient>

    <!-- Fast Filters for librsvg -->
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <filter id="brightGlow">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <filter id="shadow3D">
      <feDropShadow dx="0" dy="8" stdDeviation="4" flood-color="#000000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Deep Canvas Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGlow)"/>

  <!-- Blueprint Lines -->
  <g stroke="#334155" stroke-width="1" stroke-dasharray="4 8" opacity="0.2">
    <line x1="0" y1="180" x2="${WIDTH}" y2="180"/>
    <line x1="0" y1="2060" x2="${WIDTH}" y2="2060"/>
    <line x1="100" y1="0" x2="100" y2="${HEIGHT}"/>
    <line x1="${WIDTH - 100}" y1="0" x2="${WIDTH - 100}" y2="${HEIGHT}"/>
  </g>

  <!-- ════════════════════════════ HEADER AREA ════════════════════════════ -->
  <g transform="translate(100, 50)">
    <!-- Brand Badges -->
    <rect x="0" y="0" width="160" height="34" rx="17" fill="#F59E0B" fill-opacity="0.15" stroke="#F59E0B" stroke-width="1.5"/>
    <text x="80" y="22" fill="#FBBF24" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" letter-spacing="2" text-anchor="middle">BHALYAM DLS</text>

    <rect x="175" y="0" width="260" height="34" rx="17" fill="#06B6D4" fill-opacity="0.15" stroke="#06B6D4" stroke-width="1.5"/>
    <text x="305" y="22" fill="#38BDF8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" letter-spacing="2" text-anchor="middle">LUDO KING BENCHMARK</text>

    <rect x="450" y="0" width="220" height="34" rx="17" fill="#10B981" fill-opacity="0.15" stroke="#10B981" stroke-width="1.5"/>
    <text x="560" y="22" fill="#34D399" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" letter-spacing="2" text-anchor="middle">16 INVENTIVE 3D TOKENS</text>

    <!-- Main Title -->
    <text x="0" y="85" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" letter-spacing="1">
      THE GRAND VAULT — 16 INVENTIVE 3D TOKENS SPECIFICATION
    </text>
    <text x="0" y="118" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="500">
      Complete roster of 16 bespoke 3D sculptured collectible figurines across 4 thematic collections: Royal, Mythic, Cyber &amp; Heritage.
    </text>

    <!-- Right Summary Box -->
    <g transform="translate(${WIDTH - 650}, 15)">
      <rect x="0" y="0" width="450" height="85" rx="20" fill="#1E293B" stroke="#475569" stroke-width="1.5"/>
      <circle cx="45" cy="42" r="14" fill="#10B981" filter="url(#softGlow)"/>
      <text x="75" y="38" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800">4 THEMATIC COLLECTIONS</text>
      <text x="75" y="62" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="500">4 Tokens Each • Dynamic Red/Green/Yellow/Blue Floor Dais</text>
    </g>
  </g>

  <!-- ════════════════ GRID OF 16 TOKENS (4 Rows x 4 Columns) ════════════════ -->
  <!-- Col Width = 710, Col Gap = 30 -> 4 * 710 + 3 * 30 = 2930. Start X = 135 -->
  <!-- Row Height = 430, Row Gap = 25 -> 4 * 430 + 3 * 25 = 1795. Start Y = 200 -->

  <!-- ==================== ROW 1: THE ROYAL COURT (1-4) ==================== -->

  <!-- 1. Imperial Sovereign (Royal Crown) -->
  <g transform="translate(135, 200)">
    <rect x="0" y="0" width="710" height="430" rx="22" fill="url(#cardGrad)" stroke="#F59E0B" stroke-width="1.5" filter="url(#shadow3D)"/>
    <text x="25" y="38" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800">1. Imperial Sovereign</text>
    <text x="25" y="60" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">ROYAL COURT • LEGENDARY</text>
    <rect x="580" y="20" width="105" height="26" rx="8" fill="#F59E0B" fill-opacity="0.2" stroke="#F59E0B" stroke-width="1"/>
    <text x="632" y="38" fill="#FDE047" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">4,500 COINS</text>

    <!-- Token Figurine -->
    <g transform="translate(355, 215)">
      <ellipse cx="0" cy="85" rx="140" ry="38" fill="url(#auraRed)" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="85" rx="95" ry="22" fill="#000000" opacity="0.6"/>
      <!-- Velvet Cushion -->
      <ellipse cx="0" cy="55" rx="75" ry="24" fill="url(#rubyGem)" filter="url(#shadow3D)"/>
      <!-- Gold Rim -->
      <ellipse cx="0" cy="50" rx="80" ry="25" fill="none" stroke="url(#goldMetallic)" stroke-width="12"/>
      <!-- Studs -->
      <circle cx="-55" cy="55" r="7" fill="url(#emeraldGem)"/>
      <circle cx="-25" cy="62" r="8" fill="url(#sapphireGem)"/>
      <circle cx="0" cy="64" r="9" fill="url(#rubyGem)"/>
      <circle cx="25" cy="62" r="8" fill="url(#sapphireGem)"/>
      <circle cx="55" cy="55" r="7" fill="url(#emeraldGem)"/>
      <!-- Crown Spires -->
      <path d="M -80 45 Q -75 -20 -40 -35 Q -30 10 0 5 Q 30 10 40 -35 Q 75 -20 80 45" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="3" filter="url(#shadow3D)"/>
      <path d="M -30 40 Q -15 -60 0 -75 Q 15 -60 30 40 Z" fill="url(#goldLight)" stroke="#78350F" stroke-width="2"/>
      <circle cx="-40" cy="-35" r="10" fill="#FFFFFF" stroke="url(#goldMetallic)" stroke-width="2"/>
      <circle cx="40" cy="-35" r="10" fill="#FFFFFF" stroke="url(#goldMetallic)" stroke-width="2"/>
      <circle cx="0" cy="-75" r="14" fill="url(#rubyGem)" stroke="url(#goldMetallic)" stroke-width="3" filter="url(#softGlow)"/>
      <path d="M -5 -105 L 5 -105 L 5 -98 L 12 -98 L 12 -90 L 5 -90 L 5 -78 L -5 -78 L -5 -90 L -12 -90 L -12 -98 L -5 -98 Z" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="1.5"/>
    </g>
    <text x="25" y="380" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Royal Coronation Crown</text>
    <text x="25" y="402" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Full 3D coronation crown with seat-colored velvet cushion &amp; cross finial.</text>
  </g>

  <!-- 2. Scepter of Radiance -->
  <g transform="translate(875, 200)">
    <rect x="0" y="0" width="710" height="430" rx="22" fill="url(#cardGrad)" stroke="#38BDF8" stroke-width="1.5" filter="url(#shadow3D)"/>
    <text x="25" y="38" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800">2. Scepter of Radiance</text>
    <text x="25" y="60" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">ROYAL COURT • EPIC</text>
    <rect x="580" y="20" width="105" height="26" rx="8" fill="#0284C7" fill-opacity="0.2" stroke="#38BDF8" stroke-width="1"/>
    <text x="632" y="38" fill="#38BDF8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">3,600 COINS</text>

    <!-- Figurine -->
    <g transform="translate(355, 215)">
      <ellipse cx="0" cy="85" rx="140" ry="38" fill="url(#auraCyan)" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="85" rx="85" ry="20" fill="#000000" opacity="0.6"/>
      <!-- Scepter Golden Stand Base -->
      <polygon points="-50,75 -35,50 35,50 50,75" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2"/>
      <!-- Shaft -->
      <rect x="-10" y="-30" width="20" height="90" rx="6" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2" filter="url(#shadow3D)"/>
      <!-- Spiral Ribbons on shaft -->
      <path d="M -10 0 Q 0 10 10 0 M -10 30 Q 0 40 10 30" stroke="#FFFFFF" stroke-width="2" fill="none" opacity="0.8"/>
      <!-- Filigree Wings on head -->
      <path d="M -15 -30 Q -65 -60 -45 -90 Q -25 -70 -10 -45" fill="url(#goldLight)" stroke="#78350F" stroke-width="2"/>
      <path d="M 15 -30 Q 65 -60 45 -90 Q 25 -70 10 -45" fill="url(#goldLight)" stroke="#78350F" stroke-width="2"/>
      <!-- Glowing Sapphire Orb -->
      <circle cx="0" cy="-65" r="30" fill="url(#sapphireGem)" stroke="url(#goldMetallic)" stroke-width="3" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="-65" rx="36" ry="12" fill="none" stroke="url(#goldMetallic)" stroke-width="3"/>
      <!-- Top Crown Finial -->
      <polygon points="0,-110 -10,-95 10,-95" fill="url(#goldMetallic)"/>
      <circle cx="0" cy="-110" r="4" fill="#FFFFFF" filter="url(#softGlow)"/>
    </g>
    <text x="25" y="380" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Ceremonial Monarch Scepter</text>
    <text x="25" y="402" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Gilded ceremonial scepter cradling a floating sapphire orb with filigree wings.</text>
  </g>

  <!-- 3. Throne of Valor -->
  <g transform="translate(1615, 200)">
    <rect x="0" y="0" width="710" height="430" rx="22" fill="url(#cardGrad)" stroke="#EAB308" stroke-width="1.5" filter="url(#shadow3D)"/>
    <text x="25" y="38" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800">3. Throne of Valor</text>
    <text x="25" y="60" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">ROYAL COURT • LEGENDARY</text>
    <rect x="580" y="20" width="105" height="26" rx="8" fill="#EAB308" fill-opacity="0.2" stroke="#EAB308" stroke-width="1"/>
    <text x="632" y="38" fill="#FDE047" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">4,200 COINS</text>

    <!-- Figurine -->
    <g transform="translate(355, 215)">
      <ellipse cx="0" cy="85" rx="140" ry="38" fill="url(#auraGold)" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="85" rx="90" ry="20" fill="#000000" opacity="0.6"/>
      <!-- Stone Steps Plinth -->
      <polygon points="-75,80 -60,60 60,60 75,80" fill="#334155" stroke="url(#goldMetallic)" stroke-width="2"/>
      <!-- Gold Throne Base & Seat Cushion -->
      <rect x="-45" y="15" width="90" height="45" rx="8" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2"/>
      <rect x="-35" y="10" width="70" height="25" rx="5" fill="url(#rubyGem)"/>
      <!-- High Backrest Arch -->
      <path d="M -40 15 L -40 -70 Q 0 -115 40 -70 L 40 15 Z" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="3" filter="url(#shadow3D)"/>
      <!-- Velvet Inlay on Backrest -->
      <path d="M -28 10 L -28 -55 Q 0 -90 28 -55 L 28 10 Z" fill="url(#rubyGem)"/>
      <!-- Carved Golden Lion Heads on Armrests -->
      <circle cx="-45" cy="15" r="14" fill="url(#goldLight)" stroke="#78350F" stroke-width="1.5"/>
      <circle cx="45" cy="15" r="14" fill="url(#goldLight)" stroke="#78350F" stroke-width="1.5"/>
      <!-- Crown Crest on Throne Top -->
      <polygon points="-15,-95 0,-115 15,-95" fill="url(#goldLight)"/>
      <circle cx="0" cy="-85" r="6" fill="url(#emeraldGem)"/>
    </g>
    <text x="25" y="380" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Grand Lion King Throne</text>
    <text x="25" y="402" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">3D sculptured golden monarch throne with ruby velvet backrest &amp; lion armrests.</text>
  </g>

  <!-- 4. Signet of the Empire -->
  <g transform="translate(2355, 200)">
    <rect x="0" y="0" width="710" height="430" rx="22" fill="url(#cardGrad)" stroke="#F59E0B" stroke-width="1.5" filter="url(#shadow3D)"/>
    <text x="25" y="38" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800">4. Signet of Empire</text>
    <text x="25" y="60" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">ROYAL COURT • RARE</text>
    <rect x="580" y="20" width="105" height="26" rx="8" fill="#F59E0B" fill-opacity="0.2" stroke="#F59E0B" stroke-width="1"/>
    <text x="632" y="38" fill="#FDE047" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">2,800 COINS</text>

    <!-- Figurine -->
    <g transform="translate(355, 215)">
      <ellipse cx="0" cy="85" rx="140" ry="38" fill="url(#auraGold)" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="85" rx="85" ry="20" fill="#000000" opacity="0.6"/>
      <!-- Ring Band (3D angled heavy gold) -->
      <ellipse cx="0" cy="40" rx="70" ry="35" fill="none" stroke="url(#goldMetallic)" stroke-width="18" filter="url(#shadow3D)"/>
      <ellipse cx="0" cy="38" rx="68" ry="33" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.7"/>
      <!-- Signet Bezel Table -->
      <polygon points="-55,-10 55,-10 40,-65 -40,-65" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="3"/>
      <!-- Inset Seal Oval (Seat Color Gem) -->
      <ellipse cx="0" cy="-38" rx="35" ry="22" fill="url(#rubyGem)" stroke="url(#goldMetallic)" stroke-width="2"/>
      <!-- Embossed Eagle/Lion Coat of Arms in Gold -->
      <path d="M 0 -50 L 10 -40 L 0 -28 L -10 -40 Z" fill="url(#goldLight)"/>
      <circle cx="-16" cy="-38" r="4" fill="url(#goldLight)"/>
      <circle cx="16" cy="-38" r="4" fill="url(#goldLight)"/>
    </g>
    <text x="25" y="380" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Heavy Gold Signet Seal</text>
    <text x="25" y="402" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Massive beveled golden signet ring bearing an embossed imperial seal crest.</text>
  </g>

  <!-- ==================== ROW 2: MYTHIC BEASTS & GUARDIANS (5-8) ==================== -->

  <!-- 5. Draco Inferno -->
  <g transform="translate(135, 660)">
    <rect x="0" y="0" width="710" height="430" rx="22" fill="url(#cardGrad)" stroke="#EA580C" stroke-width="1.5" filter="url(#shadow3D)"/>
    <text x="25" y="38" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800">5. Draco Inferno</text>
    <text x="25" y="60" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">MYTHIC BEASTS • MYTHIC</text>
    <rect x="580" y="20" width="105" height="26" rx="8" fill="#EA580C" fill-opacity="0.2" stroke="#EA580C" stroke-width="1"/>
    <text x="632" y="38" fill="#FB923C" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">5,000 COINS</text>

    <g transform="translate(355, 215)">
      <ellipse cx="0" cy="85" rx="140" ry="38" fill="url(#auraGold)" filter="url(#brightGlow)"/>
      <polygon points="-75,65 -50,90 50,90 75,65 55,45 -55,45" fill="#1C1917" stroke="#EA580C" stroke-width="2"/>
      <path d="M -55 50 Q -75 -10 -35 -40 Q 0 -60 35 -30 Q 70 0 50 50 Q 0 70 -55 50 Z" fill="url(#magmaScale)" stroke="#431407" stroke-width="3" filter="url(#shadow3D)"/>
      <path d="M -30 -30 Q -40 -70 -10 -90 Q 20 -85 30 -50 Q 40 -10 10 -15 Z" fill="#7C2D12" stroke="url(#goldMetallic)" stroke-width="2"/>
      <path d="M -15 -85 Q -40 -120 -60 -110 Q -35 -85 -20 -70 Z" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2"/>
      <path d="M 15 -85 Q 40 -120 60 -110 Q 35 -85 20 -70 Z" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2"/>
      <circle cx="-8" cy="-55" r="4" fill="#FEF08A" filter="url(#softGlow)"/>
      <path d="M -15 -35 Q 0 -20 15 -35" stroke="#FDE047" stroke-width="4" filter="url(#brightGlow)"/>
      <path d="M -45 -10 Q -95 -50 -70 -70 Q -45 -35 -35 -20" fill="url(#magmaScale)" stroke="url(#goldMetallic)" stroke-width="1.5"/>
      <path d="M 45 -10 Q 95 -50 70 -70 Q 45 -35 35 -20" fill="url(#magmaScale)" stroke="url(#goldMetallic)" stroke-width="1.5"/>
      <circle cx="-45" cy="-60" r="3" fill="#F97316" filter="url(#softGlow)"/>
      <circle cx="50" cy="-80" r="2.5" fill="#FBBF24" filter="url(#softGlow)"/>
    </g>
    <text x="25" y="380" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Sculpted Magma Dragon</text>
    <text x="25" y="402" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Miniature coiled wyrm with volcanic rock plinth &amp; glowing gold horns.</text>
  </g>

  <!-- 6. Phoenix Rebirth -->
  <g transform="translate(875, 660)">
    <rect x="0" y="0" width="710" height="430" rx="22" fill="url(#cardGrad)" stroke="#F97316" stroke-width="1.5" filter="url(#shadow3D)"/>
    <text x="25" y="38" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800">6. Phoenix Rebirth</text>
    <text x="25" y="60" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">MYTHIC BEASTS • LEGENDARY</text>
    <rect x="580" y="20" width="105" height="26" rx="8" fill="#F97316" fill-opacity="0.2" stroke="#F97316" stroke-width="1"/>
    <text x="632" y="38" fill="#FDBA74" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">4,600 COINS</text>

    <g transform="translate(355, 215)">
      <ellipse cx="0" cy="85" rx="140" ry="38" fill="url(#auraRed)" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="85" rx="85" ry="20" fill="#000000" opacity="0.6"/>
      <!-- Flaming Base Nest -->
      <path d="M -50 65 Q 0 85 50 65 Q 25 45 0 50 Q -25 45 -50 65 Z" fill="url(#magmaScale)"/>
      <!-- Soaring Phoenix Body -->
      <path d="M 0 50 Q -20 15 0 -35 Q 20 15 0 50 Z" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2" filter="url(#shadow3D)"/>
      <!-- Spreading Fire Wings -->
      <path d="M -10 -15 Q -75 -45 -85 -90 Q -45 -70 -15 -35" fill="url(#magmaScale)" stroke="url(#goldMetallic)" stroke-width="2"/>
      <path d="M 10 -15 Q 75 -45 85 -90 Q 45 -70 15 -35" fill="url(#magmaScale)" stroke="url(#goldMetallic)" stroke-width="2"/>
      <!-- Crown Plume & Beak -->
      <polygon points="0,-45 -6,-35 6,-35" fill="url(#goldLight)"/>
      <path d="M 0 -45 Q -15 -80 0 -95 Q 15 -80 0 -45" fill="url(#goldLight)" filter="url(#softGlow)"/>
      <circle cx="0" cy="-95" r="4" fill="#FFFFFF"/>
    </g>
    <text x="25" y="380" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Solar Firebird Ascendant</text>
    <text x="25" y="402" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Majestic golden phoenix spreading flaming wings from a volcanic ash nest.</text>
  </g>

  <!-- 7. Airavata Royale (Maharaja Elephant) -->
  <g transform="translate(1615, 660)">
    <rect x="0" y="0" width="710" height="430" rx="22" fill="url(#cardGrad)" stroke="#A855F7" stroke-width="1.5" filter="url(#shadow3D)"/>
    <text x="25" y="38" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800">7. Airavata Royale</text>
    <text x="25" y="60" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">MYTHIC BEASTS • HERITAGE</text>
    <rect x="580" y="20" width="105" height="26" rx="8" fill="#A855F7" fill-opacity="0.2" stroke="#A855F7" stroke-width="1"/>
    <text x="632" y="38" fill="#D8B4FE" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">4,800 COINS</text>

    <g transform="translate(355, 215)">
      <ellipse cx="0" cy="85" rx="140" ry="38" fill="url(#auraPurple)" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="65" rx="75" ry="22" fill="url(#goldMetallic)"/>
      <path d="M -60 65 Q -75 50 -60 40 Q -45 55 -60 65 Z" fill="#F43F5E"/>
      <path d="M 60 65 Q 75 50 60 40 Q 45 55 60 65 Z" fill="#F43F5E"/>
      <!-- Body -->
      <ellipse cx="0" cy="20" rx="55" ry="45" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2.5" filter="url(#shadow3D)"/>
      <rect x="-42" y="35" width="20" height="35" rx="8" fill="url(#goldLight)" stroke="#78350F" stroke-width="1.5"/>
      <rect x="22" y="35" width="20" height="35" rx="8" fill="url(#goldLight)" stroke="#78350F" stroke-width="1.5"/>
      <path d="M -35 5 Q 0 15 35 5 L 30 35 Q 0 45 -30 35 Z" fill="url(#rubyGem)" stroke="url(#goldMetallic)" stroke-width="2"/>
      <!-- Head & Raised Trunk -->
      <circle cx="-30" cy="-25" r="28" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2"/>
      <path d="M -48 -25 Q -75 -40 -65 -70 Q -50 -80 -45 -65 Q -55 -45 -35 -38" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2"/>
      <!-- Howdah Palanquin -->
      <polygon points="-25,-5 25,-5 20,-35 -20,-35" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2"/>
      <circle cx="0" cy="-45" r="6" fill="url(#emeraldGem)" filter="url(#softGlow)"/>
    </g>
    <text x="25" y="380" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Maharaja Temple Elephant</text>
    <text x="25" y="402" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Gilded ceremonial temple elephant with jeweled howdah &amp; raised trunk.</text>
  </g>

  <!-- 8. Royal Bengal Vyaghra (Golden Tiger) -->
  <g transform="translate(2355, 660)">
    <rect x="0" y="0" width="710" height="430" rx="22" fill="url(#cardGrad)" stroke="#EAB308" stroke-width="1.5" filter="url(#shadow3D)"/>
    <text x="25" y="38" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800">8. Bengal Vyaghra</text>
    <text x="25" y="60" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">MYTHIC BEASTS • EPIC</text>
    <rect x="580" y="20" width="105" height="26" rx="8" fill="#EAB308" fill-opacity="0.2" stroke="#EAB308" stroke-width="1"/>
    <text x="632" y="38" fill="#FDE047" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">3,900 COINS</text>

    <g transform="translate(355, 215)">
      <ellipse cx="0" cy="85" rx="140" ry="38" fill="url(#auraGold)" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="85" rx="85" ry="20" fill="#000000" opacity="0.6"/>
      <!-- Rock Outcrop Plinth -->
      <polygon points="-70,75 -50,55 50,55 70,75" fill="#1E293B" stroke="url(#goldMetallic)" stroke-width="2"/>
      <!-- Crouching 3D Tiger Body -->
      <path d="M -50 45 Q -65 15 -25 -10 L 25 -10 Q 65 15 50 45 Z" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2" filter="url(#shadow3D)"/>
      <!-- Tiger Stripes (Obsidian black) -->
      <path d="M -25 30 L -15 10 M -10 35 L 0 15 M 10 35 L 20 15" stroke="#18181B" stroke-width="3"/>
      <!-- Tiger Head with open jaws -->
      <circle cx="-35" cy="-25" r="22" fill="url(#goldLight)" stroke="#78350F" stroke-width="2"/>
      <!-- Ears & Emerald Eyes -->
      <polygon points="-48,-42 -40,-30 -52,-28" fill="url(#goldMetallic)"/>
      <circle cx="-38" cy="-28" r="3.5" fill="url(#emeraldGem)" filter="url(#softGlow)"/>
      <!-- Fangs -->
      <polygon points="-48,-15 -42,-18 -45,-8" fill="#FFFFFF"/>
    </g>
    <text x="25" y="380" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Royal Bengal Golden Tiger</text>
    <text x="25" y="402" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Crouching golden predator with obsidian stripes and glowing emerald eyes.</text>
  </g>

  <!-- ==================== ROW 3: CYBER, SCI-FI & COSMIC (9-12) ==================== -->

  <!-- 9. Neo Valkyrie (Cyber Hover Drone) -->
  <g transform="translate(135, 1120)">
    <rect x="0" y="0" width="710" height="430" rx="22" fill="url(#cardGrad)" stroke="#06B6D4" stroke-width="1.5" filter="url(#shadow3D)"/>
    <text x="25" y="38" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800">9. Neo Valkyrie</text>
    <text x="25" y="60" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">CYBER &amp; COSMIC • CYBER 3D</text>
    <rect x="580" y="20" width="105" height="26" rx="8" fill="#06B6D4" fill-opacity="0.2" stroke="#06B6D4" stroke-width="1"/>
    <text x="632" y="38" fill="#38BDF8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">3,800 COINS</text>

    <g transform="translate(355, 215)">
      <ellipse cx="0" cy="85" rx="140" ry="38" fill="url(#auraCyan)" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="85" rx="80" ry="24" fill="none" stroke="#06B6D4" stroke-width="2" stroke-dasharray="6 4"/>
      <!-- Anti-Grav Propulsion Ring -->
      <ellipse cx="0" cy="40" rx="85" ry="22" fill="none" stroke="url(#cyanPlasma)" stroke-width="8" filter="url(#softGlow)"/>
      <ellipse cx="0" cy="40" rx="85" ry="22" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.9"/>
      <!-- Aerodynamic Chassis -->
      <path d="M -50 20 L -30 -60 Q 0 -85 30 -60 L 50 20 Q 0 45 -50 20 Z" fill="url(#chromePlate)" stroke="#0891B2" stroke-width="2" filter="url(#shadow3D)"/>
      <polygon points="-50,15 -85,-10 -60,-25 -40,-10" fill="#1E293B" stroke="#06B6D4" stroke-width="2"/>
      <polygon points="50,15 85,-10 60,-25 40,-10" fill="#1E293B" stroke="#06B6D4" stroke-width="2"/>
      <ellipse cx="0" cy="-35" rx="22" ry="14" fill="url(#cyanPlasma)" stroke="#E0F2FE" stroke-width="2" filter="url(#brightGlow)"/>
      <circle cx="0" cy="-105" r="7" fill="#38BDF8" filter="url(#brightGlow)"/>
    </g>
    <text x="25" y="380" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Anti-Gravity Hover Drone</text>
    <text x="25" y="402" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Floating robotic core with dual cyan plasma thrusters &amp; holographic ground ring.</text>
  </g>

  <!-- 10. Celestial Shard (Prismatic Gemstone) -->
  <g transform="translate(875, 1120)">
    <rect x="0" y="0" width="710" height="430" rx="22" fill="url(#cardGrad)" stroke="#10B981" stroke-width="1.5" filter="url(#shadow3D)"/>
    <text x="25" y="38" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800">10. Celestial Shard</text>
    <text x="25" y="60" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">CYBER &amp; COSMIC • PRISMATIC</text>
    <rect x="580" y="20" width="105" height="26" rx="8" fill="#10B981" fill-opacity="0.2" stroke="#10B981" stroke-width="1"/>
    <text x="632" y="38" fill="#34D399" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">3,200 COINS</text>

    <g transform="translate(355, 215)">
      <ellipse cx="0" cy="85" rx="140" ry="38" fill="url(#auraEmerald)" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="0" rx="80" ry="80" fill="none" stroke="url(#goldMetallic)" stroke-width="5" transform="rotate(25)" filter="url(#shadow3D)"/>
      <ellipse cx="0" cy="0" rx="75" ry="30" fill="none" stroke="url(#goldMetallic)" stroke-width="4" transform="rotate(-35)"/>
      <polygon points="0,-90 -45,-30 0,45" fill="#047857"/>
      <polygon points="0,-90 45,-30 0,45" fill="#065F46"/>
      <polygon points="0,-90 -25,-15 0,60" fill="url(#emeraldGem)"/>
      <polygon points="0,-90 25,-15 0,60" fill="#34D399"/>
      <circle cx="0" cy="-10" r="14" fill="#ECFDF5" filter="url(#brightGlow)"/>
      <line x1="0" y1="-90" x2="0" y2="60" stroke="#FFFFFF" stroke-width="2.5" opacity="0.9"/>
    </g>
    <text x="25" y="380" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Faceted Levitating Crystal</text>
    <text x="25" y="402" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Geometric multi-faceted gemstone suspended in spinning golden orbital gimbals.</text>
  </g>

  <!-- 11. Supernova Core (Plasma Reactor) -->
  <g transform="translate(1615, 1120)">
    <rect x="0" y="0" width="710" height="430" rx="22" fill="url(#cardGrad)" stroke="#C084FC" stroke-width="1.5" filter="url(#shadow3D)"/>
    <text x="25" y="38" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800">11. Supernova Core</text>
    <text x="25" y="60" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">CYBER &amp; COSMIC • LEGENDARY</text>
    <rect x="580" y="20" width="105" height="26" rx="8" fill="#C084FC" fill-opacity="0.2" stroke="#C084FC" stroke-width="1"/>
    <text x="632" y="38" fill="#E879F9" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">4,400 COINS</text>

    <g transform="translate(355, 215)">
      <ellipse cx="0" cy="85" rx="140" ry="38" fill="url(#auraPurple)" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="85" rx="85" ry="20" fill="#000000" opacity="0.6"/>
      <!-- Magnetic Containment Field -->
      <circle cx="0" cy="0" r="55" fill="none" stroke="#E879F9" stroke-width="3" stroke-dasharray="10 5" filter="url(#brightGlow)"/>
      <!-- Glowing Star Plasma Core -->
      <circle cx="0" cy="0" r="42" fill="url(#amethystGem)" filter="url(#brightGlow)"/>
      <circle cx="0" cy="0" r="22" fill="#FFFFFF" filter="url(#softGlow)"/>
      <!-- 4 Magnetic Pylon Emitters -->
      <polygon points="-65,0 -50,-10 -50,10" fill="url(#chromePlate)" stroke="#A855F7" stroke-width="1.5"/>
      <polygon points="65,0 50,-10 50,10" fill="url(#chromePlate)" stroke="#A855F7" stroke-width="1.5"/>
      <polygon points="0,-65 -10,-50 10,-50" fill="url(#chromePlate)" stroke="#A855F7" stroke-width="1.5"/>
      <polygon points="0,65 -10,50 10,50" fill="url(#chromePlate)" stroke="#A855F7" stroke-width="1.5"/>
    </g>
    <text x="25" y="380" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Subatomic Fusion Star</text>
    <text x="25" y="402" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Pulsing celestial plasma core bound by 4 titanium magnetic containment pylons.</text>
  </g>

  <!-- 12. Astral Voyager (Cosmic Helmet) -->
  <g transform="translate(2355, 1120)">
    <rect x="0" y="0" width="710" height="430" rx="22" fill="url(#cardGrad)" stroke="#38BDF8" stroke-width="1.5" filter="url(#shadow3D)"/>
    <text x="25" y="38" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800">12. Astral Voyager</text>
    <text x="25" y="60" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">CYBER &amp; COSMIC • EPIC</text>
    <rect x="580" y="20" width="105" height="26" rx="8" fill="#0284C7" fill-opacity="0.2" stroke="#38BDF8" stroke-width="1"/>
    <text x="632" y="38" fill="#38BDF8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">3,400 COINS</text>

    <g transform="translate(355, 215)">
      <ellipse cx="0" cy="85" rx="140" ry="38" fill="url(#auraCyan)" filter="url(#brightGlow)"/>
      <!-- Astronaut Helmet Dome -->
      <circle cx="0" cy="0" r="55" fill="url(#chromePlate)" stroke="#0E7490" stroke-width="3" filter="url(#shadow3D)"/>
      <!-- Gold/Rainbow Reflective Visor -->
      <ellipse cx="0" cy="-5" rx="42" ry="30" fill="url(#goldMetallic)" stroke="#06B6D4" stroke-width="2" filter="url(#brightGlow)"/>
      <ellipse cx="-12" cy="-14" rx="18" ry="8" fill="#FFFFFF" opacity="0.6"/>
      <!-- Neck Ring Collar -->
      <rect x="-35" y="45" width="70" height="22" rx="6" fill="#334155" stroke="url(#goldMetallic)" stroke-width="2"/>
    </g>
    <text x="25" y="380" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Cosmonaut Visor Helmet</text>
    <text x="25" y="402" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Pressurized space helmet with gold reflective visor and aerospace collar.</text>
  </g>

  <!-- ==================== ROW 4: WARRIORS, LEGENDS & CULTURE (13-16) ==================== -->

  <!-- 13. Aegis Champion (Spartan War Helmet) -->
  <g transform="translate(135, 1580)">
    <rect x="0" y="0" width="710" height="430" rx="22" fill="url(#cardGrad)" stroke="#F59E0B" stroke-width="1.5" filter="url(#shadow3D)"/>
    <text x="25" y="38" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800">13. Aegis Champion</text>
    <text x="25" y="60" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">WARRIORS &amp; LEGENDS • WARRIOR</text>
    <rect x="580" y="20" width="105" height="26" rx="8" fill="#F59E0B" fill-opacity="0.2" stroke="#F59E0B" stroke-width="1"/>
    <text x="632" y="38" fill="#FDE047" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">2,800 COINS</text>

    <g transform="translate(355, 215)">
      <ellipse cx="0" cy="85" rx="140" ry="38" fill="url(#auraGold)" filter="url(#brightGlow)"/>
      <polygon points="-70,60 -55,85 55,85 70,60 55,48 -55,48" fill="#334155" stroke="url(#goldMetallic)" stroke-width="2"/>
      <!-- Horsehair Crest -->
      <path d="M -15 -115 Q 40 -135 85 -75 Q 70 -55 55 -65 Q 25 -105 -10 -95 Z" fill="#DC2626" stroke="#991B1B" stroke-width="2" filter="url(#shadow3D)"/>
      <!-- Bronze Helmet -->
      <path d="M -55 35 Q -65 -45 -25 -75 Q 0 -90 25 -75 Q 65 -45 55 35 Q 20 45 0 45 Q -20 45 -55 35 Z" fill="url(#bronzeArmor)" stroke="#78350F" stroke-width="3" filter="url(#shadow3D)"/>
      <polygon points="-8,-40 8,-40 5,15 -5,15" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="1.5"/>
      <polygon points="-35,-15 -10,-15 -6,-8 -30,-8" fill="#FEF08A" filter="url(#softGlow)"/>
      <polygon points="35,-15 10,-15 6,-8 30,-8" fill="#FEF08A" filter="url(#softGlow)"/>
    </g>
    <text x="25" y="380" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Ancient Spartan War Helmet</text>
    <text x="25" y="402" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Sculpted bronze Corinthian battle helmet with flowing crimson horsehair crest.</text>
  </g>

  <!-- 14. Samurai Shogun (Kabuto Mask) -->
  <g transform="translate(875, 1580)">
    <rect x="0" y="0" width="710" height="430" rx="22" fill="url(#cardGrad)" stroke="#DC2626" stroke-width="1.5" filter="url(#shadow3D)"/>
    <text x="25" y="38" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800">14. Samurai Shogun</text>
    <text x="25" y="60" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">WARRIORS &amp; LEGENDS • EPIC</text>
    <rect x="580" y="20" width="105" height="26" rx="8" fill="#DC2626" fill-opacity="0.2" stroke="#DC2626" stroke-width="1"/>
    <text x="632" y="38" fill="#FCA5A5" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">3,500 COINS</text>

    <g transform="translate(355, 215)">
      <ellipse cx="0" cy="85" rx="140" ry="38" fill="url(#auraRed)" filter="url(#brightGlow)"/>
      <!-- Black Lacquer Kabuto Helmet -->
      <path d="M -50 30 Q -65 -40 0 -65 Q 65 -40 50 30 Z" fill="#18181B" stroke="url(#goldMetallic)" stroke-width="3" filter="url(#shadow3D)"/>
      <!-- Grand Golden Horns (Kuwagata) -->
      <path d="M -10 -60 Q -50 -120 -85 -105 Q -55 -80 -15 -50 Z" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2"/>
      <path d="M 10 -60 Q 50 -120 85 -105 Q 55 -80 15 -50 Z" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2"/>
      <circle cx="0" cy="-55" r="9" fill="url(#rubyGem)" stroke="url(#goldMetallic)" stroke-width="2"/>
      <!-- Menpo Oni Face Armor -->
      <path d="M -35 25 Q 0 45 35 25 L 25 50 Q 0 65 -25 50 Z" fill="#B91C1C" stroke="#450A0A" stroke-width="2"/>
      <line x1="-15" y1="35" x2="15" y2="35" stroke="#FFFFFF" stroke-width="3"/>
    </g>
    <text x="25" y="380" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Shogun Battle Kabuto</text>
    <text x="25" y="402" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Black lacquer samurai battle helmet with sweeping golden Kuwagata horns.</text>
  </g>

  <!-- 15. Trishula of Shiva (Divine Trident) -->
  <g transform="translate(1615, 1580)">
    <rect x="0" y="0" width="710" height="430" rx="22" fill="url(#cardGrad)" stroke="#F59E0B" stroke-width="1.5" filter="url(#shadow3D)"/>
    <text x="25" y="38" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800">15. Sacred Trishula</text>
    <text x="25" y="60" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">WARRIORS &amp; LEGENDS • HERITAGE</text>
    <rect x="580" y="20" width="105" height="26" rx="8" fill="#F59E0B" fill-opacity="0.2" stroke="#F59E0B" stroke-width="1"/>
    <text x="632" y="38" fill="#FDE047" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">4,600 COINS</text>

    <g transform="translate(355, 215)">
      <ellipse cx="0" cy="85" rx="140" ry="38" fill="url(#auraGold)" filter="url(#brightGlow)"/>
      <!-- Stone Shrine Pedestal -->
      <polygon points="-55,80 -40,55 40,55 55,80" fill="#1E293B" stroke="url(#goldMetallic)" stroke-width="2"/>
      <!-- Brass Scepter Shaft -->
      <rect x="-8" y="-10" width="16" height="70" rx="4" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2"/>
      <!-- Damru Hourglass Drum on Shaft -->
      <polygon points="-20,20 20,20 0,35 -20,50 20,50 0,35" fill="#B45309" stroke="#451A03" stroke-width="1.5"/>
      <!-- Trident Prongs (Central straight + 2 curved) -->
      <path d="M -5 -10 L -5 -100 L 5 -100 L 5 -10 Z" fill="url(#goldLight)" stroke="#78350F" stroke-width="2"/>
      <path d="M -8 -10 Q -45 -35 -40 -85 Q -30 -60 -5 -50" fill="url(#goldLight)" stroke="#78350F" stroke-width="2"/>
      <path d="M 8 -10 Q 45 -35 40 -85 Q 30 -60 5 -50" fill="url(#goldLight)" stroke="#78350F" stroke-width="2"/>
      <!-- Sacred Fire Halo on Center Tip -->
      <circle cx="0" cy="-105" r="5" fill="#EF4444" filter="url(#brightGlow)"/>
    </g>
    <text x="25" y="380" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Divine Gilded Trishula</text>
    <text x="25" y="402" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Radiant golden sacred trident adorned with damru drum &amp; celestial flame tips.</text>
  </g>

  <!-- 16. Nostalgia 3310 (Arcade Legend) -->
  <g transform="translate(2355, 1580)">
    <rect x="0" y="0" width="710" height="430" rx="22" fill="url(#cardGrad)" stroke="#10B981" stroke-width="1.5" filter="url(#shadow3D)"/>
    <text x="25" y="38" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="19" font-weight="800">16. Retro 3310 Legend</text>
    <text x="25" y="60" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600">WARRIORS &amp; LEGENDS • RETRO NOSTALGIA</text>
    <rect x="580" y="20" width="105" height="26" rx="8" fill="#10B981" fill-opacity="0.2" stroke="#10B981" stroke-width="1"/>
    <text x="632" y="38" fill="#34D399" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">3,000 COINS</text>

    <g transform="translate(355, 215)">
      <ellipse cx="0" cy="85" rx="140" ry="38" fill="url(#auraEmerald)" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="85" rx="85" ry="20" fill="#000000" opacity="0.6"/>
      <!-- 3D Sculpted Retro Handheld Chassis (Indestructible Blue/Grey) -->
      <rect x="-45" y="-95" width="90" height="155" rx="26" fill="#1E3A8A" stroke="url(#goldMetallic)" stroke-width="3" filter="url(#shadow3D)"/>
      <rect x="-42" y="-92" width="84" height="149" rx="24" fill="none" stroke="#FFFFFF" stroke-width="1.5" opacity="0.4"/>
      <!-- Iconic Monochrome Green LCD Screen with Snake -->
      <rect x="-30" y="-75" width="60" height="48" rx="6" fill="#8BAC0F" stroke="#306230" stroke-width="2"/>
      <!-- Snake pixels on screen -->
      <rect x="-20" y="-55" width="6" height="6" fill="#0F380F"/>
      <rect x="-14" y="-55" width="6" height="6" fill="#0F380F"/>
      <rect x="-8" y="-55" width="6" height="6" fill="#0F380F"/>
      <rect x="-8" y="-61" width="6" height="6" fill="#0F380F"/>
      <rect x="10" y="-45" width="6" height="6" fill="#0F380F"/>
      <!-- Silver Navi Key & Keypad Buttons -->
      <ellipse cx="0" cy="-12" rx="16" ry="7" fill="url(#chromePlate)" stroke="#334155" stroke-width="1"/>
      <circle cx="-22" cy="8" r="5" fill="url(#goldMetallic)"/>
      <circle cx="0" cy="8" r="5" fill="url(#goldMetallic)"/>
      <circle cx="22" cy="8" r="5" fill="url(#goldMetallic)"/>
      <circle cx="-22" cy="24" r="5" fill="url(#goldMetallic)"/>
      <circle cx="0" cy="24" r="5" fill="url(#goldMetallic)"/>
      <circle cx="22" cy="24" r="5" fill="url(#goldMetallic)"/>
    </g>
    <text x="25" y="380" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Indestructible Retro Brick</text>
    <text x="25" y="402" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Sculpted 3D miniature retro handheld phone featuring playable snake pixel screen.</text>
  </g>

  <!-- ════════════════ FOOTER: ARCHITECTURE PILLARS ════════════════ -->
  <g transform="translate(135, 2060)">
    <text x="0" y="30" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700">
      BHALYAM 16-TOKEN EXPANSION: All 16 tokens utilize modular SVG GPU rendering, dynamic seat-colored floor pedestals, zero WebGL bundle bloat, and full Ludo safe-star fanning support.
    </text>
  </g>
</svg>
`;

async function main() {
  console.log("Generating high-resolution 16-token reference showcase image...");
  
  const publicOutPath = path.resolve("client/public/token-reference-showcase-16.png");
  const brainDir = "C:/Users/GontlaKethanKumar/.gemini/antigravity/brain/d9bde247-1cfb-4a82-94db-ec5682f99da4";
  const brainOutPath = path.join(brainDir, "token-reference-showcase-16.png");

  if (!fs.existsSync(brainDir)) {
    fs.mkdirSync(brainDir, { recursive: true });
  }

  const pngBuffer = await sharp(Buffer.from(svgContent))
    .png({ quality: 100 })
    .toBuffer();

  fs.writeFileSync(publicOutPath, pngBuffer);
  fs.writeFileSync(brainOutPath, pngBuffer);

  console.log(`Saved public asset: ${publicOutPath} (${(pngBuffer.length / 1024).toFixed(1)} KB)`);
  console.log(`Saved brain asset:  ${brainOutPath} (${(pngBuffer.length / 1024).toFixed(1)} KB)`);
}

main().catch(err => {
  console.error("Error generating showcase image:", err);
  process.exit(1);
});
