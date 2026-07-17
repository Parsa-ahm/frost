// Background service worker — single source of truth for all data operations.
// Content script and side panel send messages here for anything that mutates
// leads, events, or day stats.

import type { BgMessage, CallEvent, IcyLead } from '../types'
import { leadId } from '../utils/hash'
import {
  appendEvent,
  getAllDayStats,
  getLead,
  getLeads,
  getSettings,
  incrementDayStat,
  saveSettings,
  upsertLead,
} from '../utils/storage'
import { aggregateAllTime, emptyDayStats, OUTCOME_FIELD, todayKey } from '../utils/stats'
import { pushIcyLead } from '../utils/twenty'

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unexpected error'
}

chrome.runtime.onInstalled.addListener(() => {
  void (async () => {
    // getSettings() falls back to defaults — saving persists them on first install
    const settings = await getSettings()
    await saveSettings(settings)
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  })()
})

chrome.runtime.onMessage.addListener((msg: BgMessage, _sender, sendResponse) => {
  handleMessage(msg)
    .then(sendResponse)
    .catch((err: unknown) => sendResponse({ error: errorMessage(err) }))
  return true // keep the channel open for the async reply
})

async function handleMessage(msg: BgMessage): Promise<unknown> {
  switch (msg.type) {
    case 'UPSERT_LEAD':
      return handleUpsertLead(msg.lead)
    case 'UPDATE_STATUS':
      return handleUpdateStatus(msg.leadId, msg.outcome, msg.notes)
    case 'HIDE_LEAD':
      return handleHideLead(msg.leadId)
    case 'GET_LEADS':
      return getLeads()
    case 'GET_STATS':
      return handleGetStats()
    case 'PUSH_TO_TWENTY':
      return handlePushToTwenty(msg.leadId)
    case 'GET_SETTINGS':
      return getSettings()
    case 'SAVE_SETTINGS':
      await saveSettings(msg.settings)
      return { success: true }
  }
}

async function handleUpsertLead(
  partial: Pick<IcyLead, 'name' | 'phone' | 'address' | 'mapsUrl' | 'searchQuery'>,
): Promise<IcyLead> {
  const id = await leadId(partial.name, partial.address)
  const existing = await getLead(id)

  if (!existing) {
    const newLead: IcyLead = {
      id,
      ...partial,
      status: 'pending',
      callCount: 0,
      firstCalled: '',
      lastCalled: '',
      notes: '',
      addedAt: new Date().toISOString(),
    }
    await upsertLead(newLead)
    return newLead
  }

  // Fill in phone/mapsUrl if Maps now exposes them
  let updated = existing
  if (!existing.phone && partial.phone) updated = { ...updated, phone: partial.phone }
  if (partial.mapsUrl && partial.mapsUrl !== existing.mapsUrl)
    updated = { ...updated, mapsUrl: partial.mapsUrl }
  if (updated !== existing) await upsertLead(updated)
  return updated
}

async function handleUpdateStatus(
  id: string,
  outcome: CallEvent['outcome'],
  notes?: string,
): Promise<IcyLead> {
  const lead = await getLead(id)
  if (!lead) throw new Error(`Lead not found: ${id}`)

  const now = new Date().toISOString()
  const event: CallEvent = {
    id: crypto.randomUUID(),
    leadId: id,
    timestamp: now,
    outcome,
    notes: notes ?? '',
  }
  await appendEvent(event)

  const updated: IcyLead = {
    ...lead,
    status: outcome,
    callCount: lead.callCount + 1,
    lastCalled: now,
    firstCalled: lead.callCount === 0 ? now : lead.firstCalled,
    notes: notes ? (lead.notes ? `${lead.notes}\n${notes}` : notes) : lead.notes,
  }

  await incrementDayStat(todayKey(), { dials: 1, [OUTCOME_FIELD[outcome]]: 1 })
  await upsertLead(updated)
  return updated
}

async function handleHideLead(id: string): Promise<IcyLead> {
  const lead = await getLead(id)
  if (!lead) throw new Error(`Lead not found: ${id}`)
  // Hiding is not a dial — no event, no stats
  const updated: IcyLead = { ...lead, status: 'hidden' }
  await upsertLead(updated)
  return updated
}

async function handleGetStats() {
  const allDays = await getAllDayStats()
  const today = allDays.find(d => d.date === todayKey()) ?? emptyDayStats(todayKey())
  return { today, allTime: aggregateAllTime(allDays), allDays }
}

async function handlePushToTwenty(id: string) {
  const lead = await getLead(id)
  if (!lead) return { error: `Lead not found: ${id}` }
  const settings = await getSettings()
  if (!settings.twentyApiUrl || !settings.twentyApiToken) {
    return { error: 'No API token configured. Open Settings to add your Twenty token.' }
  }
  try {
    const twentyId = await pushIcyLead(lead, settings)
    await upsertLead({ ...lead, twentyId })
    return { success: true, twentyId }
  } catch (err: unknown) {
    return { error: errorMessage(err) }
  }
}
