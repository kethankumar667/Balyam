import React from "react";
import type { InteractiveSandboxKind } from "../../types/academy";
import type { ConfigurableSandboxProps } from "./sandboxShared";
import { DiceRollSandbox } from "./DiceRollSandbox";
import { CardMeldSandbox } from "./CardMeldSandbox";
import { UnoChallengeSandbox } from "./UnoChallengeSandbox";
import { CricketDuelSandbox } from "./CricketDuelSandbox";
import { QuantumGridSandbox } from "./QuantumGridSandbox";
import { DotsChainSandbox } from "./DotsChainSandbox";
import { WordChainSandbox } from "./WordChainSandbox";
import { SudokuScannerSandbox } from "./SudokuScannerSandbox";
import { RetroMiniSandbox } from "./RetroMiniSandbox";

interface SandboxRendererProps {
  kind?: InteractiveSandboxKind;
  config?: Record<string, unknown>;
  onComplete?: () => void;
}

/**
 * The single source of truth for which sandbox kinds have a real demo.
 * `hasSandbox` and the renderer both read this table, so they cannot drift.
 * Kinds that are absent (carrom-striker, chess-tactics, star-slap,
 * bingo-cross) deliberately render nothing rather than an unrelated demo.
 */
const SANDBOX_COMPONENTS: Partial<
  Record<InteractiveSandboxKind, React.ComponentType<ConfigurableSandboxProps>>
> = {
  "dice-roll": DiceRollSandbox,
  "card-meld": CardMeldSandbox,
  "uno-challenge": UnoChallengeSandbox,
  "cricket-duel": CricketDuelSandbox,
  "quantum-grid": QuantumGridSandbox,
  "dots-chain": DotsChainSandbox,
  "word-chain": WordChainSandbox,
  "sudoku-scanner": SudokuScannerSandbox,
  "retro-mini": RetroMiniSandbox,
};

function lookupSandbox(
  kind?: InteractiveSandboxKind,
): React.ComponentType<ConfigurableSandboxProps> | undefined {
  if (!kind) return undefined;
  if (!Object.prototype.hasOwnProperty.call(SANDBOX_COMPONENTS, kind)) {
    return undefined;
  }
  return SANDBOX_COMPONENTS[kind];
}

/** True exactly for the kinds that have a real interactive demo. */
export function hasSandbox(kind?: InteractiveSandboxKind): boolean {
  return lookupSandbox(kind) !== undefined;
}

export const SandboxRenderer: React.FC<SandboxRendererProps> = ({
  kind,
  config,
  onComplete,
}) => {
  const Sandbox = lookupSandbox(kind);
  if (!Sandbox) return null;

  // Keying on kind + config remounts the demo when consecutive slides use the
  // same kind with a different config, so each slide starts from a clean state.
  const instanceKey = `${kind}:${JSON.stringify(config ?? {})}`;
  return <Sandbox key={instanceKey} config={config} onComplete={onComplete} />;
};
