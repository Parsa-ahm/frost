# Frost — Cold Call Tracker Chrome Extension
## One-Shot Implementation Spec

Frost is a Chrome MV3 extension that overlays Google Maps business search results with call status badges, logs every dial attempt, and syncs qualified leads to a self-hosted Twenty CRM instance. It is built for a sales rep doing cold outreach from Google Maps — searching e.g. "plumbers toronto", calling down the list, and tracking outcomes in real time.

---

## Tech Stack

- **Chrome MV3** — Manifest V3, side panel, content script, service worker
- **React 18 + TypeScript** — Side panel UI only (content script is vanilla TS)
- **Vite + vite-plugin-web-extension** — Build system
- **chrome.storage.local** — All persistence (no backend, no server)
- **Twenty CRM REST API** — Optional, for pushing qualified leads

Do NOT use any other UI library. Do NOT add CSS frameworks. Write all styles in `src/sidepanel/styles.css` and `src/content/styles.css`. Dark theme throughout (#18181b background, #fafafa text, zinc color scale).

---

## Repository Structure

```
frost/
├── SPEC.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .gitignore
└── src/
    ├── manifest.json
    ├── types/index.ts          ← COMPLETE — all interfaces defined, do not modify
    ├── utils/
    │   ├── hash.ts             ← COMPLETE — leadId() function, do not modify
    │   ├── storage.ts          ← IMPLEMENT — all chrome.storage helpers
    │   ├── stats.ts            ← IMPLEMENT — aggregation helpers
    │   └── twenty.ts           ← IMPLEMENT — Twenty CRM API client
    ├── content/
    │   ├── index.ts            ← IMPLEMENT — Maps injection entry point
    │   ├── badge.ts            ← IMPLEMENT — dot badge injection
    │   ├── popover.ts          ← IMPLEMENT — quick action popover
    │   └── styles.css          ← COMPLETE — all content styles defined
    ├── background/
    │   └── index.ts            ← IMPLEMENT — service worker, all message handlers
    └── sidepanel/
        ├── index.html          ← COMPLETE
        ├── index.tsx           ← IMPLEMENT — React root, App component
        ├── styles.css          ← IMPLEMENT — side panel styles
        └── tabs/
            ├── today.tsx       ← IMPLEMENT
            ├── log.tsx         ← IMPLEMENT
            ├── retry.tsx       ← IMPLEMENT
            ├── stats.tsx       ← IMPLEMENT
            └── settings.tsx    ← IMPLEMENT
```

Files marked COMPLETE are already written and correct. Files marked IMPLEMENT are stubs with detailed comments — read every comment before implementing.

---

## Data Model

All types are in `src/types/index.ts`. Key interfaces:

### IcyLead
One record per business. Keyed by `id = leadId(name, address)` — a 12-char hex hash.

```typescript
{
  id: string            // hash, stable across sessions
  name: string          // business name from Maps aria-label
  phone: string         // from Maps card, may be empty string
  address: string       // from Maps card
  mapsUrl: string       // full Maps URL for this business
  status: LeadStatus    // 'pending' | 'no_answer' | 'called' | 'rejected' | 'qualified' | 'hidden'
  callCount: number     // incremented on every dial (any outcome except 'hidden')
  firstCalled: string   // ISO datetime
  lastCalled: string    // ISO datetime
  notes: string         // freeform, newline-separated if multiple entries
  searchQuery: string   // e.g. "plumbers toronto"
  twentyId?: string     // set after CRM push
  addedAt: string       // ISO datetime when first seen in Maps
}
```

### CallEvent
Immutable log of every single dial attempt.

```typescript
{
  id: string            // crypto.randomUUID()
  leadId: string
  timestamp: string     // ISO datetime of the call
  outcome: 'no_answer' | 'called' | 'rejected' | 'qualified'
  notes: string         // empty string if none
}
```

### DayStats
Aggregated counters per calendar day.

```typescript
{
  date: string          // YYYY-MM-DD local time
  dials: number         // total = noAnswer + called + rejected + qualified
  noAnswer: number
  called: number
  rejected: number
  qualified: number
}
```

### StorageSchema
```typescript
{
  leads:    Record<string, IcyLead>     // key = lead.id
  events:   CallEvent[]                 // append-only, never delete
  dayStats: Record<string, DayStats>    // key = YYYY-MM-DD
  settings: FrostSettings
}
```

---

## chrome.storage.local — Storage Utilities (`utils/storage.ts`)

Implement these exact functions. All are async. Never access `chrome.storage` outside this file.

```typescript
getLeads(): Promise<Record<string, IcyLead>>
getLead(id: string): Promise<IcyLead | null>
upsertLead(lead: IcyLead): Promise<void>
getEvents(): Promise<CallEvent[]>
appendEvent(e: CallEvent): Promise<void>
getDayStats(date: string): Promise<DayStats>      // creates empty record if not exists
getAllDayStats(): Promise<DayStats[]>              // sorted newest-first
incrementDayStat(date: string, fields: Partial<Omit<DayStats, 'date'>>): Promise<void>
getSettings(): Promise<FrostSettings>
saveSettings(s: FrostSettings): Promise<void>
```

Default settings on first install:
```typescript
{ twentyApiUrl: '', twentyApiToken: '', hideCalledOnMaps: true }
```

---

## Content Script (`src/content/index.ts`)

Injected only on `https://www.google.com/maps/*`. No React — vanilla TypeScript.

### Activation sequence

```
init()
  └─ waitForFeed()          polls every 100ms (max 10s) for div[role="feed"]
       └─ observeFeed(el)   MutationObserver on feed + initial processCards()
            └─ processCards()
                 ├─ for each new card → extractLeadFromCard() → UPSERT_LEAD → injectBadge()
                 └─ for each existing card → refresh badge from current lead status
```

### Google Maps DOM

Google Maps uses ARIA roles that are stable across redesigns:
- **Feed container**: `div[role="feed"]` — the scrollable results sidebar
- **Each card**: `div[role="article"]` inside the feed
- **Business name**: `card.getAttribute('aria-label')` — this is the most reliable selector
- **Address**: first `span` or `div` inside the card that does NOT match a phone pattern and is not the name
- **Phone**: any text matching `/\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/`
- **Maps URL**: `card.querySelector('a[href*="/maps/place/"]')?.href`
- **Search query**: `new URLSearchParams(location.search).get('q') ?? ''`

Mark processed cards with `card.dataset.frostId = lead.id` to avoid re-processing.
Set `card.style.position = 'relative'` so the absolute-positioned badge works.

### Badge colors

```
pending    → #6b7280 (gray)
no_answer  → #f59e0b (amber)
called     → #3b82f6 (blue)
rejected   → #ef4444 (red)
qualified  → #22c55e (green) + '✓' if twentyId exists
hidden     → hide the card: card.style.display = 'none'
```

### Action flow when user clicks badge

1. `showPopover(lead, badgeEl, onAction)` — renders the floating action menu
2. User clicks an outcome button → `onAction(leadId, outcome, notes)` called
3. `onAction` sends `UPDATE_STATUS` or `HIDE_LEAD` to background via `chrome.runtime.sendMessage`
4. Background replies with updated `IcyLead`
5. `updateBadge(card, updatedLead)` is called — refreshes badge color
6. If outcome = 'qualified' and no `twentyId`: show "Add to CRM" button in popover
7. If "Add to CRM" clicked: send `PUSH_TO_TWENTY`, on success show "Synced ✓" in badge

### Hide behavior

When `settings.hideCalledOnMaps = true`:
- After any action that results in status `called`, `rejected`, or `hidden`: hide the card with `card.style.display = 'none'` after a 600ms delay (so user sees the badge update first)
- On `processCards()` for existing cards: if status is called/rejected/hidden AND `hideCalledOnMaps` is true, hide immediately

---

## Side Panel (`src/sidepanel/`)

React 18 app. Opened automatically when extension icon is clicked (set via `chrome.sidePanel.setPanelBehavior`). Stays open while browsing.

### App Component (`index.tsx`)

```typescript
type Tab = 'today' | 'log' | 'retry' | 'stats' | 'settings'

interface AppState {
  activeTab: Tab
  leads: Record<string, IcyLead>
  events: CallEvent[]
  stats: { today: DayStats; allTime: DayStats; allDays: DayStats[] }
  settings: FrostSettings
  loading: boolean
}
```

**Data loading**: On mount, send `GET_LEADS` and `GET_STATS` to background. Subscribe to `chrome.storage.onChanged` — on any change, re-fetch both. This keeps the panel live as the content script makes calls.

**Header**: "❄️ Frost" logo left, settings gear icon right (opens settings tab).

**Tab bar**: 5 tabs. Active tab has white underline. Icons or text labels:
- Today · Log · Retry · Stats · Settings

### Tab: Today

**Stats chips** (top row, 4 chips):
```
Dials: N    Qualified: N    No Answer: N    Rejected: N
```
From `stats.today`. Qualified chip is green when > 0.

**Filter toggle**: "Hide Called/Rejected" — default matches `settings.hideCalledOnMaps`. Filters the lead list below.

**Lead list**: All leads where `lastCalled` date = today (YYYY-MM-DD local).
Sorted: `pending` and `no_answer` first, then `called`, `rejected`, `qualified` last.
Hidden leads not shown.

Each lead row (collapsed):
```
[dot] Business Name                    [Status badge]
      123 Main St, Toronto ON          Called 2x
      416-555-0123
```

Each lead row (expanded, click to toggle):
```
[dot] Business Name                    [Status badge]
      123 Main St, Toronto ON          Called 2x
      ─────────────────────────────────────────────
      [No Answer] [Called] [Rejected] [Qualified] [Hide]
      [Add to CRM]  ← only if qualified + !twentyId
      Notes: [textarea — auto-save on blur]
```

Re-status buttons send `UPDATE_STATUS` to background, then refresh the lead in state.

Empty state: "No calls yet today. Go to Google Maps and start dialing."

### Tab: Log

Full chronological call history.

**Filter controls**:
- Date range: `Today | This Week | This Month | All Time` (button group)
- Status: `All | No Answer | Called | Rejected | Qualified` (button group)
- Search: text input — filters by business name (case-insensitive)

**Event list** — sorted newest first, grouped by date:

```
Wednesday, July 14 — 8 calls
  ─────────────────────────────
  2:34 PM  [Qualified]   ABC Plumbing
                         "Asked for a quote, call back Thursday"
  2:31 PM  [No Answer]   Toronto Pipes Inc
  ...

Tuesday, July 13 — 5 calls
  ...
```

Clicking any row opens a lead detail sheet (modal or inline expand):
```
ABC Plumbing
123 Main St, Toronto · 416-555-0123
Status: Qualified · Called 2x · [Open in Maps ↗]

Call History:
  Jul 14 2:34 PM — Qualified — "Asked for a quote"
  Jul 13 11:12 AM — No Answer
```

### Tab: Retry

All leads with `status = 'no_answer'`, sorted by `lastCalled` ascending (oldest = top priority).

**Header**: "N businesses to retry" in large text.

**Filter controls**:
- Min call count: `Any | 2+ calls | 3+ calls` (button group)
- Search: filter by name
- Search query: dropdown of all unique `lead.searchQuery` values — lets you retry a specific niche

**Lead list**:
```
[Yellow dot] ABC Drains                    Last called: 3 days ago
             123 Main St                   Called 2x
             416-555-0123
```

Expand → re-status buttons. When status changes to anything other than `no_answer`, animate the row out (CSS transition, remove from list).

Relative time labels: "today", "yesterday", "2 days ago", "1 week ago", etc.

Empty state: "No unanswered calls. Keep dialing! 🧊"

### Tab: Cold Calling Stats

**Summary row** — 3 stat cards:
```
[All-Time Dials: 247]  [All-Time Qualified: 18]  [Rate: 7.3%]
```

**This week row** — same 3 cards for last 7 calendar days.

**Best day callout**: "Best day: Wednesday Jul 9 — 34 dials"

**Daily table**:
```
Date        Dials  Qualified  No Answer  Called  Rejected
─────────────────────────────────────────────────────────
Wed Jul 14    22      3           12        5        2
Tue Jul 13    18      1            9        6        2
...
─────────────────────────────────────────────────────────
TOTAL        247     18          141       58       30
```
Show last 30 days. "Load more" button for older.

### Tab: Settings

**Twenty CRM section**:
```
Twenty CRM Integration
──────────────────────
API URL    [https://crm.boldumbrella.com        ]
API Token  [••••••••••••••••••••••••••••••••••••]
           [Save]  [Test Connection]
```
Test connection: GET `{apiUrl}/api/icyLeads?filter=name%5Beq%5D%3Atest&limit=1` — 200/401/404 all confirm connectivity (just not a network error). Show "Connected ✓" green or "Failed: {status}" red.

Setup instructions (collapsible):
```
Before using Twenty integration, create an "Icy Lead" custom object with these fields:
name (Text), phone (Text), address (Text), status (Select: NO_ANSWER/CALLED/REJECTED/QUALIFIED),
callCount (Number), firstCalled (DateTime), lastCalled (DateTime), notes (RichText), searchQuery (Text)
```

**Behavior section**:
```
[Toggle] Auto-hide called/rejected cards on Google Maps
```

**Data section**:
```
[Export JSON]         — downloads frost-export-YYYY-MM-DD.json
[Clear Today's Stats] — resets today's DayStats only (confirm dialog)
[Reset All Data]      — clears leads + events + dayStats (type "RESET" to confirm)
```

---

## Background Service Worker (`src/background/index.ts`)

### On install
```typescript
chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings()
  if (!settings.twentyApiUrl) await saveSettings({ twentyApiUrl: '', twentyApiToken: '', hideCalledOnMaps: true })
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})
```

### Message handler: UPDATE_STATUS

This is the most critical handler. Full implementation:

1. Load lead by `leadId`
2. Create `CallEvent`: `{ id: crypto.randomUUID(), leadId, timestamp: new Date().toISOString(), outcome, notes: notes ?? '' }`
3. Append event to storage
4. Update lead:
   - `status = outcome`
   - `callCount += 1`
   - `lastCalled = now`
   - `firstCalled = now` if `callCount` was 0
   - If notes provided: `lead.notes = lead.notes ? lead.notes + '\n' + notes : notes`
5. Increment DayStats for today:
   - `dials += 1`
   - `[outcome] += 1` (e.g. `noAnswer += 1`)
   - Note: field name mapping: `no_answer` → `noAnswer`, `called` → `called`, etc.
6. Save lead
7. Reply with updated `IcyLead`

### Message handler: UPSERT_LEAD

```typescript
const id = await leadId(lead.name, lead.address)
const existing = await getLead(id)
if (!existing) {
  const now = new Date().toISOString()
  const newLead: IcyLead = {
    id, ...lead, status: 'pending', callCount: 0,
    firstCalled: '', lastCalled: '', notes: '',
    addedAt: now
  }
  await upsertLead(newLead)
  reply(newLead)
} else {
  // Update phone/mapsUrl if they were empty
  let changed = false
  if (!existing.phone && lead.phone) { existing.phone = lead.phone; changed = true }
  if (lead.mapsUrl && lead.mapsUrl !== existing.mapsUrl) { existing.mapsUrl = lead.mapsUrl; changed = true }
  if (changed) await upsertLead(existing)
  reply(existing)
}
```

### Message handler: GET_STATS

```typescript
const allDays = await getAllDayStats()  // sorted newest-first
const today = allDays.find(d => d.date === todayKey()) ?? { date: todayKey(), dials: 0, noAnswer: 0, called: 0, rejected: 0, qualified: 0 }
const allTime = aggregateAllTime(allDays)
reply({ today, allTime, allDays })
```

### Message handler: PUSH_TO_TWENTY

1. Load lead + settings
2. If `!settings.twentyApiToken`: reply `{ error: 'No API token configured. Open Settings to add your Twenty token.' }`
3. Call `pushIcyLead(lead, settings)`
4. On success: `lead.twentyId = returnedId`, `await upsertLead(lead)`, reply `{ success: true, twentyId: returnedId }`
5. On error: reply `{ error: err.message }`

---

## Twenty CRM API (`src/utils/twenty.ts`)

Twenty CRM REST API. Self-hosted at `settings.twentyApiUrl`.

### Create Icy Lead record

```
POST {twentyApiUrl}/api/icyLeads
Authorization: Bearer {twentyApiToken}
Content-Type: application/json

{
  "name": lead.name,
  "phone": lead.phone,
  "address": lead.address,
  "status": mapStatus(lead.status),   // 'NO_ANSWER' | 'CALLED' | 'REJECTED' | 'QUALIFIED'
  "callCount": lead.callCount,
  "firstCalled": lead.firstCalled,
  "lastCalled": lead.lastCalled,
  "notes": lead.notes,
  "searchQuery": lead.searchQuery
}
```

Response: `{ data: { createIcyLead: { id: string } } }` (Twenty returns GraphQL-style even from REST)

OR if Twenty uses standard REST: `{ id: string, ... }`

Handle both response shapes — check for `.data?.createIcyLead?.id ?? response.id`.

Status mapping:
```typescript
const STATUS_MAP = {
  no_answer: 'NO_ANSWER',
  called: 'CALLED',
  rejected: 'REJECTED',
  qualified: 'QUALIFIED',
}
```

### Update Icy Lead record

```
PATCH {twentyApiUrl}/api/icyLeads/{twentyId}
Authorization: Bearer {twentyApiToken}
Content-Type: application/json

{ "status": "QUALIFIED", "callCount": 3, "lastCalled": "..." }
```

---

## Side Panel Styles (`src/sidepanel/styles.css`)

Dark theme. Write ALL styles here.

Color variables to define on `:root`:
```css
--bg: #09090b;
--surface: #18181b;
--surface-hover: #27272a;
--border: #27272a;
--text: #fafafa;
--text-muted: #71717a;
--text-dim: #a1a1aa;
--accent-green: #22c55e;
--accent-amber: #f59e0b;
--accent-blue: #3b82f6;
--accent-red: #ef4444;
--accent-purple: #7c3aed;
```

Side panel is 400px wide (fixed by Chrome). Design for that width.

Status badge colors in lead list rows match the dot colors (same as content script).

Tab bar: fixed at top, tabs as text buttons with active indicator (white 2px bottom border).
Scrollable content area below tab bar.

---

## Edge Cases & Implementation Notes

1. **Google Maps loads dynamically.** The feed may not exist when the content script first runs. Use `waitForFeed()` with polling (setInterval 100ms, clear after 10s max) rather than waiting for DOMContentLoaded.

2. **SPA navigation.** Google Maps is a SPA. When the user performs a new search, the feed's content changes but the feed element may persist. The MutationObserver handles this — new cards appear as mutations and get processed.

3. **aria-label edge cases.** Some Maps cards have `aria-label` like "1. ABC Plumbing". Strip leading numbers and periods: `name.replace(/^\d+\.\s*/, '').trim()`.

4. **Duplicate calls.** If `processCards()` runs twice before a card gets its `data-frost-id` set (async timing), `UPSERT_LEAD` is idempotent (same id computed from name+address), so duplicates are safe.

5. **Storage size.** `chrome.storage.local` limit is 10MB. A typical CallEvent is ~200 bytes. 10MB = ~50,000 events. At 50 calls/day, that's 2.7 years. Fine.

6. **Side panel live updates.** The side panel subscribes to `chrome.storage.onChanged`. Batch the refresh with a 300ms debounce so rapid calls (content script firing multiple events) don't cause excessive re-renders.

7. **Message reply pattern.** All background message handlers must `return true` to keep the message channel open for async replies. Every handler replies exactly once.

8. **Phone regex.** `/\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/` matches North American format. Extract first match from card text content.

9. **Qualified → CRM flow.** When user marks Qualified in the popover: immediately call UPDATE_STATUS (updates local storage), THEN show "Add to CRM" button. Two separate actions. Do NOT auto-push — let user confirm.

10. **Settings persistence.** Settings are in `chrome.storage.local` not `sync`, because the API token should not sync across devices (security).

---

## Build & Install

```bash
pnpm install
pnpm build
# Load dist/ as unpacked extension in chrome://extensions with Developer Mode ON
# Pin the Frost extension, open Google Maps, search for businesses
# Click the Frost icon to open the side panel
```

Add `@vitejs/plugin-react` to devDependencies — it's referenced in vite.config.ts.

---

## What Fable Should Implement (summary)

Read every file in the repo before starting. The types, hash util, manifest, HTML, and all CSS are complete. Implement:

1. `src/utils/storage.ts` — all 9 functions
2. `src/utils/stats.ts` — todayKey, aggregateWeek, aggregateAllTime, statsFromEvents
3. `src/utils/twenty.ts` — pushIcyLead, updateIcyLead
4. `src/content/index.ts` — init, waitForFeed, observeFeed, processCards, extractLeadFromCard
5. `src/content/badge.ts` — injectBadge, updateBadge
6. `src/content/popover.ts` — showPopover, removePopover
7. `src/background/index.ts` — all 7 message handlers + onInstalled
8. `src/sidepanel/index.tsx` — App component, data loading, tab routing
9. `src/sidepanel/styles.css` — complete dark theme styles
10. `src/sidepanel/tabs/today.tsx` — Today tab
11. `src/sidepanel/tabs/log.tsx` — Log tab
12. `src/sidepanel/tabs/retry.tsx` — Retry tab
13. `src/sidepanel/tabs/stats.tsx` — Stats tab
14. `src/sidepanel/tabs/settings.tsx` — Settings tab
