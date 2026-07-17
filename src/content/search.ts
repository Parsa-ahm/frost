// Google Search local results ("Places" tab / local pack on the SERP).
//
// The local finder DOM is less stable than Maps, so extraction works off
// several long-lived hooks with fallbacks:
//   - .rllt__details      — detail block of each local result row (years-stable)
//   - [data-cid]          — element carrying the business's customer id
//   - [role="heading"]    — business name inside a row
//   - a[href*="/maps/place"] — maps link when present

import type { IcyLead } from '../types'
import { injectBadge } from './badge'
import { applyCardState, isBgError, onAction, PHONE_RE, send, state } from './core'
import { looksLikeStreet } from './maps'

export function initSearch(): void {
  let timer: ReturnType<typeof setTimeout> | undefined
  const observer = new MutationObserver(() => {
    clearTimeout(timer)
    timer = setTimeout(() => void processResults(), 300)
  })
  observer.observe(document.body, { childList: true, subtree: true })
  void processResults()
}

function findResultRows(): HTMLElement[] {
  const rows = new Set<HTMLElement>()

  for (const details of document.querySelectorAll<HTMLElement>('.rllt__details')) {
    const row =
      details.closest<HTMLElement>('[jscontroller], [data-cid], div[jsname]') ??
      details.parentElement
    if (row) rows.add(row)
  }

  for (const el of document.querySelectorAll<HTMLElement>('div[data-cid], a[data-cid]')) {
    // skip if an ancestor row was already collected
    let covered = false
    for (const row of rows) if (row.contains(el) || el.contains(row)) covered = true
    if (!covered) rows.add(el)
  }

  return [...rows]
}

async function processResults(): Promise<void> {
  for (const row of findResultRows()) {
    if (row.dataset.frostId) {
      const lead = state.leads.get(row.dataset.frostId)
      if (lead) applyCardState(row, lead)
      continue
    }

    const extracted = extractFromRow(row)
    if (!extracted) continue

    try {
      const lead = await send<IcyLead>({ type: 'UPSERT_LEAD', lead: extracted })
      if (isBgError(lead)) continue
      state.leads.set(lead.id, lead)
      row.dataset.frostId = lead.id
      row.style.position = 'relative'
      injectBadge(row, lead, onAction)
      applyCardState(row, lead)
    } catch {
      return // extension context invalidated
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

function extractFromRow(row: HTMLElement): ExtractedLead | null {
  const heading =
    row.querySelector('[role="heading"]') ??
    row.querySelector('.OSrXXb') ??
    row.querySelector('span.dbg0pd')
  const name = heading?.textContent?.trim() ?? ''
  if (!name) return null

  const text = row.innerText
  const phone = text.match(PHONE_RE)?.[0] ?? ''
  const address = extractAddress(text)
  const mapsUrl =
    row.querySelector<HTMLAnchorElement>('a[href*="/maps/place"]')?.href ?? location.href
  const searchQuery = new URLSearchParams(location.search).get('q') ?? ''

  return { name, phone, address, mapsUrl, searchQuery }
}

function extractAddress(text: string): string {
  for (const line of text.split('\n')) {
    const hit = line
      .split('·')
      .map(p => p.trim())
      .find(looksLikeStreet)
    if (hit) return hit
  }
  return ''
}
