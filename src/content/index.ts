// Content script — injected on https://www.google.com/maps/*
//
// RESPONSIBILITY:
//   1. Wait for the Maps results feed to appear
//   2. For each business card in the feed, inject a status badge
//   3. Watch for new cards as the user scrolls (MutationObserver)
//   4. Send UPSERT_LEAD to background when a new card is seen
//   5. Show/hide cards based on lead status + hideCalledOnMaps setting
//
// ENTRY POINT:
//   Call init() on load.
//   init() → waitForFeed() → observeFeed(feedEl)
//
// waitForFeed():
//   Polls with setInterval (100ms, max 10s) for div[role="feed"] to exist.
//   Once found, calls observeFeed(el).
//
// observeFeed(feedEl: Element):
//   Creates a MutationObserver on feedEl with { childList: true, subtree: true }.
//   On each mutation, calls processCards().
//   Also calls processCards() immediately on first run.
//
// processCards():
//   Selects all div[role="article"] inside the feed.
//   For each card not yet processed (no data-frost-id attribute):
//     1. Extract lead data via extractLeadFromCard(card)
//     2. If extraction fails, skip
//     3. Send UPSERT_LEAD message to background, get back the lead
//     4. Call injectBadge(card, lead)
//     5. Set card.dataset.frostId = lead.id
//   For each card already processed:
//     1. Get lead from background
//     2. Refresh badge state (status may have changed from side panel)
//
// extractLeadFromCard(card: Element) → { name, address, phone, mapsUrl } | null:
//   name:     card.getAttribute('aria-label') ?? first non-empty textContent of a heading inside card
//   address:  Look for span/div that follows the name, typically contains street address.
//             Fallback: empty string.
//   phone:    Look for a span containing a phone pattern (/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/).
//             Fallback: empty string.
//   mapsUrl:  card.querySelector('a[href*="/maps/place/"]')?.href ?? location.href
//   searchQuery: new URLSearchParams(location.search).get('q') ?? document.title
//   Return null if name is empty.
//
// IMPORTS: badge.ts, popover.ts, types/index.ts
// MESSAGES TO BACKGROUND: UPSERT_LEAD, UPDATE_STATUS, HIDE_LEAD, GET_LEADS, GET_SETTINGS

import './styles.css'
