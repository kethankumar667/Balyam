# PERSONAL-INFORMATION-CAPABILITY-MATRIX.md — BHALYAM Personal Information Capability Discovery

> **BHALYAM Engineering Governance & Identity Architecture Discovery**  
> **Target Feature**: Personal Information Experience (`/profile/personal`)  
> **Source-of-Truth Priority**:  
> 1. Existing account and identity domain models (`shared/profile/PlayerProfile.ts`, `client/src/lib/accountGenerator.ts`, `client/src/lib/supabase/profile.ts`)  
> 2. Existing authentication and authorization behavior (`client/src/lib/playerIdentity.ts`, `client/src/store/authStore.ts`, `server/src/auth/identity.ts`)  
> 3. Existing API contracts (`GET/PUT /api/profile/:id`, `GET /api/profile/:id/stats`)  
> 4. BHALYAM privacy and security standards (`shared/permissions.ts`, DPDP Act rules)  
> 5. UX reference for visual composition and aesthetics  

---

## 1. Candidate Fields Capability Matrix

| Field Name | Domain Source | API Source | Stored or Derived | Editable or Read-Only | Sensitive Classification | Verification Support | Display Masking Requirement | Present in UX Reference | Implementation Decision | Evidence in Codebase |
|---|---|---|---|---|---|---|---|---|---|---|
| **Display Name** | `PlayerProfile.displayName`, `UserAccountDetails.displayName` | `GET /api/profile/:id`, `PUT /api/profile/:id`, Supabase `profiles.display_name` | Stored in DB & in-memory store | **Editable** (Client & Server validated, max 24 chars) | Public / Non-Sensitive | No verification required | None | Yes | **IMPLEMENT (Fully Editable)** | Validated by `validateName()`, persisted via `PUT /api/profile/:id` and `saveProfile()` |
| **Player ID** | `PlayerProfile.playerId`, `UserAccountDetails.accountId` | `usePlayerId()`, `PlayerProfile.playerId`, `loadAccountDetails().accountId` | Stored & cryptographically issued | **Read-Only (Immutable)** | Public Identifier | Cryptographically signed via `seatToken` & server guest token | None (Accessible Copy Action provided) | Yes (shows placeholder `BHYM#12345`) | **IMPLEMENT (Read-Only with Copy action, real ID)** | Handled by `playerIdentity.ts` (`bhalyam.guest.id` / Supabase `userId` / `BHYM-...`) |
| **Email Address** | `authStore.email`, `UserAccountDetails.email`, Supabase `auth.users.email` | `useAuthStore.getState().email`, Supabase session | Stored in Auth Session | **Read-Only on Profile** (managed via Auth settings) | **Confidential / Sensitive** | **Yes** (Verified if Supabase active session or verified member) | **Masked** (e.g. `k***@domain.com` for privacy) | Yes | **IMPLEMENT (Masked display + Authoritative Verified Badge)** | Checked via `useAuthStore` session state; never fabricated |
| **Date Joined** | `PlayerProfile.joinedAt`, `UserAccountDetails.createdAt`, Supabase `user.created_at` | `GET /api/profile/:id`, `useAuthStore.getState().since` | Stored timestamp | **Read-Only** | Non-Sensitive | Authoritative from account creation | None (Localized date e.g. "Jul 5, 2026") | Yes | **IMPLEMENT (Read-Only)** | Extracted from `profile.joinedAt` / `account.createdAt` |
| **Country / Region** | Browser Locale / Regional Matchmaking Setting | `navigator.language` / `Intl.DateTimeFormat` / User Setting | Derived / Stored Preference | **Editable via Language/Region Preference** | Non-Sensitive | N/A | None (e.g. "India 🇮🇳" or "Global 🌐") | Yes | **IMPLEMENT (Region derived from locale / preference)** | Derived from standard `Intl` locale without IP surveillance |
| **Bio / About Me** | Profile Bio Model | Local profile extension / Supabase profile metadata | Stored | **Editable** (Safe sanitized text, max 160 chars) | Public / Non-Sensitive | N/A | None (Safe markup escaping) | Yes | **IMPLEMENT (Editable with empty state)** | Sanitized against XSS; empty state fallback |
| **Avatar Customization** | `PlayerProfile.avatar`, `useRoomStore.avatarId` | `PUT /api/profile/:id`, `saveProfile()` | Stored (closed-set avatar ID / emoji) | **Editable** | Public / Non-Sensitive | Set-membership sanitized | None | Yes (in Hero & Quick Actions) | **IMPLEMENT (Interactive Picker)** | Validated against `shared/avatars.ts` closed set |
| **Level & XP Progression** | `PlayerProfile.level`, `PlayerProfile.experiencePoints` | `GET /api/profile/:id` | Stored / Authoritative Engine Projection | **Read-Only** (Earned via gameplay) | Public | Authoritative ledger sync | None | Yes (in Shared Hero) | **IMPLEMENT (Dynamic calculation)** | `calculateLevel(xp)` formula |
| **Account Status** | `authStore.isMember`, `authStore.kind` | `useAuthStore()` | Derived from verified session | **Read-Only** | Non-Sensitive | Yes ("Active Member" vs "Guest Player") | None | Yes (in Account Summary) | **IMPLEMENT (Dynamic status)** | Authoritative from session; not color-alone |
| **Friend & Squad Count** | Social Hub / Friend Store | Social state / local storage | Derived | **Read-Only** | Non-Sensitive | N/A | None | Yes (in Account Summary) | **IMPLEMENT (Dynamic count)** | Derived from active friends list |
| **Download My Data** | DPDP Act Section 12 Data Export | Client Privacy Export Engine | Derived on-demand | **Actionable Trigger** | Sensitive | Owner-only export | JSON download with PII / stats | Yes (in Quick Actions) | **IMPLEMENT (Real JSON Data Export)** | Exports authentic player profile, settings, and stats; excludes secrets |

---

## 2. Unsupported Design Concepts & Governance Decisions

1. **Phone Number Verification**:
   - *Status*: **UNSUPPORTED / NOT IMPLEMENTED**
   - *Rationale*: The backend does not hold an SMS gateway or phone verification pipeline. The screenshot placeholder `+1 (555) 000-0000` will NOT be displayed or fabricated.
2. **Social Account OAuth Linking (Twitter, Discord, Steam)**:
   - *Status*: **DESIGN-ONLY / NOT IMPLEMENTED**
   - *Rationale*: There is no third-party OAuth token storage backend for social link accounts beyond Google/Email auth. Will not fabricate fake persistence.
3. **Go Premium / Paid VIP Upgrades**:
   - *Status*: **UNSUPPORTED / NOT IMPLEMENTED**
   - *Rationale*: BHALYAM is a free, ad-free lounge with 0 paywalls. The "Go Premium" card will not be rendered to avoid deceptive dark patterns.
4. **Hardcoded Mock Values**:
   - *Status*: **BANNED**
   - *Rationale*: Values like `BHYM#12345`, `player@example.com`, or fake dates will never be hardcoded. Real authenticated user data will be bound throughout.

---

## 3. Editing Architecture & Modal Workflow

- **Editing Workflow**: Modal / Drawer dialog with accessible focus management (`role="dialog"`, `aria-labelledby`, focus trapping, Escape key closing).
- **Form Controls**:
  - Display Name (1–24 characters, validated with `validateName`)
  - Bio / About (0–160 characters, sanitized, multi-line)
  - Region Selection (India 🇮🇳, United States 🇺🇸, United Kingdom 🇬🇧, Canada 🇨🇦, Australia 🇦🇺, Global 🌐)
- **Persistence**: Dispatches `PUT /api/profile/:id` and updates `useRoomStore` / Supabase profile sync.

---

## 4. Discovery Conclusion

All required capability boundaries are established. Phase 0 is complete. Implementation can proceed with zero fabrication and strict adherence to BHALYAM design and security principles.
