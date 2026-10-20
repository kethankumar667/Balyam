import type { ComponentType } from "react";
import { BlazeRing, BubbleFloat, FrostCrystals, StormArc, TidalWaves } from "./ElementalFrames";
import type { FrameProps } from "./frameGeometry";
import { CricketSeam, DiyaGlow, MarigoldGarland, PeacockPlume, RangoliMandala } from "./IndianFrames";
import { CuddlyCatEars, DragonCoil, PrismSpinner, RoyalCrown, VictoryLaurel } from "./RoyalFrames";
import { ClockworkGears, GalaxyPortal, NeonTube, PixelArcade, StarOrbit } from "./TechFrames";

/**
 * The twenty avatar frames sold in the shop, by the id they have in the closed-set registry
 * (`BHALYAM_COSMETIC_REGISTRY` in shared/cosmetics.ts). A test holds this list and the registry together: a
 * frame the registry knows and this file does not would sell something that draws nothing.
 */
export interface FrameDesign {
  id: string;
  name: string;
  Component: ComponentType<FrameProps>;
}

export const FRAME_DESIGNS: readonly FrameDesign[] = [
  { id: "frame_marigold_garland", name: "Marigold Garland", Component: MarigoldGarland },
  { id: "frame_diya_glow", name: "Diya Glow", Component: DiyaGlow },
  { id: "frame_rangoli_mandala", name: "Rangoli Mandala", Component: RangoliMandala },
  { id: "frame_peacock_plume", name: "Peacock Plume", Component: PeacockPlume },
  { id: "frame_cricket_seam", name: "Cricket Seam", Component: CricketSeam },
  { id: "frame_blaze_ring", name: "Blaze Ring", Component: BlazeRing },
  { id: "frame_frost_crystals", name: "Frost Crystals", Component: FrostCrystals },
  { id: "frame_storm_arc", name: "Storm Arc", Component: StormArc },
  { id: "frame_tidal_waves", name: "Tidal Waves", Component: TidalWaves },
  { id: "frame_bubble_float", name: "Bubble Float", Component: BubbleFloat },
  { id: "frame_star_orbit", name: "Star Orbit", Component: StarOrbit },
  { id: "frame_galaxy_portal", name: "Galaxy Portal", Component: GalaxyPortal },
  { id: "frame_neon_tube", name: "Neon Tube", Component: NeonTube },
  { id: "frame_pixel_arcade", name: "Pixel Arcade", Component: PixelArcade },
  { id: "frame_clockwork_gears", name: "Clockwork Gears", Component: ClockworkGears },
  { id: "frame_victory_laurel", name: "Victory Laurel", Component: VictoryLaurel },
  { id: "frame_royal_crown", name: "Royal Crown", Component: RoyalCrown },
  { id: "frame_dragon_coil", name: "Dragon Coil", Component: DragonCoil },
  { id: "frame_cuddly_cat_ears", name: "Cuddly Cat Ears", Component: CuddlyCatEars },
  { id: "frame_prism_spinner", name: "Prism Spinner", Component: PrismSpinner },
];

const BY_ID = new Map(FRAME_DESIGNS.map((design) => [design.id, design]));

export function getFrameDesign(id: string | undefined): FrameDesign | undefined {
  return id === undefined ? undefined : BY_ID.get(id);
}

/** Whether an aura id names one of the drawn frames (as opposed to a legacy ring or none). */
export const isFrameId = (id: string | undefined): id is string => getFrameDesign(id) !== undefined;
