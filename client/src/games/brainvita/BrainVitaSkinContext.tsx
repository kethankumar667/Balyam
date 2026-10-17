import { createContext, useContext } from "react";
import { SKINS, type SkinTokens } from "./brainvitaSkins";

/**
 * The paint in use, handed down to everything that draws. Defaulting to the wood skin means a piece
 * rendered on its own, in a test or a story, still looks right without a provider above it.
 */
export const BrainVitaSkinContext = createContext<SkinTokens>(SKINS.wood);

export const useSkinTokens = (): SkinTokens => useContext(BrainVitaSkinContext);
