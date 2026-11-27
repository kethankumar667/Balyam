/**
 * Gang coin rules — the one place these numbers live.
 *
 * Both the server (which enforces them) and the client (which displays them)
 * import from here so the UI can never advertise a limit the server does not
 * enforce. The 4-hour window is also passed down into the create_coin_request
 * RPC so the database applies the same figure atomically.
 *
 * Product rules, for now: coins move between Gang members only, signed-in
 * members only, in one fixed amount, and asking is rate-limited per person.
 */

/** Every Gang send and every Gang coin request is exactly this many coins. */
export const GANG_COIN_AMOUNT = 100;

/** A person may post one coin request per this window, across all their Gangs. */
export const GANG_COIN_REQUEST_COOLDOWN_MS = 4 * 60 * 60 * 1000;
