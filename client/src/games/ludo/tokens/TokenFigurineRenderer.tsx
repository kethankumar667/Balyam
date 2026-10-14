import React from "react";
import type { LudoColor } from "@shared/types";
import type { TokenSkinConfig } from "../../../lib/cosmeticsResolver";

import { ClassicPawnFigurine } from "./ClassicPawnFigurine";
import { ImperialCrownFigurine } from "./ImperialCrownFigurine";
import { ScepterRadianceFigurine } from "./ScepterRadianceFigurine";
import { ThroneValorFigurine } from "./ThroneValorFigurine";
import { SignetEmpireFigurine } from "./SignetEmpireFigurine";
import { DracoInfernoFigurine } from "./DracoInfernoFigurine";
import { PhoenixRebirthFigurine } from "./PhoenixRebirthFigurine";
import { AiravataRoyaleFigurine } from "./AiravataRoyaleFigurine";
import { BengalVyaghraFigurine } from "./BengalVyaghraFigurine";
import { NeoValkyrieFigurine } from "./NeoValkyrieFigurine";
import { CelestialShardFigurine } from "./CelestialShardFigurine";
import { SupernovaCoreFigurine } from "./SupernovaCoreFigurine";
import { AstralVoyagerFigurine } from "./AstralVoyagerFigurine";
import { AegisChampionFigurine } from "./AegisChampionFigurine";
import { SamuraiShogunFigurine } from "./SamuraiShogunFigurine";
import { SacredTrishulaFigurine } from "./SacredTrishulaFigurine";
import { RetroHandsetFigurine } from "./RetroHandsetFigurine";

export type TokenFigurineType =
  | "classic_pawn"
  | "imperial_sovereign"
  | "scepter_radiance"
  | "throne_valor"
  | "signet_empire"
  | "draco_inferno"
  | "phoenix_rebirth"
  | "airavata_royale"
  | "bengal_vyaghra"
  | "neo_valkyrie"
  | "celestial_shard"
  | "supernova_core"
  | "astral_voyager"
  | "aegis_champion"
  | "samurai_shogun"
  | "sacred_trishula"
  | "retro_handset";

export interface TokenFigurineRendererProps {
  uid: string;
  color: LudoColor;
  main: string;
  dark: string;
  tokenSkin: TokenSkinConfig;
  movable?: boolean;
}

/**
 * Token Figurine Renderer
 * Master dispatcher for 3D collectible tokens and classic pawn pieces.
 * Maps the resolved figurineType to its dedicated SVG component.
 */
export function TokenFigurineRenderer({
  uid,
  color,
  main,
  dark,
  tokenSkin,
  movable = false,
}: TokenFigurineRendererProps) {
  const figurine = tokenSkin.figurineType;

  switch (figurine) {
    case "imperial_sovereign":
      return <ImperialCrownFigurine uid={uid} color={color} main={main} dark={dark} movable={movable} />;
    case "scepter_radiance":
      return <ScepterRadianceFigurine uid={uid} color={color} main={main} dark={dark} movable={movable} />;
    case "throne_valor":
      return <ThroneValorFigurine uid={uid} color={color} main={main} dark={dark} movable={movable} />;
    case "signet_empire":
      return <SignetEmpireFigurine uid={uid} color={color} main={main} dark={dark} movable={movable} />;
    case "draco_inferno":
      return <DracoInfernoFigurine uid={uid} color={color} main={main} dark={dark} movable={movable} />;
    case "phoenix_rebirth":
      return <PhoenixRebirthFigurine uid={uid} color={color} main={main} dark={dark} movable={movable} />;
    case "airavata_royale":
      return <AiravataRoyaleFigurine uid={uid} color={color} main={main} dark={dark} movable={movable} />;
    case "bengal_vyaghra":
      return <BengalVyaghraFigurine uid={uid} color={color} main={main} dark={dark} movable={movable} />;
    case "neo_valkyrie":
      return <NeoValkyrieFigurine uid={uid} color={color} main={main} dark={dark} movable={movable} />;
    case "celestial_shard":
      return <CelestialShardFigurine uid={uid} color={color} main={main} dark={dark} movable={movable} />;
    case "supernova_core":
      return <SupernovaCoreFigurine uid={uid} color={color} main={main} dark={dark} movable={movable} />;
    case "astral_voyager":
      return <AstralVoyagerFigurine uid={uid} color={color} main={main} dark={dark} movable={movable} />;
    case "aegis_champion":
      return <AegisChampionFigurine uid={uid} color={color} main={main} dark={dark} movable={movable} />;
    case "samurai_shogun":
      return <SamuraiShogunFigurine uid={uid} color={color} main={main} dark={dark} movable={movable} />;
    case "sacred_trishula":
      return <SacredTrishulaFigurine uid={uid} color={color} main={main} dark={dark} movable={movable} />;
    case "retro_handset":
      return <RetroHandsetFigurine uid={uid} color={color} main={main} dark={dark} movable={movable} />;
    case "classic_pawn":
    default:
      return (
        <ClassicPawnFigurine
          uid={uid}
          color={color}
          main={main}
          dark={dark}
          tokenSkin={tokenSkin}
          movable={movable}
        />
      );
  }
}
