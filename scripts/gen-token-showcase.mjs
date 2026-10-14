import fs from 'fs';
import path from 'path';
import sharp from '../client/node_modules/sharp/dist/index.mjs';

const WIDTH = 2400;
const HEIGHT = 1400;

// High-fidelity SVG representing the comparative visual specification
const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <!-- Background Gradients -->
    <radialGradient id="bgGlow" cx="50%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="50%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#020617"/>
    </radialGradient>
    
    <radialGradient id="headerGold" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="60%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </radialGradient>

    <!-- Card Backgrounds -->
    <linearGradient id="cardGradDark" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0.95"/>
    </linearGradient>

    <linearGradient id="cardGradLegacy" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#331D1D" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#1A0D0D" stop-opacity="0.9"/>
    </linearGradient>

    <!-- Gold Materials -->
    <linearGradient id="goldMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFBEB"/>
      <stop offset="25%" stop-color="#FCD34D"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="75%" stop-color="#D97706"/>
      <stop offset="100%" stop-color="#78350F"/>
    </linearGradient>

    <linearGradient id="goldLight" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="50%" stop-color="#EAB308"/>
      <stop offset="100%" stop-color="#A16207"/>
    </linearGradient>

    <!-- Gem & Element Gradients -->
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

    <!-- Pedestal Lighting Gradients -->
    <radialGradient id="pedestalGold" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FDE047" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#CA8A04" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#713F12" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="pedestalRed" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F87171" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#DC2626" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#7F1D1D" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="pedestalCyan" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#0284C7" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#082F49" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="pedestalEmerald" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#34D399" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#059669" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#064E3B" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="pedestalPurple" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#C084FC" stop-opacity="0.8"/>
      <stop offset="60%" stop-color="#7E22CE" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#3B0764" stop-opacity="0"/>
    </radialGradient>

    <!-- Filters for Bevels & Glows -->
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <filter id="brightGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="14" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <filter id="shadow3D" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="16" stdDeviation="12" flood-color="#000000" flood-opacity="0.65"/>
    </filter>
  </defs>

  <!-- Deep Velvet / Carbon Studio Background -->
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bgGlow)"/>

  <!-- Subtle Blueprint / Gaming Grid Lines -->
  <g stroke="#334155" stroke-width="1" stroke-dasharray="4 8" opacity="0.25">
    <line x1="0" y1="180" x2="${WIDTH}" y2="180"/>
    <line x1="0" y1="1220" x2="${WIDTH}" y2="1220"/>
    <line x1="680" y1="180" x2="680" y2="1220"/>
    <line x1="1250" y1="180" x2="1250" y2="1220"/>
    <line x1="1820" y1="180" x2="1820" y2="1220"/>
  </g>

  <!-- ════════════════════════════ HEADER AREA ════════════════════════════ -->
  <g transform="translate(100, 50)">
    <!-- Brand Badges -->
    <rect x="0" y="0" width="160" height="32" rx="16" fill="#F59E0B" fill-opacity="0.15" stroke="#F59E0B" stroke-width="1.5"/>
    <text x="80" y="21" fill="#FBBF24" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" letter-spacing="2" text-anchor="middle">BHALYAM DLS</text>

    <rect x="175" y="0" width="220" height="32" rx="16" fill="#06B6D4" fill-opacity="0.15" stroke="#06B6D4" stroke-width="1.5"/>
    <text x="285" y="21" fill="#38BDF8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" letter-spacing="2" text-anchor="middle">LUDO KING BENCHMARK</text>

    <!-- Main Title -->
    <text x="0" y="75" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="900" letter-spacing="1">
      NEXT-GEN INVENTIVE 3D TOKENS SPECIFICATION
    </text>
    <text x="0" y="105" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="500">
      Transforming flat 2D pawn shapes into luxury 3D sculptured collectible figurines with volumetric lighting &amp; seat-anchored floor auras.
    </text>

    <!-- Status Pill -->
    <g transform="translate(1800, 20)">
      <rect x="0" y="0" width="400" height="60" rx="18" fill="#1E293B" stroke="#475569" stroke-width="1.5"/>
      <circle cx="35" cy="30" r="10" fill="#10B981" filter="url(#softGlow)"/>
      <text x="60" y="27" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800">DESIGN ARCHITECTURE READY</text>
      <text x="60" y="47" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="500">6 Unique Sculpted 3D Archetypes Proposed</text>
    </g>
  </g>

  <!-- ════════════════ LEFT COLUMN: CURRENT DEFICIENT DESIGN ════════════════ -->
  <g transform="translate(80, 200)">
    <!-- Container Card -->
    <rect x="0" y="0" width="560" height="980" rx="28" fill="url(#cardGradLegacy)" stroke="#DC2626" stroke-width="2" stroke-opacity="0.4" filter="url(#shadow3D)"/>
    
    <!-- Top Warning Header -->
    <g transform="translate(30, 30)">
      <rect x="0" y="0" width="500" height="48" rx="12" fill="#7F1D1D" fill-opacity="0.4" stroke="#DC2626" stroke-width="1.5"/>
      <text x="25" y="30" fill="#FCA5A5" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="800" letter-spacing="1">
        CURRENT BHALYAM TOKENS (DEFICIENT)
      </text>
      <rect x="420" y="10" width="65" height="28" rx="8" fill="#EF4444"/>
      <text x="452" y="28" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="900" text-anchor="middle">POOR</text>
    </g>

    <!-- Legacy Pawn Representation -->
    <g transform="translate(280, 260)">
      <!-- Dull flat drop shadow -->
      <ellipse cx="0" cy="140" rx="70" ry="16" fill="#000000" opacity="0.45"/>
      
      <!-- Dull 2D Pawn Base -->
      <path d="M -70 120 C -70 140, 70 140, 70 120 C 70 100, -70 100, -70 120 Z" fill="#DC2626" stroke="#991B1B" stroke-width="3"/>
      <!-- Dull 2D Pawn Body -->
      <path d="M -50 120 Q -80 0, -35 -50 Q 0 -80, 35 -50 Q 80 0, 50 120 Z" fill="#DC2626" stroke="#991B1B" stroke-width="3"/>
      <!-- Neck ring -->
      <ellipse cx="0" cy="-45" rx="42" ry="12" fill="#991B1B" stroke="#7F1D1D" stroke-width="2"/>
      <!-- Head -->
      <circle cx="0" cy="-90" r="42" fill="#DC2626" stroke="#991B1B" stroke-width="3"/>

      <!-- The current tiny clip-on accessory that looks bad -->
      <!-- Tiny 2D sticker crown -->
      <path d="M -28 -115 L -20 -100 L 0 -125 L 20 -100 L 28 -115 L 22 -92 L -22 -92 Z" fill="#F59E0B" stroke="#78350F" stroke-width="2"/>
      
      <!-- Defect Annotation Arrow -->
      <path d="M 60 -115 Q 110 -140 140 -120" stroke="#F87171" stroke-width="2" fill="none" stroke-dasharray="3 3"/>
      <circle cx="140" cy="-120" r="4" fill="#F87171"/>
      <text x="155" y="-115" fill="#FCA5A5" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700">Tiny 2D Clip-on Sticker</text>

      <path d="M 85 40 Q 130 30 150 50" stroke="#F87171" stroke-width="2" fill="none" stroke-dasharray="3 3"/>
      <circle cx="150" cy="50" r="4" fill="#F87171"/>
      <text x="165" y="55" fill="#FCA5A5" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700">Generic Flat Chess Pawn</text>
    </g>

    <!-- Why Users Hate It Callout Box -->
    <g transform="translate(35, 490)">
      <rect x="0" y="0" width="490" height="440" rx="18" fill="#180C0C" stroke="#7F1D1D" stroke-width="1.5"/>
      <text x="25" y="38" fill="#FCA5A5" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800">
        Key Deficiencies Identified by Founder:
      </text>

      <g transform="translate(25, 70)" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#E2E8F0">
        <!-- Point 1 -->
        <circle cx="8" cy="8" r="6" fill="#EF4444"/>
        <text x="25" y="13" font-weight="700" fill="#FFFFFF">1. Monotonous Silhouette:</text>
        <text x="25" y="34" fill="#94A3B8">Every single skin uses the same generic chess pawn</text>
        <text x="25" y="52" fill="#94A3B8">shape. Paying coins gives zero exciting silhouette change.</text>

        <!-- Point 2 -->
        <circle cx="8" cy="80" r="6" fill="#EF4444"/>
        <text x="25" y="85" font-weight="700" fill="#FFFFFF">2. Cheap "Sticker Overlay" Aesthetic:</text>
        <text x="25" y="106" fill="#94A3B8">Paid skins only glue a tiny 15px flat icon on the pawn's</text>
        <text x="25" y="124" fill="#94A3B8">head (ninja shuriken, hammer) or faint scratch lines.</text>

        <!-- Point 3 -->
        <circle cx="8" cy="152" r="6" fill="#EF4444"/>
        <text x="25" y="157" font-weight="700" fill="#FFFFFF">3. Zero Volumetric 3D Depth:</text>
        <text x="25" y="178" fill="#94A3B8">Lacks ambient occlusion, beveled edges, specular rim</text>
        <text x="25" y="196" fill="#94A3B8">lighting, or ground occlusion that modern players expect.</text>

        <!-- Point 4 -->
        <circle cx="8" cy="224" r="6" fill="#EF4444"/>
        <text x="25" y="229" font-weight="700" fill="#FFFFFF">4. Far Below Ludo King Standards:</text>
        <text x="25" y="250" fill="#94A3B8">Ludo King features full standalone 3D thematic models</text>
        <text x="25" y="268" fill="#94A3B8">(Crowns, Dragons, Warriors, Hover-Drones, Diamonds).</text>
      </g>

      <!-- Bottom Summary Alert -->
      <rect x="25" y="375" width="440" height="42" rx="10" fill="#EF4444" fill-opacity="0.15" stroke="#EF4444" stroke-width="1"/>
      <text x="245" y="401" fill="#F87171" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" text-anchor="middle">
        VERDICT: Players will not spend hard-earned coins on this.
      </text>
    </g>
  </g>

  <!-- ════════════════ RIGHT AREA: NEXT-GEN INVENTIVE 3D TOKENS ════════════════ -->
  <!-- Header Bar for Right Side -->
  <g transform="translate(680, 200)">
    <rect x="0" y="0" width="1640" height="60" rx="16" fill="#0F172A" stroke="#334155" stroke-width="1.5"/>
    <text x="30" y="38" fill="#F59E0B" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" letter-spacing="1">
      ★ PROPOSED INVENTIVE 3D TOKEN ARCHETYPES (LUDO KING REFERENCE STANDARD)
    </text>
    <text x="1600" y="38" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" text-anchor="end">
      100% Mobile 60fps Vector/SVG Scalable • Dynamic Seat-Color Auras
    </text>
  </g>

  <!-- GRID OF 6 INVENTIVE 3D TOKENS (2 Rows x 3 Columns) -->

  <!-- ── 1. IMPERIAL SOVEREIGN (3D ROYAL CROWN) ── -->
  <g transform="translate(680, 280)">
    <rect x="0" y="0" width="520" height="420" rx="24" fill="url(#cardGradDark)" stroke="#F59E0B" stroke-width="1.5" filter="url(#shadow3D)"/>
    
    <!-- Token Title & Badge -->
    <text x="25" y="40" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800">1. Imperial Sovereign</text>
    <rect x="390" y="20" width="105" height="24" rx="8" fill="#F59E0B" fill-opacity="0.2" stroke="#F59E0B" stroke-width="1"/>
    <text x="442" y="36" fill="#FDE047" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" text-anchor="middle">LEGENDARY</text>

    <!-- 3D Token Visual Stage -->
    <g transform="translate(260, 210)">
      <!-- Radial Floor Aura (Seat Red) -->
      <ellipse cx="0" cy="85" rx="140" ry="40" fill="url(#pedestalRed)" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="85" rx="90" ry="22" fill="#000000" opacity="0.6"/>

      <!-- Multi-tier 3D Golden Crown -->
      <!-- Velvet Cushion Base (Seat Colored Crimson) -->
      <ellipse cx="0" cy="55" rx="75" ry="24" fill="url(#rubyGem)" filter="url(#shadow3D)"/>
      <!-- Gold Beveled Rim Ring -->
      <ellipse cx="0" cy="50" rx="80" ry="25" fill="none" stroke="url(#goldMetallic)" stroke-width="12"/>
      <ellipse cx="0" cy="46" rx="80" ry="25" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.8"/>

      <!-- Emerald & Ruby Inset Studs on Rim -->
      <circle cx="-60" cy="55" r="7" fill="url(#emeraldGem)"/>
      <circle cx="-30" cy="62" r="8" fill="url(#sapphireGem)"/>
      <circle cx="0" cy="65" r="9" fill="url(#rubyGem)"/>
      <circle cx="30" cy="62" r="8" fill="url(#sapphireGem)"/>
      <circle cx="60" cy="55" r="7" fill="url(#emeraldGem)"/>

      <!-- Crown Arches & Spires -->
      <path d="M -80 45 Q -75 -20 -40 -35 Q -30 10 0 5 Q 30 10 40 -35 Q 75 -20 80 45" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="3" filter="url(#shadow3D)"/>
      <!-- Central Grand Spire -->
      <path d="M -30 40 Q -15 -60 0 -75 Q 15 -60 30 40 Z" fill="url(#goldLight)" stroke="#78350F" stroke-width="2"/>
      
      <!-- Pearls on Spires -->
      <circle cx="-40" cy="-35" r="10" fill="#FFFFFF" stroke="url(#goldMetallic)" stroke-width="2"/>
      <circle cx="40" cy="-35" r="10" fill="#FFFFFF" stroke="url(#goldMetallic)" stroke-width="2"/>
      <circle cx="0" cy="-75" r="14" fill="url(#rubyGem)" stroke="url(#goldMetallic)" stroke-width="3" filter="url(#softGlow)"/>

      <!-- Floating Gold Cross Finial -->
      <path d="M -5 -105 L 5 -105 L 5 -98 L 12 -98 L 12 -90 L 5 -90 L 5 -78 L -5 -78 L -5 -90 L -12 -90 L -12 -98 L -5 -98 Z" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="1.5"/>

      <!-- Sparkle Caustic Highlights -->
      <polygon points="0,-85 2,-75 12,-75 4,-69 7,-59 0,-65 -7,-59 -4,-69 -12,-75 -2,-75" fill="#FFFFFF" opacity="0.9"/>
    </g>

    <!-- Feature Description -->
    <text x="25" y="370" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Royal Crown Figurative Token</text>
    <text x="25" y="392" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Full 3D coronation crown with seat-colored velvet cushion &amp; glowing gem insets.</text>
  </g>

  <!-- ── 2. DRACO INFERNO (3D MAGMA DRAGON) ── -->
  <g transform="translate(1240, 280)">
    <rect x="0" y="0" width="520" height="420" rx="24" fill="url(#cardGradDark)" stroke="#EA580C" stroke-width="1.5" filter="url(#shadow3D)"/>
    
    <text x="25" y="40" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800">2. Draco Inferno</text>
    <rect x="390" y="20" width="105" height="24" rx="8" fill="#EA580C" fill-opacity="0.2" stroke="#EA580C" stroke-width="1"/>
    <text x="442" y="36" fill="#FB923C" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" text-anchor="middle">MYTHIC</text>

    <!-- 3D Dragon Stage -->
    <g transform="translate(260, 210)">
      <!-- Magma Floor Aura (Seat Orange/Gold) -->
      <ellipse cx="0" cy="85" rx="140" ry="40" fill="url(#pedestalGold)" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="85" rx="85" ry="22" fill="#000000" opacity="0.6"/>

      <!-- Volcanic Rock Plinth -->
      <polygon points="-75,65 -50,90 50,90 75,65 55,45 -55,45" fill="#1C1917" stroke="#EA580C" stroke-width="2"/>
      <path d="M -50 70 L 50 70 M -30 80 L 30 80" stroke="#F97316" stroke-width="2" opacity="0.7"/>

      <!-- Coiled 3D Dragon Body (Obsidian & Magma) -->
      <path d="M -55 50 Q -75 -10 -35 -40 Q 0 -60 35 -30 Q 70 0 50 50 Q 0 70 -55 50 Z" fill="url(#magmaScale)" stroke="#431407" stroke-width="3" filter="url(#shadow3D)"/>

      <!-- Sculpted Dragon Head -->
      <path d="M -30 -30 Q -40 -70 -10 -90 Q 20 -85 30 -50 Q 40 -10 10 -15 Z" fill="#7C2D12" stroke="url(#goldMetallic)" stroke-width="2"/>
      
      <!-- Curved Horns (Gold leaf) -->
      <path d="M -15 -85 Q -40 -120 -60 -110 Q -35 -85 -20 -70 Z" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2"/>
      <path d="M 15 -85 Q 40 -120 60 -110 Q 35 -85 20 -70 Z" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2"/>

      <!-- Glowing Slit Eye & Mouth Ember -->
      <circle cx="-8" cy="-55" r="4" fill="#FEF08A" filter="url(#softGlow)"/>
      <path d="M -15 -35 Q 0 -20 15 -35" stroke="#FDE047" stroke-width="4" filter="url(#brightGlow)"/>

      <!-- Wings Folded Back -->
      <path d="M -45 -10 Q -95 -50 -70 -70 Q -45 -35 -35 -20" fill="url(#magmaScale)" stroke="url(#goldMetallic)" stroke-width="1.5"/>
      <path d="M 45 -10 Q 95 -50 70 -70 Q 45 -35 35 -20" fill="url(#magmaScale)" stroke="url(#goldMetallic)" stroke-width="1.5"/>

      <!-- Floating Fire Embers -->
      <circle cx="-50" cy="-60" r="3" fill="#F97316" filter="url(#softGlow)"/>
      <circle cx="55" cy="-80" r="2.5" fill="#FBBF24" filter="url(#softGlow)"/>
      <circle cx="20" cy="-110" r="2" fill="#EF4444" filter="url(#softGlow)"/>
    </g>

    <text x="25" y="370" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Mythic Creature Figurine</text>
    <text x="25" y="392" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Sculpted miniature coiled wyrm with metallic gold horns &amp; glowing embers.</text>
  </g>

  <!-- ── 3. NEO VALKYRIE (3D LEVITATING CYBER DRONE) ── -->
  <g transform="translate(1800, 280)">
    <rect x="0" y="0" width="520" height="420" rx="24" fill="url(#cardGradDark)" stroke="#06B6D4" stroke-width="1.5" filter="url(#shadow3D)"/>
    
    <text x="25" y="40" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800">3. Neo Valkyrie</text>
    <rect x="390" y="20" width="105" height="24" rx="8" fill="#06B6D4" fill-opacity="0.2" stroke="#06B6D4" stroke-width="1"/>
    <text x="442" y="36" fill="#38BDF8" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" text-anchor="middle">CYBER 3D</text>

    <!-- 3D Drone Stage -->
    <g transform="translate(260, 210)">
      <!-- Cyan Floor Projection Aura (Seat Blue) -->
      <ellipse cx="0" cy="85" rx="140" ry="40" fill="url(#pedestalCyan)" filter="url(#brightGlow)"/>
      
      <!-- Holographic Grid Ring Projection on floor -->
      <ellipse cx="0" cy="85" rx="80" ry="24" fill="none" stroke="#06B6D4" stroke-width="2" stroke-dasharray="6 4"/>
      <ellipse cx="0" cy="85" rx="40" ry="12" fill="none" stroke="#38BDF8" stroke-width="1.5"/>

      <!-- Levitating Anti-Gravity Rings (Floating above floor) -->
      <ellipse cx="0" cy="40" rx="85" ry="22" fill="none" stroke="url(#cyanPlasma)" stroke-width="8" filter="url(#softGlow)"/>
      <ellipse cx="0" cy="40" rx="85" ry="22" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.9"/>

      <!-- Sleek Chrome Aerodynamic Core Body -->
      <path d="M -50 20 L -30 -60 Q 0 -85 30 -60 L 50 20 Q 0 45 -50 20 Z" fill="url(#chromePlate)" stroke="#0891B2" stroke-width="2" filter="url(#shadow3D)"/>

      <!-- Angular Neon Winglet Stabilizers -->
      <polygon points="-50,15 -85,-10 -60,-25 -40,-10" fill="#1E293B" stroke="#06B6D4" stroke-width="2"/>
      <polygon points="50,15 85,-10 60,-25 40,-10" fill="#1E293B" stroke="#06B6D4" stroke-width="2"/>

      <!-- Glowing Visor / Plasma Sphere Eye -->
      <ellipse cx="0" cy="-35" rx="22" ry="14" fill="url(#cyanPlasma)" stroke="#E0F2FE" stroke-width="2" filter="url(#brightGlow)"/>
      <line x1="-22" y1="-35" x2="22" y2="-35" stroke="#FFFFFF" stroke-width="2"/>

      <!-- Top Beacon Antenna with Pulsing Ring -->
      <line x1="0" y1="-75" x2="0" y2="-100" stroke="#06B6D4" stroke-width="3"/>
      <circle cx="0" cy="-105" r="7" fill="#38BDF8" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="-105" rx="18" ry="6" fill="none" stroke="#38BDF8" stroke-width="1.5" opacity="0.8"/>
    </g>

    <text x="25" y="370" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Sci-Fi Anti-Gravity Hover Drone</text>
    <text x="25" y="392" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Floating robotic core with dual cyan plasma thrusters &amp; holographic ground ring.</text>
  </g>

  <!-- ── 4. CELESTIAL SHARD (3D PRISMATIC GEMSTONE) ── -->
  <g transform="translate(680, 740)">
    <rect x="0" y="0" width="520" height="420" rx="24" fill="url(#cardGradDark)" stroke="#10B981" stroke-width="1.5" filter="url(#shadow3D)"/>
    
    <text x="25" y="40" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800">4. Celestial Shard</text>
    <rect x="390" y="20" width="105" height="24" rx="8" fill="#10B981" fill-opacity="0.2" stroke="#10B981" stroke-width="1"/>
    <text x="442" y="36" fill="#34D399" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" text-anchor="middle">PRISMATIC</text>

    <!-- 3D Gem Stage -->
    <g transform="translate(260, 210)">
      <!-- Emerald Floor Glow (Seat Green) -->
      <ellipse cx="0" cy="85" rx="140" ry="40" fill="url(#pedestalEmerald)" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="85" rx="85" ry="22" fill="#000000" opacity="0.55"/>

      <!-- Golden Gyroscopic Orbital Rings -->
      <ellipse cx="0" cy="0" rx="80" ry="80" fill="none" stroke="url(#goldMetallic)" stroke-width="5" transform="rotate(25)" filter="url(#shadow3D)"/>
      <ellipse cx="0" cy="0" rx="75" ry="30" fill="none" stroke="url(#goldMetallic)" stroke-width="4" transform="rotate(-35)"/>

      <!-- Floating 3D Geometric Emerald Crystal (Multiple Facets) -->
      <!-- Back Facets -->
      <polygon points="0,-90 -45,-30 0,45" fill="#047857"/>
      <polygon points="0,-90 45,-30 0,45" fill="#065F46"/>
      <!-- Front Facets with high specular sheen -->
      <polygon points="0,-90 -25,-15 0,60" fill="url(#emeraldGem)"/>
      <polygon points="0,-90 25,-15 0,60" fill="#34D399"/>
      <polygon points="-45,-30 -25,-15 0,60 0,45" fill="#10B981"/>
      <polygon points="45,-30 25,-15 0,60 0,45" fill="#059669"/>

      <!-- Inner Caustic Light Core -->
      <circle cx="0" cy="-10" r="14" fill="#ECFDF5" filter="url(#brightGlow)"/>

      <!-- Facet Sparkles & Bevel Highlights -->
      <line x1="0" y1="-90" x2="0" y2="60" stroke="#FFFFFF" stroke-width="2.5" opacity="0.9"/>
      <line x1="-45" y1="-30" x2="45" y2="-30" stroke="#FFFFFF" stroke-width="1.8" opacity="0.8"/>
      <polygon points="0,-85 3,-70 15,-70 5,-62 9,-50 0,-56 -9,-50 -5,-62 -15,-70 -3,-70" fill="#FFFFFF" opacity="0.95"/>
    </g>

    <text x="25" y="370" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Faceted Levitating Crystal</text>
    <text x="25" y="392" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Geometric multi-faceted gemstone suspended in spinning dual golden orbital gimbals.</text>
  </g>

  <!-- ── 5. AEGIS CHAMPION (3D SPARTAN WARRIOR) ── -->
  <g transform="translate(1240, 740)">
    <rect x="0" y="0" width="520" height="420" rx="24" fill="url(#cardGradDark)" stroke="#F59E0B" stroke-width="1.5" filter="url(#shadow3D)"/>
    
    <text x="25" y="40" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800">5. Aegis Champion</text>
    <rect x="390" y="20" width="105" height="24" rx="8" fill="#F59E0B" fill-opacity="0.2" stroke="#F59E0B" stroke-width="1"/>
    <text x="442" y="36" fill="#FDE047" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" text-anchor="middle">WARRIOR</text>

    <!-- 3D Spartan Stage -->
    <g transform="translate(260, 210)">
      <!-- Bronze Floor Aura (Seat Red/Gold) -->
      <ellipse cx="0" cy="85" rx="140" ry="40" fill="url(#pedestalGold)" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="85" rx="85" ry="22" fill="#000000" opacity="0.6"/>

      <!-- Marble / Stone Pedestal Plinth -->
      <polygon points="-70,60 -55,85 55,85 70,60 55,48 -55,48" fill="#334155" stroke="url(#goldMetallic)" stroke-width="2"/>

      <!-- Flowing Crimson Horsehair Crest -->
      <path d="M -15 -115 Q 40 -135 85 -75 Q 70 -55 55 -65 Q 25 -105 -10 -95 Z" fill="#DC2626" stroke="#991B1B" stroke-width="2" filter="url(#shadow3D)"/>
      <path d="M -10 -110 Q 35 -125 75 -75" stroke="#FCA5A5" stroke-width="2" fill="none"/>

      <!-- 3D Sculpted Bronze Helmet Dome -->
      <path d="M -55 35 Q -65 -45 -25 -75 Q 0 -90 25 -75 Q 65 -45 55 35 Q 20 45 0 45 Q -20 45 -55 35 Z" fill="url(#bronzeArmor)" stroke="#78350F" stroke-width="3" filter="url(#shadow3D)"/>

      <!-- Cheek Guards & Nose Guard -->
      <polygon points="-50,30 -25,45 -18,10 -40,-10" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="1.5"/>
      <polygon points="50,30 25,45 18,10 40,-10" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="1.5"/>
      <polygon points="-8,-40 8,-40 5,15 -5,15" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="1.5"/>

      <!-- Glowing T-Shaped Battle Eye Slits -->
      <polygon points="-35,-15 -10,-15 -6,-8 -30,-8" fill="#FEF08A" filter="url(#softGlow)"/>
      <polygon points="35,-15 10,-15 6,-8 30,-8" fill="#FEF08A" filter="url(#softGlow)"/>
      <line x1="-5" y1="-8" x2="5" y2="-8" stroke="#FEF08A" stroke-width="2"/>

      <!-- Golden Laurel Wreath Embossed on Brow -->
      <path d="M -35 -45 Q 0 -60 35 -45" stroke="url(#goldMetallic)" stroke-width="4" fill="none" stroke-linecap="round"/>
    </g>

    <text x="25" y="370" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Ancient Spartan War Helmet</text>
    <text x="25" y="392" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Sculpted bronze Corinthian battle helmet with flowing crimson horsehair crest &amp; glowing eye slits.</text>
  </g>

  <!-- ── 6. AIRAVATA ROYALE (3D MAHARAJA ELEPHANT) ── -->
  <g transform="translate(1800, 740)">
    <rect x="0" y="0" width="520" height="420" rx="24" fill="url(#cardGradDark)" stroke="#8B5CF6" stroke-width="1.5" filter="url(#shadow3D)"/>
    
    <text x="25" y="40" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800">6. Airavata Royale</text>
    <rect x="390" y="20" width="105" height="24" rx="8" fill="#8B5CF6" fill-opacity="0.2" stroke="#8B5CF6" stroke-width="1"/>
    <text x="442" y="36" fill="#C084FC" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" text-anchor="middle">HERITAGE</text>

    <!-- 3D Elephant Stage -->
    <g transform="translate(260, 210)">
      <!-- Royal Purple/Gold Floor Aura -->
      <ellipse cx="0" cy="85" rx="140" ry="40" fill="url(#pedestalPurple)" filter="url(#brightGlow)"/>
      <ellipse cx="0" cy="85" rx="85" ry="22" fill="#000000" opacity="0.6"/>

      <!-- Lotus Pedestal Dais -->
      <ellipse cx="0" cy="65" rx="75" ry="22" fill="url(#goldMetallic)"/>
      <!-- Lotus Petals -->
      <path d="M -60 65 Q -75 50 -60 40 Q -45 55 -60 65 Z" fill="#F43F5E"/>
      <path d="M 60 65 Q 75 50 60 40 Q 45 55 60 65 Z" fill="#F43F5E"/>
      <path d="M 0 72 Q 0 50 0 45" stroke="#F43F5E" stroke-width="4"/>

      <!-- 3D Sculpted Golden Elephant Figurine -->
      <!-- Body & Legs -->
      <ellipse cx="0" cy="20" rx="55" ry="45" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2.5" filter="url(#shadow3D)"/>
      <rect x="-42" y="35" width="20" height="35" rx="8" fill="url(#goldLight)" stroke="#78350F" stroke-width="1.5"/>
      <rect x="22" y="35" width="20" height="35" rx="8" fill="url(#goldLight)" stroke="#78350F" stroke-width="1.5"/>

      <!-- Ceremonial Red Velvet Caparison (Jhool) -->
      <path d="M -35 5 Q 0 15 35 5 L 30 35 Q 0 45 -30 35 Z" fill="url(#rubyGem)" stroke="url(#goldMetallic)" stroke-width="2"/>
      <circle cx="0" cy="25" r="5" fill="url(#emeraldGem)"/>

      <!-- Elephant Head & Trunk Raised Up (Symbol of Fortune) -->
      <circle cx="-30" cy="-25" r="28" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2"/>
      <!-- Raised Trunk with Gold Ring -->
      <path d="M -48 -25 Q -75 -40 -65 -70 Q -50 -80 -45 -65 Q -55 -45 -35 -38" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2"/>
      <ellipse cx="-55" cy="-65" rx="7" ry="4" fill="none" stroke="#FFFFFF" stroke-width="2"/>

      <!-- Ivory Tusks with Gold Caps -->
      <path d="M -40 -12 Q -65 0 -60 15" stroke="#FFFBEB" stroke-width="5" fill="none" stroke-linecap="round"/>
      <circle cx="-60" cy="15" r="3" fill="url(#goldMetallic)"/>

      <!-- Royal Howdah (Palanquin) on Back with Jewels -->
      <polygon points="-25,-5 25,-5 20,-35 -20,-35" fill="url(#goldMetallic)" stroke="#78350F" stroke-width="2" filter="url(#shadow3D)"/>
      <path d="M -22 -35 Q 0 -55 22 -35 Z" fill="url(#rubyGem)" stroke="url(#goldMetallic)" stroke-width="2"/>
      <circle cx="0" cy="-45" r="6" fill="url(#emeraldGem)" filter="url(#softGlow)"/>

      <!-- Peacock Plume Crest -->
      <path d="M 0 -55 Q -8 -80 -4 -95 Q 4 -80 0 -55 Z" fill="url(#cyanPlasma)" stroke="url(#goldMetallic)" stroke-width="1.5"/>
      <circle cx="-2" cy="-88" r="3" fill="#FBBF24"/>
    </g>

    <text x="25" y="370" fill="#F8FAFC" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700">Indian Heritage Royal Elephant</text>
    <text x="25" y="392" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="12">Gilded ceremonial temple elephant with jeweled howdah palanquin &amp; lotus dais.</text>
  </g>

  <!-- ════════════════ FOOTER: TECHNICAL IMPLEMENTATION PILLARS ════════════════ -->
  <g transform="translate(80, 1220)">
    <rect x="0" y="0" width="2240" height="130" rx="20" fill="#0B132B" stroke="#334155" stroke-width="1.5"/>
    
    <g transform="translate(40, 25)">
      <text x="0" y="20" fill="#F59E0B" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="900" letter-spacing="1">
        THE 4 TECHNICAL PILLARS OF BHALYAM INVENTIVE TOKENS:
      </text>

      <!-- Pillar 1 -->
      <g transform="translate(0, 40)">
        <text x="0" y="15" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800">1. Silhouette Autonomy</text>
        <text x="0" y="34" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="11">Each skin is an independent 3D figurine, not a locked pawn path.</text>
      </g>

      <!-- Pillar 2 -->
      <g transform="translate(540, 40)">
        <text x="0" y="15" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800">2. Seat-Color Floor Dais</text>
        <text x="0" y="34" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="11">Illuminated ground pedestal carries Red/Green/Yellow/Blue player ID.</text>
      </g>

      <!-- Pillar 3 -->
      <g transform="translate(1080, 40)">
        <text x="0" y="15" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800">3. 60fps Lightweight Vector Engine</text>
        <text x="0" y="34" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="11">Zero Three.js/WebGL bloat. Pure GPU-accelerated SVG &amp; CSS gradients.</text>
      </g>

      <!-- Pillar 4 -->
      <g transform="translate(1620, 40)">
        <text x="0" y="15" fill="#FFFFFF" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800">4. Fan &amp; Stack Precision</text>
        <text x="0" y="34" fill="#94A3B8" font-family="'Segoe UI', Roboto, sans-serif" font-size="11">100% compatible with Ludo safe-star fanning, yard slots &amp; stretch tracks.</text>
      </g>
    </g>
  </g>
</svg>
`;

async function main() {
  console.log("Generating high-resolution token reference showcase image...");
  
  const publicOutPath = path.resolve("client/public/token-reference-showcase.png");
  const brainDir = "C:/Users/GontlaKethanKumar/.gemini/antigravity/brain/d9bde247-1cfb-4a82-94db-ec5682f99da4";
  const brainOutPath = path.join(brainDir, "token-reference-showcase.png");

  // Ensure brain directory exists
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
