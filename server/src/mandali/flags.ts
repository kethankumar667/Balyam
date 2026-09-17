/**
 * Mandali rollout flags.
 *
 * Every action the feature will eventually expose is a separate server-owned
 * switch, and each defaults OFF. The browser feature-flag layer is
 * presentation-only; authorization and rollout live here, on the server,
 * because a client flag can grant nothing.
 *
 * Parsing convention matches the rest of the server (economy, reviews,
 * persistence): trimmed, case-normalized, explicit "true" — anything missing,
 * blank, or mistyped reads as off, never as on. `MANDALI_ENABLED` is a master
 * kill switch: when it is not "true", every child flag reads off no matter
 * what it says, so a rollout can be stopped with one env change.
 */
export interface MandaliFlags {
  enabled: boolean;
  groups: boolean;
  chat: boolean;
  coinRequests: boolean;
  donations: boolean;
  privateGames: boolean;
}

/** Read on every call, not captured at import — the same testability reasoning as supabaseAuth.config(). */
function flag(name: string): boolean {
  return (process.env[name] ?? "").trim().toLowerCase() === "true";
}

export function mandaliFlags(): MandaliFlags {
  const enabled = flag("MANDALI_ENABLED");
  return {
    enabled,
    groups: enabled && flag("MANDALI_GROUPS"),
    chat: enabled && flag("MANDALI_CHAT"),
    coinRequests: enabled && flag("MANDALI_COIN_REQUESTS"),
    // Donations move real wallet value; they stay off until the economy
    // launch gate (approved transfer policy + concurrency tests) passes.
    donations: enabled && flag("MANDALI_DONATIONS"),
    privateGames: enabled && flag("MANDALI_PRIVATE_GAMES"),
  };
}
