import { useReferralLive } from "../../hooks/useReferralLive";

/**
 * Listens for referral notices ("Meera joined with your code", "your coins landed") for the whole app.
 *
 * It lives at the app root, not in `AppLayout`, because a live match (`Room`, the party screen) does not draw
 * `AppLayout`: a notice that depends on the layout is missed by exactly the person who is busy playing.
 */
export default function ReferralLiveHost() {
  useReferralLive();
  return null;
}
