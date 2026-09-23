---
title: "Connect 4 — Visual Identity & Design System Specification"
status: "final"
version: "2.0.0"
date: "2026-09-21"
game: "connect4"
themes:
  - "royal_parlour"
  - "cyber_arcade"
  - "championship_lounge"
tokens:
  colors:
    royal_parlour:
      board_wood: "#3B1E08"
      board_wood_highlight: "#6B3E18"
      board_brass: "#D4AF37"
      slot_dark_velvet: "#140A04"
      p1_crimson_enamel: "#B91C1C"
      p1_crimson_glow: "rgba(185, 28, 28, 0.6)"
      p1_gold_medallion: "#FBBF24"
      p2_ivory_gold: "#FEF3C7"
      p2_ivory_glow: "rgba(251, 191, 36, 0.5)"
      felt_green: "#064E3B"
      accent_gold: "#F59E0B"
    cyber_arcade:
      board_acrylic: "#0F172A"
      board_glass_edge: "#38BDF8"
      board_neon_cyan: "#06B6D4"
      slot_chamber: "#020617"
      p1_prismatic_ruby: "#F43F5E"
      p1_ruby_core: "#FB7185"
      p1_ruby_glow: "rgba(244, 63, 94, 0.85)"
      p2_electric_cyan: "#00F2FE"
      p2_cyan_core: "#38BDF8"
      p2_cyan_glow: "rgba(0, 242, 254, 0.85)"
      ambient_grid: "#0A0F1D"
      accent_neon: "#22D3EE"
    championship_lounge:
      board_obsidian: "#18181B"
      board_gold_trim: "#EAB308"
      board_carbon_mesh: "#09090B"
      slot_vault: "#050505"
      p1_satin_black: "#27272A"
      p1_black_crest: "#EAB308"
      p1_black_glow: "rgba(234, 179, 8, 0.4)"
      p2_mirrored_gold: "#FACC15"
      p2_gold_crest: "#78350F"
      p2_gold_glow: "rgba(250, 204, 21, 0.8)"
      vip_carpet: "#1E1B4B"
      accent_prestige: "#F59E0B"
---

# Connect 4 — Visual Identity Specification (`DESIGN.md`)

## 1. Brand & Style Philosophy
Connect 4 on BHALYAM is a prestige tabletop sport. Rather than an abstract digital grid, the game is presented as a physical, luxury vertical tournament apparatus standing proudly in a private salon. Players must feel the weighted gravity of every coin, the tactile gloss of the enamel discs, and the acoustic resonance of an authentic impact.

---

## 2. The 3 Master Themes

### 2.1 Theme 1: The Royal Parlour (Heritage Indian Luxury)
- **Concept**: Handcrafted heirloom game board crafted from aged Burma teakwood, inlaid with polished brass fittings, resting upon an emerald green billiard felt mat.
- **Board Chassis**: Rich woodgrain gradients with subtle brass corner studs and vertical brass channel dividers.
- **Token Design**:
  - **Player 1**: Lacquered royal crimson enamel with radial gloss reflection, stamped with an embossed 24k gold sun medallion.
  - **Player 2**: Polished royal ivory and amber gold, featuring a raised lotus blossom crest.
- **Aesthetic Tone**: Warm, nostalgic, regal, and deeply comforting.

### 2.2 Theme 2: Cyber-Arcade Deluxe (Prismatic Glass & Neon Optics)
- **Concept**: Ultra-futuristic, tournament-grade esports cabinet with floating frosted acrylic chassis, internal laser optical guides, and glowing fusion crystal tokens.
- **Board Chassis**: Semi-translucent dark sapphire acrylic with beveled ice-blue glass edges, illuminated column funnel ports, and glowing cyan neon light rails.
- **Token Design**:
  - **Player 1**: Prismatic ruby crystal disc with an animated high-energy fusion core.
  - **Player 2**: Electric cyan diamond disc with pulsing cybernetic traces.
- **Aesthetic Tone**: Hyper-kinetic, electric, sleek, and high-octane.

### 2.3 Theme 3: Championship Lounge (Matte Obsidian & 24K Gold)
- **Concept**: Private VIP club high-stakes match. Architectural carbon-fiber structure framed with brushed 24-karat gold plating.
- **Board Chassis**: Matte obsidian stealth alloy, chamfered gold perimeter edge, titanium structural base pedestal with gold coin return tray.
- **Token Design**:
  - **Player 1**: Weighted satin obsidian black coin with diamond-cut knurling and an embossed gold imperial crown.
  - **Player 2**: Pure 24K mirrored gold sovereign with radiant polish and ruby center jewel.
- **Aesthetic Tone**: Ultra-luxurious, disciplined, prestigious, and cinematic.

---

## 3. Physical Token & Chassis Component Standards

### 3.1 3D Beveled Aperture Grid
Each circular slot in the 7x6 board is engineered with triple-layer optical depth:
1. **The Aperture Rim**: A rounded bevel catching overhead ambient light on the top edge and casting an inner shadow downward (`inset 0 6px 10px rgba(0,0,0,0.85)`).
2. **The Slot Channel**: A dark recessed vertical track through which chips slide freely.
3. **The Column Light Rail**: When hovered or touched, an internal light beam illuminates the entire vertical chamber.

### 3.2 Token Anatomy
Discs are not flat SVG circles; they have tactile physical anatomy:
- **Outer Ring**: Beveled gripping edge with tactile concentric grooves.
- **Inner Medallion**: Recessed center stamped with the player's thematic insignia.
- **Specular Sheen**: Dynamic crescent-shaped gloss highlight across the top-left quadrant reflecting ambient lounge spotlights.
- **Drop Physics**: Staged gravitational fall ($d = \frac{1}{2}gt^2$) with an elastic micro-rebound and mechanical settle on impact.

### 3.3 Live Vertical Token Racks
Positioned adjacent to each player’s battle card sits a physical token rack containing their remaining tokens (starting at 21). As discs are played, the rack visibly empties, creating visceral tension as the match reaches its climax.

### 3.4 Winning Laser Vector
When 4 discs connect, an energetic laser line draws across the exact centers of the winning pieces with multi-pass Gaussian glow filters, while non-winning discs dim to 40% opacity, delivering unmistakable clarity.
