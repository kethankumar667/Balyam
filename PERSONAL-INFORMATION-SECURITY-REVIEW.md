# PERSONAL-INFORMATION-SECURITY-REVIEW.md — BHALYAM Personal Information Security & Privacy Review

> **BHALYAM Security & Compliance Assessment**  
> **Target Scope**: `/profile/personal`, Profile APIs, Data Export, Identity Management  
> **Standards Evaluated**: OWASP Top 10, DPDP Act 2023 Compliance, Cryptographic Seat Authentication, Strict Input Sanitization  

---

## 1. Threat Modeling & Assessment

| Threat Vector | Potential Impact | Security Architecture & Mitigations | Status |
|---|---|---|---|
| **IDOR Profile Mutation** | Attacker modifying another player's profile data | Server enforces `requireSelfParam()` on `PUT /api/profile/:playerId`, extracting the caller ID from cryptographically validated guest/member tokens rather than trust in path parameters. | **SECURE** |
| **Email Leakage** | Exposing private email in lounge UI or across LAN screens | Email addresses are masked (e.g. `ke***n@domain.com`) in the UI. Server never includes raw emails in public match/leaderboard broadcasts. | **SECURE** |
| **XSS via Bio / Display Name** | Malicious script execution via player bio or display name | Display Name is validated with strict regex (`/^[a-zA-Z0-9_\- ]{1,24}$/`). Bio is rendered strictly as React text node with no raw HTML/dangerouslySetInnerHTML rendering. | **SECURE** |
| **Verification State Spoofing** | Attacker forging `Verified` badge in client | Verified state is derived strictly from active Supabase authentication session / verified member account state, never inferred or set via client parameters. | **SECURE** |
| **Sensitive Data in Export** | Data export containing session tokens or hashes | `downloadPlayerExport()` explicitly constructs a whitelist payload containing only player identity, stats, and preferences, omitting JWTs, tokens, and cryptographic secrets. | **SECURE** |
| **Surveillance / IP Geolocation** | Tracking player physical location without consent | Region preference is user-selected or read from standard browser `Intl` locale; zero silent IP-based geolocation tracking is conducted. | **SECURE** |

---

## 2. DPDP Act 2023 & Consent Integrity

1. **Right to Access & Portability (Section 11)**:
   - Provided via the real "Download My Data" action in `ProfileQuickActions.tsx`, which exports the player's profile, career metrics, and local preferences in structured JSON format.
2. **Right to Correction & Erasure (Section 12)**:
   - Correction is supported via `EditProfileModal` and avatar customization.
   - Erasure is supported via `YourDataPanel` and `deleteAccount()` RPC.
3. **No Third-Party Tracker Scraping**:
   - Zero external trackers, analytics pixels, or third-party ad networks are present on the personal information page.

---

## 3. Security Audit Verdict

**Assessment Result**: **`PASSED — PRODUCTION SECURE`**
