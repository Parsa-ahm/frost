// Google Maps support — results feed cards + the place detail pane.
//
// Feed cards (div[role="article"]) no longer carry an aria-label; the business
// name lives on the inner /maps/place/ link's aria-label, with the
// .fontHeadlineSmall heading as fallback.
//
// The place pane (single business open) is identified by its
// [data-item-id="address"] button — those data-item-id hooks are the most
// stable selectors Maps has.

import type { IcyLead } from '../types'
import { injectBadge } from './badge'
import { applyCardState, isBgError, onAction, PHONE_RE, send, state } from './core'

export function initMaps(): void {
  waitForFeed()
  watchPlacePane()
}

// ─── Results feed ─────────────────────────────────────────────────────────────

let feedEl: Element | null = null

function waitForFeed(): void {
  const existing = document.querySelector('div[role="feed"]')
  if (existing) {
    observeFeed(existing)
    return
  }
  let elapsed = 0
  const timer = setInterval(() => {
    elapsed += 100
    const feed = document.querySelector('div[role="feed"]')
    if (feed) {
      clearInterval(timer)
      observeFeed(feed)
    } else if (elapsed >= 10_000) {
      clearInterval(timer)
      watchForLateFeed()
    }
  }, 100)
}

// Maps is a SPA — the user may land on a place page or the homepage and search
// later, long after the 10s poll gives up.
function watchForLateFeed(): void {
  const observer = new MutationObserver(() => {
    const feed = document.querySelector('div[role="feed"]')
    if (feed) {
      observer.disconnect()
      observeFeed(feed)
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

function observeFeed(feed: Element): void {
  feedEl = feed
  const observer = new MutationObserver(() => void processCards())
  observer.observe(feed, { childList: true, subtree: true })
  void processCards()
}

async function processCards(): Promise<void> {
  if (!feedEl?.isConnected) {
    // feed was torn down (SPA navigation) — wait for the next one
    feedEl = null
    watchForLateFeed()
    return
  }
  const cards = feedEl.querySelectorAll<HTMLElement>('div[role="article"]')

  for (const card of cards) {
    if (card.dataset.frostId) {
      const lead = state.leads.get(card.dataset.frostId)
      if (lead) applyCardState(card, lead)
      continue
    }

    const extracted = extractLeadFromCard(card)
    if (!extracted) continue

    try {
      const lead = await send<IcyLead>({ type: 'UPSERT_LEAD', lead: extracted })
      if (isBgError(lead)) continue
      state.leads.set(lead.id, lead)
      card.dataset.frostId = lead.id
      injectBadge(card, lead, onAction)
      applyCardState(card, lead)
    } catch {
      // extension context invalidated (reload) — stop quietly
      return
    }
  }
}

interface ExtractedLead {
  name: string
  phone: string
  address: string
  mapsUrl: string
  searchQuery: string
}

function extractLeadFromCard(card: HTMLElement): ExtractedLead | null {
  const link = card.querySelector<HTMLAnchorElement>('a[href*="/maps/place/"]')
  const rawName =
    link?.getAttribute('aria-label') ??
    card.getAttribute('aria-label') ??
    card.querySelector('.fontHeadlineSmall')?.textContent ??
    ''
  // Some cards are labeled "1. ABC Plumbing" — strip the list number
  const name = rawName.replace(/^\d+\.\s*/, '').trim()
  if (!name) return null

  const text = card.innerText
  const phone = text.match(PHONE_RE)?.[0] ?? ''
  const address = extractAddress(card, name)
  const mapsUrl = link?.href ?? location.href
  const searchQuery = new URLSearchParams(location.search).get('q') ?? queryFromPath()

  return { name, phone, address, mapsUrl, searchQuery }
}

// Maps search URLs usually carry the query in the path: /maps/search/plumbers+toronto/@...
export function queryFromPath(): string {
  const match = location.pathname.match(/\/maps\/search\/([^/@]+)/)
  return match?.[1] ? decodeURIComponent(match[1]).replace(/\+/g, ' ') : ''
}

export function looksLikeStreet(t: string): boolean {
  return /^\d+\s+\S+/.test(t) && !PHONE_RE.test(t)
}

function extractAddress(card: HTMLElement, name: string): string {
  for (const el of card.querySelectorAll('span, div')) {
    if (el.children.length > 0) continue // leaf nodes only
    const t = el.textContent?.trim() ?? ''
    if (!t || t === name) continue
    if (looksLikeStreet(t)) return t
  }

  // Maps often renders "Plumber · 123 Main St" on one line
  for (const line of card.innerText.split('\n')) {
    const hit = line
      .split('·')
      .map(p => p.trim())
      .find(looksLikeStreet)
    if (hit) return hit
  }
  return ''
}

// ─── Place detail pane ────────────────────────────────────────────────────────

function watchPlacePane(): void {
  setInterval(() => void processPlacePane(), 1000)
}

async function processPlacePane(): Promise<void> {
  const addrBtn = document.querySelector<HTMLElement>('[data-item-id="address"]')
  if (!addrBtn) return
  const pane = addrBtn.closest<HTMLElement>('div[role="main"]')
  if (!pane) return

  const h1 = pane.querySelector('h1')
  const name = (pane.getAttribute('aria-label') ?? h1?.textContent ?? '').trim()
  if (!name || name === 'Results') return
  if (pane.dataset.frostPlace === name) return // this business is already badged
  pane.dataset.frostPlace = name
  pane.dataset.frostNoHide = 'true'
  pane.querySelector('.frost-badge')?.remove() // pane reused for a new business

  const address = (addrBtn.getAttribute('aria-label') ?? addrBtn.textContent ?? '')
    .replace(/^Address:\s*/i, '')
    .trim()
  const phoneBtn = pane.querySelector<HTMLElement>('[data-item-id^="phone:tel:"]')
  const phone = (phoneBtn?.getAttribute('aria-label') ?? '').replace(/^Phone:\s*/i, '').trim()

  try {
    const lead = await send<IcyLead>({
      type: 'UPSERT_LEAD',
      lead: { name, phone, address, mapsUrl: location.href, searchQuery: queryFromPath() },
    })
    if (isBgError(lead)) return
    state.leads.set(lead.id, lead)
    pane.dataset.frostId = lead.id
    injectBadge(pane, lead, onAction, h1 ?? undefined)
  } catch {
    // extension context invalidated
  }
}
