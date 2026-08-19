# SOCIAL-HUB-REDESIGN-FUNCTIONAL-INVENTORY.md — Social Hub Functional Discovery & Preservation Matrix

> **Author:** Principal Product Designer, Design Systems Architect & Social Gaming UX Specialist  
> **Date:** 2026-08-19  
> **Target Screen:** BHALYAM Social Hub (`/social`)  
> **Status:** Discovery & Inventory Complete  

---

## 1. Executive Summary

This document establishes the Phase 0 Functional Discovery and Preservation Matrix for the BHALYAM Social Hub redesign.

### Source-of-Truth Hierarchy:
1. **Existing business behavior and application functionality** (Real friends list, presence polling, party creation, invitations, shared match history, request dispatching)
2. **Current routes, APIs, state, permissions, and domain models** (Zero static mock content replacing working endpoints)
3. **BHALYAM governance and accessibility standards** (WCAG 2.1 AA, $\ge 44\times 44\text{px}$ touch targets, zero `any`)
4. **UX reference for visual presentation and layout hierarchy** (Styling, spacing, purple hero banner, 2-column desktop layout, quick actions, tips card)
5. **Current screenshot as evidence of existing implementation**

---

## 2. API Endpoints & State Flow Audit

| Endpoint | Method | Response Payload | Component Consumer | Purpose |
|---|:---:|---|---|---|
| `/api/social/friends/:id` | GET | `{ friends: Friend[] }` | `SocialHubPage.tsx`, `FriendsList.tsx` | Fetch player's confirmed friends list |
| `/api/social/presence/query` | POST | `{ presences: Record<string, PlayerPresence> }` | `OnlineFriendsPanel.tsx`, `FriendsList.tsx` | Bulk fetch realtime presence for friend player IDs |
| `/api/social/presence/:id` | POST | `{ success: boolean }` | `SocialHubPage.tsx` | Heartbeat & update own presence status (ONLINE, activityDetail) |
| `/api/social/requests/:id` | GET | `{ incoming: FriendRequest[], outgoing: FriendRequest[] }` | `FriendRequestPanel.tsx` | Fetch incoming & pending outgoing friend requests |
| `/api/social/requests/send` | POST | `{ success: boolean, request: FriendRequest }` | `FriendRequestPanel.tsx` | Dispatch new friend request by recipient Player ID |
| `/api/social/requests/:id/accept` | POST | `{ success: boolean, friendship: Friend }` | `FriendRequestPanel.tsx` | Accept an incoming friend request |
| `/api/social/requests/:id/decline` | POST | `{ success: boolean }` | `FriendRequestPanel.tsx` | Decline/reject an incoming friend request |
| `/api/social/friends/:id/remove` | POST | `{ success: boolean }` | `FriendsList.tsx` | Remove a friend from the player's friend list |
| `/api/social/shared-history/:id/:friendId` | GET | `{ history: SharedHistory }` | `SharedHistoryModal.tsx` | Fetch matches played together, wins together, tournaments together |
| `/api/parties/player/:id` | GET | `{ party: Party \| null, invitations: PartyInvitation[] }` | `SocialHubPage.tsx`, `PartyPanel.tsx` | Fetch active party lobby & pending party invites |
| `/api/parties/create` | POST | `{ success: boolean, party: Party }` | `PartyPanel.tsx`, `SocialHubPage.tsx` | Create/assemble a new 4-player party |
| `/api/parties/:id/invite` | POST | `{ success: boolean, invitation: PartyInvitation }` | `SocialHubPage.tsx`, `OnlineFriendsPanel.tsx` | Invite friend to active party |
| `/api/parties/invitations/:id/accept` | POST | `{ success: boolean, party: Party }` | `PartyInvitationModal.tsx` | Accept party invitation |
| `/api/parties/invitations/:id/decline` | POST | `{ success: boolean }` | `PartyInvitationModal.tsx` | Decline party invitation |
| `/api/parties/player/:id/ready` | POST | `{ success: boolean, party: Party }` | `PartyPanel.tsx` | Toggle party ready state |
| `/api/parties/player/:id/leave` | POST | `{ success: boolean }` | `PartyPanel.tsx` | Leave current party |
| `/api/parties/player/:id/disband` | POST | `{ success: boolean }` | `PartyPanel.tsx` | Disband party (leader only) |
| `/api/parties/player/:id/target` | POST | `{ success: boolean, party: Party }` | `PartyPanel.tsx` | Set leader squad target room code |

---

## 3. Preservation Matrix

| Feature / Element | Source Component | Data Source | Current Behavior | Present in UX Reference | Planned Redesigned Placement | Preservation Status |
|---|---|---|---|:---:|---|:---:|
| **Top Navigation Bar** | `AppHeader.tsx` | Global layout | Notifications, avatar menu, theme toggle, breadcrumbs | Yes | Top of page via `AppLayout` | **PRESERVED** |
| **Left Sidebar Navigation** | `AppSidebar.tsx` | `navigationConfig.tsx` (`home-social`) | Shows navigation destinations, Social Hub active with Squads badge | Yes | Left sidebar via `AppLayout` | **PRESERVED** |
| **Social Hub Hero Banner** | `SocialHubPage.tsx` | Static copy & icon | Amber card with title & description | Yes (Purple/Violet) | Wide purple/indigo hero card with rich vector group gaming artwork | **PRESERVED & ENHANCED** |
| **Active Friends Notice** | `OnlineFriendsPanel.tsx` | `friends`, `presences` | Strip of online friends | Yes | Full active-friends notice banner with live count & Invite Friends action | **PRESERVED & ELEVATED** |
| **Social Section Tabs** | `SocialHubPage.tsx` | `activeTab` state | 3 tabs with count badges | Yes | Category tabs bar with golden active pills & dynamic counters | **PRESERVED** |
| **Search & Status Filter Controls** | `FriendsList.tsx` | `searchQuery` state | Basic name filter input | Yes | Dual-control row: search input + status dropdown (All / Online / In Game / Offline) | **PRESERVED & ENHANCED** |
| **Friends List Grid** | `FriendsList.tsx` | `friends`, `presences` | Card list with presence & actions | Yes | Left column primary card list with status pills, avatars, and actions | **PRESERVED** |
| **No Friends Empty State** | `FriendsList.tsx` | `friends.length === 0` | Empty illustration | Yes | Large light surface with friendly group illustration, explanation, and "Find Friends" CTA | **PRESERVED & UPGRADED** |
| **Party Headquarters** | `PartyPanel.tsx` | `party`, `effectivePlayerId` | Squad creation, member list, ready toggles, room target | Yes (Tab) | Tab 2: Full squad lobby management with leader target controls | **PRESERVED** |
| **Friend Requests Panel** | `FriendRequestPanel.tsx` | `incomingRequests`, `outgoingRequests` | Send ID form + incoming & outgoing lists | Yes (Tab) | Tab 3: Request dispatching + incoming accept/decline + pending list | **PRESERVED** |
| **Shared History Modal** | `SharedHistoryModal.tsx` | `selectedFriendForHistory`, `sharedHistoryData` | Modal with co-op stats | Contextual | Modal dialog with matches/wins together | **PRESERVED** |
| **Party Invitation Modal** | `PartyInvitationModal.tsx` | `activePartyInvite` | Modal on incoming party invite | Contextual | Modal dialog with accept/decline | **PRESERVED** |
| **Desktop Quick Actions Panel** | *New Sub-Component* | `handleCreateParty`, `handleSendFriendRequest`, routes | Inlined actions | Yes | Right column: 4-card action stack (Create Squad, Invite Friends, Recent Rooms, Blocked Players) | **NEW & INTEGRATED** |
| **Community Tips Card** | *New Sub-Component* | Tips content | None | Yes | Right column: Nostalgic social gaming tips card with illustration | **NEW & INTEGRATED** |

---

## 4. Design & Polish Blueprint

1. **2-Column Desktop Grid**:
   - Left Column ($\sim 67\%$ width): Tabbed social content (Search/Filter + Friends List / Empty State / Party / Requests).
   - Right Column ($\sim 33\%$ width): Quick Actions stack + Community Tips card.
2. **Semantic Theming**:
   - Light Mode: Warm cream `#FAF3E0` canvas, elevated white `#FFFFFF` cards with subtle borders, rich mahogany `#3D2005` text, and vibrant purple/amber accents.
   - Dark Mode: Layered obsidian `#070B14` canvas, dark slate `#0F172A` / `#18181B` cards, and glowing purple/amber lighting halos.
3. **Accessibility**:
   - WCAG 2.1 AA contrast ratio across all text and badges.
   - Minimum $44 \times 44\text{ CSS px}$ touch targets on all buttons, tabs, and filter controls.
   - Proper ARIA landmarks (`role="tablist"`, `role="tab"`, `role="region"`, `role="dialog"`).
