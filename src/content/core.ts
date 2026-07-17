// Shared content script runtime — messaging, lead cache, settings, action handling.
// Used by all three surfaces: Maps feed, Maps place pane, Google Search local results.

import type { BgMessage, FrostSettings, IcyLead } from '../types'
import { updateBadge, type ActionCallback, type BadgeAction } from './badge'
import { showPopover } from './popover'

export const PHONE_RE = /\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/

export const state = {
  settings: { twentyApiUrl: '', twentyApiToken: '', hideCalledOnMaps: true } as FrostSettings,
  leads: new Map<string, IcyLead>(),
}

export function send<T>(msg: BgMessage): Promise<T> {
  return chrome.runtime.sendMessage(msg) as Promise<T>
}

export function isBgError(res: unknown): res is { error: string } {
  return typeof res === 'object' && res !== null && 'error' in res
}

export async function initCore(): Promise<void> {
  try {
    state.settings = await send<FrostSettings>({ type: 'GET_SETTINGS' })
  } catch {
    // background not ready yet — defaults are fine
  }
  subscribeToStorageChanges()
}

// Cards marked data-frost-no-hide (the Maps place pane) get badge updates but
// are never display:none'd — hiding the whole detail panel would be wrong.
export function applyCardState(card: HTMLElement, lead: IcyLead): void {
  updateBadge(card, lead)
  if (card.dataset.frostNoHide) return
  if (
    state.settings.hideCalledOnMaps &&
    (lead.status === 'called' || lead.status === 'rejected' || lead.status === 'hidden')
  ) {
    card.style.display = 'none'
  }
}

export const onAction: ActionCallback = (id, action, notes) => {
  void handleAction(id, action, notes)
}

async function handleAction(id: string, action: BadgeAction, notes: string): Promise<void> {
  const cards = [...document.querySelectorAll<HTMLElement>(`[data-frost-id="${id}"]`)]

  if (action === 'push_crm') {
    const res = await send<{ success?: boolean; twentyId?: string; error?: string }>({
      type: 'PUSH_TO_TWENTY',
      leadId: id,
    })
    if (res.error) {
      toast(res.error, true)
      return
    }
    const lead = state.leads.get(id)
    if (lead && res.twentyId) {
      const updated = { ...lead, twentyId: res.twentyId }
      state.leads.set(id, updated)
      for (const card of cards) updateBadge(card, updated)
    }
    toast('Synced to Twenty ✓')
    return
  }

  if (action === 'hidden') {
    const updated = await send<IcyLead>({ type: 'HIDE_LEAD', leadId: id })
    if (isBgError(updated)) {
      toast(updated.error, true)
      return
    }
    state.leads.set(id, updated)
    for (const card of cards) {
      setTimeout(() => updateBadge(card, updated), 600)
    }
    return
  }

  const updated = await send<IcyLead>({
    type: 'UPDATE_STATUS',
    leadId: id,
    outcome: action,
    notes: notes || undefined,
  })
  if (isBgError(updated)) {
    toast(updated.error, true)
    return
  }
  state.leads.set(id, updated)

  for (const card of cards) {
    updateBadge(card, updated)
    if (
      !card.dataset.frostNoHide &&
      state.settings.hideCalledOnMaps &&
      (action === 'called' || action === 'rejected')
    ) {
      // let the user see the badge change before the card disappears
      setTimeout(() => {
        card.style.display = 'none'
      }, 600)
    }
  }

  // Qualified → offer CRM push (user confirms, never auto-push)
  if (action === 'qualified' && !updated.twentyId) {
    const badge = cards[0]?.querySelector<HTMLElement>('.frost-badge')
    if (badge) showPopover(updated, badge, onAction)
  }
}

// ─── Live sync with side panel ────────────────────────────────────────────────

function subscribeToStorageChanges(): void {
  let timer: ReturnType<typeof setTimeout> | undefined
  chrome.storage.onChanged.addListener(changes => {
    clearTimeout(timer)
    timer = setTimeout(() => void refreshFromStorage('settings' in changes), 300)
  })
}

async function refreshFromStorage(settingsChanged: boolean): Promise<void> {
  try {
    if (settingsChanged) state.settings = await send<FrostSettings>({ type: 'GET_SETTINGS' })
    const leads = await send<Record<string, IcyLead>>({ type: 'GET_LEADS' })
    for (const [id, lead] of Object.entries(leads)) state.leads.set(id, lead)
    for (const card of document.querySelectorAll<HTMLElement>('[data-frost-id]')) {
      const lead = card.dataset.frostId ? state.leads.get(card.dataset.frostId) : undefined
      if (!lead) continue
      if (
        settingsChanged &&
        !state.settings.hideCalledOnMaps &&
        lead.status !== 'hidden' &&
        !card.dataset.frostNoHide
      ) {
        card.style.display = ''
      }
      applyCardState(card, lead)
    }
  } catch {
    // extension reloaded — old content script can't message anymore
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────

export function toast(message: string, isError = false): void {
  const el = document.createElement('div')
  el.textContent = message
  el.style.cssText = [
    'position:fixed',
    'bottom:24px',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:2147483647',
    `background:${isError ? '#ef4444' : '#18181b'}`,
    'color:#fafafa',
    'border:1px solid #27272a',
    'border-radius:8px',
    'padding:10px 16px',
    'font:600 13px system-ui,sans-serif',
    'box-shadow:0 8px 32px rgba(0,0,0,0.5)',
  ].join(';')
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 3000)
}
