# DESIGN SYSTEM WAVE 2 — Evidence

Companion to `DESIGN-SYSTEM-WAVE-2-IMPLEMENTATION.md`. This file records,
per changed file, the before state, the after state, and the verification
commands + results that prove the changes are value-neutral and regression-free.

---

## 1. Files changed

11 source files under `client/src` were modified in Wave 2:

| # | File |
|---|---|
| 1 | `client/src/components/VoicePanel.tsx` |
| 2 | `client/src/components/room/CommunicationPanel.tsx` |
| 3 | `client/src/components/RoomCode.tsx` |
| 4 | `client/src/components/RoomNameEditor.tsx` |
| 5 | `client/src/components/room/RoomHeader.tsx` |
| 6 | `client/src/components/PlayerList.tsx` |
| 7 | `client/src/components/room/ParticipantRow.tsx` |
| 8 | `client/src/components/room/ParticipantActionMenu.tsx` |
| 9 | `client/src/components/room/BotManagementDialog.tsx` |
| 10 | `client/src/components/room/RoomShareCard.tsx` |
| 11 | `client/src/components/Chat.tsx` |

No server, shared, configuration, test, or documentation file was modified by
the implementation (the two new `.md` deliverables are additions, not
modifications).

---

## 2. Before / after per file

### 1. VoicePanel.tsx
**Icons:** before — `<span aria-hidden>🎙</span>` (heading, L72) and
`<span aria-hidden>🎙</span>` (connect-mic button, L86). After —
`<Mic size={14} className="shrink-0" aria-hidden />` (heading) and
`<Mic size={16} aria-hidden />` (button); `Mic` imported from `lucide-react`.
**Token:** before — `dark:bg-[#131926]` (L69). After — `dark:bg-[var(--surface-1)]`.

### 2. CommunicationPanel.tsx
**Icons:** before — `<span aria-hidden>💬</span>` (chat tab, L58),
`<span aria-hidden>🎙</span>` (voice tab, L79), `<span className="text-sm">💬</span>`
(mobile strip, L126). After — `<MessageSquare size={14} aria-hidden />`,
`<Mic size={14} aria-hidden />`, `<MessageSquare size={16} aria-hidden />`;
`MessageSquare, Mic` imported.
**Tokens:** before — `dark:bg-[#131926]` (L120 mobile strip, L204 desktop).
After — `dark:bg-[var(--surface-1)]` (both).

### 3. RoomCode.tsx
**Icons:** before — `<span aria-hidden>📋</span>` (copy, L30),
`<span aria-hidden>📷</span>` (QR, L39). After — `<Copy size={14} aria-hidden />`,
`<QrCode size={14} aria-hidden />`; `Copy, QrCode` imported.

### 4. RoomNameEditor.tsx
**Icons:** before — `<span aria-hidden>✏️</span>` ("Name this table", L63).
After — `<Pencil size={14} aria-hidden />`; `Pencil` imported. The named-state
`✏️ {name}` (L79) was left untouched (Caveat script-font baseline rationale).

### 5. RoomHeader.tsx
**Icons:** before — `<span aria-hidden>🚪</span>` (Leave, L60). After —
`<LogOut size={16} aria-hidden />`; `LogOut` imported.

### 6. PlayerList.tsx
**Icons:** before — `<span aria-hidden>👥</span>` (L17 heading + L102 footer),
`👑` (L58 host), `✓` (L80 ready), `🎯` (L93 react). After — `<Users size={14} aria-hidden />` ×2,
`<Crown size={13} aria-hidden />`, `<Check size={13} aria-hidden />`,
`<Target size={14} aria-hidden />`; `Users, Crown, Check, Target` imported.
**Token:** before — `dark:bg-[#131926]` (L14). After — `dark:bg-[var(--surface-1)]`.

### 7. ParticipantRow.tsx
**Icons:** before — `<span>👑</span>` (host badge, L88), `<span>🤖</span>`
(bot badge, L98), `<span className="text-xs">✓</span>` (ready, L141). After —
`<Crown size={12} aria-hidden />`, `<Bot size={12} aria-hidden />`,
`<Check size={13} aria-hidden />`; `Crown, Bot, Check` imported.

### 8. ParticipantActionMenu.tsx
**Icons:** before — `<span aria-hidden>🗑️</span>` (remove, L96). After —
`<Trash2 size={14} aria-hidden />`; `Trash2` imported.

### 9. BotManagementDialog.tsx
**Icons:** before — `<span className="text-xl" aria-hidden>🤖</span>`
(header, L75). After — `<Bot size={20} aria-hidden />`; `Bot` imported.

### 10. RoomShareCard.tsx
**Icons:** before — `<span aria-hidden>🎟️</span>` (L106),
`<span aria-hidden className="text-sm">📷</span>` (L118),
`<span aria-hidden className="text-sm">📸</span>` (L130),
`<span>✓</span> Copied` (L154), `<span aria-hidden>📋</span>` (L170),
`<span aria-hidden>🔗</span>` (L180). After — `<Ticket size={14} aria-hidden />`,
`<QrCode size={15} aria-hidden />`, `<Camera size={15} aria-hidden />`,
`<Check size={13} aria-hidden /> Copied`, `<Copy size={14} aria-hidden />`,
`<Link2 size={14} aria-hidden />`; `Ticket, QrCode, Camera, Copy, Link2, Check` imported.

### 11. Chat.tsx
**Icons:** before — `<span aria-hidden>💬</span>` (chat header, L76). After —
`<MessageSquare size={14} aria-hidden />`; `MessageSquare` imported.
**Tokens:** before — `dark:bg-[#131926]` (L70 container, L74 header, L145
composer footer). After — `dark:bg-[var(--surface-1)]` (all three).

---

## 3. Verification commands + results

### 3.1 TypeScript validation
```bash
cd client && npm run typecheck > typecheck.log 2>&1
```
Result: **clean** — `typecheck.log` contains only the npm banner + `tsc --noEmit`
header, zero error lines.

### 3.2 Test suite
```bash
cd client && npm test -- --watch=false > test.log 2>&1
```
Result:
```
 Test Files  64 passed (64)
      Tests  502 passed (502)
   Duration  41.57s
```
Zero failures. The only stderr entries are pre-existing warnings unrelated to
this change: React Router v7 future-flag notices and one `act(...)` warning in
`EditProfileModal.test.tsx` (none of the 11 changed files are exercised by that
test).

### 3.3 Production build
```bash
cd client && npm run build > build.log 2>&1
```
Result: **✓ built in 14.97s** — 3160 modules transformed;
`🚀 [Prerender] Static HTML prerendering successfully completed!` — **15/15
public routes prerendered** (`/`, `/games`, `/about`, `/privacy`, `/login`,
`/signup`, `/forgot-password`, `/reset-password`, `/verify-email`,
`/nokiacricket`, `/snake`, `/brickracer`, `/brickblocks`, `/tetris`,
`/breakout`). Only pre-existing advisory output (chunk >600 kB warning; the
PowerShell `NativeCommandError` wrapper that PowerShell prints whenever node
writes to stderr — not an error).

### 3.4 Static measurements (audit tooling)
```bash
npm run design:tokens
```
Result (excerpts relevant to Wave 2):
```
Colour token adoption
─────────────────────
Design-token classes (named utility)                     425
Design-token classes (var() arbitrary)                   797   <- +7 vs phase-1
Design-token classes (total)                            1222
Raw Tailwind palette classes                            4184
Arbitrary hex classes                                   2702   <- -7 vs phase-1
TOTAL colour-bearing classes                            8108
Token compliance                                       15.1%

Icon systems
────────────
lucide-react consumers                                    49   <- +11 vs phase-1
design-system/icons consumers                             25
bhalyam/icons consumers                                    3
Emoji glyphs in PRODUCT CHROME                           391   <- -26 vs phase-1
Emoji glyphs in game surfaces                            822
```

Before numbers (phase-1 close, per the authoritative reports, not re-derived):
- `var()` arbitrary token classes: **790** → **797** (+7)
- Arbitrary hex classes: **2,709** → **2,702** (−7)
- Token compliance: **15.0%** → **15.1%**
- lucide-react consumers: **38** → **49** (+11)
- Emoji glyphs in product chrome: **417** → **391** (−26)

---

## 4. Regression checks (observed)

| Check | Result |
|---|---|
| No functionality changes | 0 handler/prop/event/state edits across all 11 files — icon + class-string swaps only |
| No accessibility regressions | Every replacement retains `aria-hidden` (additive where the source span lacked it); interactive controls' `aria-label`/`title` untouched; lucide icons render `aria-hidden="true"` |
| No responsive regressions | Flex parents and size classes unchanged; icon sizes (12–16px) match the emoji footprints they replaced |
| No theme regressions | Icons inherit `currentColor`; token swaps resolve to the identical hex (`--surface-1: #131926` in dark) — verified against `index.css` before editing |
| No route/API/test churn | No route, socket, or `@shared` type touched; 64/64 test files pass |

---

## 5. Diagnostics logs

Supporting artifacts produced during verification (working-tree only, not
deliverables): `client/typecheck.log`, `client/test.log`, `client/build.log`.
These may be deleted after review; the results above are reproduced from them.